# ILCC Web Compiler and Automated Grading System

## Project Overview
This project is a web-based implementation of an **ILCC (Intermediate-Level C / Assembly) compiler system** intended for academic and instructional use. The system has two primary goals:

1. Allow students to write and execute ILCC assembly code in a web environment  
2. Automatically grade student submissions by executing their code and comparing it against reference solutions

A core design decision of this project is that **both execution and grading rely on the same compiler and runtime logic**, ensuring consistency, correctness, and fairness in evaluation.

---

## Core Design Principle
The most technically challenging and critical component of this project is the **assembly compiler and interpreter**.

Both major features:
- The main student-facing web application
- The automated grading system

depend on the **exact same compiler**. As a result, this project follows a **backend-first approach**, prioritizing compiler correctness and stability before frontend development begins.

Perfecting the compiler early allows all later features to reuse it without duplicating logic or introducing inconsistencies.

---

## Technology Stack

### Backend
- JavaScript (Node.js)
- Custom ILCC Assembly Compiler & Interpreter
- CLI-based execution (initial development phase)
- Shared compiler logic for:
  - Student code execution
  - Reference solution execution
  - Deterministic output comparison for grading

### Frontend (later phase)
- Web-based user interface (framework TBD)
- Backend API for compiler execution
- Code editor and output display

---

## Development Timeline

### Phase 1 — Compiler Development (Weeks 1–4)
**Primary Objective:** Develop and perfect the ILCC assembly compiler before major UI work.

During this phase:
- The team studies and extends the existing `lccjs` compiler
- The compiler is tested extensively via:
  - Terminal-based execution
  - Optional temporary localhost testing
- Emphasis is placed on:
  - Correct parsing
  - Correct execution semantics
  - Reliable and reproducible output

This compiler will later be reused *unchanged* by both the main web application and the automated grading system.

---

### Phase 2 — Backend Integration
Once the compiler is stable:
- The same compiler logic is integrated into:
  - The main ILCC web application
  - The automated grading feature
- Backend logic is implemented for:
  - Running reference solutions
  - Running student submissions
  - Comparing outputs for grading

---

### Phase 3 — Frontend Development
After backend stability is achieved:
- A web interface is developed for students and instructors
- The frontend communicates with the compiler through a backend API
- Execution output and grading feedback are presented to users

---

## Team Structure and Responsibilities

### Team 1 — Main Web Application (3 People)
Responsible for:
- Backend integration of the compiler into the primary web application
- API design for code execution
- Student-facing features (code editor, execution output, UI logic)
- Coordinating with frontend developers on usability and integration

### Team 2 — Automated Grading Feature (2 People)
Responsible for:
- Backend grading logic
- Executing student submissions and reference solutions
- Output comparison and grading correctness
- Ensuring grading behavior matches the compiler used in the main web application

Both teams rely on the **same shared compiler backend**, developed during Phase 1.


