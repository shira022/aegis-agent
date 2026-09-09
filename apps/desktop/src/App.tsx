import { useState, useCallback } from 'react';
import type { Task, OperationStep, OperationLog } from '@aegis/shared';
import type { ApprovalRequest } from '@aegis/approval';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TaskList } from './components/TaskList/TaskList';
import { TimelineView } from './components/TimelineView/TimelineView';
import { CodeReviewPanel } from './components/CodeReviewPanel/CodeReviewPanel';
import { Toast } from './components/ui/Toast';

type View = 'dashboard' | 'tasks' | 'timeline' | 'review';

const navItems: { id: View; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'tasks', label: 'Tasks', icon: '📋' },
  { id: 'timeline', label: 'Action Flow', icon: '🔗' },
  { id: 'review', label: 'Code Review', icon: '🔍' },
];

// Sample data for demonstration
const sampleTasks: Task[] = [
  {
    id: 'task-1',
    name: 'Login Test',
    status: 'completed',
    scriptPath: '/scripts/login.ts',
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-15T10:30:00Z',
  },
  {
    id: 'task-2',
    name: 'Dashboard Check',
    status: 'running',
    scriptPath: '/scripts/dashboard.ts',
    createdAt: '2025-06-10T00:00:00Z',
    updatedAt: '2025-06-15T11:00:00Z',
  },
  {
    id: 'task-3',
    name: 'Report Generation',
    status: 'idle',
    scriptPath: '/scripts/report.ts',
    createdAt: '2025-06-12T00:00:00Z',
    updatedAt: '2025-06-14T09:00:00Z',
  },
];

const sampleSteps: OperationStep[] = [
  { type: 'navigate', timestamp: '2025-06-15T01:00:00Z', target: { selector: 'https://example.com' } },
  { type: 'click', timestamp: '2025-06-15T01:00:05Z', target: { selector: '#login-btn', text: 'Login' } },
  { type: 'type', timestamp: '2025-06-15T01:00:10Z', target: { selector: '#email', text: 'user@example.com' } },
  { type: 'wait', timestamp: '2025-06-15T01:00:15Z', target: {} },
  { type: 'screenshot', timestamp: '2025-06-15T01:00:20Z', target: {} },
];

const sampleApprovalRequest: ApprovalRequest = {
  id: 'req-1',
  taskId: 'task-1',
  code: `def main():
    print("hello world")
    return True`,
  explanation: 'Initial login implementation',
  exceptionHandlers: [
    { condition: 'ElementNotFound', action: 'Retry', code: 'retry(3)', riskLevel: 'low' },
  ],
  safetyChecks: [
    { id: '1', name: 'File Access', passed: true, message: 'OK' },
    { id: '2', name: 'Network', passed: true, message: 'Allowed' },
  ],
  createdAt: Date.now(),
  riskLevel: 'low',
  state: 'reviewing',
};

const sampleActivity: OperationLog[] = [
  {
    id: 'log-1',
    taskId: 'task-1',
    steps: sampleSteps,
    recordedAt: '2025-06-15T10:30:00Z',
    source: 'browser',
  },
  {
    id: 'log-2',
    taskId: 'task-2',
    steps: [],
    recordedAt: '2025-06-15T11:00:00Z',
    source: 'desktop',
  },
];

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [tasks] = useState<Task[]>(sampleTasks);
  const [timelineSteps] = useState<OperationStep[]>(sampleSteps);
  const [timelineMode, setTimelineMode] = useState<'timeline' | 'flowchart'>('timeline');
  const [approvalRequest] = useState<ApprovalRequest>(sampleApprovalRequest);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Toast notifications */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 w-80">
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Sidebar navigation */}
        <nav className="w-56 border-r border-neutral-800 bg-neutral-900 p-4">
          <div className="mb-8">
            <h1 className="text-lg font-bold text-indigo-400">🛡️ Aegis Agent</h1>
            <p className="text-xs text-neutral-500 mt-1">Workflow Automation</p>
          </div>

          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                  view === item.id
                    ? 'bg-indigo-600/20 text-indigo-300'
                    : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Main content area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {view === 'dashboard' && (
            <Dashboard
              tasks={tasks}
              recentActivity={sampleActivity}
              onNewTask={() => showToast('New Task screen (coming soon)', 'info')}
              onRunAll={() => showToast('Running all tasks', 'success')}
            />
          )}

          {view === 'tasks' && (
            <TaskList
              tasks={tasks}
              onRun={(id) => showToast(`Running task ${id}`, 'success')}
              onEdit={(id) => showToast(`Edit task ${id}`, 'info')}
              onDelete={(id) => showToast(`Deleted task ${id}`, 'error')}
            />
          )}

          {view === 'timeline' && (
            <TimelineView
              steps={timelineSteps}
              mode={timelineMode}
              onToggleMode={() =>
                setTimelineMode((m) => (m === 'timeline' ? 'flowchart' : 'timeline'))
              }
            />
          )}

          {view === 'review' && (
            <CodeReviewPanel
              request={approvalRequest}
              onApprove={(id) => showToast(`Approved: ${id}`, 'success')}
              onReject={(id, reason) => showToast(`Rejected: ${id} ${reason}`, 'error')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
