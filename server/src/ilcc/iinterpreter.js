#!/usr/bin/env node

// interpreter.js

const fs = require("fs");
const path = require("path");
const { generateBSTLSTContent } = require("../utils/genStats.js");
const nameHandler = require("../utils/name.js");
const { diff } = require("util");

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
		this.options = {}; // Options from lcc.js
		this.instructionsExecuted = 0; // For program statistics
		this.maxStackSize = 0; // For program statistics
		this.loadPoint = 0; // Default load point is 0
		this.spInitial = 0; // For tracking stack size
		this.memMax = 0; // Keep track of the highest memory address used
		this.inputFileName = ""; // Name of the input file
		this.generateStats = false; // Whether to generate .lst and .bst files
		this.headerLines = [];
		this.instructionsCap = 500000; // Limit the number of instructions to prevent infinite loops
		this.debugMode = false; // Debug mode flag
		this.hasJumped = false; // Flag to track jump/branch instruction executions
		this.currentIteration = 0; // What step of interpretation are we on. Cannot go negative
		this.snapshot = []; // Contains what updates occured at any step in memory. Appended to when new sections of program are executed
	}

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

	constructBSTLSTFileName(inputFileName, isBST) {
		const parsedPath = path.parse(inputFileName);
		// Remove extension and add '.bst'
		return path.format({
			...parsedPath,
			base: undefined,
			ext: isBST ? ".bst" : ".lst",
		});
	}

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
		if (this.options.loadPoint != null) {
			this.loadPoint = this.options.loadPoint;
		}
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

	initializeLog() {
		this.snapshot = [];
		this.currentIteration = 0;
		this.memoryChange = {
			hasChanged: false,
			address: this.loadPoint,
			old: Array(this.memMax + 1 - this.loadPoint).fill(0),
			new: this.initialMem.slice(this.loadPoint, this.memMax + 1),
		};
		let logEntry = {
			pc: this.pc,
			ir: 0,
			registers: this.r.slice(),
			flags: { c: this.c, v: this.v, n: this.n, z: this.z },
			memory: this.memoryChange,
		};
		this.snapshot.push(logEntry);
	}

	run(listing) {
		this.spInitial = this.r[6]; // Assuming r6 is the stack pointer

		let update;
		let newlineCount = 0;
		let memoryDisplayRows = 10; // Number of memory rows to display
		let memoryBaseAddress = this.loadPoint; // Base address for memory display
		let stackOptions = {
			mode: "relative",
			stackBaseAddress: 0xfff2,
			register: 5,
		}; // Can be relative mode or static mode
		// Register mode will follow a relative, static mode will stay fixed at a given address
		let stepNumber = 1; // Number of steps to execute
		let lastStepNumber = stepNumber;
		let skipSteps = false;
		let skipDisplay = false;
		let paneLayout = { column0: "ro", column1: "mc", column2: "" };
		let columnCount = 1;
		let codeLines = 20;
		let colors = {
			old: "\x1b[91m",
			new: "\x1b[92m",
			reset: "\x1b[m",
			highlight: "\x1b[48;5;238m",
		};

    let cleanListing = this.locationLineMap(listing);

    if (this.options.instructionCap != null) {
      this.instructionsCap = Math.max(1, this.options.instructionCap);
    }

		if (this.options.interactiveMode) {
			this.initializeLog();

			update = this.stateUpdates(0, 0);
			newlineCount = this.displayInteractiveMode(
				cleanListing,
				update,
				memoryBaseAddress,
				memoryDisplayRows,
				stackOptions,
				paneLayout,
				codeLines,
				colors
			);
			console.log("\nTo view all commands, enter 'h'\n");
			newlineCount += 3;
			if (this.options.colorblindMode) {
				colors.old = "\x1b[93m";
				colors.new = "\x1b[94m";
			}
		}
		this.lineLength = 0;

		while (this.running) {
			if (this.options.interactiveMode) {
				process.stdout.write("Input: ");
				newlineCount++;
				lastStepNumber = stepNumber;
				skipSteps = false;
				skipDisplay = false;
				let input = this.readLineFromStdin();
				let output;

				switch (input.inputLine[0]) {
					case "h": // Print the help menu
						this.clearLines(newlineCount);
						newlineCount = this.displayHelpMenu();
						skipSteps = true;
						skipDisplay = true;
						output = { error: "" };
						break;
					case "a": // Set Memory Display address
						output = this.handleMemoryInput(
							input.inputLine.substring(1)
						);
						if (output.error == "") {
							memoryBaseAddress = output.memoryBaseAddress;
							skipSteps = true;
						}
						break;
					case "m": // Set Memory Display Rows
						output = this.handleRowsInput(
							input.inputLine.substring(1)
						);
						if (output.error == "") {
							memoryDisplayRows = output.memoryDisplayRows;
							skipSteps = true;
						}
						break;
					case "s": // Set stack mode
						output = this.handleStackInput(
							input.inputLine.substring(1)
						);
						if (output.error == "") {
							stackOptions = output.stackOptions;
							skipSteps = true;
						}
						break;
					case "c": // Set code window lines
						output = this.handleCodeWindowLines(
							input.inputLine.substring(1)
						);
						if (output.error == "") {
							codeLines = output.codeLines;
							skipSteps = true;
						}
						break;
					case "l": // Set pane layout
						output = this.handlePaneLayout(
							input.inputLine.substring(1)
						);
						if (output.error == "") {
							paneLayout = output.paneLayout;
							columnCount = output.columnCount;
							skipSteps = true;
						}
						break;

					case "q": // Quit
						this.running = false;
						output = { error: "" };
						break;
					default:
						output = this.handleStepsInput(
							input.inputLine,
							lastStepNumber
						);
						if (output.error == "") {
							stepNumber = output.stepNumber;
						}
				}

				if (output.error != "") {
					console.error(output.error);
					newlineCount++;
					continue;
				}

				if (!skipDisplay) this.clearLines(newlineCount);

        let originalIteration = this.currentIteration;
        if (!skipSteps) this.handleSteps(stepNumber);
        let newIteration = this.currentIteration;

        if (!this.options.efficicentMode) {
          update = this.stateUpdates(originalIteration, newIteration);
        } else {
          update = this.stateUpdates(0, 1);
        }

				if (!skipDisplay)
					newlineCount = this.displayInteractiveMode(
						cleanListing,
						update,
						memoryBaseAddress,
						memoryDisplayRows,
						stackOptions,
						paneLayout,
						codeLines,
						colors
					);

				// let spaces = "=".repeat((48 * columnCount) / 2 - 4);
				// process.stdout.write(`${spaces}`);
				// process.stdout.write(` Output `);
				// process.stdout.write(`${spaces}\n`);

				// console.log(this.output);
				// newlineCount += (this.output.match(/\n/g) || []).length + 2;
			} else {
				// Normal LCC execution, handle 1 step at a time until termination
				this.handleSteps(1);
			}
		}
	}

	isHexNumber(input) {
		return /^(0x)?[0-9a-fA-F]+$/.test(input);
	}

	isDecNumber(input) {
		return /^-?\d+$/.test(input);
	}

	displayHelpMenu() {
		let infoPrompt = "\nCommands:\n";
		infoPrompt += "h: Help\n";
		infoPrompt +=
			" - Displays this help menu. Do not add {} in commands.\n\n";
		infoPrompt +=
			"a{hex}: Memory Display Address Selector (default loadPoint)\n";
		infoPrompt += " - Memory Display module will start at address {hex}\n";
		infoPrompt += " - (e.g., m1, m100, mfff0)\n\n";
		infoPrompt += "m{int}: Memory Display Rows Selector (default 10)\n";
		infoPrompt += " - Memory Display module will show {int} rows\n";
		infoPrompt += " - 0 will turn off module\n";
		infoPrompt += " - (e.g. r10, r20, r0)\n\n";
		infoPrompt += "c{int}: Code Snippet Rows Selector (default 5)\n";
		infoPrompt += " - Code Snippet module will show {int} rows\n";
		infoPrompt += " - 0 will turn off module\n";
		infoPrompt += " - (e.g. c10, c20, c0)\n\n";
		infoPrompt += "s{hex}: Stack Controller Static Mode\n";
		infoPrompt += " - Add a hex number after 's' to set Stack view to\n";
		infoPrompt += " - start and stay at that address.\n";
		infoPrompt += " - (e.g., sfff0, s3000, s0)\n\n";
		infoPrompt +=
			"s{register}: Stack Controller Follow Mode (default fp)\n";
		infoPrompt += " - Will set the Stack view to follow memory\n";
		infoPrompt += " - centered around address in {register}\n";
		infoPrompt += " - (e.g., sr0, sr5, sfp)\n\n";
		infoPrompt += "l{'r,c,m,o,/'}: Layout Editor (default ro/mc) \n";
		infoPrompt += " - Will change the layout of the information panes\n";
		infoPrompt += " - with up to 3 columns of panes.\n";
		infoPrompt += " - Enter panes from top down, with '/' to move to\n";
		infoPrompt += " - next column. 'r' for Register pane,\n";
		infoPrompt += " - 'c' for Code Snippet, 'm' for Memory Display\n";
		infoPrompt += " - and 'o' for Output. No letter will hide pane\n";
		infoPrompt += " - (e.g., lrmo/c, lro/c/m, lcm,ro)\n\n";
		infoPrompt += "q: Quit \n";
		infoPrompt += " - Terminates the program in it's current state\n\n";
		infoPrompt += "{int}: Step Selector (default 1)\n";
		infoPrompt += " - Enter a positive or negative number of steps\n";
		infoPrompt += " - for the program to step through. The last\n";
		infoPrompt += " - entered step value is remembered\n";
		infoPrompt += " - 0 will reprint the current state\n";
		console.log(infoPrompt);
		let newlineCount = (infoPrompt.match(/\n/g) || []).length + 1;
		return newlineCount;
	}

	handleMemoryInput(inputLine) {
		let output = { error: "" };

		if (this.isHexNumber(inputLine)) {
			output.memoryBaseAddress = parseInt(inputLine, 16);
		} else {
			output.error = "Invalid input. Please enter a hex number.";
		}

		return output;
	}

	handleRowsInput(inputLine) {
		let output = { error: "" };

		if (this.isDecNumber(inputLine)) {
			output.memoryDisplayRows = Math.max(0, parseInt(inputLine, 10));
		} else {
			output.error = "Invalid input. Please enter a number.";
		}

		return output;
	}

	handleStackInput(inputLine) {
		let stackOptions = {};
		let output = { error: "", stackOptions: stackOptions };
		switch (inputLine) {
			case "r0":
				stackOptions.register = 0;
				stackOptions.mode = "relative";
				break;
			case "r1":
				stackOptions.register = 1;
				stackOptions.mode = "relative";
				break;
			case "r2":
				stackOptions.register = 2;
				stackOptions.mode = "relative";
				break;
			case "r3":
				stackOptions.register = 3;
				stackOptions.mode = "relative";
				break;
			case "r4":
				stackOptions.register = 4;
				stackOptions.mode = "relative";
				break;
			case "r5":
			case "fp":
				stackOptions.register = 5;
				stackOptions.mode = "relative";
				break;
			case "r6":
			case "sp":
				stackOptions.register = 6;
				stackOptions.mode = "relative";
				break;
			case "r7":
			case "lr":
				stackOptions.register = 7;
				stackOptions.mode = "relative";
				break;
			default:
				if (this.isHexNumber(inputLine)) {
					stackOptions.stackBaseAddress = parseInt(inputLine, 16);
					stackOptions.mode = "static";
				} else {
					output.error =
						"Invalid input. Please enter a hex number or register.";
				}
		}
		return output;
	}

	handleCodeWindowLines(inputLine) {
		let output = { error: "" };
		if (inputLine == "") {
			output.codeLines = 0;
		} else if (this.isDecNumber(inputLine)) {
			output.codeLines = Math.max(0, parseInt(inputLine, 10));
		} else {
			output.error = "Invalid input. Please enter a number.";
		}
		return output;
	}

	handlePaneLayout(inputLine) {
		let output = {
			error: "",
			paneLayout: { column0: "", column1: "", column2: "" },
			columnCount: 1,
		};
		let lineSplit = inputLine.split("/");
		output.columnCount = lineSplit.length;

		for (let i = 0; i < lineSplit.length; i++) {
			for (let j = 0; j < lineSplit[i].length; j++) {
				let char = lineSplit[i][j];
				switch (char) {
					case "r":
					case "c":
					case "m":
					case "o":
						output.paneLayout[`column${i}`] += char;
						break;
					default:
						output.error = `${char} is not a valid pane identifier. Only 'r', 'c', and 'm' are.`;
						return output;
				}
			}
		}

		return output;
	}

  handleStepsInput(inputLine, lastStepNumber) {
    let output = { error: "" };
    if (inputLine == "") {
      output.stepNumber = lastStepNumber;
    } else if (this.isDecNumber(inputLine)) {
      output.stepNumber = parseInt(inputLine, 10);
      if (this.options.efficicentMode && output.stepNumber < 0) {
        output.error = "Cannot go backwards in efficicent mode.";
      }
    } else {
      output.error = "Invalid input. Please enter a number.";
    }
    return output;
  }

	clearLines(linesToClear) {
		// Move cursor up however many lines we wrote in this iteration
		process.stdout.write(`\x1b[${linesToClear}A`);
		// if (this.lineLength > 0) {
		// 	// If there was already output on this line, move cursor past current output
		// 	process.stdout.write(`\x1b[${this.lineLength}C`);
		// }
		// Clear from cursor to bottom of screen
		process.stdout.write(`\x1b[0J`);
	}

	handleSteps(stepNumber) {
		if (stepNumber === 0) {
			// Reprint current state
			return;
		}
		// Check if new instructions are to be executed
		if (stepNumber > 0) {
			// When true, new inputs from user should be read, otherwise, restore the input
			for (let i = 0; i < Math.abs(stepNumber) && this.running; i++) {
				this.currentIteration++;
				this.executeNextInstruction(
					this.currentIteration == this.snapshot.length
				);
			}
		} else {
			// New State should not be less than 0
			let newState = Math.max(this.currentIteration + stepNumber, 0);
			this.restorePrevState(newState);
			this.currentIteration = newState;
		}
	}

	restorePrevState(newState) {
		let log = this.snapshot[newState];

		// Restore old pc
		this.pc = log.pc;

		// Restore old flags
		this.c = log.flags.c;
		this.v = log.flags.v;
		this.n = log.flags.n;
		this.z = log.flags.z;

		// Restore old register values
		for (let i = 0; i < 8; i++) this.r[i] = log.registers[i];

		// Undo any changes to memory
		for (let i = this.currentIteration; i >= newState; i--) {
			if (this.snapshot[i].memory.hasChanged) {
				this.restorePrevMemory(i);
			}
		}
	}

	restorePrevMemory(state) {
		// console.log("TEST: ", this.snapshot[state], state);
		// console.log("MEMORY: ", this.snapshot[state].memory);

		let oldMem = this.snapshot[state].memory;
		if (oldMem.address != null) {
			let oldValues = oldMem.old;
			for (let i = 0; i < oldValues.length; i++) {
				this.mem[oldMem.address + i] = oldValues[i];
			}
		}
	}

	stateUpdates(oldIteration, newIteration) {
		oldIteration = Math.max(oldIteration, 0);
		newIteration = Math.max(newIteration, 0);
		// console.log("State Updates: ", oldIteration, newIteration);

		let update = {
			registers: {
				old: this.snapshot[oldIteration].registers,
				new: this.snapshot[newIteration].registers,
			},
			pc: {
				old: this.snapshot[oldIteration].pc,
				new: this.snapshot[newIteration].pc,
			},
			ir: {
				old: this.snapshot[oldIteration].ir,
				new: this.snapshot[newIteration].ir,
			},
			flags: {
				old: this.snapshot[oldIteration].flags,
				new: this.snapshot[newIteration].flags,
			},
			memory: {},
		};

		// Track all memory changes between two iterations
		let changes = {};
		if (oldIteration < newIteration) {
			for (let i = newIteration; i > oldIteration; i--) {
				let memoryChange = this.snapshot[i].memory;
				if (memoryChange.hasChanged) {
					let baseAddress = memoryChange.address;
					let length = memoryChange.new.length;
					for (let j = 0; j < length; j++) {
						changes[baseAddress + j] = memoryChange.old[j];
					}
				}
			}
		} else {
			for (let i = newIteration + 1; i <= oldIteration; i++) {
				let memoryChange = this.snapshot[i].memory;
				if (memoryChange.hasChanged) {
					let baseAddress = memoryChange.address;
					let length = memoryChange.new.length;
					for (let j = 0; j < length; j++) {
						changes[baseAddress + j] = memoryChange.new[j];
					}
				}
			}
			update.pc = {
				old: this.snapshot[newIteration].pc,
				new: this.snapshot[oldIteration].pc,
			};
		}
		// Compare change values with this.mem to detect true changes
		for (let address in changes) {
			let oldValue = changes[address];
			let newValue = this.mem[address];
			if (oldValue != newValue) {
				update.memory[address] = { old: oldValue, new: newValue };
			}
		}

		// console.log(update);

		return update;
	}

	locationLineMap(listing) {
		let keys = {};
		let lines = [];
		for (const key of Object.keys(listing)) {
			let line = listing[key];
			keys[listing[key].locCtr] = lines.length;
			lines.push(line);
		}
		return { keys: keys, lines: lines };
	}

	codeSnippetSyntaxHighlight(listing) {
		let outputString = "";
		let colors = {
			green: "\x1b[92m",
			purple: "\x1b[38;5;141m",
			red: "\x1b[91m",
			yellow: "\x1b[38;5;228m",
			reset: "\x1b[39m",
		};

		if (listing.macWord != null) {
			return listing.sourceLine.replace(/[\r\n]/g, "");
		}

		if (listing.label != null) {
			outputString += `${listing.label}:`;
		}

		outputString = outputString.padEnd(12);

		outputString += `${colors.green}${listing.mnemonic}${colors.reset} `;

		for (let operand of listing.operands) {
			if (/(r[0-7]|fp|sp|lr)\b/.test(operand)) {
				outputString += `${colors.red}${operand}${colors.reset}`;
			} else if (
				this.isDecNumber(operand) ||
				/^0x[0-9a-fA-F]+$/.test(operand) ||
				/'[^"]*'/.test(operand)
			) {
				outputString += `${colors.purple}${operand}${colors.reset}`;
			} else if (/"[^"]*"/.test(operand)) {
				outputString += `${colors.yellow}${operand}${colors.reset}`;
			} else {
				outputString += `${operand}`;
			}
			outputString += ", ";
		}

		if (listing.operands.length > 0) {
			outputString = outputString.slice(0, outputString.length - 2);
		}

		return outputString;
	}

	getVisibleLength(str) {
		// Utility function to get the visible length of a string (excluding ANSI codes)
		return str.replace(/\x1b\[[0-9;]*m/g, "").length;
	}

	registerStackDisplay(update, colors, stackOptions) {
		let stackAddress = 0xfff2;
		switch (stackOptions.mode) {
			case "relative":
				let relativeAddress =
					update.registers.new[stackOptions.register];
				let displaySize = 4;
				if (
					relativeAddress < 0xffff - displaySize &&
					relativeAddress != 0
				) {
					stackAddress = Math.max(relativeAddress - 9, 0);
				}

				break;
			case "static":
				stackAddress = stackOptions.stackBaseAddress;
				break;
		}

		stackAddress = Math.max(0, Math.min(0xfff2, stackAddress));

		let newfp = update.registers.new[5];
		let newsp = update.registers.new[6];
		let oldfp = update.registers.old[5];
		let oldsp = update.registers.old[6];

		let outputLines = [];

		outputLines.push("┌─────────────────┬────────────────────────────┐");
		outputLines.push("│    Registers    │ Stack ─ Addr ─── Memory    │");
		outputLines.push("├─────────────────┼───────┬──────┬─────────────┤");
		// Handle base registers
		for (let i = 0; i < 14; i++) {
			let oldRegValue = "";
			let newRegValue = "";
			let registerName = "";
			// r0 to r7
			if (i < 8) {
				oldRegValue = update.registers.old[i]
					.toString(16)
					.padStart(4, "0");
				newRegValue = update.registers.new[i]
					.toString(16)
					.padStart(4, "0");
				registerName = `r${i.toString()}`;
			} else if (i >= 9 && i <= 11) {
				oldRegValue = update.registers.old[i - 4]
					.toString(16)
					.padStart(4, "0");
				newRegValue = update.registers.new[i - 4]
					.toString(16)
					.padStart(4, "0");
				registerName = ["fp", "sp", "lr"][i - 9];
			} else if (i === 12) {
				oldRegValue = update.pc.old.toString(16).padStart(4, "0");
				newRegValue = update.pc.new.toString(16).padStart(4, "0");
				registerName = "pc";
			} else if (i === 13) {
				oldRegValue = update.ir.old.toString(16).padStart(4, "0");
				newRegValue = update.ir.new.toString(16).padStart(4, "0");
				registerName = "ir";
			}

			let outputString = "";

			if (i === 8) {
				outputString += `├─────────────────┤ `;
			} else {
				if (oldRegValue !== newRegValue) {
					outputString += `│ ${registerName}: ${colors.old}${oldRegValue}${colors.reset} > ${colors.new}${newRegValue}${colors.reset} │ `;
				} else {
					outputString += `│ ${registerName}: ${newRegValue}        │ `;
				}
			}

			if (newfp == stackAddress) {
				outputString += `${colors.new}fp${colors.reset}`;
			} else if (oldfp == stackAddress) {
				outputString += `${colors.old}fp${colors.reset}`;
			} else {
				outputString += "  ";
			}

			if (newsp == stackAddress) {
				outputString += `${colors.new}sp${colors.reset}`;
			} else if (oldsp == stackAddress) {
				outputString += `${colors.old}sp${colors.reset}`;
			} else {
				outputString += "  ";
			}

			if (
				newfp == stackAddress ||
				oldfp == stackAddress ||
				newsp == stackAddress ||
				oldsp == stackAddress
			) {
				outputString += ">";
			} else {
				outputString += " ";
			}

			outputString += ` │ ${stackAddress
				.toString(16)
				.padStart(4, "0")} │ `;
			if (stackAddress in update.memory) {
				let oldMemValue = update.memory[stackAddress].old;
				let newMemValue = update.memory[stackAddress].new;
				outputString += `${colors.old}${oldMemValue
					.toString(16)
					.padStart(4, "0")}${colors.reset} > ${
					colors.new
				}${newMemValue.toString(16).padStart(4, "0")}${colors.reset} │`;
			} else {
				let memValue = this.mem[stackAddress];
				outputString += `${memValue
					.toString(16)
					.padStart(4, "0")}        │`;
			}
			stackAddress++;
			outputLines.push(outputString);
		}

		outputLines.push("├──────────┬──────┴─┬─────┴──┬───┴────┬────────┤");

		// Handle flags
		let outputString = "";
		outputString += "│  Flags:  ";
		for (let flag of ["c", "v", "n", "z"]) {
			if (update.flags.old[flag] !== update.flags.new[flag]) {
				outputString += `│ ${flag}: ${colors.old}${update.flags.old[flag]}${colors.reset}>${colors.new}${update.flags.new[flag]}${colors.reset} `;
			} else {
				outputString += `│ ${flag}: ${update.flags.new[flag]}   `;
			}
		}
		outputString += "│";
		outputLines.push(outputString);
		outputLines.push("└──────────┴────────┴────────┴────────┴────────┘");
		return outputLines;
	}

	codeSnippetDisplay(update, colors, listing, codeLines) {
		let outputLines = [];
		let mainLineKey = update.pc.old - this.loadPoint;
		let mainLineIndex = listing.keys[mainLineKey];

		let codeLinesMin = -Math.floor(codeLines / 2) + mainLineIndex;
		let codeLinesMax =
			Math.floor(codeLines / 2) + (codeLines % 2) + mainLineIndex;

		if (codeLinesMin < 0) {
			codeLinesMax += -codeLinesMin;
			codeLinesMin = 0;
		} else if (codeLinesMax > listing.lines.length) {
			codeLinesMin -= codeLinesMax - listing.lines.length;
			codeLinesMax = listing.lines.length;
		}

		codeLinesMin = Math.max(codeLinesMin, 0);
		codeLinesMax = Math.min(codeLinesMax, listing.lines.length);

		outputLines.push("┌───────────────┤ Code Snippet ├───────────────┐");

		for (let i = codeLinesMin; i < codeLinesMax; i++) {
			let outputString = "";

			let codeLine = this.codeSnippetSyntaxHighlight(listing.lines[i]);

			// Remove ANSI codes for length calculation
			const visibleLength = this.getVisibleLength(codeLine);
			let prefix = i === mainLineIndex ? "> " : "  ";
			let padded = codeLine + " ".repeat(42 - visibleLength);

			// Now add the prefix and wrap in the box
			if (i === mainLineIndex) {
				outputString += `│ \x1b[48;5;236m${prefix}${padded}${colors.reset} │`;
			} else {
				outputString += `│ ${prefix}${padded} │`;
			}
			outputLines.push(outputString);
		}
		outputLines.push("└──────────────────────────────────────────────┘");
		return outputLines;
	}

	memoryDisplayDisplay(update, colors, baseMemAddress, memoryRows) {
		let outputLines = [];
		outputLines.push("┌────┬─────────┤ Memory Display ├──────────────┐");
		outputLines.push(
			"│\x1b[4mAddr│  +0   +1   +2   +3   +4   +5   +6   +7  \x1b[0m│"
		);
		let outputString = "";

		for (let i = 0; i < 8 * memoryRows; i++) {
			let addr = baseMemAddress + i;
			if (addr > 0xffff) {
				if (baseMemAddress % 8 != 0) {
					let offset = (baseMemAddress % 8) * 5 + 1; // Calculate the offset for the next row
					outputString += " ".repeat(offset) + "│";
					outputLines.append(outputString);
				}
				break; // Stop if we exceed the maximum memory address
			}
			let value =
				this.mem[addr] !== undefined
					? this.mem[addr].toString(16).padStart(4, "0")
					: "xxxx";
			if (i % 8 === 0) {
				outputString += `│${addr.toString(16).padStart(4, "0")}│`;
			}
			if (addr == update.pc.old) {
				outputString += `>${colors.highlight}${value}${colors.reset}`;
			} else if (addr in update.memory) {
				outputString += ` ${colors.new}${value}${colors.reset}`;
			} else {
				outputString += ` ${value}`;
			}
			if (i % 8 === 7) {
				outputString += " │";
				outputLines.push(outputString);
				outputString = "";
			}
		}
		outputLines.push("└────┴─────────────────────────────────────────┘");
		return outputLines;
	}

	outputDisplay() {
		let outputLines = [];
		let brokenOutput = this.output.split("\n");

		// console.log(brokenOutput);

		outputLines.push("┌──────────────────┤ Output ├──────────────────┐");

		for (let codeIndex = 0; codeIndex < brokenOutput.length; codeIndex++) {
			let codeLine = brokenOutput[codeIndex].replaceAll("\r", "");
			if (codeLine == "") {
				continue;
			}
			while (codeLine.length > 44) {
				outputLines.push(`│ ${codeLine.slice(0, 44)} │`);
				codeLine = codeLine.slice(44);
			}

			outputLines.push(`│ ${codeLine.padEnd(44)} │`);
		}

		outputLines.push("└──────────────────────────────────────────────┘");
		return outputLines;
	}

	displayInteractiveMode(
		cleanListing,
		update,
		baseMemAddress = 0,
		memoryRows = 10,
		stackOptions,
		paneLayout,
		codeLines,
		colors
	) {
		let registerStackOutput = [];
		registerStackOutput = this.registerStackDisplay(
			update,
			colors,
			stackOptions
		);

		let codeSnippetOutput = [];
		if (codeLines != 0) {
			codeSnippetOutput = this.codeSnippetDisplay(
				update,
				colors,
				cleanListing,
				codeLines
			);
		}

		let memoryDisplayOutput = [];
		if (memoryRows != 0) {
			memoryDisplayOutput = this.memoryDisplayDisplay(
				update,
				colors,
				baseMemAddress,
				memoryRows
			);
		}

		let outputDisplayOutput = [];
		outputDisplayOutput = this.outputDisplay();

		let outputString = "\n";

		let columns = [[], [], []];

		for (let i = 0; i < 3; i++) {
			let tokens = paneLayout[`column${i}`];
			for (let char of tokens) {
				let element = [];
				switch (char) {
					case "r":
						element = registerStackOutput;
						break;
					case "c":
						element = codeSnippetOutput;
						break;
					case "m":
						element = memoryDisplayOutput;
						break;
					case "o":
						element = outputDisplayOutput;
						break;
					default:
						[];
				}
				columns[i].push(...element);
			}
		}
		let blank = " ".repeat(48);
		let size = Math.max(
			columns[0].length,
			columns[1].length,
			columns[2].length
		);
		for (let i = 0; i < size; i++) {
			for (let j = 0; j < 3; j++) {
				if (columns[j].length > i) {
					outputString += columns[j][i];
				} else if (columns[j] != 0) {
					outputString += blank;
				}
			}
			outputString += "\n";
		}

		console.log(outputString);
		// Count how many newline characters are in the outputString
		const newlineCount = (outputString.match(/\n/g) || []).length;
		return newlineCount + 1; // +1 for the final newline by console.log
	}

	executeNextInstruction(readInNewInput) {
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

		this.memoryChange = {
			hasChanged: false,
			address: null,
			old: null,
			new: null,
		};

		if (this.debugMode) {
			// TODO: decide how to handle e2e test case
			// to quit debug mode
			// if (isTestMode) {
			//   this.running = false;
			//   return;
			// }
			this.debug();
		}

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
				this.executeTRAP();
				break;
			default:
				this.error(`Unknown opcode: ${this.opcode}`);
				this.running = false;
		}

		let logEntry = {
			pc: this.pc,
			ir: this.ir,
			registers: this.r.slice(),
			flags: { c: this.c, v: this.v, n: this.n, z: this.z },
			memory: this.memoryChange,
		};

    // Only update the change log if this is a new execution
    if (!this.options.efficicentMode) {
      if (readInNewInput) {
        this.snapshot.push(logEntry);
      } else {
        this.snapshot[this.currentIteration] = logEntry;
      }
    } else {
      if (this.snapshot.length < 2) {
        this.snapshot.push(logEntry);
      } else {
        this.snapshot[0] = this.snapshot[1];
        this.snapshot[1] = logEntry;
      }
    }
    // if any registers changed or flags were set, print them out
    if (this.debugMode && this.running) {
      let regsOrFlagsOutput = "";

			for (let i = 0; i < 8; i++) {
				const oldVal = prevRegs[i];
				const newVal = this.r[i];
				if (oldVal !== newVal) {
					const hexOld = oldVal.toString(16).padStart(1, "0");
					const hexNew = newVal.toString(16).padStart(1, "0");
					regsOrFlagsOutput += `     <r${i} = ${hexOld}/${hexNew}>`;
				}
			}

			const [n, z, c, v] = [this.n, this.z, this.c, this.v];

			if (this.flagsSet) {
				if (regsOrFlagsOutput.trim() !== "") {
					regsOrFlagsOutput += " "; // a 1 space inbetween regs and flags
				} else {
					regsOrFlagsOutput += "     "; // add 5 spaces to pad flags
				}
				regsOrFlagsOutput += `<NZCV = ${n}${z}${c}${v}>`;
				this.flagsSet = false; // Reset the flag set
			}

			if (this.hasJumped) {
				if (regsOrFlagsOutput.trim() === "") {
					regsOrFlagsOutput += "     "; // add 5 spaces to pad flags
				}
				regsOrFlagsOutput += `<pc = ${prevPC.toString(
					16
				)}/${this.pc.toString(16)}>`;
				this.hasJumped = false; // Reset the jump flag
			}

			if (regsOrFlagsOutput.trim() !== "") {
				this.writeDebugOutput(regsOrFlagsOutput);
			}
		}

		this.instructionsExecuted++;

		// Check if the instruction limit has been reached
		// Note: This is a safety feature to prevent infinite loops
		// 2nd Note: This matches exactly the # of instructions
		// permitted to run by from the lcc before entering the debugger
		if (
			this.instructionsExecuted >= this.instructionsCap &&
			!this.debugMode
		) {
			// instead of exiting the program, this condition instead
			// initiates the execution of the symbolic debugger
			// detect if the program is running in the terminal
			if (process.stdin.isTTY) {
				// If running in the terminal, we can trigger debug mode
				console.error("Possible infinite loop");
				this.debugMode = true;
			} else {
				// else, terminate the program
				this.running = false;
				fatalExit("Possible infinite loop", 1);
			}

			//// TODO: implement a custom LCC.js behavior to set flags to toggle
			////       off potential infinite loop detection
		}

		// Track max stack size
		let sp = this.r[6];
		let stackSize = sp === 0 ? 0 : MAX_MEMORY - sp;
		if (stackSize > this.maxStackSize) {
			this.maxStackSize = stackSize;
		}
	}

	// convert source hex to matching mnemonic
	hexToMnemonic(hex) {
		const mnemonics = {
			0x0000: "BR",
			0x1000: "ADD",
			0x2000: "LD",
			0x3000: "ST",
			0x4000: "BL",
			0x5000: "AND",
			0x6000: "LDR",
			0x7000: "STR",
			0x8000: "CMP",
			0x9000: "NOT",
			0xa000: "CASE10",
			0xb000: "SUB",
			0xc000: "JMP/RET",
			0xd000: "MVI",
			0xe000: "LEA",
			0xf000: "TRAP",
		};
		let mnemonic =
			mnemonics[hex & 0xf000] || `Unknown(${hex.toString(16)})`;
		if (mnemonic === "CASE10") {
			// Handle the extended opcode separately
			const extendedMnemonics = {
				0x0: "PUSH",
				0x1: "POP",
				0x2: "SRL",
				0x3: "SRA",
				0x4: "SLL",
				0x5: "ROL",
				0x6: "ROR",
				0x7: "MUL",
				0x8: "DIV",
				0x9: "REM",
				0xa: "OR",
				0xb: "XOR",
				0xc: "MVR",
				0xd: "SEXT",
			};
			mnemonic =
				extendedMnemonics[hex & 0x000f] ||
				`Unknown(${hex.toString(16)})`;
		}

		if (mnemonic === "TRAP") {
			const trapMnemonics = {
				0x00: "HALT",
				0x01: "NL",
				0x02: "DOUT",
				0x03: "UDOUT",
				0x04: "HOUT",
				0x05: "AOUT",
				0x06: "SOUT",
				0x07: "DIN",
				0x08: "HIN",
				0x09: "AIN",
				0x0a: "SIN",
				0x0b: "M",
				0x0c: "R",
				0x0d: "S",
				0x0e: "BP",
			};
			mnemonic =
				trapMnemonics[hex & 0x000f] || `Unknown(${hex.toString(16)})`;
		}

		if (mnemonic === "BR") {
			const brMnemonics = {
				0x00: "BRZ",
				0x01: "BRNZ",
				0x02: "BRN",
				0x03: "BRP",
				0x04: "BRLT",
				0x05: "BRGT",
				0x06: "BRC",
				0x07: "BR",
			};
			mnemonic = brMnemonics[this.code] || `Unknown(${hex.toString(16)})`;
		}

		return mnemonic;
	}

	formatDebugState(line, source) {
		return `${line.toString(16).padStart(3, " ")}: ${source
			.toString(16)
			.padStart(4, "0")}`;
	}

	debug() {
		const line = this.pc - 1;
		const source = this.mem[line] || "(unknown)";
		const mnemonic = this.hexToMnemonic(this.ir);
		process.stdout.write(`${mnemonic.toLowerCase()}>>> `); // we don't want a newline here

		const { inputLine, isSimulated } = this.readLineFromStdin();

		const trimmedInput = inputLine.trim().toLowerCase();
		if (trimmedInput === "q") {
			// this.writeDebugOutput('Exiting debugger...');
			this.running = false;
		} else {
			const state = this.formatDebugState(line, source);
			this.writeDebugOutput(
				`${state}     ; ${mnemonic.toLowerCase()} \n`
			);
		}
	}

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
				// decrement stack pointer and store value
				this.memoryChange.hasChanged = true;
				this.r[6] = (this.r[6] - 1) & 0xffff;
				// save source register to memory at address pointed at by stack pointer
				this.memoryChange.address = this.r[6];
				this.memoryChange.old = [this.mem[this.r[6]]];
				this.mem[this.r[6]] = this.r[this.sr];
				this.memoryChange.new = [this.mem[this.r[6]]];
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
		this.memoryChange.address = address;
		this.memoryChange.old = [this.mem[address]];
		this.mem[address] = this.r[this.sr];
		if (address > this.memMax) this.memMax = address;
		this.memoryChange.new = [this.r[this.sr]];
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
		this.memoryChange.address = address;
		this.memoryChange.old = [this.mem[address]];
		this.mem[address] = this.r[this.sr];
		this.memoryChange.new = [this.r[this.sr]];
		this.memoryChange.hasChanged = true;
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

	readLineFromStdin() {
		if (this.inputBuffer && this.inputBuffer.length > 0) {
			// Use the inputBuffer to simulate user input
			this.inputBuffer = this.inputBuffer.replace(/\r\n/g, "\n");
			// TODO: check to make sure this behaves as expected on both Linux and Windows
			const newlineIndex = this.inputBuffer.indexOf("\n");
			let inputLine = "";
			if (newlineIndex !== -1) {
				inputLine = this.inputBuffer.slice(0, newlineIndex);
				this.inputBuffer = this.inputBuffer.slice(newlineIndex + 1);
			} else {
				inputLine = this.inputBuffer;
				this.inputBuffer = "";
			}
			// Echo the simulated input back to output and stdout
			///// this.writeOutput(inputLine + '\n');
			this.writeOutput(inputLine);
			return { inputLine, isSimulated: true };
		} else {
			// Original code for reading from stdin
			let input = "";
			let buffer = Buffer.alloc(1);
			let fd = process.stdin.fd;

			while (true) {
				try {
					let bytesRead = fs.readSync(fd, buffer, 0, 1, null);
					if (bytesRead === 0) {
						// EOF
						break;
					}
					let char = buffer.toString("utf8");

					// If it's a UNIX newline, we're done.
					if (char === "\n") {
						break;
					}

					// If it's '\r', check whether the next char is '\n'.
					if (char === "\r") {
						const nextBytes = fs.readSync(fd, buffer, 0, 1, null);
						if (nextBytes > 0) {
							const nextChar = buffer.toString(
								"utf8",
								0,
								nextBytes
							);
							// If nextChar is not '\n', we treat this '\r' as a line terminator
							// and the nextChar is actually the start of the next line.
							if (nextChar !== "\n") {
								input += nextChar; // Or handle it differently if you prefer
							}
						}
						break;
					}

					input += char;
				} catch (err) {
					if (err.code === "EAGAIN") {
						// Resource temporarily unavailable, wait a bit and retry
						continue;
					} else {
						throw err;
					}
				}
			}
			input = input.replace(/\r$/, "");
			return { inputLine: input, isSimulated: false };
		}
	}

	readCharFromStdin() {
		if (this.inputBuffer && this.inputBuffer.length > 0) {
			let ainChar = this.inputBuffer.charAt(0);
			this.inputBuffer = this.inputBuffer.slice(1);
			// Echo the simulated input back to output and stdout
			this.writeOutput(ainChar + newline);
			return { char: ainChar, isSimulated: true };
		} else {
			// Read one character from stdin
			let ainBuffer = Buffer.alloc(1);
			let fd = process.stdin.fd;
			let ainBytesRead = 0;

			// Keep trying to read until we get a character
			while (ainBytesRead === 0) {
				try {
					ainBytesRead = fs.readSync(fd, ainBuffer, 0, 1, null);
				} catch (err) {
					if (err.code === "EAGAIN") {
						continue;
					} else {
						throw err;
					}
				}
			}

			// If we got here, we successfully read a character
			let ainChar = ainBuffer.toString("utf8");
			return { char: ainChar, isSimulated: false };
		}
	}

	executeSIN() {
		let address = this.r[this.sr];
		this.memoryChange.address = address;
		this.memoryChange.old = [];
		this.memoryChange.new = [];

		let { inputLine: input, isSimulated } = this.readLineFromStdin();

		for (let i = 0; i < input.length; i++) {
			this.memoryChange.old.push(this.mem[address]);
			this.mem[address] = input.charCodeAt(i);
			this.memoryChange.new.push(this.mem[address]);
			address = (address + 1) & 0xffff;
		}
		// Null-terminate the string
		this.memoryChange.old.push(this.mem[address]);
		this.mem[address] = 0;
		this.memoryChange.new.push(this.mem[address]);

		this.memoryChange.hasChanged = true;

		// add newline here if input is simulated
		if (isSimulated) {
			this.writeOutput(newline);
		} //// else, add input to the output buffer w/ newline delimeter
		else {
			this.output += input + newline;
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

	// This function writes output to stdout,
	// and it also adds a newline at the end.
	// It is used for writing debug output that should
	// be followed by a newline, as in the case of
	// debug messages, error messages, etc.
	writeDebugOutput(message) {
		process.stdout.write(message + "\n");
		this.output += message;
	}

	// This function writes output to stdout,
	// but it does not add a newline at the end.
	// It is used for writing output that should not
	// be followed by a newline, as in the case of
	// aout, dout, sout, etc.
	writeOutput(message) {
		if (!this.options.interactiveMode) {
			process.stdout.write(message);
		}
		this.output += message;
	}

	// This function writes debug output to stdout,
	// but it also checks if debugMode is enabled.
	// If debugMode is off, it writes the message
	// without a newline.
	writeDebugOutputOrElse(message) {
		if (this.debugMode) {
			if (!this.interactiveMode) {
				process.stdout.write(message + "\n");
			}
		} else {
			if (!this.options.interactiveMode) {
				process.stdout.write(message);
			}
		}
		this.lineLength += message.length;
		this.output += message;
	}

	executeTRAP() {
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
				// print string at address
				this.executeSOUT();
				if (this.debugMode) {
					this.writeDebugOutput("");
				}
				break;
			case 7: // DIN
				while (true) {
					let { inputLine: dinInput, isSimulated } =
						this.readLineFromStdin();

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
						this.readLineFromStdin();

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
				let { char: ainChar, isSimulated } = this.readCharFromStdin();
				this.r[this.dr] = ainChar.charCodeAt(0);
				// No need to echo input here; already handled in readCharFromStdin()
				break;
			case 10: // SIN
				// read a line of input from the user
				this.executeSIN();
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
