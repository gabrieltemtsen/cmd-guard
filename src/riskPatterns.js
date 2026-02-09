// Risk patterns for command analysis
// Each tool maps to an array of patterns with associated risk levels

export const riskPatterns = {
  rm: {
    tool: 'rm',
    risks: [
      { flag: '-rf', risk: 'high', reason: 'Recursively deletes without confirmation' },
      { flag: '-f', risk: 'high', reason: 'Forces deletion, ignores permissions' },
      { flag: '-r', risk: 'medium', reason: 'Recursive deletion; combine with -f for high risk' }
    ],
    description: 'File deletion command'
  },
  'git': {
    tool: 'git',
    subcommands: {
      'push': {
        risks: [
          { flag: '--force', risk: 'high', reason: 'Overwrites remote history; may affect team' },
          { flag: '-f', risk: 'high', reason: 'Same as --force; destructive to shared repo' }
        ],
        safer: 'git push --force-with-lease (checks remote changes first)'
      },
      'reset': {
        risks: [
          { flag: '--hard', risk: 'high', reason: 'Discards all uncommitted changes irreversibly' }
        ],
        safer: 'git reset (without --hard) or create backup branch first'
      },
      'clean': {
        risks: [
          { flag: '-f', risk: 'high', reason: 'Forces deletion of untracked files' },
          { flag: '-fd', risk: 'high', reason: 'Deletes untracked files AND directories' }
        ]
      }
    },
    description: 'Git version control'
  },
  'docker': {
    tool: 'docker',
    subcommands: {
      'system': {
        'prune': {
          risks: [
            { flag: '-a', risk: 'high', reason: 'Removes all unused images (may be intentional)' },
            { flag: '--volumes', risk: 'high', reason: 'Deletes unused volumes with potential data' }
          ],
          reason: 'Removes Docker resources; can be costly if accidental'
        }
      },
      'rmi': {
        risks: [
          { flag: '-f', risk: 'high', reason: 'Force removes image, breaks dependent containers' }
        ],
        reason: 'Permanently deletes Docker images'
      },
      'rm': {
        risks: [
          { flag: '-f', risk: 'medium', reason: 'Force removes container; data loss possible' }
        ],
        reason: 'Deletes Docker containers'
      }
    },
    description: 'Docker container/image operations'
  },
  'dd': {
    tool: 'dd',
    risks: [
      { pattern: 'if=/dev/', risk: 'high', reason: 'Reading from raw disk device' },
      { pattern: 'of=/dev/', risk: 'high', reason: 'Writing to raw disk device; IRREVERSIBLE data corruption' }
    ],
    description: 'Disk/device data copy; extreme risk with wrong arguments'
  },
  'chmod': {
    tool: 'chmod',
    risks: [
      { flag: '777', risk: 'high', reason: 'World-readable/writable; major security vulnerability' },
      { flag: '755', risk: 'low', reason: 'Standard; acceptable for most executables' }
    ],
    description: 'File permission change'
  },
  'chown': {
    tool: 'chown',
    risks: [
      { flag: '-R', risk: 'high', reason: 'Recursively changes ownership; can break system access' }
    ],
    description: 'Change file owner'
  },
  'sudo': {
    tool: 'sudo',
    risks: [
      { pattern: 'sudo', risk: 'medium', reason: 'Executing with root privileges; verify command is safe' }
    ],
    description: 'Elevated privilege execution'
  },
  'curl': {
    tool: 'curl',
    risks: [
      { flag: '| sh', risk: 'high', reason: 'Piping to shell executes arbitrary code from URL' },
      { flag: '| bash', risk: 'high', reason: 'Piping to bash executes arbitrary code from URL' }
    ],
    description: 'HTTP client; can execute remote code if piped'
  },
  'wget': {
    tool: 'wget',
    risks: [
      { flag: '| sh', risk: 'high', reason: 'Piping to shell executes arbitrary code' }
    ],
    description: 'File downloader; dangerous if output is executed'
  }
};

/**
 * Get risk info for a tool/command
 * @param {string} tool - The command tool (e.g., 'rm', 'git')
 * @param {string[]} args - Command arguments/flags
 * @returns {Object} Risk analysis with level and details
 */
export function analyzeRisks(tool, args) {
  const pattern = riskPatterns[tool];
  if (!pattern) {
    return { found: false, tool, risks: [] };
  }

  const detectedRisks = [];
  const argStr = args.join(' ');

  // Check for direct risk flags
  if (pattern.risks) {
    pattern.risks.forEach(riskItem => {
      if (riskItem.flag && args.includes(riskItem.flag)) {
        detectedRisks.push({
          flag: riskItem.flag,
          risk: riskItem.risk,
          reason: riskItem.reason
        });
      }
      if (riskItem.pattern && argStr.includes(riskItem.pattern)) {
        detectedRisks.push({
          pattern: riskItem.pattern,
          risk: riskItem.risk,
          reason: riskItem.reason
        });
      }
    });
  }

  // Check for git/docker subcommands
  if (pattern.subcommands) {
    const subCmd = args[0];
    if (subCmd && pattern.subcommands[subCmd]) {
      const subPattern = pattern.subcommands[subCmd];
      
      if (typeof subPattern === 'object' && subPattern.risks) {
        subPattern.risks.forEach(riskItem => {
          if (args.includes(riskItem.flag)) {
            detectedRisks.push({
              flag: riskItem.flag,
              risk: riskItem.risk,
              reason: riskItem.reason
            });
          }
        });
      }
    }
  }

  return {
    found: true,
    tool,
    risks: detectedRisks,
    description: pattern.description
  };
}

/**
 * Determine overall risk level from detected risks
 * @param {Object[]} risks - Array of risk objects
 * @returns {string} 'high', 'medium', or 'low'
 */
export function getRiskLevel(risks) {
  if (!risks || risks.length === 0) return 'low';
  if (risks.some(r => r.risk === 'high')) return 'high';
  if (risks.some(r => r.risk === 'medium')) return 'medium';
  return 'low';
}
