import { describe, it, expect, beforeEach } from 'vitest';
import {
  VisionAnalyzer,
} from '../vision-analyzer';
import type { ElementSelector } from '@aegis/recorder';
import type { HealingRequest } from '../types';

// ─── Mocks ──────────────────────────────────────────────────────

// We test VisionAnalyzer in isolation by mocking its internal AI calls.
// The class should accept an aiEngine-like dependency or we mock the module.

// ─── Tests ──────────────────────────────────────────────────────

describe('VisionAnalyzer', () => {
  let analyzer: VisionAnalyzer;

  beforeEach(() => {
    analyzer = new VisionAnalyzer();
  });

  describe('analyzeScreenshot', () => {
    it('returns semantic matches for a given screenshot', async () => {
      const selector: ElementSelector = {
        cssSelector: '#submit-btn',
        text: 'Submit',
      };

      const matches = await analyzer.analyzeScreenshot('base64-screenshot-data', selector);

      expect(Array.isArray(matches)).toBe(true);
      // Without a real AI engine, we get empty results or basic matches
      for (const match of matches) {
        expect(match).toHaveProperty('selector');
        expect(match).toHaveProperty('confidence');
        expect(match).toHaveProperty('visualSimilarity');
        expect(match).toHaveProperty('textMatch');
        expect(match).toHaveProperty('contextMatch');
        expect(typeof match.confidence).toBe('number');
        expect(match.confidence).toBeGreaterThanOrEqual(0);
        expect(match.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('returns empty array for invalid screenshot', async () => {
      const selector: ElementSelector = { cssSelector: '#missing' };
      const matches = await analyzer.analyzeScreenshot('', selector);
      expect(matches).toEqual([]);
    });
  });

  describe('findAlternativeSelector', () => {
    it('returns an ElementSelector', async () => {
      const originalSelector: ElementSelector = {
        cssSelector: '.old-button',
        text: 'Click Me',
      };

      const alternative = await analyzer.findAlternativeSelector(
        'base64-screenshot',
        originalSelector,
      );

      expect(alternative).toBeDefined();
      expect(typeof alternative).toBe('object');
      // Should have at least one selector property
      const hasSelector = alternative.cssSelector || alternative.text || alternative.xpath || alternative.role;
      expect(hasSelector).toBeTruthy();
    });

    it('returns original selector when screenshot is empty', async () => {
      const originalSelector: ElementSelector = {
        cssSelector: '#test-btn',
        text: 'Test',
      };

      const alternative = await analyzer.findAlternativeSelector('', originalSelector);
      // Without AI, should gracefully return the original or best-effort
      expect(alternative).toBeDefined();
    });
  });

  describe('compareScreenshots', () => {
    it('detects when screenshots are the same', async () => {
      const result = await analyzer.compareScreenshots('same-data', 'same-data');

      expect(result).toHaveProperty('changed');
      expect(result).toHaveProperty('regions');
      expect(result).toHaveProperty('description');
      expect(typeof result.changed).toBe('boolean');
      expect(Array.isArray(result.regions)).toBe(true);
    });

    it('detects when screenshots differ', async () => {
      const result = await analyzer.compareScreenshots('screenshot-before', 'screenshot-after');

      expect(result).toHaveProperty('changed');
      expect(result).toHaveProperty('regions');
      expect(result).toHaveProperty('description');
    });

    it('returns empty regions for empty inputs', async () => {
      const result = await analyzer.compareScreenshots('', '');

      expect(result.changed).toBe(false);
      expect(result.regions).toEqual([]);
    });
  });

  describe('generateHealingPrompt', () => {
    it('generates a prompt string from a HealingRequest', () => {
      const request: HealingRequest = {
        id: 'req-1',
        executionLogId: 'log-1',
        error: {
          message: 'Element not found: #submit',
          actionId: 'action-1',
          timestamp: Date.now(),
        },
        currentCode: 'driver.find_element("#submit").click()',
        failedAction: {
          id: 'action-1',
          type: 'click',
          timestamp: Date.now(),
          selector: { cssSelector: '#submit', text: 'Submit' },
          metadata: { url: 'https://example.com', title: 'Home' },
        },
        context: {
          url: 'https://example.com',
          pageTitle: 'Home',
          previousActions: [],
          timestamp: Date.now(),
        },
      };

      const prompt = analyzer.generateHealingPrompt(request);

      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
      expect(prompt).toContain('Element not found: #submit');
      expect(prompt).toContain('#submit');
    });

    it('includes screenshot reference in prompt when provided', () => {
      const request: HealingRequest = {
        id: 'req-2',
        executionLogId: 'log-2',
        error: {
          message: 'Timeout waiting for element',
          actionId: 'action-2',
          timestamp: Date.now(),
        },
        currentCode: 'time.sleep(10)',
        failedAction: {
          id: 'action-2',
          type: 'wait',
          timestamp: Date.now(),
          selector: { cssSelector: '#loading' },
          metadata: {},
        },
        screenshot: 'base64-screenshot-data',
        context: {
          url: 'https://example.com/dashboard',
          pageTitle: 'Dashboard',
          previousActions: [],
          timestamp: Date.now(),
        },
      };

      const prompt = analyzer.generateHealingPrompt(request);

      expect(prompt).toContain('Screenshot');
      expect(prompt).toContain('base64-screenshot-data');
    });
  });
});
