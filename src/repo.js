'use strict';

const { Pool } = require('pg');

/**
 * Repositório de clientes — consulta o RDS PostgreSQL real.
 *
 * A tabela `clientes` segue as migrations do repo oficina-mecanica-api:
 * o CPF do cliente vive na coluna `documento` (11 dígitos, sem máscara).
 * Ainda não existe coluna `status` na tabela, então todo cliente encontrado
 * é considerado 'ativo'. Quando o schema ganhar `status`, basta adicioná-lo
 * ao SELECT abaixo e devolver o valor real.
 *
 * Credenciais/endpoint vêm de variáveis de ambiente (nada hardcoded):
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 *
 * Para rodar SEM banco (testes locais), defina USE_MOCK_DB=true.
 */

const USE_MOCK_DB =
  process.env.USE_MOCK_DB === 'true' || process.env.USE_MOCK_DB === '1';

// Mock de clientes (USE_MOCK_DB=true). `status` pode ser 'ativo' ou 'inativo'.
const MOCK_CLIENTES = [
  {
    id: 1,
    cpf: '52998224725',
    nome: 'Cliente Ativo',
    status: 'ativo',
  },
  {
    id: 2,
    cpf: '11144477735',
    nome: 'Cliente Inativo',
    status: 'inativo',
  },
];

let pool = null;

/**
 * TLS da conexão com o RDS.
 *
 * Ordem: (1) se DB_SSL_CA vier preenchida, valida a cadeia contra esse CA —
 * é o modo correto; (2) DB_SSL_INSECURE=true criptografa mas NÃO valida o
 * certificado — exceção consciente para o lab do AWS Academy, onde o CA
 * bundle não está disponível; (3) padrão: valida a cadeia.
 *
 * A opção (2) nunca deve ser usada em produção.
 */
function configurarSsl() {
  if (process.env.DB_SSL_CA) {
    return { ca: process.env.DB_SSL_CA, rejectUnauthorized: true };
  }

  if (process.env.DB_SSL_INSECURE === 'true') {
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: true };
}

function obterPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: configurarSsl(),
      // Lambda: uma conexão por container é suficiente.
      max: 1,
      connectionTimeoutMillis: 3000,
      idleTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function buscarNoRds(cpf) {
  const { rows } = await obterPool().query(
    `SELECT id, nome, documento AS cpf
       FROM clientes
      WHERE documento = $1
      LIMIT 1`,
    [cpf]
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    id: Number(rows[0].id),
    cpf: rows[0].cpf,
    nome: rows[0].nome,
    status: 'ativo',
  };
}

/**
 * Busca um cliente pelo CPF (11 dígitos, sem máscara).
 * @param {string} cpf
 * @returns {Promise<{ id: number, cpf: string, nome: string, status: string } | null>}
 */
async function buscarClientePorCpf(cpf) {
  if (USE_MOCK_DB) {
    const cliente = MOCK_CLIENTES.find((c) => c.cpf === cpf);
    return cliente ? { ...cliente } : null;
  }

  return buscarNoRds(cpf);
}

module.exports = { buscarClientePorCpf };
