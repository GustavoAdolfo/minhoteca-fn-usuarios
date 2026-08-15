/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { LogService, UseCaseInterface, PageDataType } from '@gustavoadolfo/minhoteca-core-layer';
import { extractToken, verifyToken } from '../commom';
import { S3Repository } from '@gustavoadolfo/minhoteca-adapter-layer';

type FotoPerfilAttribute = {
  Name: string;
  Value: string;
};

export class SalvarFotoPerfilUseCase implements UseCaseInterface {
  private logger: LogService;
  private s3Repository: S3Repository;

  constructor() {
    this.logger = new LogService('minhoteca-user-service');
    this.s3Repository = new S3Repository();
  }

  private extrairDadosFotoPerfil(payload: Record<string, any>): Record<string, string> {
    const attributes: FotoPerfilAttribute[] = [];
    const addAttribute = (name: string, value: unknown) => {
      if (value === undefined || value === null) return;
      const normalizedValue = typeof value === 'string' ? value.trim() : String(value).trim();
      if (!normalizedValue) return;
      attributes.push({ Name: name, Value: normalizedValue });
    };

    addAttribute('contentType', payload.contentType);
    addAttribute('fileType', payload.fileType);
    addAttribute('preSignMethod', payload.preSignMethod);

    return attributes.reduce(
      (acc, attr) => {
        acc[attr.Name] = attr.Value;
        return acc;
      },
      {} as Record<string, string>
    );
  }

  async execute(event: APIGatewayProxyEvent): Promise<PageDataType> {
    let tokenPayload: Record<string, any> | null = null;
    let token: string | undefined = undefined;
    const logId = event.requestContext.requestId;

    this.logger.info(
      'Iniciando execução do caso de uso SalvarFotoPerfilUseCase',
      { logId },
      { payload: event.body }
    );

    try {
      token = extractToken(event.headers);
      if (!token) {
        this.logger.error(
          'Parâmetro identificador não informado',
          {
            logId,
            'param-name': 'X-API-ACCESS',
            label: 'SalvarFotoPerfilUseCase',
          },
          new Error('Token de acesso não informado no cabeçalho da requisição'),
          { eventHeaders: event.headers, eventBody: event.body }
        );
        const result: PageDataType = {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 400,
          Message: 'Parâmetro identificador não informado',
        };
        return result;
      }

      tokenPayload = await verifyToken(token);
      if (!tokenPayload || !tokenPayload.sub) {
        const result: PageDataType = {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 403,
          Message: 'Usuário não autorizado',
        };
        return result;
      }

      if (!event.body) {
        return {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 400,
          Message: 'Dados de foto de perfil não informados no body da requisição',
        };
      }

      const requestBody = JSON.parse(event.body) as Record<string, any>;
      const attributes = this.extrairDadosFotoPerfil({
        ...requestBody,
      });

      if (Object.keys(attributes).length === 0) {
        return {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 400,
          Message: 'Dados de foto de perfil não informados no body da requisição',
        };
      }

      if (
        attributes.preSignMethod &&
        !['PUT', 'GET'].includes(attributes.preSignMethod.toUpperCase())
      ) {
        return {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 400,
          Message: 'Método de pré-assinatura inválido. Deve ser "PUT" ou "GET".',
        };
      }

      if (!attributes.contentType) {
        return {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 400,
          Message: 'Content-Type da foto de perfil não informado no body da requisição',
        };
      }

      if (!attributes.fileType) {
        return {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 400,
          Message: 'Tipo de arquivo da foto de perfil não informado no body da requisição',
        };
      }

      const picturePath = process.env.S3_CAMINHO_FOTOS_PERFIL ?? '';
      const bucketName = process.env.S3_BUCKET_RECURSOS ?? '';
      const contentType = attributes.contentType ?? '';
      const extension = attributes.fileType ?? '';
      const objectName = `${picturePath}/${tokenPayload?.sub}.${extension}`;

      let urlFotoPerfil: string | null = null;

      if (attributes.preSignMethod.toUpperCase() === 'PUT') {
        urlFotoPerfil = await this.s3Repository.createPreSignedUrlPut(
          bucketName,
          objectName,
          contentType
        );
      } else {
        urlFotoPerfil = await this.s3Repository.createPreSignedUrlGet(
          bucketName,
          objectName,
          contentType
        );
      }

      return {
        Items: 1,
        TotalItems: 1,
        TotalPage: 1,
        Page: 1,
        Code: 200,
        PageData: {
          urlFotoPerfil,
        },
      };
    } catch (error) {
      this.logger.error(
        'Não foi possível gerar a URL para upload da foto de perfil',
        {
          logId,
          payload: tokenPayload,
          token,
          label: 'SalvarFotoPerfilUseCase',
        },
        error as Error
      );
      return {
        Code: 500,
        Message: 'Erro ao gerar a URL para upload da foto de perfil',
        Items: 0,
        TotalItems: 0,
        TotalPage: 0,
        Page: 0,
      };
    }
  }
}
