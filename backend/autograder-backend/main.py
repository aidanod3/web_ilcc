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

# TODO: this only works for .a files at the moment.
# define the submission model
class CodeSubmission(BaseModel):
    code: str
    expectedOutput: str

# define response model
class CodeResult(BaseModel):
    success: bool
    actualOutput: str
    matched: bool
    error: str | None = None

# create endpoint
@app.post("/execute", response_model=CodeResult)
async def execute_assembly(submission: CodeSubmission):
    try:
        # clean the code
        cleaned_code = clean_code(submission.code)

        # write assembly code to a temp file called code.a
        with open("/tmp/code.a", "w") as f:
            f.write(cleaned_code)
        
        # run your LCC emulator with Node.js
        result = subprocess.run(
            ["node", INTERPRETER_PATH, "/tmp/code.a"],
            capture_output=True,
            timeout=5,
            text=True
        )
        
        # check if LCC emulator had errors
        if result.returncode != 0:
            return CodeResult(
                success=False,
                actualOutput="",
                matched=False,
                error=result.stderr
            )
        
        # get generated output
        actual = result.stdout.strip()

        # get expected output from submission
        expected = submission.expectedOutput.strip()
        
        # return positive result
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