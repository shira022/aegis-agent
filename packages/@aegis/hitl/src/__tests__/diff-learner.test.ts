import { describe, it, expect, beforeEach } from 'vitest';
import { DiffLearner } from '../diff-learner';
import type { CodeDiff, LearningPattern } from '../types';

describe('DiffLearner', () => {
  let learner: DiffLearner;

  beforeEach(() => {
    learner = new DiffLearner();
  });

  describe('computeDiff', () => {
    it('should detect line-by-line changes', () => {
      const original = 'line 1\nline 2\nline 3';
      const corrected = 'line 1\nline 2 modified\nline 3';

      const diffs = learner.computeDiff(original, corrected);

      expect(diffs.length).toBe(1);
      expect(diffs[0].line).toBe(2);
      expect(diffs[0].oldContent).toBe('line 2');
      expect(diffs[0].newContent).toBe('line 2 modified');
    });

    it('should detect multiple changes', () => {
      const original = 'alpha\nbeta\ngamma';
      const corrected = 'ALPHA\nbeta\ndelta';

      const diffs = learner.computeDiff(original, corrected);

      expect(diffs.length).toBe(2);
      expect(diffs[0].line).toBe(1);
      expect(diffs[1].line).toBe(3);
    });

    it('should handle identical content with no diffs', () => {
      const code = 'same\ncontent\nhere';
      const diffs = learner.computeDiff(code, code);

      expect(diffs.length).toBe(0);
    });

    it('should handle added lines', () => {
      const original = 'line 1\nline 3';
      const corrected = 'line 1\nline 2\nline 3';

      const diffs = learner.computeDiff(original, corrected);

      expect(diffs.length).toBeGreaterThanOrEqual(1);
      const addedLine = diffs.find(d => d.newContent.includes('line 2'));
      expect(addedLine).toBeDefined();
    });

    it('should handle removed lines', () => {
      const original = 'line 1\nline 2\nline 3';
      const corrected = 'line 1\nline 3';

      const diffs = learner.computeDiff(original, corrected);

      expect(diffs.length).toBeGreaterThanOrEqual(1);
      const removedLine = diffs.find(d => d.oldContent.includes('line 2'));
      expect(removedLine).toBeDefined();
    });

    it('should assign meaningful reasons to diffs', () => {
      const original = 'old code';
      const corrected = 'new code';

      const diffs = learner.computeDiff(original, corrected);

      expect(diffs.length).toBe(1);
      expect(diffs[0].reason).toBeDefined();
      expect(diffs[0].reason.length).toBeGreaterThan(0);
    });
  });

  describe('applyDiff', () => {
    it('should apply a single diff to code', () => {
      const code = 'line 1\nline 2\nline 3';
      const diffs: CodeDiff[] = [
        { line: 2, oldContent: 'line 2', newContent: 'line 2 fixed', reason: 'fix' },
      ];

      const result = learner.applyDiff(code, diffs);

      expect(result).toBe('line 1\nline 2 fixed\nline 3');
    });

    it('should apply multiple diffs', () => {
      const code = 'alpha\nbeta\ngamma';
      const diffs: CodeDiff[] = [
        { line: 1, oldContent: 'alpha', newContent: 'ALPHA', reason: 'fix' },
        { line: 3, oldContent: 'gamma', newContent: 'GAMMA', reason: 'fix' },
      ];

      const result = learner.applyDiff(code, diffs);

      expect(result).toBe('ALPHA\nbeta\nGAMMA');
    });

    it('should handle empty diffs list', () => {
      const code = 'unchanged';
      const result = learner.applyDiff(code, []);

      expect(result).toBe('unchanged');
    });

    it('should return original code when diffs are empty', () => {
      const code = 'function foo() {\n  return 42;\n}';
      const result = learner.applyDiff(code, []);

      expect(result).toBe(code);
    });
  });

  describe('generatePattern', () => {
    it('should generate a learning pattern from diffs', () => {
      const diffs: CodeDiff[] = [
        { line: 2, oldContent: 'waitFor(500)', newContent: 'await waitForSelector(".btn")', reason: 'use explicit wait' },
      ];

      const pattern = learner.generatePattern(diffs);

      expect(pattern).toBeDefined();
      expect(pattern.id).toBeDefined();
      expect(pattern.fixPattern).toBeDefined();
      expect(pattern.codeTemplate).toBeDefined();
      expect(pattern.confidence).toBeGreaterThanOrEqual(0);
      expect(pattern.confidence).toBeLessThanOrEqual(1);
      expect(pattern.usageCount).toBe(0);
    });

    it('should extract error type hint from diff reasons', () => {
      const diffs: CodeDiff[] = [
        { line: 1, oldContent: 'old', newContent: 'new', reason: 'timeout: increase wait' },
      ];

      const pattern = learner.generatePattern(diffs);

      expect(pattern.errorType).toBeDefined();
      expect(pattern.errorType.length).toBeGreaterThan(0);
    });
  });

  describe('storePattern', () => {
    it('should store and retrieve a pattern', () => {
      const pattern: LearningPattern = {
        id: 'pat-001',
        errorType: 'timeout',
        fixPattern: 'increase wait time',
        codeTemplate: 'await waitForSelector(selector, { timeout: 10000 })',
        confidence: 0.5,
        usageCount: 0,
      };

      learner.storePattern(pattern);

      const stored = learner.getStoredPatterns();
      expect(stored.length).toBe(1);
      expect(stored[0].id).toBe('pat-001');
    });

    it('should increment usage count on duplicate pattern', () => {
      const pattern: LearningPattern = {
        id: 'pat-002',
        errorType: 'not_found',
        fixPattern: 'try alternative selector',
        codeTemplate: '',
        confidence: 0.3,
        usageCount: 0,
      };

      learner.storePattern(pattern);
      learner.storePattern({ ...pattern, usageCount: 1 });

      const stored = learner.getStoredPatterns();
      expect(stored.length).toBe(1);
      expect(stored[0].usageCount).toBe(1);
    });

    it('should store multiple distinct patterns', () => {
      const p1: LearningPattern = {
        id: 'pat-003',
        errorType: 'timeout',
        fixPattern: 'wait longer',
        codeTemplate: '',
        confidence: 0.5,
        usageCount: 0,
      };
      const p2: LearningPattern = {
        id: 'pat-004',
        errorType: 'not_found',
        fixPattern: 'find alternative',
        codeTemplate: '',
        confidence: 0.5,
        usageCount: 0,
      };

      learner.storePattern(p1);
      learner.storePattern(p2);

      const stored = learner.getStoredPatterns();
      expect(stored.length).toBe(2);
    });
  });
});
