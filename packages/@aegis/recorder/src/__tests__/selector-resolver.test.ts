import { describe, it, expect } from 'vitest';
import {
  resolveSelector,
  rankSelector,
  normalizeXPath,
  generateStableSelector,
  createSelectorStrategy,
} from '../selector-resolver';

describe('SelectorResolver', () => {
  describe('resolveSelector', () => {
    it('should resolve selector from an element with aria-label', () => {
      const element = {
        tagName: 'BUTTON',
        ariaLabel: 'Submit Form',
        className: 'btn-primary',
        textContent: 'Submit',
        getAttribute: (attr: string) => attr === 'aria-label' ? 'Submit Form' : null,
      } as any;

      const selector = resolveSelector(element);
      expect(selector.ariaLabel).toBe('Submit Form');
      expect(selector.tagName).toBe('button');
    });

    it('should resolve selector from an element with text content', () => {
      const element = {
        tagName: 'A',
        ariaLabel: null,
        textContent: 'Click here',
        className: 'link',
        getAttribute: () => null,
      } as any;

      const selector = resolveSelector(element);
      expect(selector.text).toBe('Click here');
      expect(selector.tagName).toBe('a');
    });

    it('should resolve selector from an element with placeholder', () => {
      const element = {
        tagName: 'INPUT',
        ariaLabel: null,
        placeholder: 'Enter email',
        type: 'email',
        getAttribute: (attr: string) => attr === 'placeholder' ? 'Enter email' : null,
      } as any;

      const selector = resolveSelector(element);
      expect(selector.placeholder).toBe('Enter email');
      expect(selector.tagName).toBe('input');
    });

    it('should resolve selector with role attribute', () => {
      const element = {
        tagName: 'DIV',
        role: 'button',
        ariaLabel: null,
        getAttribute: (attr: string) => attr === 'role' ? 'button' : null,
      } as any;

      const selector = resolveSelector(element);
      expect(selector.role).toBe('button');
      expect(selector.tagName).toBe('div');
    });
  });

  describe('rankSelector', () => {
    it('should give highest rank to aria-label selector', () => {
      const selector = { ariaLabel: 'Submit' };
      const rank = rankSelector(selector);
      expect(rank).toBeGreaterThan(0);
    });

    it('should give medium rank to text selector', () => {
      const selector = { text: 'Click me' };
      const rank = rankSelector(selector);
      expect(rank).toBeGreaterThan(0);
    });

    it('should give lower rank to xpath selector', () => {
      const selector = { xpath: '/html/body/div[1]/button' };
      const rank = rankSelector(selector);
      expect(rank).toBeGreaterThan(0);
    });

    it('should give lowest rank to cssSelector', () => {
      const selector = { cssSelector: 'body > div:nth-child(1) > button' };
      const rank = rankSelector(selector);
      expect(rank).toBeGreaterThan(0);
    });

    it('should rank aria-label higher than text', () => {
      const ariaRank = rankSelector({ ariaLabel: 'Button' });
      const textRank = rankSelector({ text: 'Button' });
      expect(ariaRank).toBeGreaterThan(textRank);
    });
  });

  describe('normalizeXPath', () => {
    it('should remove dynamic index from xpath', () => {
      const xpath = '/html/body/div[3]/button[1]';
      const normalized = normalizeXPath(xpath);
      expect(normalized).not.toContain('[3]');
      expect(normalized).not.toContain('[1]');
    });

    it('should preserve static xpath structure', () => {
      const xpath = '/html/body/div/button';
      const normalized = normalizeXPath(xpath);
      expect(normalized).toBe('/html/body/div/button');
    });

    it('should handle complex xpath with multiple indices', () => {
      const xpath = '/html/body/div[5]/div[2]/ul[1]/li[3]';
      const normalized = normalizeXPath(xpath);
      expect(normalized).toBe('/html/body/div/div/ul/li');
    });
  });

  describe('generateStableSelector', () => {
    it('should generate a stable selector prioritizing resilience', () => {
      const element = {
        tagName: 'BUTTON',
        ariaLabel: 'Save Changes',
        id: 'save-btn',
        className: 'btn btn-primary',
        textContent: 'Save',
        getAttribute: (attr: string) => {
          if (attr === 'aria-label') return 'Save Changes';
          if (attr === 'id') return 'save-btn';
          return null;
        },
      } as any;

      const selector = generateStableSelector(element);
      expect(selector).toHaveProperty('ariaLabel');
      expect(selector).toHaveProperty('tagName');
    });

    it('should include multiple strategies in generated selector', () => {
      const element = {
        tagName: 'INPUT',
        type: 'email',
        placeholder: 'Email address',
        name: 'user_email',
        id: 'email-input',
        getAttribute: (attr: string) => {
          if (attr === 'placeholder') return 'Email address';
          if (attr === 'name') return 'user_email';
          if (attr === 'id') return 'email-input';
          return null;
        },
      } as any;

      const selector = generateStableSelector(element);
      expect(selector.tagName).toBe('input');
      expect(selector.placeholder).toBe('Email address');
    });
  });

  describe('createSelectorStrategy', () => {
    it('should return a prioritized list of strategies', () => {
      const strategies = createSelectorStrategy();
      expect(Array.isArray(strategies)).toBe(true);
      expect(strategies.length).toBeGreaterThan(0);
    });

    it('should have aria-label as first priority', () => {
      const strategies = createSelectorStrategy();
      expect(strategies[0]).toBe('aria-label');
    });
  });
});
