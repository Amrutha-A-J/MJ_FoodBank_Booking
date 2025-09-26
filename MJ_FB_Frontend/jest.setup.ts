import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, WritableStream } from 'stream/web';
import {
  setTimeout as nodeSetTimeout,
  clearTimeout as nodeClearTimeout,
  setInterval as nodeSetInterval,
  clearInterval as nodeClearInterval,
  setImmediate as nodeSetImmediate,
  clearImmediate as nodeClearImmediate,
} from 'timers';

type TimerHandleObject = {
  __timerId?: unknown;
  ref?: () => unknown;
  unref?: () => unknown;
  refresh?: () => unknown;
};

const ensureTimerMethods = (handle: unknown) => {
  if (handle && typeof handle === 'object') {
    const timerObject = handle as TimerHandleObject;
    if (typeof timerObject.ref !== 'function') {
      timerObject.ref = function ref() {
        return this;
      };
    }
    if (typeof timerObject.unref !== 'function') {
      timerObject.unref = function unref() {
        return this;
      };
    }
    if (typeof timerObject.refresh !== 'function') {
      timerObject.refresh = function refresh() {
        return this;
      };
    }
    return timerObject;
  }

  const wrapper: TimerHandleObject = {
    __timerId: handle,
    ref() {
      return this;
    },
    unref() {
      return this;
    },
    refresh() {
      return this;
    },
  } satisfies Record<string, unknown>;

  return wrapper;
};

const unwrapTimerHandle = (handle: unknown) => {
  if (handle && typeof handle === 'object' && '__timerId' in handle) {
    return (handle as { __timerId: unknown }).__timerId;
  }

  return handle;
};

const assignNodeTimers = (target: unknown) => {
  if (!target || typeof target !== 'object') {
    return;
  }

  const host = target as Record<string, any>;

  host.setTimeout = (...args: any[]) => ensureTimerMethods(nodeSetTimeout(...args));
  host.setInterval = (...args: any[]) => ensureTimerMethods(nodeSetInterval(...args));
  host.setImmediate = (...args: any[]) => ensureTimerMethods(nodeSetImmediate(...args));
  host.clearTimeout = (handle?: unknown) => nodeClearTimeout(unwrapTimerHandle(handle));
  host.clearInterval = (handle?: unknown) => nodeClearInterval(unwrapTimerHandle(handle));
  host.clearImmediate = (handle?: unknown) => nodeClearImmediate(unwrapTimerHandle(handle));
};

const timerTargets = new Set<unknown>();
timerTargets.add(globalThis);
// Jest still exposes `global`, but guard the reference so the setup is resilient outside Node.
if (typeof global !== 'undefined') {
  timerTargets.add(global);
}
const maybeWindow = (globalThis as Record<string, unknown>).window;
if (maybeWindow && typeof maybeWindow === 'object') {
  timerTargets.add(maybeWindow);
}

for (const target of timerTargets) {
  assignNodeTimers(target);
}

// Polyfill TextEncoder/Decoder for testing environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as any;
(global as any).ReadableStream = ReadableStream as any;
(global as any).WritableStream = WritableStream as any;
(global as any).performance = (global as any).performance || ({} as any);
(global as any).performance.markResourceTiming =
  (global as any).performance.markResourceTiming || (() => {});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  fetch,
  Headers,
  Request,
  Response,
  FormData,
  File,
  setGlobalDispatcher,
  getGlobalDispatcher,
  Agent,
} = require('undici');
const previousDispatcher = typeof getGlobalDispatcher === 'function' ? getGlobalDispatcher() : undefined;
const testDispatcher =
  typeof setGlobalDispatcher === 'function' && typeof Agent === 'function'
    ? new Agent({ keepAliveTimeout: 1, keepAliveTimeoutThreshold: 1 })
    : undefined;
if (testDispatcher && typeof setGlobalDispatcher === 'function') {
  setGlobalDispatcher(testDispatcher);
}
let dispatcherClosed = false;
(Element.prototype as any).scrollIntoView = jest.fn();
if (!process.env.VITE_API_BASE) {
  process.env.VITE_API_BASE = 'http://localhost:4000/api/v1';
}
(globalThis as any).VITE_API_BASE = process.env.VITE_API_BASE;

// Polyfill matchMedia for testing environment with modern and legacy listeners
const originalMatchMedia = window.matchMedia;
if (!window.matchMedia) {
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
}
afterAll(() => {
  window.matchMedia = originalMatchMedia;
  if (testDispatcher && !dispatcherClosed) {
    dispatcherClosed = true;
    try {
      testDispatcher.close().catch(() => {});
    } catch {}
    if (previousDispatcher && typeof setGlobalDispatcher === 'function') {
      setGlobalDispatcher(previousDispatcher);
    }
  }
});

beforeAll(() => {
  (global as any).fetch = fetch;
  (global as any).Headers = Headers as any;
  (global as any).Request = Request as any;
  (global as any).Response = Response as any;
  (global as any).FormData = FormData as any;
  (global as any).File = File as any;
});

// Mock ResizeObserver and IntersectionObserver for testing environment
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).ResizeObserver = ResizeObserver;

class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(global as any).IntersectionObserver = IntersectionObserver;
