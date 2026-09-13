import type { DependencyCheck } from '@aegis/shared';
import { Icon, setupIcons } from '../icons';
import { useAppTranslation } from '../i18n';

export interface SetupWizardProps {
  dependencies: DependencyCheck[];
  onInstall: (name: string) => void;
  onComplete: () => void;
}

const STATUS_LABEL_KEYS = {
  ok: 'setup.status.ok',
  missing: 'setup.status.missing',
  outdated: 'setup.status.outdated',
  error: 'setup.status.error',
} as const;

const STATUS_CLASSES: Record<DependencyCheck['status'], string> = {
  ok: 'text-success',
  missing: 'text-danger',
  outdated: 'text-warning',
  error: 'text-warning',
};

export function SetupWizard({ dependencies, onInstall, onComplete }: SetupWizardProps) {
  const { t } = useAppTranslation();
  const allOk = dependencies.every((dep) => dep.status === 'ok');

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-fg">{t('setup.title')}</h2>

      <ul className="mb-6 space-y-3">
        {dependencies.map((dep) => (
          <li
            key={dep.name}
            className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <Icon
                icon={setupIcons[dep.status]}
                size={18}
                label={t(STATUS_LABEL_KEYS[dep.status])}
                className={STATUS_CLASSES[dep.status]}
              />
              <span className="font-medium text-fg">{dep.name}</span>
              {dep.installed && <span className="text-sm text-muted">{dep.installed}</span>}
            </div>

            {(dep.status === 'missing' || dep.status === 'outdated' || dep.status === 'error') && (
              <button
                type="button"
                onClick={() => onInstall(dep.name)}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {t('common.install')}
              </button>
            )}
          </li>
        ))}
      </ul>

      {allOk && (
        <div className="text-center">
          <p className="mb-4 text-sm font-medium text-success">{t('setup.allReady')}</p>
          <button
            type="button"
            onClick={onComplete}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {t('setup.getStarted')}
          </button>
        </div>
      )}
    </div>
  );
}
