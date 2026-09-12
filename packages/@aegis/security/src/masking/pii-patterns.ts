/**
 * PII Pattern definitions for the Aegis Agent masking system.
 */

export type PIICategory =
  | 'email'
  | 'phone'
  | 'credit_card'
  | 'ssn'
  | 'password'
  | 'name'
  | 'address'
  | 'date_of_birth'
  | 'my_number'
  | 'ip_address'
  | 'bank_account';

export interface PIIPattern {
  category: PIICategory;
  pattern: RegExp;
  maskChar: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface PIIDetection {
  category: PIICategory;
  startIndex: number;
  endIndex: number;
  originalValue: string;
  maskedValue: string;
  confidence: number;
}

/**
 * PII detection patterns.
 * Order matters: more specific patterns first to avoid false positives
 * from less-specific patterns (e.g. phone matching credit card digits).
 */
export const PII_DETECTIONS: PIIPattern[] = [
  // --- High specificity (format-unique) ---
  {
    category: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    maskChar: '*',
    description: 'Email address',
    severity: 'high',
  },
  {
    category: 'credit_card',
    pattern: /\b(?:4[0-9]{3}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}|5[1-5][0-9]{2}[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}|3[47][0-9]{2}[- ]?[0-9]{6}[- ]?[0-9]{5})\b/g,
    maskChar: '*',
    description: 'Credit card number (Visa/Master/Amex)',
    severity: 'high',
  },
  {
    category: 'ssn',
    pattern: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g,
    maskChar: '*',
    description: 'US Social Security Number',
    severity: 'high',
  },
  {
    category: 'my_number',
    pattern: /\b[0-9]{12}\b/g,
    maskChar: '*',
    description: 'JP MyNumber (12 digits)',
    severity: 'high',
  },
  {
    category: 'password',
    pattern: /(?:password|passwd|pwd|secret|passphrase)\s*[:=]\s*\S+/gi,
    maskChar: '*',
    description: 'Password field indicators',
    severity: 'high',
  },
  {
    category: 'ip_address',
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b|(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}|:(?::[0-9a-fA-F]{1,4}){1,7}|::)\b/g,
    maskChar: '*',
    description: 'IPv4/IPv6 address',
    severity: 'medium',
  },
  {
    category: 'name',
    pattern: /(?:氏名|名前)\s*[:：]\s*[\u3000-\u9FFF\uF900-\uFAFF]{2,}/g,
    maskChar: '*',
    description: 'Name patterns (Japanese name detection)',
    severity: 'medium',
  },
  {
    category: 'address',
    pattern: /〒\s*[0-9]{3}-?[0-9]{4}/g,
    maskChar: '*',
    description: 'Japanese postal code (requires 〒 prefix)',
    severity: 'medium',
  },
  // --- Lower specificity (generic digit patterns) ---
  {
    category: 'phone',
    pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{2,4}[-.\s]?\d{3,4}/g,
    maskChar: '*',
    description: 'Phone number (JP and international)',
    severity: 'high',
  },
  {
    category: 'bank_account',
    pattern: /\b[0-9]{7,8}\b/g,
    maskChar: '*',
    description: 'JP bank account number (7-8 digits)',
    severity: 'high',
  },
];
