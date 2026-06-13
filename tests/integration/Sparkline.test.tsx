import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { Sparkline } from '../../src/components/Sparkline';

describe('Sparkline', () => {
  const makeData = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      value: (i + 1) * 10,
      label: `model-${i + 1}`,
    }));

  it('renders nothing when data is empty', () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders SVG with correct dimensions', () => {
    const data = makeData(3);
    const { container } = render(<Sparkline data={data} width={300} height={60} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '300');
    expect(svg).toHaveAttribute('height', '60');
  });

  it('renders path element', () => {
    const data = makeData(3);
    const { container } = render(<Sparkline data={data} />);
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveClass('llm-sparkline-path');
  });

  it('renders dots when showDots is true (default)', () => {
    const data = makeData(3);
    const { container } = render(<Sparkline data={data} />);
    const dots = container.querySelectorAll('circle');
    expect(dots).toHaveLength(3);
    dots.forEach((dot) => {
      expect(dot).toHaveClass('llm-sparkline-dot');
    });
  });

  it('does not render dots when showDots is false', () => {
    const data = makeData(3);
    const { container } = render(<Sparkline data={data} showDots={false} />);
    const dots = container.querySelectorAll('circle');
    expect(dots).toHaveLength(0);
  });

  it('shows tooltip on dot hover', async () => {
    const data = makeData(2);
    const { container } = render(<Sparkline data={data} />);
    const dots = container.querySelectorAll('circle');

    // Hover over first dot
    await fireEvent.mouseEnter(dots[0]);

    const tooltip = container.querySelector('.llm-sparkline-tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip?.textContent).toContain('model-1');
    expect(tooltip?.textContent).toContain('10.0 tok/s');
  });

  it('hides tooltip on mouse leave', async () => {
    const data = makeData(2);
    const { container } = render(<Sparkline data={data} />);
    const dots = container.querySelectorAll('circle');

    // Hover and then leave
    await fireEvent.mouseEnter(dots[0]);
    expect(container.querySelector('.llm-sparkline-tooltip')).toBeInTheDocument();

    await fireEvent.mouseLeave(dots[0]);
    expect(container.querySelector('.llm-sparkline-tooltip')).not.toBeInTheDocument();
  });

  it('handles single data point', () => {
    const data = makeData(1);
    const { container } = render(<Sparkline data={data} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    const dots = container.querySelectorAll('circle');
    expect(dots).toHaveLength(1);
  });

  it('uses accent color via CSS classes', () => {
    const data = makeData(2);
    const { container } = render(<Sparkline data={data} />);
    const path = container.querySelector('path');
    const dot = container.querySelector('circle');

    // Colors are applied via CSS classes, not inline attributes
    expect(path).toHaveClass('llm-sparkline-path');
    expect(dot).toHaveClass('llm-sparkline-dot');
  });

  it('passes strokeWidth via CSS custom property', () => {
    const data = makeData(2);
    const { container } = render(<Sparkline data={data} strokeWidth={3} />);
    const wrapper = container.querySelector('.llm-sparkline-wrap');
    expect(wrapper).toHaveAttribute('style');
    expect(wrapper?.getAttribute('style')).toContain('--sp-stroke: 3');
  });
});
