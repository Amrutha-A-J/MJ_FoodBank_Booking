import { Pool } from 'pg';
import { EventEmitter } from 'events';

// Shared mocked pg Pool for tests that access the database.

const mockPool = new EventEmitter() as unknown as Pool & EventEmitter;

(mockPool as any).query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
(mockPool as any).connect = jest.fn().mockResolvedValue({
  query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  release: jest.fn(),
});

jest.mock('../../src/db', () => ({
  __esModule: true,
  default: mockPool,
}));

export default mockPool;
