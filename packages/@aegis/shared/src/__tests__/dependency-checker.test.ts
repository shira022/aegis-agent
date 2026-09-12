import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process at module level
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

import { execSync } from 'child_process';

const mockExecSync = vi.mocked(execSync);

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocking ──────────────────────────────────────────
import {
  checkPython,
  checkPlaywright,
  checkBrowserDrivers,
  checkNode,
  checkAllDeps,
  getPlatform,
  getInstallCommand,
} from '../utils/dependency-checker';

// ─── DependencyResult shape ────────────────────────────────────────

describe('DependencyResult interface', () => {
  it('checkPython returns correct shape', () => {
    mockExecSync.mockReturnValue(Buffer.from('Python 3.11.4'));
    const result = checkPython();

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('installed');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('installCommand');
    expect(typeof result.name).toBe('string');
    expect(typeof result.installed).toBe('boolean');
    expect(typeof result.version === 'string' || result.version === null).toBe(true);
    expect(typeof result.installCommand).toBe('string');
  });

  it('checkPlaywright returns correct shape', () => {
    mockExecSync.mockReturnValue(Buffer.from('1.40.0'));
    const result = checkPlaywright();

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('installed');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('installCommand');
    expect(typeof result.name).toBe('string');
    expect(typeof result.installed).toBe('boolean');
    expect(typeof result.version === 'string' || result.version === null).toBe(true);
    expect(typeof result.installCommand).toBe('string');
  });

  it('checkBrowserDrivers returns correct shape', () => {
    mockExecSync.mockReturnValue(Buffer.from('Browser versions found.'));
    const result = checkBrowserDrivers();

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('installed');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('installCommand');
    expect(typeof result.name).toBe('string');
    expect(typeof result.installed).toBe('boolean');
    expect(typeof result.version === 'string' || result.version === null).toBe(true);
    expect(typeof result.installCommand).toBe('string');
  });

  it('checkNode returns correct shape', () => {
    mockExecSync.mockReturnValue(Buffer.from('v20.10.0'));
    const result = checkNode();

    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('installed');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('installCommand');
    expect(typeof result.name).toBe('string');
    expect(typeof result.installed).toBe('boolean');
    expect(typeof result.version === 'string' || result.version === null).toBe(true);
    expect(typeof result.installCommand).toBe('string');
  });
});

// ─── checkPython ───────────────────────────────────────────────────

describe('checkPython()', () => {
  it('detects Python when installed', () => {
    mockExecSync.mockReturnValue(Buffer.from('Python 3.11.4'));
    const result = checkPython();

    expect(result.name).toBe('Python');
    expect(result.installed).toBe(true);
    expect(result.version).toBe('3.11.4');
  });

  it('returns null version when not installed', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });
    const result = checkPython();

    expect(result.name).toBe('Python');
    expect(result.installed).toBe(false);
    expect(result.version).toBeNull();
  });

  it('calls execSync with python3 --version', () => {
    mockExecSync.mockReturnValue(Buffer.from('Python 3.12.0'));
    checkPython();

    expect(mockExecSync).toHaveBeenCalledWith(
      'python3 --version',
      { encoding: 'utf-8', timeout: 5000 }
    );
  });

  it('parses version from "Python X.Y.Z" output', () => {
    mockExecSync.mockReturnValue(Buffer.from('Python 3.10.12\n'));
    const result = checkPython();

    expect(result.version).toBe('3.10.12');
  });
});

// ─── checkPlaywright ───────────────────────────────────────────────

describe('checkPlaywright()', () => {
  it('detects Playwright when installed', () => {
    mockExecSync.mockReturnValue(Buffer.from('1.40.0'));
    const result = checkPlaywright();

    expect(result.name).toBe('Playwright');
    expect(result.installed).toBe(true);
    expect(result.version).toBe('1.40.0');
  });

  it('returns null version when not installed', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });
    const result = checkPlaywright();

    expect(result.name).toBe('Playwright');
    expect(result.installed).toBe(false);
    expect(result.version).toBeNull();
  });

  it('calls execSync with npx playwright --version', () => {
    mockExecSync.mockReturnValue(Buffer.from('1.40.0'));
    checkPlaywright();

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx playwright --version',
      { encoding: 'utf-8', timeout: 5000 }
    );
  });
});

// ─── checkBrowserDrivers ──────────────────────────────────────────

describe('checkBrowserDrivers()', () => {
  it('detects browser drivers when installed', () => {
    mockExecSync.mockReturnValue(Buffer.from('Browser versions found.'));
    const result = checkBrowserDrivers();

    expect(result.name).toBe('Browser Drivers');
    expect(result.installed).toBe(true);
    expect(result.version).not.toBeNull();
  });

  it('returns null version when not installed', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });
    const result = checkBrowserDrivers();

    expect(result.name).toBe('Browser Drivers');
    expect(result.installed).toBe(false);
    expect(result.version).toBeNull();
  });

  it('calls execSync with npx playwright install --dry-run', () => {
    mockExecSync.mockReturnValue(Buffer.from('Browser versions found.'));
    checkBrowserDrivers();

    expect(mockExecSync).toHaveBeenCalledWith(
      'npx playwright install --dry-run',
      { encoding: 'utf-8', timeout: 10000 }
    );
  });
});

// ─── checkNode ─────────────────────────────────────────────────────

describe('checkNode()', () => {
  it('detects Node.js when installed', () => {
    mockExecSync.mockReturnValue(Buffer.from('v20.10.0'));
    const result = checkNode();

    expect(result.name).toBe('Node.js');
    expect(result.installed).toBe(true);
    expect(result.version).toBe('20.10.0');
  });

  it('returns null version when not installed', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });
    const result = checkNode();

    expect(result.name).toBe('Node.js');
    expect(result.installed).toBe(false);
    expect(result.version).toBeNull();
  });

  it('calls execSync with node --version', () => {
    mockExecSync.mockReturnValue(Buffer.from('v20.10.0'));
    checkNode();

    expect(mockExecSync).toHaveBeenCalledWith(
      'node --version',
      { encoding: 'utf-8', timeout: 5000 }
    );
  });

  it('parses version from "vX.Y.Z" output', () => {
    mockExecSync.mockReturnValue(Buffer.from('v18.19.0\n'));
    const result = checkNode();

    expect(result.version).toBe('18.19.0');
  });
});

// ─── checkAllDeps ──────────────────────────────────────────────────

describe('checkAllDeps()', () => {
  it('returns array of 4 DependencyResult items', () => {
    mockExecSync.mockReturnValue(Buffer.from('ok'));
    const results = checkAllDeps();

    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(4);
  });

  it('includes all dependency names', () => {
    mockExecSync.mockReturnValue(Buffer.from('ok'));
    const results = checkAllDeps();
    const names = results.map((r) => r.name);

    expect(names).toContain('Python');
    expect(names).toContain('Playwright');
    expect(names).toContain('Browser Drivers');
    expect(names).toContain('Node.js');
  });

  it('each result has the correct shape', () => {
    mockExecSync.mockReturnValue(Buffer.from('ok'));
    const results = checkAllDeps();

    for (const result of results) {
      expect(typeof result.name).toBe('string');
      expect(typeof result.installed).toBe('boolean');
      expect(typeof result.version === 'string' || result.version === null).toBe(true);
      expect(typeof result.installCommand).toBe('string');
    }
  });

  it('calls execSync for each dependency check', () => {
    mockExecSync.mockReturnValue(Buffer.from('ok'));
    checkAllDeps();

    // At least 4 calls (one per dependency)
    expect(mockExecSync).toHaveBeenCalledTimes(4);
  });
});

// ─── getPlatform ───────────────────────────────────────────────────

describe('getPlatform()', () => {
  it('returns a valid platform string', () => {
    const platform = getPlatform();
    expect(['windows', 'macos', 'linux']).toContain(platform);
  });

  it('returns windows when process.platform is win32', () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32', writable: true });
    expect(getPlatform()).toBe('windows');
    Object.defineProperty(process, 'platform', { value: original, writable: true });
  });

  it('returns macos when process.platform is darwin', () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin', writable: true });
    expect(getPlatform()).toBe('macos');
    Object.defineProperty(process, 'platform', { value: original, writable: true });
  });

  it('returns linux when process.platform is linux', () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'linux', writable: true });
    expect(getPlatform()).toBe('linux');
    Object.defineProperty(process, 'platform', { value: original, writable: true });
  });
});

// ─── getInstallCommand ─────────────────────────────────────────────

describe('getInstallCommand()', () => {
  describe('Windows', () => {
    it('returns winget command for Python', () => {
      expect(getInstallCommand('Python', 'windows')).toBe('winget install Python.Python.3');
    });

    it('returns winget command for Playwright', () => {
      expect(getInstallCommand('Playwright', 'windows')).toBe('winget install Microsoft.Playwright');
    });

    it('returns winget command for Browser Drivers', () => {
      expect(getInstallCommand('Browser Drivers', 'windows')).toBe('winget install Microsoft.Playwright');
    });

    it('returns winget command for Node.js', () => {
      expect(getInstallCommand('Node.js', 'windows')).toBe('winget install OpenJS.NodeJS');
    });
  });

  describe('macOS', () => {
    it('returns brew command for Python', () => {
      expect(getInstallCommand('Python', 'macos')).toBe('brew install python');
    });

    it('returns brew command for Playwright', () => {
      expect(getInstallCommand('Playwright', 'macos')).toBe('brew install playwright');
    });

    it('returns brew command for Browser Drivers', () => {
      expect(getInstallCommand('Browser Drivers', 'macos')).toBe('brew install playwright');
    });

    it('returns brew command for Node.js', () => {
      expect(getInstallCommand('Node.js', 'macos')).toBe('brew install node');
    });
  });

  describe('Linux', () => {
    it('returns apt command for Python', () => {
      expect(getInstallCommand('Python', 'linux')).toBe('sudo apt install python3');
    });

    it('returns pip command for Playwright', () => {
      expect(getInstallCommand('Playwright', 'linux')).toBe('pip install playwright');
    });

    it('returns pip command for Browser Drivers', () => {
      expect(getInstallCommand('Browser Drivers', 'linux')).toBe('pip install playwright');
    });

    it('returns apt command for Node.js', () => {
      expect(getInstallCommand('Node.js', 'linux')).toBe('sudo apt install nodejs');
    });
  });

  it('returns a string for any dependency name', () => {
    const result = getInstallCommand('UnknownDep', 'linux');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─── Integration: installCommand matches platform ──────────────────

describe('installCommand consistency', () => {
  it('checkPython installCommand matches getInstallCommand output', () => {
    mockExecSync.mockReturnValue(Buffer.from('ok'));
    const platform = getPlatform();
    const result = checkPython();
    const expected = getInstallCommand('Python', platform);
    expect(result.installCommand).toBe(expected);
  });

  it('checkNode installCommand matches getInstallCommand output', () => {
    mockExecSync.mockReturnValue(Buffer.from('ok'));
    const platform = getPlatform();
    const result = checkNode();
    const expected = getInstallCommand('Node.js', platform);
    expect(result.installCommand).toBe(expected);
  });
});
