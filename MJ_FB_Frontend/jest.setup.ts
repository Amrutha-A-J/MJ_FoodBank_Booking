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

// Polyfill TextEncoder/Decoder for testing environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as any;
(global as any).ReadableStream = ReadableStream as any;
(global as any).WritableStream = WritableStream as any;
(global as any).performance = (global as any).performance || ({} as any);
(global as any).performance.markResourceTiming =
  (global as any).performance.markResourceTiming || (() => {});

// Use Node's timer implementations so undici's fast timers have refresh(). Some
// environments (for example, JSDOM's window timers) still return numeric IDs
// which lack `ref`, `unref`, and `refresh`. Wrap those values in tiny objects
// providing the no-op methods so consumers expecting Node handles do not throw.
const wrapTimerHandle = <T>(handle: T): T => {
  if (typeof handle === 'number') {
    const wrapper: any = {
      id: handle,
      ref: () => wrapper,
      unref: () => wrapper,
      refresh: () => wrapper,
      valueOf: () => handle,
      [Symbol.toPrimitive]: () => handle,
    };
    return wrapper as T;
  }
  return handle;
};

const unwrapTimerHandle = (handle: unknown): unknown => {
  if (
    handle &&
    typeof handle === 'object' &&
    'id' in (handle as Record<string, unknown>) &&
    typeof (handle as Record<string, unknown>).id === 'number'
  ) {
    return (handle as Record<string, unknown>).id;
  }
  return handle;
};

const createTimer = <Args extends unknown[]>(timer: (...args: Args) => unknown) =>
  (...args: Args) => wrapTimerHandle(timer(...args));

const createClearTimer = (clearTimer: (handle: unknown) => void) =>
  (handle: unknown) => clearTimer(unwrapTimerHandle(handle));

const timers = {
  setTimeout: createTimer(nodeSetTimeout),
  clearTimeout: createClearTimer(nodeClearTimeout),
  setInterval: createTimer(nodeSetInterval),
  clearInterval: createClearTimer(nodeClearInterval),
  setImmediate: createTimer(nodeSetImmediate),
  clearImmediate: createClearTimer(nodeClearImmediate),
};

const assignTimers = (target: Record<string, unknown>) => {
  Object.entries(timers).forEach(([key, value]) => {
    target[key] = value;
  });
};

assignTimers(globalThis as unknown as Record<string, unknown>);
assignTimers(global as unknown as Record<string, unknown>);
if (typeof window !== 'undefined') {
  assignTimers(window as unknown as Record<string, unknown>);
}

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
