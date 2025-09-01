import './setupEnv';
import './setupFetch';
import mockDb from './utils/mockDb';

beforeEach(() => {
  (mockDb.query as jest.Mock).mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
  (mockDb.connect as jest.Mock).mockReset().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  });
});
