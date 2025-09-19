import { Request } from 'express';
import { parsePaginationParams } from './parsePaginationParams';

export function parseOptionalPaginationParams(
  req: Request,
  maxLimit: number,
): { limit?: number; offset?: number } {
  const limitParam = req.query.limit;
  const offsetParam = req.query.offset;

  const hasLimit = limitParam !== undefined;
  const hasOffset = offsetParam !== undefined;

  if (!hasLimit && !hasOffset) {
    return {};
  }

  const { limit, offset } = parsePaginationParams(
    { query: { limit: limitParam, offset: offsetParam } } as unknown as Request,
    1,
    maxLimit,
    0,
  );

  const result: { limit?: number; offset?: number } = {};
  if (hasLimit) {
    result.limit = limit;
  }
  if (hasOffset) {
    result.offset = offset;
  }

  return result;
}

export default parseOptionalPaginationParams;
