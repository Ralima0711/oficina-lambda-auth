'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const { criarHandler } = require('../src/handler');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

// SSM fake que devolve a chave privada gerada no teste.
const ssmFake = {
  send: async () => ({ Parameter: { Value: privateKey } }),
};

// Repo fake: ativo / inativo / não encontrado.
const repoFake = {
  buscarClientePorCpf: async (cpf) => {
    if (cpf === '52998224725') return { id: 1, cpf, nome: 'Ativo', status: 'ativo' };
    if (cpf === '11144477735') return { id: 2, cpf, nome: 'Inativo', status: 'inativo' };
    return null;
  },
};

const handler = criarHandler({ buscarClientePorCpf: repoFake.buscarClientePorCpf, ssm: ssmFake });

function evento(cpf) {
  return {
    body: JSON.stringify({ cpf }),
    requestContext: { requestId: 'teste-001' },
  };
}

test('200 — CPF válido e cliente ativo retorna token', async () => {
  const res = await handler(evento('529.982.247-25'));
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.token_type, 'Bearer');
  assert.equal(body.expires_in, 3600);
  const decoded = jwt.verify(body.token, publicKey, { algorithms: ['RS256'] });
  assert.equal(decoded.iss, 'oficina-lambda-auth');
  assert.equal(decoded.aud, 'oficina-mecanica-api');
});

test('400 — CPF inválido', async () => {
  const res = await handler(evento('123'));
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).error, 'cpf_invalido');
});

test('400 — CPF ausente', async () => {
  const res = await handler(evento(undefined));
  assert.equal(res.statusCode, 400);
  assert.equal(JSON.parse(res.body).error, 'cpf_invalido');
});

test('404 — cliente não encontrado (CPF válido não cadastrado)', async () => {
  const res = await handler(evento('39053344705'));
  assert.equal(res.statusCode, 404);
  assert.equal(JSON.parse(res.body).error, 'cliente_nao_encontrado');
});

test('403 — cliente inativo', async () => {
  const res = await handler(evento('111.444.777-35'));
  assert.equal(res.statusCode, 403);
  assert.equal(JSON.parse(res.body).error, 'cliente_inativo');
});

test('500 — erro interno não vaza detalhe', async () => {
  const handlerErro = criarHandler({
    buscarClientePorCpf: async () => {
      throw new Error('segredo interno');
    },
    ssm: ssmFake,
  });
  const res = await handlerErro(evento('52998224725'));
  assert.equal(res.statusCode, 500);
  const body = JSON.parse(res.body);
  assert.equal(body.error, 'erro_interno');
  assert.ok(!JSON.stringify(body).includes('segredo interno'));
});
