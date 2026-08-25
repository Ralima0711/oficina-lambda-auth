'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const { assinar } = require('../src/jwt');

// Gera um par de chaves RSA 2048 para o teste.
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

test('assina JWT em RS256 com claims corretos', () => {
  const cliente = { id: 1, cpf: '52998224725', status: 'ativo' };
  const token = assinar(cliente, privateKey);

  const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

  assert.equal(decoded.sub, '1');
  assert.equal(decoded.cpf, '52998224725');
  assert.equal(decoded.client_id, 1);
  assert.equal(decoded.status, 'ativo');
  assert.equal(decoded.iss, 'oficina-lambda-auth');
  assert.equal(decoded.aud, 'oficina-mecanica-api');
  assert.equal(decoded.exp - decoded.iat, 3600);
});

test('token não é assinado em HS256 e tem typ=cliente', () => {
  const cliente = { id: 1, cpf: '52998224725', status: 'ativo' };
  const token = assinar(cliente, privateKey);

  const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString());
  assert.equal(header.alg, 'RS256');
  assert.equal(header.typ, 'cliente');
});
