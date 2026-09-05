'use strict';

/**
 * Repositório de clientes.
 *
 * Enquanto o RDS (`oficina-infra-database`) não estiver provisionado, usamos um
 * MOCK atrás da função `buscarClientePorCpf`. Para trocar pela consulta real,
 * basta substituir a implementação abaixo por uma query no PostgreSQL.
 */

// Mock de clientes. `status` pode ser 'ativo' ou 'inativo'.
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

/**
 * Busca um cliente pelo CPF (11 dígitos, sem máscara).
 * @param {string} cpf
 * @returns {Promise<{ id: number, cpf: string, nome: string, status: string } | null>}
 */
async function buscarClientePorCpf(cpf) {
  // TODO: substituir o mock pela consulta real no RDS PostgreSQL.
  const cliente = MOCK_CLIENTES.find((c) => c.cpf === cpf);
  return cliente ? { ...cliente } : null;
}

module.exports = { buscarClientePorCpf };
