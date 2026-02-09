#!/usr/bin/env node

import { Command } from 'commander';
import { analyzeCommand } from '../src/analyzer.js';
import { formatAnalysis, formatError, formatPrompt, formatExecutionOutput } from '../src/formatter.js';
import { spawn } from 'child_process';
import * as readline from 'readline';

const program = new Command();

program
  .name('cmdguard')
  .description('Analyzes shell commands for safety risks before execution')
  .version('0.1.0')
  .argument('[command...]', 'Command to analyze')
  .option('--simulate', 'Only explain, do not prompt for execution')
  .option('--rewrite', 'Show safer command variant without analyzing')
  .option('--explain', 'Show detailed breakdown')
  .action(async (commandArgs, options) => {
    try {
      let commandStr = '';

      if (commandArgs && commandArgs.length > 0) {
        // Command provided as arguments
        commandStr = commandArgs.join(' ');
      } else if (!process.stdin.isTTY) {
        // Read from stdin if piped
        commandStr = await readStdin();
      }

      if (!commandStr.trim()) {
        console.log(formatError('No command provided. Usage: cmdguard "command" or echo "command" | cmdguard'));
        process.exit(1);
      }

      // Analyze the command
      const analysis = analyzeCommand(commandStr);

      // Display formatted analysis
      console.log(formatAnalysis(analysis));

      // If --simulate flag, skip execution prompt
      if (options.simulate) {
        console.log('\n(--simulate: not prompting for execution)');
        process.exit(0);
      }

      // Prompt for execution confirmation
      const shouldExecute = await promptConfirm();

      if (!shouldExecute) {
        console.log('\nCommand cancelled.');
        process.exit(0);
      }

      // Execute the command
      await executeCommand(commandStr);
    } catch (error) {
      console.error(formatError(error.message));
      process.exit(1);
    }
  });

program.parse();

/**
 * Read command from stdin
 * @returns {Promise<string>} The piped command
 */
function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
  });
}

/**
 * Prompt user for confirmation
 * @returns {Promise<boolean>} True if user confirms, false otherwise
 */
function promptConfirm() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    process.stdout.write(formatPrompt());

    rl.on('line', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });

    rl.on('close', () => {
      resolve(false);
    });
  });
}

/**
 * Execute the command safely using child_process.spawn
 * @param {string} commandStr - Full command string
 * @returns {Promise<void>}
 */
function executeCommand(commandStr) {
  return new Promise((resolve, reject) => {
    // Parse shell, command, and arguments
    let shell = '/bin/sh';
    if (process.platform === 'win32') {
      shell = 'cmd.exe';
    }

    const child = spawn(shell, ['-c', commandStr], {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data;
        process.stdout.write(data);
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data;
        process.stderr.write(data);
      });
    }

    child.on('error', (error) => {
      reject(new Error(`Failed to execute command: ${error.message}`));
    });

    child.on('close', (code) => {
      console.log(formatExecutionOutput(stdout, stderr, code));
      resolve();
    });
  });
}
