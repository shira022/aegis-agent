import type { DependencyCheck } from '@aegis/shared';

export interface SetupWizardProps {
  dependencies: DependencyCheck[];
  onInstall: (name: string) => void;
  onComplete: () => void;
}

function statusIcon(status: DependencyCheck['status']): string {
  switch (status) {
    case 'ok':
      return '✅';
    case 'missing':
      return '❌';
    case 'outdated':
      return '⚠️';
    case 'error':
      return '⚠️';
  }
}

export function SetupWizard({ dependencies, onInstall, onComplete }: SetupWizardProps) {
  const allOk = dependencies.every((dep) => dep.status === 'ok');

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-neutral-900">Aegis Agent セットアップ</h2>

      <ul className="mb-6 space-y-3">
        {dependencies.map((dep) => (
          <li
            key={dep.name}
            className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg" aria-label={`status-${dep.status}`}>
                {statusIcon(dep.status)}
              </span>
              <span className="font-medium text-neutral-800">{dep.name}</span>
              {dep.installed && (
                <span className="text-sm text-neutral-500">{dep.installed}</span>
              )}
            </div>

            {(dep.status === 'missing' || dep.status === 'outdated' || dep.status === 'error') && (
              <button
                onClick={() => onInstall(dep.name)}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800"
              >
                インストール
              </button>
            )}
          </li>
        ))}
      </ul>

      {allOk && (
        <div className="text-center">
          <p className="mb-4 text-sm font-medium text-green-700">
            すべての依存関係が揃いました
          </p>
          <button
            onClick={onComplete}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-green-700 active:bg-green-800"
          >
            開始する
          </button>
        </div>
      )}
    </div>
  );
}
