// ─── @aegis/hitl — Human-in-the-Loop ─────────────────────────────────

export type {
  HitlState,
  InterventionOptionType,
  RiskLevel,
  InterventionOption,
  InterventionRequest,
  InterventionDecision,
  Demonstration,
  CodeDiff,
  DiffLearning,
  LearningPattern,
  HitlResult,
  ErrorContext,
} from './types';

export {
  InterventionManager,
  type FormattedOption,
  type PresentedOptions,
} from './intervention-manager';

export { DemonstrationRecorder } from './demonstration-recorder';
export { DiffLearner } from './diff-learner';
export { HumanLoopEngine, type InterventionCallback, type StateChangeCallback } from './human-loop-engine';
