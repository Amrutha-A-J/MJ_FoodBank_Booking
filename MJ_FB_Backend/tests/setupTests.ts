// Unified setup for Jest tests.
import './setupFetch';
import mockPool, { setQueryResults } from './utils/mockDb';

jest.mock('../src/utils/opsAlert', () => ({
  alertOps: jest.fn(),
  notifyOps: jest.fn(),
}));
import { notifyOps } from '../src/utils/opsAlert';

beforeEach(() => {
  (mockPool.query as jest.Mock).mockReset();
  setQueryResults({ rows: [], rowCount: 0 });
  (notifyOps as jest.Mock).mockReset();
});

export {};
