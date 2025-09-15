import mockPool from './utils/mockDb';
import { createEvent, updateEvent, listEvents } from '../src/models/event';

describe('event model', () => {
  afterEach(() => {
    (mockPool.query as jest.Mock).mockReset();
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [], rowCount: 0 });
  });

  describe('createEvent', () => {
    it('inserts and returns event', async () => {
      const event = {
        id: 1,
        title: 'Food Drive',
        details: 'Details',
        category: 'general',
        start_date: '2024-05-20',
        end_date: '2024-05-21',
        created_by: 2,
        visible_to_volunteers: true,
        visible_to_clients: false,
        priority: 1,
        created_at: '2024-05-01',
        updated_at: '2024-05-01',
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [event] });

      const result = await createEvent({
        title: 'Food Drive',
        details: 'Details',
        category: 'general',
        startDate: '2024-05-20',
        endDate: '2024-05-21',
        createdBy: 2,
        visibleToVolunteers: true,
        visibleToClients: false,
        priority: 1,
      });

      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/INSERT INTO events/);
      expect(params).toEqual([
        'Food Drive',
        'Details',
        'general',
        '2024-05-20',
        '2024-05-21',
        2,
        true,
        false,
        1,
      ]);
      expect(result).toEqual(event);
    });

    it('propagates query errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('db'));
      await expect(
        createEvent({
          title: 'X',
          startDate: '2024-05-20',
          endDate: '2024-05-21',
          createdBy: 1,
        }),
      ).rejects.toThrow('db');
    });
  });

  describe('updateEvent', () => {
    it('updates and returns event', async () => {
      const event = {
        id: 5,
        title: 'Updated',
        details: null,
        category: null,
        start_date: '2024-05-20',
        end_date: '2024-05-21',
        created_by: 2,
        visible_to_volunteers: true,
        visible_to_clients: false,
        priority: 2,
        created_at: '2024-05-01',
        updated_at: '2024-05-02',
      };
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [event] });

      const result = await updateEvent(5, {
        title: 'Updated',
        visibleToVolunteers: true,
      });

      const [sql, params] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toMatch(/UPDATE events SET/);
      expect(sql).toMatch(/title = \$1/);
      expect(sql).toMatch(/visible_to_volunteers = \$2/);
      expect(sql).toMatch(/WHERE id = \$3 RETURNING \*/);
      expect(params).toEqual(['Updated', true, 5]);
      expect(result).toEqual(event);
    });

    it('propagates query errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      await expect(updateEvent(1, { title: 'x' })).rejects.toThrow('fail');
    });
  });

  describe('listEvents', () => {
    it('returns events', async () => {
      const events = [
        {
          id: 1,
          title: 'Event',
          details: null,
          category: null,
          start_date: '2024-05-20',
          end_date: '2024-05-21',
          created_by: 2,
          visible_to_volunteers: false,
          visible_to_clients: true,
          priority: 0,
          created_at: '2024-05-01',
          updated_at: '2024-05-01',
        },
      ];
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: events });

      const result = await listEvents();

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM events ORDER BY start_date',
      );
      expect(result).toEqual(events);
    });

    it('propagates query errors', async () => {
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('boom'));
      await expect(listEvents()).rejects.toThrow('boom');
    });
  });
});

