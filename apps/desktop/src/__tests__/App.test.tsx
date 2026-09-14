import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import App from '../App';
import { DesktopProvider } from '../stores/DesktopContext';
import { createMockAdapter } from '../ipc/mock-adapter';
import type { DesktopApi } from '../ipc/types';
import { I18nProvider, ThemeProvider, changeLanguage, i18n } from '@aegis/ui';

function renderApp() {
  const api = createMockAdapter();
  const utils = render(
    <ThemeProvider>
      <I18nProvider>
        <DesktopProvider api={api}>
          <App />
        </DesktopProvider>
      </I18nProvider>
    </ThemeProvider>,
  );
  return { api, ...utils };
}

async function completeSetup(): Promise<void> {
  await screen.findByText('Aegis Agent Setup');
  const installButtons = await screen.findAllByRole('button', { name: 'Install' });
  for (const button of installButtons) {
    fireEvent.click(button);
  }
  fireEvent.click(await screen.findByRole('button', { name: 'Get Started' }));
  await screen.findByRole('heading', { name: 'Dashboard' });
}

afterEach(async () => {
  await act(async () => {
    await changeLanguage('en');
  });
  window.localStorage.clear();
  document.documentElement.classList.remove('dark');
  document.documentElement.lang = 'en';
});

describe('App integration', () => {
  it('shows the setup gate first and reveals the shell after completing setup', async () => {
    renderApp();

    expect(await screen.findByText('Aegis Agent Setup')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();

    await completeSetup();

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByText('Aegis Agent Setup')).not.toBeInTheDocument();
  });

  it('shows an error state instead of an infinite spinner when the setup probe fails', async () => {
    const base = createMockAdapter();
    const api: DesktopApi = {
      ...base,
      getSetup: () => Promise.reject(new Error('backend unavailable')),
    };

    render(
      <ThemeProvider>
        <I18nProvider>
          <DesktopProvider api={api}>
            <App />
          </DesktopProvider>
        </I18nProvider>
      </ThemeProvider>,
    );

    expect(await screen.findByText('Setup could not be loaded')).toBeInTheDocument();
    expect(screen.getAllByText('backend unavailable').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('Checking dependencies...')).not.toBeInTheDocument();
  });

  it('renders the tasks seeded by the adapter, not hardcoded sample data', async () => {
    renderApp();
    await completeSetup();

    fireEvent.click(screen.getByRole('button', { name: /Tasks/ }));
    await screen.findByRole('heading', { name: 'Task List' });

    const invoiceMatches = await screen.findAllByText('Invoice Download');
    expect(invoiceMatches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('CRM Contact Sync').length).toBeGreaterThanOrEqual(1);

    expect(screen.queryByText('Login Test')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard Check')).not.toBeInTheDocument();
    expect(screen.queryByText('Report Generation')).not.toBeInTheDocument();
  });

  it('navigates to every view without crashing', async () => {
    renderApp();
    await completeSetup();

    fireEvent.click(screen.getByRole('button', { name: /Tasks/ }));
    expect(await screen.findByRole('heading', { name: 'Task List' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Action Flow/ }));
    expect(await screen.findByRole('heading', { name: 'Action Flow' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Code Review/ }));
    expect(await screen.findByRole('heading', { name: 'Code Review' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Recorder/ }));
    expect(await screen.findByRole('heading', { name: 'Recorder' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dashboard/ }));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('shows a seeded healing event and dismisses it', async () => {
    renderApp();
    await completeSetup();

    const message = await screen.findByText(/Selector "#contacts" changed/);
    expect(message).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dismiss Selector/ }));
    await waitFor(() => {
      expect(screen.queryByText(/Selector "#contacts" changed/)).not.toBeInTheDocument();
    });
  });

  it('creates a new task through the adapter from the dashboard', async () => {
    renderApp();
    await completeSetup();

    fireEvent.click(screen.getByRole('button', { name: /New Task/ }));
    fireEvent.click(screen.getByRole('button', { name: /Tasks/ }));
    const created = await screen.findAllByText('New Task 4');
    expect(created.length).toBeGreaterThanOrEqual(1);
  });

  it('opens a recorded run from the dashboard in the Action Flow view', async () => {
    renderApp();
    await completeSetup();

    fireEvent.click(screen.getByRole('button', { name: /Action Flow/ }));
    expect(await screen.findByText('No actions recorded yet.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Dashboard/ }));
    const browserCard = await screen.findByRole('button', {
      name: 'View actions for browser run (6 steps)',
    });
    fireEvent.click(browserCard);

    expect(
      await screen.findByText('Viewing recorded run from browser · 6 steps'),
    ).toBeInTheDocument();
    expect(screen.getByText('Navigate: https://portal.example.com')).toBeInTheDocument();
    expect(screen.queryByText('No actions recorded yet.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to live run' }));
    expect(await screen.findByText('No actions recorded yet.')).toBeInTheDocument();
  });

  it('exposes a theme toggle in the shell that flips the document theme', async () => {
    renderApp();
    await completeSetup();

    const toggle = screen.getByTestId('theme-toggle');
    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(toggle);
    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass('dark');
    });
    expect(document.documentElement.style.colorScheme).toBe('light');
  });

  it('switches the visible nav labels between en and ja', async () => {
    renderApp();
    await completeSetup();

    expect(screen.getByRole('button', { name: /Dashboard/ })).toBeInTheDocument();

    const switcher = screen.getByTestId('language-switcher');
    fireEvent.change(switcher, { target: { value: 'ja' } });

    await screen.findByRole('button', { name: i18n.t('nav.dashboard') });
    expect(screen.queryByRole('button', { name: /^Dashboard$/ })).not.toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ja');
  });

  it('keeps a non-English locale after navigating between views', async () => {
    renderApp();
    await completeSetup();

    await act(async () => {
      fireEvent.change(screen.getByTestId('language-switcher'), {
        target: { value: 'ja' },
      });
    });

    await screen.findByRole('button', { name: i18n.t('nav.dashboard') });

    fireEvent.click(screen.getByRole('button', { name: i18n.t('nav.tasks') }));
    expect(await screen.findByRole('heading', { name: i18n.t('tasks.title') })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('nav.review') }));
    expect(await screen.findByRole('heading', { name: i18n.t('review.title') })).toBeInTheDocument();

    expect(i18n.resolvedLanguage).toBe('ja');
    expect(document.documentElement.lang).toBe('ja');
  });

  it('persists the theme choice across a remount', async () => {
    const first = renderApp();
    await completeSetup();

    expect(document.documentElement).toHaveClass('dark');

    fireEvent.click(screen.getByTestId('theme-toggle'));
    await waitFor(() => expect(document.documentElement).not.toHaveClass('dark'));
    expect(window.localStorage.getItem('aegis-theme')).toBe('light');

    first.unmount();

    renderApp();
    await completeSetup();

    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('light');
  });
});
