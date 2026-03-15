#!/usr/bin/env python3
"""
Seed the database with realistic fake QA runs and results.
Uses SQLite only (no app.db import) so it runs without full API deps.
Run from control-panel-api: python3 scripts/seed_qa_runs.py
Requires: control-panel-api/data/platform.db to exist (start the API once), or run with --init to create tables.
"""
import os
import sqlite3
import sys
import uuid
from datetime import datetime, timezone, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(API_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "platform.db")

# Realistic QA run outcomes
QA_RUNS = [
    {"status": "passed", "issues": 0, "tag": "v1.2-beta"},
    {"status": "failed", "issues": 2, "tag": "v1.2-beta"},
    {"status": "passed", "issues": 0, "tag": "v1.0"},
    {"status": "failed", "issues": 1, "tag": "v1.0"},
    {"status": "running", "issues": 0, "tag": "v1.2-beta"},
    {"status": "passed", "issues": 0, "tag": "v1.2-beta"},
    {"status": "failed", "issues": 3, "tag": "v1.1"},
    {"status": "passed", "issues": 0, "tag": "v1.1"},
    {"status": "failed", "issues": 1, "tag": "v1.2-beta"},
    {"status": "passed", "issues": 0, "tag": "v1.0"},
]

FAILURE_RESULTS = [
    {
        "issue_type": "timeout",
        "description": "Checkout step 2: Confirm button not found within 5000ms. Workflow 'Guest Checkout' failed at step 4.",
        "element_id": "button[data-testid='confirm-checkout']",
        "severity": "high",
    },
    {
        "issue_type": "regression",
        "description": "Product grid failed to load after applying category filter. Console: TypeError on undefined 'filterResults'.",
        "element_id": "[data-testid='product-grid']",
        "severity": "critical",
    },
    {
        "issue_type": "assertion",
        "description": "Cart total did not match expected value after applying discount code. Expected $42.00, got $44.00.",
        "element_id": "[data-testid='cart-total']",
        "severity": "medium",
    },
    {
        "issue_type": "smoke",
        "description": "Admin product delete flow: confirmation dialog did not appear; delete button timed out (element not found in DOM after 5000ms).",
        "element_id": "button[data-testid='confirm-delete']",
        "severity": "high",
    },
    {
        "issue_type": "console_error",
        "description": "Uncaught 500 on POST /api/orders when submitting checkout. Response body: Internal Server Error.",
        "element_id": "form[data-testid='checkout-form']",
        "severity": "critical",
    },
    {
        "issue_type": "visual",
        "description": "Header layout broken on viewport 768px; logo overlaps nav. Likely CSS regression in v1.2.",
        "element_id": "header.navbar",
        "severity": "medium",
    },
    {
        "issue_type": "timeout",
        "description": "User profile update: Save button never became enabled after editing email field (waited 10s).",
        "element_id": "button[aria-label='Save profile']",
        "severity": "high",
    },
]


def ensure_tables(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS apps (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS app_versions (
            id TEXT PRIMARY KEY,
            app_id TEXT NOT NULL,
            version_tag TEXT NOT NULL,
            docker_image_name TEXT NOT NULL,
            data_path TEXT DEFAULT '/app/data',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS qa_runs (
            id TEXT PRIMARY KEY,
            app_version_id TEXT NOT NULL,
            scenario_id TEXT,
            status TEXT DEFAULT 'pending',
            started_at TEXT,
            completed_at TEXT,
            video_url TEXT,
            issues_found INTEGER DEFAULT 0,
            log_output TEXT
        );
        CREATE TABLE IF NOT EXISTS qa_results (
            id TEXT PRIMARY KEY,
            qa_run_id TEXT NOT NULL,
            element_id TEXT,
            issue_type TEXT,
            description TEXT,
            screenshot_url TEXT,
            severity TEXT DEFAULT 'medium'
        );
    """)
    conn.commit()


def ensure_app_and_versions(conn):
    cur = conn.execute("SELECT id, version_tag FROM app_versions")
    rows = cur.fetchall()
    if rows:
        return {r[1]: r[0] for r in rows}

    app_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO apps (id, name, description) VALUES (?, ?, ?)",
        ("storefront-app", "Storefront Template", "E-commerce storefront for sandbox testing"),
    )
    versions = [
        ("ver-v1.0", app_id, "v1.0", "storefront-template"),
        ("ver-v1.1", app_id, "v1.1", "storefront-template"),
        ("ver-v1.2", app_id, "v1.2-beta", "storefront-template"),
    ]
    for vid, aid, tag, image in versions:
        conn.execute(
            "INSERT INTO app_versions (id, app_id, version_tag, docker_image_name) VALUES (?, ?, ?, ?)",
            (vid, aid, tag, image),
        )
    conn.commit()
    return {"v1.0": "ver-v1.0", "v1.1": "ver-v1.1", "v1.2-beta": "ver-v1.2"}


def seed(init: bool = False):
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    if init:
        ensure_tables(conn)
    tag_to_id = ensure_app_and_versions(conn)

    now = datetime.now(timezone.utc)
    failure_idx = 0

    for i, run_spec in enumerate(QA_RUNS):
        tag = run_spec["tag"]
        app_version_id = tag_to_id.get(tag) or list(tag_to_id.values())[0]
        run_id = f"qa_{uuid.uuid4().hex[:8]}"
        started = now - timedelta(days=len(QA_RUNS) - i, hours=2 + i, minutes=i * 7)
        started_at = started.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        completed_at = None
        if run_spec["status"] != "running":
            completed_at = (started + timedelta(minutes=3 + i, seconds=i * 12)).strftime(
                "%Y-%m-%dT%H:%M:%S.000Z"
            )

        conn.execute(
            """INSERT INTO qa_runs (
                id, app_version_id, scenario_id, status, started_at, completed_at, issues_found
            ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                run_id,
                app_version_id,
                None,
                run_spec["status"],
                started_at,
                completed_at,
                run_spec["issues"],
            ),
        )

        for _ in range(run_spec["issues"]):
            res = FAILURE_RESULTS[failure_idx % len(FAILURE_RESULTS)]
            failure_idx += 1
            result_id = f"res_{uuid.uuid4().hex[:8]}"
            conn.execute(
                """INSERT INTO qa_results (
                    id, qa_run_id, element_id, issue_type, description, screenshot_url, severity
                ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    result_id,
                    run_id,
                    res["element_id"],
                    res["issue_type"],
                    res["description"],
                    None,
                    res["severity"],
                ),
            )

    conn.commit()
    conn.close()
    print(f"Seeded {len(QA_RUNS)} QA runs with realistic results.")


if __name__ == "__main__":
    init_flag = "--init" in sys.argv
    if init_flag:
        print("Creating tables if missing...")
    seed(init=init_flag)
