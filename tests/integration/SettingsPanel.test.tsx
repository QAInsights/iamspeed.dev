import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { SettingsPanel, type SettingsState } from '../../src/components/SettingsPanel';

const defaultSettings: SettingsState = {
  providerId: 'openai',
  modelId: 'gpt-4o',
  prompt: 'Say hello',
  apiKey: null,
};

describe('SettingsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <SettingsPanel
        open={false}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    expect(container.querySelector('.llm-settings')).toBeNull();
  });

  it('renders settings panel when open is true', () => {
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    expect(container.querySelector('.llm-settings')).toBeInTheDocument();
  });

  it('shows Settings title', () => {
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    expect(container.querySelector('.llm-settings-title')!.textContent).toBe('Settings');
  });

  it('shows provider selector', () => {
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    const select = container.querySelector('.llm-provider-select') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    const options = Array.from(select.options).map((o) => o.textContent);
    expect(options).toContain('OpenAI');
    expect(options).toContain('Anthropic');
  });

  it('selects the active provider', () => {
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    const select = container.querySelector('.llm-provider-select') as HTMLSelectElement;
    expect(select.value).toBe('openai');
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={onClose}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    const closeBtn = container.querySelector('.llm-settings-close')!;
    await fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay background is clicked', async () => {
    const onClose = vi.fn();
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={onClose}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    const overlay = container.querySelector('.llm-overlay')!;
    await fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows API key input field', () => {
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    const input = container.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });

  it('shows prompt textarea with current prompt', () => {
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    const textarea = container.querySelector('.llm-textarea') as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();
    expect(textarea.value).toBe('Say hello');
  });

  it('shows Done button', () => {
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    const doneBtn = container.querySelector('.llm-settings-done');
    expect(doneBtn).toBeInTheDocument();
    expect(doneBtn!.textContent).toBe('Done');
  });

  it('shows disclaimer text', () => {
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={vi.fn()}
      />
    );
    const disclaimer = container.querySelector('.llm-disclaimer');
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer!.textContent).toContain('encrypted locally');
  });

  it('calls onSettingsChange when provider is changed via select', async () => {
    const onSettingsChange = vi.fn();
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );
    const select = container.querySelector('.llm-provider-select') as HTMLSelectElement;
    // Simulate changing to anthropic
    select.value = 'anthropic';
    await fireEvent.change(select);
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'anthropic' })
    );
  });

  it('calls onSettingsChange when prompt textarea changes', async () => {
    const onSettingsChange = vi.fn();
    const { container } = render(
      <SettingsPanel
        open={true}
        onClose={vi.fn()}
        settings={defaultSettings}
        onSettingsChange={onSettingsChange}
      />
    );
    const textarea = container.querySelector('.llm-textarea')!;
    await fireEvent.input(textarea, { target: { value: 'New prompt' } });
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'New prompt' })
    );
  });
});
