import { describe, it, expect } from 'vitest';
import { PII_DETECTIONS, type PIICategory, type PIIPattern, type PIIDetection } from '../masking/pii-patterns';
import { maskText, maskSelector, maskScreenshot } from '../masking/masker';
import { LogSanitizer } from '../masking/sanitizer';
import { validateNoPII, validateLogSafe, createSafeLog } from '../masking/validator';
import type { OperationLog } from '@aegis/shared';

/** Reset global regex lastIndex so .test() works reliably across calls */
function matches(pattern: RegExp, input: string): boolean {
  pattern.lastIndex = 0;
  return pattern.test(input);
}

// ─── PII Pattern Detection ──────────────────────────────────────────

describe('PII_DETECTIONS patterns', () => {
  it('should have patterns for all required categories', () => {
    const requiredCategories: PIICategory[] = [
      'email', 'phone', 'credit_card', 'ssn', 'password',
      'name', 'address', 'my_number', 'ip_address', 'bank_account',
    ];
    for (const cat of requiredCategories) {
      const found = PII_DETECTIONS.find(p => p.category === cat);
      expect(found, `Missing pattern for category: ${cat}`).toBeDefined();
    }
  });

  it('should detect email addresses', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'email')!;
    expect(matches(pattern.pattern, 'user@example.com')).toBe(true);
    expect(matches(pattern.pattern, 'test.name+tag@domain.co.jp')).toBe(true);
    expect(matches(pattern.pattern, 'not an email')).toBe(false);
  });

  it('should detect JP phone numbers (0XX-XXXX-XXXX)', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'phone')!;
    expect(matches(pattern.pattern, '090-1234-5678')).toBe(true);
    expect(matches(pattern.pattern, '03-1234-5678')).toBe(true);
    expect(matches(pattern.pattern, '080-1111-2222')).toBe(true);
  });

  it('should detect international phone numbers', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'phone')!;
    expect(matches(pattern.pattern, '+81-90-1234-5678')).toBe(true);
    expect(matches(pattern.pattern, '+1-555-123-4567')).toBe(true);
  });

  it('should detect credit card numbers', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'credit_card')!;
    expect(matches(pattern.pattern, '4111-1111-1111-1111')).toBe(true); // Visa
    expect(matches(pattern.pattern, '5500-0000-0000-0004')).toBe(true); // Mastercard
    expect(matches(pattern.pattern, '3782-822463-10005')).toBe(true);  // Amex
    expect(matches(pattern.pattern, '1234-5678-9012-3456')).toBe(false);
  });

  it('should detect JP MyNumber (12 digits)', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'my_number')!;
    expect(matches(pattern.pattern, '123456789012')).toBe(true);
    expect(matches(pattern.pattern, '000000000000')).toBe(true);
    expect(matches(pattern.pattern, '12345')).toBe(false);
  });

  it('should detect US SSN patterns', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'ssn')!;
    expect(matches(pattern.pattern, '123-45-6789')).toBe(true);
    expect(matches(pattern.pattern, '001-01-0001')).toBe(true);
  });

  it('should detect IPv4 addresses', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'ip_address')!;
    expect(matches(pattern.pattern, '192.168.1.1')).toBe(true);
    expect(matches(pattern.pattern, '10.0.0.1')).toBe(true);
    expect(matches(pattern.pattern, '255.255.255.255')).toBe(true);
  });

  it('should detect IPv6 addresses', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'ip_address')!;
    expect(matches(pattern.pattern, '2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(true);
    expect(matches(pattern.pattern, '::1')).toBe(true);
  });

  it('should detect JP postal codes', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'address')!;
    expect(matches(pattern.pattern, '〒100-0001')).toBe(true);
    expect(matches(pattern.pattern, '〒 1000001')).toBe(true);
  });

  it('should detect password field indicators', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'password')!;
    expect(matches(pattern.pattern, 'password: secret123')).toBe(true);
    expect(matches(pattern.pattern, 'passwd=abc123')).toBe(true);
    expect(matches(pattern.pattern, 'secret: mypassword')).toBe(true);
  });

  it('should detect JP bank account patterns', () => {
    const pattern = PII_DETECTIONS.find(p => p.category === 'bank_account')!;
    expect(matches(pattern.pattern, '1234567')).toBe(true);  // 7-digit account
    expect(matches(pattern.pattern, '12345678')).toBe(true); // 8-digit account
  });

  it('each pattern should have required fields', () => {
    for (const p of PII_DETECTIONS) {
      expect(p.category).toBeDefined();
      expect(p.pattern).toBeInstanceOf(RegExp);
      expect(p.maskChar).toBeDefined();
      expect(p.description).toBeDefined();
      expect(['high', 'medium', 'low']).toContain(p.severity);
    }
  });
});

// ─── maskText ────────────────────────────────────────────────────────

describe('maskText', () => {
  it('should mask email addresses', () => {
    const result = maskText('Contact me at user@example.com');
    expect(result.masked).not.toBe('Contact me at user@example.com');
    expect(result.wasModified).toBe(true);
    expect(result.detections.length).toBeGreaterThan(0);
    expect(result.detections[0].category).toBe('email');
  });

  it('should mask phone numbers', () => {
    const result = maskText('Call 090-1234-5678');
    expect(result.masked).not.toContain('090-1234-5678');
    expect(result.wasModified).toBe(true);
    expect(result.detections[0].category).toBe('phone');
  });

  it('should mask credit card numbers', () => {
    const result = maskText('Card: 4111-1111-1111-1111');
    expect(result.masked).not.toContain('4111-1111-1111-1111');
    expect(result.wasModified).toBe(true);
    // credit_card pattern is more specific, should be detected first
    const cats = result.detections.map(d => d.category);
    expect(cats).toContain('credit_card');
  });

  it('should mask multiple PII types in one text', () => {
    const result = maskText('Email: test@example.com, Phone: 090-1234-5678');
    expect(result.wasModified).toBe(true);
    expect(result.detections.length).toBeGreaterThanOrEqual(2);
    const categories = result.detections.map(d => d.category);
    expect(categories).toContain('email');
    expect(categories).toContain('phone');
  });

  it('should filter by category when specified', () => {
    const result = maskText('Email: test@example.com, Phone: 090-1234-5678', ['email']);
    expect(result.detections.length).toBe(1);
    expect(result.detections[0].category).toBe('email');
    expect(result.masked).toContain('090-1234-5678'); // phone NOT masked
  });

  it('should return unmodified text when no PII found', () => {
    const result = maskText('Hello, this is clean text');
    expect(result.wasModified).toBe(false);
    expect(result.masked).toBe('Hello, this is clean text');
    expect(result.detections).toHaveLength(0);
  });

  it('should preserve original text', () => {
    const original = 'Email: test@example.com';
    const result = maskText(original);
    expect(result.original).toBe(original);
  });

  it('should handle empty string', () => {
    const result = maskText('');
    expect(result.wasModified).toBe(false);
    expect(result.masked).toBe('');
    expect(result.detections).toHaveLength(0);
  });

  it('should mask JP MyNumber', () => {
    const result = maskText('MyNumber: 123456789012');
    expect(result.masked).not.toContain('123456789012');
    const cats = result.detections.map(d => d.category);
    expect(cats).toContain('my_number');
  });

  it('should mask IP addresses', () => {
    const result = maskText('Server: 192.168.1.1');
    expect(result.masked).not.toContain('192.168.1.1');
    expect(result.detections[0].category).toBe('ip_address');
  });

  it('should handle Japanese text mixed with PII', () => {
    const result = maskText('メール: test@example.com で連絡してください');
    expect(result.wasModified).toBe(true);
    expect(result.masked).not.toContain('test@example.com');
    expect(result.masked).toContain('で連絡してください');
  });

  it('should set confidence on detections', () => {
    const result = maskText('Email: user@example.com');
    for (const d of result.detections) {
      expect(d.confidence).toBeGreaterThanOrEqual(0);
      expect(d.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('should set correct indices on detections', () => {
    const result = maskText('Call 090-1234-5678 now');
    const det = result.detections[0];
    expect(det.startIndex).toBeGreaterThanOrEqual(0);
    expect(det.endIndex).toBeGreaterThan(det.startIndex);
    expect(result.original.substring(det.startIndex, det.endIndex)).toBe(det.originalValue);
  });
});

// ─── maskSelector ────────────────────────────────────────────────────

describe('maskSelector', () => {
  it('should mask text field in selector', () => {
    const selector = { text: 'user@example.com', label: 'Email', placeholder: '' };
    const masked = maskSelector(selector);
    expect(masked.text).not.toBe('user@example.com');
  });

  it('should mask label field in selector', () => {
    const selector = { text: '', label: 'Phone: 090-1234-5678', placeholder: '' };
    const masked = maskSelector(selector);
    expect(masked.label).not.toContain('090-1234-5678');
  });

  it('should mask placeholder field in selector', () => {
    const selector = { text: '', label: '', placeholder: 'Enter email: test@example.com' };
    const masked = maskSelector(selector);
    expect(masked.placeholder).not.toContain('test@example.com');
  });

  it('should preserve non-PII text in selectors', () => {
    const selector = { text: 'Click button', label: 'Submit', placeholder: 'Enter value' };
    const masked = maskSelector(selector);
    expect(masked.text).toBe('Click button');
    expect(masked.label).toBe('Submit');
    expect(masked.placeholder).toBe('Enter value');
  });
});

// ─── maskScreenshot ──────────────────────────────────────────────────

describe('maskScreenshot', () => {
  it('should return input as-is (placeholder implementation)', async () => {
    const input = 'base64encodeddata';
    const result = await maskScreenshot(input);
    expect(result).toBe(input);
  });
});

// ─── LogSanitizer ────────────────────────────────────────────────────

describe('LogSanitizer', () => {
  const makeLog = (steps: Array<{ text?: string; selector?: string }>): OperationLog => ({
    id: 'log-1',
    taskId: 'task-1',
    steps: steps.map(s => ({
      type: 'type' as const,
      target: { text: s.text, selector: s.selector },
      timestamp: new Date().toISOString(),
    })),
    recordedAt: new Date().toISOString(),
    source: 'browser',
  });

  it('should sanitize text in operation log steps', () => {
    const log = makeLog([{ text: 'user@example.com' }]);
    const sanitizer = new LogSanitizer();
    const sanitized = sanitizer.sanitizeLog(log);
    expect(sanitized.sanitized).toBe(true);
    expect(sanitized.steps[0].target.text).not.toBe('user@example.com');
  });

  it('should sanitize selector values containing PII', () => {
    const log = makeLog([{ selector: 'input[value="090-1234-5678"]' }]);
    const sanitizer = new LogSanitizer();
    const sanitized = sanitizer.sanitizeLog(log);
    expect(sanitized.steps[0].target.selector).not.toContain('090-1234-5678');
  });

  it('should track detections across the log', () => {
    const log = makeLog([
      { text: 'user@example.com' },
      { text: '090-1234-5678' },
    ]);
    const sanitizer = new LogSanitizer();
    sanitizer.sanitizeLog(log);
    const detections = sanitizer.getDetections();
    expect(detections.length).toBeGreaterThanOrEqual(2);
  });

  it('should compute sanitize stats', () => {
    const log = makeLog([
      { text: 'user@example.com' },
      { text: '090-1234-5678' },
    ]);
    const sanitizer = new LogSanitizer();
    sanitizer.sanitizeLog(log);
    const stats = sanitizer.getStats();
    expect(stats.totalDetections).toBeGreaterThanOrEqual(2);
    expect(stats.fieldsModified).toBeGreaterThanOrEqual(2);
    expect(stats.byCategory['email']).toBeGreaterThanOrEqual(1);
    expect(stats.byCategory['phone']).toBeGreaterThanOrEqual(1);
  });

  it('should filter by categories in options', () => {
    const log = makeLog([{ text: 'user@example.com, 090-1234-5678' }]);
    const sanitizer = new LogSanitizer({ categories: ['email'] });
    const sanitized = sanitizer.sanitizeLog(log);
    const cats = sanitized.detections.map(d => d.category);
    expect(cats).toContain('email');
    expect(cats).not.toContain('phone');
  });

  it('should accept custom patterns', () => {
    const customPattern: PIIPattern = {
      category: 'name',
      pattern: /CUSTOM_SECRET_\d+/g,
      maskChar: '*',
      description: 'Custom secret',
      severity: 'high',
    };
    const log = makeLog([{ text: 'Code: CUSTOM_SECRET_123' }]);
    const sanitizer = new LogSanitizer({ customPatterns: [customPattern] });
    const sanitized = sanitizer.sanitizeLog(log);
    expect(sanitized.steps[0].target.text).not.toContain('CUSTOM_SECRET_123');
  });

  it('should sanitize individual values via sanitizeValue', () => {
    const sanitizer = new LogSanitizer();
    const result = sanitizer.sanitizeValue('Email: test@example.com');
    expect(result).not.toContain('test@example.com');
  });

  it('should handle logs with no PII', () => {
    const log = makeLog([{ text: 'Click the submit button' }]);
    const sanitizer = new LogSanitizer();
    const sanitized = sanitizer.sanitizeLog(log);
    expect(sanitized.sanitized).toBe(true);
    expect(sanitized.detections).toHaveLength(0);
    expect(sanitized.stats.totalDetections).toBe(0);
  });

  it('should preserve non-PII fields', () => {
    const log = makeLog([{ text: 'Hello world' }]);
    const sanitizer = new LogSanitizer();
    const sanitized = sanitizer.sanitizeLog(log);
    expect(sanitized.steps[0].target.text).toBe('Hello world');
  });

  it('should handle multiple steps with mixed PII', () => {
    const log = makeLog([
      { text: 'Email: admin@corp.jp' },
      { text: 'Card: 4111-1111-1111-1111' },
      { text: 'No PII here' },
    ]);
    const sanitizer = new LogSanitizer();
    const sanitized = sanitizer.sanitizeLog(log);
    expect(sanitized.steps[0].target.text).not.toContain('admin@corp.jp');
    expect(sanitized.steps[1].target.text).not.toContain('4111-1111-1111-1111');
    expect(sanitized.steps[2].target.text).toBe('No PII here');
  });
});

// ─── Validator ───────────────────────────────────────────────────────

describe('validateNoPII', () => {
  it('should return clean=true for text without PII', () => {
    const result = validateNoPII('Hello, this is safe text');
    expect(result.clean).toBe(true);
    expect(result.detections).toHaveLength(0);
  });

  it('should return clean=false for text with PII', () => {
    const result = validateNoPII('Email: user@example.com');
    expect(result.clean).toBe(false);
    expect(result.detections.length).toBeGreaterThan(0);
  });

  it('should detect multiple PII types', () => {
    const result = validateNoPII('Email: a@b.com, Phone: 090-1234-5678');
    expect(result.clean).toBe(false);
    expect(result.detections.length).toBeGreaterThanOrEqual(2);
  });
});

describe('validateLogSafe', () => {
  const makeLog = (steps: Array<{ text?: string }>): OperationLog => ({
    id: 'log-1',
    taskId: 'task-1',
    steps: steps.map(s => ({
      type: 'type' as const,
      target: { text: s.text },
      timestamp: new Date().toISOString(),
    })),
    recordedAt: new Date().toISOString(),
    source: 'browser',
  });

  it('should return safe=true for logs without PII', () => {
    const log = makeLog([{ text: 'Click submit' }]);
    const result = validateLogSafe(log);
    expect(result.safe).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('should return safe=false for logs with PII', () => {
    const log = makeLog([{ text: 'user@example.com' }]);
    const result = validateLogSafe(log);
    expect(result.safe).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should list issues for each PII detection', () => {
    const log = makeLog([
      { text: 'user@example.com' },
      { text: '090-1234-5678' },
    ]);
    const result = validateLogSafe(log);
    expect(result.safe).toBe(false);
    expect(result.issues.length).toBeGreaterThanOrEqual(2);
  });
});

describe('createSafeLog', () => {
  it('should create a sanitized log from an unsafe log', () => {
    const log: OperationLog = {
      id: 'log-1',
      taskId: 'task-1',
      steps: [{
        type: 'type',
        target: { text: 'user@example.com' },
        timestamp: new Date().toISOString(),
      }],
      recordedAt: new Date().toISOString(),
      source: 'browser',
    };
    const sanitizer = new LogSanitizer();
    const safeLog = createSafeLog(log, sanitizer);
    expect(safeLog.sanitized).toBe(true);
    expect(safeLog.steps[0].target.text).not.toBe('user@example.com');
  });
});

// ─── Edge Cases ──────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('should handle Japanese text with no PII', () => {
    const result = maskText('こんにちは世界。今日はいい天気です。');
    expect(result.wasModified).toBe(false);
    expect(result.masked).toBe('こんにちは世界。今日はいい天気です。');
  });

  it('should handle mixed Japanese and English PII', () => {
    const result = maskText('田中さんのメールは tanaka@example.com です');
    expect(result.wasModified).toBe(true);
    expect(result.masked).not.toContain('tanaka@example.com');
    expect(result.masked).toContain('田中さんのメールは');
  });

  it('should handle text with only special characters', () => {
    const result = maskText('!@#$%^&*()');
    expect(result.wasModified).toBe(false);
  });

  it('should handle very long text with PII', () => {
    const longText = 'A'.repeat(1000) + ' user@example.com ' + 'B'.repeat(1000);
    const result = maskText(longText);
    expect(result.wasModified).toBe(true);
    expect(result.masked).not.toContain('user@example.com');
  });

  it('should handle partial email-like strings that are not emails', () => {
    const result = maskText('not@valid');
    // Should not be detected as email (no domain TLD)
    const emailDetections = result.detections.filter(d => d.category === 'email');
    expect(emailDetections).toHaveLength(0);
  });

  it('should handle overlapping detection regions gracefully', () => {
    const result = maskText('Call 090-1234-5678 or email test@example.com');
    expect(result.wasModified).toBe(true);
    expect(result.detections.length).toBeGreaterThanOrEqual(2);
    // No detection should overlap
    const sorted = [...result.detections].sort((a, b) => a.startIndex - b.startIndex);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].startIndex).toBeGreaterThanOrEqual(sorted[i - 1].endIndex);
    }
  });

  it('should mask JP postal code in address', () => {
    const result = maskText('Address: 〒100-0001 東京都千代田区');
    expect(result.wasModified).toBe(true);
    expect(result.masked).not.toContain('100-0001');
  });

  it('should not throw on null or undefined-like inputs', () => {
    expect(() => maskText('')).not.toThrow();
    expect(() => maskText('   ')).not.toThrow();
  });
});
