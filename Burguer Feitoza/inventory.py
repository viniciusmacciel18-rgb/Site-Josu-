import os
import sqlite3


GRAMATURAS_PADRAO = (140, 160, 180, 200, 220, 240, 260)
SABORES_PADRAO = ("Costela", "Fraldinha")
TAMANHOS_PACK_PADRAO = (5, 10)


def conectar_banco(caminho):
    os.makedirs(os.path.dirname(caminho) or ".", exist_ok=True)
    conexao = sqlite3.connect(caminho, timeout=10)
    conexao.row_factory = sqlite3.Row
    conexao.execute("PRAGMA foreign_keys = ON")
    conexao.execute("PRAGMA busy_timeout = 10000")
    return conexao


def inicializar_banco(caminho):
    banco = conectar_banco(caminho)
    try:
        banco.executescript(
            """
            CREATE TABLE IF NOT EXISTS produtos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sabor TEXT NOT NULL,
                gramatura INTEGER NOT NULL CHECK (gramatura BETWEEN 140 AND 260),
                pack INTEGER NOT NULL CHECK (pack IN (5, 10)),
                estoque INTEGER NOT NULL DEFAULT 0 CHECK (estoque >= 0),
                ativo INTEGER NOT NULL DEFAULT 1 CHECK (ativo IN (0, 1)),
                UNIQUE (sabor, gramatura, pack)
            );

            CREATE TABLE IF NOT EXISTS vendas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                produto_id INTEGER NOT NULL REFERENCES produtos(id),
                quantidade INTEGER NOT NULL CHECK (quantidade > 0),
                registrada_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_produtos_ativos
            ON produtos (ativo, sabor, gramatura, pack);

            CREATE INDEX IF NOT EXISTS idx_vendas_registradas
            ON vendas (registrada_em DESC);
            """
        )
        banco.executemany(
            """
            INSERT OR IGNORE INTO produtos (sabor, gramatura, pack, estoque)
            VALUES (?, ?, ?, 0)
            """,
            (
                (sabor, gramatura, pack)
                for sabor in SABORES_PADRAO
                for gramatura in GRAMATURAS_PADRAO
                for pack in TAMANHOS_PACK_PADRAO
            ),
        )
        banco.commit()
    finally:
        banco.close()


def listar_produtos(caminho, incluir_inativos=False):
    filtro = "" if incluir_inativos else "WHERE ativo = 1"
    banco = conectar_banco(caminho)
    try:
        return banco.execute(
            f"""
            SELECT id, sabor, gramatura, pack, estoque, ativo
            FROM produtos
            {filtro}
            ORDER BY sabor COLLATE NOCASE, gramatura, pack
            """
        ).fetchall()
    finally:
        banco.close()
