import { describe, it, expect, vi } from 'vitest';
import type { ProviderCategory, ProviderId } from '@aegis/shared';
import { PROVIDER_REGISTRY } from '@aegis/shared';
import {
  PROVIDER_CATEGORY_LABEL_KEYS,
  PROVIDER_CATEGORY_ORDER,
  groupProvidersByCategory,
} from '../ProviderSelector/providerGroups';

describe('providerGroups', () => {
  it('orders categories cloud, local, compatible', () => {
    expect(PROVIDER_CATEGORY_ORDER).toEqual(['cloud', 'local', 'compatible']);
  });

  it('places every registered provider in exactly one group', () => {
    const groups = groupProvidersByCategory();
    const occurrences = new Map<ProviderId, number>();
    for (const group of groups) {
      for (const id of group.providers) {
        occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
      }
    }

    const registryIds = Object.keys(PROVIDER_REGISTRY) as ProviderId[];
    expect(occurrences.size).toBe(registryIds.length);
    for (const id of registryIds) {
      expect(occurrences.get(id)).toBe(1);
      const owningGroup = groups.find((group) => group.providers.includes(id));
      expect(owningGroup?.category).toBe(PROVIDER_REGISTRY[id].category);
    }
  });

  it('preserves the registry key order within each group', () => {
    const registryIds = Object.keys(PROVIDER_REGISTRY) as ProviderId[];
    for (const group of groupProvidersByCategory()) {
      const expected = registryIds.filter(
        (id) => PROVIDER_REGISTRY[id].category === group.category,
      );
      expect(group.providers).toEqual(expected);
    }
  });

  it('drops categories that have no providers', async () => {
    vi.resetModules();
    vi.doMock('@aegis/shared', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@aegis/shared')>();
      return {
        ...actual,
        PROVIDER_REGISTRY: { openai: actual.PROVIDER_REGISTRY.openai },
      };
    });

    try {
      const { groupProvidersByCategory: groupMockedRegistry } = await import(
        '../ProviderSelector/providerGroups'
      );
      const groups = groupMockedRegistry();
      expect(groups).toHaveLength(1);
      expect(groups[0]?.category).toBe('cloud');
      expect(groups[0]?.providers).toEqual(['openai']);
    } finally {
      vi.doUnmock('@aegis/shared');
      vi.resetModules();
    }
  });

  it('covers exactly the three categories with label keys', () => {
    const keys = Object.keys(PROVIDER_CATEGORY_LABEL_KEYS) as ProviderCategory[];
    expect(keys).toHaveLength(3);
    expect(new Set(keys)).toEqual(new Set([...PROVIDER_CATEGORY_ORDER]));
    for (const category of PROVIDER_CATEGORY_ORDER) {
      expect(PROVIDER_CATEGORY_LABEL_KEYS[category]).toBe(
        `settings.provider.categories.${category}`,
      );
    }
  });
});
