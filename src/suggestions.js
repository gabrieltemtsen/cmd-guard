// Mapping of dangerous commands to safer alternatives

export const suggestions = {
  'rm -rf': {
    dangerous: 'rm -rf <path>',
    safer: 'rm -ri <path>',
    explanation: 'Interactive mode prompts before each deletion'
  },
  'rm --force --recursive': {
    dangerous: 'rm --force --recursive <path>',
    safer: 'rm -ri <path>',
    explanation: 'Interactive mode prompts before each deletion'
  },
  'git push --force': {
    dangerous: 'git push --force',
    safer: 'git push --force-with-lease',
    explanation: 'Only force-push if remote hasn\'t changed; safer for shared repos'
  },
  'git reset --hard': {
    dangerous: 'git reset --hard',
    safer: 'Create backup branch first: git branch backup && git reset --hard',
    explanation: 'Preserves commit history in case you need to recover'
  },
  'docker system prune -a': {
    dangerous: 'docker system prune -a',
    safer: 'docker system prune (without -a) or docker image prune',
    explanation: 'Without -a, only removes dangling images. Safer for production'
  },
  'chmod 777': {
    dangerous: 'chmod 777 <path>',
    safer: 'chmod 755 <path> (executables) or chmod 644 <path> (files)',
    explanation: 'Restricts access to owner+group, not world-readable'
  },
  'curl | sh': {
    dangerous: 'curl <url> | sh',
    safer: 'curl <url> -o script.sh && cat script.sh && sh script.sh',
    explanation: 'Inspect the script before executing it'
  }
};

/**
 * Get safer alternative for a risky command
 * @param {string} command - The dangerous command
 * @returns {Object|null} Suggestion object or null if not found
 */
export function getSuggestion(command) {
  for (const [key, suggestion] of Object.entries(suggestions)) {
    if (command.includes(key)) {
      return suggestion;
    }
  }
  return null;
}

/**
 * Generic contextual suggestions based on command patterns
 * @param {string} tool - The command tool
 * @param {string[]} args - Command arguments
 * @returns {string|null} Contextual suggestion or null
 */
export function getContextualSuggestion(tool, args) {
  if (tool === 'npm' && args.includes('install')) {
    return 'Consider using npm ci for CI/CD (installs exact versions from package-lock.json)';
  }
  if (tool === 'npm' && args.includes('uninstall')) {
    return 'Backup your node_modules or use npm ci to restore from package-lock.json if needed';
  }
  if (tool === 'docker' && args[0] === 'build' && args.includes('--no-cache')) {
    return 'Building without cache; this will take longer. Only use if you need fresh layers';
  }
  if (tool === 'git' && args.includes('--amend')) {
    return 'Amending commits rewrites history. Only do this before pushing';
  }
  return null;
}
