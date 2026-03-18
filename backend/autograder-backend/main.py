from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import json
import os
import zipfile
import io

# get absolute path for lcc.js
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
INTERPRETER_PATH = os.path.join(BASE_DIR, "emulator/src/core/lcc.js")

app = FastAPI()

# Allow frontend (Vite dev server) to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.post("/parse-submissions")
async def parse_submissions(file: UploadFile = File(...)):
    """
    Accepts a submissions ZIP upload and parses its contents.

    Expected structure (example):
      Michael/c0609.a
      Alli/c0609.a
      ...

    Returns a list of all `.a` files found, including their folder,
    file name, full path inside the zip, and decoded code text.
    """
    try:
        if not file.filename.lower().endswith(".zip"):
            raise HTTPException(status_code=400, detail="Expected a .zip file.")

        raw_bytes = await file.read()
        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
            entries = []

            for info in zf.infolist():
                if info.is_dir():
                    continue
                if not info.filename.lower().endswith(".a"):
                    continue

                with zf.open(info, "r") as f:
                    content_bytes = f.read()
                    try:
                        content_text = content_bytes.decode("utf-8")
                    except UnicodeDecodeError:
                        content_text = content_bytes.decode("latin-1", errors="replace")

                parts = info.filename.split("/")
                name = parts[-1]
                folder_parts = parts[:-1]

                # Strip leading technical prefix like "student_files_tmp" if present
                if folder_parts and folder_parts[0] == "student_files_tmp":
                    folder_parts_for_display = folder_parts[1:]
                else:
                    folder_parts_for_display = folder_parts

                # Treat the last segment of the display path as "student name"
                student = folder_parts_for_display[-1] if folder_parts_for_display else ""
                folder_path = "/".join(folder_parts_for_display)

                entries.append(
                    {
                        "folder": folder_path,
                        "student": student,
                        "name": name,
                        "path": info.filename,
                        "code": content_text,
                    }
                )

        if not entries:
            raise HTTPException(status_code=400, detail="No .a files found inside zip.")

        return {"files": entries}
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid or corrupted zip file.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- STARTUP LOGIC ---
if __name__ == "__main__":
    import uvicorn
    print("Starting Autograder Server...")
    uvicorn.run(app, host="127.0.0.1", port=8000)
# ---parsing operations---
