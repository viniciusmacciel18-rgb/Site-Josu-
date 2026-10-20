import unittest

from app import Order, app as default_app, create_app, db


class OrderApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite://"})
        self.client = self.app.test_client()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
            db.engine.dispose()

    def test_creates_order_using_server_prices(self):
        response = self.client.post(
            "/api/orders",
            json={"items": [{"productId": "tradicional", "weight": 200, "pack": 6, "quantity": 2}]},
        )

        self.assertEqual(response.status_code, 201)
        result = response.get_json()
        self.assertEqual(result["total_cents"], 6000)
        with self.app.app_context():
            order = db.session.get(Order, result["order_id"])
            self.assertEqual(order.items[0]["product_name"], "Hambúrguer Tradicional Feitoza")
            self.assertEqual(order.items[0]["line_total_cents"], 6000)

    def test_rejects_invalid_product_options(self):
        response = self.client.post(
            "/api/orders",
            json={"items": [{"productId": "nao-existe", "weight": 200, "pack": 6, "quantity": 1}]},
        )

        self.assertEqual(response.status_code, 400)

    def test_serves_site_and_assets(self):
        for path in ("/", "/styles.css", "/script.js", "/image/Logo%20Neon%20Burger%20Feitoza.png"):
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 200)
                response.close()

    def test_does_not_serve_application_source(self):
        response = self.client.get("/app.py")

        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    try:
        unittest.main()
    finally:
        with default_app.app_context():
            db.engine.dispose()
