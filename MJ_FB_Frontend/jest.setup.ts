import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, WritableStream } from 'stream/web';

// Polyfill TextEncoder/Decoder for testing environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as any;
(global as any).ReadableStream = ReadableStream as any;
(global as any).WritableStream = WritableStream as any;
(global as any).clearImmediate =
  (global as any).clearImmediate || ((id: number) => clearTimeout(id));
(global as any).performance = (global as any).performance || ({} as any);
(global as any).performance.markResourceTiming =
  (global as any).performance.markResourceTiming || (() => {});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fetch, Headers, Request, Response, FormData, File } = require('undici');
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
