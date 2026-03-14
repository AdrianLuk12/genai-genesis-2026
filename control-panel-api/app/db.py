import os
import sqlite3

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
DB_PATH = os.path.join(DATA_DIR, "platform.db")
FILES_DIR = os.path.join(DATA_DIR, "scenario_files")


def init_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(FILES_DIR, exist_ok=True)

    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS scenarios (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            config_json TEXT DEFAULT '{}',
            db_file_path TEXT,
            parent_scenario_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS active_containers (
            id TEXT PRIMARY KEY,
            scenario_id TEXT,
            container_id TEXT NOT NULL UNIQUE,
            port INTEGER NOT NULL,
            sandbox_url TEXT NOT NULL,
            status TEXT DEFAULT 'running',
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)
    # Add name column if it doesn't exist (safe migration)
    try:
        conn.execute("SELECT name FROM active_containers LIMIT 0")
    except Exception:
        conn.execute("ALTER TABLE active_containers ADD COLUMN name TEXT DEFAULT NULL")
    # Add walkthrough_steps column if it doesn't exist (safe migration)
    try:
        conn.execute("SELECT walkthrough_steps FROM scenarios LIMIT 0")
    except Exception:
        conn.execute("ALTER TABLE scenarios ADD COLUMN walkthrough_steps TEXT DEFAULT NULL")
    conn.commit()
    conn.close()


def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
