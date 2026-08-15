/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { LogService, UseCaseInterface, PageDataType } from '@gustavoadolfo/minhoteca-core-layer';
import { adminGetUserAttributes, adminUpdateUserAttributes } from '../cognito-proxy';
import { extractToken, verifyToken } from '../commom';

type CognitoAttribute = {
  Name: string;
  Value: string;
};

export class SalvarPerfilUseCase implements UseCaseInterface {
  private logger: LogService;
  constructor() {
    this.logger = new LogService('minhoteca-user-service');
  }

  private normalizePhoneNumber(phoneNumber?: string): string | undefined {
    if (!phoneNumber) return undefined;

    const sanitized = phoneNumber.replace(/\D/g, '');
    if (!sanitized) return undefined;

    if (sanitized.length === 11 && sanitized.startsWith('55')) {
      return `+${sanitized}`;
    }

    if (sanitized.length === 11) {
      return `+55${sanitized}`;
    }

    if (sanitized.length === 10) {
      return `+55${sanitized}`;
    }

    return `+${sanitized}`;
  }

  private toCognitoAttributes(payload: Record<string, any>): CognitoAttribute[] {
    const attributes: CognitoAttribute[] = [];
    const addAttribute = (name: string, value: unknown) => {
      if (value === undefined || value === null) return;
      const normalizedValue = typeof value === 'string' ? value.trim() : String(value).trim();
      if (!normalizedValue) return;
      attributes.push({ Name: name, Value: normalizedValue });
    };

    const address = payload.address ?? {};
    const zipCode = payload.zipCode ?? address.postalCode ?? '';
    const profile = payload.profile === 'biblioteca' ? 'biblioteca' : 'leitor';
    const phoneNumber = this.normalizePhoneNumber(payload.phoneNumber ?? payload.phone_number);

    addAttribute('name', payload.name);
    addAttribute('given_name', payload.name ?? payload.givenName);
    addAttribute('family_name', payload.familyName ?? payload.lastName);
    addAttribute('phone_number', phoneNumber);
    if (address && Object.keys(address).length > 0) {
      addAttribute('address', JSON.stringify(address));
    }
    addAttribute('custom:zipcode', zipCode);
    addAttribute('profile', profile);
    addAttribute('picture', payload.picture ?? payload.profilePicture);
    addAttribute('custom:acknowledgement', payload.acknowledgement);
    addAttribute('custom:newUser', payload.newUser);

    return attributes;
  }

  async getUserAttributes(payload: { sub?: string }): Promise<{ [key: string]: any } | null> {
    const result = await adminGetUserAttributes(payload?.sub ?? '', process.env.AWS_REGION ?? '');

    if (!result['UserAttributes']) {
      this.logger.warn(
        'Usuário não identificado',
        {
          payload,
          label: 'SalvarPerfilUseCase',
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
      token = extractToken(event.headers);
      if (!token) {
        this.logger.error(
          'Parâmetro identificador não informado',
          {
            logId,
            'param-name': 'X-API-ACCESS',
            label: 'SalvarPerfilUseCase',
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

      if (!event.body) {
        return {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 400,
          Message: 'Dados de perfil não informados no body da requisição',
        };
      }

      const requestBody = JSON.parse(event.body) as Record<string, any>;
      const attributes = this.toCognitoAttributes({
        ...requestBody,
        userId: payload.sub,
      });

      if (!attributes.length) {
        return {
          Items: 0,
          TotalItems: 0,
          TotalPage: 0,
          Page: 0,
          Code: 400,
          Message: 'Dados de perfil não informados no body da requisição',
        };
      }

      await adminUpdateUserAttributes(payload.sub, process.env.AWS_REGION ?? '', attributes);

      return {
        Items: 1,
        TotalItems: 1,
        TotalPage: 1,
        Page: 1,
        Code: 200,
        Message: 'Perfil do usuário salvo com sucesso',
      };
    } catch (error) {
      this.logger.error(
        'Não foi possível salvar os atributos do usuário',
        {
          logId,
          payload,
          token,
          label: 'SalvarPerfilUseCase',
        },
        error as Error
      );
      return {
        Code: 500,
        Message: 'Erro ao atualizar perfil do usuário',
        Items: 0,
        TotalItems: 0,
        TotalPage: 0,
        Page: 0,
      };
    }
  }
}
