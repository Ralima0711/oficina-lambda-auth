# oficina-lambda-auth

Function serverless de autenticação do **Tech Challenge SOAT — Fase 3** (Grupo 32).
Valida o **CPF** do cliente, consulta sua existência e status na base de dados e emite um **JWT (RS256)** para consumo das APIs protegidas da oficina.

> Repositório 1 de 4 da Fase 3. Ver também: [oficina-mecanica-api](https://github.com/Ralima0711/oficina-mecanica-api) · [oficina-infra-k8s](https://github.com/Ralima0711/oficina-infra-k8s) · [oficina-infra-database](https://github.com/Ralima0711/oficina-infra-database)

## Propósito

Autenticação desacoplada da aplicação principal, exposta via **API Gateway**. Substitui o login por e-mail/senha da Fase 2 pela autenticação por CPF exigida na Fase 3.

## Tecnologias

| Tecnologia | Papel |
|---|---|
| AWS Lambda | Runtime serverless da function |
| AWS SAM | Empacotamento e deploy da function |
| AWS API Gateway | Exposição e roteamento do endpoint `/auth` |
| AWS SSM Parameter Store | Guarda da chave privada RSA (SecureString) |
| JWT (RS256) | Token assinado com chave privada; validado na API pela chave pública |
| GitHub Actions | Pipeline CI/CD (build → deploy) |

## Contrato

`POST /auth` — request `{ "cpf": "..." }` → respostas: `200` (token JWT), `400` (CPF inválido), `404` (cliente não encontrado), `403` (cliente inativo).
Especificação completa: [docs/contrato-autenticacao.md no repo da aplicação](https://github.com/Ralima0711/oficina-mecanica-api/blob/develop/docs/contrato-autenticacao.md).

## Execução local

```bash
sam build
sam local invoke AuthFunction -e events/auth.json
```

## Deploy

```bash
sam build
sam deploy --guided   # primeira vez; depois: sam deploy
```

O deploy é automatizado via GitHub Actions nas branches `homolog` e `main`.

## Diagrama

```
Cliente ──POST /auth {cpf}──▶ API Gateway ──▶ Lambda ──▶ RDS (consulta CPF)
                                                 │
                                     assina JWT (RS256) → 200 { token }
```

## Links

- Especificação da API (Swagger): ver repo `oficina-mecanica-api`
- Collection Postman: ver repo `oficina-mecanica-api`

## Regras de contribuição

Branch `main` protegida. Todo merge via **Pull Request** com aprovação de outro membro.

## Time — Grupo 32

Roberta Lima (Tech Lead) · Gustavo Delfino (Infra/CI-CD) · David Tavares (Infra/CI-CD) · Johny David (Aplicação)
