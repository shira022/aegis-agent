import { useCallback, useEffect, useState } from 'react';
import { PROVIDER_REGISTRY } from '@aegis/shared';
import type { ProviderId, ProviderSettings } from '@aegis/shared';
import {
  Button,
  Icon,
  LanguageSwitcher,
  ProviderSelector,
  SetupWizard,
  TaskCards,
  ThemeToggle,
  Toast,
  brandIcon,
  navIcons,
  useAppTranslation,
} from '@aegis/ui';
import type { AppView } from '@aegis/ui';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ActionFlowView } from './components/ActionFlow/ActionFlowView';
import { TaskList } from './components/TaskList/TaskList';
import { CodeReviewPanel } from './components/CodeReviewPanel/CodeReviewPanel';
import { GeneratePanel } from './components/GeneratePanel/GeneratePanel';
import { ApprovalDialog } from './components/ApprovalDialog/ApprovalDialog';
import { HealingNotifier } from './components/HealingNotifier/HealingNotifier';
import { Recorder } from './components/Recorder/Recorder';
import { useTasks } from './hooks/useTasks';
import { useRun } from './hooks/useRun';
import { useApprovals } from './hooks/useApprovals';
import { useAiGeneration } from './hooks/useAiGeneration';
import { useHealing } from './hooks/useHealing';
import { useRecorder } from './hooks/useRecorder';
import { useSetup } from './hooks/useSetup';
import type { SetupActions, SetupStoreState } from './stores/setupStore';

const NAV_ITEMS: { id: AppView; labelKey: 'nav.dashboard' | 'nav.tasks' | 'nav.timeline' | 'nav.review' | 'nav.recorder' }[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard' },
  { id: 'tasks', labelKey: 'nav.tasks' },
  { id: 'timeline', labelKey: 'nav.timeline' },
  { id: 'review', labelKey: 'nav.review' },
  { id: 'recorder', labelKey: 'nav.recorder' },
];

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
}

function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center py-12 text-muted">
      <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-border border-t-primary" />
      {label}
    </div>
  );
}

interface SetupScreenProps {
  state: SetupStoreState;
  actions: SetupActions;
}

function SetupScreen({ state, actions }: SetupScreenProps) {
  const { t } = useAppTranslation();
  const [providerId, setProviderId] = useState<ProviderId | undefined>(undefined);
  const [settings, setSettings] = useState<ProviderSettings | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handleProviderChange = (id: ProviderId): void => {
    setProviderId(id);
    setSettings({
      providerId: id,
      apiKey: '',
      model: PROVIDER_REGISTRY[id].defaultModel,
    });
  };

  const handleSaveKey = async (): Promise<void> => {
    if (!providerId) {
      return;
    }
    setSaving(true);
    await actions.saveProviderKey({
      providerId,
      apiKey: settings?.apiKey ?? '',
      model: settings?.model,
    });
    setSaving(false);
  };

  if (state.error !== null && state.dependencies.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div
          role="alert"
          className="w-full max-w-md space-y-3 rounded-2xl border border-border bg-surface p-6 text-center"
        >
          <h2 className="text-lg font-semibold text-fg">{t('app.setupErrorTitle')}</h2>
          <p className="text-sm text-muted">{t('app.setupErrorHint')}</p>
          <p className="break-words text-xs text-danger">{state.error}</p>
          <Button
            variant="primary"
            onClick={() => {
              void actions.load();
            }}
          >
            {t('app.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (state.dependencies.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState label={t('app.loadingDependencies')} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <SetupWizard
          dependencies={state.dependencies}
          onInstall={actions.installDependency}
          onComplete={() => {
            void actions.complete();
          }}
        />

        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6">
          <div>
            <h2 className="text-lg font-semibold text-fg">{t('settings.provider.title')}</h2>
            <p className="text-xs text-muted">{t('settings.provider.description')}</p>
          </div>
          <ProviderSelector
            selectedProvider={providerId}
            settings={settings}
            onProviderChange={handleProviderChange}
            onSettingsChange={setSettings}
          />
          <Button
            variant="primary"
            disabled={!providerId || saving}
            onClick={() => {
              void handleSaveKey();
            }}
          >
            {saving ? t('settings.provider.saving') : t('settings.provider.saveKey')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { t } = useAppTranslation();
  const tasks = useTasks();
  const run = useRun();
  const approvals = useApprovals();
  const healing = useHealing();
  const generation = useAiGeneration();
  const recorder = useRecorder();
  const setup = useSetup();

  const [view, setView] = useState<AppView>('dashboard');
  const [timelineMode, setTimelineMode] = useState<'timeline' | 'flowchart'>('timeline');
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  useEffect(() => {
    if (toast === null) {
      return;
    }
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const storeError =
    tasks.state.error ??
    run.state.error ??
    approvals.state.error ??
    recorder.state.error ??
    setup.state.error;

  useEffect(() => {
    if (storeError) {
      setToast({ message: storeError, type: 'error' });
    }
  }, [storeError]);

  const handleNewTask = useCallback(() => {
    const name = `New Task ${tasks.state.tasks.length + 1}`;
    void tasks.actions.create({ name }).then((task) => {
      if (task) {
        showToast(t('toast.created', { name: task.name }), 'success');
      }
    });
  }, [tasks.actions, tasks.state.tasks.length, showToast, t]);

  const handleRun = useCallback(
    async (taskId: string): Promise<void> => {
      await tasks.actions.run(taskId);
      await run.actions.refresh();
    },
    [tasks.actions, run.actions],
  );

  const handleRunAll = useCallback(async (): Promise<void> => {
    const idleTasks = tasks.state.tasks.filter((task) => task.status === 'idle');
    for (const task of idleTasks) {
      await tasks.actions.run(task.id);
    }
    await run.actions.refresh();
  }, [tasks.actions, tasks.state.tasks, run.actions]);

  const handleDelete = useCallback(
    (taskId: string): void => {
      void tasks.actions.remove(taskId).then(() => showToast(t('toast.taskDeleted'), 'info'));
    },
    [tasks.actions, showToast, t],
  );

  const handleEdit = useCallback(
    (taskId: string): void => {
      showToast(t('toast.editUnavailable', { taskId }), 'info');
    },
    [showToast, t],
  );

  const handleApprove = useCallback(
    (requestId: string): void => {
      setDialogOpen(false);
      void approvals.actions.decide(requestId, 'approved').then((updated) => {
        if (updated) {
          showToast(t('toast.approved', { requestId }), 'success');
        }
      });
    },
    [approvals.actions, showToast, t],
  );

  const handleReject = useCallback(
    (requestId: string, reason: string): void => {
      setDialogOpen(false);
      void approvals.actions.decide(requestId, 'rejected', reason).then((updated) => {
        if (updated) {
          showToast(t('toast.rejected', { requestId }), 'error');
        }
      });
    },
    [approvals.actions, showToast, t],
  );

  const healingEvents = healing.state.events.filter((event) => !event.resolved);

  const notifier = (
    <HealingNotifier
      events={healingEvents}
      onDismiss={healing.actions.dismiss}
      onDismissAll={healing.actions.dismissAll}
    />
  );

  const toastNode =
    toast !== null ? (
      <div className="fixed right-4 top-4 z-[60] w-80">
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      </div>
    ) : null;

  if (!setup.state.completed) {
    return (
      <div className="min-h-screen bg-canvas text-fg">
        {toastNode}
        {notifier}
        <SetupScreen state={setup.state} actions={setup.actions} />
      </div>
    );
  }

  const pendingRequest = approvals.state.pending[0] ?? null;
  const selectedLog =
    run.state.activity.find((log) => log.id === run.state.selectedLogId) ?? null;

  return (
    <div className="min-h-screen bg-canvas text-fg">
      {toastNode}
      {notifier}

      <div className="flex min-h-screen">
        <nav className="flex w-56 flex-col border-r border-border bg-surface p-4">
          <div className="mb-8">
            <h1 className="flex items-center gap-2 text-lg font-bold text-primary">
              <Icon icon={brandIcon} size={20} />
              {t('app.name')}
            </h1>
            <p className="mt-1 text-xs text-muted">{t('app.tagline')}</p>
          </div>

          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  view === item.id
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted hover:bg-surface-raised hover:text-fg'
                }`}
              >
                <Icon icon={navIcons[item.id]} size={16} />
                <span>{t(item.labelKey)}</span>
              </button>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 pt-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto p-6">
          {view === 'dashboard' && (
            <Dashboard
              tasks={tasks.state.tasks}
              recentActivity={run.state.activity}
              onNewTask={handleNewTask}
              onRunAll={() => {
                void handleRunAll();
              }}
              onSelectActivity={(logId) => {
                run.actions.selectLog(logId);
                setView('timeline');
              }}
            />
          )}

          {view === 'tasks' && (
            <div className="space-y-6">
              {tasks.state.loading && tasks.state.tasks.length === 0 ? (
                <LoadingState label={t('tasks.loading')} />
              ) : (
                <>
                  <TaskList
                    tasks={tasks.state.tasks}
                    onRun={handleRun}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-fg">{t('tasks.cardView')}</h3>
                    <TaskCards
                      tasks={tasks.state.tasks}
                      onRun={handleRun}
                      onDelete={handleDelete}
                      onSelect={setSelectedTaskId}
                      selectedId={selectedTaskId}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {view === 'timeline' && (
            <div>
              {run.state.loading && run.state.steps.length === 0 ? (
                <LoadingState label={t('actionFlow.loading')} />
              ) : (
                <ActionFlowView
                  steps={run.state.steps}
                  mode={timelineMode}
                  selectedLog={selectedLog}
                  onToggleMode={() =>
                    setTimelineMode((mode) => (mode === 'timeline' ? 'flowchart' : 'timeline'))
                  }
                  onClearSelection={run.actions.clearSelection}
                  onRunIdleTasks={() => {
                    void handleRunAll();
                  }}
                  onGoToTasks={() => setView('tasks')}
                />
              )}
            </div>
          )}

          {view === 'review' && (
            <div className="space-y-4">
              <GeneratePanel
                tasks={tasks.state.tasks}
                state={generation.state}
                actions={generation.actions}
              />
              {approvals.state.loading && approvals.state.requests.length === 0 ? (
                <LoadingState label={t('review.loading')} />
              ) : pendingRequest ? (
                <>
                  <CodeReviewPanel
                    request={pendingRequest}
                    onApprove={() => setDialogOpen(true)}
                    onReject={() => setDialogOpen(true)}
                  />
                  <ApprovalDialog
                    request={pendingRequest}
                    open={dialogOpen}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onClose={() => setDialogOpen(false)}
                  />
                </>
              ) : (
                <div className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
                  {t('review.noPending')}
                </div>
              )}
            </div>
          )}

          {view === 'recorder' && (
            <Recorder
              session={recorder.state.session}
              onStart={() => {
                void recorder.actions.start();
              }}
              onPause={() => {
                void recorder.actions.pause();
              }}
              onResume={() => {
                void recorder.actions.resume();
              }}
              onStop={() => {
                void recorder.actions.stop();
              }}
              onScreenshot={() => {
                void recorder.actions.screenshot();
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
