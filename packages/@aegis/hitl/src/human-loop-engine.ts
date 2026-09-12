import type {
  HitlState,
  HitlResult,
  ErrorContext,
  InterventionRequest,
  InterventionDecision,
} from './types';
import { InterventionManager } from './intervention-manager';
import { DemonstrationRecorder } from './demonstration-recorder';
import { DiffLearner } from './diff-learner';

// ─── Intervention Callback ───────────────────────────────────────────

export type InterventionCallback = (request: InterventionRequest) => Promise<InterventionDecision>;
export type StateChangeCallback = (state: HitlState) => void;

// ─── HumanLoopEngine ─────────────────────────────────────────────────

export class HumanLoopEngine {
  private state: HitlState = 'idle';
  private interventionCallback: InterventionCallback | null = null;
  private stateChangeCallbacks: StateChangeCallback[] = [];
  private history: ErrorContext[] = [];

  private manager = new InterventionManager();
  private recorder = new DemonstrationRecorder();
  private learner = new DiffLearner();

  onIntervention(callback: InterventionCallback): void {
    this.interventionCallback = callback;
  }

  onStateChange(callback: StateChangeCallback): void {
    this.stateChangeCallbacks.push(callback);
  }

  getState(): HitlState {
    return this.state;
  }

  getHistory(): ErrorContext[] {
    return [...this.history];
  }

  async processError(
    context: ErrorContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future screenshot-based healing
    _screenshot?: string,
  ): Promise<HitlResult> {
    this.history.push(context);

    // Handle the error through the intervention manager
    const request = await this.manager.handleInterruption(context);

    this.setState('waiting_for_human');

    // Get human decision
    let decision: InterventionDecision;
    if (this.interventionCallback) {
      decision = await this.interventionCallback(request);
    } else {
      // Default: abort
      decision = {
        requestId: request.id,
        optionId: request.options.find(o => o.type === 'abort')!.id,
        decidedAt: new Date(),
        decidedBy: 'human',
      };
    }

    // Record the decision
    this.manager.recordDecision(decision);

    // Find the chosen option
    const chosenOption = request.options.find(o => o.id === decision.optionId);
    const actionType = chosenOption?.type ?? 'abort';

    let learningApplied = false;

    switch (actionType) {
      case 'demonstrate':
        this.setState('demonstrating');
        learningApplied = true;
        this.setState('learning');
        this.setState('applying');
        break;
      case 'fix_code':
        learningApplied = true;
        this.setState('learning');
        this.setState('applying');
        break;
      default:
        break;
    }

    this.setState('idle');

    return {
      handled: actionType !== 'abort',
      action: actionType,
      learningApplied,
    };
  }

  private setState(newState: HitlState): void {
    this.state = newState;
    for (const cb of this.stateChangeCallbacks) {
      cb(newState);
    }
  }
}
