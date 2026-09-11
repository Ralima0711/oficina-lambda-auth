'use strict';

const { validar } = require('./cpf');
const { assinar, TTL } = require('./jwt');
const { buscarClientePorCpf } = require('./repo');

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const SSM_PARAMETER_NAME = process.env.SSM_PRIVATE_KEY_PARAM || '/oficina/auth/jwt-private-key';

/**
 * Monta a resposta HTTP da Lambda.
 */
function responder(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Factory do handler — permite injetar dependências (repo e SSM) para testes
 * e para trocar o mock da consulta pela query real no RDS.
 *
 * @param {object} deps
 * @param {Function} deps.buscarClientePorCpf
 * @param {object} deps.ssm Cliente SSM com método send().
 */
/**
 * SSM fake para uso local (sam local invoke / testes) que lê a chave privada
 * da variável de ambiente JWT_PRIVATE_KEY, evitando a chamada ao SSM.
 */
function chavePrivadaDaEnv() {
  if (process.env.JWT_PRIVATE_KEY) {
    return process.env.JWT_PRIVATE_KEY;
  }

  // PEM tem quebras de linha; em secret/parâmetro do CloudFormation ele viaja
  // em base64. Usado enquanto a função na VPC não alcança o SSM (ADR-0004).
  if (process.env.JWT_PRIVATE_KEY_B64) {
    return Buffer.from(process.env.JWT_PRIVATE_KEY_B64, 'base64').toString('utf8');
  }

  return null;
}

function ssmLocal(chave = chavePrivadaDaEnv()) {
  if (!chave) {
    throw new Error('JWT_PRIVATE_KEY não configurada para modo local.');
  }
  return { send: async () => ({ Parameter: { Value: chave } }) };
}

function criarHandler({ buscarClientePorCpf: buscar, ssm }) {
  let chavePrivadaCache = null;

  async function obterChavePrivada() {
    if (chavePrivadaCache) {
      return chavePrivadaCache;
    }

    const { Parameter } = await ssm.send(
      new GetParameterCommand({ Name: SSM_PARAMETER_NAME, WithDecryption: true })
    );

    if (!Parameter || !Parameter.Value) {
      throw new Error('Chave privada não encontrada no SSM.');
    }

    chavePrivadaCache = Parameter.Value;
    return chavePrivadaCache;
  }

  return async function handler(event) {
    const requestId = event.requestContext?.requestId || 'sem-request-id';

    try {
      let cpf;
      try {
        const body = JSON.parse(event.body || '{}');
        cpf = body.cpf;
      } catch {
        return responder(400, { error: 'cpf_invalido', message: 'CPF inválido.' });
      }

      const resultado = validar(cpf);
      if (!resultado.valido) {
        return responder(400, { error: 'cpf_invalido', message: 'CPF inválido.' });
      }

      const cliente = await buscar(resultado.cpf);

      if (!cliente) {
        return responder(404, { error: 'cliente_nao_encontrado', message: 'Cliente não encontrado.' });
      }

      if (cliente.status !== 'ativo') {
        return responder(403, { error: 'cliente_inativo', message: 'Cliente inativo.' });
      }

      const chavePrivada = await obterChavePrivada();
      const token = assinar(cliente, chavePrivada);

      return responder(200, {
        token,
        token_type: 'Bearer',
        expires_in: TTL,
      });
    } catch (err) {
      // Loga com correlação; não vaza detalhe interno para o cliente.
      console.error(JSON.stringify({ requestId, erro: err.message, stack: err.stack }));
      return responder(500, { error: 'erro_interno', message: 'Erro interno.' });
    }
  };
}

// Handler padrão usado pelo SAM em produção.
// Caminho normal: a chave privada vem do SSM Parameter Store (ADR-0004).
// Se JWT_PRIVATE_KEY (local) ou JWT_PRIVATE_KEY_B64 (lab sem VPC endpoint)
// estiver preenchida, ela tem precedência e o SSM não é chamado.
const chaveDaEnv = chavePrivadaDaEnv();
const ssm = chaveDaEnv
  ? ssmLocal(chaveDaEnv)
  : new SSMClient({ region: process.env.AWS_REGION || 'us-east-1' });
exports.handler = criarHandler({ buscarClientePorCpf, ssm });

// Exportado para testes e para injeção de dependências.
exports.criarHandler = criarHandler;
