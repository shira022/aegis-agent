import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RecordingSession } from '../types';

// Mock Tauri invoke
const mockInvoke = vi.fn();
vi.stubGlobal('window', {
  __TAURI__: {
    invoke: mockInvoke,
  },
});

describe('TauriCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('startRecording', () => {
    it('should start recording and return session', async () => {
      const mockSession: RecordingSession = {
        id: 'session-1',
        name: 'Test Recording',
        startTime: Date.now(),
        state: 'recording',
        actions: [],
        metadata: {
          platform: 'linux',
          userAgent: 'test-agent',
        },
      };

      mockInvoke.mockResolvedValue(mockSession);

      const { startRecording } = await import('../tauri-commands');
      const session = await startRecording('Test Recording');

      expect(mockInvoke).toHaveBeenCalledWith('start_recording', { name: 'Test Recording' });
      expect(session.id).toBe('session-1');
      expect(session.state).toBe('recording');
    });

    it('should start recording without name', async () => {
      const mockSession: RecordingSession = {
        id: 'session-2',
        name: '',
        startTime: Date.now(),
        state: 'recording',
        actions: [],
        metadata: {
          platform: 'linux',
          userAgent: 'test-agent',
        },
      };

      mockInvoke.mockResolvedValue(mockSession);

      const { startRecording } = await import('../tauri-commands');
      await startRecording();

      expect(mockInvoke).toHaveBeenCalledWith('start_recording', { name: undefined });
    });
  });

  describe('stopRecording', () => {
    it('should stop recording and return final session', async () => {
      const mockSession: RecordingSession = {
        id: 'session-1',
        name: 'Test Recording',
        startTime: Date.now() - 5000,
        endTime: Date.now(),
        state: 'stopped',
        actions: [],
        metadata: {
          platform: 'linux',
          userAgent: 'test-agent',
        },
      };

      mockInvoke.mockResolvedValue(mockSession);

      const { stopRecording } = await import('../tauri-commands');
      const session = await stopRecording();

      expect(mockInvoke).toHaveBeenCalledWith('stop_recording');
      expect(session.state).toBe('stopped');
      expect(session.endTime).toBeDefined();
    });
  });

  describe('pauseRecording', () => {
    it('should pause recording', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { pauseRecording } = await import('../tauri-commands');
      await pauseRecording();

      expect(mockInvoke).toHaveBeenCalledWith('pause_recording');
    });
  });

  describe('resumeRecording', () => {
    it('should resume recording', async () => {
      mockInvoke.mockResolvedValue(undefined);

      const { resumeRecording } = await import('../tauri-commands');
      await resumeRecording();

      expect(mockInvoke).toHaveBeenCalledWith('resume_recording');
    });
  });

  describe('getRecordingState', () => {
    it('should get current recording state', async () => {
      mockInvoke.mockResolvedValue('recording');

      const { getRecordingState } = await import('../tauri-commands');
      const state = await getRecordingState();

      expect(mockInvoke).toHaveBeenCalledWith('get_recording_state');
      expect(state).toBe('recording');
    });
  });

  describe('takeScreenshot', () => {
    it('should take full screenshot', async () => {
      const mockScreenshot = 'base64-screenshot-data';
      mockInvoke.mockResolvedValue(mockScreenshot);

      const { takeScreenshot } = await import('../tauri-commands');
      const screenshot = await takeScreenshot();

      expect(mockInvoke).toHaveBeenCalledWith('take_screenshot', { region: undefined });
      expect(screenshot).toBe(mockScreenshot);
    });

    it('should take region screenshot', async () => {
      const mockScreenshot = 'base64-region-screenshot';
      mockInvoke.mockResolvedValue(mockScreenshot);

      const { takeScreenshot } = await import('../tauri-commands');
      const region = { x: 0, y: 0, width: 100, height: 100 };
      const screenshot = await takeScreenshot(region);

      expect(mockInvoke).toHaveBeenCalledWith('take_screenshot', { region });
      expect(screenshot).toBe(mockScreenshot);
    });
  });
});
