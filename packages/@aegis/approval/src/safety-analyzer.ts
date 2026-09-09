import type { SafetyCheck, RiskLevel } from './types.js';

// ─── Built-in Safety Checks ────────────────────────────────────────

interface CheckRule {
  id: string;
  name: string;
  pattern: RegExp;
  riskPenalty: number; // higher = worse
}

const CHECKS: CheckRule[] = [
  {
    id: 'no-network',
    name: 'Network call check',
    pattern: /(?:fetch|axios|http\.get|https\.get|XMLHttpRequest|navigator\.sendBeacon)\s*\(\s*['"`](?!https?:\/\/(api\.github\.com|localhost|127\.0\.0\.1))/i,
    riskPenalty: 2,
  },
  {
    id: 'no-fs-write',
    name: 'File system write check',
    pattern: /(?:writeFileSync|writeFile|appendFileSync|appendFile|mkdirSync|createWriteStream|fs\.write|writeJSON)\s*\(\s*['"`](?!\/tmp|\.\/|~\/)/i,
    riskPenalty: 3,
  },
  {
    id: 'no-subprocess',
    name: 'Subprocess execution check',
    pattern: /(?:child_process\.(?:exec|spawn|execSync|spawnSync)|execSync|spawnSync)\s*\(/i,
    riskPenalty: 4,
  },
  {
    id: 'no-eval',
    name: 'eval/exec usage check',
    pattern: /(?:\beval\s*\(|new\s+Function\s*\(|\bexec\s*\()/i,
    riskPenalty: 5,
  },
  {
    id: 'no-credentials',
    name: 'Credential access check',
    pattern: /(?:process\.env\.(?:SECRET|KEY|PASSWORD|TOKEN|CREDENTIAL|API_KEY|AUTH)|\.env\.)/i,
    riskPenalty: 4,
  },
  {
    id: 'deterministic',
    name: 'Deterministic flow check',
    pattern: /Math\.random\s*\(\)/i,
    riskPenalty: 1,
  },
  {
    id: 'rate-limiting',
    name: 'API rate limit check',
    pattern: /(?:for|while)\s*\([^)]*\)\s*\{[^}]*(?:fetch|axios|http)/i,
    riskPenalty: 2,
  },
];

// ─── Playwright allowlist for subprocess ────────────────────────────

const PLAYWRIGHT_PATTERNS = /(?:playwright|chromium|firefox|webkit|\.launch|browser\.newPage)/i;

// ─── analyzeCode ───────────────────────────────────────────────────

export function analyzeCode(code: string): SafetyCheck[] {
  return CHECKS.map((rule) => {
    let passed = !rule.pattern.test(code);
    let message = passed ? 'No issues' : `${rule.name} issues detected`;

    // Special case: include detected URL in message for network check
    if (rule.id === 'no-network' && !passed) {
      const urlMatch = code.match(/(?:fetch|axios|http\.get|https\.get)\s*\(\s*['"`]([^'"`]+)/i);
      if (urlMatch) {
        message += ` (detected URL: ${urlMatch[1]})`;
      }
    }

    // Special case: Playwright is allowed for subprocess check
    if (rule.id === 'no-subprocess' && !passed && PLAYWRIGHT_PATTERNS.test(code)) {
      passed = true;
      message = 'Playwright process is allowed';
    }

    // Special case: allowed network domains
    if (rule.id === 'no-network' && !passed) {
      const fetchMatch = code.match(/(?:fetch|axios|http\.get|https\.get)\s*\(\s*['"`]([^'"`]+)/i);
      if (fetchMatch) {
        const url = fetchMatch[1];
        if (/^https?:\/\/(api\.github\.com|localhost|127\.0\.0\.1)/.test(url)) {
          passed = true;
          message = 'Request to allowed domain';
        }
      }
    }

    return {
      id: rule.id,
      name: rule.name,
      passed,
      message,
    };
  });
}

// ─── calculateRiskLevel ────────────────────────────────────────────

const RISK_THRESHOLDS: { min: number; level: RiskLevel }[] = [
  { min: 5, level: 'critical' },
  { min: 3, level: 'high' },
  { min: 2, level: 'medium' },
  { min: 0, level: 'low' },
];

export function calculateRiskLevel(checks: SafetyCheck[]): RiskLevel {
  const penalty = checks.reduce((sum, check) => {
    if (!check.passed) {
      const rule = CHECKS.find((r) => r.id === check.id);
      return sum + (rule?.riskPenalty ?? 1);
    }
    return sum;
  }, 0);

  for (const threshold of RISK_THRESHOLDS) {
    if (penalty >= threshold.min) return threshold.level;
  }
  return 'low';
}

// ─── generateHumanReadableReport ───────────────────────────────────

export function generateHumanReadableReport(checks: SafetyCheck[]): string {
  const riskLevel = calculateRiskLevel(checks);
  const riskLabels: Record<string, string> = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
  };

  const lines: string[] = [
    `=== Safety Report ===`,
    `Overall Risk Level: ${riskLabels[riskLevel]}`,
    '',
  ];

  for (const check of checks) {
    const icon = check.passed ? '✅' : '❌';
    lines.push(`${icon} ${check.name}: ${check.message}`);
  }

  const failed = checks.filter((c) => !c.passed);
  if (failed.length > 0) {
    lines.push('');
    lines.push(`⚠️ ${failed.length} issue(s) detected. Fix required before approval.`);
  } else {
    lines.push('');
    lines.push('✅ All safety checks passed.');
  }

  return lines.join('\n');
}
