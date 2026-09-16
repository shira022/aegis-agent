import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Task } from '@aegis/shared';
import type { AiGenerationResult } from '../../../ipc/types';
import type { GenerationActions, GenerationState } from '../../../stores/generationStore';
import { GeneratePanel } from '../GeneratePanel';

const tasks: Task[] = [
  {
    id: 'task-1',
    name: 'Invoice Download',
    status: 'idle',
    scriptPath: '/scripts/invoice-download.ts',
    createdAt: '2025-06-10T09:00:00Z',
    updatedAt: '2025-06-15T10:30:00Z',
  },
  {
    id: 'task-2',
    name: 'CRM Contact Sync',
    status: 'running',
    scriptPath: '/scripts/crm-sync.ts',
    createdAt: '2025-06-12T08:15:00Z',
    updatedAt: '2025-06-15T11:00:00Z',
  },
];

const result: AiGenerationResult = {
  script: 'print("hello")',
  language: 'python',
  mocked: true,
  model: 'mock-model',
  promptHash: '0123456789abcdef',
};

function makeState(overrides: Partial<GenerationState> = {}): GenerationState {
  return {
    status: 'idle',
    error: null,
    lastResult: null,
    elapsedMs: 0,
    provider: 'ollama',
    model: '',
    ...overrides,
  };
}

function makeActions(): GenerationActions {
  return {
    generate: vi.fn().mockResolvedValue(true),
    reset: vi.fn(),
    setProvider: vi.fn(),
    setModel: vi.fn(),
  };
}

function renderPanel(overrides: {
  state?: Partial<GenerationState>;
  actions?: GenerationActions;
} = {}) {
  const actions = overrides.actions ?? makeActions();
  const view = render(
    <GeneratePanel
      tasks={tasks}
      state={makeState(overrides.state)}
      actions={actions}
    />,
  );
  return { ...view, actions };
}

describe('GeneratePanel', () => {
  // ── Form fields ────────────────────────────────────────────────────
  it('renders every field with an accessible name', () => {
    renderPanel();
    expect(screen.getByLabelText('Task')).toBeInTheDocument();
    expect(screen.getByLabelText('Provider')).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toBeInTheDocument();
    expect(screen.getByLabelText('Context / notes')).toBeInTheDocument();
    expect(screen.getByLabelText('Task description')).toBeInTheDocument();
  });

  it('offers the existing tasks plus a no-task draft option', () => {
    renderPanel();
    expect(screen.getByText('No task (draft)')).toBeInTheDocument();
    expect(screen.getByText('Invoice Download')).toBeInTheDocument();
    expect(screen.getByText('CRM Contact Sync')).toBeInTheDocument();
  });

  it('lists the shared provider registry, including local providers', () => {
    renderPanel();
    const select = screen.getByLabelText('Provider') as HTMLSelectElement;
    expect(select.value).toBe('ollama');
    expect(screen.getByText('Ollama (Local)')).toBeInTheDocument();
    expect(screen.getByText('LM Studio (Local)')).toBeInTheDocument();
    expect(screen.getByText('Custom (OpenAI Compatible)')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
  });

  it('reports provider changes through setProvider', () => {
    const { actions } = renderPanel();
    fireEvent.change(screen.getByLabelText('Provider'), {
      target: { value: 'openai-compatible' },
    });
    expect(actions.setProvider).toHaveBeenCalledWith('openai-compatible');
  });

  it('shows the provider default as the model placeholder', () => {
    renderPanel();
    expect(screen.getByPlaceholderText('Default: llama3.1')).toBeInTheDocument();
  });

  it('reflects the default of the selected provider', () => {
    renderPanel({ state: { provider: 'openai' } });
    expect(screen.getByPlaceholderText('Default: gpt-4o')).toBeInTheDocument();
  });

  it('reports model edits through setModel', () => {
    const { actions } = renderPanel();
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'mistral' } });
    expect(actions.setModel).toHaveBeenCalledWith('mistral');
  });

  // ── Generate button ────────────────────────────────────────────────
  it('disables Generate until a description is entered', () => {
    const { actions } = renderPanel();
    const button = screen.getByRole('button', { name: 'Generate' });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Task description'), {
      target: { value: 'Download the invoice' },
    });
    expect(button).toBeEnabled();
    expect(actions.generate).not.toHaveBeenCalled();
  });

  it('generates with the selected task, provider and model', () => {
    const { actions } = renderPanel();
    fireEvent.change(screen.getByLabelText('Task'), { target: { value: 'task-1' } });
    fireEvent.change(screen.getByLabelText('Provider'), { target: { value: 'openai' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'o3' } });
    fireEvent.change(screen.getByLabelText('Context / notes'), {
      target: { value: 'Login first' },
    });
    fireEvent.change(screen.getByLabelText('Task description'), {
      target: { value: 'Download the June invoice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(actions.setProvider).toHaveBeenCalledWith('openai');
    expect(actions.setModel).toHaveBeenCalledWith('o3');
    expect(actions.generate).toHaveBeenCalledWith({
      description: 'Download the June invoice',
      taskId: 'task-1',
      context: 'Login first',
    });
  });

  it('treats a blank description as empty', () => {
    const { actions } = renderPanel();
    fireEvent.change(screen.getByLabelText('Task description'), {
      target: { value: '   ' },
    });
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    expect(actions.generate).not.toHaveBeenCalled();
  });

  // ── Generating state ───────────────────────────────────────────────
  it('marks the panel busy and shows a live status line while generating', () => {
    renderPanel({ state: { status: 'generating', elapsedMs: 65000 } });

    expect(screen.getByTestId('generate-panel')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Generating a script with llama3.1 — 1m 5s elapsed. Local models can take a few minutes.',
    );
    expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();
    expect(screen.getByLabelText('Task description')).toBeDisabled();
  });

  it('counts elapsed seconds before the first minute', () => {
    renderPanel({ state: { status: 'generating', elapsedMs: 3000 } });
    expect(screen.getByRole('status')).toHaveTextContent('— 3s elapsed');
  });

  it('uses the selected model name in the status line', () => {
    renderPanel({ state: { status: 'generating', model: 'mistral', elapsedMs: 0 } });
    expect(screen.getByRole('status')).toHaveTextContent('Generating a script with mistral');
  });

  it('disables every input while generating', () => {
    renderPanel({ state: { status: 'generating' } });
    expect(screen.getByLabelText('Task')).toBeDisabled();
    expect(screen.getByLabelText('Provider')).toBeDisabled();
    expect(screen.getByLabelText('Model')).toBeDisabled();
    expect(screen.getByLabelText('Context / notes')).toBeDisabled();
  });

  // ── Error state ────────────────────────────────────────────────────
  it('shows an alert with the message and a retry affordance on failure', () => {
    const { actions } = renderPanel({ state: { status: 'error', error: 'provider offline' } });

    expect(screen.getByTestId('generate-panel')).toHaveAttribute('aria-busy', 'false');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('provider offline');

    fireEvent.change(screen.getByLabelText('Task description'), {
      target: { value: 'Download the invoice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(actions.generate).toHaveBeenCalledWith({
      description: 'Download the invoice',
      taskId: undefined,
      context: undefined,
    });
  });

  it('does not retry without a description', () => {
    const { actions } = renderPanel({ state: { status: 'error', error: 'provider offline' } });

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(actions.generate).not.toHaveBeenCalled();
  });

  // ── Success state ──────────────────────────────────────────────────
  it('announces a confirmation and offers to start over on success', () => {
    const { actions } = renderPanel({ state: { lastResult: result } });

    expect(screen.getByRole('status')).toHaveTextContent(
      'The generated script was added to the review queue below.',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Task description'), {
      target: { value: 'Download the invoice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect(actions.reset).toHaveBeenCalled();
    expect(screen.getByLabelText('Task description')).toHaveValue('');
    expect(screen.getByLabelText('Task')).toHaveValue('');
    expect(screen.getByLabelText('Context / notes')).toHaveValue('');
  });

  // ── Focus and tab order ────────────────────────────────────────────
  it('moves focus to the live status region and keeps it through state changes', () => {
    const actions = makeActions();
    const view = render(
      <GeneratePanel tasks={tasks} state={makeState()} actions={actions} />,
    );

    fireEvent.change(screen.getByLabelText('Task description'), {
      target: { value: 'Download the invoice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(screen.getByRole('status')).toHaveFocus();

    // Re-rendering into the generating state keeps the focused region mounted.
    view.rerender(
      <GeneratePanel
        tasks={tasks}
        state={makeState({ status: 'generating', elapsedMs: 1000 })}
        actions={actions}
      />,
    );
    expect(screen.getByRole('status')).toHaveFocus();

    // The tab order follows the DOM order; nothing uses a positive tabIndex.
    expect(view.container.querySelectorAll('[tabindex]:not([tabindex="-1"])')).toHaveLength(0);
  });

  it('focuses the description field after starting over', () => {
    renderPanel({ state: { lastResult: result } });

    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect(screen.getByLabelText('Task description')).toHaveFocus();
  });
});
