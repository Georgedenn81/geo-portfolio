#!/usr/bin/env python3
"""Confere se toda mídia referenciada no portfolio.html existe no repositório
e não está excluída do deploy pelo .vercelignore.

Roda no GitHub Actions a cada push (e pode rodar local: python3 scripts/checa_midia.py).
Sai com código 1 (falha o workflow, GitHub avisa por e-mail) se achar referência quebrada.
"""
import html
import json
import os
import re
import sys
from urllib.parse import unquote

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def coleta_refs(src):
    """Todas as refs img/... e video/... — do bloco de dados do admin e do HTML."""
    refs = set()

    m = re.search(
        r'<script id="__geo_admin_data__" type="application/json">(.*?)</script>',
        src, re.S,
    )
    if not m:
        print("ERRO: bloco __geo_admin_data__ não encontrado no portfolio.html")
        sys.exit(1)
    dados = json.loads(m.group(1))

    def anda(o):
        if isinstance(o, dict):
            for v in o.values():
                anda(v)
        elif isinstance(o, list):
            for v in o:
                anda(v)
        elif isinstance(o, str):
            for hit in re.findall(r'(?:img|video)/[^\s"\'()<>]+', o):
                refs.add(html.unescape(hit))

    anda(dados)

    for hit in re.findall(r'(?:src|href)="[^"]*?((?:img|video)/[^"]+)"', src):
        refs.add(html.unescape(hit))
    return refs


def padroes_vercelignore():
    caminho = os.path.join(RAIZ, ".vercelignore")
    if not os.path.exists(caminho):
        return []
    with open(caminho, encoding="utf-8") as f:
        return [l.strip() for l in f if l.strip() and not l.startswith("#")]


def ignorado_no_deploy(ref, padroes):
    for p in padroes:
        p = p.rstrip("/")
        if ref == p or ref.startswith(p + "/"):
            return p
    return None


def main():
    with open(os.path.join(RAIZ, "portfolio.html"), encoding="utf-8") as f:
        src = f.read()

    refs = coleta_refs(src)
    padroes = padroes_vercelignore()
    problemas = []

    for ref in sorted(refs):
        caminho = unquote(ref)
        if not os.path.exists(os.path.join(RAIZ, caminho)):
            problemas.append(f"NÃO EXISTE NO REPO: {ref}")
            continue
        p = ignorado_no_deploy(caminho, padroes)
        if p:
            problemas.append(f"EXCLUÍDO DO DEPLOY (.vercelignore: '{p}'): {ref}")

    print(f"{len(refs)} referência(s) de mídia conferida(s).")
    if problemas:
        print(f"\n⚠ {len(problemas)} problema(s) — o site vai mostrar 404:\n")
        for pr in problemas:
            print("  " + pr)
        sys.exit(1)
    print("✓ Tudo certo: toda mídia referenciada existe e será publicada.")


if __name__ == "__main__":
    main()
