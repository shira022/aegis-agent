import { useRef, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders title when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Confirm">
        <p>Content</p>
      </Modal>
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Confirm">
        <p>Dialog content</p>
      </Modal>
    );
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Confirm">
        <p>Content</p>
      </Modal>
    );
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Confirm">
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Confirm">
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when content clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Confirm">
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('Content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('exposes dialog semantics labelled by its title', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Confirm">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Confirm');
  });

  it('focuses the initial element on open and restores focus on close', () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      const fieldRef = useRef<HTMLButtonElement>(null);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Confirm"
            initialFocusRef={fieldRef}
          >
            <button ref={fieldRef} type="button">
              Field
            </button>
          </Modal>
        </div>
      );
    }

    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByRole('button', { name: 'Field' })).toHaveFocus();

    fireEvent.click(screen.getByLabelText('Close'));
    expect(opener).toHaveFocus();
  });
});
