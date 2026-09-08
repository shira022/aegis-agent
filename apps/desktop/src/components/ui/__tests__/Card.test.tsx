import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card><p>カード内容</p></Card>);
    expect(screen.getByText('カード内容')).toBeInTheDocument();
  });

  it('renders with a title', () => {
    render(<Card title="タスク一覧">content</Card>);
    expect(screen.getByText('タスク一覧')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Card className="my-class">test</Card>);
    expect(container.firstChild).toHaveClass('my-class');
  });

  it('has base card styling', () => {
    const { container } = render(<Card>test</Card>);
    expect(container.firstChild).toHaveClass('rounded-xl');
    expect(container.firstChild).toHaveClass('border');
  });

  it('renders without title', () => {
    const { container } = render(<Card>test</Card>);
    expect(container.querySelector('h3')).not.toBeInTheDocument();
  });

  it('renders with optional actions', () => {
    render(
      <Card title="テスト" actions={<button>アクション</button>}>
        content
      </Card>
    );
    expect(screen.getByText('アクション')).toBeInTheDocument();
  });
});
