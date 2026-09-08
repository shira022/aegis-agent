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
    name: 'ネットワーク呼び出しチェック',
    pattern: /(?:fetch|axios|http\.get|https\.get|XMLHttpRequest|navigator\.sendBeacon)\s*\(\s*['"`](?!https?:\/\/(api\.github\.com|localhost|127\.0\.0\.1))/i,
    riskPenalty: 2,
  },
  {
    id: 'no-fs-write',
    name: 'ファイルシステム書き込みチェック',
    pattern: /(?:writeFileSync|writeFile|appendFileSync|appendFile|mkdirSync|createWriteStream|fs\.write|writeJSON)\s*\(\s*['"`](?!\/tmp|\.\/|~\/)/i,
    riskPenalty: 3,
  },
  {
    id: 'no-subprocess',
    name: 'サブプロセス実行チェック',
    pattern: /(?:child_process\.(?:exec|spawn|execSync|spawnSync)|execSync|spawnSync)\s*\(/i,
    riskPenalty: 4,
  },
  {
    id: 'no-eval',
    name: 'eval/exec使用チェック',
    pattern: /(?:\beval\s*\(|new\s+Function\s*\(|\bexec\s*\()/i,
    riskPenalty: 5,
  },
  {
    id: 'no-credentials',
    name: 'クレデンシャルアクセスチェック',
    pattern: /(?:process\.env\.(?:SECRET|KEY|PASSWORD|TOKEN|CREDENTIAL|API_KEY|AUTH)|\.env\.)/i,
    riskPenalty: 4,
  },
  {
    id: 'deterministic',
    name: '決定論的フローチェック',
    pattern: /Math\.random\s*\(\)/i,
    riskPenalty: 1,
  },
  {
    id: 'rate-limiting',
    name: 'APIレート制限チェック',
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
    let message = passed ? '問題なし' : `${rule.name}で問題が検出されました`;

    // Special case: include detected URL in message for network check
    if (rule.id === 'no-network' && !passed) {
      const urlMatch = code.match(/(?:fetch|axios|http\.get|https\.get)\s*\(\s*['"`]([^'"`]+)/i);
      if (urlMatch) {
        message += ` (検出URL: ${urlMatch[1]})`;
      }
    }

    // Special case: Playwright is allowed for subprocess check
    if (rule.id === 'no-subprocess' && !passed && PLAYWRIGHT_PATTERNS.test(code)) {
      passed = true;
      message = 'Playwrightプロセスは許可されています';
    }

    // Special case: allowed network domains
    if (rule.id === 'no-network' && !passed) {
      const fetchMatch = code.match(/(?:fetch|axios|http\.get|https\.get)\s*\(\s*['"`]([^'"`]+)/i);
      if (fetchMatch) {
        const url = fetchMatch[1];
        if (/^https?:\/\/(api\.github\.com|localhost|127\.0\.0\.1)/.test(url)) {
          passed = true;
          message = '許可されたドメインへのリクエストです';
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
    low: '低リスク',
    medium: '中リスク',
    high: '高リスク',
    critical: '致命的リスク',
  };

  const lines: string[] = [
    `=== 安全性レポート ===`,
    `総合リスクレベル: ${riskLabels[riskLevel]}`,
    '',
  ];

  for (const check of checks) {
    const icon = check.passed ? '✅' : '❌';
    lines.push(`${icon} ${check.name}: ${check.message}`);
  }

  const failed = checks.filter((c) => !c.passed);
  if (failed.length > 0) {
    lines.push('');
    lines.push(`⚠️ ${failed.length}件の問題が検出されました。承認前に修正が必要です。`);
  } else {
    lines.push('');
    lines.push('✅ すべての安全チェックに合格しました。');
  }

  return lines.join('\n');
}
