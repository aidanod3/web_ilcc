#!/usr/bin/env node

// interpreter.js

const fs = require("fs");
const path = require("path");
/* Stats, name file, and diff removed — not needed for web app */
const generateBSTLSTContent = () => '';
const nameHandler = { createNameFile: () => '' };

const newline = process.platform === "win32" ? "\r\n" : "\n";

const MAX_MEMORY = 65536; // 2^16

const isTestMode = typeof global.it === "function"; // crude check for Jest

function fatalExit(message, code = 1) {
	if (isTestMode) {
		throw new Error(message);
	} else {
		process.exit(code);
	}
}

class Interpreter {
	constructor() {
		this.mem = new Uint16Array(65536); // Memory (16-bit unsigned integers)
		this.r = new Uint16Array(8); // Registers r0 to r7 (16-bit signed integers)
		this.pc = 0; // Program Counter
		this.ir = 0; // Instruction Register
		this.n = 0; // Negative flag
		this.z = 0; // Zero flag
		this.c = 0; // Carry flag
		this.v = 0; // Overflow flag
		this.running = true;
		this.output = ""; // Output string
		this.inputBuffer = ""; // Input buffer for SIN (if needed)
		// this.options = {}; // Options from lcc.js (CLI only)
		this.instructionsExecuted = 0; // For infinite-loop detection
		// this.maxStackSize = 0; // For program statistics (CLI only)
		this.loadPoint = 0; // Default load point is 0
		this.spInitial = 0; // For tracking stack size
		this.memMax = 0; // Keep track of the highest memory address used
		this.inputFileName = ""; // Name of the input file
		// this.generateStats = false; // Whether to generate .lst and .bst files (CLI only)
		this.headerLines = [];
		this.instructionsCap = 500000; // Limit the number of instructions to prevent infinite loops
		// this.debugMode = false; // CLI symbolic debugger flag — not used in web
		// this.hasJumped = false; // Only read by the CLI debug block — not used in web
		this.currentIteration = 0; // How many instructions have been executed (used by handleSteps)
		// this.lastSnapshot;   // CLI state tracking — replaced by debugger.js diff logic
		// this.currentSnapshot;
		// this.snapshot = [];
		this.onOutput = null;        // Callback set by runner/debugger service — called on every write
		this.onInputRequest = null;  // Callback invoked when the interpreter needs input from the user
		this._inputResolve = null;   // Resolve fn for the pending input Promise
		this.memoryChanges = []        // Tracks memory writes per instruction (used by snapshot system)
	}

	/* ── CLI entry point — not used in the web app ─────────────────────────
	main(args) {
		args = args || process.argv.slice(2);

		if (args.length < 1) {
			console.error(
				"Usage: node interpreter.js <input filename> [options]"
			);
			// process.exit(1);
			fatalExit(
				"Usage: node interpreter.js <input filename> [options]",
				1
			);
		}

		// Parse arguments
		let i = 0;
		while (i < args.length) {
			let arg = args[i];
			if (arg.startsWith("-")) {
				// Option

				if (arg === "-nostats") {
					this.generateStats = false;
				} else if (arg === "-d") {
					this.debugMode = true;
				} else if (arg.startsWith("-L")) {
					// Load point option
					let loadPointStr = arg.substring(2);
					if (loadPointStr === "") {
						// Load point value is in the next argument
						i++;
						if (i >= args.length) {
							console.error("Error: -L option requires a value");
							// process.exit(1);
							fatalExit("Error: -L option requires a value", 1);
						}
						loadPointStr = args[i];
					}
					// Parse load point value (hexadecimal)
					this.loadPoint = parseInt(loadPointStr, 16);
					if (isNaN(this.loadPoint)) {
						console.error(
							`Invalid load point value: ${loadPointStr}`
						);
						// process.exit(1);
						fatalExit(
							`Invalid load point value: ${loadPointStr}`,
							1
						);
					}
				} else {
					console.error(`Bad command line switch: ${arg}`); // `Unknown option: ${arg}`
					// process.exit(1);
					fatalExit(`Bad command line switch: ${arg}`, 1);
				}
			} else {
				// Assume it's the input file name
				if (!this.inputFileName) {
					this.inputFileName = arg;
					const extension = path
						.extname(this.inputFileName)
						.toLowerCase();
					// Note: This is custom behavior in interpreter.js (not the official LCC)
					//       to check specifically for .e files, since the LCC interpreter is
					//       accessed by default when running .e files, or when assembling and
					//       running .a files all at once.
					if (extension !== ".e") {
						console.error(
							"Unsupported file type for interpreter.js (expected .e)"
						);
						fatalExit(
							"Unsupported file type for interpreter.js (expected .e)",
							1
						);
					}
				} else {
					console.error(`Unexpected argument: ${arg}`);
					// process.exit(1);
					fatalExit(`Unexpected argument: ${arg}`, 1);
				}
			}
			i++;
		}

		if (!this.inputFileName) {
			console.error("No input file specified.");
			// process.exit(1);
			fatalExit("No input file specified.", 1);
		}

		// Get the userName using nameHandler
		try {
			//// console.log(`inputFileName = ${this.inputFileName}`);
			this.userName = nameHandler.createNameFile(this.inputFileName);
			//// console.log("userName = " + this.userName);
		} catch (error) {
			console.error("Error handling name file:", error.message);
			// process.exit(1);
			fatalExit("Error handling name file: " + error.message, 1);
		}

		// this prints out when called by interpreter.js
		console.log(`Starting interpretation of ${this.inputFileName}`);

		// Open and read the executable file
		let buffer;
		try {
			buffer = fs.readFileSync(this.inputFileName);
		} catch (err) {
			console.error(`Cannot open input file ${this.inputFileName}`); // , err: ${err}
			// process.exit(1);
			fatalExit(`Cannot open input file ${this.inputFileName}`, 1); // , err: ${err}
		}

		// Check file signature
		if (buffer[0] !== "o".charCodeAt(0)) {
			// `${this.inputFileName} is not a valid LCC executable file: missing 'o' signature`
			console.error(`${this.inputFileName} is not in lcc format`);
			// process.exit(1);
			fatalExit(`${this.inputFileName} is not in lcc format`, 1);
		}

		// Load the executable into memory
		this.loadExecutableBuffer(buffer);

		// Capture the initial memory state
		this.initialMem = this.mem.slice(); // Makes a copy of the memory array

		// Prepare .lst and .bst file names
		const lstFileName = this.inputFileName.replace(/\.e$/, ".lst");
		const bstFileName = this.inputFileName.replace(/\.e$/, ".bst");
		console.log(`lst file = ${lstFileName}`);
		console.log(`bst file = ${bstFileName}`);
		console.log(
			"====================================================== Output"
		);

		// Run the interpreter
		try {
			this.run();
			if (this.generateStats) {
				console.log(); // Ensure cursor moves to the next line
			}
		} catch (error) {
			console.error(`Runtime Error: ${error.message}`);
			// process.exit(1);
			fatalExit(`Runtime Error: ${error.message}`, 1);
		}

		// Generate .lst and .bst files if required
		if (this.generateStats) {
			const lstContent = generateBSTLSTContent({
				isBST: false,
				interpreter: this,
				assembler: null,
				userName: this.userName,
				inputFileName: this.inputFileName,
			});

			const bstContent = generateBSTLSTContent({
				isBST: true,
				interpreter: this,
				assembler: null,
				userName: this.userName,
				inputFileName: this.inputFileName,
			});

			// Write the .lst and .bst files
			fs.writeFileSync(lstFileName, lstContent);
			fs.writeFileSync(bstFileName, bstContent);
		}
	}

	── end CLI entry point ── */

	/* ── CLI stats filename helper — not used in web app ───────────────────
	constructBSTLSTFileName(inputFileName, isBST) {
		const parsedPath = path.parse(inputFileName);
		// Remove extension and add '.bst'
		return path.format({
			...parsedPath,
			base: undefined,
			ext: isBST ? ".bst" : ".lst",
		});
	}
	── end CLI stats filename helper ── */

	// for use in lcc.js
	// makes sure that the file is a valid executable file by checking
	// for the "o" file signature and "C" header termination character
	loadExecutableFile(fileName) {
		let buffer;
		try {
			buffer = fs.readFileSync(fileName);
		} catch (err) {
			console.error(`Cannot open input file ${fileName}`);
			// process.exit(1);
			fatalExit(`Cannot open input file ${fileName}`, 1);
		}

		// Check file signature: look for "o" followed by "C" anywhere in the buffer
		let foundO = false;
		let foundC = false;

		for (let offset = 0; offset < buffer.length; offset++) {
			const char = String.fromCharCode(buffer[offset]);

			// Look for the starting "o"
			if (!foundO && char === "o") {
				foundO = true;
			}
			// Once "o" is found, look for the "C" as the end of the header
			else if (foundO && char === "C") {
				foundC = true;
				break;
			}
		}

		// If either "o" or "C" was not found in the expected order, throw an error
		if (!foundO || !foundC) {
			console.error(`${fileName} is not a valid LCC executable file`);
			// process.exit(1);
			fatalExit(`${fileName} is not a valid LCC executable file`, 1);
		}

		// this prints out when called by lcc.js
		console.log(`Starting interpretation of ${fileName}`);

		// Load the executable into memory
		this.loadExecutableBuffer(buffer);

		this.initialMem = this.mem.slice(); // Makes a copy of the memory array
	}

	// extracts header entries and loads machine code into memory
	loadExecutableBuffer(buffer) {
		// this.options.loadPoint — CLI-only override, not used in web
		// this.loadPoint defaults to 0 set in the constructor
		let offset = 0;

		// Read file signature
		if (buffer[offset++] !== "o".charCodeAt(0)) {
			this.error('Invalid file signature: missing "o"');
			return;
		}

		// Do not store the 'o' signature in headerLines

		let startAddress = 0; // Default start address

		// Read header entries until 'C' is encountered
		while (offset < buffer.length) {
			const entryChar = String.fromCharCode(buffer[offset++]);

			if (entryChar === "C") {
				// Start of code
				// Do not store 'C' in headerLines
				break;
			} else if (entryChar === "S") {
				// Start address entry: read two bytes as little endian
				if (offset + 1 >= buffer.length) {
					this.error("Incomplete start address in header");
					return;
				}
				startAddress = buffer.readUInt16LE(offset);
				offset += 2;
				this.headerLines.push(
					`S ${startAddress.toString(16).padStart(4, "0")}`
				);
			} else if (entryChar === "G") {
				// Skip 'G' entry: Read address and label
				if (offset + 1 >= buffer.length) {
					this.error("Incomplete G entry in header");
					return;
				}
				const address = buffer.readUInt16LE(offset);
				offset += 2;
				let label = "";
				while (offset < buffer.length) {
					const charCode = buffer[offset++];
					if (charCode === 0) break;
					label += String.fromCharCode(charCode);
				}
				this.headerLines.push(
					`G ${address.toString(16).padStart(4, "0")} ${label}`
				);
			} else if (entryChar === "A") {
				// Skip 'A' entry: Read address
				if (offset + 1 >= buffer.length) {
					this.error("Incomplete A entry in header");
					return;
				}
				const address = buffer.readUInt16LE(offset);
				offset += 2;
				this.headerLines.push(
					`A ${address.toString(16).padStart(4, "0")}`
				);
			} else {
				// Skip unknown entries or handle as needed
				this.error(`Unknown header entry: '${entryChar}'`);
				return;
			}
		}

		// Read machine code into memory starting at this.loadPoint
		let memIndex = this.loadPoint; // Start loading at loadPoint
		while (offset + 1 < buffer.length) {
			const instruction = buffer.readUInt16LE(offset);
			offset += 2;
			this.mem[memIndex++] = instruction;
		}

		this.memMax = memIndex - 1; // Last memory address used

		// Set PC to loadPoint + startAddress
		this.pc = (this.loadPoint + startAddress) & 0xffff;
	}

	/* ── initializeLog — references undefined logEntry, not used in web ────
	initializeLog() {
		this.snapshot = [];
		this.snapshot.push(logEntry);
	}
	── end initializeLog ── */

	/* ── initialize — references undefined vars, not used in web ───────────
	initialize() {
		if (this.options.instructionCap != null) {
			this.instructionsCap = Math.max(1, this.options.instructionCap);
		}

		if (this.options.interactiveMode) {
			this.memoryChanges = {
				hasChanged: false,
				address: this.loadPoint,
				old: Array(this.memMax + 1 - this.loadPoint).fill(0),
				new: this.initialMem.slice(this.loadPoint, this.memMax + 1),
			};
			this.currentSnapshot = {
				pc: this.pc,
				ir: 0,
				registers: this.r.slice(),
				flags: { c: this.c, v: this.v, n: this.n, z: this.z },
				memory: this.memoryChanges,
			};

			update = this.stateUpdates(0, 0);
		}
	}
	── end initialize ── */

	/* ── run — not called in web; runner/debugger services use handleSteps ──
	async run(steps, listing) {
		let update;
		let stepNumber = steps;
		this.memoryChanges = [];

		if (this.options.interactiveMode) {
			this.lastSnapshot = this.currentSnapshot;
			await this.handleSteps(stepNumber);
			this.currentSnapshot.memoryChanges = this.memoryChanges;
			update = this.stateUpdates(this.lastSnapshot, this.currentSnapshot);
			return update;
		} else {
			await this.handleSteps(this.instructionsCap+1);
		}
	}
	── end run ── */

	async handleSteps(stepNumber) {
		for (let i = 0; i < stepNumber && this.running; i++) {
			this.currentIteration++;
			await this.executeNextInstruction(true);
		}
	}

	// restorePrevState(newState) {
	// 	let log = this.snapshot[newState];

	// 	// Restore old pc
	// 	this.pc = log.pc;

	// 	// Restore old flags
	// 	this.c = log.flags.c;
	// 	this.v = log.flags.v;
	// 	this.n = log.flags.n;
	// 	this.z = log.flags.z;

	// 	// Restore old register values
	// 	for (let i = 0; i < 8; i++) this.r[i] = log.registers[i];

	// 	// Undo any changes to memory
	// 	for (let i = this.currentIteration; i >= newState; i--) {
	// 		if (this.snapshot[i].memory.hasChanged) {
	// 			this.restorePrevMemory(i);
	// 		}
	// 	}
	// }

	// restorePrevMemory(state) {
	// 	// console.log("TEST: ", this.snapshot[state], state);
	// 	// console.log("MEMORY: ", this.snapshot[state].memory);

	// 	let oldMem = this.snapshot[state].memory;
	// 	if (oldMem.address != null) {
	// 		let oldValues = oldMem.old;
	// 		for (let i = 0; i < oldValues.length; i++) {
	// 			this.mem[oldMem.address + i] = oldValues[i];
	// 		}
	// 	}
	// }

	/* ── stateUpdates — replaced by buildDiff() in services/debugger.js ────
	stateUpdates(oldSnapshot, newSnapshot) { ... }
	── end stateUpdates ── */

	/* ── locationLineMap — never called in web app ──────────────────────────
	locationLineMap(listing) { ... }
	── end locationLineMap ── */

	async executeNextInstruction(readInNewInput) {
		// Fetch instruction
		this.ir = this.mem[this.pc++];
		// Decode instruction
		this.opcode = (this.ir >> 12) & 0xf; // Opcode (bits 15-12)
		this.code = this.dr = this.sr = (this.ir >> 9) & 0x7; // dr/sr (bits 11-9)
		this.sr1 = this.baser = (this.ir >> 6) & 0x7; // sr1/baser (bits 8-6)
		this.sr2 = this.ir & 0x7; // sr2 (bits 2-0)
		this.bit5 = (this.ir >> 5) & 0x1; // bit 5
		this.bit11 = (this.ir >> 11) & 0x1; // bit 11
		this.imm5 = this.signExtend(this.ir & 0x1f, 5); // imm5 (bits 4-0)
		this.pcoffset9 = this.signExtend(this.ir & 0x1ff, 9); // pcoffset9 (bits 8-0)
		this.imm9 = this.pcoffset9;
		this.pcoffset11 = this.signExtend(this.ir & 0x7ff, 11); // pcoffset11 (bits 10-0)
		this.offset6 = this.signExtend(this.ir & 0x3f, 6); // offset6 (bits 5-0)
		this.eopcode = this.ir & 0x1f; // eopcode (bits 4-0)
		this.trapvec = this.ir & 0xff; // trap vector (bits 7-0)

		// ── CLI symbolic debugger hook — not used in web ──
		// if (this.debugMode) { await this.debug(); }

		// Execute instruction
		switch (this.opcode) {
			case 0: // BR
				this.executeBR();
				break;
			case 1: // ADD
				this.executeADD();
				break;
			case 2: // LD
				this.executeLD();
				break;
			case 3: // ST
				this.executeST();
				break;
			case 4: // BL or BLR
				this.executeBLorBLR();
				break;
			case 5: // AND
				this.executeAND();
				break;
			case 6: // LDR
				this.executeLDR();
				break;
			case 7: // STR
				this.executeSTR();
				break;
			case 8: // CMP
				this.executeCMP();
				break;
			case 9: // NOT
				this.executeNOT();
				break;
			case 10: // PUSH, POP, SRL, SRA, SLL, ROL, ROR, MUL, DIV, REM, OR, XOR, MVR, SEXT
				this.executeCase10();
				break;
			case 11: // SUB
				this.executeSUB();
				break;
			case 12: // JMP/RET
				this.executeJMP();
				break;
			case 13: // MVI
				this.executeMVI();
				break;
			case 14: // LEA
				this.executeLEA();
				break;
			case 15: // TRAP
				await this.executeTRAP();
				break;
			default:
				this.error(`Unknown opcode: ${this.opcode}`);
				this.running = false;
		}

		/* ── CLI symbolic debugger output — references undefined prevRegs/prevPC ─
		if (this.debugMode && this.running) { ... }
		── end CLI debug output ── */

		this.instructionsExecuted++;

		// Safety cap — prevents infinite loops from hanging the server
		if (this.instructionsExecuted >= this.instructionsCap) {
			this.running = false;
			fatalExit("Possible infinite loop", 1);
		}

		// Track max stack size (stats only — kept for future use)
		// let sp = this.r[6];
		// let stackSize = sp === 0 ? 0 : MAX_MEMORY - sp;
		// if (stackSize > this.maxStackSize) { this.maxStackSize = stackSize; }
	}

	/* ── CLI symbolic debugger methods — not used in web app ───────────────
	   hexToMnemonic(hex)        — maps IR bits to mnemonic string
	   formatDebugState(l, src)  — formats "addr: hex ; mnemonic"
	   debug()                   — interactive per-instruction prompt
	─────────────────────────────────────────────────────────────────────── */

	// cmp    1000  000  sr1 000 sr2   nzcv sr1 - sr2 (set flags)
	// cmp    1000  000  sr1 1  imm5   nzcv sr1 - imm5 (set flags)
	executeCMP() {
		if (this.bit5 === 0) {
			// Register mode
			const x = this.toSigned16(this.r[this.sr1]);
			const y = this.toSigned16(this.r[this.sr2]);
			const negY = -y;
			const sum = x + negY;
			const result = sum & 0xffff;
			this.setNZ(result);
			this.setCV(sum, x, negY);
		} else {
			// Immediate mode
			const x = this.toSigned16(this.r[this.sr1]);
			const y = this.toSigned16(this.imm5);
			const negY = -y;
			const sum = x + negY;
			const result = sum & 0xffff;
			this.setNZ(result);
			this.setCV(sum, x, negY);
		}
	}

	executeBR() {
		let conditionMet = false;
		switch (this.code) {
			case 0: // brz/bre
				conditionMet = this.z === 1;
				break;
			case 1: // brnz/brne
				conditionMet = this.z === 0;
				break;
			case 2: // brn
				conditionMet = this.n === 1;
				break;
			case 3: // brp
				conditionMet = this.n === this.z;
				break;
			case 4: // brlt
				conditionMet = this.n !== this.v;
				break;
			case 5: // brgt
				conditionMet = this.n === this.v && this.z === 0;
				break;
			case 6: // brc/brb
				conditionMet = this.c === 1;
				break;
			case 7: // br/bral
				conditionMet = true;
				break;
		}
		if (conditionMet) {
			this.pc = (this.pc + this.pcoffset9) & 0xffff;
		}
		this.hasJumped = conditionMet; // Set flag to indicate a jump/branch was executed
	}

	executeCase10() {
		// ct is a 4-bit shift count field (if omitted at the assembly level, it defaults to 1).
		const ct = (this.ir >> 5) & 0xf;

		switch (this.eopcode) {
			case 0: // PUSH // mem[--sp] = sr
				this.r[6] = (this.r[6] - 1) & 0xffff;
				{
					const mc = {
						address: this.r[6],
						old: [this.mem[this.r[6]]],   // read BEFORE the write
					};
					this.mem[this.r[6]] = this.r[this.sr];
					mc.new = [this.mem[this.r[6]]];
					this.memoryChanges.push(mc);
				}
				break;
			case 1: // POP // dr = mem[sp++];
				// load value from memory at address pointed at by stack pointer to destination
				this.r[this.dr] = this.mem[this.r[6]];
				// increment stack pointer (to deallocate stack memory)
				this.r[6] = (this.r[6] + 1) & 0xffff;
				break;
			/*
      The shift instructions move the contents of the source register either 
      left or right, depending on the specific instruction. The first operand 
      in a shift assembly language instruction specifies the register to be 
      shifted, while the second operand indicates the shift count, which is 
      the number of positions to shift. The shift count must be a value 
      between 0 and 15, and if it is not provided, it defaults to 1.

      The SRL (shift right logical) instruction shifts bits to the right, 
      inserting a 0 on the left to ensure the sign bit becomes 0, regardless 
      of its previous state. The SRA (shift right arithmetic) instruction 
      also shifts bits to the right but preserves the sign bit by copying it 
      into the leftmost position. The SLL (shift left logical) instruction 
      shifts bits to the left, inserting a 0 on the right. For all shift 
      instructions, the c flag is set to the last bit shifted out of the 
      register, and the n and z flags are updated to reflect the state of 
      the register after the shift. For instance, the instruction srl r1, 1
       shifts the contents of r1 one position to the right, inserting a 0 on 
       the left.
      */
			case 2: // SRL
				this.c = (this.r[this.sr] >> (ct - 1)) & 1; // Store the last bit shifted out
				this.r[this.sr] = this.r[this.sr] >>> ct; // Unsigned right shift (injects 0's from the left)
				this.setNZ(this.r[this.sr]); // Update flags
				break;
			case 3: // SRA
				this.c = (this.r[this.sr] >> (ct - 1)) & 1; // Store the last bit shifted out
				const signBit =
					this.r[this.sr] & 0x8000 ? 0xffff << (16 - ct) : 0; // Extend sign bit
				this.r[this.sr] = (this.r[this.sr] >> ct) | signBit; // Shift right with sign extension
				this.setNZ(this.r[this.sr]); // Update flags
				break;
			case 4: // SLL
				this.c = (this.r[this.sr] >> (16 - ct)) & 1; // Store the last bit shifted out
				this.r[this.sr] = (this.r[this.sr] << ct) & 0xffff; // Logical shift left (mask to 16 bits)
				this.setNZ(this.r[this.sr]); // Update flags
				break;
			case 5: // ROL
				this.c = (this.r[this.sr] >> (16 - ct)) & 1;
				this.r[this.sr] =
					(this.r[this.sr] << ct) | (this.r[this.sr] >> (16 - ct));
				this.setNZ(this.r[this.sr]);
				break;
			case 6: // ROR
				this.c = (this.r[this.sr] >> (ct - 1)) & 1;
				this.r[this.sr] =
					(this.r[this.sr] >> ct) | (this.r[this.sr] << (16 - ct));
				this.setNZ(this.r[this.sr]);
				break;
			case 7: // MUL
				this.r[this.dr] = (this.r[this.dr] * this.r[this.sr1]) & 0xffff;
				this.setNZ(this.r[this.dr]);
				break;
			case 8: // DIV
				if (this.r[this.sr1] === 0) {
					this.error("Floating point exception");
					fatalExit("Floating point exception", 1);
				}
				this.r[this.dr] = (this.r[this.dr] / this.r[this.sr1]) & 0xffff;
				this.setNZ(this.r[this.dr]);
				break;
			case 9: // REM
				if (this.r[this.sr1] === 0) {
					this.error("Floating point exception");
					fatalExit("Floating point exception", 1);
				}
				this.r[this.dr] = this.r[this.dr] % this.r[this.sr1] & 0xffff;
				this.setNZ(this.r[this.dr]);
				break;
			case 10: // OR
				this.r[this.dr] = this.r[this.dr] | this.r[this.sr1];
				this.setNZ(this.r[this.dr]);
				break;
			case 11: // XOR
				this.r[this.dr] = this.r[this.dr] ^ this.r[this.sr1];
				this.setNZ(this.r[this.dr]);
				break;
			case 12: // MVR
				this.r[this.dr] = this.r[this.sr1];
				break;
			case 13: // SEXT
				this.r[this.dr] = this.signExtend(
					this.r[this.dr],
					this.r[this.sr1]
				);
				this.setNZ(this.r[this.dr]);
				break;
			default:
				//// TODO: compare implementation with the official LCC interpreter
				this.error(`Unknown extended opcode: ${this.eopcode}`);
				this.running = false;
				fatalExit(`Unknown extended opcode: ${this.eopcode}`, 1);
		}
	}

	executeADD() {
		if (this.bit5 === 0) {
			// Register mode
			const result = (this.r[this.sr1] + this.r[this.sr2]) & 0xffff;
			this.setNZ(result);
			this.setCV(result, this.r[this.sr1], this.r[this.sr2]);
			this.r[this.dr] = result;
		} else {
			// Immediate mode
			const result = (this.r[this.sr1] + this.imm5) & 0xffff;
			this.setNZ(result);
			this.setCV(result, this.r[this.sr1], this.imm5);
			this.r[this.dr] = result;
		}
	}

	executeSUB() {
		if (this.bit5 === 0) {
			// Register mode
			const x = this.toSigned16(this.r[this.sr1]);
			const y = this.toSigned16(this.r[this.sr2]);
			const negY = -y;
			const sum = x + negY;
			const result = sum & 0xffff;
			this.setNZ(result);
			this.setCV(sum, x, negY);
			this.r[this.dr] = result;
		} else {
			// Immediate mode
			const x = this.toSigned16(this.r[this.sr1]);
			const y = this.toSigned16(this.imm5);
			const negY = -y;
			const sum = x + negY;
			const result = sum & 0xffff;
			this.setNZ(result);
			this.setCV(sum, x, negY);
			this.r[this.dr] = result;
		}
	}

	executeAND() {
		if (this.bit5 !== 0) {
			this.r[this.dr] = this.r[this.sr1] & this.imm5;
		} else {
			this.r[this.dr] = this.r[this.sr1] & this.r[this.sr2];
		}
		this.setNZ(this.r[this.dr]);
	}

	executeNOT() {
		this.r[this.dr] = ~this.r[this.sr1] & 0xffff;
		this.setNZ(this.r[this.dr]);
	}

	executeLD() {
		const address = (this.pc + this.pcoffset9) & 0xffff;
		this.r[this.dr] = this.mem[address];
	}

	executeST() {
		const address = (this.pc + this.pcoffset9) & 0xffff;
		let memoryChange = {}
		memoryChange.address = address;
		memoryChange.old = [this.mem[address]];
		this.mem[address] = this.r[this.sr];
		if (address > this.memMax) this.memMax = address;
		memoryChange.new = [this.r[this.sr]];
		this.memoryChanges.push(memoryChange);
	}

	executeMVI() {
		this.r[this.dr] = this.imm9;
	}

	executeLEA() {
		this.r[this.dr] = (this.pc + this.pcoffset9) & 0xffff;
	}

	executeLDR() {
		const address = (this.r[this.baser] + this.offset6) & 0xffff;
		this.r[this.dr] = this.mem[address];
	}

	executeSTR() {
		const address = (this.r[this.baser] + this.offset6) & 0xffff;
		let memoryChange = {}
		memoryChange.address = address;
		memoryChange.old = [this.mem[address]];
		this.mem[address] = this.r[this.sr];
		if (address > this.memMax) this.memMax = address;
		memoryChange.new = [this.r[this.sr]];
		this.memoryChanges.push(memoryChange);
	}

	executeJMP() {
		this.pc = (this.r[this.baser] + this.offset6) & 0xffff;
		this.hasJumped = true; // Set flag to indicate a jump was executed
	}

	executeBLorBLR() {
		if (this.bit11 !== 0) {
			// BL (Branch and Link)
			this.r[7] = this.pc;
			this.pc = (this.pc + this.pcoffset11) & 0xffff;
		} else {
			// BLR (Branch and Link Register)
			this.r[7] = this.pc;
			this.pc = (this.r[this.baser] + this.offset6) & 0xffff;
		}
		this.hasJumped = true; // Set flag to indicate a jump was executed
	}

	executeSOUT() {
		let address = this.r[this.sr];
		let charCode = this.mem[address];
		while (charCode !== 0) {
			const char = String.fromCharCode(charCode);
			this.writeOutput(char);
			address = (address + 1) & 0xffff;
			charCode = this.mem[address];
			this.lineLength += 1;
		}
	}

	async readLineFromStdin() {
		if (!this.inputBuffer || this.inputBuffer.length === 0) {
			// No input available — notify the service and suspend until it arrives
			if (this.onInputRequest) this.onInputRequest();
			await new Promise(resolve => { this._inputResolve = resolve; });
		}
		// Consume one line from the buffer
		this.inputBuffer = this.inputBuffer.replace(/\r\n/g, "\n");
		const newlineIndex = this.inputBuffer.indexOf("\n");
		let inputLine = "";
		if (newlineIndex !== -1) {
			inputLine = this.inputBuffer.slice(0, newlineIndex);
			this.inputBuffer = this.inputBuffer.slice(newlineIndex + 1);
		} else {
			inputLine = this.inputBuffer;
			this.inputBuffer = "";
		}
		// Echo the input back to the terminal (like a real tty would)
		this.writeOutput(inputLine);
		return { inputLine, isSimulated: true };
	}

	async readCharFromStdin() {
		if (!this.inputBuffer || this.inputBuffer.length === 0) {
			// No input available — notify the service and suspend until it arrives
			if (this.onInputRequest) this.onInputRequest();
			await new Promise(resolve => { this._inputResolve = resolve; });
		}
		let ainChar = this.inputBuffer.charAt(0);
		this.inputBuffer = this.inputBuffer.slice(1);
		// Echo the character back to the terminal
		this.writeOutput(ainChar + newline);
		return { char: ainChar, isSimulated: true };
	}

	async executeSIN() {
		let address = this.r[this.sr];
		let memoryChange = {};
		memoryChange.address = address;
		memoryChange.old = [];
		memoryChange.new = [];

		let { inputLine: input, isSimulated } = await this.readLineFromStdin();

		for (let i = 0; i < input.length; i++) {
			memoryChange.old.push(this.mem[address]);
			this.mem[address] = input.charCodeAt(i);
			memoryChange.new.push(this.mem[address]);
			address = (address + 1) & 0xffff;
		}
		// Null-terminate the string
		memoryChange.old.push(this.mem[address]);
		this.mem[address] = 0;
		memoryChange.new.push(this.mem[address]);

		this.memoryChanges.push(memoryChange);

		// Echo a newline after the input (readLineFromStdin already echoed the text)
		if (isSimulated) {
			this.writeOutput(newline);
		}
	}

	executeM() {
		for (let addr = 0; addr <= this.memMax; addr++) {
			const content = this.mem[addr];
			const line = `${addr.toString(16).padStart(4, "0")}: ${content
				.toString(16)
				.padStart(4, "0")}`;
			this.writeOutput(line + newline);
		}
	}

	executeR() {
		const pcStr = this.pc.toString(16).padStart(4, "0");
		const irValue = this.mem[this.pc & 0xffff];
		const irStr = irValue.toString(16).padStart(4, "0");
		const nzcvStr = `${this.n}${this.z}${this.c}${this.v}`.padStart(4, "0");
		let output = `pc = ${pcStr}  ir = ${irStr}  NZCV = ${nzcvStr}${newline}`;
		// First line: r0 to r3
		for (let i = 0; i <= 3; i++) {
			const regStr = this.r[i].toString(16).padStart(4, "0");
			output += `r${i} = ${regStr}  `;
		}
		output += newline;
		// Second line: r4, fp, sp, lr
		const r4Str = this.r[4].toString(16).padStart(4, "0");
		const fpStr = this.r[5].toString(16).padStart(4, "0");
		const spStr = this.r[6].toString(16).padStart(4, "0");
		const lrStr = this.r[7].toString(16).padStart(4, "0");
		output += `r4 = ${r4Str}  fp = ${fpStr}  sp = ${spStr}  lr = ${lrStr}  ${newline}`;
		this.writeOutput(output);
	}

	executeS() {
		let sp = this.r[6];
		let fp = this.r[5];

		if (sp === this.spInitial) {
			this.writeOutput(`Stack empty${newline}`);
			return;
		} else {
			this.writeOutput(`Stack:${newline}`);

			for (let addr = sp; addr < MAX_MEMORY; addr++) {
				let value = this.mem[addr];
				let addrStr = addr.toString(16).padStart(4, "0");
				let valueStr = value.toString(16).padStart(4, "0");
				let line = `${addrStr}: ${valueStr}`;
				if (addr === fp) {
					line += " <--- fp";
				}
				this.writeOutput(line + newline);
			}
		}
	}

	/* ── writeDebugOutput — only used by CLI symbolic debugger ─────────────
	writeDebugOutput(message) {
		process.stdout.write(message + "\n");
		this.output += message;
	}
	── end writeDebugOutput ── */

	writeOutput(message) {
		this.output += message;
		if (this.onOutput) this.onOutput(message);
	}

	// This function writes debug output to stdout,
	// but it also checks if debugMode is enabled.
	// If debugMode is off, it writes the message
	// without a newline.
	writeDebugOutputOrElse(message) {
		this.lineLength += message.length;
		this.writeOutput(message);
	}

	async executeTRAP() {
		switch (this.trapvec) {
			case 0: // HALT
				this.running = false;
				break;
			case 1: // NL
				this.lineLength = 0;
				this.writeOutput(newline);
				this.newlinePrinted = true;
				break;
			case 2: // DOUT
				let value = this.r[this.sr];
				// Convert unsigned 16-bit to signed 16-bit
				if (value & 0x8000) {
					value -= 0x10000;
				}
				const doutStr = `${value}`;
				this.writeDebugOutputOrElse(doutStr);
				break;
			case 3: // UDOUT
				// print as unsigned decimal
				const udoutStr = `${this.r[this.sr] & 0xffff}`;
				this.writeDebugOutputOrElse(udoutStr);
				break;
			case 4: // HOUT
				// print as hexadecimal
				const houtStr = this.r[this.sr].toString(16).toLowerCase();
				this.writeDebugOutputOrElse(houtStr);
				break;
			case 5: // AOUT
				// print as ASCII character
				const aoutChar = String.fromCharCode(this.r[this.sr] & 0xff);
				this.writeDebugOutputOrElse(aoutChar);
				break;
			case 6: // SOUT
				this.executeSOUT();
				break;
			case 7: // DIN
				while (true) {
					let { inputLine: dinInput, isSimulated } =
						await this.readLineFromStdin();

					if (dinInput.trim() === "") {
						continue;
					}

					let dinValue = parseInt(dinInput, 10);
					if (isNaN(dinValue)) {
						const errorMsg = `Invalid dec constant. Re-enter:${newline}`;
						this.writeOutput(errorMsg);
						continue;
					} else {
						this.r[this.dr] = dinValue & 0xffff;
						// No need to echo input here; already handled in readLineFromStdin()
						//// unless input is simulated
						if (isSimulated) {
							this.writeOutput(newline);
						} else {
							// add input to the output buffer w/ newline delimeter
							this.output += dinInput + newline;
						}
						break;
					}
				}
				break;
			case 8: // HIN
				while (true) {
					let { inputLine: hinInput, isSimulated } =
						await this.readLineFromStdin();

					if (hinInput.trim() === "") {
						continue;
					}

					let hinValue = parseInt(hinInput, 16);
					if (isNaN(hinValue)) {
						const errorMsg = `Invalid hex constant. Re-enter:${newline}`;
						this.writeOutput(errorMsg);
						continue;
					} else {
						this.r[this.dr] = hinValue & 0xffff;
						// No need to echo input here; already handled in readLineFromStdin()
						//// unless input is simulated
						if (isSimulated) {
							this.writeOutput(newline);
						} else {
							this.output += hinInput + newline;
						}
						break;
					}
				}
				break;
			case 9: // AIN
				let { char: ainChar } = await this.readCharFromStdin();
				this.r[this.dr] = ainChar.charCodeAt(0);
				break;
			case 10: // SIN
				await this.executeSIN();
				break;
			case 11: // m
				this.executeM();
				break;
			case 12: // r
				this.executeR();
				break;
			case 13: // s
				this.executeS();
				break;
			case 14: // bp
				this.error("Breakpoint trap not yet implemented");
				break;
			default:
				// `Unknown TRAP vector: ${this.trapvec}`
				console.error(`Error on line 0 of ${this.inputFileName}`);
				console.error();
				this.error(`Trap vector out of range`); // : ${this.trapvec}
				this.running = false;
		}
	}

	toSigned16(value) {
		value &= 0xffff; // Ensure 16-bit value
		if (value & 0x8000) {
			return value - 0x10000; // Convert to negative value
		} else {
			return value;
		}
	}

	setNZ(value) {
		this.flagsSet = true; // Set the flag set indicator
		value = this.toSigned16(value);
		if (value < 0) {
			this.n = 1;
			this.z = 0;
		} else if (value === 0) {
			this.n = 0;
			this.z = 1;
		} else {
			this.n = 0;
			this.z = 0;
		}
	}

	setCV(sum, x, y) {
		this.flagsSet = true; // Set the flag set indicator
		// Convert values to signed 16-bit integers
		sum = this.toSigned16(sum);
		x = this.toSigned16(x);
		y = this.toSigned16(y);

		// Initialize flags
		this.c = 0;
		this.v = 0;

		// Carry flag logic
		if (x >= 0 && y >= 0) {
			this.c = 0;
		} else if (x < 0 && y < 0) {
			this.c = 1;
		} else if (sum >= 0) {
			this.c = 1;
		} else {
			this.c = 0;
		}

		// Overflow flag logic
		if ((x < 0 && y >= 0) || (x >= 0 && y < 0)) {
			this.v = 0;
		} else if ((sum < 0 && x >= 0) || (sum >= 0 && x < 0)) {
			this.v = 1;
		} else {
			this.v = 0;
		}
	}

	signExtend(value, bitWidth) {
		const signBit = 1 << (bitWidth - 1);
		const mask = (1 << bitWidth) - 1;
		value = value & mask; // Mask the value to the specified bit width
		if (value & signBit) {
			// Negative number, extend the sign bits
			value |= ~mask;
		}
		return value;
	}

	error(message) {
		// console.error(`Interpreter Error: ${message}`);
		console.error(`${message}`);
		this.running = false;
	}
}

// Instantiate and run the interpreter if this script is run directly
if (require.main === module) {
	const interpreter = new Interpreter();
	interpreter.generateStats = true; // Set to generate .lst and .bst files
	interpreter.main();
}

module.exports = Interpreter;
