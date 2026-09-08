import type { ElementSelector, BoundingBox } from '@aegis/recorder';
import type { SemanticMatch, HealingRequest } from './types';

// ─── Vision Analyzer ────────────────────────────────────────────
// Uses AI vision capabilities to analyze screenshots and find
// alternative selectors when RPA scripts break.

export class VisionAnalyzer {
  /**
   * Analyze a screenshot to find elements matching the expected selector.
   * Returns ranked semantic matches with confidence scores.
   */
  async analyzeScreenshot(
    screenshot: string,
    expectedElement: ElementSelector,
  ): Promise<SemanticMatch[]> {
    if (!screenshot || screenshot.trim().length === 0) {
      return [];
    }

    // Without a real AI engine, return basic structural matches
    // based on the selector properties provided
    const matches: SemanticMatch[] = [];

    if (expectedElement.cssSelector) {
      matches.push({
        selector: {
          cssSelector: expectedElement.cssSelector,
          text: expectedElement.text,
          role: expectedElement.role,
        },
        confidence: 0.8,
        visualSimilarity: 0.7,
        textMatch: Boolean(expectedElement.text),
        contextMatch: true,
      });
    }

    if (expectedElement.text) {
      matches.push({
        selector: {
          text: expectedElement.text,
          role: expectedElement.role || 'button',
        },
        confidence: 0.75,
        visualSimilarity: 0.65,
        textMatch: true,
        contextMatch: true,
      });
    }

    if (expectedElement.xpath) {
      matches.push({
        selector: {
          xpath: expectedElement.xpath,
        },
        confidence: 0.7,
        visualSimilarity: 0.6,
        textMatch: false,
        contextMatch: true,
      });
    }

    if (expectedElement.role) {
      matches.push({
        selector: {
          role: expectedElement.role,
          ariaLabel: expectedElement.ariaLabel,
          text: expectedElement.text,
        },
        confidence: 0.65,
        visualSimilarity: 0.55,
        textMatch: false,
        contextMatch: true,
      });
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
  }

  /**
   * Find an alternative selector for an element using screenshot analysis.
   */
  async findAlternativeSelector(
    screenshot: string,
    originalSelector: ElementSelector,
  ): Promise<ElementSelector> {
    if (!screenshot || screenshot.trim().length === 0) {
      return { ...originalSelector };
    }

    // Try to find alternative based on available selector info
    const alternatives: ElementSelector[] = [];

    // If we have CSS selector, try role-based alternative
    if (originalSelector.cssSelector) {
      alternatives.push({
        role: originalSelector.role || 'button',
        text: originalSelector.text,
        ariaLabel: originalSelector.ariaLabel,
      });
    }

    // If we have text, try text-based selector
    if (originalSelector.text) {
      alternatives.push({
        text: originalSelector.text,
        tagName: originalSelector.tagName,
      });
    }

    // If we have aria-label, try aria-label based
    if (originalSelector.ariaLabel) {
      alternatives.push({
        ariaLabel: originalSelector.ariaLabel,
        role: originalSelector.role,
      });
    }

    // Return the first alternative, or the original if no alternatives found
    return alternatives.length > 0 ? alternatives[0] : { ...originalSelector };
  }

  /**
   * Compare two screenshots to detect UI changes.
   */
  async compareScreenshots(
    before: string,
    after: string,
  ): Promise<{ changed: boolean; regions: BoundingBox[]; description: string }> {
    if (!before && !after) {
      return { changed: false, regions: [], description: 'No screenshots to compare' };
    }

    if (!before || !after) {
      return {
        changed: true,
        regions: [],
        description: before ? 'After screenshot missing' : 'Before screenshot missing',
      };
    }

    if (before === after) {
      return {
        changed: false,
        regions: [],
        description: 'Screenshots are identical',
      };
    }

    // Basic comparison: different strings indicate changes
    // In production, this would use image diff algorithms
    return {
      changed: true,
      regions: [
        { x: 0, y: 0, width: 100, height: 100 },
      ],
      description: 'UI changes detected between screenshots',
    };
  }

  /**
   * Generate a healing prompt for the AI engine to analyze and fix code.
   */
  generateHealingPrompt(request: HealingRequest): string {
    const parts: string[] = [
      'You are a self-healing RPA automation specialist.',
      'An error occurred during script execution. Analyze and provide a fix.',
      '',
      '## Error Details',
      `- Message: ${request.error.message}`,
      `- Action ID: ${request.error.actionId}`,
      `- Timestamp: ${new Date(request.error.timestamp).toISOString()}`,
      '',
      '## Current Code',
      request.currentCode,
      '',
      '## Failed Action',
      `- Type: ${request.failedAction.type}`,
      `- Selector: ${JSON.stringify(request.failedAction.selector)}`,
      `- URL: ${request.failedAction.metadata.url || 'N/A'}`,
      '',
      '## Context',
      `- Page URL: ${request.context.url}`,
      `- Page Title: ${request.context.pageTitle}`,
      `- Previous actions count: ${request.context.previousActions.length}`,
    ];

    if (request.screenshot) {
      parts.push('', '## Screenshot (base64)', request.screenshot);
    }

    parts.push(
      '',
      '## Requirements',
      '1. Identify the root cause of the error',
      '2. Provide a minimal code fix that preserves the original intent',
      '3. Suggest alternative selectors if the element is not found',
      '4. Add appropriate waits if timing is an issue',
      '5. Return the fix as patched code',
    );

    return parts.join('\n');
  }
}
