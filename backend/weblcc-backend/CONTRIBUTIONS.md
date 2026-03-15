# Contributions Log

This log is primarily for Michael Curry to keep track of what Student: Cedric has done/contributed throughout the project.


CED - Backend 
## 2026-02-02  WEEK
- Set up repo structure with `WebLCC/` and `Auto-grading/`.
- Imported `lccjs` into `WebLCC/`.
- Updated `README.md` with usage/testing notes.
- Set up basic backend file organization to prep frontend connectivity.
- Setup basic frontend for React to have a working local host frontend to prepare the frontend developers 
- Setup basic frontend for emulator compiling of assembly code to beging testing output accuracy of .a code/files

## 2026-02-03 WEEK
- Started implementing the trace system for step-by-step execution in the WebLCC frontend.
- Attempted testing the Solutions `.a` files for emulator accuracy checks.

## 2026-02-19 WEEK
- Wired real trace data from the emulator (assembler + interpreter) into the backend API.
- Added per-instruction trace snapshots (registers, flags, stack, memory) and pause handling for input traps.
- Updated the WebLCC UI to render live trace state, highlight memory/stack tags, and show per-step PC/mnemonic details.
- Split frontend layout into modular components and improved trace list formatting.
- Set up workspace dev runner and port/proxy changes for running frontend + backend together.
