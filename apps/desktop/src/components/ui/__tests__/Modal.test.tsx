import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders title when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="確認">
        <p>内容</p>
      </Modal>
    );
    expect(screen.getByText('確認')).toBeInTheDocument();
  });

  it('renders children when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="確認">
        <p>ダイアログ内容</p>
      </Modal>
    );
    expect(screen.getByText('ダイアログ内容')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="確認">
        <p>内容</p>
      </Modal>
    );
    expect(screen.queryByText('確認')).not.toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="確認">
        <p>内容</p>
      </Modal>
    );
    fireEvent.click(screen.getByLabelText('閉じる'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="確認">
        <p>内容</p>
      </Modal>
    );
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when content clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="確認">
        <p>内容</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('内容'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
