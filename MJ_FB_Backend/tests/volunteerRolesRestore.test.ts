import request from 'supertest';
import express from 'express';
import mockDb from '../tests/utils/mockDb';

const DEFAULT_MASTER_ROLES = [
  { id: 1, name: 'Pantry' },
  { id: 2, name: 'Warehouse' },
  { id: 3, name: 'Gardening' },
  { id: 4, name: 'Administration' },
  { id: 5, name: 'Special Events' },
];

const DEFAULT_ROLES = [
  { id: 1, name: 'Food Sorter', category_id: 2 },
  { id: 2, name: 'Production Worker', category_id: 2 },
  { id: 3, name: 'Driver Assistant', category_id: 2 },
  { id: 4, name: 'Loading Dock Personnel', category_id: 2 },
  { id: 5, name: 'General Cleaning & Maintenance', category_id: 2 },
  { id: 6, name: 'Reception', category_id: 1 },
  { id: 7, name: 'Greeter / Pantry Assistant', category_id: 1 },
  { id: 8, name: 'Stock Person', category_id: 1 },
  { id: 9, name: 'Gardening Assistant', category_id: 3 },
  { id: 10, name: 'Event Organizer', category_id: 5 },
  { id: 11, name: 'Event Resource Specialist', category_id: 5 },
  { id: 12, name: 'Volunteer Marketing Associate', category_id: 4 },
  { id: 13, name: 'Client Resource Associate', category_id: 4 },
  { id: 14, name: 'Assistant Volunteer Coordinator', category_id: 4 },
  { id: 15, name: 'Volunteer Office Administrator', category_id: 4 },
];

const DEFAULT_SLOTS = [
  { role_id: 1, start_time: '09:00:00', end_time: '12:00:00', max_volunteers: 3, is_wednesday_slot: false },
  { role_id: 2, start_time: '09:00:00', end_time: '12:00:00', max_volunteers: 3, is_wednesday_slot: false },
  { role_id: 3, start_time: '09:00:00', end_time: '12:00:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 4, start_time: '09:00:00', end_time: '12:00:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 5, start_time: '08:00:00', end_time: '11:00:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 6, start_time: '09:00:00', end_time: '12:00:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 6, start_time: '12:30:00', end_time: '15:30:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 6, start_time: '15:30:00', end_time: '18:30:00', max_volunteers: 1, is_wednesday_slot: true },
  { role_id: 7, start_time: '09:00:00', end_time: '12:00:00', max_volunteers: 3, is_wednesday_slot: false },
  { role_id: 7, start_time: '12:30:00', end_time: '15:30:00', max_volunteers: 3, is_wednesday_slot: false },
  { role_id: 7, start_time: '15:30:00', end_time: '18:30:00', max_volunteers: 3, is_wednesday_slot: true },
  { role_id: 7, start_time: '16:30:00', end_time: '19:30:00', max_volunteers: 3, is_wednesday_slot: true },
  { role_id: 8, start_time: '08:00:00', end_time: '11:00:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 8, start_time: '12:00:00', end_time: '15:00:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 9, start_time: '13:00:00', end_time: '16:00:00', max_volunteers: 2, is_wednesday_slot: false },
  { role_id: 10, start_time: '09:00:00', end_time: '17:00:00', max_volunteers: 5, is_wednesday_slot: false },
  { role_id: 11, start_time: '09:00:00', end_time: '17:00:00', max_volunteers: 5, is_wednesday_slot: false },
  { role_id: 12, start_time: '08:00:00', end_time: '16:00:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 13, start_time: '08:00:00', end_time: '16:00:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 14, start_time: '08:00:00', end_time: '16:00:00', max_volunteers: 1, is_wednesday_slot: false },
  { role_id: 15, start_time: '08:00:00', end_time: '16:00:00', max_volunteers: 1, is_wednesday_slot: false },
];

let masterRoles: any[] = [];
let roles: any[] = [];
let slots: any[] = [];
let trained: any[] = [];
let tempTrained: any[] = [];

const mockQuery = jest.fn(async (sql: string) => {
  if (sql.startsWith('BEGIN') || sql.startsWith('COMMIT') || sql.startsWith('ROLLBACK')) {
    return { rows: [], rowCount: 0 };
  }
  if (sql.startsWith('CREATE TEMP TABLE')) {
    tempTrained = trained.map(t => ({ ...t }));
    return { rows: [], rowCount: tempTrained.length };
  }
  if (sql.includes('TRUNCATE volunteer_slots')) {
    masterRoles = [];
    roles = [];
    slots = [];
    return { rows: [], rowCount: 0 };
  }
  if (sql.includes('INSERT INTO volunteer_master_roles')) {
    masterRoles = DEFAULT_MASTER_ROLES.map(r => ({ ...r }));
    return { rows: [], rowCount: masterRoles.length };
  }
  if (sql.includes("SELECT setval('volunteer_master_roles_id_seq'")) {
    return { rows: [], rowCount: 0 };
  }
  if (sql.includes('INSERT INTO volunteer_roles')) {
    roles = DEFAULT_ROLES.map(r => ({ ...r }));
    return { rows: [], rowCount: roles.length };
  }
  if (sql.includes("SELECT setval('volunteer_roles_id_seq'")) {
    return { rows: [], rowCount: 0 };
  }
  if (sql.includes('INSERT INTO volunteer_slots')) {
    slots = DEFAULT_SLOTS.map((s, idx) => ({ slot_id: idx + 1, ...s }));
    return { rows: [], rowCount: slots.length };
  }
  if (sql.includes('INSERT INTO volunteer_trained_roles')) {
    trained = tempTrained
      .filter(t => roles.find(r => r.id === t.role_id))
      .map(t => ({
        volunteer_id: t.volunteer_id,
        role_id: t.role_id,
        category_id: roles.find(r => r.id === t.role_id)!.category_id,
      }));
    return { rows: [], rowCount: trained.length };
  }
  return { rows: [], rowCount: 0 };
});

const mockConnect = jest.fn(async () => ({ query: mockQuery, release: jest.fn() }));

(mockDb.query as jest.Mock).mockImplementation((sql: string) => mockQuery(sql));
(mockDb.connect as jest.Mock).mockImplementation(mockConnect);

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const volunteerRolesRouter = require('../src/routes/volunteer/volunteerRoles').default;

const app = express();
app.use(express.json());
app.use('/volunteer-roles', volunteerRolesRouter);

describe('POST /volunteer-roles/restore', () => {
  beforeEach(() => {
    masterRoles = [{ id: 1, name: 'Old' }, { id: 99, name: 'Temp' }];
    roles = [
      { id: 1, name: 'Old Role', category_id: 1 },
      { id: 200, name: 'Extra', category_id: 99 },
    ];
    slots = [
      { slot_id: 1, role_id: 1, start_time: '00:00:00', end_time: '01:00:00', max_volunteers: 1, is_wednesday_slot: false },
    ];
    trained = [
      { volunteer_id: 5, role_id: 1, category_id: 1 },
      { volunteer_id: 5, role_id: 200, category_id: 99 },
    ];
    tempTrained = [];
    mockQuery.mockClear();
  });

  it('restores defaults and preserves training for existing roles', async () => {
    const res = await request(app).post('/volunteer-roles/restore');
    expect(res.status).toBe(200);
    expect(masterRoles).toEqual(DEFAULT_MASTER_ROLES);
    expect(roles).toEqual(DEFAULT_ROLES);
    expect(slots).toHaveLength(DEFAULT_SLOTS.length);
    expect(trained).toEqual([
      { volunteer_id: 5, role_id: 1, category_id: 2 },
    ]);
  });
});

