import { Pool } from 'pg';

// Shared mocked pg Pool for tests that access the database.

const mockPool = {
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  connect: jest.fn().mockResolvedValue({
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    release: jest.fn(),
  }),
} as unknown as Pool;

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: mockPool,
}));

export default mockPool;
