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

    const buttons = screen.getAllByText('Install App');
    expect(buttons[0]).toBeInTheDocument();
    expect(
      screen.getByText(/Install this app to access volunteer tools offline./i),
    ).toBeInTheDocument();
  });

  it('shows instructions on iOS devices', () => {
    const originalUA = navigator.userAgent;
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'iPhone',
      configurable: true,
    });
    render(
      <MemoryRouter initialEntries={['/volunteer/dashboard']}>
        <InstallAppButton />
      </MemoryRouter>,
    );

    const buttons = screen.getAllByText('Install App');
    expect(buttons[0]).toBeInTheDocument();
    fireEvent.click(buttons[0]);
    expect(
      screen.getByText(/Add to Home Screen/i),
    ).toBeInTheDocument();
    Object.defineProperty(window.navigator, 'userAgent', {
      value: originalUA,
      configurable: true,
    });
  });

  it('tracks app installs', () => {
    render(
      <MemoryRouter initialEntries={['/volunteer']}>
        <InstallAppButton />
      </MemoryRouter>,
    );
    const originalSendBeacon = navigator.sendBeacon;
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'sendBeacon',
    );
    const sendBeacon = jest.fn();
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: sendBeacon,
    });

    try {
      fireEvent(window, new Event('appinstalled'));
      expect(sendBeacon).toHaveBeenCalledWith('/api/v1/pwa-install');
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(navigator, 'sendBeacon', originalDescriptor);
      } else {
        Object.defineProperty(navigator, 'sendBeacon', {
          configurable: true,
          writable: true,
          value: originalSendBeacon,
        });
      }
    }
  });

  it('hides button when app already installed', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      value: true,
      configurable: true,
    });
    render(
      <MemoryRouter initialEntries={['/volunteer/dashboard']}>
        <InstallAppButton />
      </MemoryRouter>,
    );
    const event = new Event('beforeinstallprompt');
    fireEvent(window, event);
    expect(screen.queryByText('Install App')).toBeNull();
    // cleanup
    delete (window.navigator as any).standalone;
  });
});
