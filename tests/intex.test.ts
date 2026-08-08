import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { APIGatewayEvent, APIGatewayProxyEvent, Context } from 'aws-lambda';
import { UseCaseInterface, PageDataType } from '@gustavoadolfo/minhoteca-core-layer';

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

const mockExecute = jest.fn<(event: APIGatewayEvent, logId: string) => Promise<PageDataType>>();
const mockUseCase: UseCaseInterface = {
  execute: mockExecute,
};

const mockRegistradores = {
  get: [{ '/v1/perfil': mockUseCase }],
  post: [],
};

jest.mock('@gustavoadolfo/minhoteca-core-layer', () => ({
  LogService: jest.fn().mockImplementation(() => mockLogger),
}));

jest.mock('../src/registradores', () => ({
  registradores: mockRegistradores,
}));

import { handler } from '../src/index';

const createEvent = (overrides: Partial<APIGatewayEvent> = {}): APIGatewayProxyEvent =>
  ({
    httpMethod: 'GET',
    path: '/v1/perfil',
    requestContext: {
      requestId: 'request-id-1',
    },
    headers: {},
    ...overrides,
  }) as APIGatewayProxyEvent;

const createContext = (): Context => ({ functionName: 'handler-test' }) as Context;

describe('handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve executar o caso de uso e retornar a resposta quando a rota e o método forem encontrados', async () => {
    mockExecute.mockResolvedValue({
      Items: 1,
      TotalItems: 1,
      TotalPage: 1,
      Page: 1,
      Code: 200,
      PageData: { sub: 'sub-123' },
    });

    const result = await handler(createEvent(), createContext());

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        httpMethod: 'GET',
        path: '/v1/perfil',
      }),
      'request-id-1'
    );
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      Items: 1,
      TotalItems: 1,
      TotalPage: 1,
      Page: 1,
      Code: 200,
      PageData: { sub: 'sub-123' },
    });
  });

  it('deve retornar o status e a mensagem informados pelo caso de uso quando houver erro de negócio', async () => {
    mockExecute.mockResolvedValue({
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
      Code: 400,
      Message: 'Parâmetro inválido',
    });

    const result = await handler(createEvent(), createContext());

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({ message: 'Parâmetro inválido' });
  });

  it('deve retornar 500 quando o caso de uso lançar uma exceção', async () => {
    mockExecute.mockRejectedValue(new Error('falha inesperada'));

    const result = await handler(createEvent(), createContext());

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Erro interno ao processar a requisição. LogId: request-id-1',
    });
  });

  it('deve retornar 500 quando não houver registrador para o método informado', async () => {
    const result = await handler(createEvent({ httpMethod: 'PATCH' }), createContext());

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({ message: 'Erro interno. LogId: request-id-1' });
  });
});
