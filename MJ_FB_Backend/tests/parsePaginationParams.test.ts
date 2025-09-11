import { Request } from 'express';
import { parsePaginationParams } from '../src/utils/parsePaginationParams';

describe('parsePaginationParams', () => {
  function mockReq(query: any): Request {
    return { query } as unknown as Request;
  }

  it('uses defaults when parameters are absent', () => {
    const req = mockReq({});
    expect(parsePaginationParams(req, 25, 100)).toEqual({ limit: 25, offset: 0 });
  });

  it('parses valid limit and offset', () => {
    const req = mockReq({ limit: '5', offset: '10' });
    expect(parsePaginationParams(req, 25, 100)).toEqual({ limit: 5, offset: 10 });
  });

  it('caps limit at maxLimit', () => {
    const req = mockReq({ limit: '200' });
    expect(parsePaginationParams(req, 25, 100)).toEqual({ limit: 100, offset: 0 });
  });

  it('throws on invalid limit', () => {
    const req = mockReq({ limit: 'foo' });
    expect(() => parsePaginationParams(req, 25, 100)).toThrow('Invalid limit');
  });

  it('throws on invalid offset', () => {
    const req = mockReq({ offset: '-1' });
    expect(() => parsePaginationParams(req, 25, 100)).toThrow('Invalid offset');
  });
});
