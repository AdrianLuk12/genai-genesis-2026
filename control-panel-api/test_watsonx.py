import requests
import json

url = "http://127.0.0.1:8000/api/agent/next-action"
payload = {
    "intent": "Click the login button",
    "current_dom": "<html><body><button id='login'>Login</button></body></html>",
    "current_url": "http://localhost:3000/",
    "current_title": "Login Page",
    "action_history": []
}

headers = {"Content-Type": "application/json"}

print("Sending request to Watsonx API via server...")
response = requests.post(url, json=payload, headers=headers)
print(f"Status Code: {response.status_code}")
try:
    print(json.dumps(response.json(), indent=2))
except json.JSONDecodeError:
    print(response.text)
