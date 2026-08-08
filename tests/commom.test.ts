import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCreate = jest.fn();
const mockVerify = jest.fn();

jest.mock('aws-jwt-verify', () => ({
  CognitoJwtVerifier: {
    create: mockCreate,
  },
}));

jest.mock('@aws-sdk/client-config-service', () => ({
  ConfigServiceClient: jest.fn().mockImplementation(function (
    this: { config: unknown },
    config: unknown
  ) {
    this.config = config;
  }),
}));

jest.mock('@aws-sdk/node-http-handler', () => ({
  NodeHttpHandler: jest.fn().mockImplementation((config: unknown) => config),
}));

jest.mock('http', () => ({
  Agent: jest.fn().mockImplementation((config: unknown) => config),
}));

import { extractToken, optionsConfiguration, reviewOptions, verifyToken } from '../src/commom';

describe('commom', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USER_POOL_ID = 'pool-test';
    process.env.CLIENT_ID_TOKEN = 'client-test';
  });

  it('deve extrair o token do header com Bearer', () => {
    expect(extractToken({ 'X-API-ACCESS': 'Bearer access-token' })).toBe('access-token');
  });

  it('deve retornar undefined quando o header não existir', () => {
    expect(extractToken({})).toBeUndefined();
  });

  it('deve criar a configuração sem endpoint', () => {
    const config = optionsConfiguration('us-east-1');

    expect(config).toBeDefined();
  });

  it('deve criar a configuração com endpoint', () => {
    const config = optionsConfiguration('us-east-1', 'https://example.com');

    expect(config).toBeDefined();
  });

  it('deve montar o reviewOptions com endpoint', () => {
    const options = {
      config: { region: 'us-east-1', endpoint: 'https://example.com', maxAttempts: 3 },
    } as never;

    const config = reviewOptions(options);

    expect(config).toEqual(
      expect.objectContaining({
        region: 'us-east-1',
        maxAttempts: 3,
        endpoint: 'https://example.com',
      })
    );
  });

  it('deve verificar o token com sucesso', async () => {
    mockCreate.mockReturnValue({ verify: mockVerify });
    mockVerify.mockResolvedValue({ sub: 'sub-123' });

    const result = await verifyToken('access-token');

    expect(result).toEqual({ sub: 'sub-123' });
  });

  it('deve lançar erro quando o token não possuir sub', async () => {
    mockCreate.mockReturnValue({ verify: mockVerify });
    mockVerify.mockResolvedValue({});

    await expect(verifyToken('access-token')).rejects.toThrow(
      'Token inválido: sub não encontrado no payload'
    );
  });
});
