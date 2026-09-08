import type { ApprovedProgram } from './types';

const TEMPLATE_PLACEHOLDER = '# SCRIPT_PLACEHOLDER';

const FEATURE_IMPORTS: Record<string, string> = {
  selenium: 'from selenium import webdriver',
  requests: 'import requests',
  logging: 'import logging',
  pandas: 'import pandas as pd',
  numpy: 'import numpy as np',
};

export class ScriptGenerator {
  generateScript(program: ApprovedProgram): string {
    const lines: string[] = [];

    // Add shebang and encoding
    lines.push('#!/usr/bin/env python3');
    lines.push('# -*- coding: utf-8 -*-');
    lines.push('');

    // Add program name as comment
    lines.push(`# Program: ${program.name}`);
    lines.push('');

    // Add feature imports
    for (const feature of program.features) {
      const importLine = FEATURE_IMPORTS[feature];
      if (importLine) {
        lines.push(importLine);
      }
    }

    if (program.features.length > 0) {
      lines.push('');
    }

    // Add the user code
    if (program.code) {
      lines.push(program.code);
    }

    // Add main block
    lines.push('');
    lines.push('if __name__ == "__main__":');
    lines.push(`    # Entry point for ${program.name}`);
    if (program.code) {
      lines.push('    pass  # Code above runs at module level');
    }

    return lines.join('\n');
  }

  injectTemplate(script: string, template: string): string {
    if (!template.includes(TEMPLATE_PLACEHOLDER)) {
      throw new Error('Template must contain # SCRIPT_PLACEHOLDER marker');
    }

    return template.replace(TEMPLATE_PLACEHOLDER, script);
  }

  addErrorHandling(script: string): string {
    const lines = script.split('\n');
    const indentedLines = lines.map((line) => (line.trim() ? `    ${line}` : ''));

    return [
      'import traceback',
      'import sys',
      '',
      'try:',
      ...indentedLines,
      'except Exception as e:',
      '    print(f"Error: {e}", file=sys.stderr)',
      '    traceback.print_exc()',
      '    sys.exit(1)',
    ].join('\n');
  }

  addLogging(script: string): string {
    const header = [
      'import logging',
      '',
      'logging.basicConfig(',
      '    level=logging.INFO,',
      '    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"',
      ')',
      '',
    ].join('\n');

    return header + script;
  }

  generateRequirementsTxt(features: string[]): string {
    const unique = [...new Set(features)];
    return unique.join('\n');
  }
}
