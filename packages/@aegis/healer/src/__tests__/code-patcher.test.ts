import { describe, it, expect, beforeEach } from 'vitest';
import { CodePatcher } from '../code-patcher';
import type { ElementSelector, RecordedAction } from '@aegis/recorder';

// ─── Tests ──────────────────────────────────────────────────────

describe('CodePatcher', () => {
  let patcher: CodePatcher;

  beforeEach(() => {
    patcher = new CodePatcher();
  });

  describe('patchSelector', () => {
    it('replaces old CSS selector with new one in code', () => {
      const code = `element = driver.find_element("#old-button")\nelement.click()`;
      const oldSelector: ElementSelector = { cssSelector: '#old-button' };
      const newSelector: ElementSelector = { cssSelector: '#new-button' };

      const patched = patcher.patchSelector(code, oldSelector, newSelector);

      expect(patched).toContain('#new-button');
      expect(patched).not.toContain('#old-button');
      expect(patched).toContain('element.click()');
    });

    it('replaces old text selector with new one', () => {
      const code = `element = driver.find_element(text="Old Text")\nelement.click()`;
      const oldSelector: ElementSelector = { text: 'Old Text' };
      const newSelector: ElementSelector = { text: 'New Text' };

      const patched = patcher.patchSelector(code, oldSelector, newSelector);

      expect(patched).toContain('New Text');
      expect(patched).not.toContain('Old Text');
    });

    it('replaces XPath selector', () => {
      const code = `element = driver.find_element("//button[@id='old']")`;
      const oldSelector: ElementSelector = { xpath: "//button[@id='old']" };
      const newSelector: ElementSelector = { xpath: "//button[@id='new']" };

      const patched = patcher.patchSelector(code, oldSelector, newSelector);

      expect(patched).toContain("//button[@id='new']");
      expect(patched).not.toContain("//button[@id='old']");
    });

    it('returns original code if old selector not found', () => {
      const code = `element = driver.find_element("#existing-btn")`;
      const oldSelector: ElementSelector = { cssSelector: '#nonexistent' };
      const newSelector: ElementSelector = { cssSelector: '#replacement' };

      const patched = patcher.patchSelector(code, oldSelector, newSelector);

      expect(patched).toBe(code);
    });
  });

  describe('addRetryLogic', () => {
    it('wraps action with retry logic', () => {
      const code = [
        'element = driver.find_element("#btn")',
        'element.click()',
        'print("done")',
      ].join('\n');

      const patched = patcher.addRetryLogic(code, 0, 3);

      expect(patched).toContain('retry');
      expect(patched).toContain('3');
      expect(patched).toContain('#btn');
    });

    it('preserves other lines when adding retry', () => {
      const code = [
        'import time',
        'element = driver.find_element("#btn")',
        'element.click()',
        'time.sleep(1)',
      ].join('\n');

      const patched = patcher.addRetryLogic(code, 1, 2);

      expect(patched).toContain('import time');
      expect(patched).toContain('time.sleep(1)');
      expect(patched).toContain('#btn');
    });
  });

  describe('addWaitCondition', () => {
    it('adds wait condition before a specific action line', () => {
      const code = [
        'element = driver.find_element("#btn")',
        'element.click()',
      ].join('\n');

      const patched = patcher.addWaitCondition(code, 0, 'element.is_displayed()');

      expect(patched).toContain('element.is_displayed()');
      expect(patched).toContain('#btn');
    });

    it('adds WebDriverWait-style wait', () => {
      const code = 'driver.find_element("#btn").click()';

      const patched = patcher.addWaitCondition(code, 0, 'wait for #btn to be clickable');

      expect(patched).toContain('wait');
      expect(patched).toContain('#btn');
    });
  });

  describe('wrapWithTryCatch', () => {
    it('wraps specific line with try/catch', () => {
      const code = [
        'import time',
        'element = driver.find_element("#btn")',
        'element.click()',
      ].join('\n');

      const patched = patcher.wrapWithTryCatch(code, 1, 'print("error occurred")');

      expect(patched).toContain('try');
      expect(patched).toContain('except');
      expect(patched).toContain('error occurred');
      expect(patched).toContain('#btn');
    });

    it('preserves surrounding code', () => {
      const code = [
        'line1 = "a"',
        'line2 = driver.find_element("#target")',
        'line3 = "c"',
      ].join('\n');

      const patched = patcher.wrapWithTryCatch(code, 1, 'handle_error()');

      expect(patched).toContain('line1 = "a"');
      expect(patched).toContain('line3 = "c"');
      expect(patched).toContain('handle_error()');
    });
  });

  describe('generateAlternativePath', () => {
    it('generates alternative action code', () => {
      const code = 'driver.find_element("#old-btn").click()';
      const failedAction: RecordedAction = {
        id: 'act-1',
        type: 'click',
        timestamp: Date.now(),
        selector: { cssSelector: '#old-btn' },
        metadata: { url: 'https://example.com' },
      };
      const alternative: RecordedAction = {
        id: 'act-2',
        type: 'click',
        timestamp: Date.now(),
        selector: { cssSelector: '#alt-btn', text: 'Submit' },
        metadata: { url: 'https://example.com' },
      };

      const result = patcher.generateAlternativePath(code, failedAction, alternative);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('#alt-btn');
    });

    it('includes fallback comment', () => {
      const code = 'driver.find_element("#primary").click()';
      const failedAction: RecordedAction = {
        id: 'act-1',
        type: 'click',
        timestamp: Date.now(),
        selector: { cssSelector: '#primary' },
        metadata: {},
      };
      const alternative: RecordedAction = {
        id: 'act-2',
        type: 'click',
        timestamp: Date.now(),
        selector: { cssSelector: '#secondary' },
        metadata: {},
      };

      const result = patcher.generateAlternativePath(code, failedAction, alternative);

      expect(result).toContain('#primary');
      expect(result).toContain('#secondary');
    });
  });

  describe('validatePatch', () => {
    it('validates a valid patch', () => {
      const original = 'driver.find_element("#old").click()';
      const patched = 'driver.find_element("#new").click()';

      const result = patcher.validatePatch(original, patched);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('rejects patch that is empty', () => {
      const result = patcher.validatePatch('some code', '');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects patch that is identical to original', () => {
      const code = 'driver.find_element("#btn").click()';
      const result = patcher.validatePatch(code, code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('detects common Python syntax errors in patched code', () => {
      const result = patcher.validatePatch('x = 1', 'x = (');

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
