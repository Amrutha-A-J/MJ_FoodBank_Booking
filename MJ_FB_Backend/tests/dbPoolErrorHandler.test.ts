import pool from '../src/db';
import logger from '../src/utils/logger';

describe('PG pool error handler', () => {
  it('logs idle client errors', () => {
    const err = new Error('idle client error');
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    // Simulate an idle client error from the pool
    (pool as any).emit('error', err);

    expect(spy).toHaveBeenCalledWith('Unexpected PG pool error', err);
    spy.mockRestore();
  });
});
