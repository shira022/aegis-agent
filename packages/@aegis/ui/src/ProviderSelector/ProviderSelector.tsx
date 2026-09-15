import { useState, useCallback } from 'react';
import type { ProviderId, ProviderSettings } from '@aegis/shared';
import { PROVIDER_REGISTRY } from '@aegis/shared';
import { useAppTranslation } from '../i18n';
import { PROVIDER_CATEGORY_LABEL_KEYS, groupProvidersByCategory } from './providerGroups';

export interface ProviderSelectorProps {
  selectedProvider?: ProviderId;
  settings?: ProviderSettings;
  onProviderChange: (providerId: ProviderId) => void;
  onSettingsChange: (settings: ProviderSettings) => void;
}

const inputClassName =
  'w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-fg outline-none focus:ring-2 focus:ring-primary';

export function ProviderSelector({
  selectedProvider,
  settings,
  onProviderChange,
  onSettingsChange,
}: ProviderSelectorProps) {
  const { t } = useAppTranslation();
  const [showApiKey, setShowApiKey] = useState(false);

  const handleProviderClick = useCallback(
    (providerId: ProviderId) => {
      onProviderChange(providerId);
    },
    [onProviderChange],
  );

  const buildSettings = useCallback(
    (overrides: Partial<ProviderSettings>): ProviderSettings => {
      return {
        providerId: selectedProvider!,
        apiKey: '',
        ...settings,
        ...overrides,
      } as ProviderSettings;
    },
    [selectedProvider, settings],
  );

  const handleApiKeyChange = useCallback(
    (value: string) => {
      if (!selectedProvider) return;
      onSettingsChange(buildSettings({ apiKey: value }));
    },
    [selectedProvider, onSettingsChange, buildSettings],
  );

  const handleModelChange = useCallback(
    (model: string) => {
      if (!selectedProvider) return;
      onSettingsChange(buildSettings({ model }));
    },
    [selectedProvider, onSettingsChange, buildSettings],
  );

  const handleDisableThinkingChange = useCallback(
    (checked: boolean) => {
      if (!selectedProvider) return;
      onSettingsChange(buildSettings({ disableThinking: checked }));
    },
    [selectedProvider, onSettingsChange, buildSettings],
  );

  const handleRegionChange = useCallback(
    (region: string) => {
      if (!selectedProvider) return;
      onSettingsChange(buildSettings({ region }));
    },
    [selectedProvider, onSettingsChange, buildSettings],
  );

  const handleProjectIdChange = useCallback(
    (projectId: string) => {
      if (!selectedProvider) return;
      onSettingsChange(buildSettings({ projectId }));
    },
    [selectedProvider, onSettingsChange, buildSettings],
  );

  const handleBaseUrlChange = useCallback(
    (baseUrl: string) => {
      if (!selectedProvider) return;
      onSettingsChange(buildSettings({ baseUrl }));
    },
    [selectedProvider, onSettingsChange, buildSettings],
  );

  const selectedConfig = selectedProvider ? PROVIDER_REGISTRY[selectedProvider] : null;

  const grouped = groupProvidersByCategory().map(({ category, providers }) => ({
    category,
    label: t(PROVIDER_CATEGORY_LABEL_KEYS[category]),
    providers,
  }));

  return (
    <div className="flex flex-col gap-5">
      {grouped.map(({ category, label, providers }) => (
        <div key={category} className="flex flex-col gap-2" data-testid={`category-${category}`}>
          <div className="pl-1 text-xs font-semibold uppercase tracking-wider text-muted">
            {label}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {providers.map((id) => {
              const config = PROVIDER_REGISTRY[id];
              const isSelected = selectedProvider === id;
              return (
                <div
                  key={id}
                  data-testid={`provider-card-${id}`}
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface hover:border-primary/50'
                  }`}
                  onClick={() => handleProviderClick(id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleProviderClick(id);
                    }
                  }}
                >
                  <div className="mb-1 text-base font-semibold text-fg">{config.displayName}</div>
                  {config.requiresRegion && (
                    <div className="mt-1 text-xs text-muted">
                      {t('settings.provider.regionRequired')}
                    </div>
                  )}
                  {config.requiresProjectId && (
                    <div className="mt-1 text-xs text-muted">
                      {t('settings.provider.projectIdRequired')}
                    </div>
                  )}
                  {config.category !== 'cloud' && (
                    <div className="mt-1 text-xs text-muted">
                      {t('settings.provider.customEndpoint')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {selectedConfig && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
          data-testid="provider-form"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-fg" htmlFor="model-select">
              {t('settings.provider.model')}
            </label>
            <select
              id="model-select"
              data-testid="model-select"
              className={inputClassName}
              value={settings?.model ?? selectedConfig.defaultModel}
              onChange={(e) => handleModelChange(e.target.value)}
            >
              {selectedConfig.availableModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {selectedConfig.supportsThinkingToggle && (
            <div>
              <label
                className="flex items-center gap-2 text-sm font-medium text-fg"
                htmlFor="disable-thinking-checkbox"
              >
                <input
                  id="disable-thinking-checkbox"
                  data-testid="disable-thinking-checkbox"
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={settings?.disableThinking === true}
                  onChange={(e) => handleDisableThinkingChange(e.target.checked)}
                />
                {t('settings.provider.disableThinking')}
              </label>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-fg" htmlFor="api-key-input">
              {t('settings.provider.apiKey')}
            </label>
            <div className="flex items-center gap-2">
              <input
                id="api-key-input"
                data-testid="api-key-input"
                className={`${inputClassName} flex-1 font-mono`}
                type={showApiKey ? 'text' : 'password'}
                value={settings?.apiKey ?? ''}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder={t('settings.provider.apiKeyPlaceholder')}
              />
              <button
                data-testid="api-key-toggle"
                className="whitespace-nowrap rounded-md border border-border bg-surface-raised px-3 py-2 text-xs text-fg transition-colors hover:bg-border"
                onClick={() => setShowApiKey((prev) => !prev)}
                type="button"
              >
                {showApiKey ? t('settings.provider.hide') : t('settings.provider.show')}
              </button>
            </div>
          </div>

          {selectedConfig.requiresRegion && (
            <div>
              <label className="mb-1 block text-sm font-medium text-fg" htmlFor="region-input">
                {t('settings.provider.region')}
              </label>
              <input
                id="region-input"
                data-testid="region-input"
                className={inputClassName}
                type="text"
                value={settings?.region ?? ''}
                onChange={(e) => handleRegionChange(e.target.value)}
                placeholder={t('settings.provider.regionPlaceholder')}
              />
            </div>
          )}

          {selectedConfig.requiresProjectId && (
            <div>
              <label className="mb-1 block text-sm font-medium text-fg" htmlFor="project-id-input">
                {t('settings.provider.projectId')}
              </label>
              <input
                id="project-id-input"
                data-testid="project-id-input"
                className={inputClassName}
                type="text"
                value={settings?.projectId ?? ''}
                onChange={(e) => handleProjectIdChange(e.target.value)}
                placeholder={t('settings.provider.projectIdPlaceholder')}
              />
            </div>
          )}

          {selectedConfig.category !== 'cloud' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-fg" htmlFor="base-url-input">
                {t('settings.provider.baseUrl')}
              </label>
              <input
                id="base-url-input"
                data-testid="base-url-input"
                className={inputClassName}
                type="text"
                value={settings?.baseUrl ?? ''}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                placeholder={
                  selectedConfig.category === 'local'
                    ? t('settings.provider.localBaseUrlPlaceholder')
                    : t('settings.provider.customBaseUrlPlaceholder')
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
