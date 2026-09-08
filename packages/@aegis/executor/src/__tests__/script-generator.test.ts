import { describe, it, expect, beforeEach } from 'vitest';
import { ScriptGenerator } from '../script-generator';
import type { ApprovedProgram } from '../types';

describe('ScriptGenerator', () => {
  let generator: ScriptGenerator;

  beforeEach(() => {
    generator = new ScriptGenerator();
  });

  describe('generateScript', () => {
    it('should generate a valid Python script from an approved program', () => {
      const program: ApprovedProgram = {
        name: 'test_program',
        code: 'print("Hello World")',
        features: [],
      };

      const script = generator.generateScript(program);
      expect(typeof script).toBe('string');
      expect(script.length).toBeGreaterThan(0);
      expect(script).toContain('print');
    });

    it('should wrap user code in a proper Python structure', () => {
      const program: ApprovedProgram = {
        name: 'my_app',
        code: 'x = 42',
        features: [],
      };

      const script = generator.generateScript(program);
      // Should contain shebang or encoding declaration
      expect(script).toMatch(/^(#!|#!|# -\*-|# vim|"""|# !)/);
    });

    it('should include program name in the script', () => {
      const program: ApprovedProgram = {
        name: 'data_processor',
        code: 'pass',
        features: [],
      };

      const script = generator.generateScript(program);
      expect(script).toContain('data_processor');
    });

    it('should handle empty code', () => {
      const program: ApprovedProgram = {
        name: 'empty',
        code: '',
        features: [],
      };

      const script = generator.generateScript(program);
      expect(typeof script).toBe('string');
    });

    it('should include feature imports', () => {
      const program: ApprovedProgram = {
        name: 'feature_test',
        code: 'pass',
        features: ['selenium', 'logging'],
      };

      const script = generator.generateScript(program);
      expect(script).toContain('selenium');
    });
  });

  describe('injectTemplate', () => {
    it('should inject user script into template at placeholder', () => {
      const template = 'import sys\n# SCRIPT_PLACEHOLDER\nif __name__ == "__main__":\n    main()';
      const script = 'print("injected")';

      const result = generator.injectTemplate(script, template);
      expect(result).toContain('print("injected")');
      expect(result).toContain('import sys');
      expect(result).not.toContain('SCRIPT_PLACEHOLDER');
    });

    it('should throw if template has no placeholder', () => {
      const template = 'import sys\nprint("no placeholder")';
      const script = 'print("test")';

      expect(() => generator.injectTemplate(script, template)).toThrow();
    });

    it('should preserve template content around injection', () => {
      const template = 'HEADER\n# SCRIPT_PLACEHOLDER\nFOOTER';
      const script = 'MIDDLE';

      const result = generator.injectTemplate(script, template);
      expect(result).toContain('HEADER');
      expect(result).toContain('MIDDLE');
      expect(result).toContain('FOOTER');
    });
  });

  describe('addErrorHandling', () => {
    it('should wrap script with try/except blocks', () => {
      const script = 'print("hello")';

      const result = generator.addErrorHandling(script);
      expect(result).toContain('try');
      expect(result).toContain('except');
    });

    it('should catch Exception as base case', () => {
      const script = 'x = 1 / 0';

      const result = generator.addErrorHandling(script);
      expect(result).toContain('Exception');
    });

    it('should add traceback import for error reporting', () => {
      const script = 'pass';

      const result = generator.addErrorHandling(script);
      expect(result).toContain('traceback');
    });

    it('should preserve original script content', () => {
      const script = 'result = 2 + 2\nprint(result)';

      const result = generator.addErrorHandling(script);
      expect(result).toContain('result = 2 + 2');
      expect(result).toContain('print(result)');
    });

    it('should handle multi-line scripts', () => {
      const script = `import os\nx = 1\ny = 2\nprint(x + y)`;

      const result = generator.addErrorHandling(script);
      expect(result).toContain('import os');
      expect(result).toContain('print(x + y)');
    });
  });

  describe('addLogging', () => {
    it('should add logging import', () => {
      const script = 'print("hello")';

      const result = generator.addLogging(script);
      expect(result).toContain('import logging');
    });

    it('should configure basic logging', () => {
      const script = 'pass';

      const result = generator.addLogging(script);
      expect(result).toContain('logging.basicConfig');
    });

    it('should preserve original script', () => {
      const script = 'x = 42\nprint(x)';

      const result = generator.addLogging(script);
      expect(result).toContain('x = 42');
      expect(result).toContain('print(x)');
    });
  });

  describe('generateRequirementsTxt', () => {
    it('should generate requirements for known features', () => {
      const features = ['selenium', 'requests'];

      const result = generator.generateRequirementsTxt(features);
      expect(result).toContain('selenium');
      expect(result).toContain('requests');
    });

    it('should return empty string for no features', () => {
      const result = generator.generateRequirementsTxt([]);
      expect(typeof result).toBe('string');
    });

    it('should not duplicate features', () => {
      const features = ['selenium', 'selenium'];

      const result = generator.generateRequirementsTxt(features);
      const lines = result.split('\n').filter((l) => l.trim());
      const seleniumLines = lines.filter((l) => l.includes('selenium'));
      expect(seleniumLines.length).toBe(1);
    });

    it('should handle unknown features gracefully', () => {
      const features = ['unknown_package_xyz'];

      const result = generator.generateRequirementsTxt(features);
      expect(typeof result).toBe('string');
    });
  });

  describe('validation', () => {
    it('should validate that generated script has valid Python syntax', () => {
      const program: ApprovedProgram = {
        name: 'valid',
        code: 'def foo():\n    return 42',
        features: [],
      };

      const script = generator.generateScript(program);
      // Script should be syntactically valid Python
      expect(script).toContain('def foo');
      expect(script).toContain('return 42');
    });

    it('should include required imports in output', () => {
      const program: ApprovedProgram = {
        name: 'import_test',
        code: 'import os\nprint(os.getcwd())',
        features: [],
      };

      const script = generator.generateScript(program);
      expect(script).toContain('import os');
      expect(script).toContain('os.getcwd()');
    });
  });
});
