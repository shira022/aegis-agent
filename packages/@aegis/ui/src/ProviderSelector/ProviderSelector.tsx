import { useState, useCallback } from 'react';
import type { ProviderId, ProviderSettings, ProviderCategory } from '@aegis/shared';
import { PROVIDER_REGISTRY } from '@aegis/shared';

export interface ProviderSelectorProps {
  selectedProvider?: ProviderId;
  settings?: ProviderSettings;
  onProviderChange: (providerId: ProviderId) => void;
  onSettingsChange: (settings: ProviderSettings) => void;
}

const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  cloud: 'Cloud Providers',
  local: 'Local Providers',
  compatible: 'Custom / Compatible',
};

const CATEGORY_ORDER: ProviderCategory[] = ['cloud', 'local', 'compatible'];

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  categorySection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  categoryLabel: {
    fontSize: '13px',
    fontWeight: 600 as const,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    paddingLeft: '4px',
  },
  providerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  card: {
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #e0e0e0',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#fafafa',
  },
  cardSelected: {
    padding: '16px',
    borderRadius: '8px',
    border: '2px solid #2563eb',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: '#eff6ff',
  },
  cardName: {
    fontSize: '16px',
    fontWeight: 600 as const,
    marginBottom: '4px',
    color: '#111827',
  },
  indicator: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500 as const,
    color: '#374151',
    marginBottom: '4px',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  select: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    backgroundColor: '#ffffff',
  },
  apiKeyRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  apiKeyInput: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    fontFamily: 'monospace',
  },
  toggleBtn: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    backgroundColor: '#f3f4f6',
    whiteSpace: 'nowrap' as const,
  },
} as const;

export function ProviderSelector({
  selectedProvider,
  settings,
  onProviderChange,
  onSettingsChange,
}: ProviderSelectorProps) {
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

  const selectedConfig = selectedProvider
    ? PROVIDER_REGISTRY[selectedProvider]
    : null;

  // Group providers by category
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    providers: (Object.keys(PROVIDER_REGISTRY) as ProviderId[]).filter(
      (id) => PROVIDER_REGISTRY[id].category === category,
    ),
  })).filter((g) => g.providers.length > 0);

  return (
    <div style={styles.container}>
      {grouped.map(({ category, label, providers }) => (
        <div key={category} style={styles.categorySection} data-testid={`category-${category}`}>
          <div style={styles.categoryLabel}>{label}</div>
          <div style={styles.providerGrid}>
            {providers.map((id) => {
              const config = PROVIDER_REGISTRY[id];
              const isSelected = selectedProvider === id;
              return (
                <div
                  key={id}
                  data-testid={`provider-card-${id}`}
                  style={isSelected ? styles.cardSelected : styles.card}
                  onClick={() => handleProviderClick(id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleProviderClick(id);
                    }
                  }}
                >
                  <div style={styles.cardName}>{config.displayName}</div>
                  {config.requiresRegion && (
                    <div style={styles.indicator}>Region required</div>
                  )}
                  {config.requiresProjectId && (
                    <div style={styles.indicator}>Project ID required</div>
                  )}
                  {config.category !== 'cloud' && (
                    <div style={styles.indicator}>Custom endpoint</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {selectedConfig && (
        <div style={styles.formSection} data-testid="provider-form">
          <div>
            <label style={styles.label} htmlFor="model-select">
              Model
            </label>
            <select
              id="model-select"
              data-testid="model-select"
              style={styles.select}
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

          <div>
            <div style={styles.label}>API Key</div>
            <div style={styles.apiKeyRow}>
              <input
                data-testid="api-key-input"
                style={styles.apiKeyInput}
                type={showApiKey ? 'text' : 'password'}
                value={settings?.apiKey ?? ''}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="Enter API key"
              />
              <button
                data-testid="api-key-toggle"
                style={styles.toggleBtn}
                onClick={() => setShowApiKey((prev) => !prev)}
                type="button"
              >
                {showApiKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {selectedConfig.requiresRegion && (
            <div>
              <label style={styles.label} htmlFor="region-input">
                Region
              </label>
              <input
                id="region-input"
                data-testid="region-input"
                style={styles.input}
                type="text"
                value={settings?.region ?? ''}
                onChange={(e) => handleRegionChange(e.target.value)}
                placeholder="e.g. us-east-1"
              />
            </div>
          )}

          {selectedConfig.requiresProjectId && (
            <div>
              <label style={styles.label} htmlFor="project-id-input">
                Project ID
              </label>
              <input
                id="project-id-input"
                data-testid="project-id-input"
                style={styles.input}
                type="text"
                value={settings?.projectId ?? ''}
                onChange={(e) => handleProjectIdChange(e.target.value)}
                placeholder="Enter GCP project ID"
              />
            </div>
          )}

          {selectedConfig.category !== 'cloud' && (
            <div>
              <label style={styles.label} htmlFor="base-url-input">
                Base URL
              </label>
              <input
                id="base-url-input"
                data-testid="base-url-input"
                style={styles.input}
                type="text"
                value={settings?.baseUrl ?? ''}
                onChange={(e) => handleBaseUrlChange(e.target.value)}
                placeholder={
                  selectedConfig.category === 'local'
                    ? 'e.g. http://localhost:11434/v1'
                    : 'e.g. https://your-api.com/v1'
                }
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
