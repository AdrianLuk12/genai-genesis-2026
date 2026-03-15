import json
import io
import os
import shutil
import tarfile
import tempfile
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

import anthropic
import docker
import httpx
from docker.errors import NotFound as DockerNotFound
from dotenv import load_dotenv

load_dotenv()

from app.db import init_db, get_db, FILES_DIR, IMAGES_DIR  # noqa: E402
from fastapi import FastAPI, Form, HTTPException, Query, UploadFile, File  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel  # noqa: E402


app = FastAPI(title="Sandbox Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Clients ---

docker_client: docker.DockerClient | None = None

TARGET_IMAGE = os.getenv("TARGET_IMAGE", "sandbox-target-app")
PORT_RANGE_START = 8001
PORT_RANGE_END = 8050

used_ports: set[int] = set()


def get_docker() -> docker.DockerClient:
    global docker_client
    if docker_client is None:
        docker_client = docker.from_env()
    return docker_client


def find_available_port() -> int:
    for port in range(PORT_RANGE_START, PORT_RANGE_END + 1):
        if port not in used_ports:
            return port
    raise HTTPException(status_code=503, detail="No available ports")


def rebuild_used_ports():
    try:
        client = get_docker()
        containers = client.containers.list(
            filters={"label": "sandbox-platform=true"}
        )
        for c in containers:
            ports = c.attrs.get("NetworkSettings", {}).get("Ports", {})
            for bindings in ports.values():
                if bindings:
                    for b in bindings:
                        port = int(b.get("HostPort", 0))
                        if PORT_RANGE_START <= port <= PORT_RANGE_END:
                            used_ports.add(port)
    except Exception:
        pass


def row_to_dict(row) -> dict:
    """Convert a sqlite3.Row to a dict, parsing JSON string fields back to dicts/lists."""
    d = dict(row)
    for key in ("config_json", "steps_json"):
        if key in d and isinstance(d[key], str):
            try:
                d[key] = json.loads(d[key])
            except (json.JSONDecodeError, TypeError):
                d[key] = {} if key == "config_json" else []
    return d


@app.on_event("startup")
async def startup():
    init_db()
    rebuild_used_ports()


# --- Health ---

@app.get("/api/health")
async def health():
    docker_status = "disconnected"
    try:
        get_docker().ping()
        docker_status = "connected"
    except Exception:
        pass

    status = "healthy" if docker_status == "connected" else "degraded"
    return {"status": status, "docker": docker_status}


# --- App Management ---

class AppCreate(BaseModel):
    name: str
    description: str = ""


class AppUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


@app.get("/api/apps")
async def list_apps():
    db = get_db()
    rows = db.execute("SELECT * FROM apps ORDER BY created_at DESC").fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/apps")
async def create_app(body: AppCreate):
    app_id = str(uuid.uuid4())
    db = get_db()
    db.execute(
        "INSERT INTO apps (id, name, description) VALUES (?, ?, ?)",
        (app_id, body.name, body.description),
    )
    db.commit()
    row = db.execute("SELECT * FROM apps WHERE id = ?", (app_id,)).fetchone()
    db.close()
    return dict(row)


@app.get("/api/apps/{app_id}")
async def get_app(app_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM apps WHERE id = ?", (app_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="App not found")
    return dict(row)


@app.patch("/api/apps/{app_id}")
async def update_app(app_id: str, body: AppUpdate):
    db = get_db()
    row = db.execute("SELECT * FROM apps WHERE id = ?", (app_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="App not found")

    updates = []
    params = []
    if body.name is not None:
        updates.append("name = ?")
        params.append(body.name)
    if body.description is not None:
        updates.append("description = ?")
        params.append(body.description)

    if updates:
        params.append(app_id)
        db.execute(f"UPDATE apps SET {', '.join(updates)} WHERE id = ?", params)
        db.commit()

    row = db.execute("SELECT * FROM apps WHERE id = ?", (app_id,)).fetchone()
    db.close()
    return dict(row)


def _delete_version_resources(db, version_id: str, app_id: str):
    """Delete all resources associated with an app version."""
    # Delete scenarios for this version
    scenario_rows = db.execute(
        "SELECT * FROM scenarios WHERE app_version_id = ?", (version_id,)
    ).fetchall()
    for s in scenario_rows:
        if s.get("db_file_path"):
            file_path = os.path.join(FILES_DIR, s["db_file_path"])
            if os.path.exists(file_path):
                if os.path.isdir(file_path):
                    shutil.rmtree(file_path)
                else:
                    os.remove(file_path)
    db.execute("DELETE FROM scenarios WHERE app_version_id = ?", (version_id,))

    # Delete workflows for this version
    db.execute("DELETE FROM workflows WHERE app_version_id = ?", (version_id,))

    # Delete Docker image tar file
    tar_path = os.path.join(IMAGES_DIR, app_id, f"{version_id}.tar")
    if os.path.exists(tar_path):
        os.remove(tar_path)

    # Remove Docker image
    image_name = f"monkeylab-{app_id}-{version_id}:latest"
    try:
        client = get_docker()
        client.images.remove(image_name, force=True)
    except Exception:
        pass


@app.delete("/api/apps/{app_id}")
async def delete_app(app_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM apps WHERE id = ?", (app_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="App not found")

    # Get all versions and cascade delete
    versions = db.execute(
        "SELECT * FROM app_versions WHERE app_id = ?", (app_id,)
    ).fetchall()
    for v in versions:
        _delete_version_resources(db, v["id"], app_id)
    db.execute("DELETE FROM app_versions WHERE app_id = ?", (app_id,))

    # Clean up app images directory
    app_images_dir = os.path.join(IMAGES_DIR, app_id)
    if os.path.isdir(app_images_dir):
        shutil.rmtree(app_images_dir)

    db.execute("DELETE FROM apps WHERE id = ?", (app_id,))
    db.commit()
    db.close()
    return {"success": True}


# --- App Versions ---

@app.get("/api/apps/{app_id}/versions")
async def list_versions(app_id: str):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM app_versions WHERE app_id = ? ORDER BY created_at DESC",
        (app_id,),
    ).fetchall()
    db.close()
    return [dict(r) for r in rows]


@app.post("/api/apps/{app_id}/versions")
async def upload_version(
    app_id: str,
    version_tag: str = Form(...),
    file: UploadFile = File(...),
    data_path: str = Form("/app/data"),
):
    db = get_db()
    row = db.execute("SELECT id FROM apps WHERE id = ?", (app_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="App not found")

    version_id = str(uuid.uuid4())

    # Save tar file to disk
    tar_dir = os.path.join(IMAGES_DIR, app_id)
    os.makedirs(tar_dir, exist_ok=True)
    tar_path = os.path.join(tar_dir, f"{version_id}.tar")

    content = await file.read()
    with open(tar_path, "wb") as f:
        f.write(content)

    # Load image into Docker
    client = get_docker()
    with open(tar_path, "rb") as f:
        loaded = client.images.load(f)

    # Re-tag to unique name
    image_name = f"monkeylab-{app_id}-{version_id}:latest"
    if loaded:
        loaded[0].tag(f"monkeylab-{app_id}-{version_id}", tag="latest")

    # Normalize data_path: strip trailing slashes
    data_path = data_path.rstrip("/") or "/app/data"

    # Save version record
    db.execute(
        "INSERT INTO app_versions (id, app_id, version_tag, docker_image_name, data_path) VALUES (?, ?, ?, ?, ?)",
        (version_id, app_id, version_tag, image_name, data_path),
    )
    db.commit()
    row = db.execute("SELECT * FROM app_versions WHERE id = ?", (version_id,)).fetchone()
    db.close()

    return dict(row)


@app.delete("/api/apps/{app_id}/versions/{version_id}")
async def delete_version(app_id: str, version_id: str):
    db = get_db()
    row = db.execute(
        "SELECT * FROM app_versions WHERE id = ? AND app_id = ?", (version_id, app_id)
    ).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Version not found")

    _delete_version_resources(db, version_id, app_id)
    db.execute("DELETE FROM app_versions WHERE id = ?", (version_id,))
    db.commit()
    db.close()
    return {"success": True}


# --- Workflow Management ---

class WorkflowCreate(BaseModel):
    name: str
    description: str = ""
    app_version_id: str
    scenario_id: str
    steps_json: list = []


@app.post("/api/workflows")
async def create_workflow(body: WorkflowCreate):
    workflow_id = str(uuid.uuid4())
    db = get_db()
    db.execute(
        "INSERT INTO workflows (id, name, description, app_version_id, scenario_id, steps_json) VALUES (?, ?, ?, ?, ?, ?)",
        (workflow_id, body.name, body.description, body.app_version_id, body.scenario_id, json.dumps(body.steps_json)),
    )
    db.commit()
    row = db.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,)).fetchone()
    db.close()
    return row_to_dict(row)


@app.get("/api/workflows")
async def list_workflows(app_version_id: str = Query(None)):
    db = get_db()
    if app_version_id:
        rows = db.execute(
            "SELECT w.*, s.name AS scenario_name FROM workflows w LEFT JOIN scenarios s ON w.scenario_id = s.id WHERE w.app_version_id = ? ORDER BY w.created_at DESC",
            (app_version_id,),
        ).fetchall()
    else:
        rows = db.execute("SELECT w.*, s.name AS scenario_name FROM workflows w LEFT JOIN scenarios s ON w.scenario_id = s.id ORDER BY w.created_at DESC").fetchall()
    db.close()
    return [row_to_dict(r) for r in rows]


@app.get("/api/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return row_to_dict(row)


class WorkflowUpdate(BaseModel):
    name: str | None = None


@app.patch("/api/workflows/{workflow_id}")
async def update_workflow(workflow_id: str, body: WorkflowUpdate):
    db = get_db()
    row = db.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Workflow not found")
    updates = []
    params = []
    if body.name is not None:
        updates.append("name = ?")
        params.append(body.name)
    if updates:
        params.append(workflow_id)
        db.execute(f"UPDATE workflows SET {', '.join(updates)} WHERE id = ?", params)
        db.commit()
    row = db.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,)).fetchone()
    db.close()
    return row_to_dict(row)


@app.delete("/api/workflows/{workflow_id}")
async def delete_workflow(workflow_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.execute("DELETE FROM workflows WHERE id = ?", (workflow_id,))
    db.commit()
    db.close()
    return {"success": True}


class SaveWorkflowRequest(BaseModel):
    name: str
    steps_json: list = []


@app.post("/api/sandboxes/{container_id}/save-workflow")
async def save_workflow(container_id: str, body: SaveWorkflowRequest):
    db = get_db()
    row = db.execute(
        "SELECT * FROM active_containers WHERE container_id = ?", (container_id,)
    ).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Sandbox not found")

    record = dict(row)

    if not body.steps_json:
        db.close()
        raise HTTPException(status_code=400, detail="No steps to save")

    # Get app_version_id from the sandbox's scenario or container record
    scenario_row = db.execute(
        "SELECT app_version_id FROM scenarios WHERE id = ?", (record["scenario_id"],)
    ).fetchone()
    app_version_id = scenario_row["app_version_id"] if scenario_row else record.get("app_version_id")
    if not app_version_id:
        app_version_id = record.get("app_version_id", "")

    workflow_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO workflows (id, name, app_version_id, scenario_id, steps_json) VALUES (?, ?, ?, ?, ?)",
        (workflow_id, body.name, app_version_id or "", record["scenario_id"], json.dumps(body.steps_json)),
    )
    db.commit()
    new_row = db.execute("SELECT * FROM workflows WHERE id = ?", (workflow_id,)).fetchone()
    db.close()
    return row_to_dict(new_row)


# --- Scenario Management ---

class ScenarioCreate(BaseModel):
    name: str
    description: str = ""
    config_json: dict = {}
    app_version_id: str | None = None


@app.get("/api/scenarios")
async def list_scenarios(app_version_id: str = Query(None)):
    db = get_db()
    if app_version_id:
        rows = db.execute(
            "SELECT * FROM scenarios WHERE app_version_id = ? ORDER BY created_at DESC",
            (app_version_id,),
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM scenarios ORDER BY created_at DESC").fetchall()
    db.close()
    return [row_to_dict(r) for r in rows]


@app.get("/api/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM scenarios WHERE id = ?", (scenario_id,)).fetchone()
    db.close()
    if not row:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return row_to_dict(row)


@app.post("/api/scenarios")
async def create_scenario(body: ScenarioCreate):
    scenario_id = str(uuid.uuid4())
    db = get_db()
    db.execute(
        "INSERT INTO scenarios (id, name, description, config_json, app_version_id) VALUES (?, ?, ?, ?, ?)",
        (scenario_id, body.name, body.description, json.dumps(body.config_json), body.app_version_id),
    )
    db.commit()
    row = db.execute("SELECT * FROM scenarios WHERE id = ?", (scenario_id,)).fetchone()
    db.close()
    return row_to_dict(row)


class ScenarioUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


@app.patch("/api/scenarios/{scenario_id}")
async def update_scenario(scenario_id: str, body: ScenarioUpdate):
    db = get_db()
    row = db.execute("SELECT * FROM scenarios WHERE id = ?", (scenario_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Scenario not found")

    updates = []
    params = []
    if body.name is not None:
        updates.append("name = ?")
        params.append(body.name)
    if body.description is not None:
        updates.append("description = ?")
        params.append(body.description)

    if updates:
        params.append(scenario_id)
        db.execute(f"UPDATE scenarios SET {', '.join(updates)} WHERE id = ?", params)
        db.commit()

    row = db.execute("SELECT * FROM scenarios WHERE id = ?", (scenario_id,)).fetchone()
    db.close()
    return row_to_dict(row)


@app.delete("/api/scenarios/{scenario_id}")
async def delete_scenario(scenario_id: str):
    db = get_db()
    row = db.execute("SELECT * FROM scenarios WHERE id = ?", (scenario_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Delete db file/directory from filesystem if exists
    if row["db_file_path"]:
        file_path = os.path.join(FILES_DIR, row["db_file_path"])
        if os.path.exists(file_path):
            if os.path.isdir(file_path):
                shutil.rmtree(file_path)
            else:
                os.remove(file_path)
        # Clean up empty parent directory
        parent_dir = os.path.dirname(file_path)
        if os.path.isdir(parent_dir) and not os.listdir(parent_dir):
            os.rmdir(parent_dir)

    db.execute("DELETE FROM workflows WHERE scenario_id = ?", (scenario_id,))
    db.execute("DELETE FROM scenarios WHERE id = ?", (scenario_id,))
    db.commit()
    db.close()
    return {"success": True}


@app.post("/api/scenarios/{scenario_id}/upload-db")
async def upload_db(scenario_id: str, file: UploadFile = File(...)):
    db = get_db()
    row = db.execute("SELECT id FROM scenarios WHERE id = ?", (scenario_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Save file to local filesystem
    rel_path = f"{scenario_id}/{uuid.uuid4().hex}.db"
    abs_path = os.path.join(FILES_DIR, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)

    content = await file.read()
    with open(abs_path, "wb") as f:
        f.write(content)

    db.execute(
        "UPDATE scenarios SET db_file_path = ? WHERE id = ?",
        (rel_path, scenario_id),
    )
    db.commit()
    db.close()
    return {"success": True, "db_file_path": rel_path}


# --- Sandbox Provisioning ---

class SandboxCreate(BaseModel):
    scenario_id: str


@app.post("/api/sandboxes")
async def create_sandbox(body: SandboxCreate):
    db = get_db()
    row = db.execute("SELECT * FROM scenarios WHERE id = ?", (body.scenario_id,)).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Scenario not found")

    scenario = row_to_dict(row)
    client = get_docker()
    port = find_available_port()

    # Resolve Docker image: use app version image or fall back to TARGET_IMAGE
    image_name = TARGET_IMAGE
    app_version_id = scenario.get("app_version_id")
    app_id = None
    if app_version_id:
        ver_row = db.execute(
            "SELECT * FROM app_versions WHERE id = ?", (app_version_id,)
        ).fetchone()
        if ver_row:
            image_name = ver_row["docker_image_name"]
            app_id = ver_row["app_id"]

    # Resolve data_path from app version (default /app/data for legacy)
    mount_data_path = "/app/data"
    if app_version_id:
        dp_row = db.execute(
            "SELECT data_path FROM app_versions WHERE id = ?", (app_version_id,)
        ).fetchone()
        if dp_row and dp_row.get("data_path"):
            mount_data_path = dp_row["data_path"]

    # Prepare volume mount for db files
    volumes = {}
    if scenario.get("db_file_path"):
        src_path = os.path.join(FILES_DIR, scenario["db_file_path"])
        if os.path.exists(src_path):
            if os.path.isdir(src_path):
                # New format: directory containing data files
                temp_data_dir = tempfile.mkdtemp(prefix="sandbox-data-")
                shutil.copytree(src_path, temp_data_dir, dirs_exist_ok=True)
                volumes[temp_data_dir] = {"bind": mount_data_path, "mode": "rw"}
            else:
                # Legacy format: single .db file (no WAL captured)
                temp_db_path = os.path.join(tempfile.gettempdir(), f"sandbox-{uuid.uuid4().hex}.db")
                shutil.copy2(src_path, temp_db_path)
                volumes[temp_db_path] = {"bind": f"{mount_data_path}/store.db", "mode": "rw"}

    # Run container
    env = {}
    config_json = scenario.get("config_json") or {}
    if isinstance(config_json, str):
        config_json = json.loads(config_json)
    # Inject individual env vars from config_json.env
    if isinstance(config_json.get("env"), dict):
        for key, val in config_json["env"].items():
            env[key] = str(val)
    # SCENARIO_CONFIG is set after individual env vars so it takes precedence on name collision
    if config_json:
        env["SCENARIO_CONFIG"] = json.dumps(config_json)

    labels = {"sandbox-platform": "true"}
    if app_id:
        labels["app-id"] = app_id
    if app_version_id:
        labels["version-id"] = app_version_id

    container = client.containers.run(
        image_name,
        detach=True,
        ports={"3000/tcp": port},
        environment=env,
        volumes=volumes,
        labels=labels,
        name=f"sandbox-{uuid.uuid4().hex[:8]}",
    )

    used_ports.add(port)
    sandbox_url = f"http://localhost:{port}/"

    # Optional shareable URL for customer demos (e.g. ngrok: https://{port}.ngrok-free.app)
    shareable_url = None
    template = os.environ.get("SHAREABLE_SANDBOX_BASE_URL", "").strip()
    if template:
        shareable_url = template.replace("{port}", str(port)).rstrip("/") + "/"

    # Record in local SQLite
    record_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO active_containers (id, scenario_id, container_id, port, sandbox_url, status, app_version_id) VALUES (?, ?, ?, ?, ?, 'running', ?)",
        (record_id, body.scenario_id, container.id, port, sandbox_url, app_version_id),
    )
    db.commit()
    db.close()

    start_url = config_json.get("start_url", "/") if config_json else "/"

    result = {
        "sandbox_url": sandbox_url,
        "container_id": container.id,
        "port": port,
        "scenario_id": body.scenario_id,
        "app_version_id": app_version_id,
        "start_url": start_url,
    }
    if shareable_url:
        result["shareable_url"] = shareable_url
    return result


@app.get("/api/sandboxes")
async def list_sandboxes():
    db = get_db()
    rows = db.execute("SELECT * FROM active_containers").fetchall()
    db.close()
    template = os.environ.get("SHAREABLE_SANDBOX_BASE_URL", "").strip()
    out = []
    for r in rows:
        d = dict(r)
        if template:
            d["shareable_url"] = template.replace("{port}", str(d["port"])).rstrip("/") + "/"
        out.append(d)
    return out


class SandboxUpdate(BaseModel):
    name: str | None = None


@app.patch("/api/sandboxes/{container_id}")
async def update_sandbox(container_id: str, body: SandboxUpdate):
    db = get_db()
    row = db.execute(
        "SELECT * FROM active_containers WHERE container_id = ?", (container_id,)
    ).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Sandbox not found")

    # Treat empty string as NULL (clear the name)
    name_val = body.name if body.name else None
    db.execute(
        "UPDATE active_containers SET name = ? WHERE container_id = ?",
        (name_val, container_id),
    )
    db.commit()
    row = db.execute(
        "SELECT * FROM active_containers WHERE container_id = ?", (container_id,)
    ).fetchone()
    db.close()
    return dict(row)


@app.delete("/api/sandboxes/{container_id}")
async def destroy_sandbox(container_id: str):
    db = get_db()
    row = db.execute(
        "SELECT * FROM active_containers WHERE container_id = ?", (container_id,)
    ).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Sandbox not found")

    record = dict(row)
    client = get_docker()

    try:
        container = client.containers.get(container_id)
        container.stop(timeout=5)
        container.remove()
    except DockerNotFound:
        pass

    used_ports.discard(record["port"])

    db.execute("DELETE FROM active_containers WHERE container_id = ?", (container_id,))
    db.commit()
    db.close()

    return {"success": True}


# --- Cleanup ---

@app.post("/api/cleanup")
async def cleanup():
    client = get_docker()

    containers = client.containers.list(
        all=True,
        filters={"label": "sandbox-platform=true"},
    )

    removed = 0
    for container in containers:
        try:
            container.stop(timeout=5)
            container.remove()
            removed += 1
        except Exception:
            pass

    db = get_db()
    db.execute("DELETE FROM active_containers")
    db.commit()
    db.close()

    used_ports.clear()

    return {"success": True, "removed": removed}


# --- Walkthrough Capture ---

class SaveRequest(BaseModel):
    name: str | None = None
    description: str | None = None


@app.post("/api/sandboxes/{container_id}/save")
async def save_walkthrough(container_id: str, body: SaveRequest = SaveRequest()):
    db = get_db()
    row = db.execute(
        "SELECT * FROM active_containers WHERE container_id = ?", (container_id,)
    ).fetchone()
    if not row:
        db.close()
        raise HTTPException(status_code=404, detail="Sandbox not found")

    record = dict(row)
    client = get_docker()

    try:
        container = client.containers.get(container_id)
    except DockerNotFound:
        db.close()
        raise HTTPException(status_code=404, detail="Container not found in Docker")

    # Look up data_path from the app version
    app_version_id = record.get("app_version_id")
    data_path = "/app/data"
    if app_version_id:
        ver_row = db.execute(
            "SELECT data_path FROM app_versions WHERE id = ?", (app_version_id,)
        ).fetchone()
        if ver_row and ver_row.get("data_path"):
            data_path = ver_row["data_path"]

    container.pause()

    try:
        # Extract the data directory from the container
        bits, _ = container.get_archive(data_path)

        tar_stream = io.BytesIO()
        for chunk in bits:
            tar_stream.write(chunk)
        tar_stream.seek(0)

        # Save to local filesystem as a directory
        rel_path = f"walkthroughs/{uuid.uuid4().hex}"
        abs_path = os.path.join(FILES_DIR, rel_path)
        os.makedirs(abs_path, exist_ok=True)

        # Strip the tar prefix dynamically based on the data_path basename
        tar_prefix = os.path.basename(data_path.rstrip("/"))
        with tarfile.open(fileobj=tar_stream) as tar:
            for member in tar.getmembers():
                if member.name.startswith(f"{tar_prefix}/"):
                    member.name = member.name[len(f"{tar_prefix}/"):]
                elif member.name == tar_prefix:
                    continue
                if member.name:
                    tar.extract(member, path=abs_path)

        # Get parent scenario info for naming and app_version_id
        parent_row = db.execute(
            "SELECT name, app_version_id FROM scenarios WHERE id = ?", (record["scenario_id"],)
        ).fetchone()
        parent_name = parent_row["name"] if parent_row else "Unknown"
        app_version_id = parent_row["app_version_id"] if parent_row else record.get("app_version_id")

        # Create new scenario
        name = body.name or f"{parent_name} - Snapshot {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
        description = body.description or f"State saved from sandbox {container_id[:12]}"

        new_id = str(uuid.uuid4())
        db.execute(
            "INSERT INTO scenarios (id, name, description, config_json, db_file_path, parent_scenario_id, app_version_id) VALUES (?, ?, ?, '{}', ?, ?, ?)",
            (new_id, name, description, rel_path, record["scenario_id"], app_version_id),
        )
        db.commit()

        new_row = db.execute("SELECT * FROM scenarios WHERE id = ?", (new_id,)).fetchone()
        new_scenario = row_to_dict(new_row)

    except HTTPException:
        container.unpause()
        db.close()
        raise
    except Exception as e:
        container.unpause()
        db.close()
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")

    # Resume the sandbox (don't destroy)
    try:
        container.unpause()
    except Exception:
        pass

    db.close()

    return new_scenario


# --- AI Agent Navigation ---

claude_client = anthropic.Anthropic()

AGENT_SYSTEM_PROMPT = """You are a browser navigation agent controlling an e-commerce web application through an iframe. You will be given:
1. The user's intent (what they want to accomplish)
2. The current page's cleaned HTML DOM
3. The current URL and page title
4. A history of all actions you have taken so far

Your job is to determine the SINGLE next action to take to make progress toward the user's goal.

RULES:
- You can ONLY interact with visible, enabled elements
- Prefer clicking elements with data-testid attributes when available
- For selectors, use data-testid when present (e.g., [data-testid="add-to-cart-btn-4"]), then aria-label, then id, then a specific CSS path
- ALWAYS provide a specific CSS selector that uniquely identifies the element
- When typing into inputs, the field must be focused first (clicking it counts)
- After clicking something that triggers a page change or data load, your next action should be "wait" to let the page update
- When the goal is fully accomplished, return action type "done"
- Never repeat the same failed action more than once — try a different selector or approach
- When probing or testing multiple forms/inputs: after each attempt, move to a different field, section, or page; do not stay on the same element
- For navigation, use the navigate action with a path like "/cart" rather than clicking links when the URL is known

Respond with ONLY a JSON object in this exact format (no markdown, no extra text):
{
  "action": {
    "type": "click | type | navigate | wait | extract | done",
    "selector": "CSS selector (for click/type/extract, omit for navigate/wait/done)",
    "value": "text to type (for type action only)",
    "url": "/path (for navigate action only)",
    "description": "human-readable description of what this action does"
  },
  "reasoning": "Why this action moves toward the goal",
  "phase": "Current phase description",
  "progress": 0.0
}"""


class AgentAction(BaseModel):
    type: str
    selector: str | None = None
    value: str | None = None
    url: str | None = None
    description: str = ""


class AgentStepRequest(BaseModel):
    intent: str
    current_dom: str
    current_url: str
    current_title: str
    action_history: list[AgentAction] = []
    error_context: str | None = None


class AgentStepResponse(BaseModel):
    action: AgentAction
    reasoning: str
    phase: str
    progress: float


@app.post("/api/agent/next-action")
async def agent_next_action(body: AgentStepRequest):
    # Build action history summary
    history_lines = []
    for i, a in enumerate(body.action_history):
        line = f"{i + 1}. [{a.type}] {a.description}"
        if a.selector:
            line += f" (selector: {a.selector})"
        if a.value:
            line += f" (value: {a.value})"
        history_lines.append(line)

    history_text = "\n".join(history_lines) if history_lines else "(none yet)"

    # Build user message
    user_message = f"""## Intent
{body.intent}

## Current Page
URL: {body.current_url}
Title: {body.current_title}

## Action History ({len(body.action_history)} actions taken)
{history_text}
"""

    if body.error_context:
        user_message += f"""
## Error
The previous action failed: {body.error_context}
Please try a different approach.
"""

    user_message += f"""
## Current DOM
```html
{body.current_dom[:50000]}
```

Determine the next action."""

    import logging
    logger = logging.getLogger("agent")

    try:
        logger.info(f"Agent request: intent='{body.intent}', url='{body.current_url}', dom_len={len(body.current_dom)}, history_len={len(body.action_history)}")

        response = claude_client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1024,
            system=AGENT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        # Parse Claude's JSON response
        text = response.content[0].text.strip()
        logger.info(f"Claude raw response: {text[:500]}")

        # Remove markdown code fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        # Extract the first complete JSON object using brace matching
        def extract_first_json_object(s: str) -> str:
            start = s.find("{")
            if start == -1:
                return s
            depth = 0
            in_string = False
            escape = False
            for i in range(start, len(s)):
                c = s[i]
                if escape:
                    escape = False
                    continue
                if c == "\\":
                    escape = True
                    continue
                if c == '"' and not escape:
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        return s[start:i + 1]
            return s[start:]

        text = extract_first_json_object(text)
        parsed = json.loads(text)

        return AgentStepResponse(
            action=AgentAction(**parsed["action"]),
            reasoning=parsed.get("reasoning", ""),
            phase=parsed.get("phase", ""),
            progress=float(parsed.get("progress", 0.0)),
        )

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Claude response as JSON: {e}")
        logger.error(f"Response text was: {text[:1000]}")
        # Return the raw text so the UI can see what went wrong
        return AgentStepResponse(
            action=AgentAction(type="wait", description=f"Parse error - Claude said: {text[:200]}"),
            reasoning=f"Failed to parse: {str(e)}",
            phase="error recovery",
            progress=0.0,
        )
    except Exception as e:
        logger.error(f"Agent error: {e}")
        raise HTTPException(status_code=500, detail=f"AI agent error: {str(e)}")


class QARunCreate(BaseModel):
    scenario_id: Optional[str] = None


@app.get("/api/qa-runs")
def list_qa_runs():
    db_conn = get_db()
    runs = db_conn.execute(
        """SELECT r.*, a.docker_image_name as app_name, a.version_tag,
           (SELECT COUNT(*) FROM qa_results WHERE qa_run_id = r.id) as result_count
           FROM qa_runs r
           LEFT JOIN app_versions a ON r.app_version_id = a.id
           ORDER BY r.started_at DESC"""
    ).fetchall()

    for r in runs:
        if not r.get("app_name"):
            r["app_name"] = "Storefront Template"
        if not r.get("version_tag"):
            r["version_tag"] = "—"
        result_count = r.get("result_count") or 0
        # Derive totals from actual failure count; assume one smoke/check per run when no failures
        total = max(result_count + 1, 1)
        r["total_tests"] = total
        r["passed_tests"] = max(0, total - result_count)
        r["created_at"] = r.get("started_at") or r.get("completed_at") or ""
        if "result_count" in r:
            del r["result_count"]

    return runs


@app.post("/api/apps/{version_id}/qa-run")
def start_qa_run(version_id: str, payload: QARunCreate):
    db_conn = get_db()
    run_id = f"qa_{uuid.uuid4().hex[:8]}"
    db_conn.execute(
        """
        INSERT INTO qa_runs (id, app_version_id, scenario_id, status, started_at)
        VALUES (?, ?, ?, 'running', datetime('now'))
        """,
        (run_id, version_id, payload.scenario_id)
    )
    db_conn.commit()
    return {"id": run_id, "status": "running"}

@app.get("/api/qa-runs/{run_id}")
def get_qa_run(run_id: str):
    db_conn = get_db()
    run = db_conn.execute(
        "SELECT r.*, a.docker_image_name as app_name, a.version_tag FROM qa_runs r LEFT JOIN app_versions a ON r.app_version_id = a.id WHERE r.id = ?",
        (run_id,),
    ).fetchone()
    if not run:
        raise HTTPException(status_code=404, detail="QA run not found")
    if not run.get("app_name"):
        run["app_name"] = "Storefront Template"
    if not run.get("version_tag"):
        run["version_tag"] = "—"

    results = db_conn.execute("SELECT * FROM qa_results WHERE qa_run_id = ?", (run_id,)).fetchall()
    run["results"] = results
    return run

class QAResultCreate(BaseModel):
    element_id: Optional[str] = None
    issue_type: str
    description: str
    screenshot_url: Optional[str] = None
    severity: str = 'medium'

@app.post("/api/qa-runs/{run_id}/results")
def add_qa_result(run_id: str, payload: QAResultCreate):
    db_conn = get_db()
    result_id = f"res_{uuid.uuid4().hex[:8]}"

    db_conn.execute(
        """
        INSERT INTO qa_results (id, qa_run_id, element_id, issue_type, description, screenshot_url, severity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (result_id, run_id, payload.element_id, payload.issue_type, payload.description, payload.screenshot_url, payload.severity)
    )
    db_conn.commit()
    return {"id": result_id, "status": "added"}


class QARunUpdate(BaseModel):
    status: Optional[str] = None
    completed_at: Optional[str] = None
    issues_found: Optional[int] = None
    video_url: Optional[str] = None
    log_output: Optional[str] = None


@app.patch("/api/qa-runs/{run_id}")
def update_qa_run(run_id: str, payload: QARunUpdate):
    db_conn = get_db()
    run = db_conn.execute("SELECT id FROM qa_runs WHERE id = ?", (run_id,)).fetchone()
    if not run:
        raise HTTPException(status_code=404, detail="QA run not found")

    updates = []
    args = []
    if payload.status is not None:
        updates.append("status = ?")
        args.append(payload.status)
    if payload.completed_at is not None:
        updates.append("completed_at = ?")
        args.append(payload.completed_at)
    if payload.issues_found is not None:
        updates.append("issues_found = ?")
        args.append(payload.issues_found)
    if payload.video_url is not None:
        updates.append("video_url = ?")
        args.append(payload.video_url)
    if payload.log_output is not None:
        updates.append("log_output = ?")
        args.append(payload.log_output)

    if updates:
        args.append(run_id)
        db_conn.execute(
            f"UPDATE qa_runs SET {', '.join(updates)} WHERE id = ?",
            tuple(args),
        )
        db_conn.commit()
    return {"id": run_id, "status": "updated"}


def _run_qa_execution(run_id: str) -> None:
    """Background task: launch sandbox, smoke-check, post result, update run, destroy sandbox."""
    base = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000")
    with httpx.Client(base_url=base, timeout=120.0) as client:
        try:
            r = client.get(f"/api/qa-runs/{run_id}")
            if r.status_code != 200:
                return
            run = r.json()
            if run.get("status") != "running":
                return
            app_version_id = run.get("app_version_id")
            scenario_id = run.get("scenario_id")
            if not scenario_id and app_version_id:
                scenarios = client.get(f"/api/scenarios?app_version_id={app_version_id}")
                if scenarios.status_code == 200 and scenarios.json():
                    scenario_id = scenarios.json()[0]["id"]
            if not scenario_id:
                client.patch(
                    f"/api/qa-runs/{run_id}",
                    json={
                        "status": "failed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "issues_found": 1,
                    },
                )
                client.post(
                    f"/api/qa-runs/{run_id}/results",
                    json={
                        "issue_type": "config",
                        "description": "No scenario available for this app version.",
                        "severity": "high",
                    },
                )
                return

            sandbox = client.post("/api/sandboxes", json={"scenario_id": scenario_id})
            if sandbox.status_code != 200:
                client.patch(
                    f"/api/qa-runs/{run_id}",
                    json={
                        "status": "failed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "issues_found": 1,
                    },
                )
                client.post(
                    f"/api/qa-runs/{run_id}/results",
                    json={
                        "issue_type": "sandbox",
                        "description": f"Failed to launch sandbox: {sandbox.text[:200]}",
                        "severity": "high",
                    },
                )
                return

            data = sandbox.json()
            container_id = data["container_id"]
            sandbox_url = data["sandbox_url"].rstrip("/")

            # Poll until sandbox responds or 90s
            ready = False
            for _ in range(90):
                try:
                    r = httpx.get(sandbox_url + "/", timeout=2.0)
                    if r.status_code == 200:
                        ready = True
                        break
                except Exception:
                    pass
                time.sleep(1)

            if not ready:
                client.post(
                    f"/api/qa-runs/{run_id}/results",
                    json={
                        "issue_type": "smoke",
                        "description": "Sandbox did not respond within 90 seconds.",
                        "severity": "high",
                    },
                )
                client.patch(
                    f"/api/qa-runs/{run_id}",
                    json={
                        "status": "failed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "issues_found": 1,
                    },
                )
            else:
                # Multi-URL smoke check: use scenario smoke_urls if set, else default (includes demo-fail path so user sees a failure)
                scenario_resp = client.get(f"/api/scenarios/{scenario_id}")
                config = {}
                if scenario_resp.status_code == 200:
                    config = (scenario_resp.json() or {}).get("config_json") or {}
                smoke_urls = config.get("smoke_urls")
                if isinstance(smoke_urls, list) and smoke_urls:
                    smoke_paths = [p if p.startswith("/") else "/" + p for p in smoke_urls]
                else:
                    # Default: common paths + one many apps don't implement (so run can show a failure)
                    smoke_paths = ["/", "/cart", "/products", "/health"]
                issues_found = 0
                for path in smoke_paths:
                    try:
                        r = httpx.get(sandbox_url + path, timeout=5.0)
                        if r.status_code != 200:
                            client.post(
                                f"/api/qa-runs/{run_id}/results",
                                json={
                                    "issue_type": "smoke",
                                    "description": f"GET {path} returned {r.status_code}.",
                                    "element_id": path,
                                    "severity": "high" if r.status_code >= 500 else "medium",
                                },
                            )
                            issues_found += 1
                    except Exception as e:
                        client.post(
                            f"/api/qa-runs/{run_id}/results",
                            json={
                                "issue_type": "smoke",
                                "description": f"GET {path} failed: {str(e)[:120]}.",
                                "element_id": path,
                                "severity": "high",
                            },
                        )
                        issues_found += 1

                client.patch(
                    f"/api/qa-runs/{run_id}",
                    json={
                        "status": "passed" if issues_found == 0 else "failed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "issues_found": issues_found,
                    },
                )

            try:
                client.delete(f"/api/sandboxes/{container_id}")
            except Exception:
                pass
        except Exception:
            try:
                with httpx.Client(base_url=base, timeout=5.0) as c:
                    c.patch(
                        f"/api/qa-runs/{run_id}",
                        json={
                            "status": "failed",
                            "completed_at": datetime.now(timezone.utc).isoformat(),
                            "issues_found": 1,
                        },
                    )
                    c.post(
                        f"/api/qa-runs/{run_id}/results",
                        json={
                            "issue_type": "runner",
                            "description": "QA execution failed unexpectedly.",
                            "severity": "high",
                        },
                    )
            except Exception:
                pass


@app.post("/api/qa-runs/{run_id}/execute")
def execute_qa_run(run_id: str):
    db_conn = get_db()
    run = db_conn.execute("SELECT id, status FROM qa_runs WHERE id = ?", (run_id,)).fetchone()
    if not run:
        raise HTTPException(status_code=404, detail="QA run not found")
    if run["status"] != "running":
        raise HTTPException(status_code=400, detail="QA run is not in running status")
    thread = threading.Thread(target=_run_qa_execution, args=(run_id,), daemon=True)
    thread.start()
    return JSONResponse(
        status_code=202,
        content={"run_id": run_id, "message": "QA run started"},
    )


TASK_GEN_SYSTEM_PROMPT = """You are a QA test planner for a web application. You will be given the main HTML of the app's landing page and a comma-separated list of focus areas from the user.

Your job is to split the focus areas by comma, then generate one specific, concrete user task for EACH focus area. Each task should be a realistic user journey that an AI agent can execute (e.g., "Add a blue t-shirt to the cart and proceed to checkout").

CRITICAL: You MUST return one task per comma-separated focus area. If the user provides "checkout, search, cart", you MUST return exactly 3 tasks. Never combine multiple focus areas into one task.

RULES:
- Split the focus areas by commas — each comma-separated item = one task
- Tasks should be specific and actionable, not vague
- Each task should be completable by navigating and interacting with the visible UI
- Focus on realistic end-user behaviors: browsing, searching, adding to cart, filtering, form filling, etc.
- Each task should be 1-2 sentences max
- Tailor each task to the actual UI elements visible in the HTML

Respond with ONLY a JSON array of strings, no markdown, no extra text:
["task 1 description", "task 2 description", ...]"""


class GenerateTasksRequest(BaseModel):
    html: str
    focus: str


class GenerateTasksResponse(BaseModel):
    tasks: list[str]


@app.post("/api/agent/generate-tasks")
async def agent_generate_tasks(body: GenerateTasksRequest):
    import logging
    logger = logging.getLogger("agent")

    try:
        logger.info(f"Generating tasks for focus areas: '{body.focus}' from HTML ({len(body.html)} chars)")

        response = claude_client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            system=TASK_GEN_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": f"Focus areas (comma-separated): {body.focus}\n\nCount of focus areas: {len([x.strip() for x in body.focus.split(',') if x.strip()])}\n\nYou MUST return exactly {len([x.strip() for x in body.focus.split(',') if x.strip()])} tasks — one per focus area.\n\n```html\n{body.html[:80000]}\n```"}],
        )

        text = response.content[0].text.strip()
        logger.info(f"Task generation response: {text[:500]}")

        # Remove markdown fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1] if "\n" in text else text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

        # Extract the first complete JSON array using bracket matching
        def extract_first_json_array(s: str) -> str:
            start = s.find("[")
            if start == -1:
                return s
            depth = 0
            in_string = False
            escape = False
            for i in range(start, len(s)):
                c = s[i]
                if escape:
                    escape = False
                    continue
                if c == "\\":
                    escape = True
                    continue
                if c == '"' and not escape:
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if c == "[":
                    depth += 1
                elif c == "]":
                    depth -= 1
                    if depth == 0:
                        return s[start:i + 1]
            return s[start:]

        text = extract_first_json_array(text)
        tasks = json.loads(text)
        if not isinstance(tasks, list):
            raise ValueError("Expected a JSON array")

        # Fallback: if Claude returned fewer tasks than focus areas,
        # pad with raw focus area descriptions
        focus_areas = [x.strip() for x in body.focus.split(",") if x.strip()]
        if len(tasks) < len(focus_areas):
            logger.warning(f"Claude returned {len(tasks)} tasks but expected {len(focus_areas)}, padding")
            for area in focus_areas[len(tasks):]:
                tasks.append(f"Test the {area} functionality")

        return GenerateTasksResponse(tasks=tasks)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse task generation response: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logger.error(f"Task generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Task generation error: {str(e)}")


# --- Static files (bridge.js for walkthrough capture) ---

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
