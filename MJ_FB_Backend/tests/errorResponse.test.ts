import { buildErrorResponse } from '../src/utils/errorResponse';
import logger from '../src/utils/logger';

describe('buildErrorResponse', () => {
  it('hides internal messages for 500 errors', () => {
    const err = Object.assign(new Error('Sensitive internal details'), {
      status: 500,
      code: 'E_TEST',
    });

    const errorSpy = jest
      .spyOn(logger, 'error')
      .mockImplementation(() => undefined);
    const warnSpy = jest
      .spyOn(logger, 'warn')
      .mockImplementation(() => undefined);

    const { status, body } = buildErrorResponse(err);

    expect(status).toBe(500);
    expect(body.message).toBe('Internal Server Error');
    expect(body.message).not.toContain('Sensitive internal details');
    expect(errorSpy).toHaveBeenCalledWith(
      'Unhandled error:',
      'Sensitive internal details',
      err,
    );
    expect(warnSpy).not.toHaveBeenCalled();

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('logs 4xx errors with warn instead of error', () => {
    const err = Object.assign(new Error('Bad request'), {
      status: 400,
      code: 'E_TEST',
    });

    const errorSpy = jest
      .spyOn(logger, 'error')
      .mockImplementation(() => undefined);
    const warnSpy = jest
      .spyOn(logger, 'warn')
      .mockImplementation(() => undefined);

    const { status, body } = buildErrorResponse(err);

    expect(status).toBe(400);
    expect(body.message).toBe('Bad request');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('Bad request', err);

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
