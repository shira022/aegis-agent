// Types
export type {
  RecordingState,
  ActionType,
  ElementSelector,
  ActionMetadata,
  RecordedAction,
  SessionMetadata,
  RecordingSession,
  BoundingBox,
  ScreenshotDiffResult,
  SessionSummary,
} from './types';

// Selector Resolver
export {
  resolveSelector,
  createSelectorStrategy,
  rankSelector,
  normalizeXPath,
  generateStableSelector,
} from './selector-resolver';

// Screenshot Manager
export { ScreenshotManager } from './screenshot-manager';

// Operation Logger
export { OperationLogger } from './operation-logger';

// Tauri Commands
export {
  startRecording,
  stopRecording,
  pauseRecording,
  resumeRecording,
  getRecordingState,
  takeScreenshot,
} from './tauri-commands';
