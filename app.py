import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.engine import URL


BASE_DIR = Path(__file__).resolve().parent
PRODUCTS = {
    "costela": ("Hambúrguer Costela Nobre", 640),
    "tradicional": ("Hambúrguer Tradicional Feitoza", 500),
    "picanha": ("Hambúrguer Picanha Premium", 990),
    "fraldinha": ("Hambúrguer de Fraldinha Artesanal", 720),
    "angus": ("Hambúrguer Angus Premium", 1200),
    "brisket": ("Hambúrguer Brisket Artesanal", 850),
}
WEIGHTS = {160, 200, 240, 280}
PACK_SIZES = {6, 10}

db = SQLAlchemy()


class Order(db.Model):
    id = db.Column(db.String(36), primary_key=True)
    items = db.Column(db.JSON, nullable=False)
    total_cents = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False)


def database_url():
    url = os.environ.get("DATABASE_URL")
    if not url:
        if os.environ.get("RENDER"):
            raise RuntimeError("Configure DATABASE_URL com a URL do PostgreSQL no Render.")
        return URL.create("sqlite", database=str(BASE_DIR / "orders.db"))
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def create_app(test_config=None):
    app = Flask(__name__, static_folder=None)
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    if test_config:
        app.config.update(test_config)
    if "SQLALCHEMY_DATABASE_URI" not in app.config:
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url()
    db.init_app(app)

    with app.app_context():
        db.create_all()

    @app.get("/")
    def index():
        return send_from_directory(BASE_DIR, "index.html")

    @app.get("/styles.css")
    def styles():
        return send_from_directory(BASE_DIR, "styles.css")

    @app.get("/script.js")
    def script():
        return send_from_directory(BASE_DIR, "script.js")

    @app.get("/arte-burguer-feitoza.svg")
    def campaign_art():
        return send_from_directory(BASE_DIR, "arte-burguer-feitoza.svg")

    @app.get("/image/<path:filename>")
    def images(filename):
        return send_from_directory(BASE_DIR / "image", filename)

    @app.get("/health")
    def health():
        return jsonify(status="ok")

    @app.post("/api/orders")
    def create_order():
        payload = request.get_json(silent=True)
        if not isinstance(payload, dict) or not isinstance(payload.get("items"), list):
            return jsonify(error="O pedido precisa conter uma lista de itens."), 400
        if not payload["items"] or len(payload["items"]) > 50:
            return jsonify(error="O pedido precisa conter de 1 a 50 itens."), 400

        order_items = []
        total_cents = 0
        for item in payload["items"]:
            if not isinstance(item, dict):
                return jsonify(error="Um item do pedido está inválido."), 400
            product_id = item.get("productId")
            weight = item.get("weight")
            pack = item.get("pack")
            quantity = item.get("quantity")
            if (
                not isinstance(product_id, str)
                or product_id not in PRODUCTS
                or type(weight) is not int
                or weight not in WEIGHTS
                or type(pack) is not int
                or pack not in PACK_SIZES
                or type(quantity) is not int
                or not 1 <= quantity <= 100
            ):
                return jsonify(error="Um item do pedido contém opções inválidas."), 400

            product_name, unit_price_cents = PRODUCTS[product_id]
            line_total_cents = unit_price_cents * pack * quantity
            total_cents += line_total_cents
            order_items.append({
                "product_id": product_id,
                "product_name": product_name,
                "weight": weight,
                "pack": pack,
                "quantity": quantity,
                "unit_price_cents": unit_price_cents,
                "line_total_cents": line_total_cents,
            })

        order = Order(
            id=str(uuid.uuid4()),
            items=order_items,
            total_cents=total_cents,
            created_at=datetime.now(timezone.utc),
        )
        db.session.add(order)
        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            app.logger.exception("Falha ao salvar pedido.")
            return jsonify(error="Não foi possível salvar o pedido agora. Tente novamente."), 503

        return jsonify(order_id=order.id, total_cents=order.total_cents), 201

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)