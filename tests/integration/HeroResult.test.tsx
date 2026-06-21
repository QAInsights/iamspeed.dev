import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/preact';
import { HeroResult } from '../../src/components/HeroResult';

describe('HeroResult', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders hero text and unit', () => {
    const { container } = render(
      <HeroResult heroText="42" isActive={false} ttft={null} />
    );
    expect(container.querySelector('.llm-hero-number')!.textContent).toBe('42');
    expect(container.querySelector('.llm-hero-unit')!.textContent).toBe('tokens / sec');
  });

  it('does not show thinking status when not active', () => {
    const { container } = render(
      <HeroResult heroText="--" isActive={false} ttft={null} />
    );
    expect(container.querySelector('.llm-hero-status')).toBeNull();
  });

  it('does not show thinking status when ttft is set (first token arrived)', () => {
    const { container } = render(
      <HeroResult heroText="--" isActive={true} ttft={500} />
    );
    expect(container.querySelector('.llm-hero-status')).toBeNull();
  });

  it('shows thinking status when active and ttft is null', () => {
    const { container } = render(
      <HeroResult heroText="--" isActive={true} ttft={null} />
    );
    const status = container.querySelector('.llm-hero-status');
    expect(status).toBeInTheDocument();
    // First cycling status is "Connecting to provider..."
    expect(status!.textContent).toContain('Connecting to provider');
  });

  it('shows "Queued at provider..." when providerQueued is true (overrides cycling)', () => {
    const { container } = render(
      <HeroResult heroText="--" isActive={true} ttft={null} providerQueued={true} />
    );
    expect(container.querySelector('.llm-status-text')!.textContent).toBe('Queued at provider...');
  });

  it('does not show queued status once first token arrives (ttft set)', () => {
    const { container } = render(
      <HeroResult heroText="--" isActive={true} ttft={500} providerQueued={true} />
    );
    // Status disappears entirely once ttft is set, regardless of providerQueued
    expect(container.querySelector('.llm-hero-status')).toBeNull();
  });

  it('falls back to cycling status when providerQueued is false', () => {
    const { container } = render(
      <HeroResult heroText="--" isActive={true} ttft={null} providerQueued={false} />
    );
    expect(container.querySelector('.llm-status-text')!.textContent).toBe('Connecting to provider...');
  });

  it('thinking status has role=status for accessibility', () => {
    const { container } = render(
      <HeroResult heroText="--" isActive={true} ttft={null} />
    );
    expect(container.querySelector('.llm-hero-status')!.getAttribute('role')).toBe('status');
  });

  it('shows ttft value when ttft is set', () => {
    const { container } = render(
      <HeroResult heroText="42" isActive={false} ttft={1234} />
    );
    expect(container.querySelector('.llm-ttft-value')!.textContent).toBe('1234ms');
  });
});
