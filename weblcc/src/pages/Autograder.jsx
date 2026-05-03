import React, { useState, useRef, useEffect } from "react";
import "./Autograder.css";
import CodeMirror from "@uiw/react-codemirror";
import { oneDark } from "@codemirror/theme-one-dark";

const DEMO_STUDENTS = [
  {
    id: 1, name: "Alice Johnson", sid: "A12301", status: "Ungraded",
    files: [
      { name: "lab05.a", code: `; lab05.a — Alice Johnson (A12301)
; Add two numbers read from input

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            lea   r0, prompt1
            sout  r0
            din   r1

            lea   r0, prompt2
            sout  r0
            din   r2

            add   r3, r1, r2
            lea   r0, result
            sout  r0
            dout  r3
            nl

            mov   sp, fp
            pop   fp
            pop   lr
            ret

prompt1:    .string "Enter first number: "
prompt2:    .string "Enter second number: "
result:     .string "Sum = "
` },
      { name: "lab05_test.a", code: `; lab05_test.a — Alice Johnson
; Quick test with hardcoded values

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            mov   r1, 10
            mov   r2, 25
            add   r3, r1, r2

            lea   r0, msg
            sout  r0
            dout  r3
            nl

            mov   sp, fp
            pop   fp
            pop   lr
            ret

msg:        .string "Result: "
` },
      { name: "lab05_notes.a", code: `; lab05_notes.a — scratch / notes
; Trying out pcoffset addressing

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            ld    r0, val1
            ld    r1, val2
            sub   r2, r0, r1
            dout  r2
            nl

            mov   sp, fp
            pop   fp
            pop   lr
            ret

val1:       .fill 42
val2:       .fill 17
` },
    ],
  },
  {
    id: 2, name: "Brian Kim", sid: "B44892", status: "Ungraded",
    files: [
      { name: "lab05.a", code: `; lab05.a — Brian Kim (B44892)
; Multiply two numbers using repeated addition

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            lea   r0, p1
            sout  r0
            din   r1          ; multiplicand
            lea   r0, p2
            sout  r0
            din   r2          ; multiplier

            mov   r3, 0       ; accumulator
loop:       brz   r2, done
            add   r3, r3, r1
            add   r2, r2, -1  ; NOTE: this should be sub r2,r2,1
            br    loop
done:       lea   r0, res
            sout  r0
            dout  r3
            nl

            mov   sp, fp
            pop   fp
            pop   lr
            ret

p1:         .string "Enter A: "
p2:         .string "Enter B: "
res:        .string "A x B = "
` },
      { name: "lab05_v2.a", code: `; lab05_v2.a — Brian Kim revised
; Fixed loop counter decrement

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            lea   r0, p1
            sout  r0
            din   r1
            lea   r0, p2
            sout  r0
            din   r2

            mov   r3, 0
loop:       brz   r2, done
            add   r3, r3, r1
            sub   r2, r2, 1
            br    loop
done:       lea   r0, res
            sout  r0
            dout  r3
            nl

            mov   sp, fp
            pop   fp
            pop   lr
            ret

p1:         .string "Enter A: "
p2:         .string "Enter B: "
res:        .string "Product: "
` },
    ],
  },
  {
    id: 3, name: "Carlos Rivera", sid: "C77123", status: "Ungraded",
    files: [
      { name: "lab05.a", code: `; lab05.a — Carlos Rivera (C77123)
; Fibonacci sequence — first N terms

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            lea   r0, prompt
            sout  r0
            din   r4          ; N

            mov   r1, 0       ; fib(0)
            mov   r2, 1       ; fib(1)
            mov   r5, 0       ; counter

loop:       cmp   r5, r4
            brp   done
            dout  r1
            nl
            add   r3, r1, r2
            mov   r1, r2
            mov   r2, r3
            add   r5, r5, 1
            br    loop

done:       mov   sp, fp
            pop   fp
            pop   lr          ; MISSING: pop lr before ret — bug
            ret

prompt:     .string "How many Fibonacci terms? "
` },
      { name: "lab05_scratch.a", code: `; lab05_scratch.a — WIP, ignore
; Testing conditional branches

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            din   r0
            cmp   r0, 0
            brn   negative
            lea   r1, pos
            sout  r1
            br    end
negative:   lea   r1, neg
            sout  r1
end:        nl
            mov   sp, fp
            pop   fp
            pop   lr
            ret

pos:        .string "positive"
neg:        .string "negative"
` },
      { name: "lab05_final.a", code: `; lab05_final.a — Carlos Rivera FINAL
; Corrected Fibonacci with proper epilogue

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            lea   r0, prompt
            sout  r0
            din   r4

            mov   r1, 0
            mov   r2, 1
            mov   r5, 0

loop:       cmp   r5, r4
            brp   done
            dout  r1
            nl
            add   r3, r1, r2
            mov   r1, r2
            mov   r2, r3
            add   r5, r5, 1
            br    loop

done:       mov   sp, fp
            pop   fp
            pop   lr
            ret

prompt:     .string "How many Fibonacci terms? "
` },
    ],
  },
  {
    id: 4, name: "Dana Patel", sid: "D90045", status: "Late",
    files: [
      { name: "lab05_late.a", code: `; lab05_late.a — Dana Patel (D90045) [LATE]
; Counts down from N to 0

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            lea   r0, prompt
            sout  r0
            din   r1

loop:       brn   r1, done
            dout  r1
            nl
            sub   r1, r1, 1
            br    loop

done:       lea   r0, bye
            sout  r0

            mov   sp, fp
            pop   fp
            pop   lr
            ret

prompt:     .string "Count down from: "
bye:        .string "Done!\n"
` },
      { name: "lab05_late_v2.a", code: `; lab05_late_v2.a — Dana Patel revised
; Fixed branch condition (brn → brnz issue)

startup:    bl    main
            halt

main:       push  lr
            push  fp
            mov   fp, sp

            lea   r0, prompt
            sout  r0
            din   r1

loop:       brz   r1, done
            dout  r1
            nl
            sub   r1, r1, 1
            br    loop

done:       lea   r0, bye
            sout  r0

            mov   sp, fp
            pop   fp
            pop   lr
            ret

prompt:     .string "Count down from: "
bye:        .string "Done!\n"
` },
    ],
  },
];

// ── SVG Icons ──────────────────────────────────────────
const IconMoon    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>;
const IconSun     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconImport  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IconExport  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
/** LMS zips: same file may appear under …/Submissions/… and parent; strip for one logical folder. */
const SKIP_LMS_SUBFOLDERS = new Set([
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
]);

function zipPathPosix(s) {
  return String(s || "").replace(/\\/g, "/").trim();
}

function folderSegmentsFiltered(folderPath) {
  const raw = zipPathPosix(folderPath)
    .split("/")
    .filter(Boolean);
  if (!raw.length) return [];
  const filtered = raw.filter((p) => !SKIP_LMS_SUBFOLDERS.has(p.toLowerCase()));
  return filtered.length ? filtered : raw;
}

/** Mirrors backend _folder_identity_key_for_dedupe. */
function folderIdentityKeyForDedupe(folderPath) {
  const parts = folderSegmentsFiltered(folderPath);
  if (!parts.length) return "";
  return parts.map((p) => p.toLowerCase()).join("/");
}

function filterParsedZipEntries(files) {
  if (!Array.isArray(files)) return [];
  return files.filter((f) => {
    const path = String(f?.path || "").toLowerCase();
    const name = String(f?.name || "").toLowerCase();
    const code = String(f?.code || "");
    if (path.includes("__macosx/")) return false;
    if (path.includes(".appledouble/")) return false;
    if (name.startsWith("._") || path.includes("/._")) return false;
    if (code.includes("\u0000")) return false;
    // AppleDouble magic (00 05 16 07) after JSON/text round-trip
    if (
      code.length >= 4 &&
      code.charCodeAt(0) === 0 &&
      code.charCodeAt(1) === 5 &&
      code.charCodeAt(2) === 22 &&
      code.charCodeAt(3) === 7
    ) {
      return false;
    }
    // AppleDouble / quarantine xattr blobs (often mis-labeled or duplicated as .a)
    if (
      code.includes("com.apple.quarantine") &&
      (code.includes("ATTR") || code.includes("Mac OS X"))
    ) {
      return false;
    }
    return true;
  });
}

function entryBasename(f) {
  const n = f?.name;
  if (n != null && String(n).trim()) return String(n).trim();
  const p = String(f?.path || "");
  const seg = p.split("/").filter(Boolean).pop();
  return seg ? seg.trim() : "";
}

/** Same logical key as backend: folder + normalized .a / .a.txt basename. */
function dedupeParsedAsmFiles(files) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const normKey = (base) => {
    const n = String(base || "").trim().toLowerCase();
    if (n.endsWith(".a.txt")) return n.slice(0, -4);
    return n;
  };
  const priority = (f) => {
    const name = String(f?.name || "").toLowerCase();
    const path = String(f?.path || "").toLowerCase();
    let s = 0;
    if (name.endsWith(".a") && !name.endsWith(".a.txt")) s += 4;
    else if (name.endsWith(".a.txt")) s += 2;
    if (path.includes("__macosx")) s -= 10;
    const seg = path.split("/").filter(Boolean).pop() || "";
    if (seg.startsWith("._")) s -= 10;
    return s;
  };
  const best = new Map();
  const order = [];
  for (const f of files) {
    const folderRaw = String(f?.folder ?? "").trim();
    let folderKey = folderIdentityKeyForDedupe(folderRaw);
    if (!folderKey) folderKey = folderRaw.toLowerCase();
    const base = entryBasename(f);
    const k = `${folderKey}\0${normKey(base)}`;
    if (!best.has(k)) {
      best.set(k, f);
      order.push(k);
    } else if (priority(f) > priority(best.get(k))) {
      best.set(k, f);
    }
  }
  return order.map((k) => best.get(k));
}

function safeStudentDisplayName(raw) {
  const s = extractStudentListName(raw);
  if (s == null || s === "" || s === "null" || s === "undefined") return "Unnamed";
  return s;
}

function safeFileTabLabel(f) {
  const n = f?.name;
  if (n != null && String(n).trim() && String(n).trim() !== "null") return String(n).trim();
  const b = entryBasename(f);
  return b || "file";
}

/** Stable label for comparisons / activeFileName (never the string "null"). */
function resolvedFileLabel(file) {
  return safeFileTabLabel(file);
}

/**
 * Canvas-style folder: "000001-3459477 - Alpha Bravo - Mar 5, 2025 …" → "Alpha Bravo".
 * Plain names (e.g. "Michael") unchanged. Mirrors backend short_student_display_name.
 */
function extractStudentListName(raw) {
  const key = String(raw ?? "").trim();
  if (!key || key === "(no folder)") return key;
  const parts = key.split(" - ").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) return parts[1];
  if (parts.length === 2) {
    if (/^\d+-\d+/.test(parts[0])) return parts[1];
    return parts[0];
  }
  return parts[0];
}

/** Prefer long second id (typical SIS); else first id when second is a short shared course key. */
function orgIdFromLeadingNumberPair(a, b) {
  if (b.length >= 8) return b;
  if (a.length >= 8) return a;
  return a;
}

/**
 * Canvas folder label (same as backend student_info). Mirrors main.py org_defined_id_from_folder_display.
 */
function orgDefinedIdFromStudentInfo(studentInfo) {
  let s = String(studentInfo ?? "").trim();
  if (!s || s === "(no folder)") return "";
  s = s.replace(/[\u2013\u2014\u2212]/g, "-");
  const cut = s.indexOf(" - ");
  const first = ((cut >= 0 ? s.slice(0, cut) : s) || "").trim();
  const m = first.match(/^(\d+)-(\d+)/);
  if (m) return orgIdFromLeadingNumberPair(m[1], m[2]);
  if (/^\d+$/.test(first)) return first.length >= 8 ? first : "";
  const m2 = s.match(/^(\d+)-(\d+)/);
  if (m2) return orgIdFromLeadingNumberPair(m2[1], m2[2]);
  return "";
}

/** Full zip `folder` path — OrgDefinedId may live in a parent segment, not only the last folder name. */
function orgDefinedIdFromFolderPath(folderPath) {
  let s = String(folderPath ?? "").trim().replace(/\\/g, "/");
  if (!s) return "";
  s = s.replace(/[\u2013\u2014\u2212]/g, "-");
  const segments = s.split("/").map((p) => p.trim()).filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const oid = orgDefinedIdFromStudentInfo(segments[i]);
    if (oid) return oid;
  }
  return orgDefinedIdFromStudentInfo(s);
}

/**
 * One stored row per student in the UI. OrgDefinedId is computed once at ingest (Brightspace / Canvas zip);
 * it is not shown in Panel 1 — only used for CSV export.
 */
function toSubmittedStudent(s, index) {
  const files = dedupeParsedAsmFiles(s.files || []);
  const preset = String(s.orgDefinedId ?? s.org_defined_id ?? "").trim();
  const folderPath = String(s.folder_path ?? files[0]?.folder ?? "").trim();
  const studentInfo = String(s.student_info ?? "").trim();
  const orgDefinedId =
    preset ||
    orgDefinedIdFromFolderPath(folderPath) ||
    orgDefinedIdFromStudentInfo(studentInfo);
  return {
    id: s.id != null ? Number(s.id) : index + 1,
    name: safeStudentDisplayName(s.name),
    sid: String(s.sid ?? ""),
    status: s.status ?? "Ungraded",
    files,
    orgDefinedId,
  };
}

/** Display name "Vickie Brewer" → Brightspace-style "Vickie.Brewer" (first + last segment). */
function brightspaceUsernameFromDisplayName(name) {
  const parts = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `${parts[0]}.${parts[parts.length - 1]}`;
}

function csvEscapeField(val) {
  const s = String(val ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Group flat /parse-submissions `files` by `student` / folder (mirrors backend build_student_objects). */
function groupSubmissionFilesIntoStudents(files) {
  if (!Array.isArray(files) || files.length === 0) return [];
  const byCanon = new Map();
  const displayFor = new Map();
  for (const f of files) {
    const folder = String(f?.folder || "").trim();
    let canon = folderIdentityKeyForDedupe(folder);
    const parts = folderSegmentsFiltered(folder);
    let dispRaw;
    if (parts.length) {
      dispRaw = parts[parts.length - 1];
    } else {
      dispRaw = String(f?.student || "").trim();
      if (!dispRaw && folder) dispRaw = folder.split("/").filter(Boolean).pop() || "";
      if (!dispRaw) dispRaw = "(no folder)";
    }
    if (!canon) {
      canon = dispRaw.toLowerCase();
    }
    if (!byCanon.has(canon)) {
      byCanon.set(canon, []);
      displayFor.set(canon, dispRaw);
    }
    byCanon.get(canon).push(f);
  }
  const sorted = [...byCanon.keys()].sort((a, b) => a.localeCompare(b));
  return sorted.map((canon, i) => {
    const list = [...byCanon.get(canon)].sort((a, b) => String(a.path).localeCompare(String(b.path)));
    const deduped = dedupeParsedAsmFiles(list);
    const info = displayFor.get(canon) || "";
    const folderPath = String(deduped[0]?.folder ?? "").trim();
    const oid =
      orgDefinedIdFromFolderPath(folderPath) || orgDefinedIdFromStudentInfo(info);
    return {
      id: i + 1,
      name: extractStudentListName(displayFor.get(canon) || canon),
      student_info: info,
      folder_path: folderPath,
      org_defined_id: oid,
      files: deduped,
    };
  });
}

/** Basename from a parsed zip entry (name or last path segment). */
function asmBasename(entry) {
  const n = entry?.name;
  if (n && String(n).trim()) return String(n).trim();
  const p = entry?.path;
  if (p && typeof p === "string") {
    const seg = p.split("/").filter(Boolean).pop();
    if (seg) return seg.trim();
  }
  return "";
}

/** Lowercase key for matching `.a` and `.a.txt`. */
function normalizeAsmFileKey(name) {
  const n = String(name || "").trim().toLowerCase();
  if (n.endsWith(".a.txt")) return n.slice(0, -4);
  return n;
}

function emptyStudentFeedback() {
  return {
    score: "",
    maxScore: 20,
    message: "",
  };
}

function isLabScoreInputMissing(score) {
  if (score === null || score === undefined) return true;
  if (typeof score === "number" && Number.isNaN(score)) return true;
  if (typeof score === "string" && score.trim() === "") return true;
  return false;
}

export default function Autograder() {
  const [code, setCode] = useState("");
  const [reference, setReference] = useState("");
  const [input, setInput] = useState("");
  const [expected, setExpected] = useState("15 -30");
  const [actual, setActual] = useState("");
  /** Per student id: score, max, message (Panel 6). */
  const [feedbackByStudentId, setFeedbackByStudentId] = useState({});
  const [isChecking, setIsChecking] = useState(false);
  const [mismatchLine, setMismatchLine] = useState(2);
  const [gradeMatch, setGradeMatch] = useState(null); // null until "Run Code" is pressed
  const [gradeMessage, setGradeMessage] = useState(""); // message from /grade endpoint
  const [outputMatched, setOutputMatched] = useState(null); // null until "Run Code" is pressed
  const [search, setSearch] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [referenceFileLoading, setReferenceFileLoading] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [toolbarPos, setToolbarPos] = useState({ bottom: 18, right: 18 });
  const [isDraggingZip, setIsDraggingZip] = useState(false);
  // STORED ZIP: solutionsZipFile (solutions), submissionsZipFile (student submissions via Upload File)
  const [solutionsZipFile, setSolutionsZipFile] = useState(null);
  const [submissionsZipFile, setSubmissionsZipFile] = useState(null);
  const [solutionFiles, setSolutionFiles] = useState([]); // hidden Panel 3 file list
  const [activeSolutionIndex, setActiveSolutionIndex] = useState(0);
  const [activeSubmissionIndex, setActiveSubmissionIndex] = useState(0);
  const [submittedStudents, setSubmittedStudents] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [activeFileName, setActiveFileName] = useState(null);
  /** Panel 2 / 3: double-click (outside CodeMirror) to expand; Esc or double-click again to exit */
  const [expandedEditorPanel, setExpandedEditorPanel] = useState(null); // null | 'code' | 'reference'
  const dragRef = useRef(null);

  const activeFeedback =
    activeStudentId != null
      ? (feedbackByStudentId[activeStudentId] ?? emptyStudentFeedback())
      : emptyStudentFeedback();
  const { score, maxScore, message } = activeFeedback;

  const patchActiveFeedback = (patch) => {
    if (activeStudentId == null) return;
    setFeedbackByStudentId((prev) => {
      const cur = prev[activeStudentId] ?? emptyStudentFeedback();
      const merged = { ...cur, ...patch };
      return {
        ...prev,
        [activeStudentId]: {
          score: merged.score,
          maxScore: merged.maxScore,
          message: merged.message,
        },
      };
    });
  };
  const importRef = useRef(null);
  const zipInputRef = useRef(null);

  // ── Toolbar drag ──────────────────────────────────────
  const handleToolbarMouseDown = (e) => {
    if (
      e.target.closest('button') ||
      e.target.closest('label') ||
      e.target.closest('select')
    ) {
      return;
    }
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startRight = toolbarPos.right, startBottom = toolbarPos.bottom;
    const onMove = (mv) => setToolbarPos({
      right:  Math.max(0, startRight  - (mv.clientX - startX)),
      bottom: Math.max(0, startBottom - (mv.clientY - startY)),
    });
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ── Import grades JSON ────────────────────────────────
  const handleImport = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const studentIdAtImport = activeStudentId;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (studentIdAtImport == null) {
          alert('Select a student before importing grades.');
          return;
        }
        const patch = {};
        if (data.score !== undefined) patch.score = data.score;
        if (data.maxScore !== undefined) patch.maxScore = data.maxScore;
        if (data.message !== undefined) patch.message = data.message;
        if (Object.keys(patch).length) {
          setFeedbackByStudentId((prev) => {
            const cur = prev[studentIdAtImport] ?? emptyStudentFeedback();
            const merged = { ...cur, ...patch };
            return {
              ...prev,
              [studentIdAtImport]: {
                score: merged.score,
                maxScore: merged.maxScore,
                message: merged.message,
              },
            };
          });
        }
        if (data.expected) setExpected(data.expected);
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(f);
    e.target.value = '';
  };

  // ── Export Brightspace CSV (all students in list) ───────
  const handleExport = () => {
    if (!submittedStudents.length) {
      alert("No students loaded. Upload a submissions zip first.");
      return;
    }
    for (const stu of submittedStudents) {
      const fb = feedbackByStudentId[stu.id] ?? emptyStudentFeedback();
      if (isLabScoreInputMissing(fb.score)) {
        alert(
          `Enter a Lab 6 points score for every student before exporting. Missing: ${safeStudentDisplayName(stu.name)}.`
        );
        return;
      }
    }
    const headers = [
      "OrgDefinedId",
      "Username",
      "Lab 6 Points Grade",
      "Lab 6 Text Grade",
      "End-of-Line Indicator",
    ];
    const lines = [headers.join(",")];
    for (const stu of submittedStudents) {
      const fb = feedbackByStudentId[stu.id] ?? emptyStudentFeedback();
      const orgId = String(stu.orgDefinedId ?? "").trim();
      const username = brightspaceUsernameFromDisplayName(stu.name);
      const pointsGrade = Number(fb.score);
      const row = [
        csvEscapeField(orgId),
        csvEscapeField(username),
        csvEscapeField(pointsGrade),
        csvEscapeField(fb.message),
        csvEscapeField("#"),
      ].join(",");
      lines.push(row);
    }
    const csvBody = lines.join("\r\n");
    const blob = new Blob(["\uFEFF", csvBody], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lab6_grades.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ── Student submissions upload (via Upload File) ──────
  const sendSubmissionsZipToBackend = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      // NOTE: direct call to FastAPI autograder backend
      const resp = await fetch('http://127.0.0.1:8000/parse-submissions', {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        console.error('parse-submissions failed:', resp.status, txt);
        alert(`parse-submissions error: ${resp.status}`);
        return;
      }
      const data = await resp.json().catch(() => null);
      console.log('Parsed submissions response:', data);
      let filteredFiles = filterParsedZipEntries(data?.files);
      filteredFiles = dedupeParsedAsmFiles(filteredFiles);
      if (filteredFiles.length > 0) {
        const grouped =
          Array.isArray(data?.students) && data.students.length > 0
            ? data.students.map((stu) => ({
                id: stu.id,
                name: stu.name,
                sid: stu.sid ?? "",
                status: stu.status ?? "Ungraded",
                student_info: stu.student_info,
                folder_path: stu.folder_path,
                org_defined_id: stu.org_defined_id,
                files: stu.files || [],
              }))
            : groupSubmissionFilesIntoStudents(filteredFiles);
        const students = grouped.map((s, i) => toSubmittedStudent(s, i));
        setFeedbackByStudentId({});
        setSubmittedStudents(students);
        const first = students[0];
        setActiveStudentId(first.id);
        setActiveSubmissionIndex(0);
        const ff = first.files[0];
        setActiveFileName(ff ? resolvedFileLabel(ff) : null);
        setCode(typeof ff?.code === 'string' ? ff.code : '');
      } else {
        setFeedbackByStudentId({});
        setSubmittedStudents([]);
        setActiveStudentId(null);
        setActiveSubmissionIndex(0);
        console.warn('No valid submission files found; raw data:', data);
        alert('No valid .a source files found in this zip.');
      }
    } catch (err) {
      console.error('Failed to parse submissions zip:', err);
      alert('Failed to reach autograder backend. See console for details.');
    }
  };

  // ── Solutions upload for Panel 3 (via Upload File) ────
  const sendSolutionsZipToBackend = async (file) => {
    setReferenceFileLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'solutions');
      // Reuse main.py ZIP parser endpoint for solution archives.
      const resp = await fetch('http://127.0.0.1:8000/parse-submissions', {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        console.error('parse-submissions (solutions) failed:', resp.status, txt);
        alert(`parse-submissions error: ${resp.status}`);
        return;
      }
      const data = await resp.json().catch(() => null);
      console.log('Parsed solutions response:', data);
      // Ignore macOS metadata/resource-fork entries (e.g. __MACOSX, ._* files)
      let filteredFiles = filterParsedZipEntries(data?.files);
      filteredFiles = dedupeParsedAsmFiles(filteredFiles);

      if (filteredFiles.length > 0) {
        setSolutionFiles(filteredFiles);
        // Panel 3 syncs to the current student file (basename match) via useEffect
      } else {
        setSolutionFiles([]);
        setActiveSolutionIndex(0);
        console.warn('No valid solution files found; raw data:', data);
        alert('No valid .a source files found in this zip.');
      }
    } catch (err) {
      console.error('Failed to parse solutions zip:', err);
      alert('Failed to reach autograder backend. See console for details.');
    } finally {
      setReferenceFileLoading(false);
    }
  };

  // ── Student code file upload / submissions zip ────────
  const handleFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // If a ZIP is uploaded here, store it in submissionsZipFile instead of loading as text.
    if (f.name.toLowerCase().endsWith('.zip')) {
      setSubmissionsZipFile(f);
       // NOTE: this sends the stored submissions ZIP to the FastAPI backend (/parse-submissions).
      sendSubmissionsZipToBackend(f);
      return;
    }
    setFileLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target.result || "");
      setCode(text);
      const base = f.name.replace(/\.[^/.]+$/, '') || f.name;
      setFeedbackByStudentId({});
      setSubmittedStudents([
        {
          id: 1,
          name: base,
          sid: "",
          status: "Ungraded",
          orgDefinedId: "",
          files: [{ name: f.name, path: f.name, folder: "", code: text }],
        },
      ]);
      setActiveStudentId(1);
      setActiveSubmissionIndex(0);
      setActiveFileName(resolvedFileLabel({ name: f.name, path: f.name, folder: '' }));
      setFileLoading(false);
    };
    reader.onerror = () => setFileLoading(false);
    reader.readAsText(f);
  };

  const handleReferenceFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.name.toLowerCase().endsWith('.zip')) {
      setSolutionsZipFile(f);
      sendSolutionsZipToBackend(f);
      return;
    }
    setSolutionFiles([{ name: f.name, path: f.name, code: "" }]);
    setActiveSolutionIndex(0);
    setReferenceFileLoading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const loaded = String(ev.target.result || "");
      setReference(loaded);
      setSolutionFiles([{ name: f.name, path: f.name, code: loaded }]);
      setActiveSolutionIndex(0);
      setReferenceFileLoading(false);
    };
    reader.onerror = () => setReferenceFileLoading(false);
    reader.readAsText(f);
  };

  // ── Run code ──────────────────────────────────────────
  const handleCheck = async () => {
    setIsChecking(true);
    setActual("");
    setMismatchLine(null);
    setGradeMatch(null);
    setGradeMessage("");
    try {
      setOutputMatched(null);

      // 1) Code comparison (Panel 2 code vs Panel 3 reference)
      const gradeResp = await fetch('http://127.0.0.1:8000/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentCode: code,
          solutionCode: reference,
        }),
      });

      if (!gradeResp.ok) {
        const txt = await gradeResp.text().catch(() => "");
        console.error("grade failed:", gradeResp.status, txt);
        alert(`grade error: ${gradeResp.status}`);
        return;
      }

      const gradeData = await gradeResp.json().catch(() => null);
      setGradeMatch(!!gradeData?.isCorrect);
      setGradeMessage(String(gradeData?.message || ""));

      // 2) Run both programs and display their outputs
      const runOne = async (source) => {
        const resp = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source }),
        });
        const data = await resp.json().catch(() => ({}));
        const stdout = String(data?.stdout || '').trim();
        const stderr = String(data?.stderr || '').trim();
        return stdout || stderr || 'No output.';
      };

      const [studentOut, referenceOut] = await Promise.all([
        runOne(code),
        runOne(reference),
      ]);

      // Compare only what appears after the word "output" (e.g. "output: ...").
      const extractAfterOutput = (text) => {
        const s = String(text || "");
        const m = s.match(/output\s*:?\s*([\s\S]*)/i);
        return (m && m[1] !== undefined ? m[1] : s).trim();
      };

      const studentExtracted = extractAfterOutput(studentOut);
      const referenceExtracted = extractAfterOutput(referenceOut);

      setActual(studentExtracted);
      setExpected(referenceExtracted);
      setOutputMatched(studentExtracted.trim() === referenceExtracted.trim());
    } catch (error) { setActual(String(error)); }
    finally { setIsChecking(false); }
  };

  // ── ZIP drag & drop / click (Solutions.zip) ───────────
  const handleZipFile = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Please use a .zip file.');
      return;
    }
    setSolutionsZipFile(file);
    // Placeholder: wire to backend parsing later.
    console.log('Selected zip file:', file.name);
  };

  const handleZipDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingZip(false);
    const file = e.dataTransfer.files?.[0];
    handleZipFile(file);
  };

  const handleZipDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingZip(true);
  };

  const handleZipDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingZip(false);
  };

  // ── Demo: load fake student submissions ───────────────
  const handleSubmitFiles = () => {
    setFeedbackByStudentId({});
    const students = DEMO_STUDENTS.map((s, i) => toSubmittedStudent(s, i));
    setSubmittedStudents(students);
    const first = students[0];
    setActiveStudentId(first.id);
    setActiveFileName(resolvedFileLabel(first.files[0]));
    setCode(first.files[0].code);
    setActiveSubmissionIndex(0);
  };

  const handleSelectStudent = (student) => {
    setActiveStudentId(student.id);
    const firstFile = student.files[0];
    if (!firstFile) return;
    setActiveFileName(resolvedFileLabel(firstFile));
    setCode(firstFile.code);
    setActiveSubmissionIndex(0);
  };

  const handleSelectFile = (file) => {
    setActiveFileName(resolvedFileLabel(file));
    setCode(file.code);
    if (activeStudent) {
      const i = activeStudent.files.findIndex(
        (x) => resolvedFileLabel(x) === resolvedFileLabel(file)
      );
      if (i >= 0) setActiveSubmissionIndex(i);
    }
  };

  const handleEditorPanelDoubleClick = (which, e) => {
    if (
      e.target.closest('button') ||
      e.target.closest('label') ||
      e.target.closest('input') ||
      e.target.closest('.cm-editor') ||
      e.target.closest('.cm-gutters') ||
      e.target.closest('.cm-scroller')
    ) {
      return;
    }
    setExpandedEditorPanel((prev) => (prev === which ? null : which));
  };

  const handlePrevPanel2File = () => {
    if (!activeStudent) return;
    const files = activeStudent.files;
    if (files.length <= 1) return;
    const idx = files.findIndex((x) => resolvedFileLabel(x) === activeFileName);
    const cur = idx >= 0 ? idx : 0;
    const next = (cur - 1 + files.length) % files.length;
    handleSelectFile(files[next]);
  };

  const handleNextPanel2File = () => {
    if (!activeStudent) return;
    const files = activeStudent.files;
    if (files.length <= 1) return;
    const idx = files.findIndex((x) => resolvedFileLabel(x) === activeFileName);
    const cur = idx >= 0 ? idx : 0;
    const next = (cur + 1) % files.length;
    handleSelectFile(files[next]);
  };

  const handlePrevSolutionFile = () => {
    if (!solutionFiles.length) return;
    const nextIndex = (activeSolutionIndex - 1 + solutionFiles.length) % solutionFiles.length;
    const sol = solutionFiles[nextIndex];
    setActiveSolutionIndex(nextIndex);
    setReference(sol?.code || "");
    const student = submittedStudents.find((s) => s.id === activeStudentId);
    if (!student?.files?.length || !sol) return;
    const key = normalizeAsmFileKey(asmBasename(sol));
    const fi = student.files.findIndex(
      (f) => normalizeAsmFileKey(asmBasename(f)) === key
    );
    if (fi < 0) return;
    const f = student.files[fi];
    setActiveFileName(resolvedFileLabel(f));
    setCode(typeof f.code === "string" ? f.code : "");
    setActiveSubmissionIndex(fi);
  };

  const handleNextSolutionFile = () => {
    if (!solutionFiles.length) return;
    const nextIndex = (activeSolutionIndex + 1) % solutionFiles.length;
    const sol = solutionFiles[nextIndex];
    setActiveSolutionIndex(nextIndex);
    setReference(sol?.code || "");
    const student = submittedStudents.find((s) => s.id === activeStudentId);
    if (!student?.files?.length || !sol) return;
    const key = normalizeAsmFileKey(asmBasename(sol));
    const fi = student.files.findIndex(
      (f) => normalizeAsmFileKey(asmBasename(f)) === key
    );
    if (fi < 0) return;
    const f = student.files[fi];
    setActiveFileName(resolvedFileLabel(f));
    setCode(typeof f.code === "string" ? f.code : "");
    setActiveSubmissionIndex(fi);
  };

  const hasRun = outputMatched !== null;
  useEffect(() => {
    if (!expandedEditorPanel) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setExpandedEditorPanel(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [expandedEditorPanel]);

  const activeStudent = submittedStudents.find(s => s.id === activeStudentId) || null;
  const filtered = submittedStudents.filter((s) =>
    String(s.name || '').toLowerCase().includes(search.toLowerCase()) ||
    String(s.sid || '').toLowerCase().includes(search.toLowerCase())
  );

  /** Panel 2 file → Panel 3: show the solution whose basename matches the active student file. */
  useEffect(() => {
    if (!solutionFiles.length) return;
    const student = activeStudentId
      ? submittedStudents.find((s) => s.id === activeStudentId)
      : null;
    const fileEntry =
      student && activeFileName
        ? student.files.find((f) => resolvedFileLabel(f) === activeFileName)
        : null;
    const resolved = fileEntry ?? student?.files?.[0] ?? null;

    if (resolved) {
      const key = normalizeAsmFileKey(asmBasename(resolved));
      const idx = solutionFiles.findIndex(
        (sf) => normalizeAsmFileKey(asmBasename(sf)) === key
      );
      if (idx >= 0) {
        setActiveSolutionIndex(idx);
        const c = solutionFiles[idx]?.code;
        if (typeof c === "string") setReference(c);
        return;
      }
    }

    setActiveSolutionIndex(0);
    const c0 = solutionFiles[0]?.code;
    if (typeof c0 === "string") setReference(c0);
  }, [solutionFiles, submittedStudents, activeStudentId, activeFileName]);

  const activeSolutionEntry = solutionFiles[activeSolutionIndex] ?? null;
  const activeSolutionDisplayName = activeSolutionEntry
    ? (activeSolutionEntry.name || activeSolutionEntry.path?.split('/').filter(Boolean).pop() || 'file')
    : null;

  let panel2ActiveFileEntry = null;
  let panel2FileIndex = 0;
  let panel2FileCount = 0;
  if (activeStudent) {
    const files = activeStudent.files;
    panel2FileCount = files.length;
    const idx = files.findIndex((x) => resolvedFileLabel(x) === activeFileName);
    panel2FileIndex = idx >= 0 ? idx : 0;
    panel2ActiveFileEntry = files[panel2FileIndex] || null;
  }
  const panel2DisplayName = panel2ActiveFileEntry
    ? (panel2ActiveFileEntry.name || panel2ActiveFileEntry.path?.split('/').filter(Boolean).pop() || 'file')
    : null;

  const noMatchingSolutionFile =
    solutionFiles.length > 0 &&
    !!activeStudent &&
    !!panel2ActiveFileEntry &&
    solutionFiles.findIndex(
      (sf) =>
        normalizeAsmFileKey(asmBasename(sf)) ===
        normalizeAsmFileKey(asmBasename(panel2ActiveFileEntry))
    ) < 0;

  return (
    <div className="ag-root" data-theme={theme}>

      {/* ── Floating toolbar ─────────────────────────── */}
      <div
        className="ag-toolbar"
        ref={dragRef}
        onMouseDown={handleToolbarMouseDown}
        style={{ bottom: toolbarPos.bottom, right: toolbarPos.right }}
        title="Drag to move"
      >
        {/* Theme selector */}
        <select
          className="ag-toolbar-theme-select"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          title="Editor theme"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="midnight">Midnight</option>
          <option value="dracula">Dracula</option>
          <option value="monokai">Monokai</option>
        </select>

        <div className="ag-toolbar-divider" />

        {/* Import */}
        <label className="ag-toolbar-btn" title="Import grades (JSON)">
          <IconImport />
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </label>

        {/* Export */}
        <button className="ag-toolbar-btn" onClick={handleExport} title="Export Brightspace CSV (all students)">
          <IconExport />
        </button>

        <div className="ag-toolbar-divider" />

        {/* LCC switch */}
        <button
          className="ag-toolbar-btn ag-toolbar-lcc"
          onClick={() => window.location.href = '/main'}
          title="Switch to LCC Emulator"
        >
          LCC
        </button>
      </div>

      {/* ── Panel 1: Students (Submission) ─────────────── */}
      <div className="ag-panel ag-students">
        <div className="ag-panel-header">Panel 1: Students</div>
        <div className="ag-students-body">
          {submittedStudents.length > 0 ? (
            <>
              <input
                className="ag-search"
                type="search"
                placeholder="Search students…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search students"
              />
              <ul className="ag-student-list">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={`ag-student-item${
                        activeStudentId === s.id ? ' ag-student-selected ag-student-item--active' : ''
                      }`}
                      onClick={() => handleSelectStudent(s)}
                    >
                      <span className="ag-student-name" title={safeStudentDisplayName(s.name)}>
                        {safeStudentDisplayName(s.name)}
                      </span>
                      <span
                        className="ag-status-badge"
                        style={{
                          background: '#e8eef8',
                          color: '#475569',
                          border: '1px solid #c5cedd',
                        }}
                      >
                        {(s.files?.length ?? 0)} .a
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="ag-student-empty">
              Upload a submissions <code>.zip</code> from Panel 2. Each top-level folder becomes one student; use the
              arrows in Panel 2 to browse their <code>.a</code> files. With solutions in Panel 3, the reference file
              follows the same <code>.a</code> name as the student file.
            </p>
          )}
        </div>
      </div>

      {/* ── Panel 2: Student Code ────────────────────── */}
      <div
        className={`ag-panel ag-code-panel${expandedEditorPanel === 'code' ? ' ag-panel--fullscreen' : ''}`}
        onDoubleClick={(e) => handleEditorPanelDoubleClick('code', e)}
        title="Double-click header or margins to expand (Esc to exit)"
      >
        <div className="ag-panel-header">
          <span>Panel 2</span>
          <div className="ag-ref-header-right ag-code-panel-file-header">
            {panel2FileCount > 0 && panel2DisplayName && (
              <span
                className="ag-ref-active-file"
                title={panel2ActiveFileEntry?.path || panel2DisplayName || ''}
              >
                {panel2DisplayName}
                {panel2FileCount > 1 && (
                  <span className="ag-ref-file-idx">
                    {' '}({panel2FileIndex + 1}/{panel2FileCount})
                  </span>
                )}
                {noMatchingSolutionFile && (
                  <span className="ag-file-not-found-badge" role="status">
                    File not found
                  </span>
                )}
              </span>
            )}
            <div className="ag-ref-nav-btns">
              <button
                type="button"
                className="ag-upload-btn"
                onClick={handlePrevPanel2File}
                disabled={panel2FileCount <= 1}
                title="Previous student file (Panel 3 uses solution with the same .a name)"
              >
                ←
              </button>
              <button
                type="button"
                className="ag-upload-btn"
                onClick={handleNextPanel2File}
                disabled={panel2FileCount <= 1}
                title="Next student file (Panel 3 uses solution with the same .a name)"
              >
                →
              </button>
            </div>
          </div>
        </div>
        {activeStudent ? (
          <div className="ag-file-tabs">
            {activeStudent.files.map((f, idx) => (
              <button
                key={f.path || `${safeFileTabLabel(f)}-${idx}`}
                className={`ag-file-tab${resolvedFileLabel(f) === activeFileName ? ' ag-file-tab--active' : ''}`}
                onClick={() => handleSelectFile(f)}
              >
                {safeFileTabLabel(f)}
              </button>
            ))}
          </div>
        ) : (
          <div className="ag-code-actions">
            <label className="ag-upload-btn">
              {fileLoading ? 'Loading…' : 'Upload File'}
              <input type="file" accept="*/*" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>
        )}
        <CodeMirror
          value={code}
          onChange={val => setCode(val)}
          theme={theme !== 'light' ? oneDark : 'light'}
          basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true }}
          style={{ flex: 1, overflow: 'auto', fontSize: 13, borderRadius: 8 }}
        />
      </div>

      {/* ── Panel 3: Reference ───────────────────────── */}
      <div
        className={`ag-panel ag-ref-panel${expandedEditorPanel === 'reference' ? ' ag-panel--fullscreen' : ''}`}
        onDoubleClick={(e) => handleEditorPanelDoubleClick('reference', e)}
        title="Double-click header or margins to expand (Esc to exit)"
      >
        <div className="ag-panel-header">
          <span>Panel 3: Reference</span>
          <div className="ag-ref-header-right">
            {solutionFiles.length > 0 && (
              <span
                className="ag-ref-active-file"
                title={
                  noMatchingSolutionFile
                    ? 'No solution file matches this student file name'
                    : activeSolutionEntry?.path || activeSolutionDisplayName || ''
                }
              >
                {noMatchingSolutionFile ? (
                  <span className="ag-file-not-found-badge">File not found</span>
                ) : (
                  <>
                    {activeSolutionDisplayName || '—'}
                    {solutionFiles.length > 1 && (
                      <span className="ag-ref-file-idx">
                        {' '}({activeSolutionIndex + 1}/{solutionFiles.length})
                      </span>
                    )}
                  </>
                )}
              </span>
            )}
            <div className="ag-ref-nav-btns">
              <button
                type="button"
                className="ag-upload-btn"
                onClick={handlePrevSolutionFile}
                disabled={solutionFiles.length <= 1}
                title="Previous solution file (Panel 2 jumps to student file with the same .a name)"
              >
                ←
              </button>
              <button
                type="button"
                className="ag-upload-btn"
                onClick={handleNextSolutionFile}
                disabled={solutionFiles.length <= 1}
                title="Next solution file (Panel 2 jumps to student file with the same .a name)"
              >
                →
              </button>
            </div>
          </div>
        </div>
        <div className="ag-code-actions">
          <label className="ag-upload-btn">
            {referenceFileLoading ? 'Loading…' : 'Upload File'}
            <input type="file" accept="*/*" onChange={handleReferenceFile} style={{ display: 'none' }} />
          </label>
        </div>
        <CodeMirror
          value={reference}
          readOnly
          theme={theme !== 'light' ? oneDark : 'light'}
          basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: false }}
          style={{ flex: 1, overflow: 'auto', fontSize: 13, borderRadius: 8 }}
        />
      </div>

      {/* ── Panel 4: Input ───────────────────────────── */}
      <div className="ag-panel ag-input-panel">
        <div className="ag-panel-header">Panel 4: Input</div>
        <p className="ag-input-hint">Test case inputs (stdin)</p>
        <textarea className="ag-input-box" value={input} onChange={e => setInput(e.target.value)} />
        <button className="ag-btn ag-btn-check" onClick={handleCheck} disabled={isChecking}>
          {isChecking ? 'Running…' : 'Run Code'}
        </button>
      </div>

      {/* ── Panel 5: Output ──────────────────────────── */}
      <div className="ag-panel ag-output-panel">
        <div className="ag-panel-header">
          <span>Panel 5: Output</span>
          {hasRun && gradeMatch !== null && (
            <span className={`ag-code-compare-badge ${gradeMatch ? "ag-code-compare-badge--ok" : "ag-code-compare-badge--bad"}`}>
              {gradeMatch ? "✓ Code Match" : "✗ Code Mismatch"}
            </span>
          )}
        </div>
        <div className={`ag-output-box ag-expected ${hasRun ? (outputMatched ? "ag-match" : "ag-mismatch") : ""}`}>
          <span className="ag-output-label">Panel 3 Output:</span>
          <textarea className="ag-output-inline-input" value={expected} onChange={e => setExpected(e.target.value)} />
        </div>
        <div className={`ag-output-box ag-actual ${hasRun ? (outputMatched ? "ag-match" : "ag-mismatch") : ""}`}>
          <span className="ag-output-label">Panel 2 Output:</span>
          <span className="ag-output-value">{actual || '—'}</span>
        </div>
        {hasRun && outputMatched && <div className="ag-match-msg">✓ OUTPUT MATCHES</div>}
        {hasRun && !outputMatched && <div className="ag-mismatch-msg">✗ OUTPUT DOES NOT MATCH</div>}
      </div>

      {/* ── Panel 6: Feedback ────────────────────────── */}
      <div className="ag-panel ag-feedback-panel">
        <div className="ag-panel-header">Panel 6: Feedback</div>

        <div className="ag-score-box">
          <span className="ag-score-word">Score:</span>
          <input
            className="ag-score-num-input"
            type="number"
            value={score === "" || score === null || score === undefined ? "" : score}
            onChange={(e) => {
              const v = e.target.value;
              patchActiveFeedback({ score: v === "" ? "" : Number(v) });
            }}
            title="Edit score"
          />
          <span className="ag-score-slash"> / </span>
          <input
            className="ag-score-max-input"
            type="number"
            value={maxScore}
            onChange={(e) => patchActiveFeedback({ maxScore: Number(e.target.value) })}
            title="Edit max score"
          />
        </div>

        {/* Message to student */}
        <div className="ag-message-section">
          <label className="ag-message-label">Message to Student:</label>
          <textarea
            className="ag-message-box"
            value={message}
            onChange={(e) => patchActiveFeedback({ message: e.target.value })}
          />
        </div>

        <div className="ag-feedback-actions">
          <button
            className="ag-btn ag-btn-save"
            onClick={handleExport}
            title="Download Brightspace CSV for all students in the list"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}