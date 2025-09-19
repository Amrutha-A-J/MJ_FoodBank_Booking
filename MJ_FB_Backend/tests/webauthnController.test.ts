import request from 'supertest';
import express from 'express';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import webauthnRoutes from '../src/routes/webauthn';
import pool from '../src/db';
import { clearChallenges } from '../src/utils/webauthnChallengeStore';
import issueAuthTokens from '../src/utils/authUtils';

jest.mock('../src/db');
jest.mock('@simplewebauthn/server', () => ({
  verifyAuthenticationResponse: jest.fn(),
}));
jest.mock('../src/utils/authUtils', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

const app = express();
app.use(express.json());
app.use('/api/v1/webauthn', webauthnRoutes);

const mockedVerify = verifyAuthenticationResponse as jest.MockedFunction<
  typeof verifyAuthenticationResponse
>;

const storedCredentialId = Buffer.from('credential-id', 'utf8').toString('base64url');

function bufferToBase64Url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url');
}

function buildAssertion({
  challenge,
  rawId,
  origin,
}: {
  challenge: string;
  rawId: string;
  origin: string;
}) {
  return {
    id: rawId,
    rawId,
    type: 'public-key',
    clientExtensionResults: {},
    response: {
      clientDataJSON: bufferToBase64Url(
        JSON.stringify({ type: 'webauthn.get', challenge, origin }),
      ),
      authenticatorData: bufferToBase64Url('auth'),
      signature: bufferToBase64Url('sig'),
      userHandle: null,
    },
  };
}

describe('webauthn routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearChallenges();
  });

  it('issues a challenge and indicates registration status', async () => {
    (pool.query as jest.Mock).mockImplementation(query => {
      if (typeof query === 'string' && query.includes('FROM webauthn_credentials')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              user_identifier: 'user@example.com',
              credential_id: storedCredentialId,
              public_key: 'cHVibGlj',
              sign_count: 1,
            },
          ],
        });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });

    const res = await request(app)
      .post('/api/v1/webauthn/challenge')
      .send({ identifier: 'user@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.challenge).toBeDefined();
    expect(res.body.registered).toBe(true);
    expect(res.body.credentialId).toBe(storedCredentialId);
  });

  it('rejects assertions with mismatched challenges', async () => {
    (pool.query as jest.Mock).mockResolvedValue({ rowCount: 0, rows: [] });

    const challengeRes = await request(app)
      .post('/api/v1/webauthn/challenge')
      .send({});
    const challenge = challengeRes.body.challenge as string;

    const assertion = buildAssertion({
      challenge: `${challenge}tampered`,
      rawId: storedCredentialId,
      origin: process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000',
    });

    const res = await request(app)
      .post('/api/v1/webauthn/verify')
      .send(assertion);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Invalid credentials' });
  });

  it('rejects assertions when the signature is invalid', async () => {
    (pool.query as jest.Mock).mockImplementation(query => {
      if (typeof query === 'string' && query.includes('FROM webauthn_credentials')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              user_identifier: '123',
              credential_id: storedCredentialId,
              public_key: Buffer.from('public-key', 'utf8').toString('base64'),
              sign_count: 1,
            },
          ],
        });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });

    mockedVerify.mockResolvedValueOnce({ verified: false } as any);

    const challengeRes = await request(app)
      .post('/api/v1/webauthn/challenge')
      .send({});
    const challenge = challengeRes.body.challenge as string;

    const assertion = buildAssertion({
      challenge,
      rawId: storedCredentialId,
      origin: process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000',
    });

    const res = await request(app)
      .post('/api/v1/webauthn/verify')
      .send(assertion);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Invalid credentials' });
    expect(mockedVerify).toHaveBeenCalled();
  });

  it('signs the user in when the assertion is valid', async () => {
    (pool.query as jest.Mock).mockImplementation((query: string, params?: unknown[]) => {
      if (query.includes('FROM webauthn_credentials')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              user_identifier: '123',
              credential_id: storedCredentialId,
              public_key: Buffer.from('public-key', 'utf8').toString('base64'),
              sign_count: 1,
            },
          ],
        });
      }
      if (query.startsWith('UPDATE webauthn_credentials')) {
        expect(params?.[0]).toBe(storedCredentialId);
        expect(params?.[1]).toBe(2);
        return Promise.resolve({ rowCount: 1 });
      }
      if (query.includes('FROM app_config')) {
        return Promise.resolve({ rowCount: 1, rows: [{ value: 'false' }] });
      }
      if (query.includes('FROM clients')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              client_id: 123,
              first_name: 'John',
              last_name: 'Doe',
              role: 'shopper',
              consent: true,
            },
          ],
        });
      }
      if (query.includes('FROM volunteers WHERE user_id')) {
        return Promise.resolve({ rowCount: 0, rows: [] });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });

    mockedVerify.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    } as any);

    const challengeRes = await request(app)
      .post('/api/v1/webauthn/challenge')
      .send({});
    const challenge = challengeRes.body.challenge as string;

    const assertion = buildAssertion({
      challenge,
      rawId: storedCredentialId,
      origin: process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000',
    });

    const res = await request(app)
      .post('/api/v1/webauthn/verify')
      .send(assertion);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      role: 'shopper',
      name: 'John Doe',
      id: 123,
      consent: true,
    });
  });

  it('returns 503 when maintenance mode is enabled for passkey logins', async () => {
    (pool.query as jest.Mock).mockImplementation((query: string, params?: unknown[]) => {
      if (query.includes('FROM webauthn_credentials')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              user_identifier: '123',
              credential_id: storedCredentialId,
              public_key: Buffer.from('public-key', 'utf8').toString('base64'),
              sign_count: 1,
            },
          ],
        });
      }
      if (query.startsWith('UPDATE webauthn_credentials')) {
        expect(params?.[0]).toBe(storedCredentialId);
        expect(params?.[1]).toBe(2);
        return Promise.resolve({ rowCount: 1 });
      }
      if (query.includes('FROM app_config')) {
        return Promise.resolve({ rowCount: 1, rows: [{ value: 'true' }] });
      }
      if (query.includes('FROM clients')) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              client_id: 123,
              first_name: 'John',
              last_name: 'Doe',
              role: 'shopper',
              consent: true,
            },
          ],
        });
      }
      return Promise.resolve({ rowCount: 0, rows: [] });
    });

    mockedVerify.mockResolvedValueOnce({
      verified: true,
      authenticationInfo: { newCounter: 2 },
    } as any);

    const challengeRes = await request(app)
      .post('/api/v1/webauthn/challenge')
      .send({});
    const challenge = challengeRes.body.challenge as string;

    const assertion = buildAssertion({
      challenge,
      rawId: storedCredentialId,
      origin: process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000',
    });

    const res = await request(app)
      .post('/api/v1/webauthn/verify')
      .send(assertion);

    expect(res.status).toBe(503);
    expect(res.body).toEqual({ message: 'Service unavailable due to maintenance' });
    expect(issueAuthTokens).not.toHaveBeenCalled();
  });
});
