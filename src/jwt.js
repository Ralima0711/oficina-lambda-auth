'use strict';

const jwt = require('jsonwebtoken');

const ISS = process.env.JWT_ISS || 'oficina-lambda-auth';
const AUD = process.env.JWT_AUD || 'oficina-mecanica-api';
const TTL = Number(process.env.JWT_TTL || 3600);

/**
 * Assina um JWT em RS256 com os claims definidos no contrato de autenticação.
 * @param {{ id: number, cpf: string, status: string }} cliente
 * @param {string} chavePrivada PEM da chave privada RSA.
 * @returns {string} token JWT assinado.
 */
function assinar(cliente, chavePrivada) {
  const agora = Math.floor(Date.now() / 1000);

  const payload = {
    sub: String(cliente.id),
    cpf: cliente.cpf,
    client_id: cliente.id,
    typ: 'cliente',
    status: cliente.status,
    iss: ISS,
    aud: AUD,
    iat: agora,
    exp: agora + TTL,
  };

  return jwt.sign(payload, chavePrivada, {
    algorithm: 'RS256',
  });
}

module.exports = { assinar, ISS, AUD, TTL };
