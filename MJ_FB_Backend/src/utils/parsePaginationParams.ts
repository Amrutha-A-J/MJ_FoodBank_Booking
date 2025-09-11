import { Request } from 'express';

export function parsePaginationParams(
  req: Request,
  defaultLimit: number,
  maxLimit: number,
  defaultOffset = 0,
): { limit: number; offset: number } {
  const limitParam = req.query.limit as string | undefined;
  const offsetParam = req.query.offset as string | undefined;

  let limit = defaultLimit;
  if (limitParam !== undefined) {
    const parsedLimit = Number(limitParam);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
      throw new Error('Invalid limit');
    }
    limit = Math.min(parsedLimit, maxLimit);
  }

  let offset = defaultOffset;
  if (offsetParam !== undefined) {
    const parsedOffset = Number(offsetParam);
    if (!Number.isFinite(parsedOffset) || parsedOffset < 0) {
      throw new Error('Invalid offset');
    }
    offset = parsedOffset;
  }

  return { limit, offset };
}

export default parsePaginationParams;
