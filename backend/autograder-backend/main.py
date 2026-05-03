from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import json
import os
import re
import zipfile
import io

# get absolute path for lcc.js
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
INTERPRETER_PATH = os.path.join(BASE_DIR, "emulator/src/core/lcc.js")

app = FastAPI()

# Full Canvas-style folder label per student from the last Panel 2 submissions zip parse
# (e.g. "000005-3459477 - India Juliet - Feb 25, 2025 558 PM"). One entry per student.
Student_info: list[str] = []

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


_ID_LIKE_PREFIX = re.compile(r"^\d+-\d+")


def short_student_display_name(raw: str) -> str:
    """
    Canvas-style export folder: '000001-3459477 - Alpha Bravo - Mar 5, 2025 …' -> 'Alpha Bravo'.
    Simple folder names (e.g. 'Michael') are returned unchanged.
    """
    key = (raw or "").strip()
    if not key or key == "(no folder)":
        return key
    parts = [p.strip() for p in key.split(" - ") if p.strip()]
    if not parts:
        return key
    if len(parts) >= 3:
        return parts[1]
    if len(parts) == 2:
        if _ID_LIKE_PREFIX.match(parts[0]):
            return parts[1]
        return parts[0]
    return parts[0]


_ORG_ID_LEADING = re.compile(r"^(\d+)-(\d+)")


def org_defined_id_from_folder_display(raw: str) -> str:
    """
    Canvas submission folder (same string as student_info / Student_info entries).

    Leading block is often '000005-56987425' (SIS in the second slot) or '000001-3459477'
    where the second number is a shared course/section id — using it for every student
    repeats the same OrgDefinedId. Prefer the second group only when it looks like a long
    SIS-style id (8+ digits); otherwise use the first group (per-submission / per-student).
    """
    s = (raw or "").strip()
    if not s or s == "(no folder)":
        return ""
    for ch in ("\u2013", "\u2014", "\u2212"):
        s = s.replace(ch, "-")

    def pick_from_pair(a: str, b: str) -> str:
        if len(b) >= 8:
            return b
        if len(a) >= 8:
            return a
        return a

    first = s.split(" - ", 1)[0].strip()
    m = _ORG_ID_LEADING.match(first)
    if m:
        return pick_from_pair(m.group(1), m.group(2))
    if first.isdigit():
        # Bare folder segment: long ids only (avoid shared 7-digit section folders for every row).
        return first if len(first) >= 8 else ""
    m2 = _ORG_ID_LEADING.match(s)
    if m2:
        return pick_from_pair(m2.group(1), m2.group(2))
    return ""


def org_defined_id_from_folder_path(folder_path: str) -> str:
    """
    Full zip folder path (parent segments may hold the SIS id; last segment may be
    '000005 - Name - date' only). Scan path segments from deepest to shallowest.
    """
    s = (folder_path or "").strip().replace("\\", "/")
    if not s:
        return ""
    for ch in ("\u2013", "\u2014", "\u2212"):
        s = s.replace(ch, "-")
    segments = [p.strip() for p in s.split("/") if p.strip()]
    for seg in reversed(segments):
        oid = org_defined_id_from_folder_display(seg)
        if oid:
            return oid
    return org_defined_id_from_folder_display(s)


def _zip_path_posix(filename: str) -> str:
    return (filename or "").replace("\\", "/").strip()


def _should_skip_zip_member(path_posix: str) -> bool:
    """Skip macOS metadata (__MACOSX, AppleDouble ._ files) that still end in .a."""
    lower = path_posix.lower()
    if "__macosx/" in lower or lower.startswith("__macosx/"):
        return True
    if ".appledouble/" in lower or "/.appledouble/" in lower:
        return True
    base = path_posix.rsplit("/", 1)[-1] if path_posix else ""
    if base.startswith("._"):
        return True
    return False


# AppleDouble (resource fork) container magic — not text assembly.
_APPLE_DOUBLE_MAGIC = bytes((0x00, 0x05, 0x16, 0x07))


def _is_macos_junk_bytes(content_bytes: bytes) -> bool:
    """
    True for AppleDouble headers, quarantine xattr dumps, and similar blobs that
    are not LCC source but may appear in zips from Safari/macOS with a .a name.
    """
    if not content_bytes:
        return True
    if len(content_bytes) >= 4 and content_bytes[:4] == _APPLE_DOUBLE_MAGIC:
        return True
    head = content_bytes[:4096]
    # Safari download quarantine / extended-attribute text blobs
    if b"com.apple.quarantine" in head:
        if b"ATTR" in head or b"Mac OS X" in head[:800]:
            return True
    if b"Mac OS X" in head[:256] and b"ATTR" in head[:2048]:
        return True
    return False


def _normalized_asm_basename_key(basename: str) -> str:
    """
    Map foo.a and foo.a.txt to the same key (lowercase) so we keep one entry per assignment.
    """
    n = basename.strip().lower()
    if n.endswith(".a.txt"):
        return n[: -len(".txt")]  # foo.a.txt -> foo.a
    return n


def _asm_entry_priority(entry: dict) -> int:
    """Higher = preferred when deduplicating (prefer real .a over .a.txt)."""
    name = (entry.get("name") or "").lower()
    path = (entry.get("path") or "").lower()
    score = 0
    if name.endswith(".a") and not name.endswith(".a.txt"):
        score += 4
    elif name.endswith(".a.txt"):
        score += 2
    if "__macosx" in path:
        score -= 10
    seg = path.rsplit("/", 1)[-1] if path else ""
    if seg.startswith("._"):
        score -= 10
    return score


def _entry_basename(e: dict) -> str:
    base = (e.get("name") or "").strip()
    if base:
        return base
    return _zip_path_posix(e.get("path") or "").rsplit("/", 1)[-1]


# LMS zips often duplicate the same file under …/Submissions/… vs parent folder; strip for identity.
_SKIP_LMS_SUBFOLDERS = frozenset(
    {
        "submissions",
        "submission",
        "homework",
        "files",
        "assignments",
        "documents",
        "drop box",
        "dropbox",
        "upload",
        "uploads",
    }
)


def _folder_segments_filtered(folder_path: str) -> list[str]:
    raw = [p for p in _zip_path_posix(folder_path).split("/") if p.strip()]
    if not raw:
        return []
    filtered = [p for p in raw if p.casefold() not in _SKIP_LMS_SUBFOLDERS]
    return filtered if filtered else raw


def _folder_identity_key_for_dedupe(folder_path: str) -> str:
    """Stable key per student folder: ignores Submissions/ and similar middle segments."""
    parts = _folder_segments_filtered(folder_path)
    if not parts:
        return ""
    return "/".join(p.casefold() for p in parts)


def dedupe_asm_entries(entries: list) -> list:
    """
    One entry per (student folder, logical .a name). Drops duplicate zip members and
    prefers lab.a over lab.a.txt when both exist.
    """
    best: dict[tuple[str, str], dict] = {}
    order: list[tuple[str, str]] = []
    for e in entries:
        folder_raw = (e.get("folder") or "").strip()
        folder_key = _folder_identity_key_for_dedupe(folder_raw)
        if not folder_key:
            folder_key = folder_raw.lower()
        base = _entry_basename(e)
        key = (folder_key, _normalized_asm_basename_key(base))
        if key not in best:
            best[key] = e
            order.append(key)
        else:
            cur = best[key]
            if _asm_entry_priority(e) > _asm_entry_priority(cur):
                best[key] = e
    return [best[k] for k in order]


def _dedupe_file_list_for_student(files: list) -> list:
    """Final pass: one file per logical .a name inside a student's folder."""
    best: dict[str, dict] = {}
    order: list[str] = []
    for e in files:
        base = _entry_basename(e)
        bk = _normalized_asm_basename_key(base)
        if not bk.endswith(".a"):
            continue
        if bk not in best:
            best[bk] = e
            order.append(bk)
        elif _asm_entry_priority(e) > _asm_entry_priority(best[bk]):
            best[bk] = e
    return [best[k] for k in order]


def _student_folder_key_and_display(e: dict) -> tuple[str, str]:
    """
    Group by normalized folder path (not raw last segment, so …/Submissions/… merges with parent).
    Display uses the deepest meaningful folder (student), not a parent like "Lab 6 Download".
    """
    folder = (e.get("folder") or "").strip()
    key = _folder_identity_key_for_dedupe(folder)
    parts = _folder_segments_filtered(folder)
    if key:
        disp = parts[-1] if parts else "(no folder)"
        return (key, disp)

    name = (e.get("student") or "").strip()
    if not name and folder:
        name = folder.split("/")[-1].strip()
    if not name:
        name = "(no folder)"
    return (name.casefold(), name)


def build_student_objects(entries: list) -> list:
    """
    Group flat .a file entries by student folder name.

    Each returned student has: id, name, files (same dict shape as entries, sorted by path).
    """
    groups: dict[str, list] = {}
    display_for: dict[str, str] = {}
    for e in entries:
        fk, disp = _student_folder_key_and_display(e)
        if fk not in groups:
            groups[fk] = []
            display_for[fk] = disp
        groups[fk].append(e)

    students_out: list[dict] = []
    for idx, fk in enumerate(sorted(groups.keys()), start=1):
        files = sorted(groups[fk], key=lambda x: x.get("path") or "")
        files = _dedupe_file_list_for_student(files)
        folder_display = display_for[fk]
        folder_full = (files[0].get("folder") or "").strip() if files else ""
        org_id = org_defined_id_from_folder_path(folder_full)
        if not org_id:
            org_id = org_defined_id_from_folder_display(folder_display)
        students_out.append(
            {
                "id": idx,
                "name": short_student_display_name(folder_display),
                "student_info": folder_display,
                "folder_path": folder_full,
                "org_defined_id": org_id,
                "files": files,
            }
        )
    return students_out


@app.post("/parse-submissions")
async def parse_submissions(
    file: UploadFile = File(...),
    purpose: str = Form(default="submissions"),
):
    """
    Accepts a submissions ZIP upload and parses its contents.

    Expected structure (example):
      Michael/c0609.a
      Alli/c0609.a
      ...

    Returns a list of all `.a` files found, including their folder,
    file name, full path inside the zip, and decoded code text.
    """
    global Student_info
    try:
        if not file.filename.lower().endswith(".zip"):
            raise HTTPException(status_code=400, detail="Expected a .zip file.")

        raw_bytes = await file.read()
        with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
            entries = []

            for info in zf.infolist():
                if info.is_dir():
                    continue
                path_posix = _zip_path_posix(info.filename)
                if _should_skip_zip_member(path_posix):
                    continue
                lower_name = path_posix.lower()
                # Accept canonical `.a` files and common exported variant `.a.txt`.
                if not (lower_name.endswith(".a") or lower_name.endswith(".a.txt")):
                    continue

                with zf.open(info, "r") as f:
                    content_bytes = f.read()
                if _is_macos_junk_bytes(content_bytes):
                    continue
                try:
                    content_text = content_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    content_text = content_bytes.decode("latin-1", errors="replace")

                parts = path_posix.split("/")
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
                        "path": path_posix,
                        "code": content_text,
                    }
                )

            entries = dedupe_asm_entries(entries)

        if not entries:
            raise HTTPException(status_code=400, detail="No .a files found inside zip.")

        students = build_student_objects(entries)
        # Panel 3 reuses this endpoint for solution zips; keep student folder labels only for submissions.
        if (purpose or "submissions").strip().lower() != "solutions":
            Student_info = [s["student_info"] for s in students]
        return {"files": entries, "students": students}
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
