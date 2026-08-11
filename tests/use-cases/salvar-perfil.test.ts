import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

jest.mock('@gustavoadolfo/minhoteca-core-layer', () => ({
  LogService: jest.fn().mockImplementation(() => mockLogger),
}));

jest.mock('../../src/commom', () => ({
  extractToken: jest.fn(),
  verifyToken: jest.fn(),
}));

jest.mock('../../src/cognito-proxy', () => ({
  adminGetUserAttributes: jest.fn(),
  adminUpdateUserAttributes: jest.fn(),
  getUserAttributes: jest.fn(),
}));

import { APIGatewayProxyEvent } from 'aws-lambda';
import { SalvarPerfilUseCase } from '../../src/use-cases';
import * as commom from '../../src/commom';
import * as cognitoProxy from '../../src/cognito-proxy';

const mockExtractToken = commom.extractToken as jest.MockedFunction<typeof commom.extractToken>;
const mockVerifyToken = commom.verifyToken as jest.MockedFunction<typeof commom.verifyToken>;
const mockAdminGetUserAttributes = cognitoProxy.adminGetUserAttributes as jest.MockedFunction<
  (...args: Parameters<typeof cognitoProxy.adminGetUserAttributes>) => Promise<unknown>
>;
const mockAdminUpdateUserAttributes = cognitoProxy.adminUpdateUserAttributes as jest.MockedFunction<
  (...args: Parameters<typeof cognitoProxy.adminUpdateUserAttributes>) => Promise<unknown>
>;

const originalAwsRegion = process.env.AWS_REGION;

const createEvent = (body?: string, headers: Record<string, string> = {}): APIGatewayProxyEvent =>
  ({
    body,
    headers,
    requestContext: {
      requestId: 'request-id-1',
    },
  }) as APIGatewayProxyEvent;

describe('SalvarPerfilUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AWS_REGION = 'us-east-1';
  });

  afterAll(() => {
    if (originalAwsRegion === undefined) {
      delete process.env.AWS_REGION;
      return;
    }

    process.env.AWS_REGION = originalAwsRegion;
  });

  it('deve retornar 400 quando o token não for informado', async () => {
    const useCase = new SalvarPerfilUseCase();
    mockExtractToken.mockReturnValue(undefined);

    const result = await useCase.execute(
      createEvent(JSON.stringify({ name: 'Usuário' }), { 'X-API-ACCESS': 'Bearer access-token' })
    );

    expect(result).toEqual({
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
      Code: 400,
      Message: 'Parâmetro identificador não informado',
    });
    expect(mockVerifyToken).not.toHaveBeenCalled();
    expect(mockAdminUpdateUserAttributes).not.toHaveBeenCalled();
  });

  it('deve retornar 403 quando o token não for autorizado', async () => {
    const useCase = new SalvarPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue(null);

    const result = await useCase.execute(
      createEvent(JSON.stringify({ name: 'Usuário' }), { 'X-API-ACCESS': 'Bearer access-token' })
    );

    expect(result).toEqual({
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
      Code: 403,
      Message: 'Usuário não autorizado',
    });
    expect(mockAdminUpdateUserAttributes).not.toHaveBeenCalled();
  });

  it('deve retornar 400 quando o body da requisição não for informado', async () => {
    const useCase = new SalvarPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });

    const result = await useCase.execute(
      createEvent(undefined, { 'X-API-ACCESS': 'Bearer access-token' })
    );

    expect(result).toEqual({
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
      Code: 400,
      Message: 'Dados de perfil não informados no body da requisição',
    });
    expect(mockAdminUpdateUserAttributes).not.toHaveBeenCalled();
  });

  it('deve retornar 500 quando o body do evento for inválido', async () => {
    const useCase = new SalvarPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });

    const result = await useCase.execute(
      createEvent('{invalid-json', { 'X-API-ACCESS': 'Bearer access-token' })
    );

    expect(result).toEqual({
      Code: 500,
      Message: 'Erro ao atualizar perfil do usuário',
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('deve normalizar nomes e atributos para o padrão do Cognito', () => {
    const useCase = new SalvarPerfilUseCase();

    const result = (useCase as any).toCognitoAttributes({
      name: 'Usuário',
      familyName: 'Teste',
      phoneNumber: '5511999999999',
      profile: 'biblioteca',
      picture: 'https://example.com/foto.png',
      address: {
        postalCode: '01001000',
        streetAddress: 'Rua A',
        addressNumber: '100',
      },
      zipCode: '01001000',
      acknowledgement: true,
      newUser: false,
      secondField: undefined,
    });

    expect(result).toEqual([
      { Name: 'name', Value: 'Usuário' },
      { Name: 'given_name', Value: 'Usuário' },
      { Name: 'family_name', Value: 'Teste' },
      { Name: 'phone_number', Value: '+5511999999999' },
      {
        Name: 'address',
        Value: JSON.stringify({
          postalCode: '01001000',
          streetAddress: 'Rua A',
          addressNumber: '100',
        }),
      },
      { Name: 'custom:zipcode', Value: '01001000' },
      { Name: 'profile', Value: 'biblioteca' },
      { Name: 'picture', Value: 'https://example.com/foto.png' },
      { Name: 'custom:acknowledgement', Value: 'true' },
      { Name: 'custom:newUser', Value: 'false' },
    ]);
  });

  it('deve quebrar a normalização de telefone em todos os caminhos', () => {
    const useCase = new SalvarPerfilUseCase();

    expect((useCase as any).normalizePhoneNumber('11999999999')).toBe('+5511999999999');
    expect((useCase as any).normalizePhoneNumber('9999999999')).toBe('+559999999999');
    expect((useCase as any).normalizePhoneNumber('5511999999999')).toBe('+5511999999999');
    expect((useCase as any).normalizePhoneNumber('')).toBeUndefined();
    expect((useCase as any).normalizePhoneNumber(undefined)).toBeUndefined();
  });

  it('deve aceitar um payload que contenha apenas o perfil default e não bloquear a atualização', async () => {
    const useCase = new SalvarPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });
    mockAdminUpdateUserAttributes.mockResolvedValue({});

    const result = await useCase.execute(
      createEvent(JSON.stringify({ empty: '' }), { 'X-API-ACCESS': 'Bearer access-token' })
    );

    expect(mockAdminUpdateUserAttributes).toHaveBeenCalledWith('sub-123', 'us-east-1', [
      { Name: 'profile', Value: 'leitor' },
    ]);
    expect(result).toEqual({
      Items: 1,
      TotalItems: 1,
      TotalPage: 1,
      Page: 1,
      Code: 200,
      Message: 'Perfil do usuário salvo com sucesso',
    });
  });

  it('deve retornar 500 quando o Cognito falhar ao atualizar o perfil', async () => {
    const useCase = new SalvarPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });
    mockAdminUpdateUserAttributes.mockRejectedValue(new Error('falha no cognito'));

    const result = await useCase.execute(
      createEvent(JSON.stringify({ name: 'Usuário', phoneNumber: '11999999999' }), {
        'X-API-ACCESS': 'Bearer access-token',
      })
    );

    expect(mockAdminUpdateUserAttributes).toHaveBeenCalledWith('sub-123', 'us-east-1', [
      { Name: 'name', Value: 'Usuário' },
      { Name: 'given_name', Value: 'Usuário' },
      { Name: 'phone_number', Value: '+5511999999999' },
      { Name: 'profile', Value: 'leitor' },
    ]);
    expect(result).toEqual({
      Code: 500,
      Message: 'Erro ao atualizar perfil do usuário',
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
    });
  });

  it('deve retornar null e avisar quando o usuário não tiver atributos no Cognito', async () => {
    const useCase = new SalvarPerfilUseCase();
    mockAdminGetUserAttributes.mockResolvedValue({});

    const result = await useCase.getUserAttributes({ sub: 'sub-123' });

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockAdminGetUserAttributes).toHaveBeenCalledWith('sub-123', 'us-east-1');
  });

  it('deve normalizar os UserAttributes recebidos do Cognito em objeto', async () => {
    const useCase = new SalvarPerfilUseCase();
    mockAdminGetUserAttributes.mockResolvedValue({
      UserAttributes: [
        { Name: 'sub', Value: 'sub-123' },
        { Name: 'email', Value: 'usuario@exemplo.com' },
        { Name: 'name', Value: 'Usuário' },
      ],
    });

    const result = await useCase.getUserAttributes({ sub: 'sub-123' });

    expect(result).toEqual({
      sub: 'sub-123',
      email: 'usuario@exemplo.com',
      name: 'Usuário',
    });
  });

  it('deve salvar atributos do usuário no Cognito quando o body for válido', async () => {
    const useCase = new SalvarPerfilUseCase();
    const payload = {
      userId: 'sub-123',
      name: 'Usuário',
      familyName: 'Teste',
      phoneNumber: '11999999999',
      address: {
        postalCode: '01001000',
        streetAddress: 'Rua A',
        addressNumber: '100',
        neighborhood: 'Centro',
        locality: 'São Paulo',
        region: 'SP',
      },
      acknowledgement: true,
      newUser: false,
      profile: 'leitor',
      picture: 'https://example.com/foto.png',
      zipCode: '01001000',
    };

    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });
    mockAdminUpdateUserAttributes.mockResolvedValue({});

    const result = await useCase.execute(
      createEvent(JSON.stringify(payload), { 'x-api-access': 'Bearer access-token' })
    );

    expect(mockAdminUpdateUserAttributes).toHaveBeenCalledWith('sub-123', 'us-east-1', [
      { Name: 'name', Value: 'Usuário' },
      { Name: 'given_name', Value: 'Usuário' },
      { Name: 'family_name', Value: 'Teste' },
      { Name: 'phone_number', Value: '+5511999999999' },
      { Name: 'address', Value: JSON.stringify(payload.address) },
      { Name: 'custom:zipcode', Value: '01001000' },
      { Name: 'profile', Value: 'leitor' },
      { Name: 'picture', Value: 'https://example.com/foto.png' },
      { Name: 'custom:acknowledgement', Value: 'true' },
      { Name: 'custom:newUser', Value: 'false' },
    ]);
    expect(result).toEqual({
      Items: 1,
      TotalItems: 1,
      TotalPage: 1,
      Page: 1,
      Code: 200,
      Message: 'Perfil do usuário salvo com sucesso',
    });
  });
});
