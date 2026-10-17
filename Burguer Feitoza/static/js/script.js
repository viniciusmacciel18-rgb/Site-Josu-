const tamanhosPack = [5, 10];
const carrinho = new Map();
let catalogo = Array.isArray(window.catalogoProdutos) ? window.catalogoProdutos : [];
let saborSelecionado = catalogo[0]?.sabor || '';
let gramaturaSelecionada = Number(catalogo[0]?.gramatura) || 140;
let packSelecionado = 5;
let quantidadeSelecionada = 1;
let timerAviso;

const quantidadeCarrinho = document.querySelector('#quantidade-carrinho');
const resumoProduto = document.querySelector('#resumo-produto');
const resumoPeso = document.querySelector('#resumo-peso');
const quantidadePacks = document.querySelector('#quantidade-packs');
const painelCarrinho = document.querySelector('#painel-carrinho');
const fundoCarrinho = document.querySelector('#fundo-carrinho');
const itensCarrinho = document.querySelector('#itens-carrinho');
const avisoAdicionado = document.querySelector('#aviso-adicionado');
const finalizarPedido = document.querySelector('#finalizar-pedido');
const disponibilidadeProduto = document.querySelector('#disponibilidade-produto');
const botaoAdicionar = document.querySelector('#adicionar-pack');
const opcoesSabor = document.querySelector('.opcoes-sabor');
const opcoesGramatura = document.querySelector('#opcoes-gramatura');

function produtoAtual() {
    return catalogo.find((produto) =>
        produto.ativo === 1 &&
        produto.sabor === saborSelecionado &&
        Number(produto.gramatura) === gramaturaSelecionada &&
        Number(produto.pack) === packSelecionado
    );
}

function packsNoCarrinho(produtoId) {
    return carrinho.get(String(produtoId))?.quantidade || 0;
}

function estoqueDisponivel(produto) {
    return Math.max(0, Number(produto?.estoque || 0) - packsNoCarrinho(produto?.id));
}

function selecionarPackDisponivel() {
    const atual = catalogo.find((produto) =>
        produto.ativo === 1 &&
        produto.sabor === saborSelecionado &&
        Number(produto.gramatura) === gramaturaSelecionada &&
        Number(produto.pack) === packSelecionado
    );
    if (estoqueDisponivel(atual) > 0) return;

    const alternativa = tamanhosPack
        .map((pack) => catalogo.find((produto) =>
            produto.ativo === 1 &&
            produto.sabor === saborSelecionado &&
            Number(produto.gramatura) === gramaturaSelecionada &&
            Number(produto.pack) === pack &&
            estoqueDisponivel(produto) > 0
        ))
        .find(Boolean);
    if (alternativa) {
        packSelecionado = Number(alternativa.pack);
    }
}

function criarIconeCarne(classe, tamanho) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', classe);
    svg.setAttribute('viewBox', '0 0 40 32');
    svg.setAttribute('aria-hidden', 'true');
    if (tamanho) {
        svg.style.width = `${Math.min(31, 22 + Math.round((tamanho - 140) / 8))}px`;
        svg.style.height = `${Math.min(27, 20 + Math.round((tamanho - 140) / 20))}px`;
    }
    const carne = document.createElementNS(svg.namespaceURI, 'path');
    carne.setAttribute('class', 'carne-frente');
    carne.setAttribute('d', 'M3 16C4 9 12 5 22 6c9 0 15 4 15 10s-7 11-17 11C10 27 3 22 3 16z');
    const marcas = document.createElementNS(svg.namespaceURI, 'path');
    marcas.setAttribute('class', 'marca-grelha');
    marcas.setAttribute('d', 'm12 9-5 13m14-16-6 18m15-15-5 15');
    svg.append(carne, marcas);
    return svg;
}

function selecionarSabor(sabor) {
    saborSelecionado = sabor;
    const gramaturasDoSabor = [...new Set(
        catalogo
            .filter((produto) => produto.ativo === 1 && produto.sabor === sabor)
            .map((produto) => Number(produto.gramatura))
    )].sort((a, b) => a - b);
    if (!gramaturasDoSabor.includes(gramaturaSelecionada)) {
        gramaturaSelecionada = gramaturasDoSabor[0] || 140;
    }
    selecionarPackDisponivel();
    selecionarPackDisponivel();
    renderizarSeletores();
    atualizarResumo();
}

function criarBotaoSabor(sabor, selecionado) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = `opcao-sabor${selecionado ? ' selecionada' : ''}`;
    botao.dataset.sabor = sabor;
    botao.setAttribute('aria-pressed', String(selecionado));
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'icone-sabor');
    svg.setAttribute('viewBox', '0 0 40 32');
    svg.setAttribute('aria-hidden', 'true');
    const carne = document.createElementNS(svg.namespaceURI, 'path');
    carne.setAttribute('class', 'carne-frente');
    carne.setAttribute('d', 'M3 16C4 9 12 5 22 6c9 0 15 4 15 10s-7 11-17 11C10 27 3 22 3 16z');
    const marcas = document.createElementNS(svg.namespaceURI, 'path');
    marcas.setAttribute('class', 'marca-grelha');
    marcas.setAttribute('d', 'm12 9-5 13m14-16-6 18m15-15-5 15');
    svg.append(carne, marcas);

    const descricao = document.createElement('span');
    descricao.className = 'sabor-descricao';
    const nome = document.createElement('strong');
    nome.textContent = sabor;
    const detalhe = document.createElement('small');
    detalhe.textContent = 'Carne artesanal selecionada';
    descricao.append(nome, detalhe);
    botao.append(svg, descricao);
    botao.addEventListener('click', () => selecionarSabor(sabor));
    return botao;
}

function renderizarSeletores() {
    const sabores = [...new Set(catalogo.filter((produto) => produto.ativo === 1).map((produto) => produto.sabor))];
    if (sabores.length && !sabores.includes(saborSelecionado)) {
        saborSelecionado = sabores[0];
    }

    opcoesSabor.replaceChildren(...sabores.map((sabor) => criarBotaoSabor(sabor, sabor === saborSelecionado)));
    const gramaturas = [...new Set(
        catalogo
            .filter((produto) => produto.ativo === 1 && produto.sabor === saborSelecionado)
            .map((produto) => Number(produto.gramatura))
    )].sort((a, b) => a - b);

    if (gramaturas.length && !gramaturas.includes(gramaturaSelecionada)) {
        gramaturaSelecionada = gramaturas[0];
    }

    const botoesGramatura = gramaturas.map((gramatura) => {
        const botao = document.createElement('button');
        const selecionado = gramatura === gramaturaSelecionada;
        botao.type = 'button';
        botao.className = `opcao-gramatura${selecionado ? ' selecionada' : ''}`;
        botao.dataset.gramatura = String(gramatura);
        botao.setAttribute('aria-pressed', String(selecionado));
        const icone = criarIconeCarne('icone-gramatura', gramatura);
        const peso = document.createElement('span');
        peso.append(document.createTextNode(String(gramatura)));
        const unidade = document.createElement('small');
        unidade.textContent = 'g';
        peso.append(unidade);
        botao.append(icone, peso);
        botao.addEventListener('click', () => {
            gramaturaSelecionada = gramatura;
            selecionarPackDisponivel();
            renderizarSeletores();
            atualizarResumo();
        });
        return botao;
    });
    opcoesGramatura.replaceChildren(...botoesGramatura);

    document.querySelectorAll('.opcao-pack').forEach((botao) => {
        const pack = Number(botao.dataset.pack);
        const produto = catalogo.find((item) =>
            item.ativo === 1 &&
            item.sabor === saborSelecionado &&
            Number(item.gramatura) === gramaturaSelecionada &&
            Number(item.pack) === pack
        );
        const estoque = Number(produto?.estoque || 0);
        const textoEstoque = botao.querySelector('.estoque-pack');
        if (textoEstoque) {
            textoEstoque.textContent = produto ? `${estoque} em estoque` : 'indisponível';
        }
        botao.disabled = !produto || estoque === 0;
        botao.setAttribute('aria-label', `Pack ${pack}, ${produto ? `${estoque} em estoque` : 'indisponível'}`);
        botao.classList.toggle('selecionada', pack === packSelecionado);
        botao.setAttribute('aria-pressed', String(pack === packSelecionado));
        botao.onclick = () => {
            if (botao.disabled) return;
            packSelecionado = pack;
            renderizarSeletores();
            atualizarResumo();
        };
    });

    if (!tamanhosPack.includes(packSelecionado)) {
        packSelecionado = 5;
    }
}

function atualizarResumo() {
    const produto = produtoAtual();
    const discosTotais = packSelecionado * quantidadeSelecionada;
    const pesoTotal = discosTotais * gramaturaSelecionada;
    resumoProduto.textContent = `${quantidadeSelecionada} ${quantidadeSelecionada === 1 ? 'pack' : 'packs'} de ${saborSelecionado || 'produto'} • ${packSelecionado} discos de ${gramaturaSelecionada}g`;
    resumoPeso.textContent = `${discosTotais} discos • ${pesoTotal.toLocaleString('pt-BR')}g de carne no total`;
    quantidadePacks.value = String(quantidadeSelecionada);
    quantidadePacks.textContent = String(quantidadeSelecionada);

    const disponiveis = estoqueDisponivel(produto);
    if (!produto) {
        disponibilidadeProduto.textContent = 'Esta variante não está disponível no momento.';
    } else if (disponiveis === 0) {
        disponibilidadeProduto.textContent = Number(produto.estoque) === 0
            ? 'Produto sem estoque no momento.'
            : 'Você já adicionou ao pedido todo o estoque disponível desta variante.';
    } else {
        disponibilidadeProduto.textContent = `${disponiveis} ${disponiveis === 1 ? 'pack disponível' : 'packs disponíveis'} para consulta.`;
    }

    botaoAdicionar.disabled = !produto || disponiveis === 0 || quantidadeSelecionada > disponiveis;
    document.querySelector('#aumentar-quantidade').disabled =
        quantidadeSelecionada >= 99 || quantidadeSelecionada >= disponiveis;
    document.querySelector('#diminuir-quantidade').disabled = quantidadeSelecionada <= 1;
}

function contarPacks() {
    return [...carrinho.values()].reduce((total, item) => total + item.quantidade, 0);
}

function renderizarCarrinho() {
    quantidadeCarrinho.textContent = contarPacks();

    if (carrinho.size === 0) {
        itensCarrinho.innerHTML = '<p class="carrinho-vazio">Seu pedido ainda está vazio.<br>Escolha sua gramatura e monte seu pack.</p>';
        finalizarPedido.hidden = true;
        return;
    }

    itensCarrinho.innerHTML = [...carrinho.entries()].map(([chave, item]) => `
        <article class="item-carrinho">
            <div class="disco-mini" aria-hidden="true"><span></span></div>
            <div class="item-carrinho-info">
                <strong>${escapeHtml(item.sabor)} • ${item.pack} discos de ${item.gramatura}g</strong>
                <span>${item.pack * item.quantidade} discos • ${(item.pack * item.gramatura * item.quantidade).toLocaleString('pt-BR')}g no total</span>
            </div>
            <span class="item-carrinho-quantidade">${item.quantidade} ${item.quantidade === 1 ? 'pack' : 'packs'}</span>
            <button class="remover-item" type="button" data-chave="${escapeHtml(chave)}" aria-label="Remover pack de ${item.pack} discos de ${item.gramatura}g sabor ${escapeHtml(item.sabor)}">×</button>
        </article>
    `).join('');

    const linhasPedido = [...carrinho.values()].map((item) =>
        `- ${item.quantidade}x pack de ${item.pack} discos de ${item.gramatura}g (${item.sabor})`
    );
    const mensagemPedido = encodeURIComponent(`Olá! Gostaria de consultar disponibilidade e valores para:\n${linhasPedido.join('\n')}`);
    finalizarPedido.href = `https://wa.me/5547997221504?text=${mensagemPedido}`;
    finalizarPedido.hidden = false;

    itensCarrinho.querySelectorAll('.remover-item').forEach((botao) => {
        botao.addEventListener('click', () => {
            carrinho.delete(botao.dataset.chave);
            renderizarCarrinho();
            atualizarResumo();
        });
    });
}

function escapeHtml(valor) {
    return String(valor).replace(/[&<>"']/g, (caractere) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caractere]);
}

function mostrarAviso(mensagem) {
    avisoAdicionado.textContent = mensagem;
    avisoAdicionado.classList.add('visivel');
    window.clearTimeout(timerAviso);
    timerAviso = window.setTimeout(() => avisoAdicionado.classList.remove('visivel'), 2600);
}

function abrirCarrinho() {
    fundoCarrinho.hidden = false;
    painelCarrinho.classList.add('aberto');
    painelCarrinho.setAttribute('aria-hidden', 'false');
    document.body.classList.add('carrinho-aberto');
    document.querySelector('#fechar-carrinho').focus();
}

function fecharCarrinho() {
    fundoCarrinho.hidden = true;
    painelCarrinho.classList.remove('aberto');
    painelCarrinho.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('carrinho-aberto');
    document.querySelector('#abrir-carrinho').focus();
}

async function atualizarCatalogo() {
    const resposta = await fetch('/api/catalogo', { cache: 'no-store' });
    if (!resposta.ok) {
        throw new Error(`Falha ao consultar o estoque (HTTP ${resposta.status}).`);
    }
    catalogo = await resposta.json();
    renderizarSeletores();
    atualizarResumo();
}

document.querySelector('#diminuir-quantidade').addEventListener('click', () => {
    if (quantidadeSelecionada > 1) {
        quantidadeSelecionada -= 1;
        atualizarResumo();
    }
});

document.querySelector('#aumentar-quantidade').addEventListener('click', () => {
    const disponiveis = estoqueDisponivel(produtoAtual());
    if (quantidadeSelecionada < 99 && quantidadeSelecionada < disponiveis) {
        quantidadeSelecionada += 1;
        atualizarResumo();
    }
});

botaoAdicionar.addEventListener('click', async () => {
    botaoAdicionar.disabled = true;
    try {
        await atualizarCatalogo();
    } catch (erro) {
        disponibilidadeProduto.textContent = `${erro.message} Atualize a página antes de tentar novamente.`;
        return;
    }

    const produto = produtoAtual();
    const jaAdicionados = produto ? packsNoCarrinho(produto.id) : 0;
    if (!produto || jaAdicionados + quantidadeSelecionada > Number(produto.estoque)) {
        atualizarResumo();
        mostrarAviso('Estoque insuficiente para a quantidade selecionada. Confira os packs disponíveis.');
        return;
    }

    const chave = String(produto.id);
    const item = carrinho.get(chave) || {
        id: produto.id,
        sabor: produto.sabor,
        gramatura: Number(produto.gramatura),
        pack: Number(produto.pack),
        quantidade: 0
    };
    item.quantidade += quantidadeSelecionada;
    carrinho.set(chave, item);
    renderizarCarrinho();
    atualizarResumo();
    mostrarAviso(`${quantidadeSelecionada} ${quantidadeSelecionada === 1 ? 'pack adicionado' : 'packs adicionados'} ao pedido.`);
});

document.querySelectorAll('.opcao-pack').forEach((botao) => {
    botao.addEventListener('click', () => {
        if (botao.disabled) return;
        packSelecionado = Number(botao.dataset.pack);
        renderizarSeletores();
        atualizarResumo();
    });
});

document.querySelector('#abrir-carrinho').addEventListener('click', abrirCarrinho);
document.querySelector('#fechar-carrinho').addEventListener('click', fecharCarrinho);
fundoCarrinho.addEventListener('click', fecharCarrinho);

document.querySelector('#limpar-carrinho').addEventListener('click', () => {
    carrinho.clear();
    renderizarCarrinho();
    atualizarResumo();
});

document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && painelCarrinho.classList.contains('aberto')) {
        fecharCarrinho();
    }
});

renderizarSeletores();
atualizarResumo();
renderizarCarrinho();
atualizarCatalogo().catch((erro) => {
    disponibilidadeProduto.textContent = `${erro.message} Atualize a página para conferir a disponibilidade.`;
    botaoAdicionar.disabled = true;
});
