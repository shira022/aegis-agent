import { execSync } from 'child_process';

// ─── Types ─────────────────────────────────────────────────────────

export type Platform = 'windows' | 'macos' | 'linux';

export interface DependencyResult {
  name: string;
  installed: boolean;
  version: string | null;
  installCommand: string;
}

// ─── Helpers ───────────────────────────────────────────────────────

const EXEC_OPTIONS = { encoding: 'utf-8' as const, timeout: 5000 };
const EXEC_OPTIONS_LONG = { encoding: 'utf-8' as const, timeout: 10000 };

function tryExec(command: string, options = EXEC_OPTIONS): string | null {
  try {
    return execSync(command, options).toString().trim();
  } catch {
    return null;
  }
}

function stripPythonPrefix(output: string): string | null {
  // "Python 3.11.4" → "3.11.4"
  const match = output.match(/Python\s+([\d.]+)/);
  return match ? match[1] : null;
}

function stripNodePrefix(output: string): string | null {
  // "v20.10.0" → "20.10.0"
  const match = output.match(/^v?([\d.]+)/);
  return match ? match[1] : null;
}

// ─── Platform Detection ────────────────────────────────────────────

export function getPlatform(): Platform {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'macos';
    default:
      return 'linux';
  }
}

// ─── Install Commands ──────────────────────────────────────────────

const INSTALL_COMMANDS: Record<Platform, Record<string, string>> = {
  windows: {
    'Python': 'winget install Python.Python.3',
    'Playwright': 'winget install Microsoft.Playwright',
    'Browser Drivers': 'winget install Microsoft.Playwright',
    'Node.js': 'winget install OpenJS.NodeJS',
  },
  macos: {
    'Python': 'brew install python',
    'Playwright': 'brew install playwright',
    'Browser Drivers': 'brew install playwright',
    'Node.js': 'brew install node',
  },
  linux: {
    'Python': 'sudo apt install python3',
    'Playwright': 'pip install playwright',
    'Browser Drivers': 'pip install playwright',
    'Node.js': 'sudo apt install nodejs',
  },
};

export function getInstallCommand(depName: string, platform: Platform): string {
  const cmds = INSTALL_COMMANDS[platform];
  if (cmds[depName]) {
    return cmds[depName];
  }
  // Fallback: return a generic message
  return `Install ${depName} manually for ${platform}`;
}

// ─── Dependency Checks ─────────────────────────────────────────────

export function checkPython(): DependencyResult {
  const platform = getPlatform();
  const raw = tryExec('python3 --version');
  return {
    name: 'Python',
    installed: raw !== null,
    version: raw ? stripPythonPrefix(raw) : null,
    installCommand: getInstallCommand('Python', platform),
  };
}

export function checkPlaywright(): DependencyResult {
  const platform = getPlatform();
  const raw = tryExec('npx playwright --version');
  return {
    name: 'Playwright',
    installed: raw !== null,
    version: raw,
    installCommand: getInstallCommand('Playwright', platform),
  };
}

export function checkBrowserDrivers(): DependencyResult {
  const platform = getPlatform();
  const raw = tryExec('npx playwright install --dry-run', EXEC_OPTIONS_LONG);
  return {
    name: 'Browser Drivers',
    installed: raw !== null,
    version: raw ?? null,
    installCommand: getInstallCommand('Browser Drivers', platform),
  };
}

export function checkNode(): DependencyResult {
  const platform = getPlatform();
  const raw = tryExec('node --version');
  return {
    name: 'Node.js',
    installed: raw !== null,
    version: raw ? stripNodePrefix(raw) : null,
    installCommand: getInstallCommand('Node.js', platform),
  };
}

export function checkAllDeps(): DependencyResult[] {
  return [
    checkPython(),
    checkPlaywright(),
    checkBrowserDrivers(),
    checkNode(),
  ];
}
