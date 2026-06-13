import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { RawResponsePanel } from '../../src/components/RawResponsePanel';

describe('RawResponsePanel', () => {
  it('renders nothing when data is null', () => {
    const { container } = render(<RawResponsePanel data={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a details element when data is provided', () => {
    const { container } = render(<RawResponsePanel data={{ foo: "bar" }} />);
    const details = container.querySelector('details');
    expect(details).toBeInTheDocument();
  });

  it('summary says "Raw API Response"', () => {
    const { container } = render(<RawResponsePanel data={{ foo: "bar" }} />);
    const summary = container.querySelector('summary');
    expect(summary!.textContent).toContain('Raw API Response');
  });

  it('renders JSON content inside pre tag', () => {
    const { container } = render(<RawResponsePanel data={{ key: "value" }} />);
    const pre = container.querySelector('pre');
    expect(pre).toBeInTheDocument();
    expect(pre!.textContent).toContain('key');
    expect(pre!.textContent).toContain('value');
  });

  it('details element is closed by default', () => {
    const { container } = render(<RawResponsePanel data={{ foo: "bar" }} />);
    const details = container.querySelector('details');
    expect(details!.hasAttribute('open')).toBe(false);
  });

  it('details element opens on summary click', async () => {
    const { container } = render(<RawResponsePanel data={{ foo: "bar" }} />);
    const details = container.querySelector('details')!;
    const summary = container.querySelector('summary')!;
    
    expect(details.hasAttribute('open')).toBe(false);
    await fireEvent.click(summary);
    expect(details.hasAttribute('open')).toBe(true);
  });
});
