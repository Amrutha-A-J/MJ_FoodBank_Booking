import mockPool from './utils/mockDb';
import {
  createAgency,
  getAgencyByEmail,
  getAgencyClients,
  addAgencyClient,
  removeAgencyClient,
  isAgencyClient,
  getAgencyClientSet,
} from '../src/models/agency';

describe('agency model', () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('createAgency inserts and returns agency', async () => {
    const agency = {
      id: 1,
      name: 'Test Agency',
      email: 'test@example.com',
      password: null,
      contact_info: null,
      consent: true,
    };
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [agency] });

    const result = await createAgency('Test Agency', 'test@example.com');

    const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
    expect(sql).toMatch(/INSERT INTO agencies/);
    expect(params).toEqual(['Test Agency', 'test@example.com', null]);
    expect(result).toEqual(agency);
  });

  it('getAgencyByEmail queries by email', async () => {
    const agency = {
      id: 2,
      name: 'Example',
      email: 'example@agency.com',
      password: null,
      contact_info: 'info',
      consent: true,
    };
    (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [agency] });

    const result = await getAgencyByEmail('example@agency.com');

    expect(mockPool.query).toHaveBeenCalledWith(
      'SELECT id, name, email, password, contact_info, consent FROM agencies WHERE email = $1',
      ['example@agency.com'],
    );
    expect(result).toEqual(agency);
  });

  describe('getAgencyClients', () => {
    it('applies default pagination', async () => {
      const rows = [
        {
          client_id: 1,
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
        },
      ];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows });

      const result = await getAgencyClients(5);

      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/LIMIT \$2 OFFSET \$3/);
      expect(sql).not.toMatch(/ILIKE/);
      expect(params).toEqual([5, 25, 0]);
      expect(result).toEqual(rows);
    });

    it('supports search with pagination', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await getAgencyClients(7, 'jo', 10, 2);

      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/ILIKE \$2/);
      expect(sql).toMatch(/LIMIT \$3 OFFSET \$4/);
      expect(params).toEqual([7, 'jo%', 10, 2]);
    });
  });

  describe('agency client membership', () => {
    it('addAgencyClient inserts with conflict ignore', async () => {
      await addAgencyClient(1, 2);
      expect(mockPool.query).toHaveBeenCalledWith(
        `INSERT INTO agency_clients (agency_id, client_id) VALUES ($1,$2)
     ON CONFLICT (agency_id, client_id) DO NOTHING`,
        [1, 2],
      );
    });

    it('removeAgencyClient deletes relation', async () => {
      await removeAgencyClient(3, 4);
      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM agency_clients WHERE agency_id=$1 AND client_id=$2',
        [3, 4],
      );
    });

    it('isAgencyClient returns boolean', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 1 });
      await expect(isAgencyClient(1, 2)).resolves.toBe(true);

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0 });
      await expect(isAgencyClient(1, 2)).resolves.toBe(false);
    });

    it('getAgencyClientSet returns set of existing clients', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{ client_id: 1 }, { client_id: 3 }],
      });

      const result = await getAgencyClientSet(9, [1, 2, 3]);

      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/client_id = ANY\(\$2\)/);
      expect(params).toEqual([9, [1, 2, 3]]);
      expect(result).toEqual(new Set([1, 3]));
    });

    it('getAgencyClientSet skips query for empty list', async () => {
      const result = await getAgencyClientSet(1, []);
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(result.size).toBe(0);
    });
  });

  it('propagates query errors', async () => {
    (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await expect(createAgency('Bad', 'bad@example.com')).rejects.toThrow('boom');
  });
});

