import mockDb from '../utils/mockDb';
import { listEvents, createEvent, updateEvent, deleteEvent } from '../../src/controllers/eventController';
import { updateEvent as updateEventModel } from '../../src/models/event';

jest.mock('../../src/models/event', () => ({
  __esModule: true,
  updateEvent: jest.fn(),
}));

const updateEventModelMock = updateEventModel as jest.Mock;
const connectMock = mockDb.connect as jest.Mock;
const queryMock = mockDb.query as jest.Mock;

describe('eventController', () => {
  beforeEach(() => {
    connectMock.mockReset();
    updateEventModelMock.mockReset();
    queryMock.mockClear();
  });

  describe('listEvents', () => {
    it.each([
      ['volunteer', 'WHERE e.visible_to_volunteers = true'],
      ['shopper', 'WHERE e.visible_to_clients = true'],
      ['delivery', 'WHERE e.visible_to_clients = true'],
    ])('applies %s filter when listing events', async (role, expectedWhere) => {
      queryMock.mockResolvedValue({ rows: [] });
      const req = { user: { role } } as any;
      const res = { json: jest.fn() } as any;

      await listEvents(req, res, jest.fn());

      expect(queryMock).toHaveBeenCalledTimes(1);
      expect(queryMock.mock.calls[0][0]).toContain(expectedWhere);
      expect(res.json).toHaveBeenCalledWith({ today: [], upcoming: [], past: [] });
    });

    it('groups events into past, today, and upcoming', async () => {
      const now = new Date('2024-05-15T12:00:00-06:00');
      jest.useFakeTimers().setSystemTime(now);
      const pastEvent = {
        id: 1,
        title: 'Past',
        details: 'Old event',
        category: 'General',
        startDate: '2024-05-10',
        endDate: '2024-05-11',
        created_at: '2024-05-01',
        updated_at: '2024-05-01',
        createdBy: 5,
        visibleToVolunteers: true,
        visibleToClients: true,
        priority: 0,
        createdByName: 'Staff One',
      };
      const todayEvent = {
        id: 2,
        title: 'Today',
        details: 'Happening now',
        category: 'General',
        startDate: '2024-05-15',
        endDate: '2024-05-16',
        created_at: '2024-05-05',
        updated_at: '2024-05-05',
        createdBy: 5,
        visibleToVolunteers: true,
        visibleToClients: true,
        priority: 1,
        createdByName: 'Staff One',
      };
      const upcomingEvent = {
        id: 3,
        title: 'Future',
        details: 'Coming soon',
        category: 'General',
        startDate: '2024-05-20',
        endDate: '2024-05-21',
        created_at: '2024-05-10',
        updated_at: '2024-05-10',
        createdBy: 6,
        visibleToVolunteers: true,
        visibleToClients: true,
        priority: 2,
        createdByName: 'Staff Two',
      };
      queryMock.mockResolvedValue({ rows: [pastEvent, todayEvent, upcomingEvent] });
      const req = { user: { role: 'staff' } } as any;
      const res = { json: jest.fn() } as any;

      try {
        await listEvents(req, res, jest.fn());
      } finally {
        jest.useRealTimers();
      }

      expect(res.json).toHaveBeenCalledWith({
        today: [todayEvent],
        upcoming: [upcomingEvent],
        past: [pastEvent],
      });
    });
  });

  describe('createEvent', () => {
    it('returns 400 when validation fails', async () => {
      const req = {
        body: {},
        user: { id: 12 },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await createEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        errors: expect.any(Array),
      });
      expect(connectMock).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('rolls back the transaction when insert fails', async () => {
      const insertError = new Error('insert failed');
      const transactionQuery = jest
        .fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(insertError) // insert event
        .mockResolvedValueOnce(undefined); // ROLLBACK
      const release = jest.fn();
      connectMock.mockResolvedValue({
        query: transactionQuery,
        release,
      });
      const req = {
        body: {
          title: 'Cleanup',
          details: 'Neighborhood cleanup',
          category: 'Outreach',
          startDate: '2024-05-20',
          endDate: '2024-05-21',
          visibleToVolunteers: true,
          visibleToClients: false,
          priority: 1,
        },
        user: { id: 42 },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await createEvent(req, res, next);

      expect(transactionQuery).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(transactionQuery).toHaveBeenNthCalledWith(
        2,
        'INSERT INTO events (title, details, category, start_date, end_date, created_by, visible_to_volunteers, visible_to_clients, priority) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
        ['Cleanup', 'Neighborhood cleanup', 'Outreach', '2024-05-20', '2024-05-21', 42, true, false, 1]
      );
      expect(transactionQuery).toHaveBeenNthCalledWith(3, 'ROLLBACK');
      expect(next).toHaveBeenCalledWith(insertError);
      expect(res.status).not.toHaveBeenCalled();
      expect(release).toHaveBeenCalled();
    });
  });

  describe('updateEvent', () => {
    it('returns 400 when id is invalid', async () => {
      const req = {
        params: { id: 'not-a-number' },
        body: {},
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await updateEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid id' });
      expect(updateEventModelMock).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 404 when event is not found', async () => {
      updateEventModelMock.mockResolvedValue(null);
      const req = {
        params: { id: '9' },
        body: {
          title: 'Updated Title',
          category: 'General',
          startDate: '2024-06-01',
          endDate: '2024-06-02',
        },
      } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await updateEvent(req, res, next);

      expect(updateEventModelMock).toHaveBeenCalledWith(9, {
        title: 'Updated Title',
        category: 'General',
        startDate: '2024-06-01',
        endDate: '2024-06-02',
      });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('deleteEvent', () => {
    it('returns 400 when id is invalid', async () => {
      const req = { params: { id: 'abc' } } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await deleteEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid id' });
      expect(queryMock).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 404 when no rows are deleted', async () => {
      queryMock.mockResolvedValue({ rowCount: 0 });
      const req = { params: { id: '7' } } as any;
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as any;
      const next = jest.fn();

      await deleteEvent(req, res, next);

      expect(queryMock).toHaveBeenCalledWith('DELETE FROM events WHERE id = $1', [7]);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Event not found' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
