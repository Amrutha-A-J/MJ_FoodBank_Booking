jest.mock('../../src/models/webauthn', () => ({
  getCredential: jest.fn(),
  saveCredential: jest.fn(),
  getCredentialById: jest.fn(),
}));

jest.mock('../../src/utils/authUtils', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../src/models/agency', () => ({
  getAgencyByEmail: jest.fn(),
}));

import { generateChallenge, registerCredential, verifyCredential } from '../../src/controllers/webauthnController';
import { getCredential, saveCredential, getCredentialById } from '../../src/models/webauthn';
import UnauthorizedError from '../../src/utils/UnauthorizedError';

describe('webauthnController error handling', () => {
  const mockedGetCredential = getCredential as jest.MockedFunction<typeof getCredential>;
  const mockedSaveCredential = saveCredential as jest.MockedFunction<typeof saveCredential>;
  const mockedGetCredentialById = getCredentialById as jest.MockedFunction<typeof getCredentialById>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('forwards an error when registration is missing the credential ID', async () => {
    const error = new Error('Missing credential ID');
    mockedSaveCredential.mockRejectedValueOnce(error);
    const req = {
      body: { identifier: 'user@example.com' },
    } as any;
    const res = { json: jest.fn() } as any;
    const next = jest.fn();

    await registerCredential(req, res, next);

    expect(mockedSaveCredential).toHaveBeenCalledWith('user@example.com', undefined);
    expect(next).toHaveBeenCalledWith(error);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns 401 when verification results are invalid', async () => {
    mockedGetCredentialById.mockResolvedValueOnce(null);

    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const res = { status, json } as any;
    const req = { body: { credentialId: 'invalid-credential' } } as any;
    const next = jest.fn();

    await verifyCredential(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects listing credentials when the user is unauthorized', async () => {
    mockedGetCredential.mockRejectedValueOnce(new UnauthorizedError('Forbidden'));

    const res = { json: jest.fn() } as any;
    const req = { body: { identifier: 'forbidden@example.com' } } as any;

    await expect(generateChallenge(req, res)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(res.json).not.toHaveBeenCalled();
  });
});
