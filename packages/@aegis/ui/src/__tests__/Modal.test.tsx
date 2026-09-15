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

  it('renders the panel as a modal dialog', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Confirm">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('labels the dialog with its heading via aria-labelledby', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Confirm">
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(screen.getByRole('dialog', { name: 'Confirm' })).toBe(dialog);
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy ?? '');
    expect(heading).toBe(screen.getByText('Confirm'));
    expect(heading?.textContent).toBe('Confirm');
  });

  it('falls back to a translated aria-label when the title is absent', () => {
    render(
      <Modal open={true} onClose={vi.fn()}>
        <p>Content</p>
      </Modal>
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Dialog');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Confirm">
        <p>Content</p>
      </Modal>
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the dialog on open and restores it to the trigger on close', () => {
    const props = { onClose: vi.fn(), title: 'Confirm', children: <p>Content</p> };
    const { rerender } = render(
      <div>
        <button type="button">Open</button>
        <Modal open={false} {...props} />
      </div>
    );
    const trigger = screen.getByText('Open');
    trigger.focus();
    expect(trigger).toHaveFocus();

    rerender(
      <div>
        <button type="button">Open</button>
        <Modal open={true} {...props} />
      </div>
    );
    const dialog = screen.getByRole('dialog');
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    expect(dialog).toContainElement(active);
    expect(screen.getByLabelText('Close')).toHaveFocus();

    rerender(
      <div>
        <button type="button">Open</button>
        <Modal open={false} {...props} />
      </div>
    );
    expect(trigger).toHaveFocus();
  });

  it('wraps Tab from the last focusable element to the first', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Confirm">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Modal>
    );
    const last = screen.getByRole('button', { name: 'Last action' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(screen.getByLabelText('Close')).toHaveFocus();
  });

  it('wraps Shift+Tab from the first focusable element to the last', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Confirm">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Modal>
    );
    const close = screen.getByLabelText('Close');
    close.focus();
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('button', { name: 'Last action' })).toHaveFocus();
  });

  it('keeps natural Tab order for elements between the first and last focusable', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="Confirm">
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </Modal>
    );
    const middle = screen.getByRole('button', { name: 'First action' });
    middle.focus();
    fireEvent.keyDown(middle, { key: 'Tab' });
    fireEvent.keyDown(middle, { key: 'Tab', shiftKey: true });
    expect(middle).toHaveFocus();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog when focus is outside the panel', () => {
    render(
      <div>
        <button type="button">Behind</button>
        <Modal open={true} onClose={vi.fn()} title="Confirm">
          <p>Content</p>
        </Modal>
      </div>
    );
    const behind = screen.getByText('Behind');
    behind.focus();
    fireEvent.keyDown(behind, { key: 'Tab' });
    expect(screen.getByLabelText('Close')).toHaveFocus();
  });
});
