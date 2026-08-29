"""Handler mínimo alinhado ao contrato POST /auth.

A lógica completa (RDS + JWT RS256) é do time de aplicação (Johny).
Este stub permite o SAM build/deploy da pipeline de infra enquanto a function é evoluída.
"""

from __future__ import annotations

import json
import re

CPF_RE = re.compile(r"\D")


def _response(status: int, body: dict) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def _normalize_cpf(raw: str) -> str:
    return CPF_RE.sub("", raw or "")


def _cpf_valido(cpf: str) -> bool:
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False

    def dv(digs: str, peso_inicial: int) -> int:
        soma = sum(int(d) * p for d, p in zip(digs, range(peso_inicial, 1, -1)))
        resto = (soma * 10) % 11
        return 0 if resto == 10 else resto

    return dv(cpf[:9], 10) == int(cpf[9]) and dv(cpf[:10], 11) == int(cpf[10])


def handler(event, _context):
    try:
        body = event.get("body") or "{}"
        if event.get("isBase64Encoded"):
            import base64

            body = base64.b64decode(body).decode("utf-8")
        payload = json.loads(body) if isinstance(body, str) else body
    except (json.JSONDecodeError, ValueError, TypeError):
        return _response(400, {"error": "cpf_invalido", "message": "CPF inválido."})

    cpf = _normalize_cpf(str(payload.get("cpf", "")))
    if not _cpf_valido(cpf):
        return _response(400, {"error": "cpf_invalido", "message": "CPF inválido."})

    return _response(
        501,
        {
            "error": "nao_implementado",
            "message": "Consulta ao RDS e emissão do JWT RS256 ainda não foram implementadas nesta function.",
        },
    )
