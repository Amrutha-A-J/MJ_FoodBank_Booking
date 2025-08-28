import request from 'supertest';
import express from 'express';

// In-memory mock data to simulate cascading deletes
const masterRoles = [{ id: 1, name: 'Master' }];
const roles = [{ id: 10, name: 'Role', category_id: 1 }];
const slots = [
  {
    slot_id: 100,
    role_id: 10,
    start_time: '09:00:00',
    end_time: '12:00:00',
    max_volunteers: 5,
    is_wednesday_slot: false,
    is_active: true,
  },
];

const mockQuery = jest.fn(async (sql: string, params?: any[]) => {
  if (sql.startsWith('DELETE FROM volunteer_master_roles')) {
    const id = Number(params?.[0]);
    const index = masterRoles.findIndex((r) => r.id === id);
    if (index === -1) return { rowCount: 0, rows: [] };
    masterRoles.splice(index, 1);
    // cascade delete roles and slots
    for (let i = roles.length - 1; i >= 0; i--) {
      if (roles[i].category_id === id) {
        const roleId = roles[i].id;
        roles.splice(i, 1);
        for (let j = slots.length - 1; j >= 0; j--) {
          if (slots[j].role_id === roleId) {
            slots.splice(j, 1);
          }
        }
      }
    }
    return { rowCount: 1, rows: [{ id }] };
  }
  return { rows: [], rowCount: 0 };
});

jest.mock('../src/db', () => ({
  __esModule: true,
  default: { query: mockQuery },
}));

jest.mock('../src/middleware/authMiddleware', () => ({
  authMiddleware: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  authorizeRoles: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

import volunteerMasterRolesRouter from '../src/routes/volunteer/volunteerMasterRoles';

const app = express();
app.use(express.json());
app.use('/volunteer-master-roles', volunteerMasterRolesRouter);

describe('DELETE /volunteer-master-roles/:id', () => {
  beforeEach(() => {
    mockQuery.mockClear();
    masterRoles.splice(0, masterRoles.length, { id: 1, name: 'Master' });
    roles.splice(0, roles.length, { id: 10, name: 'Role', category_id: 1 });
    slots.splice(0, slots.length, {
      slot_id: 100,
      role_id: 10,
      start_time: '09:00:00',
      end_time: '12:00:00',
      max_volunteers: 5,
      is_wednesday_slot: false,
      is_active: true,
    });
  });

  it('removes associated roles and slots', async () => {
    const res = await request(app).delete('/volunteer-master-roles/1');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Master role deleted' });
    expect(roles).toHaveLength(0);
    expect(slots).toHaveLength(0);
  });
});

