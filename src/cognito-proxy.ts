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
} from '@aws-sdk/client-cognito-identity-provider';
import { ConfigServiceClient } from '@aws-sdk/client-config-service';
import { optionsConfiguration, reviewOptions } from './commom';
import { createLogger, format, transports } from 'winston';

const { timestamp, label, combine } = format;
const formatoLog = combine(
  label({ label: 'minhoteca-dynamodb-proxy' }),
  timestamp(),
  format.splat(),
  format.json()
);
const logger = createLogger({
  level: 'info',
  format: formatoLog,
  transports: [new transports.Console()],
});

const loggerInspect = (message: string, info?: object) => {
  /* istanbul ignore next */
  if (process.env['ENVIRONMENT']?.toLowerCase() === 'debug') {
    info ? logger.info(message, info) : logger.info(message);
  }
};

const createCognitoClient = (options: ConfigServiceClient): CognitoIdentityProviderClient => {
  const config = reviewOptions(options);
  return new CognitoIdentityProviderClient(config);
};

export const getUserAttributes = async (
  token: string,
  region: string,
  endpoint?: string
): Promise<GetUserCommandOutput> => {
  const input = {
    AccessToken: token,
  };

  const config = optionsConfiguration(region, endpoint);
  const client = createCognitoClient(config);
  const command = new GetUserCommand(input);
  const response = await client.send(command);
  return response;
};

export const adminGetUserAttributes = async (
  sub: string,
  region: string
): Promise<AdminGetUserCommandOutput> => {
  const config = optionsConfiguration(region); //, endpoint);
  const client = createCognitoClient(config);
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
) => {
  const config = optionsConfiguration(region, endpoint);
  const client = createCognitoClient(config);
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
  const config = optionsConfiguration(region, endpoint);
  const client = createCognitoClient(config);
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
  loggerInspect('listUsers', { response });
  return response.Users ?? ([] as UserType[]);
};
