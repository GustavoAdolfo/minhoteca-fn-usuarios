import {
  GetUserCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommandInput,
  AdminUpdateUserAttributesCommand,
  AttributeType,
  ListUsersCommand,
  ListUsersResponse,
  UserType,
  CognitoIdentityProviderClient,
  AdminGetUserCommandOutput,
  GetUserCommandOutput,
  AdminUpdateUserAttributesCommandOutput,
} from '@aws-sdk/client-cognito-identity-provider';
import { ConfigServiceClient } from '@aws-sdk/client-config-service';
import { optionsConfiguration, reviewOptions } from '../commom';

const cognitoClientCache = new Map<string, CognitoIdentityProviderClient>();

const createCognitoClient = (options: ConfigServiceClient): CognitoIdentityProviderClient => {
  const config = reviewOptions(options);
  return new CognitoIdentityProviderClient(config);
};

const getSharedCognitoClient = (
  region: string,
  endpoint?: string
): CognitoIdentityProviderClient => {
  const cacheKey = `${region}:${endpoint ?? 'default'}`;
  const cachedClient = cognitoClientCache.get(cacheKey);
  if (cachedClient) {
    return cachedClient;
  }

  const config = optionsConfiguration(region, endpoint);
  const client = createCognitoClient(config);
  cognitoClientCache.set(cacheKey, client);
  return client;
};

export const getUserAttributes = async (
  token: string,
  region: string,
  endpoint?: string
): Promise<GetUserCommandOutput> => {
  const input = {
    AccessToken: token,
  };

  const client = getSharedCognitoClient(region, endpoint);
  const command = new GetUserCommand(input);
  const response = await client.send(command);
  return response;
};

export const adminGetUserAttributes = async (
  sub: string,
  region: string
): Promise<AdminGetUserCommandOutput> => {
  const client = getSharedCognitoClient(region);
  const input = {
    // AdminGetUserRequest
    UserPoolId: process.env.USER_POOL_ID ?? '',
    Username: sub ?? '',
  };
  const command = new AdminGetUserCommand(input);
  const response = await client.send(command);
  return response;
};

export const adminUpdateUserAttributes = async (
  sub: string,
  region: string,
  attributes: AttributeType[],
  endpoint?: string
): Promise<AdminUpdateUserAttributesCommandOutput> => {
  const client = getSharedCognitoClient(region, endpoint);
  const input: AdminUpdateUserAttributesCommandInput = {
    UserPoolId: process.env.USER_POOL_ID, // required
    Username: sub, // required
    UserAttributes: attributes,
  };
  const command = new AdminUpdateUserAttributesCommand(input);
  const response = await client.send(command);
  return response;
};

export const listUsers = async (region: string, endpoint?: string): Promise<UserType[] | null> => {
  const client = getSharedCognitoClient(region, endpoint);
  const input = {
    // ListUsersRequest
    UserPoolId: process.env.USER_POOL_ID, // required
    AttributesToGet: [
      // SearchedAttributeNamesListType
      'sub',
    ],
    // PaginationToken: "STRING_VALUE",
    Filter: '"status"="Enabled"',
  };
  const command = new ListUsersCommand(input);
  const response: ListUsersResponse = await client.send(command);
  return response.Users ?? ([] as UserType[]);
};
