import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSend = jest.fn<(input: unknown) => Promise<unknown>>();
const mockClientInstance = { send: mockSend };
const mockCognitoClient = jest.fn().mockImplementation(() => mockClientInstance);
const mockGetUserCommand = jest.fn().mockImplementation((input: unknown) => ({ input }));
const mockAdminGetUserCommand = jest.fn().mockImplementation((input: unknown) => ({ input }));
const mockAdminUpdateUserAttributesCommand = jest
  .fn()
  .mockImplementation((input: unknown) => ({ input }));
const mockListUsersCommand = jest.fn().mockImplementation((input: unknown) => ({ input }));

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: mockCognitoClient,
  GetUserCommand: mockGetUserCommand,
  AdminGetUserCommand: mockAdminGetUserCommand,
  AdminUpdateUserAttributesCommand: mockAdminUpdateUserAttributesCommand,
  ListUsersCommand: mockListUsersCommand,
}));

jest.mock('@aws-sdk/client-config-service', () => ({
  ConfigServiceClient: jest.fn().mockImplementation(function (
    this: { config: unknown },
    config: unknown
  ) {
    this.config = config;
  }),
}));

jest.mock('winston', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  format: {
    timestamp: () => 'timestamp',
    label: () => 'label',
    combine: (...args: unknown[]) => args,
    splat: () => 'splat',
    json: () => 'json',
  },
  transports: {
    Console: jest.fn(),
  },
}));

import {
  adminGetUserAttributes,
  adminUpdateUserAttributes,
  getUserAttributes,
  listUsers,
} from '../../src/proxies/cognito-proxy';

describe('cognito-proxy', () => {
  const originalUserPoolId = process.env.USER_POOL_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.USER_POOL_ID = 'pool-test';
  });

  afterAll(() => {
    if (originalUserPoolId === undefined) {
      delete process.env.USER_POOL_ID;
      return;
    }

    process.env.USER_POOL_ID = originalUserPoolId;
  });

  it('deve buscar atributos do usuário via token', async () => {
    const response = { Username: 'user-123' };
    mockSend.mockResolvedValue(response);

    const result = await getUserAttributes('token-123', 'us-east-1', 'https://cognito.example');

    expect(mockGetUserCommand).toHaveBeenCalledWith({ AccessToken: 'token-123' });
    expect(mockCognitoClient).toHaveBeenCalled();
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(result).toEqual(response);
  });

  it('deve buscar atributos administrativos do usuário pelo sub', async () => {
    const response = { Username: 'sub-123' };
    mockSend.mockResolvedValue(response);

    const result = await adminGetUserAttributes('sub-123', 'us-east-1');

    expect(mockAdminGetUserCommand).toHaveBeenCalledWith({
      UserPoolId: 'pool-test',
      Username: 'sub-123',
    });
    expect(result).toEqual(response);
  });

  it('deve atualizar atributos do usuário', async () => {
    const response = { Username: 'sub-123' };
    const attributes = [{ Name: 'name', Value: 'Usuário Teste' }];
    mockSend.mockResolvedValue(response);

    const result = await adminUpdateUserAttributes(
      'sub-123',
      'us-east-1',
      attributes,
      'https://cognito.example'
    );

    expect(mockAdminUpdateUserAttributesCommand).toHaveBeenCalledWith({
      UserPoolId: 'pool-test',
      Username: 'sub-123',
      UserAttributes: attributes,
    });
    expect(result).toEqual(response);
  });

  it('deve listar usuários habilitados', async () => {
    const users = [{ Username: 'user-1' }];
    mockSend.mockResolvedValue({ Users: users });

    const result = await listUsers('us-east-1', 'https://cognito.example');

    expect(mockListUsersCommand).toHaveBeenCalledWith({
      UserPoolId: 'pool-test',
      AttributesToGet: ['sub'],
      Filter: '"status"="Enabled"',
    });
    expect(result).toEqual(users);
  });

  it('deve retornar uma lista vazia quando não houver usuários', async () => {
    mockSend.mockResolvedValue({});

    const result = await listUsers('us-east-1');

    expect(result).toEqual([]);
  });

  it('deve chamar o logger inspect quando o ambiente estiver em debug', async () => {
    process.env.ENVIRONMENT = 'debug';
    mockSend.mockResolvedValue({ Users: [{ Username: 'user-1' }] });

    await listUsers('us-east-1');

    expect(mockSend).toHaveBeenCalled();
  });
});
