import type { ElementSelector } from './types';

/**
 * Prioritized list of selector strategies (higher priority first)
 */
export function createSelectorStrategy(): string[] {
  return [
    'aria-label',
    'text',
    'placeholder',
    'role',
    'xpath',
    'css',
  ];
}

/**
 * Resolve an element to a multi-strategy selector
 */
export function resolveSelector(element: HTMLElement): ElementSelector {
  const selector: ElementSelector = {};

  // Get tag name
  selector.tagName = element.tagName?.toLowerCase();

  // Try aria-label first (highest priority)
  const ariaLabel = element.getAttribute?.('aria-label');
  if (ariaLabel) {
    selector.ariaLabel = ariaLabel;
  }

  // Try text content
  const textContent = element.textContent?.trim();
  if (textContent && textContent.length < 100) {
    selector.text = textContent;
  }

  // Try placeholder
  const placeholder = element.getAttribute?.('placeholder');
  if (placeholder) {
    selector.placeholder = placeholder;
  }

  // Try role
  const role = element.getAttribute?.('role');
  if (role) {
    selector.role = role;
  }

  // Try class name
  const className = element.className;
  if (className && typeof className === 'string') {
    selector.className = className;
  }

  // Try ID
  const id = element.id;
  if (id) {
    selector.cssSelector = `#${id}`;
  }

  // Generate xpath as fallback
  const xpath = generateXPath(element);
  if (xpath) {
    selector.xpath = xpath;
  }

  return selector;
}

/**
 * Rank a selector for reliability/stability (higher = more stable)
 */
export function rankSelector(selector: ElementSelector): number {
  let rank = 0;

  // aria-label is most stable
  if (selector.ariaLabel) {
    rank += 100;
  }

  // Text content is fairly stable
  if (selector.text) {
    rank += 80;
  }

  // Placeholder is stable
  if (selector.placeholder) {
    rank += 70;
  }

  // Role is stable
  if (selector.role) {
    rank += 60;
  }

  // ID is very stable but often dynamic
  if (selector.cssSelector?.startsWith('#')) {
    rank += 90;
  } else if (selector.cssSelector) {
    // Other CSS selectors are less stable
    rank += 20;
  }

  // XPath is least stable
  if (selector.xpath) {
    rank += 30;
  }

  // Tag name adds minimal stability
  if (selector.tagName) {
    rank += 10;
  }

  return rank;
}

/**
 * Normalize xpath by removing dynamic indices
 */
export function normalizeXPath(xpath: string): string {
  // Remove indices like [1], [2], etc.
  return xpath.replace(/\[\d+\]/g, '');
}

/**
 * Generate a stable selector prioritizing resilience
 */
export function generateStableSelector(element: HTMLElement): ElementSelector {
  const selector: ElementSelector = {};

  // Priority 1: aria-label
  const ariaLabel = element.getAttribute?.('aria-label');
  if (ariaLabel) {
    selector.ariaLabel = ariaLabel;
  }

  // Priority 2: text content (short texts only)
  const textContent = element.textContent?.trim();
  if (textContent && textContent.length < 50) {
    selector.text = textContent;
  }

  // Priority 3: placeholder
  const placeholder = element.getAttribute?.('placeholder');
  if (placeholder) {
    selector.placeholder = placeholder;
  }

  // Priority 4: role
  const role = element.getAttribute?.('role');
  if (role) {
    selector.role = role;
  }

  // Always include tag name for context
  selector.tagName = element.tagName?.toLowerCase();

  // Add CSS selector with ID if available
  const id = element.id;
  if (id) {
    selector.cssSelector = `#${id}`;
  }

  return selector;
}

/**
 * Generate xpath for an element
 */
function generateXPath(element: HTMLElement): string | null {
  if (!element) return null;

  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current) {
    // Stop if we've reached the document root or body
    if (current === (typeof document !== 'undefined' ? document.body : null)) {
      break;
    }

    let index = 1;
    let sibling = current.previousElementSibling;

    while (sibling) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousElementSibling;
    }

    const tagName = current.tagName.toLowerCase();
    parts.unshift(`${tagName}[${index}]`);
    current = current.parentElement;
  }

  return parts.length > 0 ? `/html/body/${parts.join('/')}` : null;
}
