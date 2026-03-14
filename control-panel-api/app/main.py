import json
import io
import os
import shutil
import tarfile
import tempfile
import uuid
from datetime import datetime, timezone

import docker
from docker.errors import NotFound as DockerNotFound
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from app.db import init_db, get_db, FILES_DIR

load_dotenv()

app = FastAPI(title="Sandbox Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://localhost:\d+",
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
    """Convert a sqlite3.Row to a dict, parsing JSON fields back to Python objects."""
    d = dict(row)
    if "config_json" in d and isinstance(d["config_json"], str):
        try:
            d["config_json"] = json.loads(d["config_json"])
        except (json.JSONDecodeError, TypeError):
            d["config_json"] = {}
    if "walkthrough_steps" in d and isinstance(d["walkthrough_steps"], str):
        try:
            d["walkthrough_steps"] = json.loads(d["walkthrough_steps"])
        except (json.JSONDecodeError, TypeError):
            d["walkthrough_steps"] = None
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


# --- Scenario Management ---

class ScenarioCreate(BaseModel):
    name: str
    description: str = ""
    config_json: dict = {}


@app.get("/api/scenarios")
async def list_scenarios():
    db = get_db()
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
        "INSERT INTO scenarios (id, name, description, config_json) VALUES (?, ?, ?, ?)",
        (scenario_id, body.name, body.description, json.dumps(body.config_json)),
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

    # Delete .db file from filesystem if exists
    if row["db_file_path"]:
        file_path = os.path.join(FILES_DIR, row["db_file_path"])
        if os.path.exists(file_path):
            os.remove(file_path)
        # Clean up empty parent directory
        parent_dir = os.path.dirname(file_path)
        if os.path.isdir(parent_dir) and not os.listdir(parent_dir):
            os.rmdir(parent_dir)

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

    # Prepare volume mount for .db file
    volumes = {}
    if scenario.get("db_file_path"):
        src_path = os.path.join(FILES_DIR, scenario["db_file_path"])
        if os.path.exists(src_path):
            # Copy to temp location for container mount
            temp_db_path = os.path.join(tempfile.gettempdir(), f"sandbox-{uuid.uuid4().hex}.db")
            shutil.copy2(src_path, temp_db_path)
            volumes[temp_db_path] = {"bind": "/app/data/store.db", "mode": "rw"}

    # Run container
    env = {}
    if scenario.get("config_json"):
        env["SCENARIO_CONFIG"] = json.dumps(scenario["config_json"])

    container = client.containers.run(
        TARGET_IMAGE,
        detach=True,
        ports={"3000/tcp": port},
        environment=env,
        volumes=volumes,
        labels={"sandbox-platform": "true"},
        name=f"sandbox-{uuid.uuid4().hex[:8]}",
    )

    used_ports.add(port)
    sandbox_url = f"http://localhost:{port}/"

    # Record in local SQLite
    record_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO active_containers (id, scenario_id, container_id, port, sandbox_url, status) VALUES (?, ?, ?, ?, ?, 'running')",
        (record_id, body.scenario_id, container.id, port, sandbox_url),
    )
    db.commit()
    db.close()

    return {
        "sandbox_url": sandbox_url,
        "container_id": container.id,
        "port": port,
        "scenario_id": body.scenario_id,
    }


@app.get("/api/sandboxes")
async def list_sandboxes():
    db = get_db()
    rows = db.execute("SELECT * FROM active_containers").fetchall()
    db.close()
    return [dict(r) for r in rows]


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
    walkthrough_steps: list | None = None


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

    container.pause()

    try:
        # Extract .db file via docker cp
        bits, _ = container.get_archive("/app/data/store.db")

        tar_stream = io.BytesIO()
        for chunk in bits:
            tar_stream.write(chunk)
        tar_stream.seek(0)

        with tarfile.open(fileobj=tar_stream) as tar:
            db_member = tar.getmembers()[0]
            db_file = tar.extractfile(db_member)
            if db_file is None:
                raise HTTPException(status_code=500, detail="Failed to extract database")
            db_data = db_file.read()

        # Save to local filesystem
        rel_path = f"walkthroughs/{uuid.uuid4().hex}.db"
        abs_path = os.path.join(FILES_DIR, rel_path)
        os.makedirs(os.path.dirname(abs_path), exist_ok=True)
        with open(abs_path, "wb") as f:
            f.write(db_data)

        # Get parent scenario info for naming
        parent_row = db.execute(
            "SELECT name FROM scenarios WHERE id = ?", (record["scenario_id"],)
        ).fetchone()
        parent_name = parent_row["name"] if parent_row else "Unknown"

        # Create new scenario
        name = body.name or f"{parent_name} - Walkthrough {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
        description = body.description or f"Walkthrough state saved from sandbox {container_id[:12]}"

        new_id = str(uuid.uuid4())
        steps_json = json.dumps(body.walkthrough_steps) if body.walkthrough_steps else None
        db.execute(
            "INSERT INTO scenarios (id, name, description, config_json, db_file_path, parent_scenario_id, walkthrough_steps) VALUES (?, ?, ?, '{}', ?, ?, ?)",
            (new_id, name, description, rel_path, record["scenario_id"], steps_json),
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

    # Success — destroy container
    try:
        container.unpause()
        container.stop(timeout=5)
        container.remove()
    except Exception:
        pass

    used_ports.discard(record["port"])
    db.execute("DELETE FROM active_containers WHERE container_id = ?", (container_id,))
    db.commit()
    db.close()

    return new_scenario


# --- Static files (bridge.js for walkthrough capture) ---

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
