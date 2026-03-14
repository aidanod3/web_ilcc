from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import subprocess
import json
import os

# get absolute path for lcc.js
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
INTERPRETER_PATH = os.path.join(BASE_DIR, "emulator/src/core/lcc.js")

app = FastAPI()

# code cleaner
def clean_code(code: str) -> str:
    """
    Normalizes code by handling various newline formats.
    Also strips excessive whitespace.
    """
    # Replace escaped newlines with actual newlines
    code = code.replace('\\n', '\n')
    # Remove carriage returns
    code = code.replace('\r', '')
    # Strip leading/trailing whitespace
    code = code.strip()
    return code

# --- MODELS ---

class CodeSubmission(BaseModel):
    code: str
    expectedOutput: str

class CodeResult(BaseModel):
    success: bool
    actualOutput: str
    matched: bool
    error: str | None = None

class GradeSubmission(BaseModel):
    studentCode: str
    solutionCode: str

class GradeResult(BaseModel):
    isCorrect: bool
    similarityScore: float
    message: str

# --- ENDPOINTS ---

@app.post("/execute", response_model=CodeResult)
async def execute_assembly(submission: CodeSubmission):
    try:
        cleaned_code = clean_code(submission.code)

        # write assembly code to a local temp file (Windows friendly)
        with open("code.a", "w") as f:
            f.write(cleaned_code)
        
        result = subprocess.run(
            ["node", INTERPRETER_PATH, "code.a"],
            capture_output=True,
            timeout=5,
            text=True
        )
        
        if result.returncode != 0:
            return CodeResult(
                success=False,
                actualOutput="",
                matched=False,
                error=result.stderr
            )
        
        actual = result.stdout.strip()
        expected = submission.expectedOutput.strip()
        
        return CodeResult(
            success=True,
            actualOutput=actual,
            matched=(actual == expected),
            error=None
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=400, detail="Code execution timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/grade", response_model=GradeResult)
async def grade_code(submission: GradeSubmission):
    try:
        # Clean both snippets
        student_clean = clean_code(submission.studentCode)
        solution_clean = clean_code(submission.solutionCode)

        # Compare
        is_match = (student_clean == solution_clean)
        score = 1.0 if is_match else 0.0

        return GradeResult(
            isCorrect=is_match,
            similarityScore=score,
            message="Codes match perfectly!" if is_match else "Codes do not match."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- STARTUP LOGIC ---
if __name__ == "__main__":
    import uvicorn
    print("Starting Autograder Server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
