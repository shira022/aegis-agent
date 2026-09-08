import type { ElementSelector, RecordedAction } from '@aegis/recorder';

// ─── Code Patcher ───────────────────────────────────────────────
// Performs AST-like string manipulation to patch RPA Python code.
// Uses regex-based operations for Python code transformations.

export class CodePatcher {
  /**
   * Replace an old selector with a new selector in code.
   * Searches for all representations of the old selector and replaces them.
   */
  patchSelector(
    code: string,
    oldSelector: ElementSelector,
    newSelector: ElementSelector,
  ): string {
    let patched = code;

    // Patch CSS selector
    if (oldSelector.cssSelector && newSelector.cssSelector) {
      const escaped = this.escapeRegex(oldSelector.cssSelector);
      patched = patched.replace(new RegExp(escaped, 'g'), newSelector.cssSelector);
    }

    // Patch XPath selector
    if (oldSelector.xpath && newSelector.xpath) {
      const escaped = this.escapeRegex(oldSelector.xpath);
      patched = patched.replace(new RegExp(escaped, 'g'), newSelector.xpath);
    }

    // Patch text selector (in find_element calls)
    if (oldSelector.text && newSelector.text) {
      // Match text="old" or text='old' patterns
      const escaped = this.escapeRegex(oldSelector.text);
      patched = patched.replace(
        new RegExp(`text\\s*=\\s*["']${escaped}["']`, 'g'),
        `text="${newSelector.text}"`,
      );
    }

    // Patch role selector
    if (oldSelector.role && newSelector.role) {
      const escaped = this.escapeRegex(oldSelector.role);
      patched = patched.replace(
        new RegExp(`role\\s*=\\s*["']${escaped}["']`, 'g'),
        `role="${newSelector.role}"`,
      );
    }

    // Patch aria-label selector
    if (oldSelector.ariaLabel && newSelector.ariaLabel) {
      const escaped = this.escapeRegex(oldSelector.ariaLabel);
      patched = patched.replace(
        new RegExp(`aria-label\\s*=\\s*["']${escaped}["']`, 'g'),
        `aria-label="${newSelector.ariaLabel}"`,
      );
    }

    return patched;
  }

  /**
   * Wrap a specific action line with retry logic.
   */
  addRetryLogic(
    code: string,
    actionIndex: number,
    maxRetries: number,
  ): string {
    const lines = code.split('\n');
    if (actionIndex < 0 || actionIndex >= lines.length) {
      return code;
    }

    const targetLine = lines[actionIndex];
    const indent = targetLine.match(/^(\s*)/)?.[1] || '';

    // Wrap with retry for loop
    const retryBlock = [
      `${indent}for _retry in range(${maxRetries}):`,
      `${indent}    try:`,
      `        ${targetLine.trim()}`,
      `${indent}        break`,
      `${indent}    except Exception:`,
      `${indent}        if _retry == ${maxRetries - 1}:`,
      `${indent}            raise`,
    ];

    lines.splice(actionIndex, 1, ...retryBlock);
    return lines.join('\n');
  }

  /**
   * Add a wait condition before a specific action line.
   */
  addWaitCondition(
    code: string,
    actionIndex: number,
    condition: string,
  ): string {
    const lines = code.split('\n');
    if (actionIndex < 0 || actionIndex >= lines.length) {
      return code;
    }

    const targetLine = lines[actionIndex];
    const indent = targetLine.match(/^(\s*)/)?.[1] || '';

    // Add wait condition as a comment + wait call
    const waitBlock = [
      `${indent}# Wait: ${condition}`,
      `${indent}import time`,
      `${indent}time.sleep(1)  # ${condition}`,
    ];

    lines.splice(actionIndex, 0, ...waitBlock);
    return lines.join('\n');
  }

  /**
   * Wrap a specific action line with try/catch.
   */
  wrapWithTryCatch(
    code: string,
    actionIndex: number,
    errorHandler: string,
  ): string {
    const lines = code.split('\n');
    if (actionIndex < 0 || actionIndex >= lines.length) {
      return code;
    }

    const targetLine = lines[actionIndex];
    const indent = targetLine.match(/^(\s*)/)?.[1] || '';

    const tryCatchBlock = [
      `${indent}try:`,
      `    ${targetLine}`,
      `${indent}except Exception as _healing_err:`,
      `    ${indent}${errorHandler}`,
    ];

    lines.splice(actionIndex, 1, ...tryCatchBlock);
    return lines.join('\n');
  }

  /**
   * Generate an alternative path for a failed action.
   * Creates a try/except block that tries the alternative selector first,
   * then falls back to the original.
   */
  generateAlternativePath(
    code: string,
    failedAction: RecordedAction,
    alternative: RecordedAction,
  ): string {
    const originalSelector = this.selectorToString(failedAction.selector);
    const alternativeSelector = this.selectorToString(alternative.selector);

    // Build the alternative path code
    const altLines = [
      `# Fallback: original selector "${originalSelector}" failed`,
      `try:`,
      `    # Try alternative selector`,
      `    element = driver.find_element("${alternativeSelector}")`,
      `    element.click()`,
      `except Exception:`,
      `    # Fall back to original selector`,
      `    element = driver.find_element("${originalSelector}")`,
      `    element.click()`,
    ];

    // Replace the original code with the alternative path
    return altLines.join('\n');
  }

  /**
   * Validate that a patch is valid.
   * Checks that the patched code is non-empty, different from original,
   * and doesn't contain obvious syntax errors.
   */
  validatePatch(
    original: string,
    patched: string,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check patched code is not empty
    if (!patched || patched.trim().length === 0) {
      errors.push('Patched code is empty');
      return { valid: false, errors };
    }

    // Check patch actually changed something
    if (original === patched) {
      errors.push('Patched code is identical to original — no changes made');
      return { valid: false, errors };
    }

    // Basic syntax validation: check for unbalanced parentheses
    let parenCount = 0;
    let bracketCount = 0;
    let braceCount = 0;
    let inString = false;
    let stringChar = '';

    for (const ch of patched) {
      if (inString) {
        if (ch === stringChar) inString = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = true;
        stringChar = ch;
        continue;
      }
      if (ch === '(') parenCount++;
      if (ch === ')') parenCount--;
      if (ch === '[') bracketCount++;
      if (ch === ']') bracketCount--;
      if (ch === '{') braceCount++;
      if (ch === '}') braceCount--;
    }

    if (parenCount !== 0) {
      errors.push(`Unbalanced parentheses: ${parenCount > 0 ? 'missing closing' : 'extra closing'}`);
    }
    if (bracketCount !== 0) {
      errors.push(`Unbalanced brackets: ${bracketCount > 0 ? 'missing closing' : 'extra closing'}`);
    }
    if (braceCount !== 0) {
      errors.push(`Unbalanced braces: ${braceCount > 0 ? 'missing closing' : 'extra closing'}`);
    }

    return { valid: errors.length === 0, errors };
  }

  // ─── Private Helpers ────────────────────────────────────────

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private selectorToString(selector: ElementSelector): string {
    if (selector.cssSelector) return selector.cssSelector;
    if (selector.xpath) return selector.xpath;
    if (selector.text) return `text="${selector.text}"`;
    if (selector.role) return `role="${selector.role}"`;
    return 'unknown';
  }
}
