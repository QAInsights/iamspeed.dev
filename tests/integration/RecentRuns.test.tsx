import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { RecentRuns } from '../../src/components/RecentRuns';
import type { RunSummary } from '../../src/lib/history';

describe('RecentRuns', () => {
  const makeRun = (overrides: Partial<RunSummary> = {}): RunSummary => ({
    model: 'gpt-4o',
    provider: 'openai',
    tokensPerSecond: 50.5,
    ttft: 200,
    ttlt: 3000,
    inputTokens: 10,
    outputTokens: 40,
    timestamp: Date.now(),
    ...overrides,
  });

  const defaultProps = {
    open: true,
    onClose: () => {},
    onClear: () => {},
  };

  it('renders nothing when open is false', () => {
    const { container } = render(<RecentRuns {...defaultProps} open={false} runs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows empty state when no runs', () => {
    const { container } = render(<RecentRuns {...defaultProps} runs={[]} />);
    expect(container.textContent).toContain('No runs yet');
  });

  it('renders history table with runs', () => {
    const runs = [makeRun({ model: 'gpt-4o' }), makeRun({ model: 'claude-3-opus' })];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const table = container.querySelector('table');
    expect(table).toBeInTheDocument();

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
  });

  it('strips provider prefix from model names', () => {
    const runs = [
      makeRun({ model: 'openai/gpt-4o' }),
      makeRun({ model: 'anthropic/claude-3-opus' }),
    ];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const modelCells = container.querySelectorAll('.llm-history-model');
    expect(modelCells[0]).toHaveTextContent('gpt-4o');
    expect(modelCells[1]).toHaveTextContent('claude-3-opus');
  });

  it('handles models without provider prefix', () => {
    const runs = [makeRun({ model: 'gpt-4o' })];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const modelCell = container.querySelector('.llm-history-model');
    expect(modelCell).toHaveTextContent('gpt-4o');
  });

  it('formats TPS correctly', () => {
    const runs = [makeRun({ tokensPerSecond: 123.456 })];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const tpsCell = container.querySelector('.llm-history-tps');
    expect(tpsCell).toHaveTextContent('123'); // >= 100 rounds to integer
  });

  it('formats TPS with decimal for values < 100', () => {
    const runs = [makeRun({ tokensPerSecond: 45.678 })];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const tpsCell = container.querySelector('.llm-history-tps');
    expect(tpsCell).toHaveTextContent('45.7');
  });

  it('shows "--" for null TPS', () => {
    const runs = [makeRun({ tokensPerSecond: null })];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const tpsCell = container.querySelector('.llm-history-tps');
    expect(tpsCell).toHaveTextContent('--');
  });

  it('formats TTFT and TTLT in milliseconds', () => {
    const runs = [makeRun({ ttft: 123, ttlt: 2345 })];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const row = container.querySelector('tbody tr');
    expect(row?.textContent).toContain('123ms');
    expect(row?.textContent).toContain('2345ms');
  });

  it('shows sparkline when 2+ runs have TPS data', () => {
    const runs = [
      makeRun({ tokensPerSecond: 50 }),
      makeRun({ tokensPerSecond: 60 }),
    ];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const sparkline = container.querySelector('svg');
    expect(sparkline).toBeInTheDocument();
  });

  it('does not show sparkline with only 1 run', () => {
    const runs = [makeRun({ tokensPerSecond: 50 })];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const sparkline = container.querySelector('svg');
    expect(sparkline).not.toBeInTheDocument();
  });

  it('does not show sparkline when runs have null TPS', () => {
    const runs = [
      makeRun({ tokensPerSecond: null }),
      makeRun({ tokensPerSecond: null }),
    ];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const sparkline = container.querySelector('svg');
    expect(sparkline).not.toBeInTheDocument();
  });

  it('shows clear button when runs exist', () => {
    const runs = [makeRun()];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const clearBtn = container.querySelector('.llm-history-clear');
    expect(clearBtn).toBeInTheDocument();
    expect(clearBtn).toHaveTextContent('Clear All');
  });

  it('calls onClear when clear button is clicked', async () => {
    const runs = [makeRun()];
    const onClear = vi.fn();
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} onClear={onClear} />);

    const clearBtn = container.querySelector('.llm-history-clear');
    await fireEvent.click(clearBtn!);

    expect(onClear).toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(<RecentRuns {...defaultProps} runs={[]} onClose={onClose} />);

    const closeBtn = container.querySelector('.llm-history-close');
    await fireEvent.click(closeBtn!);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay background is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(<RecentRuns {...defaultProps} runs={[]} onClose={onClose} />);

    const overlay = container.querySelector('.llm-overlay');
    await fireEvent.click(overlay!);

    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when panel content is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(<RecentRuns {...defaultProps} runs={[]} onClose={onClose} />);

    const panel = container.querySelector('.llm-history');
    await fireEvent.click(panel!);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders all table headers', () => {
    const runs = [makeRun()];
    const { container } = render(<RecentRuns {...defaultProps} runs={runs} />);

    const headers = container.querySelectorAll('thead th');
    expect(headers).toHaveLength(4);
    expect(headers[0]).toHaveTextContent('Model');
    expect(headers[1]).toHaveTextContent('TPS');
    expect(headers[2]).toHaveTextContent('TTFT');
    expect(headers[3]).toHaveTextContent('Total Time');
  });
});
