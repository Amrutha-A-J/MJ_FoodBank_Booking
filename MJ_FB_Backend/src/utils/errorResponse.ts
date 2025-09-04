import logger from './logger';

export interface ErrorResponse {
  status: number;
  body: {
    message: string;
    error: { code: string; message: string };
    stack?: string;
  };
}

export function buildErrorResponse(err: unknown): ErrorResponse {
  const status =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as any).status === 'number'
      ? (err as any).status
      : typeof err === 'object' &&
        err !== null &&
        'statusCode' in err &&
        typeof (err as any).statusCode === 'number'
      ? (err as any).statusCode
      : 500;

  const originalMessage =
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as any).message === 'string'
      ? (err as any).message
      : 'Unknown error';

  const code =
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as any).code === 'string'
      ? (err as any).code
      : 'UNKNOWN';

  logger.error('Unhandled error:', originalMessage, err);

  const safeMessage = status === 500 ? 'Internal Server Error' : originalMessage;

  const body: ErrorResponse['body'] = {
    message: safeMessage,
    error: { code, message: safeMessage },
  };

  if (
    process.env.NODE_ENV !== 'production' &&
    typeof err === 'object' &&
    err !== null &&
    'stack' in err &&
    typeof (err as any).stack === 'string'
  ) {
    body.stack = (err as any).stack;
  }

  return { status, body };
}
