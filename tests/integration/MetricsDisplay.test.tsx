import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/preact';
import { MetricsDisplay } from '../../src/components/MetricsDisplay';
import type { BenchmarkMetrics } from '../../src/lib/metrics';

vi.mock('slot-text', () => ({
  slotText: vi.fn((element, initialText) => {
    element.textContent = initialText;
    element.setAttribute('aria-label', initialText);
    return {
      set: vi.fn((text) => {
        element.textContent = text;
        element.setAttribute('aria-label', text);
      }),
      destroy: vi.fn(),
    };
  }),
}));


describe('MetricsDisplay', () => {
  const makeMetrics = (overrides: Partial<BenchmarkMetrics> = {}): BenchmarkMetrics => ({
    ttft: null,
    ttlt: null,
    tokenCount: 0,
    tokensPerSecond: null,
    provider: 'openai',
    model: 'gpt-4o',
    promptLength: 10,
    inputTokens: null,
    outputTokens: null,
    ...overrides,
  });

  it('renders all four metric labels', () => {
    const { container } = render(<MetricsDisplay metrics={makeMetrics()} />);
    const metricsContainer = container.querySelector('.llm-metrics');
    expect(metricsContainer).toBeInTheDocument();
    expect(metricsContainer!.textContent).toContain('First Token');
    expect(metricsContainer!.textContent).toContain('Throughput');
    expect(metricsContainer!.textContent).toContain('Tokens');
    expect(metricsContainer!.textContent).toContain('Total Time');
  });

  it('shows "--" for null metrics', async () => {
    const { container } = render(<MetricsDisplay metrics={makeMetrics()} />);
    await new Promise((r) => setTimeout(r, 0));
    const metricsContainer = container.querySelector('.llm-metrics')!;
    const values = Array.from(metricsContainer.querySelectorAll('.llm-metric-value'))
      .map((v) => v.getAttribute('aria-label'));
    expect(values).toContain('--');
  });

  it('shows TTFT value when present', async () => {
    const { container } = render(<MetricsDisplay metrics={makeMetrics({ ttft: 547 })} />);
    await new Promise((r) => setTimeout(r, 0));
    const metricsContainer = container.querySelector('.llm-metrics');
    const ttftMetric = metricsContainer!.querySelector('.llm-metric-value.accent');
    expect(ttftMetric).toBeInTheDocument();
    expect(ttftMetric!.getAttribute('aria-label')).toBe('547');
  });

  it('shows tokens per second when present', async () => {
    const { container } = render(<MetricsDisplay metrics={makeMetrics({ tokensPerSecond: 28.9 })} />);
    await new Promise((r) => setTimeout(r, 0));
    const metricsContainer = container.querySelector('.llm-metrics')!;
    const throughputMetric = metricsContainer.querySelectorAll('.llm-metric')[1];
    expect(throughputMetric.textContent).toContain('tok/s');
    const valueEl = throughputMetric.querySelector('.llm-metric-value');
    expect(valueEl!.getAttribute('aria-label')).toBe('28.9');
  });

  it('shows token count when greater than zero', async () => {
    const { container } = render(<MetricsDisplay metrics={makeMetrics({ tokenCount: 42 })} />);
    await new Promise((r) => setTimeout(r, 0));
    const metricsContainer = container.querySelector('.llm-metrics')!;
    const valueEl = metricsContainer.querySelectorAll('.llm-metric-value')[2];
    expect(valueEl!.getAttribute('aria-label')).toBe('42');
  });

  it('renders null metrics prop gracefully', () => {
    const { container } = render(<MetricsDisplay metrics={null} />);
    const metricsContainer = container.querySelector('.llm-metrics');
    expect(metricsContainer).toBeInTheDocument();
  });
});
