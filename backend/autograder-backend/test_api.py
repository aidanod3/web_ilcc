import requests

# --- 1. Test the Existing Execute Endpoint ---
print("--- Testing /execute endpoint ---")
code = """; demoA.a: simple program
    mov r0, 5
    dout r0
    nl
    halt"""

try:
    execute_response = requests.post(
        "http://127.0.0.1:8000/execute",
        json={
            "code": code,
            "expectedOutput": "5" 
        }
    )
    print(f"Execute Result: {execute_response.json()}")
except Exception as e:
    print(f"Execute Test Failed: {e}")

# --- 2. Test the New Grade Endpoint ---
print("\n--- Testing /grade endpoint ---")
student_snippet = "mov r0, 5\nhalt"
solution_snippet = "mov r0, 5\nhalt"

try:
    grade_response = requests.post(
        "http://127.0.0.1:8000/grade",
        json={
            "studentCode": student_snippet,
            "solutionCode": solution_snippet
        }
    )
    print(f"Grade Result: {grade_response.json()}")
except Exception as e:
    print(f"Grade Test Failed: {e}")
