'use strict';

/**
 * Validação de CPF (dígitos verificadores).
 * Aceita CPF com ou sem máscara; normaliza para 11 dígitos.
 */

/**
 * Remove qualquer caractere não numérico do CPF.
 * @param {string} cpf
 * @returns {string}
 */
function normalizar(cpf) {
  return String(cpf || '').replace(/\D/g, '');
}

/**
 * Valida os dígitos verificadores de um CPF de 11 dígitos.
 * @param {string} cpf CPF já normalizado (somente dígitos).
 * @returns {boolean}
 */
function validarDigitos(cpf) {
  if (cpf.length !== 11) {
    return false;
  }

  // Rejeita sequências de dígitos repetidos (ex.: 111.111.111-11).
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  for (let t = 9; t < 11; t++) {
    let soma = 0;
    for (let i = 0; i < t; i++) {
      soma += Number(cpf[i]) * (t + 1 - i);
    }
    const resto = (10 * soma) % 11;
    const digito = resto === 10 ? 0 : resto;
    if (Number(cpf[t]) !== digito) {
      return false;
    }
  }

  return true;
}

/**
 * Valida um CPF (com ou sem máscara) e retorna a versão normalizada.
 * @param {string} cpf
 * @returns {{ valido: boolean, cpf?: string }}
 */
function validar(cpf) {
  const limpo = normalizar(cpf);
  if (!validarDigitos(limpo)) {
    return { valido: false };
  }
  return { valido: true, cpf: limpo };
}

module.exports = { normalizar, validarDigitos, validar };
