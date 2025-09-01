import { registerServiceWorker } from '../registerServiceWorker';

describe('registerServiceWorker', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let registerMock: jest.Mock;
  let originalSecure: boolean;

  beforeEach(() => {
    originalSecure = window.isSecureContext;
    registerMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: registerMock },
      configurable: true,
    });
    (import.meta as any).env = {};
  });

  afterEach(() => {
    Object.defineProperty(window, 'isSecureContext', { value: originalSecure, configurable: true });
    process.env.NODE_ENV = originalNodeEnv;
    // @ts-ignore
    delete navigator.serviceWorker;
  });

  it('registers the service worker in production mode', () => {
    process.env.NODE_ENV = 'production';
    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    expect(registerMock).toHaveBeenCalledWith('/sw.js');
  });

  it('skips registration when not in production mode', () => {
    process.env.NODE_ENV = 'development';
    registerServiceWorker();
    window.dispatchEvent(new Event('load'));
    expect(registerMock).not.toHaveBeenCalled();
  });
});
