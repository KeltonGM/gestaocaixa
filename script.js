const form = document.querySelector('#form-transacao');
const listaTransacoes = document.querySelector('#lista-transacoes');
const totalEntradas = document.querySelector('#total-entradas');
const totalSaidas = document.querySelector('#total-saidas');
const totalSaldo = document.querySelector('#total-saldo');

// Busca os dados salvos ou começa com uma lista vazia
let transacoes = JSON.parse(localStorage.getItem('transacoes')) || [];

function atualizarDashboard() {
    const valores = transacoes.map(t => t.tipo === 'entrada' ? t.valor : -t.valor);
    
    const entradas = valores.filter(v => v > 0).reduce((acc, v) => acc + v, 0);
    const saidas = Math.abs(valores.filter(v => v < 0).reduce((acc, v) => acc + v, 0));
    const saldo = entradas - saidas;

    totalEntradas.innerText = `R$ ${entradas.toFixed(2)}`;
    totalSaidas.innerText = `R$ ${saidas.toFixed(2)}`;
    totalSaldo.innerText = `R$ ${saldo.toFixed(2)}`;
}

function renderizarLista() {
    listaTransacoes.innerHTML = '';
    transacoes.forEach((t, index) => {
        const li = document.createElement('li');
        li.classList.add(t.tipo);
        li.innerHTML = `
            ${t.descricao} <span>R$ ${t.valor.toFixed(2)}</span>
            <button onclick="removerTransacao(${index})">X</button>
        `;
        listaTransacoes.appendChild(li);
    });
}

form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const transacao = {
        descricao: document.querySelector('#descricao').value,
        valor: parseFloat(document.querySelector('#valor').value),
        tipo: document.querySelector('#tipo').value
    };

    transacoes.push(transacao);
    salvarNoLocalStorage();
    init();
    form.reset();
});

function removerTransacao(index) {
    transacoes.splice(index, 1);
    salvarNoLocalStorage();
    init();
}

function salvarNoLocalStorage() {
    localStorage.setItem('transacoes', JSON.stringify(transacoes));
}

function init() {
    renderizarLista();
    atualizarDashboard();
}

init();