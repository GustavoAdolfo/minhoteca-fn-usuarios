import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { UseCaseInterface, LogService, PageDataType } from '@gustavoadolfo/minhoteca-core-layer';
// import { DynamoDBRepository, ResultType } from '@gustavoadolfo/minhoteca-adapter-layer';
import { registradores } from './registradores';

// const cacheRepository = new DynamoDBRepository();
const logService = new LogService('UsuarioHandler');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'Content-Type,Authorization,X-API-ACCESS,X-API-KEY,X-Amz-Date,X-Amz-Security-Token,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,OPTIONS,POST,PUT,HEAD,PATCH,DELETE',
};

export const handler = async (
  event: APIGatewayEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const logId = event.requestContext.requestId;
  logService.info('Evento recebido:', { logId }, { event, context });

  // const tabelaCache = process.env.TB_CACHE ?? '';

  // let cacheKey =
  //   event.path + (event.queryStringParameters ? JSON.stringify(event.queryStringParameters) : '');
  // cacheKey = cacheKey.replace(/\s/g, '').replace(/[^a-zA-Z0-9:]/g, '_');
  // cacheKey = event.httpMethod.toLowerCase() + '-' + cacheKey;

  // let data: ResultType = {} as unknown as ResultType;
  // try {
  //   data = await cacheRepository.getData(tabelaCache, {
  //     name: 'PageId',
  //     type: 'S',
  //     value: cacheKey,
  //   });
  // } catch (error: unknown) {
  //   logService.error('Erro ao buscar dados no cache:', { logId }, error as Error);
  // }

  // if (data?.data?.length > 0 && data?.data[0]?.content) {
  //   logService.info('Retornando dados a partir do cache.', { logId }, { cacheKey });
  //   return {
  //     statusCode: 200,
  //     headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
  //     body: data.data[0].content,
  //   };
  // }

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
      const dadosEvento = JSON.parse(JSON.stringify(event));
      try {
        const result: PageDataType = await casoDeUso.execute(dadosEvento, logId);

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

        // try {
        //   await cacheRepository.saveData(tabelaCache, {
        //     PageId: cacheKey,
        //     content: JSON.stringify(result),
        //     Expiration: Math.floor(Date.now() / 1000) + 3600 * 12, // Expira em 12 hora
        //   });
        // } catch (error) {
        //   logService.error('Error saving data to cache:', { logId }, error as Error);
        // }

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
