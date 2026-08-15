/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { LogService, UseCaseInterface, PageDataType } from '@gustavoadolfo/minhoteca-core-layer';
import { adminGetUserAttributes, getUserAttributes } from '../cognito-proxy';
import { extractToken, verifyToken } from '../commom';

const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

export class ObterPerfilUseCase implements UseCaseInterface {
  private logger: LogService;
  private readonly profileCache = new Map<
    string,
    { expiresAt: number; data: Record<string, any> }
  >();

  constructor() {
    this.logger = new LogService('minhoteca-user-service');
  }

  private getCachedProfile(sub: string): Record<string, any> | null {
    const cachedProfile = this.profileCache.get(sub);
    if (!cachedProfile) {
      return null;
    }

    if (Date.now() > cachedProfile.expiresAt) {
      this.profileCache.delete(sub);
      return null;
    }

    return cachedProfile.data;
  }

  private cacheProfile(sub: string, data: Record<string, any>): void {
    this.profileCache.set(sub, {
      expiresAt: Date.now() + PROFILE_CACHE_TTL_MS,
      data,
    });
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
    let token: string | undefined = undefined;
    const logId = event.requestContext.requestId;

    try {
      const authorizerClaims =
        (event.requestContext as any)?.authorizer?.claims ??
        (event.requestContext as any)?.authorizer?.jwt?.claims ??
        null;

      if (authorizerClaims?.sub) {
        payload = { sub: authorizerClaims.sub };
      } else {
        token = extractToken(event.headers);
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
      }

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

      const cachedProfile = this.getCachedProfile(payload.sub);
      if (cachedProfile) {
        return {
          Items: 1,
          TotalItems: 1,
          TotalPage: 1,
          Page: 1,
          Code: 200,
          PageData: cachedProfile,
        };
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

      this.cacheProfile(payload.sub, userAttributes as Record<string, any>);

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
          token,
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
