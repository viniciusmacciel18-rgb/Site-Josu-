
from pathlib import Path

from flask import Flask, jsonify, send_from_directory


BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__, static_folder=None)


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


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080, debug=True)
