import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button onClick={vi.fn()}>クリック</Button>);
    expect(screen.getByText('クリック')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>実行</Button>);
    fireEvent.click(screen.getByText('実行'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>無効</Button>);
    fireEvent.click(screen.getByText('無効'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders with primary variant by default', () => {
    render(<Button onClick={vi.fn()}>primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-indigo-600');
  });

  it('renders with danger variant', () => {
    render(<Button onClick={vi.fn()} variant="danger">削除</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-red-600');
  });

  it('renders with ghost variant', () => {
    render(<Button onClick={vi.fn()} variant="ghost">キャンセル</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-transparent');
  });

  it('renders with sm size', () => {
    render(<Button onClick={vi.fn()} size="sm">小</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('px-3');
    expect(btn.className).toContain('text-xs');
  });

  it('renders with lg size', () => {
    render(<Button onClick={vi.fn()} size="lg">大</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('px-6');
    expect(btn.className).toContain('text-base');
  });

  it('has disabled attribute when disabled', () => {
    render(<Button onClick={vi.fn()} disabled>disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Button onClick={vi.fn()} className="my-custom">test</Button>);
    expect(screen.getByRole('button').className).toContain('my-custom');
  });
});
