import { buildErrorResponse } from '../src/utils/errorResponse';
import logger from '../src/utils/logger';

describe('buildErrorResponse', () => {
  it('hides internal messages for 500 errors', () => {
    const err = Object.assign(new Error('Sensitive internal details'), {
      status: 500,
      code: 'E_TEST',
    });

    const spy = jest.spyOn(logger, 'error').mockImplementation(() => undefined);

    const { status, body } = buildErrorResponse(err);

    expect(status).toBe(500);
    expect(body.message).toBe('Internal Server Error');
    expect(body.message).not.toContain('Sensitive internal details');
    expect(spy).toHaveBeenCalledWith('Unhandled error:', 'Sensitive internal details', err);

    spy.mockRestore();
  });
});
