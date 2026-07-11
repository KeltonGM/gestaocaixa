const form = document.querySelector('#form-transacao');
const listaTransacoes = document.querySelector('#lista-transacoes');
const totalEntradas = document.querySelector('#total-entradas');
const totalSaidas = document.querySelector('#total-saidas');
const totalSaldo = document.querySelector('#total-saldo');
const btnNovoDia = document.querySelector('#btn-novo-dia');
const containerHistorico = document.querySelector('#historico-dias');

// Dados do dia atual
let transacoesDoDia = JSON.parse(localStorage.getItem('transacoesDoDia')) || [];
// Dados salvos de dias anteriores
let historicoDias = JSON.parse(localStorage.getItem('historicoDias')) || [];

function calcularResumos() {
    const valores = transacoesDoDia.map(t => t.tipo === 'entrada' ? t.valor : -t.valor);
    const entradas = valores.filter(v => v > 0).reduce((acc, v) => acc + v, 0);
    const saidas = Math.abs(valores.filter(v => v < 0).reduce((acc, v) => acc + v, 0));
    const saldo = entradas - saidas;

    return { entradas, saidas, saldo };
}

function atualizarDashboard() {
    const resumos = calcularResumos();
    totalEntradas.innerText = `R$ ${resumos.entradas.toFixed(2).replace('.', ',')}`;
    totalSaidas.innerText = `R$ ${resumos.saidas.toFixed(2).replace('.', ',')}`;
    totalSaldo.innerText = `R$ ${resumos.saldo.toFixed(2).replace('.', ',')}`;
}

function renderizarListaDoDia() {
    listaTransacoes.innerHTML = '';
    if (transacoesDoDia.length === 0) {
        listaTransacoes.innerHTML = '<p style="color: #94a3b8; font-size: 13px; text-align: center; width: 100%;">Nenhum lançamento hoje.</p>';
        return;
    }

    transacoesDoDia.forEach((t, index) => {
        const li = document.createElement('li');
        li.classList.add(t.tipo);
        li.innerHTML = `
            ${t.descricao} <span>R$ ${t.valor.toFixed(2).replace('.', ',')}</span>
            <button onclick="removerTransacao(${index})">X</button>
        `;
        listaTransacoes.appendChild(li);
    });
}

function renderizarHistoricoDias() {
    containerHistorico.innerHTML = '';
    if (historicoDias.length === 0) {
        containerHistorico.innerHTML = '<p style="color: #94a3b8; font-size: 13px;">Nenhum dia fechado no histórico ainda.</p>';
        return;
    }

    // Criamos uma cópia invertida para mostrar os mais recentes primeiro,
    // mas guardamos o índice original correto para conseguir apagar depois
    const historicoInvertido = historicoDias.map((dia, index) => ({ ...dia, idOriginal: index })).reverse();

    historicoInvertido.forEach((dia, indexVisual) => {
        const divDia = document.createElement('div');
        divDia.classList.add('card-dia-salvo');
        
        // Gera o HTML dos detalhes escondidos
        let htmlDetalhes = `<ul class="lista-detalhes-antigos" id="detalhes-${indexVisual}">`;
        if (dia.detalhes && dia.detalhes.length > 0) {
            dia.detalhes.forEach(item => {
                htmlDetalhes += `
                    <li class="item-detalhe-antigo ${item.tipo}">
                        • ${item.descricao} <strong>R$ ${item.valor.toFixed(2).replace('.', ',')}</strong>
                    </li>
                `;
            });
        } else {
            htmlDetalhes += `<li class="item-detalhe-antigo">Sem detalhes salvos para este dia.</li>`;
        }
        htmlDetalhes += `</ul>`;

        // Monta o card do histórico colocando o botão da lixeira (🗑️)
        divDia.innerHTML = `
            <div class="topo-dia-salvo">
                <div class="infos-topo-dia" onclick="alternarDetalhes(${indexVisual})">
                    <strong>Data: ${dia.data} 📁</strong>
                    <span class="saldo-salvo">Lucro: R$ ${dia.saldo.toFixed(2).replace('.', ',')}</span>
                </div>
                <button class="btn-apagar-dia" onclick="apagarDiaDoHistorico(event, ${dia.idOriginal})">🗑️</button>
            </div>
            <div class="detalhes-dia-salvo" onclick="alternarDetalhes(${indexVisual})">
                <small>Entradas: R$ ${dia.entradas.toFixed(2).replace('.', ',')} | Saídas: R$ ${dia.saidas.toFixed(2).replace('.', ',')}</small>
            </div>
            ${htmlDetalhes}
        `;
        containerHistorico.appendChild(divDia);
    });
}

// Função para abrir/fechar a aba de detalhes ao clicar no card
function alternarDetalhes(indexVisual) {
    const lista = document.getElementById(`detalhes-${indexVisual}`);
    if (lista) {
        lista.classList.toggle('ativo');
    }
}

// NOVA FUNÇÃO: Apaga um dia inteiro do histórico
function apagarDiaDoHistorico(event, idOriginal) {
    // Impede que o clique na lixeira abra/feche os detalhes do card sem querer
    event.stopPropagation();

    if (confirm('Tem certeza de que deseja excluir permanentemente o histórico deste dia?')) {
        // Remove o dia da lista principal usando o índice original dele
        historicoDias.splice(idOriginal, 1);
        
        // Atualiza a memória local e redesenha a tela
        salvarNoLocalStorage();
        init();
    }
}

// Adicionar transação ao dia atual
form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const transacao = {
        descricao: document.querySelector('#descricao').value,
        valor: parseFloat(document.querySelector('#valor').value),
        tipo: document.querySelector('#tipo').value
    };

    transacoesDoDia.push(transacao);
    salvarNoLocalStorage();
    init();
    form.reset();
});

// Remover transação do dia atual
function removerTransacao(index) {
    transacoesDoDia.splice(index, 1);
    salvarNoLocalStorage();
    init();
}

// Ação do botão "Novo dia"
btnNovoDia.addEventListener('click', () => {
    if (transacoesDoDia.length === 0) {
        alert('Não é possível fechar um dia sem lançamentos!');
        return;
    }

    if (confirm('Deseja fechar o caixa de hoje e iniciar um Novo Dia? Os dados atuais irão para o histórico.')) {
        const resumos = calcularResumos();
        const dataAtual = new Date().toLocaleDateString('pt-BR');

        const diaFechado = {
            data: dataAtual,
            entradas: resumos.entradas,
            saidas: resumos.saidas, 
            saldo: resumos.saldo,
            detalhes: [...transacoesDoDia]
        };

        historicoDias.push(diaFechado);
        transacoesDoDia = [];
        
        salvarNoLocalStorage();
        init();
    }
});

function salvarNoLocalStorage() {
    localStorage.setItem('transacoesDoDia', JSON.stringify(transacoesDoDia));
    localStorage.setItem('historicoDias', JSON.stringify(historicoDias));
}

function init() {
    renderizarListaDoDia();
    renderizarHistoricoDias();
    atualizarDashboard();
}

init();