import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { DependencyCheck } from '@aegis/shared';
import { SetupWizard } from '../components/SetupWizard';

const makeDep = (overrides: Partial<DependencyCheck> & { name: string }): DependencyCheck => ({
  installed: '',
  version: '',
  required: '',
  status: 'ok',
  ...overrides,
});

describe('SetupWizard', () => {
  const defaultProps = {
    onInstall: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────

  it('renders the card title', () => {
    render(
      <SetupWizard dependencies={[]} {...defaultProps} />,
    );
    expect(screen.getByText('Aegis Agent セットアップ')).toBeInTheDocument();
  });

  it('renders dependency names', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'ok', installed: 'v20.0.0', version: '20.0.0', required: '>=18' }),
      makeDep({ name: 'pnpm', status: 'missing' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('pnpm')).toBeInTheDocument();
  });

  // ── Status icons ───────────────────────────────────────────────────

  it('shows ✅ icon for installed (ok) dependencies', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'ok' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('shows ❌ icon for missing dependencies', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'pnpm', status: 'missing' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.getByText('❌')).toBeInTheDocument();
  });

  it('shows ⚠️ icon for outdated dependencies', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'outdated' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  // ── Version display ────────────────────────────────────────────────

  it('shows version when installed', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'ok', installed: 'v20.0.0', version: '20.0.0', required: '>=18' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.getByText(/v20\.0\.0/)).toBeInTheDocument();
  });

  it('does not show version for missing dependencies', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'pnpm', status: 'missing', installed: '', version: '', required: '' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.queryByText(/v/)).not.toBeInTheDocument();
  });

  // ── Install button ─────────────────────────────────────────────────

  it('shows install button for missing dependencies', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'pnpm', status: 'missing' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /インストール/ });
    expect(btn).toBeInTheDocument();
  });

  it('shows install button for outdated dependencies', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'outdated' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /インストール/ });
    expect(btn).toBeInTheDocument();
  });

  it('does not show install button for installed dependencies', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'ok' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /インストール/ })).not.toBeInTheDocument();
  });

  it('calls onInstall with dependency name when install button clicked', () => {
    const onInstall = vi.fn();
    const deps: DependencyCheck[] = [
      makeDep({ name: 'pnpm', status: 'missing' }),
    ];
    render(<SetupWizard dependencies={deps} onInstall={onInstall} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /インストール/ }));
    expect(onInstall).toHaveBeenCalledWith('pnpm');
  });

  // ── Completion state ───────────────────────────────────────────────

  it('shows completion message when all dependencies are ok', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'ok' }),
      makeDep({ name: 'pnpm', status: 'ok' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.getByText('すべての依存関係が揃いました')).toBeInTheDocument();
  });

  it('does not show completion message when some dependencies are missing', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'ok' }),
      makeDep({ name: 'pnpm', status: 'missing' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.queryByText('すべての依存関係が揃いました')).not.toBeInTheDocument();
  });

  it('shows 開始する button when all dependencies are ok', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'ok' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.getByRole('button', { name: '開始する' })).toBeInTheDocument();
  });

  it('does not show 開始する button when dependencies are missing', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'pnpm', status: 'missing' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);
    expect(screen.queryByRole('button', { name: '開始する' })).not.toBeInTheDocument();
  });

  it('calls onComplete when 開始する button clicked', () => {
    const onComplete = vi.fn();
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'ok' }),
    ];
    render(<SetupWizard dependencies={deps} onInstall={vi.fn()} onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: '開始する' }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  // ── Empty state ────────────────────────────────────────────────────

  it('shows completion message and button when dependencies array is empty', () => {
    render(<SetupWizard dependencies={[]} {...defaultProps} />);
    expect(screen.getByText('すべての依存関係が揃いました')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始する' })).toBeInTheDocument();
  });

  // ── Mixed states ───────────────────────────────────────────────────

  it('handles mixed dependency states correctly', () => {
    const deps: DependencyCheck[] = [
      makeDep({ name: 'Node.js', status: 'ok', installed: 'v20.0.0', version: '20.0.0', required: '>=18' }),
      makeDep({ name: 'pnpm', status: 'missing' }),
      makeDep({ name: 'Rust', status: 'outdated' }),
    ];
    render(<SetupWizard dependencies={deps} {...defaultProps} />);

    // Icons
    expect(screen.getByText('✅')).toBeInTheDocument();
    expect(screen.getByText('❌')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    // No completion
    expect(screen.queryByText('すべての依存関係が揃いました')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '開始する' })).not.toBeInTheDocument();

    // Two install buttons (missing + outdated)
    const installButtons = screen.getAllByRole('button', { name: /インストール/ });
    expect(installButtons).toHaveLength(2);
  });
});
