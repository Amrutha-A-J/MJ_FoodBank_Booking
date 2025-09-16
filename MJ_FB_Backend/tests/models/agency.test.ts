import mockPool from '../utils/mockDb';
import { getAgencyByEmail, getAgencyForClient } from '../../src/models/agency';

describe('models/agency', () => {
  const queryMock = mockPool.query as jest.Mock;

  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('fetches an agency by email', async () => {
    const agency = {
      id: 12,
      name: 'Helping Hands',
      email: 'helping@example.com',
      password: null,
      contact_info: '123 Main St',
      consent: true,
    };
    queryMock.mockResolvedValueOnce({ rows: [agency], rowCount: 1 });

    const result = await getAgencyByEmail(agency.email);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toBe(
      'SELECT id, name, email, password, contact_info, consent FROM agencies WHERE email = $1',
    );
    expect(params).toEqual([agency.email]);
    expect(result).toEqual(agency);
  });

  it('returns undefined when agency email is not found', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await getAgencyByEmail('missing@example.com');

    expect(queryMock).toHaveBeenCalledWith(
      'SELECT id, name, email, password, contact_info, consent FROM agencies WHERE email = $1',
      ['missing@example.com'],
    );
    expect(result).toBeUndefined();
  });

  it('fetches the agency associated with a client', async () => {
    const agencySummary = { id: 7, name: 'Community Kitchen' };
    queryMock.mockResolvedValueOnce({ rows: [agencySummary], rowCount: 1 });

    const result = await getAgencyForClient(42);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('FROM agency_clients ac');
    expect(sql).toContain('INNER JOIN agencies a ON a.id = ac.agency_id');
    expect(sql).toContain('WHERE ac.client_id = $1');
    expect(params).toEqual([42]);
    expect(result).toEqual(agencySummary);
  });

  it('returns undefined when the client has no linked agency', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await getAgencyForClient(99);

    expect(queryMock).toHaveBeenCalledTimes(1);
    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain('FROM agency_clients ac');
    expect(params).toEqual([99]);
    expect(result).toBeUndefined();
  });

  it('propagates database errors', async () => {
    queryMock.mockRejectedValueOnce(new Error('database offline'));

    await expect(getAgencyByEmail('error@example.com')).rejects.toThrow('database offline');
  });
});
