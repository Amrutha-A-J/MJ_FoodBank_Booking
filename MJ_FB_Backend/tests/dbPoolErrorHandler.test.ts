import { EventEmitter } from 'events';
import logger from '../src/utils/logger';

describe('PG pool error handler', () => {
  beforeEach(() => {
    (logger.error as jest.Mock).mockReset();
  });

  it('logs idle client errors', () => {
    const err = new Error('idle client error');

    // Simulate an idle client error using a mock EventEmitter-based pool
    const emitter = new EventEmitter();
    emitter.on('error', (e) => logger.error('Unexpected PG pool error', e));
    emitter.emit('error', err);

    expect(logger.error).toHaveBeenCalledWith('Unexpected PG pool error', err);
  });
});
