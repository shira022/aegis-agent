import { useDesktop } from '../stores/DesktopContext';
import type { DesktopApi } from '../ipc/types';

export function useDesktopApi(): DesktopApi {
  return useDesktop().api;
}
