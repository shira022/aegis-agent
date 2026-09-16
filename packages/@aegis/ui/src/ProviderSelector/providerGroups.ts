import type { ProviderCategory, ProviderId } from '@aegis/shared';
import { PROVIDER_REGISTRY } from '@aegis/shared';

export const PROVIDER_CATEGORY_ORDER: readonly ProviderCategory[] = [
  'cloud',
  'local',
  'compatible',
];

export const PROVIDER_CATEGORY_LABEL_KEYS = {
  cloud: 'settings.provider.categories.cloud',
  local: 'settings.provider.categories.local',
  compatible: 'settings.provider.categories.compatible',
} as const satisfies Record<ProviderCategory, string>;

export function groupProvidersByCategory(): Array<{
  category: ProviderCategory;
  providers: ProviderId[];
}> {
  return PROVIDER_CATEGORY_ORDER.map((category) => ({
    category,
    providers: (Object.keys(PROVIDER_REGISTRY) as ProviderId[]).filter(
      (id) => PROVIDER_REGISTRY[id].category === category,
    ),
  })).filter((group) => group.providers.length > 0);
}
