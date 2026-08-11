// import { DynamoDBRepository, MongoDBRepository } from '@gustavoadolfo/minhoteca-adapter-layer';

import { ObterPerfilUseCase, SalvarPerfilUseCase } from './use-cases';

// const repository =
//   process.env.DYNAMODB_REPOSITORY && process.env.DYNAMODB_REPOSITORY === 'true'
//     ? new DynamoDBRepository()
//     : MongoDBRepository.getInstance();

export const registradores = {
  get: [
    { '^\/v1\/perfil$': new ObterPerfilUseCase() },
    // { '^\/v1\/perfil/foto$': new ObterFotoPerfilUseCase() },
    // { '^\/v1\/livro\/[A-Fa-f0-9\-]+$': new ObterLivroUseCase(repository) },
    // { '^\/v1\/autores$': new ListarAutorUseCase(repository) },
    // { '^\/v1\/autor\/[A-Fa-f0-9\-]+$': new ObterAutorUseCase(repository) },
  ],
  // post: [{ '^\/v1\/perfil$': new SalvarPerfilUseCase() }],
  // { '^\/v1\/perfil/foto$': new SalvarFotoPerfilUseCase() },
  put: [{ '^\/v1\/perfil$': new SalvarPerfilUseCase() }],
  // delete: [{ '^\/v1\/perfil$': new ExcluirPerfilUseCase() }],
};
