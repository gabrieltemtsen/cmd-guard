import chalk from 'chalk';

/**
 * Format and display analysis results
 * @param {Object} analysis - Result from analyzeCommand
 * @returns {string} Formatted output
 */
export function formatAnalysis(analysis) {
  const { tool, riskLevel, risks, suggestions, explanation, dryRun, directedSuggestion } = analysis;

  if (!tool) {
    return chalk.dim('No command provided.');
  }

  let output = '\n';

  // Risk level indicator and title
  const riskIcon = getRiskIcon(riskLevel);
  const riskColor = getRiskColor(riskLevel);
  const riskText = riskColor(`${riskIcon} ${riskLevel.toUpperCase()} RISK`);
  output += `${riskText}: ${chalk.bold(tool)}\n`;

  // Main explanation
  output += `\n${chalk.gray('▸')} ${explanation}\n`;

  // Detected risks
  if (risks.length > 0) {
    output += chalk.bold('\nRisk Details:\n');
    risks.forEach(risk => {
      const color = getRiskColor(risk.risk);
      const icon = risk.flag ? `[${risk.flag}]` : `[${risk.pattern}]`;
      output += `  ${color(icon)} ${risk.reason}\n`;
    });
  }

  // Safer alternatives
  if (suggestions.length > 0 || directedSuggestion) {
    output += chalk.bold('\nSuggestions:\n');
    
    if (directedSuggestion) {
      output += `  ${chalk.cyan('→')} Safer: ${chalk.green(directedSuggestion.safer)}\n`;
      output += `    ${chalk.dim(directedSuggestion.explanation)}\n`;
    }

    suggestions.forEach(suggestion => {
      output += `  ${chalk.cyan('•')} ${suggestion}\n`;
    });
  }

  // Dry-run explanation
  output += `\n${chalk.bold('Dry-run:')} ${chalk.dim(dryRun)}\n`;

  return output;
}

/**
 * Display error message
 * @param {string} message - Error message
 * @returns {string} Formatted error
 */
export function formatError(message) {
  return chalk.red(`❌ Error: ${message}`);
}

/**
 * Display confirmation prompt
 * @returns {string} Prompt text
 */
export function formatPrompt() {
  return chalk.bold.cyan('\n▶ Execute this command? (y/n): ');
}

/**
 * Display execution output
 * @param {string} stdout - Standard output
 * @param {string} stderr - Standard error
 * @param {number} exitCode - Exit code
 * @returns {string} Formatted output
 */
export function formatExecutionOutput(stdout, stderr, exitCode) {
  let output = '\n' + chalk.bold('Execution Output:\n');
  
  if (stdout) {
    output += stdout;
  }
  
  if (stderr) {
    output += chalk.yellow(stderr);
  }

  if (exitCode !== 0) {
    output += chalk.red(`\n❌ Process exited with code ${exitCode}`);
  } else {
    output += chalk.green('\n✓ Command completed successfully');
  }

  return output;
}

/**
 * Get risk color based on level
 * @param {string} level - 'high', 'medium', or 'low'
 * @returns {Function} Chalk color function
 */
function getRiskColor(level) {
  switch (level) {
    case 'high':
      return chalk.red;
    case 'medium':
      return chalk.yellow;
    case 'low':
    default:
      return chalk.green;
  }
}

/**
 * Get risk icon based on level
 * @param {string} level - 'high', 'medium', or 'low'
 * @returns {string} Icon
 */
function getRiskIcon(level) {
  switch (level) {
    case 'high':
      return '⛔';
    case 'medium':
      return '⚠️ ';
    case 'low':
    default:
      return '✓ ';
  }
}
