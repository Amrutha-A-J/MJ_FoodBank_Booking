// Unified setup for Jest tests.
import './setupFetch';
import mockPool, { setQueryResults } from './utils/mockDb';

jest.mock('../src/utils/opsAlert', () => ({
  alertOps: jest.fn(),
  notifyOps: jest.fn(),
}));
jest.mock('../src/utils/configCache', () => ({
  getCartTare: jest.fn().mockResolvedValue(0),
  refreshCartTare: jest.fn(),
  setCartTare: jest.fn(),
}));
jest.mock('../src/controllers/pantry/pantryAggregationController', () => ({
  refreshPantryWeekly: jest.fn(),
  refreshPantryMonthly: jest.fn(),
  refreshPantryYearly: jest.fn(),
  listAvailableYears: jest.fn(),
  listAvailableMonths: jest.fn(),
  listAvailableWeeks: jest.fn(),
  manualPantryAggregate: jest.fn(),
  firstMondayOfMonth: jest.fn(),
}));
jest.mock('../src/utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
import { notifyOps } from '../src/utils/opsAlert';
import logger from '../src/utils/logger';

beforeEach(() => {
  (mockPool.query as jest.Mock).mockReset();
  setQueryResults({ rows: [], rowCount: 0 });
  (notifyOps as jest.Mock).mockReset();
  (logger.info as jest.Mock).mockReset();
  (logger.warn as jest.Mock).mockReset();
  (logger.error as jest.Mock).mockReset();
  (logger.debug as jest.Mock).mockReset();
});

export {};
