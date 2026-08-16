import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UseCaseInterface, LogService, PageDataType } from '@gustavoadolfo/minhoteca-core-layer';
import { registradores } from './registradores';

const logService = new LogService('UsuarioHandler');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,Authorization,X-API-ACCESS,X-API-KEY,X-Amz-Date,X-Amz-Security-Token,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT,HEAD,PATCH,DELETE',
};

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const logId = event.requestContext.requestId;
  logService.info(
    'Evento recebido',
    {
      logId,
      eventPath: event.path,
      httpMethod: event.httpMethod,
      headersCount: Object.keys(event.headers ?? {}).length,
      bodyLength: event.body ? Buffer.byteLength(event.body, 'utf8') : 0,
    },
    {
      requestContext: {
        stage: event.requestContext?.stage,
        sourceIp: event.requestContext?.identity?.sourceIp,
      },
    }
  );

  const eventMethods = event.httpMethod.toLowerCase() as keyof typeof registradores;
  const registradoresDoMetodo = registradores[eventMethods];
  const registrador =
    event.path &&
    registradoresDoMetodo?.find((r) => {
      const chave = Object.keys(r)[0];
      if (chave.startsWith('^') && chave.endsWith('$') && chave.length > 2) {
        const regex = new RegExp(chave, 'gmi');
        return regex.test(event.path);
      } else {
        return event.path.toLowerCase() === chave.toLowerCase();
      }
    });

  if (registrador) {
    const chaveSelecionada = Object.keys(registrador)[0];
    const casoDeUso = registrador[chaveSelecionada as keyof typeof registrador] as UseCaseInterface;

    if (casoDeUso) {
      logService.info(
        'Use case encontrado para o path e método correspondentes. Executando o caso de uso.',
        {
          logId,
          keyPath: chaveSelecionada,
          eventPath: event.path,
          httpMethod: event.httpMethod,
          casoDeUsoName: casoDeUso.constructor.name,
        }
      );
      try {
        const result: PageDataType = await casoDeUso.execute(event, logId);

        if (result.Code && result.Code >= 400) {
          logService.warn(
            'Use case retornou código de erro. Retornando resposta de erro.',
            {
              logId,
              keyPath: chaveSelecionada,
              eventPath: event.path,
              httpMethod: event.httpMethod,
              casoDeUsoName: casoDeUso.constructor.name,
            },
            { result }
          );
          return {
            statusCode: result.Code,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: result.Message }),
          } as APIGatewayProxyResult;
        }

        if (result.Code && result.Code < 200) {
          logService.warn(
            'Use case retornou código de resposta inválido. Retornando resposta de erro.',
            {
              logId,
              keyPath: chaveSelecionada,
              eventPath: event.path,
              httpMethod: event.httpMethod,
              casoDeUsoName: casoDeUso.constructor.name,
            },
            { result }
          );
          return {
            statusCode: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'Erro interno ao processar a requisição. LogId: ' + logId,
            }),
          } as APIGatewayProxyResult;
        }

        const sizeInKB = Buffer.byteLength(JSON.stringify(result), 'utf8') / 1024;
        logService.info('Response size in KB:', { logId }, { sizeInKB });

        logService.info(
          'Retornando resposta bem-sucedida com dados.',
          {
            logId,
            keyPath: chaveSelecionada,
            sizeInKB,
            eventPath: event.path,
            httpMethod: event.httpMethod,
          },
          { result }
        );

        return {
          statusCode: result.Code,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(result),
        } as APIGatewayProxyResult;
      } catch (error: unknown) {
        logService.error(
          'Erro na execução do caso de uso',
          {
            logId,
            keyPath: chaveSelecionada,
            eventPath: event.path,
            httpMethod: event.httpMethod,
          },
          error as Error
        );
        return {
          statusCode: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Erro interno ao processar a requisição. LogId: ' + logId,
          }),
        } as APIGatewayProxyResult;
      }
    }

    logService.warn(
      'Use case não encontrado para o path e método correspondentes, retornando resposta de erro.',
      {
        logId,
        keyPath: chaveSelecionada,
        eventPath: event.path,
        httpMethod: event.httpMethod,
      }
    );

    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Bad Request: Missing body or use case. LogId: ' + logId }),
    } as APIGatewayProxyResult;
  }

  logService.info('Registrador de requisição não encontrado, retornando resposta de erro.', {
    logId,
    eventPath: event.path,
    httpMethod: event.httpMethod,
  });

  return {
    statusCode: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Erro interno. LogId: ' + logId }),
  } as APIGatewayProxyResult;
};
