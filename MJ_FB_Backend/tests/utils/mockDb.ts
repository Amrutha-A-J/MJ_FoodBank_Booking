import { Pool } from 'pg';

const pool = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  }),
  end: jest.fn(),
} as unknown as Pool;

jest.mock('../../src/db', () => ({ __esModule: true, default: pool }));

export default pool;
