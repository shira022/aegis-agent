import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Toast } from '../Toast';

describe('Toast', () => {
  it('renders message', () => {
    render(<Toast message="Task completed" type="success" onDismiss={vi.fn()} />);
    expect(screen.getByText('Task completed')).toBeInTheDocument();
  });

  it('renders success variant', () => {
    render(<Toast message="Success" type="success" onDismiss={vi.fn()} />);
    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('bg-green-900');
  });

  it('renders error variant', () => {
    render(<Toast message="Error" type="error" onDismiss={vi.fn()} />);
    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('bg-red-900');
  });

  it('renders info variant', () => {
    render(<Toast message="Info" type="info" onDismiss={vi.fn()} />);
    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('bg-blue-900');
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Test" type="info" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows dismiss button', () => {
    render(<Toast message="Test" type="info" onDismiss={vi.fn()} />);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });
});
