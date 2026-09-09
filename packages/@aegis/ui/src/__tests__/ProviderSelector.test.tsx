import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderSelector } from '../ProviderSelector/ProviderSelector';
import { PROVIDER_REGISTRY, type ProviderId } from '@aegis/shared';

describe('ProviderSelector', () => {
  const defaultProps = {
    onProviderChange: vi.fn(),
    onSettingsChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 9 providers grouped by category', () => {
    render(<ProviderSelector {...defaultProps} />);

    // Cloud section
    expect(screen.getByTestId('category-cloud')).toBeTruthy();
    expect(screen.getByTestId('provider-card-openai')).toBeTruthy();
    expect(screen.getByTestId('provider-card-anthropic')).toBeTruthy();
    expect(screen.getByTestId('provider-card-google')).toBeTruthy();
    expect(screen.getByTestId('provider-card-aws-bedrock')).toBeTruthy();
    expect(screen.getByTestId('provider-card-azure-foundry')).toBeTruthy();
    expect(screen.getByTestId('provider-card-gcp-vertexai')).toBeTruthy();

    // Local section
    expect(screen.getByTestId('category-local')).toBeTruthy();
    expect(screen.getByTestId('provider-card-ollama')).toBeTruthy();
    expect(screen.getByTestId('provider-card-lm-studio')).toBeTruthy();

    // Compatible section
    expect(screen.getByTestId('category-compatible')).toBeTruthy();
    expect(screen.getByTestId('provider-card-openai-compatible')).toBeTruthy();
  });

  it('clicking a card calls onProviderChange with correct ID', () => {
    render(<ProviderSelector {...defaultProps} />);
    fireEvent.click(screen.getByTestId('provider-card-ollama'));
    expect(defaultProps.onProviderChange).toHaveBeenCalledWith('ollama');
  });

  it('region input appears for AWS Bedrock / Azure / GCP', () => {
    const { rerender } = render(<ProviderSelector {...defaultProps} />);

    rerender(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="aws-bedrock"
      />,
    );
    expect(screen.getByTestId('region-input')).toBeTruthy();

    rerender(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="azure-foundry"
      />,
    );
    expect(screen.getByTestId('region-input')).toBeTruthy();

    rerender(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="gcp-vertexai"
      />,
    );
    expect(screen.getByTestId('region-input')).toBeTruthy();
  });

  it('region input does NOT appear for non-region providers', () => {
    render(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="openai"
      />,
    );
    expect(screen.queryByTestId('region-input')).toBeNull();
  });

  it('project ID input appears only for GCP Vertex AI', () => {
    const { rerender } = render(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="openai"
      />,
    );
    expect(screen.queryByTestId('project-id-input')).toBeNull();

    rerender(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="gcp-vertexai"
      />,
    );
    expect(screen.getByTestId('project-id-input')).toBeTruthy();
  });

  it('base URL input appears for local and compatible providers', () => {
    const { rerender } = render(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="ollama"
      />,
    );
    expect(screen.getByTestId('base-url-input')).toBeTruthy();

    rerender(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="lm-studio"
      />,
    );
    expect(screen.getByTestId('base-url-input')).toBeTruthy();

    rerender(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="openai-compatible"
      />,
    );
    expect(screen.getByTestId('base-url-input')).toBeTruthy();
  });

  it('base URL input does NOT appear for cloud providers', () => {
    render(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="anthropic"
      />,
    );
    expect(screen.queryByTestId('base-url-input')).toBeNull();
  });

  it('model dropdown shows correct models for selected provider', () => {
    render(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="anthropic"
      />,
    );
    const select = screen.getByTestId('model-select') as HTMLSelectElement;
    expect(select.value).toBe('claude-sonnet-4-20250514');
    expect(select.options.length).toBe(3);
  });

  it('API key input has mask toggle', () => {
    render(
      <ProviderSelector
        {...defaultProps}
        selectedProvider="openai"
      />,
    );
    const input = screen.getByTestId('api-key-input') as HTMLInputElement;
    expect(input.type).toBe('password');

    fireEvent.click(screen.getByTestId('api-key-toggle'));
    expect(input.type).toBe('text');

    fireEvent.click(screen.getByTestId('api-key-toggle'));
    expect(input.type).toBe('password');
  });

  it('displays correct display names from PROVIDER_REGISTRY', () => {
    render(<ProviderSelector {...defaultProps} />);
    for (const [id, config] of Object.entries(PROVIDER_REGISTRY)) {
      expect(screen.getByText(config.displayName)).toBeTruthy();
    }
  });
});
