'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { validar, normalizar, validarDigitos } = require('../src/cpf');

test('aceita CPF válido com máscara e normaliza', () => {
  const r = validar('529.982.247-25');
  assert.equal(r.valido, true);
  assert.equal(r.cpf, '52998224725');
});

test('aceita CPF válido sem máscara', () => {
  const r = validar('52998224725');
  assert.equal(r.valido, true);
  assert.equal(r.cpf, '52998224725');
});

test('rejeita CPF ausente', () => {
  assert.equal(validar(undefined).valido, false);
  assert.equal(validar('').valido, false);
});

test('rejeita CPF com dígitos verificadores inválidos', () => {
  assert.equal(validar('52998224726').valido, false);
});

test('rejeita CPF com dígitos repetidos', () => {
  assert.equal(validar('11111111111').valido, false);
});

test('rejeita CPF com tamanho errado', () => {
  assert.equal(validar('123').valido, false);
});

test('normalizar remove máscara', () => {
  assert.equal(normalizar('529.982.247-25'), '52998224725');
});

test('validarDigitos aceita CPF conhecido', () => {
  assert.equal(validarDigitos('52998224725'), true);
});
