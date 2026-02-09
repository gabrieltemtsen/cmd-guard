import { analyzeRisks, getRiskLevel } from './riskPatterns.js';
import { getSuggestion, getContextualSuggestion } from './suggestions.js';

/**
 * Parse a command string into tool and arguments
 * @param {string} command - The full command (e.g., "rm -rf /tmp/test")
 * @returns {Object} { tool, args }
 */
export function parseCommand(command) {
  const trimmed = command.trim();
  if (!trimmed) return { tool: '', args: [] };

  const parts = trimmed.split(/\s+/);
  return {
    tool: parts[0],
    args: parts.slice(1)
  };
}

/**
 * Analyze a command for risks
 * @param {string} command - The full command string
 * @returns {Object} Analysis result with risks, suggestions, explanation, riskLevel
 */
export function analyzeCommand(command) {
  const { tool, args } = parseCommand(command);

  if (!tool) {
    return {
      tool: '',
      command,
      riskLevel: 'low',
      risks: [],
      suggestions: [],
      explanation: 'Empty command.',
      dryRun: 'No operation would occur.'
    };
  }

  // Analyze risks
  const riskAnalysis = analyzeRisks(tool, args);
  
  // Check for piped commands (curl/wget | sh/bash)
  const pipeRisks = checkPipeRisks(command, tool, args, riskAnalysis);
  
  // Combine risks
  const allRisks = [...riskAnalysis.risks, ...pipeRisks];
  const riskLevel = getRiskLevel(allRisks);

  // Get safer alternatives
  const directedSuggestion = getSuggestion(command);
  const contextualSuggestion = getContextualSuggestion(tool, args);
  const suggestions = [];
  if (directedSuggestion) {
    suggestions.push(directedSuggestion.explanation);
  }
  if (contextualSuggestion) {
    suggestions.push(contextualSuggestion);
  }

  // Generate explanation
  const explanation = generateExplanation(tool, args, riskAnalysis);
  const dryRun = generateDryRun(tool, args, riskAnalysis);

  return {
    tool,
    command,
    riskLevel,
    risks: allRisks,
    suggestions,
    explanation,
    dryRun,
    directedSuggestion
  };
}

/**
 * Check for risks from piped commands
 * @param {string} command - Full command string
 * @param {string} tool - The tool being used
 * @param {string[]} args - Command arguments
 * @param {Object} riskAnalysis - Results from analyzeRisks
 * @returns {Object[]} Additional risks from pipes
 */
function checkPipeRisks(command, tool, args, riskAnalysis) {
  const risks = [];
  
  if ((tool === 'curl' || tool === 'wget') && (command.includes('| sh') || command.includes('| bash'))) {
    risks.push({
      pattern: command.includes('| sh') ? '| sh' : '| bash',
      risk: 'high',
      reason: 'Piping to shell executes downloaded content without inspection'
    });
  }
  
  if (tool === 'docker' && args[0] === 'system' && args[1] === 'prune' && args.includes('-a')) {
    risks.push({
      flag: '-a',
      risk: 'high',
      reason: 'Removes all unused images including tagged ones'
    });
  }
  
  return risks;
}

/**
 * Generate a human-readable explanation of what the command does
 * @param {string} tool - The command tool
 * @param {string[]} args - Command arguments
 * @param {Object} riskAnalysis - Results from analyzeRisks
 * @returns {string} Explanation
 */
function generateExplanation(tool, args, riskAnalysis) {
  const argStr = args.join(' ');

  // Tool-specific explanations
  const explanations = {
    rm: `Deletes files/directories. ${argStr.includes('-rf') ? 'Recursive mode (-rf) deletes everything in path WITHOUT confirmation.' : argStr.includes('-r') ? 'Recursive mode (-r) deletes directories and contents.' : 'Deletes specified files.'}`,
    mv: `Moves/renames files. If target exists, it will be overwritten.`,
    cp: `Copies files. ${argStr.includes('-r') ? 'Recursive mode (-r) copies directories.' : ''}`,
    git: `Git command: ${argStr[0] || 'unknown'}. ${handleGitExplanation(argStr)}`,
    docker: `Docker command: ${argStr[0] || 'unknown'}. ${handleDockerExplanation(argStr)}`,
    chmod: `Changes file permissions. ${argStr[0] ? `Setting to ${argStr[0]}` : 'Permission change'}.`,
    chown: `Changes file owner. ${argStr.includes('-R') ? 'Recursive (-R) applies to all subdirectories.' : ''}`,
    dd: `Low-level disk copy utility. Extremely dangerous with wrong device parameters.`,
    curl: `Fetches content from URL. ${argStr.includes('|') ? 'Piping to shell (| sh/bash) executes downloaded content!' : 'Shows content or downloads file.'}`,
    wget: `Downloads files from URL. ${argStr.includes('|') ? 'Piping to shell executes the downloaded file!' : 'Saves to disk.'}`,
    npm: handleNpmExplanation(argStr),
    node: `Executes JavaScript. ${argStr.includes('-e') ? 'Inline code execution with -e flag.' : 'Runs script file.'}`
  };

  return explanations[tool] || `Executes: ${tool} ${argStr}`;
}

function handleGitExplanation(argStr) {
  if (argStr.startsWith('push')) {
    return argStr.includes('--force') ? 'Force-push: overwrites remote history. Risky on shared repos.' : 'Uploads local commits to remote.';
  }
  if (argStr.startsWith('reset')) {
    return argStr.includes('--hard') ? 'Hard reset: discards ALL uncommitted changes irreversibly.' : 'Resets to specified commit (soft/mixed mode).';
  }
  if (argStr.startsWith('clean')) {
    return argStr.includes('-f') ? 'Force-clean: deletes untracked files.' : 'Shows what would be deleted.';
  }
  return 'Git operation.';
}

function handleDockerExplanation(argStr) {
  if (argStr.startsWith('system prune')) {
    return argStr.includes('-a') ? 'Removes all unused images (including tagged). High-impact.' : 'Removes only dangling resources.';
  }
  if (argStr.startsWith('rmi')) {
    return 'Permanently deletes image. Dependent containers will break.';
  }
  if (argStr.startsWith('rm')) {
    return 'Deletes container(s). Data lost unless volume persists.';
  }
  return 'Docker operation.';
}

function handleNpmExplanation(argStr) {
  if (argStr.includes('install')) {
    return 'Installs npm packages. Can modify package-lock.json and node_modules.';
  }
  if (argStr.includes('uninstall')) {
    return 'Removes npm packages from node_modules and package.json.';
  }
  if (argStr.includes('publish')) {
    return 'Publishes package to npm registry. PERMANENT; cannot be undone easily.';
  }
  return 'npm package manager operation.';
}

/**
 * Generate a dry-run explanation (what WOULD happen if executed)
 * @param {string} tool - The command tool
 * @param {string[]} args - Command arguments
 * @param {Object} riskAnalysis - Results from analyzeRisks
 * @returns {string} Dry-run explanation
 */
function generateDryRun(tool, args, riskAnalysis) {
  const argStr = args.join(' ');

  if (tool === 'rm') {
    return `Would delete: ${args.filter(a => !a.startsWith('-')).join(', ') || '[target path]'}${args.includes('-rf') ? ' (recursively, with all contents)' : ''} WITHOUT recovery.`;
  }
  if (tool === 'git' && args[0] === 'push' && args.includes('--force')) {
    return 'Would overwrite remote history with local commits. Team members with old clones would need to force-pull.';
  }
  if (tool === 'git' && args[0] === 'reset' && args.includes('--hard')) {
    return 'Would discard all uncommitted changes. Files would revert to last commit state.';
  }
  if (tool === 'docker' && args[0] === 'system' && args[1] === 'prune') {
    return `Would remove Docker ${args.includes('-a') ? 'images (including used ones)' : 'unused resources'}. Freed space would be reclaimed.`;
  }
  if (tool === 'chmod') {
    const perm = args[0];
    return `Would set permissions to ${perm} on ${args.slice(1).join(', ') || '[target]'}.`;
  }

  return `Would execute: ${tool} ${argStr}`;
}
