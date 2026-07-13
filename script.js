// ==========================================================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDy9KJu4489CKkIHWQETvUb9QQjENBY-oM",
    authDomain: "meufluxodecaixa-374c5.firebaseapp.com",
    databaseURL: "https://meufluxodecaixa-374c5-default-rtdb.firebaseio.com",
    projectId: "meufluxodecaixa-374c5",
    storageBucket: "meufluxodecaixa-374c5.firebasestorage.app",
    messagingSenderId: "630064876679",
    appId: "1:630064876679:web:0843cd10798bb4d73dbc22"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// ELEMENTOS DO HTML
const secaoAutenticacao = document.querySelector('#secao-autenticacao');
const sistemaCaixa = document.querySelector('#sistema-caixa');
const formLogin = document.querySelector('#form-login');
const emailInput = document.querySelector('#login-email');
const senhaInput = document.querySelector('#login-senha');
const loginTitulo = document.querySelector('#login-titulo');
const loginSubtitulo = document.querySelector('#login-subtitulo');
const btnSubmeterAuth = document.querySelector('#btn-submeter-auth');
const textoAlternar = document.querySelector('#texto-alternar');
const btnDeslogar = document.querySelector('#btn-deslogar');

const formTransacao = document.querySelector('#form-transacao');
const inputValorMonetario = document.querySelector('#valor');
const listaTransacoes = document.querySelector('#lista-transacoes');
const totalEntradas = document.querySelector('#total-entradas');
const totalSaidas = document.querySelector('#total-saidas');
const totalSaldo = document.querySelector('#total-saldo');
const btnNovoDia = document.querySelector('#btn-novo-dia');
const containerHistorico = document.querySelector('#historico-dias');
const btnSalvarTransacao = document.querySelector('#btn-salvar-transacao');

// Elementos do Resumo Mensal
const mesTotalEntradas = document.querySelector('#mes-total-entradas');
const mesTotalSaidas = document.querySelector('#mes-total-saidas');
const mesTotalSaldo = document.querySelector('#mes-total-saldo');

// Variáveis Globais
let usuarioAtual = null;
let modoAuth = 'login'; 
let transacoesDoDia = [];
let historicoDias = [];
let indexEdicaoEmAndamento = null; 

// Instâncias de Gráficos (Global Map)
let graficosInstanciados = {};

// ==========================================================================
// NAVEGAÇÃO ENTRE SUB-TELAS COM FLUIDEZ
// ==========================================================================
function irParaSubtela(idSubtela) {
    document.querySelectorAll('.pagina-sistema').forEach(p => {
        p.classList.remove('ativa');
    });
    document.getElementById('menu-navegacao-principal').style.opacity = "0";
    document.getElementById('menu-navegacao-principal').style.pointerEvents = "none";
    
    btnDeslogar.style.display = "none";

    const subtela = document.getElementById(`pagina-${idSubtela}`);
    subtela.classList.add('ativa');

    if (idSubtela === 'detalhe-entradas') renderizarSubGraficoEntradas();
    if (idSubtela === 'detalhe-saidas') renderizarSubGraficoSaidas();
    if (idSubtela === 'detalhe-lucro') renderizarSubGraficoLucro();
}

function voltarParaFluxo() {
    document.querySelectorAll('.pagina-sistema').forEach(p => p.classList.remove('ativa'));
    document.getElementById('menu-navegacao-principal').style.opacity = "1";
    document.getElementById('menu-navegacao-principal').style.pointerEvents = "auto";
    
    btnDeslogar.style.display = "flex";
    
    document.getElementById('pagina-fluxo-caixa').classList.add('ativa');
}

// MÁSCARA MONETÁRIA
inputValorMonetario.addEventListener('input', (e) => {
    let valor = e.target.value.replace(/\D/g, "");
    if (!valor) { e.target.value = ""; return; }
    valor = (parseFloat(valor) / 100).toFixed(2);
    e.target.value = "R$ " + valor.replace(".", ",").replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
});

function obterValorNumericoPuro(stringMonetaria) {
    if (!stringMonetaria) return 0;
    let limpo = stringMonetaria.replace("R$", "").replace(/\./g, "").replace(",", ".").trim();
    return parseFloat(limpo) || 0;
}

function alternarPagina(idPagina, botaoClicado) {
    document.querySelectorAll('.pagina-sistema').forEach(p => p.classList.remove('ativa'));
    document.querySelectorAll('.aba-link').forEach(b => b.classList.remove('ativa'));
    
    document.getElementById(`pagina-${idPagina}`).classList.add('ativa');
    botaoClicado.classList.add('ativa');

    if (idPagina === 'fluxo-caixa' || idPagina === 'historico-caixas') {
        btnDeslogar.style.display = "flex";
    } else {
        btnDeslogar.style.display = "none";
    }

    if (idPagina === 'graficos-analise') renderizarIndicadoresGraficosMensais();
}

function mudarModoAuth() {
    if (modoAuth === 'login') {
        modoAuth = 'cadastro';
        loginTitulo.innerText = "Criar Nova Conta";
        loginSubtitulo.innerText = "Cadastre-se para começar a gerir as suas finanças em tempo real";
        btnSubmeterAuth.innerText = "Cadastrar";
        textoAlternar.innerHTML = 'Já tem uma conta? <span onclick="mudarModoAuth()">Entrar</span>';
    } else {
        modoAuth = 'login';
        loginTitulo.innerText = "Acessar Sistema";
        loginSubtitulo.innerText = "Insira as suas credenciais para sincronizar em tempo real";
        btnSubmeterAuth.innerText = "Entrar";
        textoAlternar.innerHTML = 'Não tem uma conta? <span onclick="mudarModoAuth()">Cadastre-se</span>';
    }
}

formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const senha = senhaInput.value;
    if (modoAuth === 'login') {
        auth.signInWithEmailAndPassword(email, senha).catch(err => alert("Erro ao entrar: " + err.message));
    } else {
        auth.createUserWithEmailAndPassword(email, senha).catch(err => alert("Erro ao cadastrar: " + err.message));
    }
});

auth.onAuthStateChanged(user => {
    if (user) {
        usuarioAtual = user;
        secaoAutenticacao.style.display = 'none';
        sistemaCaixa.style.display = 'block';
        btnDeslogar.style.display = "flex"; 
        vincularBancoDeDados();
    } else {
        usuarioAtual = null;
        secaoAutenticacao.style.display = 'block';
        sistemaCaixa.style.display = 'none';
    }
});

btnDeslogar.addEventListener('click', () => {
    if (confirm('Deseja realmente sair do sistema?')) {
        auth.signOut().catch(err => alert('Erro ao sair: ' + err.message));
    }
});

function vincularBancoDeDados() {
    const uid = usuarioAtual.uid;
    const cacheLocal = localStorage.getItem(`cache_caixa_${uid}`);
    if (cacheLocal) {
        transacoesDoDia = JSON.parse(cacheLocal);
        renderizarListaDoDia();
        atualizarDashboard();
    }

    db.ref(`usuarios/${uid}/transacoesDoDia`).on('value', snapshot => {
        transacoesDoDia = snapshot.val() || [];
        localStorage.setItem(`cache_caixa_${uid}`, JSON.stringify(transacoesDoDia));
        renderizarListaDoDia();
        atualizarDashboard();
        atualizarTabelasSubtelas();
    });

    db.ref(`usuarios/${uid}/historicoDias`).on('value', snapshot => {
        historicoDias = snapshot.val() || [];
        renderizarHistoricoDias();
    });
}

function salvarNaNuvem(caminho, dados) {
    if (usuarioAtual) {
        db.ref(`usuarios/${usuarioAtual.uid}/${caminho}`).set(dados);
        if (caminho === 'transacoesDoDia') {
            localStorage.setItem(`cache_caixa_${usuarioAtual.uid}`, JSON.stringify(dados));
        }
    }
}

function calcularResumos() {
    const valores = transacoesDoDia.map(t => t.tipo === 'entrada' ? t.valor : -t.valor);
    const entries = valores.filter(v => v > 0).reduce((acc, v) => acc + v, 0);
    const outlays = Math.abs(valores.filter(v => v < 0).reduce((acc, v) => acc + v, 0));
    const saldo = entries - outlays;
    return { entradas: entries, saidas: outlays, saldo };
}

function atualizarDashboard() {
    const resumos = calcularResumos();
    totalEntradas.innerText = `R$ ${resumos.entradas.toFixed(2).replace('.', ',')}`;
    totalSaidas.innerText = `R$ ${resumos.saidas.toFixed(2).replace('.', ',')}`;
    totalSaldo.innerText = `R$ ${resumos.saldo.toFixed(2).replace('.', ',')}`;
    renderizarOuAtualizarGrafico(resumos.entradas, resumos.saidas);
}

function atualizarTabelasSubtelas() {
    const corpoEntradas = document.getElementById('tabela-corpo-entradas');
    const corpoSaidas = document.getElementById('tabela-corpo-saidas');
    
    corpoEntradas.innerHTML = '';
    corpoSaidas.innerHTML = '';

    const entradas = transacoesDoDia.filter(t => t.tipo === 'entrada');
    const saidas = transacoesDoDia.filter(t => t.tipo === 'saida');

    if(entradas.length === 0) corpoEntradas.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--texto-secundario)">Nenhuma entrada hoje.</td></tr>';
    if(saidas.length === 0) corpoSaidas.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--texto-secundario)">Nenhuma saída hoje.</td></tr>';

    entradas.forEach(e => {
        corpoEntradas.innerHTML += `<tr><td>${e.hora}</td><td>${e.descricao}</td><td style="color:var(--entrada); font-weight:700">R$ ${e.valor.toFixed(2).replace('.',',')}</td></tr>`;
    });

    saidas.forEach(s => {
        corpoSaidas.innerHTML += `<tr><td>${s.hora}</td><td>${s.descricao}</td><td style="color:var(--saida); font-weight:700">R$ ${s.valor.toFixed(2).replace('.',',')}</td></tr>`;
    });
}

function renderizarSubGraficoEntradas() {
    const canvas = document.getElementById('graficoSubEntradas');
    if (!canvas) return;
    if (graficosInstanciados['subEntradas']) graficosInstanciados['subEntradas'].destroy();

    const entradas = transacoesDoDia.filter(t => t.tipo === 'entrada');
    const labels = entradas.map(e => e.descricao);
    const valores = entradas.map(e => e.valor);

    graficosInstanciados['subEntradas'] = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['Sem dados'],
            datasets: [{ label: 'Valor Recebido', data: valores.length ? valores : [0], backgroundColor: '#10b981' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderizarSubGraficoSaidas() {
    const canvas = document.getElementById('graficoSubSaidas');
    if (!canvas) return;
    if (graficosInstanciados['subSaidas']) graficosInstanciados['subSaidas'].destroy();

    const saidas = transacoesDoDia.filter(t => t.tipo === 'saida');
    const labels = saidas.map(s => s.descricao);
    const valores = saidas.map(s => s.valor);

    graficosInstanciados['subSaidas'] = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels.length ? labels : ['Sem dados'],
            datasets: [{ label: 'Valor Pago', data: valores.length ? valores : [0], backgroundColor: '#f43f5e' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function renderizarSubGraficoLucro() {
    const canvas = document.getElementById('graficoSubLucro');
    const txtDiag = document.getElementById('diagnostico-lucro-texto');
    if (!canvas) return;
    if (graficosInstanciados['subLucro']) graficosInstanciados['subLucro'].destroy();

    const resumos = calcularResumos();

    if (resumos.saldo > 0) {
        txtDiag.innerHTML = `🎉 Operação saudável! Suas entradas superam as saídas em <strong style="color:var(--entrada)">R$ ${resumos.saldo.toFixed(2).replace('.',',')}</strong>.<br><br>Sua margem atual está positiva. Continue controlando os custos fixos para expandir os resultados!`;
    } else if (resumos.saldo < 0) {
        txtDiag.innerHTML = `⚠️ Alerta Vermelho! Você está operando com prejuízo de <strong style="color:var(--saida)">R$ ${Math.abs(resumos.saldo).toFixed(2).replace('.',',')}</strong> hoje.<br><br>Reveja as saídas registradas nas últimas horas para conter vazamentos de capital imediatamente.`;
    } else {
        txtDiag.innerHTML = "⚖️ Equilíbrio Perfeito (Ponto de Equilíbrio). Suas receitas são exatamente iguais às suas despesas. Registre novas entradas para gerar lucro.";
    }

    graficosInstanciados['subLucro'] = new Chart(canvas.getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Entradas Total', 'Saídas Total'],
            datasets: [{ data: [resumos.entradas, resumos.saidas], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function renderizarOuAtualizarGrafico(entradas, saidas) {
    const canvas = document.getElementById('graficoCaixa');
    if (!canvas) return;
    if (graficosInstanciados['principal']) {
        graficosInstanciados['principal'].data.datasets[0].data = [entradas, saidas];
        graficosInstanciados['principal'].update();
    } else {
        graficosInstanciados['principal'] = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Entradas', 'Saídas'],
                datasets: [{ data: [entradas, saidas], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }, cutout: '72%' }
        });
    }
}

// ==========================================================================
// MUDANÇA PRINCIPAL: CONSOLIDAÇÃO DOS DADOS MENSAL
// ==========================================================================
function renderizarIndicadoresGraficosMensais() {
    let somatorioEntradas = 0;
    let somatorioSaidas = 0;
    let somatorioSaldo = 0;

    const dataAtual = new Date();
    const mesAtual = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const anoAtual = String(dataAtual.getFullYear());

    historicoDias.forEach(dia => {
        const partesData = dia.data.split('/');
        if (partesData[1] === mesAtual && partesData[2] === anoAtual) {
            somatorioEntradas += dia.entradas;
            somatorioSaidas += dia.saidas;
            somatorioSaldo += dia.saldo;
        }
    });

    mesTotalEntradas.innerText = `R$ ${somatorioEntradas.toFixed(2).replace('.', ',')}`;
    mesTotalSaidas.innerText = `R$ ${somatorioSaidas.toFixed(2).replace('.', ',')}`;
    mesTotalSaldo.innerText = `R$ ${somatorioSaldo.toFixed(2).replace('.', ',')}`;
    mesTotalSaldo.style.color = somatorioSaldo >= 0 ? 'var(--entrada)' : 'var(--saida)';

    // 1. Renderizar Gráfico de Pizza Mensal
    const canvasPizza = document.getElementById('graficoMesPizza');
    if (canvasPizza) {
        if (graficosInstanciados['mesPizza']) graficosInstanciados['mesPizza'].destroy();
        graficosInstanciados['mesPizza'] = new Chart(canvasPizza.getContext('2d'), {
            type: 'pie',
            data: {
                labels: ['Entradas Mensais', 'Saídas Mensais'],
                datasets: [{
                    data: [somatorioEntradas, somatorioSaidas],
                    backgroundColor: ['#10b981', '#f43f5e'],
                    borderWidth: 0
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // 2. Renderizar Gráfico de Linha de Evolução Histórica (Geral)
    const canvasLinha = document.getElementById('graficoHistoricoLinha');
    if (canvasLinha && historicoDias.length > 0) {
        if (graficosInstanciados['linha']) graficosInstanciados['linha'].destroy();

        const ultimosDias = historicoDias.slice(-10);
        const labelsDatas = ultimosDias.map(d => d.data.substring(0, 5));
        const dadosLucro = ultimosDias.map(d => d.saldo);

        graficosInstanciados['linha'] = new Chart(canvasLinha.getContext('2d'), {
            type: 'line',
            data: {
                labels: labelsDatas,
                datasets: [{
                    label: 'Resultados Históricos',
                    data: dadosLucro,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }
}

function renderizarListaDoDia() {
    listaTransacoes.innerHTML = '';
    if (transacoesDoDia.length === 0) {
        listaTransacoes.innerHTML = '<p style="color: #94a3b8; font-size: 14px; text-align: center; width: 100%; padding: 10px;">Nenhum lançamento registrado hoje.</p>';
        return;
    }
    transacoesDoDia.forEach((t, index) => {
        const li = document.createElement('li');
        li.classList.add(t.tipo);
        li.innerHTML = `
            <div><span class="hora-badge">${t.hora || '--:--'}</span>${t.descricao}</div>
            <div class="valor-wrapper">R$ ${t.valor.toFixed(2).replace('.', ',')}</div>
            <div class="acoes-item">
                <button class="btn-acao-lista editar" onclick="iniciarEdicaoTransacao(${index})" title="Editar Lançamento">✏️</button>
                <button class="btn-acao-lista remover" onclick="removerTransacao(${index})">✕</button>
            </div>
        `;
        listaTransacoes.appendChild(li);
    });
}

function iniciarEdicaoTransacao(index) {
    const item = transacoesDoDia[index];
    if (!item) return;

    document.querySelector('#descricao').value = item.descricao;
    document.querySelector('#tipo').value = item.tipo;
    
    const valorFormatado = item.valor.toFixed(2).replace('.', ',');
    inputValorMonetario.value = "R$ " + valorFormatado;

    indexEdicaoEmAndamento = index;
    btnSalvarTransacao.innerText = "Atualizar Lançamento 🛠️";
    btnSalvarTransacao.style.backgroundColor = "#eab308"; 

    formTransacao.scrollIntoView({ behavior: 'smooth' });
}

function renderizarHistoricoDias(dadosParaExibir = null) {
    containerHistorico.innerHTML = '';
    const dados = dadosParaExibir || historicoDias;
    if (dados.length === 0) {
        containerHistorico.innerHTML = '<p style="color: #94a3b8; font-size: 14px; padding: 10px;">Nenhum fechamento localizado.</p>';
        return;
    }
    const mapeado = dados.map((dia, idx) => ({ ...dia, idOriginal: idx })).reverse();

    mapeado.forEach((dia) => {
        const divDia = document.createElement('div');
        divDia.classList.add('card-dia-salvo');

        divDia.innerHTML = `
            <div class="topo-dia-salvo">
                <div class="infos-topo-dia">
                    <strong>Data: ${dia.data} 📁</strong>
                    <span style="color: ${dia.saldo >= 0 ? '#10b981' : '#f43f5e'}; font-weight:700">Lucro: R$ ${dia.saldo.toFixed(2).replace('.', ',')}</span>
                </div>
                <button class="btn-apagar-dia" onclick="apagarDiaDoHistorico(event, ${dia.idOriginal})">🗑️</button>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                <small style="color: var(--texto-secundario);">Entradas: R$ ${dia.entradas.toFixed(2).replace('.', ',')} | Saídas: R$ ${dia.saidas.toFixed(2).replace('.', ',')}</small>
                <button class="btn-ver-mais-detalhes" onclick="abrirDetalhesDiaEspecifico(${dia.idOriginal})">Ver mais detalhes</button>
            </div>
        `;
        containerHistorico.appendChild(divDia);
    });
}

function filtrarHistorico() {
    const termoBusca = document.getElementById('filtro-busca').value.toLowerCase();
    const modoResultado = document.getElementById('filtro-resultado').value;
    const filtrados = historicoDias.filter(dia => {
        if (modoResultado === 'positivo' && dia.saldo < 0) return false;
        if (modoResultado === 'negativo' && dia.saldo >= 0) return false;
        if (!termoBusca) return true;
        return dia.data.toLowerCase().includes(termoBusca) || (dia.detalhes && dia.detalhes.some(item => item.descricao.toLowerCase().includes(termoBusca)));
    });
    renderizarHistoricoDias(filtrados);
}

// ==========================================================================
// TELA DE DETALHAMENTO DO DIA HISTÓRICO
// ==========================================================================
function abrirDetalhesDiaEspecifico(idOriginal) {
    const dia = historicoDias[idOriginal];
    if (!dia) return;

    document.querySelectorAll('.pagina-sistema').forEach(p => p.classList.remove('ativa'));
    document.getElementById('menu-navegacao-principal').style.opacity = "0";
    document.getElementById('menu-navegacao-principal').style.pointerEvents = "none";
    btnDeslogar.style.display = "none";

    const telaDetalhes = document.getElementById('pagina-detalhes-dia-historico');
    telaDetalhes.classList.add('ativa');

    document.getElementById('detalhe-historico-titulo').innerHTML = `Relatório do Dia ${dia.data}`;

    const corpoTabela = document.getElementById('tabela-detalhe-historico-corpo');
    corpoTabela.innerHTML = '';
    if (dia.detalhes && dia.detalhes.length > 0) {
        dia.detalhes.forEach(item => {
            corpoTabela.innerHTML += `
                <tr>
                    <td>${item.hora || '--:--'}</td>
                    <td>${item.descricao}</td>
                    <td style="color: ${item.tipo === 'entrada' ? 'var(--entrada)' : 'var(--saida)'}; font-weight:700;">
                        ${item.tipo === 'entrada' ? 'Entrada (+)' : 'Saída (-)'}
                    </td>
                    <td style="font-weight:700;">R$ ${item.valor.toFixed(2).replace('.', ',')}</td>
                </tr>
            `;
        });
    } else {
        corpoTabela.innerHTML = '<tr><td colspan="4" style="text-align:center;">Sem lançamentos arquivados neste dia.</td></tr>';
    }

    document.getElementById('btn-exp-pdf-historico').onclick = (e) => exportarDiaPro(e, idOriginal, 'pdf');
    document.getElementById('btn-exp-excel-historico').onclick = (e) => exportarDiaPro(e, idOriginal, 'excel');
    document.getElementById('btn-exp-csv-historico').onclick = (e) => exportarDiaPro(e, idOriginal, 'csv');

    renderizarGraficoDiaHistorico(dia);
}

function voltarParaHistorico() {
    document.querySelectorAll('.pagina-sistema').forEach(p => p.classList.remove('ativa'));
    document.getElementById('menu-navegacao-principal').style.opacity = "1";
    document.getElementById('menu-navegacao-principal').style.pointerEvents = "auto";
    btnDeslogar.style.display = "flex";
    
    document.getElementById('pagina-historico-caixas').classList.add('ativa');
}

function renderizarGraficoDiaHistorico(dia) {
    const canvas = document.getElementById('graficoDetalheHistorico');
    if (!canvas) return;
    if (graficosInstanciados['diaHistorico']) graficosInstanciados['diaHistorico'].destroy();

    graficosInstanciados['diaHistorico'] = new Chart(canvas.getContext('2d'), {
        type: 'pie',
        data: {
            labels: ['Entradas', 'Saídas'],
            datasets: [{ data: [dia.entradas, dia.saidas], backgroundColor: ['#10b981', '#f43f5e'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

formTransacao.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const valorPuro = obterValorNumericoPuro(inputValorMonetario.value);
    if (valorPuro <= 0) return;

    if (indexEdicaoEmAndamento !== null) {
        transacoesDoDia[indexEdicaoEmAndamento].descricao = document.querySelector('#descricao').value;
        transacoesDoDia[indexEdicaoEmAndamento].valor = valorPuro;
        transacoesDoDia[indexEdicaoEmAndamento].tipo = document.querySelector('#tipo').value;
        
        indexEdicaoEmAndamento = null;
        btnSalvarTransacao.innerText = "Lançar no Caixa";
        btnSalvarTransacao.style.backgroundColor = "var(--azul-pro)";
    } else {
        const agora = new Date();
        const horaFormatada = String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');
        const transacao = {
            descricao: document.querySelector('#descricao').value,
            valor: valorPuro,
            tipo: document.querySelector('#tipo').value,
            hora: horaFormatada
        };
        transacoesDoDia.push(transacao);
    }
    
    salvarNaNuvem('transacoesDoDia', transacoesDoDia);
    formTransacao.reset();
});

function removerTransacao(index) {
    if (indexEdicaoEmAndamento === index) {
        indexEdicaoEmAndamento = null;
        btnSalvarTransacao.innerText = "Lançar no Caixa";
        btnSalvarTransacao.style.backgroundColor = "var(--azul-pro)";
        formTransacao.reset();
    }
    transacoesDoDia.splice(index, 1);
    salvarNaNuvem('transacoesDoDia', transacoesDoDia);
}

function apagarDiaDoHistorico(event, idOriginal) {
    event.stopPropagation();
    if (confirm('Deseja excluir permanentemente o histórico deste dia?')) {
        historicoDias.splice(idOriginal, 1);
        salvarNaNuvem('historicoDias', historicoDias);
    }
}

function exportarDiaPro(event, idOriginal, formato) {
    event.stopPropagation();
    const dia = historicoDias[idOriginal];
    if (!dia) return;
    const nomeBaseDoArquivo = `Extrato_Caixa_${dia.data.replace(/\//g, '-')}`;

    if (formato === 'pdf') {
        const containerImpressao = document.createElement('div');
        containerImpressao.style.position = 'absolute'; containerImpressao.style.left = '-9999px';
        containerImpressao.style.width = '175mm'; containerImpressao.style.padding = '25px';
        containerImpressao.style.color = '#1e293b'; containerImpressao.style.backgroundColor = '#ffffff';

        let html = `
            <div style="border-bottom: 2px solid #1e293b; padding-bottom: 12px; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 20px;">EXTRATO DE FECHAMENTO DE CAIXA</h2>
                <p style="margin: 5px 0 0 0; font-size: 13px;">Data: <strong>${dia.data}</strong></p>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top:20px;">
                <thead>
                    <tr style="background-color: #f1f5f9; text-align: left; border-bottom: 2px solid #cbd5e1;">
                        <th style="padding: 8px;">Horário</th><th style="padding: 8px;">Descrição</th><th style="padding: 8px; text-align: center;">Operação</th><th style="padding: 8px; text-align: right;">Valor</th>
                    </tr>
                </thead>
                <tbody>`;
        if (dia.detalhes) {
            dia.detalhes.forEach(item => {
                html += `
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px; color: #64748b;">${item.hora || '--:--'}</td><td>${item.descricao}</td><td style="padding: 8px; text-align: center; color: ${item.tipo === 'entrada' ? '#0d9488' : '#e11d48'}; font-weight: bold;">${item.tipo.toUpperCase()}</td><td style="padding: 8px; text-align: right; font-weight: bold;">R$ ${item.valor.toFixed(2).replace('.', ',')}</td>
                    </tr>`;
            });
        }
        html += `</tbody></table>`;
        containerImpressao.innerHTML = html; document.body.appendChild(containerImpressao);
        html2pdf().set({ margin: 15, filename: `${nomeBaseDoArquivo}.pdf`, jsPDF: { format: 'a4' } }).from(containerImpressao).save().then(() => document.body.removeChild(containerImpressao));
    } else if (formato === 'excel') {
        const linhas = [["EXTRATO - DATA: " + dia.data], [], ["Horário", "Descrição", "Tipo", "Valor (R$)"]];
        if (dia.detalhes) {
            dia.detalhes.forEach(item => linhas.push([item.hora || '--:--', item.descricao, item.tipo.toUpperCase(), item.valor]));
        }
        
        linhas.push([]);
        linhas.push(["RESUMO FINANCEIRO DO DIA"]);
        linhas.push(["Total Entradas:", dia.entradas]);
        linhas.push(["Total Saídas:", dia.saidas]);
        linhas.push(["Lucro Líquido do Dia:", dia.saldo]);

        const planilha = XLSX.utils.aoa_to_sheet(linhas); const livro = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(livro, planilha, "Caixa"); XLSX.writeFile(livro, `${nomeBaseDoArquivo}.xlsx`);
    } else if (formato === 'csv') {
        let csv = `Horario;Descricao;Tipo;Valor\n`;
        if (dia.detalhes) dia.detalhes.forEach(item => csv += `${item.hora || '--:--'};"${item.descricao}";${item.tipo.toUpperCase()};${item.valor.toFixed(2)}\n`);
        const link = document.createElement('a'); link.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)); link.setAttribute('download', `${nomeBaseDoArquivo}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
}

btnNovoDia.addEventListener('click', () => {
    if (transacoesDoDia.length === 0) return;
    if (confirm('Deseja fechar o caixa de hoje?')) {
        const resumos = calcularResumos(); const dataAtual = new Date().toLocaleDateString('pt-BR');
        historicoDias.push({ data: dataAtual, entradas: resumos.entradas, saidas: resumos.saidas, saldo: resumos.saldo, detalhes: [...transacoesDoDia] });
        transacoesDoDia = []; localStorage.removeItem(`cache_caixa_${usuarioAtual.uid}`);
        indexEdicaoEmAndamento = null;
        btnSalvarTransacao.innerText = "Lançar no Caixa";
        btnSalvarTransacao.style.backgroundColor = "var(--azul-pro)";
        formTransacao.reset();
        salvarNaNuvem('historicoDias', historicoDias); salvarNaNuvem('transacoesDoDia', transacoesDoDia);
    }
});