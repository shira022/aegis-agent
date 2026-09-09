import { describe, it, expect } from 'vitest';
import {
  analyzeCode,
  calculateRiskLevel,
  generateHumanReadableReport,
} from '../safety-analyzer.js';

describe('SafetyAnalyzer', () => {
  describe('analyzeCode', () => {
    it('should return all safety checks for clean code', () => {
      const code = `
        const result = a + b;
        return result;
      `;
      const checks = analyzeCode(code);
      expect(checks.length).toBeGreaterThanOrEqual(7);
      checks.forEach((check) => {
        expect(check.id).toBeTruthy();
        expect(check.name).toBeTruthy();
        expect(typeof check.passed).toBe('boolean');
        expect(typeof check.message).toBe('string');
      });
    });

    it('should detect network calls outside allowed domains', () => {
      const code = `fetch('https://evil.com/data')`;
      const checks = analyzeCode(code);
      const networkCheck = checks.find((c) => c.id === 'no-network');
      expect(networkCheck).toBeDefined();
      expect(networkCheck!.passed).toBe(false);
      expect(networkCheck!.message).toContain('evil.com');
    });

    it('should allow fetch to allowed domains', () => {
      const code = `fetch('https://api.github.com/repos')`;
      const checks = analyzeCode(code);
      const networkCheck = checks.find((c) => c.id === 'no-network');
      expect(networkCheck).toBeDefined();
      expect(networkCheck!.passed).toBe(true);
    });

    it('should detect file system writes outside allowed paths', () => {
      const code = `fs.writeFileSync('/etc/passwd', data)`;
      const checks = analyzeCode(code);
      const fsCheck = checks.find((c) => c.id === 'no-fs-write');
      expect(fsCheck).toBeDefined();
      expect(fsCheck!.passed).toBe(false);
    });

    it('should detect subprocess execution', () => {
      const code = `child_process.exec('rm -rf /')`;
      const checks = analyzeCode(code);
      const subprocessCheck = checks.find((c) => c.id === 'no-subprocess');
      expect(subprocessCheck).toBeDefined();
      expect(subprocessCheck!.passed).toBe(false);
    });

    it('should allow Playwright subprocess', () => {
      const code = `const browser = await chromium.launch();`;
      const checks = analyzeCode(code);
      const subprocessCheck = checks.find((c) => c.id === 'no-subprocess');
      expect(subprocessCheck).toBeDefined();
      expect(subprocessCheck!.passed).toBe(true);
    });

    it('should detect eval usage', () => {
      const code = `eval('alert(1)')`;
      const checks = analyzeCode(code);
      const evalCheck = checks.find((c) => c.id === 'no-eval');
      expect(evalCheck).toBeDefined();
      expect(evalCheck!.passed).toBe(false);
    });

    it('should detect Function constructor', () => {
      const code = `new Function('return process.env')()`;
      const checks = analyzeCode(code);
      const evalCheck = checks.find((c) => c.id === 'no-eval');
      expect(evalCheck).toBeDefined();
      expect(evalCheck!.passed).toBe(false);
    });

    it('should detect credential access', () => {
      const code = `const password = process.env.SECRET_KEY`;
      const checks = analyzeCode(code);
      const credCheck = checks.find((c) => c.id === 'no-credentials');
      expect(credCheck).toBeDefined();
      expect(credCheck!.passed).toBe(false);
    });

    it('should detect non-deterministic random', () => {
      const code = `Math.random()`;
      const checks = analyzeCode(code);
      const determCheck = checks.find((c) => c.id === 'deterministic');
      expect(determCheck).toBeDefined();
      expect(determCheck!.passed).toBe(false);
    });

    it('should allow seeded random', () => {
      const code = `prng.next()`;
      const checks = analyzeCode(code);
      const determCheck = checks.find((c) => c.id === 'deterministic');
      expect(determCheck).toBeDefined();
      expect(determCheck!.passed).toBe(true);
    });

    it('should detect API calls without rate limiting', () => {
      const code = `for (let i = 0; i < 1000; i++) { await fetch(url); }`;
      const checks = analyzeCode(code);
      const rateCheck = checks.find((c) => c.id === 'rate-limiting');
      expect(rateCheck).toBeDefined();
      expect(rateCheck!.passed).toBe(false);
    });
  });

  describe('calculateRiskLevel', () => {
    it('should return low when all checks pass', () => {
      const checks = [
        { id: 'a', name: 'A', passed: true, message: 'ok' },
        { id: 'b', name: 'B', passed: true, message: 'ok' },
      ];
      expect(calculateRiskLevel(checks)).toBe('low');
    });

    it('should return low for a single low-risk failure', () => {
      const checks = [
        { id: 'a', name: 'A', passed: false, message: 'warn' },
        { id: 'b', name: 'B', passed: true, message: 'ok' },
      ];
      expect(calculateRiskLevel(checks)).toBe('low');
    });

    it('should return medium for a medium-risk failure', () => {
      const checks = [
        { id: 'rate-limiting', name: 'Rate', passed: false, message: 'no rate limit' },
      ];
      expect(calculateRiskLevel(checks)).toBe('medium');
    });

    it('should return high for high-risk failures', () => {
      const checks = [
        { id: 'no-subprocess', name: 'Sub', passed: false, message: 'subprocess' },
      ];
      expect(calculateRiskLevel(checks)).toBe('high');
    });

    it('should return critical for eval/exec detection', () => {
      const checks = [
        { id: 'no-eval', name: 'Eval', passed: false, message: 'eval found' },
      ];
      expect(calculateRiskLevel(checks)).toBe('critical');
    });

    it('should return critical when multiple high-risk failures exist', () => {
      const checks = [
        { id: 'no-eval', name: 'Eval', passed: false, message: 'eval' },
        { id: 'no-subprocess', name: 'Sub', passed: false, message: 'exec' },
        { id: 'no-credentials', name: 'Cred', passed: false, message: 'secret' },
      ];
      expect(calculateRiskLevel(checks)).toBe('critical');
    });
  });

  describe('generateHumanReadableReport', () => {
    it('should generate report with passed checks', () => {
      const checks = [
        { id: 'a', name: 'Test', passed: true, message: 'No issues' },
      ];
      const report = generateHumanReadableReport(checks);
      expect(report).toContain('Test');
      expect(report).toContain('No issues');
    });

    it('should include failed check details', () => {
      const checks = [
        { id: 'a', name: 'Test', passed: false, message: 'Dangerous code detected' },
      ];
      const report = generateHumanReadableReport(checks);
      expect(report).toContain('Dangerous code detected');
    });

    it('should include overall risk summary', () => {
      const checks = [
        { id: 'a', name: 'Test', passed: true, message: 'ok' },
      ];
      const report = generateHumanReadableReport(checks);
      expect(report).toBeTruthy();
      expect(typeof report).toBe('string');
    });
  });
});
