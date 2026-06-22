import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/preact';
import { SettingsPanel, type SettingsState } from '../../src/components/SettingsPanel';
import { discoverLocalModels } from '../../src/lib/modelRegistry';

vi.mock('../../src/lib/modelRegistry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/modelRegistry')>();
  return {
    ...actual,
    discoverLocalModels: vi.fn().mockResolvedValue([]),
  };
});

const defaultSettings: SettingsState = {
  providerId: 'openai',
  modelId: 'gpt-4o',
  prompt: 'Say hello',
  apiKey: null,
};

const localSettings: SettingsState = {
  providerId: 'local',
  modelId: '',
  prompt: 'Say hello',
  apiKey: null,
  baseUrl: undefined,
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
    expect(options).toContain('Local');
    expect(options).toContain('OpenRouter');
    expect(options).toContain('Cerebras');
    expect(options).toContain('SambaNova');
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
    await waitFor(() => {
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'anthropic' })
      );
    });
  });

  describe('OpenRouter provider', () => {
    it('lists OpenRouter in the provider select', () => {
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={defaultSettings}
          onSettingsChange={vi.fn()}
        />
      );
      const select = container.querySelector('.llm-provider-select') as HTMLSelectElement;
      const options = Array.from(select.options).map((o) => o.value);
      expect(options).toContain('openrouter');
    });

    it('calls onSettingsChange with providerId openrouter when selected', async () => {
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
      select.value = 'openrouter';
      await fireEvent.change(select);
      await waitFor(() => {
        expect(onSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({ providerId: 'openrouter' })
        );
      });
    });

    it('does not show Base URL input for openrouter (not a local provider)', () => {
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={{ ...defaultSettings, providerId: 'openrouter' }}
          onSettingsChange={vi.fn()}
        />
      );
      const baseInput = container.querySelector('#settings-baseurl');
      expect(baseInput).toBeNull();
    });

    it('shows required API key label (not optional) for openrouter', () => {
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={{ ...defaultSettings, providerId: 'openrouter' }}
          onSettingsChange={vi.fn()}
        />
      );
      const label = container.querySelector('label[for="settings-apikey"]');
      expect(label!.textContent).not.toContain('optional');
    });
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

  describe('Local provider', () => {
    it('shows Base URL input when local provider is selected', () => {
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={{ ...localSettings, baseUrl: 'http://localhost:11434/v1' }}
          onSettingsChange={vi.fn()}
        />
      );
      const baseInput = container.querySelector('#settings-baseurl') as HTMLInputElement;
      expect(baseInput).toBeInTheDocument();
      expect(baseInput.value).toBe('http://localhost:11434/v1');
    });

    it('shows default base URL placeholder for local', () => {
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={localSettings}
          onSettingsChange={vi.fn()}
        />
      );
      const baseInput = container.querySelector('#settings-baseurl') as HTMLInputElement;
      expect(baseInput).toBeInTheDocument();
      expect(baseInput.placeholder).toBe('http://localhost:11434/v1');
    });

    it('renders model as text input for local (not select)', () => {
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={localSettings}
          onSettingsChange={vi.fn()}
        />
      );
      const modelInput = container.querySelector('#settings-model') as HTMLInputElement;
      expect(modelInput).toBeInTheDocument();
      expect(modelInput.tagName).toBe('INPUT');
      expect(modelInput.type).toBe('text');
    });

    it('shows "API Key (optional)" label for local', () => {
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={localSettings}
          onSettingsChange={vi.fn()}
        />
      );
      const label = container.querySelector('label[for="settings-apikey"]');
      expect(label!.textContent).toContain('API Key (optional)');
    });

    it('shows local-specific disclaimer', () => {
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={localSettings}
          onSettingsChange={vi.fn()}
        />
      );
      const disclaimer = container.querySelector('.llm-disclaimer');
      expect(disclaimer!.textContent).toContain('local server');
      expect(disclaimer!.textContent).toContain('CORS');
    });

    it('calls onSettingsChange with default baseUrl when switching to local', async () => {
      const mockedDiscover = vi.mocked(discoverLocalModels);
      mockedDiscover.mockResolvedValue([{ id: 'llama3', label: 'llama3', contextWindow: 0 }]);

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
      select.value = 'local';
      await fireEvent.change(select);
      expect(onSettingsChange).toHaveBeenCalledWith(
        expect.objectContaining({
          providerId: 'local',
          baseUrl: 'http://localhost:11434/v1',
        })
      );
    });

    it('shows Discover models button and calls discover for local', async () => {
      const mockedDiscover = vi.mocked(discoverLocalModels);
      mockedDiscover.mockResolvedValue([
        { id: 'llama3.2', label: 'llama3.2', contextWindow: 0 },
      ]);

      const onSettingsChange = vi.fn();
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={{ ...localSettings, baseUrl: 'http://localhost:11434/v1' }}
          onSettingsChange={onSettingsChange}
        />
      );

      // The discover button is rendered for local with baseUrl
      const buttons = Array.from(container.querySelectorAll('button'));
      const discoverButton = buttons.find((b) => /Discover/i.test(b.textContent || ''));
      expect(discoverButton).toBeTruthy();

      await fireEvent.click(discoverButton!);
      expect(mockedDiscover).toHaveBeenCalledWith('http://localhost:11434/v1');
    });

    it('populates local models in a dropdown after clicking discover', async () => {
      const mockedDiscover = vi.mocked(discoverLocalModels);
      mockedDiscover.mockResolvedValue([
        { id: 'llama3.2', label: 'llama3.2', contextWindow: 0 },
        { id: 'mistral', label: 'mistral', contextWindow: 0 },
      ]);

      const onSettingsChange = vi.fn();
      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={{ ...localSettings, baseUrl: 'http://localhost:11434/v1' }}
          onSettingsChange={onSettingsChange}
        />
      );

      // Initially should render text input because discover hasn't resolved yet
      let modelEl = container.querySelector('#settings-model')!;
      expect(modelEl.tagName).toBe('INPUT');

      const buttons = Array.from(container.querySelectorAll('button'));
      const discoverButton = buttons.find((b) => /Discover/i.test(b.textContent || ''));
      expect(discoverButton).toBeTruthy();

      await fireEvent.click(discoverButton!);
      // Allow microtasks to execute so state update triggers
      await new Promise((r) => setTimeout(r, 0));

      // Now it should be a select element
      modelEl = container.querySelector('#settings-model')!;
      expect(modelEl.tagName).toBe('SELECT');
      const selectEl = modelEl as HTMLSelectElement;
      expect(selectEl.options).toHaveLength(2);
      expect(selectEl.options[0].value).toBe('llama3.2');
      expect(selectEl.options[1].value).toBe('mistral');
    });

    it('allows toggling between dropdown and manual text input when models are discovered', async () => {
      const mockedDiscover = vi.mocked(discoverLocalModels);
      mockedDiscover.mockResolvedValue([
        { id: 'llama3.2', label: 'llama3.2', contextWindow: 0 },
      ]);

      const { container } = render(
        <SettingsPanel
          open={true}
          onClose={vi.fn()}
          settings={{ ...localSettings, baseUrl: 'http://localhost:11434/v1' }}
          onSettingsChange={vi.fn()}
        />
      );

      const buttons = Array.from(container.querySelectorAll('button'));
      const discoverButton = buttons.find((b) => /Discover/i.test(b.textContent || ''));
      await fireEvent.click(discoverButton!);
      await new Promise((r) => setTimeout(r, 0));

      // Discovered -> Select dropdown should be shown
      let modelEl = container.querySelector('#settings-model')!;
      expect(modelEl.tagName).toBe('SELECT');

      // Click "Enter model manually" button
      const manualButton = Array.from(container.querySelectorAll('button'))
        .find((b) => /Enter model manually/i.test(b.textContent || ''));
      expect(manualButton).toBeTruthy();
      await fireEvent.click(manualButton!);
      await new Promise((r) => setTimeout(r, 0));

      // Now it should be an input text box
      modelEl = container.querySelector('#settings-model')!;
      expect(modelEl.tagName).toBe('INPUT');

      // Click "Choose from discovered models" button
      const chooseButton = Array.from(container.querySelectorAll('button'))
        .find((b) => /Choose from discovered models/i.test(b.textContent || ''));
      expect(chooseButton).toBeTruthy();
      await fireEvent.click(chooseButton!);
      await new Promise((r) => setTimeout(r, 0));

      // Should be select dropdown again
      modelEl = container.querySelector('#settings-model')!;
      expect(modelEl.tagName).toBe('SELECT');
    });
  });
});
