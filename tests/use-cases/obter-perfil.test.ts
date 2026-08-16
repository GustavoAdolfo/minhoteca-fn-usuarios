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
  getUserAttributes: jest.fn(),
}));

import { APIGatewayProxyEvent } from 'aws-lambda';
import { ObterPerfilUseCase } from '../../src/use-cases';
import * as commom from '../../src/commom';
import * as cognitoProxy from '../../src/cognito-proxy';

const mockExtractToken = commom.extractToken as jest.MockedFunction<typeof commom.extractToken>;
const mockVerifyToken = commom.verifyToken as jest.MockedFunction<typeof commom.verifyToken>;
const mockAdminGetUserAttributes = cognitoProxy.adminGetUserAttributes as jest.MockedFunction<
  (...args: Parameters<typeof cognitoProxy.adminGetUserAttributes>) => Promise<unknown>
>;
const mockGetUserAttributes = cognitoProxy.getUserAttributes as jest.MockedFunction<
  (...args: Parameters<typeof cognitoProxy.getUserAttributes>) => Promise<unknown>
>;

const originalAwsRegion = process.env.AWS_REGION;

const createEvent = (headers: Record<string, string> = {}): APIGatewayProxyEvent =>
  ({
    headers,
    requestContext: {
      requestId: 'request-id-1',
    },
  }) as APIGatewayProxyEvent;

describe('ObterPerfilUseCase', () => {
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

  describe('execute', () => {
    it('deve retornar 400 quando o token não for informado', async () => {
      const useCase = new ObterPerfilUseCase();
      mockExtractToken.mockReturnValue(undefined);

      const result = await useCase.execute(createEvent());

      expect(mockExtractToken).toHaveBeenCalledWith({});
      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockGetUserAttributes).not.toHaveBeenCalled();
      expect(result).toEqual({
        Items: 0,
        TotalItems: 0,
        TotalPage: 0,
        Page: 0,
        Code: 400,
        Message: 'Parâmetro identificador não informado',
      });
    });

    it('deve usar as claims do authorizer do Cognito quando a autenticação foi resolvida no gateway', async () => {
      const useCase = new ObterPerfilUseCase();
      const pageData = {
        sub: 'sub-123',
        email: 'usuario@exemplo.com',
        name: 'Usuário de Teste',
      };

      mockGetUserAttributes.mockResolvedValue(pageData);

      const result = await useCase.execute({
        headers: {},
        requestContext: {
          requestId: 'request-id-1',
          authorizer: {
            claims: {
              sub: 'sub-123',
            },
          },
        },
      } as unknown as APIGatewayProxyEvent);

      expect(mockVerifyToken).not.toHaveBeenCalled();
      expect(mockAdminGetUserAttributes).toHaveBeenCalledWith('sub-123', 'us-east-1');
      expect(result).toEqual({
        Items: 1,
        TotalItems: 1,
        TotalPage: 1,
        Page: 1,
        Code: 200,
        PageData: pageData,
      });
    });

    it('deve retornar 403 quando o token não for autorizado', async () => {
      const useCase = new ObterPerfilUseCase();
      mockExtractToken.mockReturnValue('access-token');
      mockVerifyToken.mockResolvedValue(null);

      const result = await useCase.execute(createEvent({ 'X-API-ACCESS': 'Bearer access-token' }));

      expect(mockVerifyToken).toHaveBeenCalledWith('access-token');
      expect(mockAdminGetUserAttributes).not.toHaveBeenCalled();
      expect(result).toEqual({
        Items: 0,
        TotalItems: 0,
        TotalPage: 0,
        Page: 0,
        Code: 403,
        Message: 'Usuário não autorizado',
      });
    });

    it('deve retornar 404 quando o usuário não for encontrado', async () => {
      const useCase = new ObterPerfilUseCase();
      mockExtractToken.mockReturnValue('access-token');
      mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });
      mockGetUserAttributes.mockResolvedValue(null);

      const result = await useCase.execute(createEvent({ 'X-API-ACCESS': 'Bearer access-token' }));

      expect(mockAdminGetUserAttributes).toHaveBeenCalledWith('sub-123', 'us-east-1');
      expect(result).toEqual({
        Items: 0,
        TotalItems: 0,
        TotalPage: 0,
        Page: 0,
        Code: 404,
        Message: 'Usuário não identificado',
      });
    });

    it('deve usar cache para evitar requisições repetidas do mesmo perfil', async () => {
      const useCase = new ObterPerfilUseCase();
      const pageData = {
        sub: 'sub-123',
        email: 'usuario@exemplo.com',
        name: 'Usuário de Teste',
      };

      mockExtractToken.mockReturnValue('access-token');
      mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });
      mockAdminGetUserAttributes.mockResolvedValue(pageData);

      const first = await useCase.execute(createEvent({ 'X-API-ACCESS': 'Bearer access-token' }));
      const second = await useCase.execute(createEvent({ 'X-API-ACCESS': 'Bearer access-token' }));

      expect(first.Code).toBe(200);
      expect(second.Code).toBe(200);
      expect(mockAdminGetUserAttributes).toHaveBeenCalledTimes(1);
    });

    it('deve retornar os atributos do usuário quando a consulta for bem-sucedida', async () => {
      const useCase = new ObterPerfilUseCase();
      const pageData = {
        sub: 'sub-123',
        email: 'usuario@exemplo.com',
        name: 'Usuário de Teste',
      };

      mockExtractToken.mockReturnValue('access-token');
      mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });
      mockAdminGetUserAttributes.mockResolvedValue(pageData);

      const result = await useCase.execute(createEvent({ 'x-api-access': 'Bearer access-token' }));

      expect(mockAdminGetUserAttributes).toHaveBeenCalledWith('sub-123', 'us-east-1');
      expect(result).toEqual({
        Items: 1,
        TotalItems: 1,
        TotalPage: 1,
        Page: 1,
        Code: 200,
        PageData: pageData,
      });
    });

    it('deve retornar 500 quando ocorrer uma falha inesperada', async () => {
      const useCase = new ObterPerfilUseCase();

      mockExtractToken.mockReturnValue('access-token');
      mockVerifyToken.mockRejectedValue(new Error('falha no cognito'));

      const result = await useCase.execute(createEvent({ 'X-API-ACCESS': 'Bearer access-token' }));

      expect(result).toEqual({
        Code: 500,
        Message: 'Erro ao obter perfil do usuário',
        Items: 0,
        TotalItems: 0,
        TotalPage: 0,
        Page: 0,
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserAttributes', () => {
    it('deve retornar null quando o Cognito não enviar UserAttributes', async () => {
      const useCase = new ObterPerfilUseCase();
      mockAdminGetUserAttributes.mockResolvedValue({});

      const result = await useCase.getUserAttributes({ sub: 'sub-123' });

      expect(mockAdminGetUserAttributes).toHaveBeenCalledWith('sub-123', 'us-east-1');
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('deve normalizar a lista de atributos em um objeto', async () => {
      const useCase = new ObterPerfilUseCase();
      mockAdminGetUserAttributes.mockResolvedValue({
        UserAttributes: [
          { Name: 'sub', Value: 'sub-123' },
          { Name: 'email', Value: 'usuario@exemplo.com' },
          { Name: 'name', Value: 'Usuário de Teste' },
        ],
      });

      const result = await useCase.getUserAttributes({ sub: 'sub-123' });

      expect(result).toEqual({
        sub: 'sub-123',
        email: 'usuario@exemplo.com',
        name: 'Usuário de Teste',
      });
    });

    it('deve retornar o objeto de atributos quando UserAttributes já vier normalizado', async () => {
      const useCase = new ObterPerfilUseCase();
      const attributes = {
        sub: 'sub-123',
        email: 'usuario@exemplo.com',
      };

      mockAdminGetUserAttributes.mockResolvedValue({
        UserAttributes: attributes,
      });

      const result = await useCase.getUserAttributes({ sub: 'sub-123' });

      expect(result).toEqual(attributes);
    });
  });
});
