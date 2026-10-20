# Burguer Feitoza

Site da Burguer Feitoza com registro de pedidos em Python e encaminhamento para o WhatsApp.

## Rodar localmente

1. Instale Python 3.10 ou superior.
2. No terminal, entre nesta pasta e instale as dependências:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

3. Inicie o servidor:

   ```powershell
   flask --app app run
   ```

4. Abra http://127.0.0.1:5000. Os pedidos locais ficam em `orders.db`.

## Publicar no Render

1. Envie esta pasta para um repositório GitHub.
2. Crie um banco PostgreSQL no Render.
3. Crie um Web Service no Render conectado ao repositório. O arquivo `render.yaml` configura o comando de instalação, inicialização e verificação de saúde.
4. Na configuração do serviço web, crie a variável `DATABASE_URL` usando a **Internal Database URL** do banco PostgreSQL do Render.
5. Publique o serviço. O Render disponibiliza o site e o endpoint de pedidos no mesmo domínio.

O serviço exige `DATABASE_URL` no Render para evitar que pedidos sejam gravados no disco temporário. Não publique a URL do banco no código ou no GitHub.

Ao enviar o carrinho, o backend valida os produtos, opções e quantidades, recalcula os preços e registra o pedido antes de abrir o WhatsApp. O pagamento, a entrega e a confirmação de disponibilidade continuam sendo tratados pelo WhatsApp.
