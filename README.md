# oficina-lambda-auth

Function serverless de autenticação do **Tech Challenge SOAT — Fase 3** (Grupo 183).
Valida o **CPF** do cliente, consulta sua existência e status na base de dados e emite um **JWT (RS256)** para consumo das APIs protegidas da oficina.

> Repositório 1 de 4 da Fase 3. Ver também: [oficina-mecanica-api](https://github.com/Ralima0711/oficina-mecanica-api) · [oficina-infra-k8s](https://github.com/Ralima0711/oficina-infra-k8s) · [oficina-infra-database](https://github.com/Ralima0711/oficina-infra-database)

## Propósito

Autenticação desacoplada da aplicação principal, exposta via **API Gateway (Kong, no EKS)**. Substitui o login por e-mail/senha da Fase 2 pela autenticação por CPF exigida na Fase 3.

A pipeline SAM (`homolog` / `main`) já está neste repositório. O handler valida CPF, consulta o cliente no **RDS PostgreSQL** (com fallback mock via `USE_MOCK_DB`) e emite JWT RS256.

## Tecnologias

| Tecnologia | Papel |
|---|---|
| AWS Lambda | Runtime serverless da function |
| AWS SAM | Empacotamento e deploy da function |
| Kong (API Gateway no EKS) | Exposição e roteamento do endpoint `/auth` |
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

> **Nota:** a Lambda lê a chave privada do SSM em runtime. Para rodar localmente, crie o parâmetro
> `/oficina/auth/jwt-private-key` (SecureString) com a chave privada RSA, ou injete um mock nos testes.

### Consulta ao banco (RDS x mock)

Por padrão a Lambda consulta o **RDS PostgreSQL** usando as variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER` e `DB_PASSWORD` (sem valores hardcoded — definidas no deploy, ver seção Deploy).

Para rodar **sem banco** (testes locais/CI), mantenha o mock atrás da flag:

```bash
USE_MOCK_DB=true sam local invoke AuthFunction -e events/auth.json
```

A coluna consultada é `clientes.documento` (schema das migrations do `oficina-mecanica-api`).

## Testes unitários

```bash
npm install
npm test
```

Cobrem: validação de CPF (dígitos verificadores), assinatura RS256 com os claims do contrato e
as respostas 200/400/404/403/500 do `POST /auth`.

## Deploy

```bash
cp samconfig.toml.example samconfig.toml
sam build
sam deploy --guided   # primeira vez; depois: sam deploy
```

O deploy é automatizado via GitHub Actions nas branches `homolog` e `main`.

A function entra na **VPC** (mesmas subnets do RDS). O template cria um SG só da Lambda com egress `5432` para o SG do banco (`oficina-mecanica-db-sg`, que já libera 5432 na CIDR da VPC) e 443 para o SSM.

**Nenhum identificador de ambiente fica no repositório.** VPC, subnets, SG do RDS, role e credenciais entram por `parameter-overrides`; sem eles o template continua válido e a função sobe fora da VPC. O pipeline falha com o nome do secret que faltou, em vez de fazer deploy de uma função que só erra em runtime.

### Secrets do repositório

Cadastre em **Settings → Secrets and variables → Actions → Repository secrets**.
Se usar Environment (`homolog` / `production`), o job de deploy lê os dois:
o `HAS_AWS` é avaliado **no job** (depois de `environment:`), não no topo do workflow.

| Secret | Obrigatório | Para quê |
|---|---|---|
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | sim | credenciais do deploy |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | sim | conexão com o RDS (`DB_PORT` opcional, default 5432) |
| `LAMBDA_VPC_ID`, `LAMBDA_SUBNET_IDS`, `LAMBDA_RDS_SG_ID` | sim | colocar a função na VPC do RDS |
| `LAB_ROLE_ARN` | sim (Academy) | o AWS Academy bloqueia `iam:CreateRole`, então reusamos a `LabRole`. Fora do Academy, deixe vazio e o SAM cria a role com o mínimo: ler só o parâmetro da chave e anexar a função à VPC |
| `JWT_PRIVATE_KEY_B64` | enquanto não houver VPC endpoint | chave privada RSA em **base64**: `base64 -w0 chave.pem` |
| `DB_SSL_INSECURE` | só no lab | `true` aceita o certificado do RDS sem validar a cadeia |

A senha do banco e a chave privada nunca vão no código.

### Duas exceções conhecidas (limitações do AWS Academy)

1. **Chave privada por parâmetro.** Dentro da VPC, sem NAT nem VPC endpoint, a chamada ao SSM não completa — ela pendura até o timeout e o `POST /auth` devolve 500. Enquanto o endpoint `com.amazonaws.<região>.ssm` não existir, a chave vai em `JwtPrivateKeyB64` (`NoEcho`). Com o endpoint criado, basta apagar o secret: a função volta sozinha a ler do SSM, que é o caminho do **ADR-0004**.
2. **TLS do RDS sem validação de cadeia.** `DB_SSL_INSECURE=true` criptografa a conexão mas não valida o certificado, porque o CA bundle não está disponível no lab. Em produção, mantenha `false` e forneça o CA em `DB_SSL_CA` — o código já trata os dois casos.

Após o deploy, copie o output `AuthFunctionName` para o secret `AUTH_LAMBDA_FUNCTION_NAME` do repo `oficina-infra-k8s`.

## Diagrama

```
Cliente ──POST /auth {cpf}──▶ Kong (API Gateway) ──▶ Lambda ──▶ RDS (consulta CPF)
                                                 │
                                     assina JWT (RS256) → 200 { token }
```

## Links

- Especificação da API (Swagger): ver repo `oficina-mecanica-api`
- Collection Postman: ver repo `oficina-mecanica-api`

## Regras de contribuição

Branch `main` protegida. Todo merge via **Pull Request** com aprovação de outro membro.

## Time — Grupo 183

Roberta Lima (Tech Lead) · Gustavo Delfino (Infra/CI-CD) · David Tavares (Infra/CI-CD) · Johny David (Aplicação)
