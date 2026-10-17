import os
import re
import tempfile
import unittest

from app import app
from inventory import inicializar_banco


class InventoryPanelTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.previous_database = app.config["DATABASE"]
        self.previous_password = app.config["ADMIN_PASSWORD"]
        self.previous_secret = app.config["SECRET_KEY"]
        app.config.update(
            TESTING=True,
            DATABASE=os.path.join(self.temporary_directory.name, "inventory.sqlite3"),
            ADMIN_PASSWORD="test-only-password",
            SECRET_KEY="test-only-secret",
        )
        inicializar_banco(app.config["DATABASE"])
        self.client = app.test_client()

    def tearDown(self):
        app.config.update(
            DATABASE=self.previous_database,
            ADMIN_PASSWORD=self.previous_password,
            SECRET_KEY=self.previous_secret,
            TESTING=False,
        )
        self.temporary_directory.cleanup()

    def _csrf(self, response):
        return re.search(
            r'name="csrf_token" value="([^"]+)"',
            response.get_data(as_text=True),
        ).group(1)

    def _login(self):
        response = self.client.get("/admin/login")
        return self.client.post(
            "/admin/login",
            data={
                "csrf_token": self._csrf(response),
                "senha": "test-only-password",
            },
        )

    def _panel_token(self):
        return self._csrf(self.client.get("/admin"))

    def test_admin_panel_requires_login_and_csrf(self):
        response = self.client.get("/admin")
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.headers["Location"].endswith("/admin/login"))
        self.assertEqual(self.client.post("/admin/sair", data={}).status_code, 302)

        self._login()
        self.assertEqual(self.client.get("/admin").status_code, 200)
        self.assertEqual(self.client.post("/admin/sair", data={}).status_code, 400)

    def test_unconfigured_admin_password_is_reported(self):
        app.config["ADMIN_PASSWORD"] = ""
        response = self.client.get("/admin/login")
        self.assertIn(b"ADMIN_PASSWORD", response.data)

    def test_catalog_starts_with_empty_default_variants(self):
        catalog = self.client.get("/api/catalogo").get_json()
        self.assertEqual(len(catalog), 28)
        self.assertTrue(all(product["estoque"] == 0 for product in catalog))

        store = self.client.get("/")
        self.assertEqual(store.status_code, 200)
        self.assertIn(b"Escolha o sabor", store.data)

    def test_product_stock_adjustment_and_confirmed_sale(self):
        self._login()
        token = self._panel_token()
        response = self.client.post(
            "/admin/produtos",
            data={
                "csrf_token": token,
                "sabor": "Picanha",
                "gramatura": "220",
                "pack": "5",
                "estoque": "3",
            },
        )
        self.assertEqual(response.status_code, 302)
        product = next(
            product
            for product in self.client.get("/api/catalogo").get_json()
            if product["sabor"] == "Picanha"
        )
        self.assertEqual(product["estoque"], 3)

        token = self._panel_token()
        self.client.post(
            "/admin/produtos",
            data={
                "csrf_token": token,
                "sabor": "Picanha",
                "gramatura": "220",
                "pack": "5",
                "estoque": "50",
            },
        )
        product = next(
            item
            for item in self.client.get("/api/catalogo").get_json()
            if item["id"] == product["id"]
        )
        self.assertEqual(product["estoque"], 3)

        token = self._panel_token()
        self.client.post(
            f"/admin/produtos/{product['id']}/estoque",
            data={"csrf_token": token, "estoque": "2"},
        )
        token = self._panel_token()
        self.client.post(
            f"/admin/produtos/{product['id']}/venda",
            data={"csrf_token": token, "quantidade": "3"},
        )
        current = next(
            item
            for item in self.client.get("/api/catalogo").get_json()
            if item["id"] == product["id"]
        )
        self.assertEqual(current["estoque"], 2)

        token = self._panel_token()
        self.client.post(
            f"/admin/produtos/{product['id']}/venda",
            data={"csrf_token": token, "quantidade": "2"},
        )
        current = next(
            item
            for item in self.client.get("/api/catalogo").get_json()
            if item["id"] == product["id"]
        )
        self.assertEqual(current["estoque"], 0)
        self.assertIn(b"Vendas registradas recentemente", self.client.get("/admin").data)

        token = self._panel_token()
        self.client.post(
            f"/admin/produtos/{product['id']}/status",
            data={"csrf_token": token},
        )
        self.assertNotIn(
            product["id"],
            [item["id"] for item in self.client.get("/api/catalogo").get_json()],
        )


if __name__ == "__main__":
    unittest.main()
