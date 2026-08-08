/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { LogService, UseCaseInterface, PageDataType } from '@gustavoadolfo/minhoteca-core-layer';
import { adminGetUserAttributes, getUserAttributes } from '../cognito-proxy';
import { extractToken, verifyToken } from '../commom';

export class ObterPerfilUseCase implements UseCaseInterface {
  private logger: LogService;
  constructor() {
    this.logger = new LogService('minhoteca-user-service');
  }

  async getUserAttributes(payload: { sub?: string }): Promise<{ [key: string]: any } | null> {
    const result = await adminGetUserAttributes(payload?.sub ?? '', process.env.AWS_REGION ?? '');

    if (!result['UserAttributes']) {
      this.logger.warn(
        'Usuário não identificado',
        {
          payload,
          label: 'ObterPerfilUseCase',
        },
        { result }
      );
      return null;
    }

    const userAttributes = Array.isArray(result['UserAttributes'])
      ? result['UserAttributes']
          .map((item: { [x: string]: any }) => {
            return { [item['Name']!.toString()]: item['Value'] };
          })
          .reduce((acc: any, curr: any) => {
            return { ...acc, ...curr };
          })
      : result['UserAttributes'];
    return userAttributes;
  }

  async execute(event: APIGatewayProxyEvent): Promise<PageDataType> {
    let payload: Record<string, any> | null = null;
    const logId = event.requestContext.requestId;

    try {
      const token = extractToken(event.headers);
      if (!token) {
        this.logger.error(
          'Parâmetro identificador não informado',
          {
            logId,
            'param-name': 'X-API-ACCESS',
            label: 'ObterPerfilUseCase',
          },
          new Error('Token de acesso não informado no cabeçalho da requisição')
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

      payload = await verifyToken(token);
      if (!payload || !payload.sub) {
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

      const userAttributes = await getUserAttributes(payload.sub, process.env.AWS_REGION ?? '');
      if (!userAttributes) {
        return {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 404,
          Message: 'Usuário não identificado',
        };
      }

      return {
        Items: 1,
        TotalItems: 1,
        TotalPage: 1,
        Page: 1,
        Code: 200,
        PageData: userAttributes,
      };
    } catch (error) {
      this.logger.error(
        'Não foi possível obter os atributos do usuário',
        {
          logId,
          payload,
          label: 'ObterPerfilUseCase',
        },
        error as Error
      );
      return {
        Code: 500,
        Message: 'Erro ao obter perfil do usuário',
        Items: 0,
        TotalItems: 0,
        TotalPage: 0,
        Page: 0,
      };
    }
  }
}
