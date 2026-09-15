/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfigServiceClient } from '@aws-sdk/client-config-service';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { APIGatewayProxyEventHeaders } from 'aws-lambda';
import { Agent } from 'http';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export const reviewOptions = (options: ConfigServiceClient) => {
  const config: Record<string, unknown> = {
    requestHandler: new NodeHttpHandler({
      httpAgent: new Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        timeout: 5000,
      }),
    }),
    region: options.config.region as string,
    maxAttempts: options.config.maxAttempts as number,
  };

  if (options.config.endpoint) {
    config.endpoint = options.config.endpoint;
  }
  return config;
};

export const optionsConfiguration = (
  region: string,
  endpoint?: string,
  maxAttempts = 5
): ConfigServiceClient => {
  if (endpoint) {
    return new ConfigServiceClient({
      region: region,
      endpoint: endpoint,
      maxAttempts: maxAttempts,
    });
  }
  return new ConfigServiceClient({
    region: region,
    maxAttempts: maxAttempts,
  });
};

export function extractToken(headers: APIGatewayProxyEventHeaders): string | undefined {
  const raw = headers?.['x-api-access'] ?? headers?.['X-API-ACCESS'] ?? headers?.['X-Api-Access'];

  if (!raw) {
    return undefined;
  }

  return raw.replace(/^Bearer\s+/i, '').trim();
}

export async function verifyToken(token: string): Promise<Record<string, any> | null> {
  if (
    (process.env.ENVIRONMENT ?? '').toLowerCase() === 'local' ||
    process.env.USE_FAKE_AUTH === 'true'
  ) {
    return {
      sub: 'local-user-1',
      username: 'local.user',
      email: 'local@minhoteca.test',
      'cognito:username': 'local.user',
    };
  }

  const userPoolId = process.env.USER_POOL_ID ?? '';
  const tokenUse = 'access';
  const clientId = process.env.CLIENT_ID_TOKEN ?? '';
  const scope = 'aws.cognito.signin.user.admin';
  let payload: Record<string, any> | null = null;

  try {
    const verifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse,
      clientId,
    });
    payload = await verifier.verify(token, { clientId, tokenUse, scope });
  } catch (error) {
    throw error;
  }
  if (!payload?.sub) {
    throw new Error('Token inválido: sub não encontrado no payload');
  }
  return payload;
}
