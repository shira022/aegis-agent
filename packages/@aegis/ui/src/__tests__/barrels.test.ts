import { describe, it, expect } from 'vitest';
import * as root from '../index';
import * as theme from '../theme';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { Modal } from '../Modal';
import { ProviderSelector } from '../ProviderSelector';
import { SetupWizard } from '../SetupWizard';
import { TaskCards } from '../TaskCards';
import { Timeline } from '../Timeline';
import { Toast } from '../Toast';

describe('public barrels', () => {
  it('exposes the component, theme, icon and i18n surface from the root barrel', () => {
    expect(typeof root.Button).toBe('function');
    expect(typeof root.Card).toBe('function');
    expect(typeof root.Badge).toBe('function');
    expect(typeof root.Modal).toBe('function');
    expect(typeof root.Toast).toBe('function');
    expect(typeof root.ProviderSelector).toBe('function');
    expect(typeof root.SetupWizard).toBe('function');
    expect(typeof root.TaskCards).toBe('function');
    expect(typeof root.Timeline).toBe('function');

    expect(typeof root.Icon).toBe('function');
    expect(typeof root.brandIcon).toBe('object');
    expect(typeof root.navIcons).toBe('object');

    expect(typeof root.ThemeProvider).toBe('function');
    expect(typeof root.ThemeToggle).toBe('function');
    expect(typeof root.useTheme).toBe('function');
    expect(typeof root.THEME_STORAGE_KEY).toBe('string');
    expect(root.DEFAULT_THEME_MODE).toBe('dark');
    expect(typeof root.ThemeContext).toBe('object');

    expect(typeof root.LanguageSwitcher).toBe('function');
    expect(typeof root.useAppTranslation).toBe('function');
    expect(typeof root.changeLanguage).toBe('function');
    expect(typeof root.initI18n).toBe('function');
    expect(typeof root.i18n).toBe('object');
    expect(Array.isArray(root.SUPPORTED_LOCALES)).toBe(true);

    expect(typeof root.formatDate).toBe('function');
    expect(typeof root.formatTime).toBe('function');
    expect(typeof root.formatNumber).toBe('function');
    expect(typeof root.localeFor).toBe('function');
  });

  it('re-exports the theme module from its own barrel', () => {
    expect(typeof theme.ThemeProvider).toBe('function');
    expect(typeof theme.ThemeToggle).toBe('function');
    expect(typeof theme.useTheme).toBe('function');
    expect(theme.THEME_STORAGE_KEY).toBe('aegis-theme');
    expect(theme.DEFAULT_THEME_MODE).toBe('dark');
    expect(theme.ThemeContext).toBeDefined();
  });

  it('exposes each component from its own barrel', () => {
    expect(typeof Badge).toBe('function');
    expect(typeof Button).toBe('function');
    expect(typeof Card).toBe('function');
    expect(typeof Modal).toBe('function');
    expect(typeof ProviderSelector).toBe('function');
    expect(typeof SetupWizard).toBe('function');
    expect(typeof TaskCards).toBe('function');
    expect(typeof Timeline).toBe('function');
    expect(typeof Toast).toBe('function');
  });
});
