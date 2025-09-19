import { Request } from 'express';
import { parseOptionalPaginationParams } from '../src/utils/parseOptionalPaginationParams';

describe('parseOptionalPaginationParams', () => {
  function mockReq(query: any): Request {
    return { query } as unknown as Request;
  }

  it('returns an empty object when both parameters are omitted', () => {
    const req = mockReq({});
    expect(parseOptionalPaginationParams(req, 100)).toEqual({});
  });

  it('parses limit when provided', () => {
    const req = mockReq({ limit: '5' });
    expect(parseOptionalPaginationParams(req, 10)).toEqual({ limit: 5 });
  });

  it('parses offset when provided', () => {
    const req = mockReq({ offset: '15' });
    expect(parseOptionalPaginationParams(req, 10)).toEqual({ offset: 15 });
  });

  it('caps limit at the provided maxLimit', () => {
    const req = mockReq({ limit: '50' });
    expect(parseOptionalPaginationParams(req, 25)).toEqual({ limit: 25 });
  });

  it('throws on invalid limit', () => {
    const req = mockReq({ limit: 'foo' });
    expect(() => parseOptionalPaginationParams(req, 10)).toThrow('Invalid limit');
  });

  it('throws on invalid offset', () => {
    const req = mockReq({ offset: '-1' });
    expect(() => parseOptionalPaginationParams(req, 10)).toThrow('Invalid offset');
  });
});
