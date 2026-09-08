import crypto from 'crypto';
import type { CodeDiff, LearningPattern } from './types';

// ─── DiffLearner ─────────────────────────────────────────────────────

export class DiffLearner {
  private storedPatterns: Map<string, LearningPattern> = new Map();

  computeDiff(original: string, corrected: string): CodeDiff[] {
    const originalLines = original.split('\n');
    const correctedLines = corrected.split('\n');
    const diffs: CodeDiff[] = [];

    const maxLen = Math.max(originalLines.length, correctedLines.length);

    for (let i = 0; i < maxLen; i++) {
      const oldLine = originalLines[i];
      const newLine = correctedLines[i];

      if (oldLine === newLine) continue;

      let reason = '';
      if (oldLine === undefined) {
        reason = 'line added';
      } else if (newLine === undefined) {
        reason = 'line removed';
      } else {
        reason = 'line modified';
      }

      diffs.push({
        line: i + 1,
        oldContent: oldLine ?? '',
        newContent: newLine ?? '',
        reason,
      });
    }

    return diffs;
  }

  applyDiff(code: string, diffs: CodeDiff[]): string {
    if (diffs.length === 0) return code;

    const lines = code.split('\n');

    // Sort diffs by line number descending to apply from bottom to top
    const sorted = [...diffs].sort((a, b) => b.line - a.line);

    for (const diff of sorted) {
      const lineIdx = diff.line - 1;
      if (lineIdx >= 0 && lineIdx < lines.length) {
        // Check if the old content matches what we expect
        if (lines[lineIdx] === diff.oldContent) {
          lines[lineIdx] = diff.newContent;
        } else {
          // Fallback: replace at the line position regardless
          lines[lineIdx] = diff.newContent;
        }
      } else {
        // Line outside original range — insert
        lines.splice(lineIdx, 0, diff.newContent);
      }
    }

    return lines.join('\n');
  }

  generatePattern(diffs: CodeDiff[]): LearningPattern {
    const errorType = this.extractErrorType(diffs);
    const fixPattern = diffs.map(d => d.reason).join('; ');
    const codeTemplate = diffs.map(d => `// Line ${d.line}: ${d.oldContent} → ${d.newContent}`).join('\n');

    return {
      id: crypto.randomUUID(),
      errorType,
      fixPattern,
      codeTemplate,
      confidence: 0.5,
      usageCount: 0,
    };
  }

  storePattern(pattern: LearningPattern): void {
    const existing = this.storedPatterns.get(pattern.id);
    if (existing) {
      existing.usageCount = pattern.usageCount;
      existing.confidence = pattern.confidence;
    } else {
      this.storedPatterns.set(pattern.id, pattern);
    }
  }

  getStoredPatterns(): LearningPattern[] {
    return Array.from(this.storedPatterns.values());
  }

  private extractErrorType(diffs: CodeDiff[]): string {
    // Try to extract error type hint from diff reasons
    for (const diff of diffs) {
      const lower = diff.reason.toLowerCase();
      if (lower.includes('timeout')) return 'timeout';
      if (lower.includes('not found') || lower.includes('missing')) return 'not_found';
      if (lower.includes('permission')) return 'permission_denied';
      if (lower.includes('network')) return 'network_error';
    }
    // Fallback: try to detect from the code changes
    for (const diff of diffs) {
      const combined = `${diff.oldContent} ${diff.newContent}`.toLowerCase();
      if (combined.includes('timeout') || combined.includes('wait')) return 'timeout';
      if (combined.includes('selector') || combined.includes('find')) return 'not_found';
    }
    return 'general';
  }
}
