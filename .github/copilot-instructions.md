# Copilot Instructions for cmdguard

## Project Overview
**cmdguard** is a lightweight Node.js CLI tool that analyzes shell commands for safety risks before execution. It provides colored risk warnings, suggests safer alternatives, and offers optional dry-run simulations with user confirmation before execution.

### Core MVP Features
- Analyze commands for risks (data loss, cost, breaking changes, security)
- Provide colored risk indicators (red/high, yellow/medium, green/low)
- Suggest safer command alternatives and flags
- Offer text-based dry-run explanations without real execution
- Support flags: `--simulate`, `--rewrite`, `--explain`
- Execute confirmed commands via `child_process.spawn`

---

## Setup & Build Commands

### Initial Setup
```bash
npm install
```

### Running the CLI
```bash
# During development, use the local bin file
node bin/cmdguard.js "command to analyze"

# Or pipe commands
echo "rm -rf node_modules" | node bin/cmdguard.js

# After npm link (for testing global install)
cmdguard "command to analyze"
```

### Test Commands (when test suite exists)
```bash
npm test                # Run full test suite
npm test -- --grep "pattern"  # Run specific tests
```

### Build/Lint Commands (if TypeScript is used)
```bash
npm run build           # Compile TypeScript
npm run lint            # Run linter (if configured)
```

---

## Architecture

### File Structure
```
.
├── bin/
│   └── cmdguard.js          # Entry point; CLI execution starts here
├── src/ (if TypeScript)
│   ├── analyzer.js          # Core command analysis logic
│   ├── riskPatterns.js      # Risk detection rules for common tools (rm, git, docker, etc.)
│   ├── suggestions.js       # Safer alternative recommendations
│   └── formatter.js         # Output formatting and colors
├── test/                    # Test files (mirrors src/ structure)
├── package.json
├── README.md
└── .github/
    └── copilot-instructions.md (this file)
```

### Key Modules

#### `bin/cmdguard.js`
- Parses CLI arguments using `commander` or `yargs`
- Accepts command as argument or from stdin
- Routes to analyzer based on flags (`--simulate`, `--rewrite`, `--explain`)
- Handles user prompts for execution confirmation

#### `analyzer.js` (Core Logic)
- Splits command into tool + arguments
- Runs risk detection against patterns
- Compiles risk level (high/medium/low)
- Returns analysis object: `{ risks: [], suggestions: [], explanation: string, riskLevel: 'high'|'medium'|'low' }`

#### `riskPatterns.js`
- Predefined risk patterns for dangerous tools:
  - `rm`: Data loss risks, especially with `-rf` and glob patterns
  - `git push --force`: Repository history issues
  - `docker system prune`: Resource cleanup risks
  - `dd`: Data corruption risks
  - `chmod 777`: Permission security risks
- Fallback: Parse command semantics to generate generic explanations
- Structure: `{ tool: 'rm', patterns: [{ flag: '-rf', risk: 'high', reason: '...' }] }`

#### `suggestions.js`
- Maps dangerous commands to safer variants
- Example: `rm -rf → npm cache clean --force` (context-aware)
- Includes flag improvements: `git push --force → git push --force-with-lease`

#### `formatter.js`
- Colorize output using `chalk`
- High risk → red, Medium → yellow, Low → green
- Format risk warnings, suggestions, and dry-run explanations

---

## Key Conventions

### Command Parsing
- **Assume first token is the tool** (e.g., `rm`, `git`, `docker`)
- **Preserve flags and arguments** for detailed analysis
- **Handle piped input**: Read from stdin if no argument provided; trim whitespace

### Risk Assessment
1. **Identify tool** → lookup in risk patterns
2. **Check flags** → compare against known dangerous flags
3. **Analyze arguments** → detect file paths, glob patterns, scope
4. **Generate explanation** → use pre-built or procedurally generated text
5. **Return risk level** → aggregate to highest level found

### Output Format
```
⚠️  HIGH RISK: rm command with -rf flag
Risk: Data loss — recursively deletes without confirmation
Suggestion: Use npm cache clean --force (if node_modules)
Safer flag: rm -i (interactive confirmation per file)

Dry-run: Would delete ./node_modules/ and all contents recursively
Continue? [y/n]
```

### User Interaction
- Always confirm before executing (unless `--simulate` is set)
- Accept single character input (y/n)
- Exit gracefully on 'n' without modifying anything

### Code Style
- **Use async/await** for file I/O and spawn operations
- **Error handling**: Catch spawn errors, permission issues; display user-friendly messages
- **Logging**: Use `console.log()` for output; reserve console.error() for errors only
- **Comments**: Add clarifying comments only for non-obvious logic; avoid obvious explanations

---

## Dependencies

### Core
- `commander` or `yargs` — CLI argument parsing
- `chalk` — Colored terminal output

### Development (if using TypeScript)
- `typescript` — Transpilation
- `ts-node` — Development execution (optional)

### Testing (when implementing)
- `jest` or `mocha` — Test framework
- `sinon` — Mocking/stubbing child_process

---

## Common Patterns

### Adding a New Risk Pattern
In `riskPatterns.js`:
```javascript
{
  tool: 'newTool',
  patterns: [
    { flag: '--dangerous', risk: 'high', reason: 'Explanation' },
    { flag: '--risky', risk: 'medium', reason: 'Explanation' }
  ]
}
```

### Adding a Safer Alternative
In `suggestions.js`:
```javascript
{
  dangerous: { tool: 'rm', flags: ['-rf'] },
  safer: { tool: 'npm cache clean', flags: ['--force'] },
  context: 'When removing node_modules'
}
```

### Reading stdin in bin/cmdguard.js
```javascript
if (process.stdin.isTTY) {
  // Arguments provided directly
} else {
  // Read from piped input
  let input = '';
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => { /* analyze(input) */ });
}
```

---

## Testing Strategy

- **Unit tests**: Test analyzer logic (risk detection, suggestion matching) with mock commands
- **Integration tests**: Test CLI with stdin/argv inputs and verify output format
- **Edge cases**: Empty input, malformed commands, piped input, flags without tools

---

## Publishing & Release

- Package name: `@yourusername/cmdguard` or `cmdguard-cli`
- Entry point: `bin/cmdguard.js` (configured in `package.json` "bin" field)
- Version starts at `0.1.0`
- Include `npm publish` script if auto-publishing is desired

---

## MCP Servers

**NPM Registry MCP** (configured for dependency discovery)
- Use to verify latest package versions when adding dependencies
- Query alternative packages for similar functionality
- Check peer dependency requirements for major versions

---

## Notes for Future Sessions

- Keep risk patterns extensible for new tools without modifying core analyzer
- Prioritize user safety: default to conservative risk warnings
- Fallback behavior important for unknown commands (generic explanation better than silence)
- Consider environment context (current directory, NODE_ENV) for refined suggestions
