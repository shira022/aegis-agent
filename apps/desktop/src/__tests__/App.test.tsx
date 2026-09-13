import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from '../App';
import { DesktopProvider } from '../stores/DesktopContext';
import { createMockAdapter } from '../ipc/mock-adapter';

function renderApp() {
  const api = createMockAdapter();
  const utils = render(
    <DesktopProvider api={api}>
      <App />
    </DesktopProvider>,
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

describe('App integration', () => {
  it('shows the setup gate first and reveals the shell after completing setup', async () => {
    renderApp();

    expect(await screen.findByText('Aegis Agent Setup')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();

    await completeSetup();

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.queryByText('Aegis Agent Setup')).not.toBeInTheDocument();
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
      await screen.findByText('Viewing recorded run from browser · 6 step(s)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Navigate: https://portal.example.com')).toBeInTheDocument();
    expect(screen.queryByText('No actions recorded yet.')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back to live run' }));
    expect(await screen.findByText('No actions recorded yet.')).toBeInTheDocument();
  });
});
