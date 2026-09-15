import { useId, useRef, useState } from 'react';
import type { ProviderId, Task } from '@aegis/shared';
import { PROVIDER_REGISTRY } from '@aegis/shared';
import {
  Button,
  Card,
  groupProvidersByCategory,
  Icon,
  Loader2,
  PROVIDER_CATEGORY_LABEL_KEYS,
  useAppTranslation,
} from '@aegis/ui';
import type { GenerationActions, GenerationState } from '../../stores/generationStore';

export interface GeneratePanelProps {
  tasks: Task[];
  state: GenerationState;
  actions: GenerationActions;
}

const inputClassName =
  'w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-fg outline-none focus:ring-2 focus:ring-primary disabled:opacity-50';

const labelClassName = 'mb-1 block text-sm font-medium text-fg';

/** Compact, locale-neutral duration ("1m 5s") — local models run for minutes. */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function GeneratePanel({ tasks, state, actions }: GeneratePanelProps) {
  const { t } = useAppTranslation();
  const headingId = useId();
  const taskSelectId = useId();
  const providerSelectId = useId();
  const modelInputId = useId();
  const contextInputId = useId();
  const descriptionInputId = useId();

  // Stays mounted in every state so focus is never lost when it changes.
  const statusRef = useRef<HTMLParagraphElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [taskId, setTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [context, setContext] = useState('');

  const generating = state.status === 'generating';
  const succeeded = state.status === 'idle' && state.lastResult !== null;
  const hasDescription = description.trim().length > 0;
  const providerConfig = PROVIDER_REGISTRY[state.provider];
  const modelLabel = state.model.trim().length > 0 ? state.model.trim() : providerConfig.defaultModel;

  const handleGenerate = (): void => {
    if (generating || !hasDescription) {
      return;
    }
    actions.generate({
      description: description.trim(),
      taskId: taskId.length > 0 ? taskId : undefined,
      context: context.trim().length > 0 ? context.trim() : undefined,
    });
    // The Generate button is about to be disabled, which would drop focus to
    // the body; park it on the live status region instead.
    statusRef.current?.focus();
  };

  const handleStartOver = (): void => {
    actions.reset();
    setTaskId('');
    setDescription('');
    setContext('');
    descriptionRef.current?.focus();
  };

  const statusText = generating
    ? t('generate.running', { model: modelLabel, elapsed: formatElapsed(state.elapsedMs) })
    : succeeded
      ? t('generate.success')
      : '';

  return (
    <section
      data-testid="generate-panel"
      aria-labelledby={headingId}
      aria-busy={generating}
      className="space-y-4"
    >
      <h2 id={headingId} className="text-lg font-semibold text-fg">
        {t('generate.title')}
      </h2>

      <Card>
        <div className="space-y-4">
          <div>
            <label htmlFor={taskSelectId} className={labelClassName}>
              {t('generate.task')}
            </label>
            <select
              id={taskSelectId}
              value={taskId}
              disabled={generating}
              className={inputClassName}
              onChange={(event) => setTaskId(event.target.value)}
            >
              <option value="">{t('generate.noTask')}</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={providerSelectId} className={labelClassName}>
              {t('generate.provider')}
            </label>
            <select
              id={providerSelectId}
              value={state.provider}
              disabled={generating}
              className={inputClassName}
              onChange={(event) => actions.setProvider(event.target.value as ProviderId)}
            >
              {groupProvidersByCategory().map(({ category, providers }) => (
                <optgroup key={category} label={t(PROVIDER_CATEGORY_LABEL_KEYS[category])}>
                  {providers.map((id) => (
                    <option key={id} value={id}>
                      {PROVIDER_REGISTRY[id].displayName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={modelInputId} className={labelClassName}>
              {t('generate.model')}
            </label>
            <input
              id={modelInputId}
              type="text"
              value={state.model}
              disabled={generating}
              className={inputClassName}
              placeholder={t('generate.modelPlaceholder', {
                model: providerConfig.defaultModel,
              })}
              onChange={(event) => actions.setModel(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor={contextInputId} className={labelClassName}>
              {t('generate.context')}
            </label>
            <input
              id={contextInputId}
              type="text"
              value={context}
              disabled={generating}
              className={inputClassName}
              placeholder={t('generate.contextPlaceholder')}
              onChange={(event) => setContext(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor={descriptionInputId} className={labelClassName}>
              {t('generate.description')}
            </label>
            <textarea
              id={descriptionInputId}
              ref={descriptionRef}
              value={description}
              required
              rows={4}
              disabled={generating}
              className={inputClassName}
              placeholder={t('generate.descriptionPlaceholder')}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <Button
            type="button"
            variant="primary"
            disabled={generating || !hasDescription}
            onClick={handleGenerate}
          >
            {generating ? t('generate.generating') : t('generate.generate')}
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p
          ref={statusRef}
          role="status"
          aria-live="polite"
          tabIndex={-1}
          className="flex items-center gap-2 text-sm text-muted"
        >
          {generating && <Icon icon={Loader2} size={14} className="animate-spin" />}
          <span>{statusText}</span>
        </p>
        {succeeded && (
          <Button variant="ghost" size="sm" type="button" onClick={handleStartOver}>
            {t('generate.startOver')}
          </Button>
        )}
      </div>

      {state.status === 'error' && state.error !== null && (
        <div
          role="alert"
          className="space-y-2 rounded-xl border border-danger bg-surface p-4"
        >
          <p className="text-sm text-danger">{state.error}</p>
          <Button variant="secondary" size="sm" type="button" onClick={handleGenerate}>
            {t('generate.retry')}
          </Button>
        </div>
      )}
    </section>
  );
}
