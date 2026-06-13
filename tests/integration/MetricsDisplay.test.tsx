import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { MetricsDisplay } from '../../src/components/MetricsDisplay';
import type { BenchmarkMetrics } from '../../src/lib/metrics';

describe('MetricsDisplay', () => {
  const makeMetrics = (overrides: Partial<BenchmarkMetrics> = {}): BenchmarkMetrics => ({
    ttft: null,
    totalTime: null,
    tokenCount: 0,
    tokensPerSecond: null,
    provider: 'openai',
    model: 'gpt-4o',
    promptLength: 10,
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

  it('shows "--" for null metrics', () => {
    const { container } = render(<MetricsDisplay metrics={makeMetrics()} />);
    const metricsContainer = container.querySelector('.llm-metrics');
    expect(metricsContainer!.textContent).toContain('--');
  });

  it('shows TTFT value when present', () => {
    const { container } = render(<MetricsDisplay metrics={makeMetrics({ ttft: 547 })} />);
    const metricsContainer = container.querySelector('.llm-metrics');
    const ttftMetric = metricsContainer!.querySelector('.llm-metric-value.accent');
    expect(ttftMetric).toBeInTheDocument();
  });

  it('shows tokens per second when present', () => {
    const { container } = render(<MetricsDisplay metrics={makeMetrics({ tokensPerSecond: 28.9 })} />);
    const metricsContainer = container.querySelector('.llm-metrics');
    const throughputMetric = metricsContainer!.querySelectorAll('.llm-metric')[1];
    expect(throughputMetric.textContent).toContain('tok/s');
  });

  it('shows token count when greater than zero', () => {
    const { container } = render(<MetricsDisplay metrics={makeMetrics({ tokenCount: 42 })} />);
    const metricsContainer = container.querySelector('.llm-metrics');
    expect(metricsContainer!.textContent).toContain('42');
  });

  it('renders null metrics prop gracefully', () => {
    const { container } = render(<MetricsDisplay metrics={null} />);
    const metricsContainer = container.querySelector('.llm-metrics');
    expect(metricsContainer).toBeInTheDocument();
  });
});
