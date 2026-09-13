import { Monitor, Moon, Sun, type LucideIcon } from '../icons';
import { useAppTranslation } from '../i18n';
import { useTheme, type ThemeMode } from './useTheme';

const MODE_ICONS: Record<ThemeMode, LucideIcon> = {
  dark: Moon,
  light: Sun,
  system: Monitor,
};

const MODE_LABEL_KEYS = {
  dark: 'settings.theme.mode.dark',
  light: 'settings.theme.mode.light',
  system: 'settings.theme.mode.system',
} as const;

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'system',
  system: 'dark',
};

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const { t } = useAppTranslation();
  const ModeIcon = MODE_ICONS[mode];

  return (
    <button
      type="button"
      data-testid="theme-toggle"
      aria-label={t('settings.theme.toggle', { mode: t(MODE_LABEL_KEYS[mode]) })}
      onClick={() => setMode(NEXT_MODE[mode])}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-raised hover:text-fg focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <ModeIcon size={18} />
    </button>
  );
}
