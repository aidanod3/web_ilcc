# WebLCC — ILCC Web Emulator & Automated Grading System

A full-stack web platform for teaching assembly language programming using the **Low Cost Computer (LCC)** architecture. Students write, run, and debug LCC assembly in a browser-based IDE with real-time CPU/memory/stack visualization, while instructors leverage automated grading powered by the same emulator.

---

## Project Origin and Team Structure
This project started from a classroom need raised by **Charlie**, professor of Assembly at **SUNY New Paltz**:
- He wanted an interactive way to teach assembly live during lecture.
- He also wanted students to be able to run assembly code easily for labs and projects without local setup friction.

Team organization:
- Total team size: **5 members**
- Split into **2 groups**:
- **Group 1 (3 members):** Main WebLCC IDE/frontend + trace backend integration
- **Group 2 (2 members):** Autograder backend flow and submission evaluation path
- Both groups were aligned around one shared rule: use the **same emulator core** for consistent behavior.

---

## Project Goal
ILCC provides:
1. An interactive web IDE for writing and tracing LCC assembly programs.
2. An automated grading path that executes student submissions against expected output.

Core principle: **both paths use the same emulator core**, so classroom behavior and autograder behavior stay consistent.

## The Problem
Toolchain friction was the starting issue:
- Students had different OS setups (macOS, Windows, Linux) and inconsistent local environments.
- Assembly toolchain setup was error-prone and took class time away from learning.
- Feedback loops were slow (edit -> compile -> run -> inspect), especially for beginners.
- Grading consistency was hard when local runtime behavior differed from grader behavior.

## Solution
- A browser-based ILCC editor experience for writing and tracing LCC code.
- A main backend that manages stateful trace sessions and snapshot APIs.
- A shared emulator core (assembler/interpreter) used by both IDE runtime and autograder.
- A grading backend path that executes and compares submissions consistently.

---

## Core Design Principle

Both the **interactive IDE** and the **autograder** execute student code through the **exact same emulator**, guaranteeing consistent behavior, deterministic output, and fair grading.

```mermaid
graph LR
    A["Student IDE<br/>(React Frontend)"] -->|POST /api/run<br/>POST /api/trace| B["Express API Server"]
    C["Autograder<br/>(FastAPI)"] -->|Spawns process| D["LCC Emulator"]
    B -->|Invokes| D
    style D fill:#f7a800,stroke:#333,color:#000,stroke-width:2px
    style A fill:#1e1e2e,stroke:#cdd6f4,color:#cdd6f4
    style C fill:#1e1e2e,stroke:#cdd6f4,color:#cdd6f4
    style B fill:#1e1e2e,stroke:#cdd6f4,color:#cdd6f4
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Vite 7, CodeMirror 6 | IDE, editor, visualization |
| **Backend API** | Node.js, Express 4 | REST API for execution & tracing |
| **Emulator** | Custom JavaScript | Assembler, Linker, Interpreter |
| **Autograder** | Python 3, FastAPI | Automated submission grading |
| **Testing** | Jest | Unit, integration, and E2E tests |

---

## System Architecture
![ILCC System Architecture](docs/system-architecture.png)

---

## High-Level Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        direction TB
        Editor["CodeMirror Editor<br/>Write LCC Assembly"]
        Dashboard["Dashboard Layout<br/>Resizable Panels"]
        CPU["CPU Panel<br/>Registers & Flags"]
        Stack["Stack Panel<br/>SP/FP Visualization"]
        Memory["Memory Panel<br/>Address Grid"]
        Terminal["Terminal<br/>Program Output"]
        Editor --> Dashboard
        Dashboard --> CPU
        Dashboard --> Stack
        Dashboard --> Memory
        Dashboard --> Terminal
    end

    subgraph Hooks["React Hooks"]
        useRun["useRunProgram<br/>Quick Execution"]
        useTrace["useTraceSession<br/>Step-by-Step Debug"]
    end

    subgraph Backend["Backend API (Express)"]
        RunAPI["POST /api/run<br/>Full Execution"]
        TraceAPI["POST /api/trace/sessions<br/>Create Debug Session"]
        StepAPI["POST /api/trace/sessions/:id/step<br/>Step Instruction"]
        StateAPI["GET /api/trace/sessions/:id/state<br/>Read Snapshot"]
        ContAPI["POST /api/trace/sessions/:id/continue<br/>Run to Halt"]
        ResetAPI["POST /api/trace/sessions/:id/reset<br/>Restart"]
    end

    subgraph Emulator["LCC Emulator Engine"]
        ASM["Assembler<br/>.a → .o / .e"]
        LNK["Linker<br/>.o + .o → .e"]
        INT["Interpreter<br/>16-bit VM Execution"]
        ASM --> LNK
        LNK --> INT
    end

    Dashboard --> useRun
    Dashboard --> useTrace
    useRun -->|HTTP| RunAPI
    useTrace -->|HTTP| TraceAPI
    useTrace -->|HTTP| StepAPI
    useTrace -->|HTTP| StateAPI
    RunAPI --> ASM
    TraceAPI --> ASM
    StepAPI --> INT
    StateAPI --> INT

    style Frontend fill:#1e1e2e,stroke:#89b4fa,color:#cdd6f4
    style Backend fill:#1e1e2e,stroke:#a6e3a1,color:#cdd6f4
    style Emulator fill:#1e1e2e,stroke:#f7a800,color:#cdd6f4
    style Hooks fill:#1e1e2e,stroke:#cba6f7,color:#cdd6f4
```

---

## Assembly-to-Execution Pipeline

The emulator processes LCC assembly through a multi-stage pipeline:

```mermaid
flowchart LR
    subgraph Input
        SRC["Source Code<br/>.a file"]
    end

    subgraph Pass1["Assembler — Pass 1"]
        P1["Scan Labels<br/>Build Symbol Table<br/>Process Directives"]
    end

    subgraph Pass2["Assembler — Pass 2"]
        P2["Resolve Symbols<br/>Encode Instructions<br/>Generate Machine Code"]
    end

    subgraph Link["Linker"]
        L1["Merge Object Files<br/>Resolve External Refs<br/>Adjust Relocations"]
    end

    subgraph Exec["Interpreter"]
        VM["16-bit Virtual Machine<br/>8 Registers (r0-r7)<br/>65,536 Words Memory<br/>Condition Flags (N,Z,P,C,V)"]
    end

    subgraph Output
        OUT["stdout / stderr<br/>Exit Code<br/>Trace Snapshots"]
    end

    SRC --> P1 --> P2 -->|".o object"| L1 -->|".e executable"| VM --> OUT
    P2 -->|".e executable<br/>(single file)"| VM

    style Input fill:#313244,stroke:#cdd6f4,color:#cdd6f4
    style Pass1 fill:#313244,stroke:#89b4fa,color:#cdd6f4
    style Pass2 fill:#313244,stroke:#89b4fa,color:#cdd6f4
    style Link fill:#313244,stroke:#a6e3a1,color:#cdd6f4
    style Exec fill:#313244,stroke:#f7a800,color:#cdd6f4
    style Output fill:#313244,stroke:#cdd6f4,color:#cdd6f4
```

---

## Frontend Component Architecture

```mermaid
graph TB
    App["App.jsx<br/>React Router"]
    App -->|"/ilcc"| Ilcc["Ilcc.jsx<br/>Main IDE Page"]
    App -->|"/autograder"| AG["Autograder.jsx"]

    Ilcc --> Dashboard["Dashboard.jsx<br/>Resizable Panel Layout"]

    subgraph LeftColumn["Left Column"]
        CE["CodeEditor.jsx<br/>CodeMirror 6"]
        Term["Terminal.jsx<br/>Output + Trace Info"]
    end

    subgraph RightColumn["Right Column — Debugger"]
        CPUPanel["CPUPanel.jsx<br/>r0-r7, PC, IR"]
        StackPanel["StackPanel.jsx<br/>SP/FP Markers"]
        MemPanel["MemoryPanel.jsx<br/>4-Cell Grid Rows"]
    end

    Dashboard --> LeftColumn
    Dashboard --> RightColumn

    subgraph SharedUI["Shared Components"]
        Header["Header.jsx"]
        Pane["Pane.jsx"]
        PaneHeader["PaneHeader.jsx"]
    end

    LeftColumn -.-> SharedUI
    RightColumn -.-> SharedUI

    subgraph StateHooks["State Management (Hooks)"]
        H1["useTraceSession.js<br/>Session ID, Snapshots<br/>next/reset"]
        H2["useRunProgram.js<br/>Quick Run, Output"]
    end

    Ilcc --> StateHooks

    style App fill:#313244,stroke:#89b4fa,color:#cdd6f4
    style LeftColumn fill:#1e1e2e,stroke:#89b4fa,color:#cdd6f4
    style RightColumn fill:#1e1e2e,stroke:#f7a800,color:#cdd6f4
    style SharedUI fill:#1e1e2e,stroke:#585b70,color:#cdd6f4
    style StateHooks fill:#1e1e2e,stroke:#cba6f7,color:#cdd6f4
```

---

## API Endpoints

```mermaid
graph LR
    subgraph Execution["Execution"]
        R1["POST /api/run<br/>source → stdout, stderr, exitCode"]
    end

    subgraph TraceSessions["Trace Sessions"]
        T1["POST /api/trace/sessions<br/>Create session → sessionId + snapshot"]
        T2["GET  /api/trace/sessions/:id/state<br/>Read current snapshot"]
        T3["POST /api/trace/sessions/:id/step<br/>Execute N instructions"]
        T4["POST /api/trace/sessions/:id/continue<br/>Run to halt"]
        T5["POST /api/trace/sessions/:id/reset<br/>Reinitialize interpreter"]
        T6["DELETE /api/trace/sessions/:id<br/>Cleanup session"]
    end

    subgraph Legacy["Legacy"]
        L1["POST /api/trace<br/>Full trace array (deprecated)"]
    end

    style Execution fill:#313244,stroke:#a6e3a1,color:#cdd6f4
    style TraceSessions fill:#313244,stroke:#89b4fa,color:#cdd6f4
    style Legacy fill:#313244,stroke:#585b70,color:#a6adc8
```

---

## LCC Virtual Machine Architecture

```mermaid
graph TB
    subgraph CPU["CPU"]
        direction LR
        subgraph Registers["General Purpose Registers"]
            R0["r0"] --- R1["r1"] --- R2["r2"] --- R3["r3"]
            R4["r4"] --- R5["r5 (FP)"] --- R6["r6 (SP)"] --- R7["r7 (LR)"]
        end
        PC["Program Counter (PC)"]
        IR["Instruction Register (IR)"]
        subgraph Flags["Condition Flags"]
            N["N (Negative)"]
            Z["Z (Zero)"]
            P["P (Positive)"]
            C["C (Carry)"]
            V["V (Overflow)"]
        end
    end

    subgraph MEM["Memory (65,536 × 16-bit words)"]
        direction LR
        Code["Code Segment<br/>0x0000+"]
        Data["Data Segment"]
        Heap["Heap ↓"]
        Free["..."]
        StackM["Stack ↑<br/>→ 0xFFFF"]
    end

    subgraph ISA["Instruction Set"]
        direction LR
        Arith["Arithmetic<br/>ADD SUB MUL<br/>DIV REM"]
        Logic["Logical<br/>AND OR XOR NOT"]
        DataMov["Data Movement<br/>MOV LD ST LEA<br/>LDR STR PUSH POP"]
        Control["Control Flow<br/>BR JMP JSR RET<br/>BL BLR CMP TST"]
        IO["I/O (TRAP)<br/>AOUT DOUT HOUT<br/>SOUT DIN HIN SIN"]
    end

    CPU -->|"Fetch/Decode/Execute"| MEM
    IR -->|"Decodes to"| ISA

    style CPU fill:#1e1e2e,stroke:#f7a800,color:#cdd6f4
    style MEM fill:#1e1e2e,stroke:#a6e3a1,color:#cdd6f4
    style ISA fill:#1e1e2e,stroke:#89b4fa,color:#cdd6f4
    style Registers fill:#313244,stroke:#f7a800,color:#cdd6f4
    style Flags fill:#313244,stroke:#f7a800,color:#cdd6f4
```

---

## Autograder Flow

```mermaid
sequenceDiagram
    participant Instructor
    participant FastAPI as Autograder (FastAPI)
    participant Emulator as LCC Emulator

    Instructor->>FastAPI: POST /execute<br/>{code, expectedOutput}
    FastAPI->>FastAPI: Clean & write code to /tmp/code.a
    FastAPI->>Emulator: spawn node lcc.js /tmp/code.a
    Emulator->>Emulator: Assemble → Link → Execute
    Emulator-->>FastAPI: stdout / stderr (5s timeout)
    FastAPI->>FastAPI: Compare actualOutput == expectedOutput
    FastAPI-->>Instructor: {success, actualOutput, matched, error}
```

---

## Project Structure

```text
web_ilcc/
├── package.json                        # Root workspace (concurrently dev)
├── weblcc/                             # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── pages/
│   │   │   ├── Ilcc.jsx
│   │   │   └── Autograder.jsx
│   │   ├── components/
│   │   ├── hooks/
│   │   └── constants/
│   ├── vite.config.js
│   └── package.json
├── backend/
│   ├── weblcc-backend/
│   │   ├── server.js
│   │   └── package.json
│   ├── autograder-backend/
│   │   ├── main.py
│   │   └── test_api.py
│   └── emulator/
│       └── src/core/
│           ├── assembler.js
│           ├── interpreter.js
│           ├── linker.js
│           └── lcc.js
└── docs/
    └── system-architecture.png
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Python 3.10+ (for autograder only)

### Main WebLCC (Frontend + Main Trace Backend)
From the repository root:

```bash
npm install
npm run dev
```

This starts both:
- Frontend (Vite)
- Main trace backend (`backend/weblcc-backend`) on port `3002`

### Autograder Backend (FastAPI)
Open a second terminal:

```bash
cd backend/autograder-backend
python3 -m pip install fastapi uvicorn pydantic
python3 -m uvicorn main:app --reload --port 8000
```

Autograder endpoint:
- `POST http://127.0.0.1:8000/execute`

### Emulator CLI (standalone)

```bash
cd backend/emulator

# Assemble and execute
node src/core/lcc.js demos/demoA.a
```

### Running Tests

```bash
cd backend/emulator
npm test
```

---

## License

This project is intended for academic and instructional use.
