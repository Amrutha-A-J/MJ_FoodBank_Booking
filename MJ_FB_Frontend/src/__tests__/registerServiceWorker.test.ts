import { registerServiceWorker } from '../registerServiceWorker';

describe('registerServiceWorker', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  let registerMock: jest.Mock;

  beforeEach(() => {
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
