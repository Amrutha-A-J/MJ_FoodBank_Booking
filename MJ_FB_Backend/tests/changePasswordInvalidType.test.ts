import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import { changePassword } from '../src/controllers/authController';
import pool from '../src/db';

jest.mock('../src/db');
jest.mock('bcrypt');

const app = express();
app.use(express.json());

let mockUser: { id: number; type: string };
let nextSpy: jest.Mock;

app.post('/auth/change-password', (req, res) => {
  (req as any).user = mockUser;
  return changePassword(req, res, nextSpy);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { id: 1, type: 'hacker' };
  nextSpy = jest.fn();
});

describe('POST /auth/change-password', () => {
  it('rejects invalid user type', async () => {
    const res = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword: 'OldPass!1', newPassword: 'NewPass!1' });
    expect(res.status).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('updates password when current password matches for staff', async () => {
    mockUser = { id: 42, type: 'staff' };
    (pool.query as jest.Mock)
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ password: 'stored-hash' }] })
      .mockResolvedValueOnce({ rowCount: 1 });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    const res = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword: 'OldPass!1', newPassword: 'NewPass!1' });

    expect(res.status).toBe(204);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect((pool.query as jest.Mock).mock.calls[0]).toEqual([
      'SELECT password FROM staff WHERE id=$1',
      [42],
    ]);
    expect(bcrypt.compare).toHaveBeenCalledWith('OldPass!1', 'stored-hash');
    expect(bcrypt.hash).toHaveBeenCalledWith('NewPass!1', 10);
    expect((pool.query as jest.Mock).mock.calls[1]).toEqual([
      'UPDATE staff SET password=$1 WHERE id=$2',
      ['new-hash', 42],
    ]);
    expect(nextSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when current password is incorrect', async () => {
    mockUser = { id: 7, type: 'staff' };
    (pool.query as jest.Mock).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ password: 'stored-hash' }],
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword: 'WrongPass!1', newPassword: 'NewPass!1' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Current password incorrect' });
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(bcrypt.hash).not.toHaveBeenCalled();
  });

  it('returns 404 when user is missing', async () => {
    mockUser = { id: 9, type: 'staff' };
    (pool.query as jest.Mock).mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post('/auth/change-password')
      .send({ currentPassword: 'OldPass!1', newPassword: 'NewPass!1' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: 'User not found' });
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(pool.query).toHaveBeenCalledTimes(1);
  });
});
