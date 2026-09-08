import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DemonstrationRecorder } from '../demonstration-recorder';
import type { RecordedAction } from '@aegis/recorder';

describe('DemonstrationRecorder', () => {
  let recorder: DemonstrationRecorder;

  beforeEach(() => {
    recorder = new DemonstrationRecorder();
  });

  describe('startRecording', () => {
    it('should start recording for a given request ID', () => {
      const demo = recorder.startRecording('req-001');

      expect(demo).toBeDefined();
      expect(demo.id).toBeDefined();
      expect(demo.requestId).toBe('req-001');
      expect(demo.timestamp).toBeInstanceOf(Date);
      expect(demo.actions).toEqual([]);
    });

    it('should throw if already recording', () => {
      recorder.startRecording('req-002');

      expect(() => recorder.startRecording('req-003')).toThrow(/already recording/i);
    });

    it('should set duration to 0 at start', () => {
      const demo = recorder.startRecording('req-004');
      expect(demo.duration).toBe(0);
    });
  });

  describe('stopRecording', () => {
    it('should stop recording and return the demonstration', () => {
      recorder.startRecording('req-005');
      const demo = recorder.stopRecording();

      expect(demo).toBeDefined();
      expect(demo.requestId).toBe('req-005');
      expect(demo.duration).toBeGreaterThanOrEqual(0);
    });

    it('should throw if not recording', () => {
      expect(() => recorder.stopRecording()).toThrow(/not recording/i);
    });

    it('should allow starting a new recording after stopping', () => {
      recorder.startRecording('req-006');
      recorder.stopRecording();

      const demo = recorder.startRecording('req-007');
      expect(demo.requestId).toBe('req-007');
    });
  });

  describe('getRecording', () => {
    it('should return current recording when active', () => {
      recorder.startRecording('req-008');
      const current = recorder.getRecording();

      expect(current).toBeDefined();
      expect(current!.requestId).toBe('req-008');
    });

    it('should return null when not recording', () => {
      const current = recorder.getRecording();
      expect(current).toBeNull();
    });
  });

  describe('addAction', () => {
    it('should add actions to the current recording', () => {
      recorder.startRecording('req-009');

      const action: RecordedAction = {
        id: 'action-1',
        type: 'click',
        timestamp: Date.now(),
        selector: { text: 'Submit' },
        metadata: {},
      };

      recorder.addAction(action);

      const recording = recorder.getRecording();
      expect(recording!.actions.length).toBe(1);
      expect(recording!.actions[0].id).toBe('action-1');
    });

    it('should accumulate multiple actions', () => {
      recorder.startRecording('req-010');

      for (let i = 0; i < 5; i++) {
        recorder.addAction({
          id: `action-${i}`,
          type: 'click',
          timestamp: Date.now(),
          selector: { text: `Button ${i}` },
          metadata: {},
        });
      }

      const recording = recorder.getRecording();
      expect(recording!.actions.length).toBe(5);
    });

    it('should throw if not recording', () => {
      const action: RecordedAction = {
        id: 'action-orphan',
        type: 'click',
        timestamp: Date.now(),
        selector: { text: 'Submit' },
        metadata: {},
      };

      expect(() => recorder.addAction(action)).toThrow(/not recording/i);
    });
  });

  describe('convertToActions', () => {
    it('should return recorded actions after stop', () => {
      recorder.startRecording('req-011');
      recorder.addAction({
        id: 'a1',
        type: 'click',
        timestamp: Date.now(),
        selector: { text: 'Go' },
        metadata: {},
      });

      const demo = recorder.stopRecording();
      const actions = recorder.convertToActions(demo);

      expect(actions.length).toBe(1);
      expect(actions[0].id).toBe('a1');
    });

    it('should return empty array if no actions were recorded', () => {
      recorder.startRecording('req-012');
      const demo = recorder.stopRecording();
      const actions = recorder.convertToActions(demo);

      expect(actions).toEqual([]);
    });
  });
});
