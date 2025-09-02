// Unified setup for Jest tests.
import './setupEnv';
import './setupFetch';
import mockPool, { setQueryResults } from './utils/mockDb';

beforeEach(() => {
  (mockPool.query as jest.Mock).mockReset();
  setQueryResults({ rows: [], rowCount: 0 });
});

export {};
