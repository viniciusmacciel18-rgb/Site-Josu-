import hmac
import os
import secrets
import sqlite3
from functools import wraps

from dotenv import load_dotenv
from flask import (
    Flask,
    abort,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

load_dotenv()

from inventory import (
    GRAMATURAS_PADRAO,
    TAMANHOS_PACK_PADRAO,
    conectar_banco,
    inicializar_banco,
    listar_produtos,
)


app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("FLASK_SECRET_KEY") or secrets.token_hex(32),
    ADMIN_PASSWORD=os.environ.get("ADMIN_PASSWORD", ""),
    DATABASE=os.environ.get(
        "BURGUER_DATABASE",
        os.path.join(app.instance_path, "estoque.sqlite3"),
    ),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE") == "1",
)
inicializar_banco(app.config["DATABASE"])


def csrf_token():
    if "_csrf_token" not in session:
        session["_csrf_token"] = secrets.token_urlsafe(32)
    return session["_csrf_token"]


app.jinja_env.globals["csrf_token"] = csrf_token


def verificar_csrf():
    enviado = request.form.get("csrf_token", "")
    esperado = session.get("_csrf_token", "")
    if not enviado or not esperado or not hmac.compare_digest(enviado, esperado):
        abort(400, description="Token de segurança inválido. Atualize a página e tente novamente.")


def administrador_necessario(funcao):
    @wraps(funcao)
    def protegida(*args, **kwargs):
        if not session.get("administrador_autenticado"):
            return redirect(url_for("login_admin"))
        return funcao(*args, **kwargs)

    return protegida


def inteiro_formulario(nome, minimo, maximo=None):
    valor = request.form.get(nome, "").strip()
    try:
        numero = int(valor)
    except ValueError:
        raise ValueError(f"Informe um valor numérico válido para {nome}.") from None
    if numero < minimo or (maximo is not None and numero > maximo):
        limite = f" e no máximo {maximo}" if maximo is not None else ""
        raise ValueError(f"O valor de {nome} deve ser no mínimo {minimo}{limite}.")
    return numero


@app.route("/")
def loja():
    produtos = [dict(produto) for produto in listar_produtos(app.config["DATABASE"])]
    return render_template("index.html", catalogo=produtos)


@app.route("/api/catalogo")
def api_catalogo():
    produtos = [dict(produto) for produto in listar_produtos(app.config["DATABASE"])]
    return jsonify(produtos)


@app.route("/admin/login", methods=["GET", "POST"])
def login_admin():
    if session.get("administrador_autenticado"):
        return redirect(url_for("painel_admin"))

    if request.method == "GET" and not app.config["ADMIN_PASSWORD"]:
        flash("O painel está bloqueado até que ADMIN_PASSWORD seja configurada no ambiente.", "erro")

    if request.method == "POST":
        verificar_csrf()
        senha_configurada = app.config["ADMIN_PASSWORD"]
        senha_informada = request.form.get("senha", "")
        if not senha_configurada:
            flash("O acesso ao painel não está configurado. Defina a variável ADMIN_PASSWORD no ambiente.", "erro")
        elif hmac.compare_digest(senha_informada.encode(), senha_configurada.encode()):
            session.clear()
            session["administrador_autenticado"] = True
            csrf_token()
            return redirect(url_for("painel_admin"))
        else:
            flash("Senha incorreta.", "erro")

    return render_template("admin_login.html")


@app.post("/admin/sair")
@administrador_necessario
def sair_admin():
    verificar_csrf()
    session.clear()
    return redirect(url_for("login_admin"))


@app.route("/admin", methods=["GET"])
@administrador_necessario
def painel_admin():
    banco = conectar_banco(app.config["DATABASE"])
    try:
        produtos = banco.execute(
            """
            SELECT id, sabor, gramatura, pack, estoque, ativo
            FROM produtos
            ORDER BY ativo DESC, sabor COLLATE NOCASE, gramatura, pack
            """
        ).fetchall()
        vendas = banco.execute(
            """
            SELECT v.quantidade, v.registrada_em, p.sabor, p.gramatura, p.pack
            FROM vendas v
            JOIN produtos p ON p.id = v.produto_id
            ORDER BY v.id DESC
            LIMIT 30
            """
        ).fetchall()
    finally:
        banco.close()
    return render_template(
        "admin.html",
        produtos=produtos,
        vendas=vendas,
        gramaturas=GRAMATURAS_PADRAO,
        tamanhos_pack=TAMANHOS_PACK_PADRAO,
    )


@app.post("/admin/produtos")
@administrador_necessario
def adicionar_produto():
    verificar_csrf()
    sabor = request.form.get("sabor", "").strip()
    if not sabor or len(sabor) > 40:
        flash("Informe o sabor/nome do produto (até 40 caracteres).", "erro")
        return redirect(url_for("painel_admin"))
    if any(ord(caractere) < 32 for caractere in sabor):
        flash("O nome do produto contém caracteres inválidos.", "erro")
        return redirect(url_for("painel_admin"))

    try:
        gramatura = inteiro_formulario("gramatura", 140, 260)
        pack = inteiro_formulario("pack", 5, 10)
        estoque = inteiro_formulario("estoque", 0, 100000)
    except ValueError as erro:
        flash(str(erro), "erro")
        return redirect(url_for("painel_admin"))

    if gramatura not in GRAMATURAS_PADRAO or pack not in TAMANHOS_PACK_PADRAO:
        flash("Escolha uma gramatura de 140g a 260g em intervalos de 20g e um pack de 5 ou 10.", "erro")
        return redirect(url_for("painel_admin"))

    banco = conectar_banco(app.config["DATABASE"])
    try:
        existente = banco.execute(
            """
            SELECT id FROM produtos
            WHERE LOWER(sabor) = LOWER(?) AND gramatura = ? AND pack = ?
            """,
            (sabor, gramatura, pack),
        ).fetchone()
        if existente:
            flash("Essa variante já está cadastrada. Atualize o estoque pela tabela abaixo.", "erro")
        else:
            banco.execute(
                """
                INSERT INTO produtos (sabor, gramatura, pack, estoque)
                VALUES (?, ?, ?, ?)
                """,
                (sabor, gramatura, pack, estoque),
            )
            banco.commit()
            flash("Produto adicionado ao catálogo e à vitrine.", "sucesso")
    except sqlite3.Error:
        app.logger.exception("Falha ao cadastrar produto.")
        flash("Não foi possível salvar o produto. Tente novamente.", "erro")
    finally:
        banco.close()
    return redirect(url_for("painel_admin"))


@app.post("/admin/produtos/<int:produto_id>/estoque")
@administrador_necessario
def atualizar_estoque(produto_id):
    verificar_csrf()
    try:
        estoque = inteiro_formulario("estoque", 0, 100000)
    except ValueError as erro:
        flash(str(erro), "erro")
        return redirect(url_for("painel_admin"))

    banco = conectar_banco(app.config["DATABASE"])
    try:
        atualizacao = banco.execute(
            "UPDATE produtos SET estoque = ? WHERE id = ?",
            (estoque, produto_id),
        )
        if atualizacao.rowcount == 0:
            flash("Produto não encontrado.", "erro")
        else:
            banco.commit()
            flash("Estoque atualizado.", "sucesso")
    except sqlite3.Error:
        app.logger.exception("Falha ao atualizar estoque do produto %s.", produto_id)
        flash("Não foi possível atualizar o estoque. Tente novamente.", "erro")
    finally:
        banco.close()
    return redirect(url_for("painel_admin"))


@app.post("/admin/produtos/<int:produto_id>/venda")
@administrador_necessario
def registrar_venda(produto_id):
    verificar_csrf()
    try:
        quantidade = inteiro_formulario("quantidade", 1, 100000)
    except ValueError as erro:
        flash(str(erro), "erro")
        return redirect(url_for("painel_admin"))

    banco = conectar_banco(app.config["DATABASE"])
    try:
        with banco:
            atualizacao = banco.execute(
                """
                UPDATE produtos SET estoque = estoque - ?
                WHERE id = ? AND ativo = 1 AND estoque >= ?
                """,
                (quantidade, produto_id, quantidade),
            )
            if atualizacao.rowcount == 0:
                flash("Venda não registrada: produto indisponível ou estoque insuficiente.", "erro")
            else:
                banco.execute(
                    "INSERT INTO vendas (produto_id, quantidade) VALUES (?, ?)",
                    (produto_id, quantidade),
                )
                flash("Venda registrada e estoque baixado.", "sucesso")
    except sqlite3.Error:
        app.logger.exception("Falha ao registrar venda do produto %s.", produto_id)
        flash("Não foi possível registrar a venda. Tente novamente.", "erro")
    finally:
        banco.close()
    return redirect(url_for("painel_admin"))


@app.post("/admin/produtos/<int:produto_id>/status")
@administrador_necessario
def alterar_status_produto(produto_id):
    verificar_csrf()
    banco = conectar_banco(app.config["DATABASE"])
    try:
        produto = banco.execute(
            "SELECT ativo FROM produtos WHERE id = ?",
            (produto_id,),
        ).fetchone()
        if produto is None:
            flash("Produto não encontrado.", "erro")
        else:
            banco.execute(
                "UPDATE produtos SET ativo = ? WHERE id = ?",
                (0 if produto["ativo"] else 1, produto_id),
            )
            banco.commit()
            flash("Visibilidade do produto atualizada.", "sucesso")
    except sqlite3.Error:
        app.logger.exception("Falha ao atualizar status do produto %s.", produto_id)
        flash("Não foi possível atualizar o produto. Tente novamente.", "erro")
    finally:
        banco.close()
    return redirect(url_for("painel_admin"))


if __name__ == "__main__":
    app.run(
        debug=os.environ.get("FLASK_DEBUG") == "1",
        host=os.environ.get("FLASK_HOST", "127.0.0.1"),
        port=int(os.environ.get("PORT", "5000")),
    )
