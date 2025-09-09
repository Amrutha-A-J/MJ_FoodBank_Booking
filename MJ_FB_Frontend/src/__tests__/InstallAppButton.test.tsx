import { render, fireEvent, screen } from '@testing-library/react';
import InstallAppButton from '../components/InstallAppButton';
import { MemoryRouter } from 'react-router-dom';

describe('InstallAppButton', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows button and onboarding on first volunteer visit', () => {
    render(
      <MemoryRouter initialEntries={['/volunteer/dashboard']}>
        <InstallAppButton />
      </MemoryRouter>,
    );
    const prompt = jest.fn().mockResolvedValue(undefined);
    const event = new Event('beforeinstallprompt') as any;
    event.prompt = prompt;
    fireEvent(window, event);

    expect(screen.getByText('Install App')).toBeInTheDocument();
    expect(
      screen.getByText(/Install this app to access volunteer tools offline./i),
    ).toBeInTheDocument();
  });

  it('tracks app installs', () => {
    render(
      <MemoryRouter initialEntries={['/volunteer']}>
        <InstallAppButton />
      </MemoryRouter>,
    );
    const sendBeacon = jest.fn();
    Object.defineProperty(navigator, 'sendBeacon', {
      writable: true,
      value: sendBeacon,
    });

    fireEvent(window, new Event('appinstalled'));
    expect(sendBeacon).toHaveBeenCalledWith('/api/pwa-install');
  });
});
