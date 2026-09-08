import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>実行中</Badge>);
    expect(screen.getByText('実行中')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<Badge>test</Badge>);
    const badge = screen.getByText('test');
    expect(badge.className).toContain('bg-neutral-700');
  });

  it('renders with success variant', () => {
    render(<Badge variant="success">完了</Badge>);
    const badge = screen.getByText('完了');
    expect(badge.className).toContain('bg-green-800');
  });

  it('renders with warning variant', () => {
    render(<Badge variant="warning">警告</Badge>);
    const badge = screen.getByText('警告');
    expect(badge.className).toContain('bg-yellow-800');
  });

  it('renders with danger variant', () => {
    render(<Badge variant="danger">失敗</Badge>);
    const badge = screen.getByText('失敗');
    expect(badge.className).toContain('bg-red-800');
  });

  it('renders with info variant', () => {
    render(<Badge variant="info">情報</Badge>);
    const badge = screen.getByText('情報');
    expect(badge.className).toContain('bg-blue-800');
  });
});
