import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { Disclaimer } from '../../src/components/Disclaimer';

describe('Disclaimer', () => {
  it('renders disclaimer text', () => {
    const { container } = render(<Disclaimer />);
    const text = container.textContent || '';
    expect(text).toContain('sends requests directly from your browser');
    expect(text).toContain('API key');
  });

  it('mentions local encryption', () => {
    const { container } = render(<Disclaimer />);
    expect(container.textContent).toContain('encrypted locally');
  });

  it('has the correct CSS class', () => {
    const { container } = render(<Disclaimer />);
    const p = container.querySelector('.llm-disclaimer');
    expect(p).toBeInTheDocument();
  });
});
