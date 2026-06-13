import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { StreamOutput } from '../../src/components/StreamOutput';

describe('StreamOutput', () => {
  it('renders nothing when text is empty and not streaming', () => {
    const { container } = render(<StreamOutput text="" streaming={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders text when provided', () => {
    render(<StreamOutput text="Hello World" streaming={false} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('shows cursor when streaming is true', () => {
    const { container } = render(<StreamOutput text="Hello" streaming={true} />);
    const cursor = container.querySelector('.llm-stream-cursor');
    expect(cursor).toBeInTheDocument();
  });

  it('hides cursor when streaming is false', () => {
    const { container } = render(<StreamOutput text="Hello" streaming={false} />);
    const cursor = container.querySelector('.llm-stream-cursor');
    expect(cursor).toBeNull();
  });

  it('shows cursor when streaming even with empty text', () => {
    const { container } = render(<StreamOutput text="" streaming={true} />);
    const cursor = container.querySelector('.llm-stream-cursor');
    expect(cursor).toBeInTheDocument();
  });
});
