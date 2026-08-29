# MeuNegocio
SaaS de gestão para barbearias, salões, spas e outros negócios. Agenda, clientes, financeiro e gestão em um só lugar.

## Estrutura do Firebase

- Autenticação: Firebase Authentication com e-mail e senha.
- Perfis: `usuarios/{uid}`.
- Dados de cada negócio: `estabelecimentos/{estabelecimentoId}/{colecao}`.
- O painel obtém o estabelecimento pelo perfil do usuário autenticado.

As regras usadas no projeto estão versionadas em `firestore.rules`.
