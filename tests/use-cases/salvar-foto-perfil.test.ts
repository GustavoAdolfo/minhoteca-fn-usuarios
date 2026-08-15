import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

const mockCreatePreSignedUrlPut = jest.fn();
const mockCreatePreSignedUrlGet = jest.fn();

jest.mock('@gustavoadolfo/minhoteca-core-layer', () => ({
  LogService: jest.fn().mockImplementation(() => mockLogger),
}));

jest.mock('@gustavoadolfo/minhoteca-adapter-layer', () => ({
  S3Repository: jest.fn().mockImplementation(() => ({
    createPreSignedUrlPut: mockCreatePreSignedUrlPut,
    createPreSignedUrlGet: mockCreatePreSignedUrlGet,
  })),
}));

jest.mock('../../src/commom', () => ({
  extractToken: jest.fn(),
  verifyToken: jest.fn(),
}));

import { APIGatewayProxyEvent } from 'aws-lambda';
import { SalvarFotoPerfilUseCase } from '../../src/use-cases';
import * as commom from '../../src/commom';

const mockExtractToken = commom.extractToken as jest.MockedFunction<typeof commom.extractToken>;
const mockVerifyToken = commom.verifyToken as jest.MockedFunction<typeof commom.verifyToken>;

const createEvent = (body?: string, headers: Record<string, string> = {}): APIGatewayProxyEvent =>
  ({
    body,
    headers,
    requestContext: {
      requestId: 'request-id-1',
    },
  }) as APIGatewayProxyEvent;

describe('SalvarFotoPerfilUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.S3_BUCKET_RECURSOS = 'bucket-teste';
    process.env.S3_CAMINHO_FOTOS_PERFIL = 'fotos-perfil';
    mockCreatePreSignedUrlPut.mockResolvedValue('https://upload.example.com/foto.jpg');
    mockCreatePreSignedUrlGet.mockResolvedValue('https://download.example.com/foto.jpg');
  });

  afterAll(() => {
    delete process.env.S3_BUCKET_RECURSOS;
    delete process.env.S3_CAMINHO_FOTOS_PERFIL;
  });

  it('deve retornar 400 quando o token não for informado', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
    mockExtractToken.mockReturnValue(undefined);

    const result = await useCase.execute(
      createEvent(JSON.stringify({ contentType: 'image/jpeg', fileType: 'jpg' }), {
        'X-API-ACCESS': 'Bearer access-token',
      })
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
  });

  it('deve retornar 403 quando o token informado não é válido', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue(null);

    const result = await useCase.execute(
      createEvent(
        JSON.stringify({ contentType: 'image/jpeg', fileType: 'jpg', preSignMethod: 'PUT' }),
        {
          'X-API-ACCESS': 'Bearer access-token',
        }
      )
    );

    expect(result).toEqual({
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
      Code: 403,
      Message: 'Usuário não autorizado',
    });
    expect(mockCreatePreSignedUrlPut).not.toHaveBeenCalled();
  });

  it('deve retornar 400 quando o body da requisição não for informado', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
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
      Message: 'Dados de foto de perfil não informados no body da requisição',
    });
  });

  it('deve retornar 500 quando o JSON do body for inválido', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });

    const result = await useCase.execute(
      createEvent('{invalid-json', { 'X-API-ACCESS': 'Bearer access-token' })
    );

    expect(result).toEqual({
      Code: 500,
      Message: 'Erro ao gerar a URL para upload da foto de perfil',
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('deve retornar 400 quando o payload não tiver dados válidos', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });

    const result = await useCase.execute(
      createEvent(JSON.stringify({ contentType: '   ', fileType: '   ', preSignMethod: '   ' }), {
        'X-API-ACCESS': 'Bearer access-token',
      })
    );

    expect(result).toEqual({
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
      Code: 400,
      Message: 'Dados de foto de perfil não informados no body da requisição',
    });
  });

  it('deve retornar 400 quando o método de pré-assinatura for inválido', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });

    const result = await useCase.execute(
      createEvent(
        JSON.stringify({ contentType: 'image/jpeg', fileType: 'jpg', preSignMethod: 'PATCH' }),
        { 'X-API-ACCESS': 'Bearer access-token' }
      )
    );

    expect(result).toEqual({
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
      Code: 400,
      Message: 'Método de pré-assinatura inválido. Deve ser "PUT" ou "GET".',
    });
  });

  it('deve retornar 400 quando o contentType não for informado', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });

    const result = await useCase.execute(
      createEvent(JSON.stringify({ fileType: 'jpg', preSignMethod: 'PUT' }), {
        'X-API-ACCESS': 'Bearer access-token',
      })
    );

    expect(result).toEqual({
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
      Code: 400,
      Message: 'Content-Type da foto de perfil não informado no body da requisição',
    });
  });

  it('deve retornar 400 quando o fileType não for informado', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });

    const result = await useCase.execute(
      createEvent(JSON.stringify({ contentType: 'image/jpeg', preSignMethod: 'PUT' }), {
        'X-API-ACCESS': 'Bearer access-token',
      })
    );

    expect(result).toEqual({
      Items: 0,
      TotalItems: 0,
      TotalPage: 0,
      Page: 0,
      Code: 400,
      Message: 'Tipo de arquivo da foto de perfil não informado no body da requisição',
    });
  });

  it('deve gerar a URL de upload para método PUT', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'sub-123' });

    const result = await useCase.execute(
      createEvent(
        JSON.stringify({ contentType: 'image/jpeg', fileType: 'jpg', preSignMethod: 'put' }),
        { 'X-API-ACCESS': 'Bearer access-token' }
      )
    );

    expect(mockCreatePreSignedUrlPut).toHaveBeenCalledWith(
      'bucket-teste',
      'fotos-perfil/sub-123.jpg',
      'image/jpeg'
    );
    expect(result).toEqual({
      Items: 1,
      TotalItems: 1,
      TotalPage: 1,
      Page: 1,
      Code: 200,
      PageData: {
        urlFotoPerfil: 'https://upload.example.com/foto.jpg',
      },
    });
  });

  it('deve gerar a URL de leitura para método GET', async () => {
    const useCase = new SalvarFotoPerfilUseCase();
    mockExtractToken.mockReturnValue('access-token');
    mockVerifyToken.mockResolvedValue({ sub: 'usuario-456' });

    const result = await useCase.execute(
      createEvent(
        JSON.stringify({ contentType: 'image/png', fileType: 'png', preSignMethod: 'GET' }),
        { 'X-API-ACCESS': 'Bearer access-token' }
      )
    );

    expect(mockCreatePreSignedUrlGet).toHaveBeenCalledWith(
      'bucket-teste',
      'fotos-perfil/usuario-456.png',
      'image/png'
    );
    expect(result).toEqual({
      Items: 1,
      TotalItems: 1,
      TotalPage: 1,
      Page: 1,
      Code: 200,
      PageData: {
        urlFotoPerfil: 'https://download.example.com/foto.jpg',
      },
    });
  });
});
