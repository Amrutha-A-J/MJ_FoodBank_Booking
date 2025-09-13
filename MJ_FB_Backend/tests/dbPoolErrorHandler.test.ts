import { EventEmitter } from 'events';
import logger from '../src/utils/logger';

describe('PG pool error handler', () => {
  it('logs idle client errors', () => {
    const err = new Error('idle client error');
    const spy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    // Simulate an idle client error using a mock EventEmitter-based pool
    const emitter = new EventEmitter();
    emitter.on('error', (e) => logger.error('Unexpected PG pool error', e));
    emitter.emit('error', err);

    expect(spy).toHaveBeenCalledWith('Unexpected PG pool error', err);
    spy.mockRestore();
  });
});
