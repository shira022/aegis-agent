import crypto from 'crypto';
import type { RecordedAction } from '@aegis/recorder';
import type { Demonstration } from './types';

// ─── DemonstrationRecorder ───────────────────────────────────────────

export class DemonstrationRecorder {
  private currentRecording: Demonstration | null = null;
  private startTime: number = 0;

  startRecording(requestId: string): Demonstration {
    if (this.currentRecording !== null) {
      throw new Error('Already recording');
    }

    this.startTime = Date.now();

    this.currentRecording = {
      id: crypto.randomUUID(),
      requestId,
      actions: [],
      timestamp: new Date(),
      duration: 0,
    };

    return this.currentRecording;
  }

  stopRecording(): Demonstration {
    if (this.currentRecording === null) {
      throw new Error('Not recording');
    }

    this.currentRecording.duration = Date.now() - this.startTime;
    const recording = this.currentRecording;
    this.currentRecording = null;

    return recording;
  }

  getRecording(): Demonstration | null {
    return this.currentRecording;
  }

  addAction(action: RecordedAction): void {
    if (this.currentRecording === null) {
      throw new Error('Not recording');
    }

    this.currentRecording.actions.push(action);
  }

  convertToActions(demonstration: Demonstration): RecordedAction[] {
    return [...demonstration.actions];
  }
}
