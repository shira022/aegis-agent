import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RecorderSession, RecorderStatus } from '../../../ipc';
import { Recorder } from '../Recorder';

const makeSession = (overrides: Partial<RecorderSession> = {}): RecorderSession => ({
  status: 'idle',
  actions: [],
  screenshots: [],
  ...overrides,
});

describe('Recorder', () => {
  const handlers = {
    onStart: vi.fn(),
    onStop: vi.fn(),
    onPause: vi.fn(),
    onResume: vi.fn(),
    onScreenshot: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const expectMatrix = (status: RecorderStatus): void => {
    render(<Recorder session={makeSession({ status })} {...handlers} />);
    const expectState = (name: string, enabled: boolean): void => {
      const button = screen.getByRole('button', { name });
      if (enabled) {
        expect(button).toBeEnabled();
      } else {
        expect(button).toBeDisabled();
      }
    };

    if (status === 'idle' || status === 'stopped') {
      expectState('Start', true);
    } else {
      expectState('Start', false);
    }
    expectState('Pause', status === 'recording');
    expectState('Resume', status === 'paused');
    expectState('Stop', status === 'recording' || status === 'paused');
    expectState('Screenshot', status !== 'idle');
  };

  it('enables/disables controls correctly in idle', () => {
    expectMatrix('idle');
  });

  it('enables/disables controls correctly while recording', () => {
    expectMatrix('recording');
  });

  it('enables/disables controls correctly while paused', () => {
    expectMatrix('paused');
  });

  it('enables/disables controls correctly when stopped', () => {
    expectMatrix('stopped');
  });

  it('shows the status label', () => {
    render(<Recorder session={makeSession({ status: 'recording' })} {...handlers} />);
    expect(screen.getByText('Recording')).toBeInTheDocument();
    expect(screen.getByTestId('recording-indicator')).toBeInTheDocument();
  });

  it('fires the transport callbacks', () => {
    const { unmount } = render(<Recorder session={makeSession({ status: 'idle' })} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(handlers.onStart).toHaveBeenCalledTimes(1);
    unmount();

    render(<Recorder session={makeSession({ status: 'recording' })} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    fireEvent.click(screen.getByRole('button', { name: 'Screenshot' }));
    expect(handlers.onPause).toHaveBeenCalledTimes(1);
    expect(handlers.onStop).toHaveBeenCalledTimes(1);
    expect(handlers.onScreenshot).toHaveBeenCalledTimes(1);
  });

  it('fires onResume when paused', () => {
    render(<Recorder session={makeSession({ status: 'paused' })} {...handlers} />);
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(handlers.onResume).toHaveBeenCalledTimes(1);
  });

  it('renders action and screenshot counts plus screenshot labels', () => {
    const session = makeSession({
      status: 'recording',
      startedAt: Date.now(),
      actions: [
        { type: 'click', timestamp: '2025-01-01T00:00:00Z', target: {} },
        { type: 'type', timestamp: '2025-01-01T00:00:01Z', target: {} },
      ],
      screenshots: [
        { id: 'shot-1', label: 'After login', capturedAt: Date.now() },
        { id: 'shot-2', label: 'On dashboard', capturedAt: Date.now() },
      ],
    });
    render(<Recorder session={session} {...handlers} />);
    expect(screen.getByTestId('recorder-action-count')).toHaveTextContent('2');
    expect(screen.getByTestId('recorder-screenshot-count')).toHaveTextContent('2');
    expect(screen.getByText('After login')).toBeInTheDocument();
    expect(screen.getByText('On dashboard')).toBeInTheDocument();
  });
});
