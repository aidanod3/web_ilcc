import requests

code = """; demoA.a: simple program assembly/execution and test input/output caching
    mov r0, 5
    dout r0
    nl
    halt"""

response = requests.post(
    "http://127.0.0.1:8000/execute",
    json={
        "code": code,
        "expectedOutput": "5"  # adjust this to be the expected interpreter output
    }
)

print(response.json())
