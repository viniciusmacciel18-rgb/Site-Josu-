# Painel administrativo e estoque

O painel fica em `/admin` e exige a senha definida em `ADMIN_PASSWORD`. O banco SQLite é criado em `instance/estoque.sqlite3`; as combinações iniciais de Costela e Fraldinha já aparecem cadastradas, com estoque zero.

Crie seu arquivo local de configuração copiando `.env.example` para `.env`. Preencha os valores vazios:

```dotenv
ADMIN_PASSWORD=use-uma-senha-forte-e-unica
FLASK_SECRET_KEY=insira-uma-chave-aleatoria-longa
SESSION_COOKIE_SECURE=0
```

Use uma senha forte. Gere uma chave aleatória privada com `.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_hex(32))"` e cole o resultado em `FLASK_SECRET_KEY`; não reutilize os valores de exemplo. O arquivo `.env` é ignorado pelo Git e não deve ser enviado nem compartilhado. Instale as dependências com `.\.venv\Scripts\python.exe -m pip install -r requiriments.txt`, reinicie o Flask e abra `http://127.0.0.1:5000/admin`.

O aplicativo carrega o `.env` ao iniciar tanto com `python app.py` quanto com `flask --app app run`. Se `ADMIN_PASSWORD` estiver vazia, o painel permanece bloqueado.

O estoque representa **packs prontos**, não discos avulsos. No painel é possível:

- definir o estoque disponível de cada sabor, gramatura e pack;
- cadastrar novas variantes de sabor, gramatura (140g a 260g, em intervalos de 20g) e pack (5 ou 10);
- registrar uma venda confirmada, baixando a quantidade de packs de forma atômica;
- ocultar ou reativar uma variante na vitrine.

A loja consulta o estoque atualizado ao carregar e novamente antes de adicionar um pack ao pedido. O carrinho encaminha uma consulta ao WhatsApp e **não reserva nem baixa estoque**. Registre no painel somente vendas confirmadas. Faça backup periódico de `instance/estoque.sqlite3`.

Para publicar o site, configure `FLASK_SECRET_KEY` e `ADMIN_PASSWORD` diretamente no ambiente seguro do servidor, use HTTPS e `SESSION_COOKIE_SECURE=1`; não publique nem copie o `.env` local para o servidor e não use o servidor de desenvolvimento do Flask como servidor de produção.
