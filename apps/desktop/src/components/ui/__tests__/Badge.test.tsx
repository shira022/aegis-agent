import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from '../Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Running</Badge>);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<Badge>test</Badge>);
    const badge = screen.getByText('test');
    expect(badge.className).toContain('bg-neutral-700');
  });

  it('renders with success variant', () => {
    render(<Badge variant="success">Completed</Badge>);
    const badge = screen.getByText('Completed');
    expect(badge.className).toContain('bg-green-800');
  });

  it('renders with warning variant', () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge.className).toContain('bg-yellow-800');
  });

  it('renders with danger variant', () => {
    render(<Badge variant="danger">Failed</Badge>);
    const badge = screen.getByText('Failed');
    expect(badge.className).toContain('bg-red-800');
  });

  it('renders with info variant', () => {
    render(<Badge variant="info">Info</Badge>);
    const badge = screen.getByText('Info');
    expect(badge.className).toContain('bg-blue-800');
  });
});
