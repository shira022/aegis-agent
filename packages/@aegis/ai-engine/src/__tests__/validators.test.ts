import { describe, it, expect } from 'vitest';
import {
  validateSyntax,
  validateNoDangerousOps,
  validateDeterministic,
  BLOCKED_PATTERNS,
} from '../validators';

describe('validateSyntax', () => {
  it('should return valid for correct Python syntax', () => {
    const result = validateSyntax('def hello():\n    return "world"');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return valid for valid Python with imports', () => {
    const code = `import os
def get_path():
    return os.path.join("a", "b")`;
    const result = validateSyntax(code);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return invalid for syntax errors', () => {
    const result = validateSyntax('def broken(:\n    pass');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should return invalid for incomplete code', () => {
    const result = validateSyntax('if True:');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should return invalid for empty code', () => {
    const result = validateSyntax('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should handle complex valid Python', () => {
    const code = `
class MyClass:
    def __init__(self, x):
        self.x = x
    
    def method(self):
        if self.x > 0:
            return True
        return False
`;
    const result = validateSyntax(code);
    expect(result.valid).toBe(true);
  });
});

describe('validateNoDangerousOps', () => {
  it('should return safe for normal code', () => {
    const code = `import os
path = os.path.join("dir", "file.txt")
print(path)`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should detect subprocess.call', () => {
    const code = `import subprocess
subprocess.call(["rm", "-rf", "/"])`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should detect os.system', () => {
    const code = `import os
os.system("echo hacked")`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should detect eval', () => {
    const code = `x = eval("1 + 1")`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should detect exec', () => {
    const code = `exec("import os; os.system('ls')")`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should detect __import__', () => {
    const code = `mod = __import__('os')`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should detect rm -rf', () => {
    const code = `import subprocess
subprocess.run(["rm", "-rf", "/important/dir"])`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('should detect format string with dangerous content', () => {
    const code = `template = "{0.__class__.__init__.__globals__}"
result = template.format(obj)`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(false);
  });

  it('should detect multiple violations in one code block', () => {
    const code = `eval("bad")
exec("worse")
os.system("terrible")`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it('should pass safe Selenium code', () => {
    const code = `from selenium import webdriver
driver = webdriver.Chrome()
driver.get("https://example.com")`;
    const result = validateNoDangerousOps(code);
    expect(result.safe).toBe(true);
  });
});

describe('validateDeterministic', () => {
  it('should return deterministic for pure logic code', () => {
    const code = `def add(a, b):
    return a + b`;
    const result = validateDeterministic(code);
    expect(result.deterministic).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect time.time() usage', () => {
    const code = `import time
t = time.time()`;
    const result = validateDeterministic(code);
    expect(result.deterministic).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should detect random usage', () => {
    const code = `import random
x = random.randint(1, 100)`;
    const result = validateDeterministic(code);
    expect(result.deterministic).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should detect datetime.now()', () => {
    const code = `from datetime import datetime
now = datetime.now()`;
    const result = validateDeterministic(code);
    expect(result.deterministic).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should detect uuid generation', () => {
    const code = `import uuid
id = uuid.uuid4()`;
    const result = validateDeterministic(code);
    expect(result.deterministic).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should detect print statements (side effects)', () => {
    const code = `print("hello")`;
    const result = validateDeterministic(code);
    expect(result.deterministic).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should detect network calls (requests.get)', () => {
    const code = `import requests
resp = requests.get("https://example.com")`;
    const result = validateDeterministic(code);
    expect(result.deterministic).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should detect file I/O operations', () => {
    const code = `with open("file.txt", "r") as f:
    content = f.read()`;
    const result = validateDeterministic(code);
    expect(result.deterministic).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe('BLOCKED_PATTERNS', () => {
  it('should contain expected dangerous patterns', () => {
    expect(BLOCKED_PATTERNS.length).toBeGreaterThan(0);
    const patternStrings = BLOCKED_PATTERNS.map((p) => p.source);
    expect(patternStrings.some((p) => p.includes('subprocess'))).toBe(true);
    expect(patternStrings.some((p) => p.includes('os\\.system'))).toBe(true);
    expect(patternStrings.some((p) => p.includes('eval'))).toBe(true);
    expect(patternStrings.some((p) => p.includes('exec'))).toBe(true);
    expect(patternStrings.some((p) => p.includes('__import__'))).toBe(true);
  });

  it('should each be a RegExp', () => {
    for (const pattern of BLOCKED_PATTERNS) {
      expect(pattern).toBeInstanceOf(RegExp);
    }
  });
});
