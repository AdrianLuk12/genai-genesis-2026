import json
import io
import os
import shutil
import tarfile
import tempfile
import uuid
from datetime import datetime, timezone

import anthropic
import docker
from docker.errors import NotFound as DockerNotFound
from dotenv import load_dotenv
from fastapi import FastAPI, Form, HTTPException, Query, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


load_dotenv()

from app.db import init_db, get_db, FILES_DIR, IMAGES_DIR

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

    # Save version record
    db.execute(
        "INSERT INTO app_versions (id, app_id, version_tag, docker_image_name) VALUES (?, ?, ?, ?)",
        (version_id, app_id, version_tag, image_name),
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
            "SELECT * FROM workflows WHERE app_version_id = ? ORDER BY created_at DESC",
            (app_version_id,),
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM workflows ORDER BY created_at DESC").fetchall()
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

    # Record in local SQLite
    record_id = str(uuid.uuid4())
    db.execute(
        "INSERT INTO active_containers (id, scenario_id, container_id, port, sandbox_url, status, app_version_id) VALUES (?, ?, ?, ?, ?, 'running', ?)",
        (record_id, body.scenario_id, container.id, port, sandbox_url, app_version_id),
    )
    db.commit()
    db.close()

    return {
        "sandbox_url": sandbox_url,
        "container_id": container.id,
        "port": port,
        "scenario_id": body.scenario_id,
        "app_version_id": app_version_id,
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

    import re
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

        # Try to extract JSON object if there's surrounding text
        if not text.startswith("{"):
            match = re.search(r'\{[\s\S]*\}', text)
            if match:
                text = match.group(0)

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


# --- Static files (bridge.js for walkthrough capture) ---

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
