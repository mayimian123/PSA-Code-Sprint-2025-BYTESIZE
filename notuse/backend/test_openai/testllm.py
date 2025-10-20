import os
import requests
import json

# ========== 配置部分，请替换为你的实际值 ==========
endpoint_base = "https://psacodesprint2025.azure-api.net/gpt-5-mini"  
deployment_id = "gpt-4.1-nano"   # 或 "gpt-4.1-mini"
api_version   = "2025-01-01-preview"
api_key       = "b6b4f751603f426f876b6d634d76a6ef"
# ====================================================

url = f"{endpoint_base}/openai/deployments/{deployment_id}/chat/completions?api-version={api_version}"

headers = {
    "Content-Type": "application/json",
    "api-key": api_key
}

payload = {
    "messages": [
        {"role": "system", "content": "You are a concise assistant."},
        {"role": "user",   "content": "What is PSA Singapore? Introduce the company as much as possible"}
    ],
    "max_completion_tokens": 500,
    "temperature": 1
}

response = requests.post(url, headers=headers, json=payload)
print("Status code:", response.status_code)
print("Response body:")
print(json.dumps(response.json(), indent=2))
