import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/Decoder for testing environment
(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder as any;
(Element.prototype as any).scrollIntoView = jest.fn();
(global as any).VITE_API_BASE = 'http://localhost:4000';
