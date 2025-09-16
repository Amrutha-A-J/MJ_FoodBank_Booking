import {
  createAgency as createAgencyHandler,
  addClientToAgency,
  removeClientFromAgency,
  getAgencyClients,
} from '../../src/controllers/agencyController';
import {
  addAgencyClient,
  removeAgencyClient,
  getAgencyClients as fetchAgencyClients,
  createAgency as insertAgency,
  getAgencyByEmail,
  getAgencyForClient,
  clientExists,
} from '../../src/models/agency';
import {
  generatePasswordSetupToken,
  buildPasswordSetupEmailParams,
} from '../../src/utils/passwordSetupUtils';
import { sendTemplatedEmail } from '../../src/utils/emailUtils';
import { parsePaginationParams } from '../../src/utils/parsePaginationParams';

jest.mock('../../src/models/agency', () => ({
  __esModule: true,
  addAgencyClient: jest.fn(),
  removeAgencyClient: jest.fn(),
  getAgencyClients: jest.fn(),
  createAgency: jest.fn(),
  getAgencyByEmail: jest.fn(),
  getAgencyForClient: jest.fn(),
  clientExists: jest.fn(),
  searchAgencies: jest.fn(),
}));

jest.mock('../../src/utils/passwordSetupUtils', () => ({
  __esModule: true,
  generatePasswordSetupToken: jest.fn(),
  buildPasswordSetupEmailParams: jest.fn(),
}));

jest.mock('../../src/utils/emailUtils', () => ({
  __esModule: true,
  sendTemplatedEmail: jest.fn(),
}));

jest.mock('../../src/utils/parsePaginationParams', () => ({
  __esModule: true,
  parsePaginationParams: jest.fn(),
}));

const flushPromises = () => new Promise(process.nextTick);

describe('agencyController', () => {
  const createResponse = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (parsePaginationParams as jest.Mock).mockReturnValue({ limit: 25, offset: 0 });
  });

  describe('createAgency', () => {
    it('returns 403 when user is not staff', async () => {
      const req = {
        user: { role: 'volunteer' },
        body: { name: 'Test Agency', email: 'test@example.com' },
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await createAgencyHandler(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
      expect(getAgencyByEmail).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns validation errors for invalid payloads', async () => {
      const req = {
        user: { role: 'staff' },
        body: { name: '', email: 'not-an-email' },
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await createAgencyHandler(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({ message: expect.any(String) }),
          ]),
        }),
      );
      expect(getAgencyByEmail).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 when agency email already exists', async () => {
      (getAgencyByEmail as jest.Mock).mockResolvedValue({ id: 7 });

      const req = {
        user: { role: 'staff' },
        body: { name: 'Helpers', email: 'hello@example.com' },
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await createAgencyHandler(req, res as any, next);
      await flushPromises();

      expect(getAgencyByEmail).toHaveBeenCalledWith('hello@example.com');
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Email already exists' });
      expect(insertAgency).not.toHaveBeenCalled();
      expect(generatePasswordSetupToken).not.toHaveBeenCalled();
      expect(buildPasswordSetupEmailParams).not.toHaveBeenCalled();
      expect(sendTemplatedEmail).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('addClientToAgency', () => {
    it('returns 403 for non-staff and non-agency users', async () => {
      const req = {
        user: { role: 'volunteer' },
        body: { agencyId: 5, clientId: 9 },
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await addClientToAgency(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
      expect(addAgencyClient).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it.each([
      ['agencyId', { clientId: 9 }],
      ['clientId', { agencyId: 3 }],
    ])('returns 400 when %s is missing', async (_missingField, body) => {
      const req = {
        user: { role: 'staff' },
        body,
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await addClientToAgency(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing fields' });
      expect(clientExists).not.toHaveBeenCalled();
      expect(addAgencyClient).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when agency tries to manage another agency', async () => {
      const req = {
        user: { role: 'agency', id: '2' },
        body: { agencyId: 5, clientId: 9 },
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await addClientToAgency(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
      expect(clientExists).not.toHaveBeenCalled();
      expect(addAgencyClient).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 409 when client already associated with another agency', async () => {
      (clientExists as jest.Mock).mockResolvedValue(true);
      (getAgencyForClient as jest.Mock).mockResolvedValue({
        id: 10,
        name: 'Existing Agency',
      });

      const req = {
        user: { role: 'staff' },
        body: { agencyId: 5, clientId: 9 },
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await addClientToAgency(req, res as any, next);
      await flushPromises();

      expect(clientExists).toHaveBeenCalledWith(9);
      expect(getAgencyForClient).toHaveBeenCalledWith(9);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Client already associated with Existing Agency',
        agencyName: 'Existing Agency',
      });
      expect(addAgencyClient).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('removeClientFromAgency', () => {
    it('returns 403 for non-staff and non-agency users', async () => {
      const req = {
        user: { role: 'volunteer' },
        params: { id: '4', clientId: '8' },
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await removeClientFromAgency(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
      expect(removeAgencyClient).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it.each([
      ['agency id', { id: 'abc', clientId: '5' }],
      ['client id', { id: '7', clientId: 'xyz' }],
    ])('returns 400 when %s is invalid', async (_label, params) => {
      const req = {
        user: { role: 'staff' },
        params,
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await removeClientFromAgency(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Missing fields' });
      expect(removeAgencyClient).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when agency removes clients for another agency', async () => {
      const req = {
        user: { role: 'agency', id: '2' },
        params: { id: '5', clientId: '9' },
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await removeClientFromAgency(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
      expect(removeAgencyClient).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('getAgencyClients', () => {
    it('returns 403 for non-staff and non-agency users', async () => {
      const req = {
        user: { role: 'volunteer' },
        params: { id: '3' },
        query: {},
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await getAgencyClients(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
      expect(fetchAgencyClients).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('returns 400 when pagination parameters are invalid', async () => {
      (parsePaginationParams as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid pagination');
      });

      const req = {
        user: { role: 'staff' },
        params: { id: '3' },
        query: {},
      } as any;
      const res = createResponse();
      const next = jest.fn();

      await getAgencyClients(req, res as any, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid pagination' });
      expect(fetchAgencyClients).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
