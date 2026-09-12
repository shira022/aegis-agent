/**
 * Text masking functions for PII detection and redaction.
 */

import { PII_DETECTIONS, type PIICategory, type PIIDetection, type PIIPattern } from './pii-patterns';

export interface MaskedText {
  original: string;
  masked: string;
  detections: PIIDetection[];
  wasModified: boolean;
}

export interface ElementSelector {
  text?: string;
  label?: string;
  placeholder?: string;
  [key: string]: string | undefined;
}

/**
 * Mask PII in text, optionally filtering by category and using custom patterns.
 */
export function maskText(
  text: string,
  categories?: PIICategory[],
  patterns?: PIIPattern[],
): MaskedText {
  if (!text) {
    return { original: text, masked: text, detections: [], wasModified: false };
  }

  const detections: PIIDetection[] = [];

  // Use provided patterns or fall back to PII_DETECTIONS
  const allPatterns = patterns || PII_DETECTIONS;

  // Filter patterns by requested categories
  const effectivePatterns = categories
    ? allPatterns.filter(p => categories.includes(p.category))
    : allPatterns;

  // Collect all matches across all patterns
  const allMatches: Array<{ pattern: PIIPattern; match: RegExpExecArray }> = [];

  for (const pattern of effectivePatterns) {
    pattern.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.pattern.exec(text)) !== null) {
      allMatches.push({ pattern, match });
    }
  }

  // Sort by start index descending so we can replace from end to start
  allMatches.sort((a, b) => b.match.index - a.match.index);

  // Remove overlapping matches (keep the one that starts later / is shorter)
  const filtered: Array<{ pattern: PIIPattern; match: RegExpExecArray }> = [];
  let lastEnd = Infinity;
  for (const item of allMatches) {
    const start = item.match.index;
    if (start >= lastEnd) continue; // overlaps with a later match
    filtered.push(item);
    lastEnd = start;
  }

  // Apply replacements from end to start
  let masked = text;
  for (const { pattern, match } of filtered) {
    const start = match.index;
    const end = start + match[0].length;
    const maskedValue = pattern.maskChar.repeat(match[0].length);
    masked = masked.slice(0, start) + maskedValue + masked.slice(end);

    detections.push({
      category: pattern.category,
      startIndex: start,
      endIndex: end,
      originalValue: match[0],
      maskedValue,
      confidence: pattern.severity === 'high' ? 0.95 : pattern.severity === 'medium' ? 0.8 : 0.6,
    });
  }

  // Sort detections by startIndex ascending for consistent output
  detections.sort((a, b) => a.startIndex - b.startIndex);

  return {
    original: text,
    masked,
    detections,
    wasModified: detections.length > 0,
  };
}

/**
 * Mask text/label/placeholder values in an ElementSelector.
 */
export function maskSelector(selector: ElementSelector): ElementSelector {
  const result = { ...selector };

  if (result.text) {
    const masked = maskText(result.text);
    result.text = masked.masked;
  }
  if (result.label) {
    const masked = maskText(result.label);
    result.label = masked.masked;
  }
  if (result.placeholder) {
    const masked = maskText(result.placeholder);
    result.placeholder = masked.masked;
  }

  return result;
}

/**
 * Placeholder for screenshot masking (requires OCR).
 * Returns input as-is for now.
 */
export async function maskScreenshot(base64: string): Promise<string> {
  return base64;
}
