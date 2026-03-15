import sys

filename = '/Users/bryant.ruan/Genai-genesis/control-panel-api/app/main.py'
with open(filename, 'r') as f:
    content = f.read()

# Let's insert the GET /api/qa-runs endpoint before GET /api/qa-runs/{run_id}

insert_text = """
@app.get("/api/qa-runs")
def list_qa_runs():
    db_conn = get_db()
    # Fetch runs and return them, ideally with app info, but just the runs table for now:
    runs = db_conn.execute("SELECT r.*, a.docker_image_name as app_name, a.version_tag FROM qa_runs r LEFT JOIN app_versions a ON r.app_version_id = a.id ORDER BY r.started_at DESC").fetchall()
    return runs
"""

if "@app.get(\"/api/qa-runs\")" not in content:
    target = "@app.post(\"/api/apps/{version_id}/qa-run\")"
    content = content.replace(target, insert_text + "\n" + target)
    with open(filename, 'w') as f:
        f.write(content)
    print("Patched main.py")
else:
    print("Already patched")
