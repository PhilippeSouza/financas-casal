const firebaseConfig = {
  apiKey: "AIzaSyCivUd_bmoGT7c25P9-gsu6Qz7_lXEAtXo",
  authDomain: "financascasal-830ad.firebaseapp.com",
  projectId: "financascasal-830ad",
  storageBucket: "financascasal-830ad.firebasestorage.app",
  messagingSenderId: "74652723264",
  appId: "1:74652723264:web:d0c074eb78e93f1ceb57a5"
};

firebase.initializeApp(firebaseConfig);
const db_nuvem = firebase.firestore();
const auth = firebase.auth();

let usuarioLogadoNome = ""; 
let dataVisualizacao = new Date();
let db = { variavel: [], mercado: [], entradas: [] }; 
let statusFixas = { aluguel: { valor: 1000.0 }, internet: { valor: 109.99 } };
let desinscreverOuvinte = null;

// --- CONTROLO DE ACESSO ---
auth.onAuthStateChanged((user) => {
    if (user) {
        usuarioLogadoNome = user.displayName || user.email.split('@')[0];
        document.getElementById('userNameDisplay').innerText = usuarioLogadoNome;
        document.getElementById('displayEmail').innerText = user.email;
        document.getElementById('inputNovoNome').value = user.displayName || "";
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appHeader').style.display = 'block';
        document.getElementById('appContent').style.display = 'block';
        ativarOuvinteFirebase();
    } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appHeader').style.display = 'none';
        document.getElementById('appContent').style.display = 'none';
    }
});

function loginComEmail() {
    const e = document.getElementById('loginEmail').value;
    const s = document.getElementById('loginSenha').value;
    auth.signInWithEmailAndPassword(e, s).catch(err => {
        document.getElementById('loginErro').innerText = "E-mail ou senha incorretos.";
    });
}

function atualizarNomePerfil() {
    const n = document.getElementById('inputNovoNome').value;
    if (n) auth.currentUser.updateProfile({ displayName: n }).then(() => location.reload());
}

function logout() { auth.signOut().then(() => location.reload()); }

// --- DATAS E NAVEGAÇÃO ---
function obterIdMes(data) {
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
}

function mudarMes(direcao) {
    dataVisualizacao.setMonth(dataVisualizacao.getMonth() + direcao);
    const mNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('mesExibido').innerText = `${mNames[dataVisualizacao.getMonth()]} ${dataVisualizacao.getFullYear()}`;
    ativarOuvinteFirebase();
}

function abrirAba(evt, name) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) {
        contents[i].classList.remove("active");
    }
    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove("active");
    }
    document.getElementById(name).classList.add("active");
    if (evt) evt.currentTarget.classList.add("active");
}

// --- FIREBASE SYNC ---
function ativarOuvinteFirebase() {
    const id = obterIdMes(dataVisualizacao);
    if (desinscreverOuvinte) desinscreverOuvinte();
    desinscreverOuvinte = db_nuvem.collection("dados").doc(id).onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            db = data.db || { variavel: [], mercado: [], entradas: [] };
            statusFixas = data.statusFixas || { aluguel: { valor: 1000.0 }, internet: { valor: 109.99 } };
        } else {
            db = { variavel: [], mercado: [], entradas: [] };
            statusFixas = { aluguel: { valor: 1000.0 }, internet: { valor: 109.99 } };
        }
        atualizarInterface();
    });
}

function dadosPadrao() {
    return { db: { variavel: [], mercado: [], entradas: [] }, statusFixas: { aluguel: { valor: 1000.0 }, internet: { valor: 109.99 } } };
}

// Lê a versão mais nova do mês na nuvem, aplica a mudança e grava tudo de uma vez (transação):
// assim, se os dois lançarem ao mesmo tempo, um lançamento não apaga o do outro
function mutarMes(mudanca) {
    const ref = db_nuvem.collection("dados").doc(obterIdMes(dataVisualizacao));
    return db_nuvem.runTransaction(async (t) => {
        const snap = await t.get(ref);
        const atual = snap.exists ? snap.data() : dadosPadrao();
        const dados = {
            db: { ...dadosPadrao().db, ...(atual.db || {}) },
            statusFixas: atual.statusFixas || dadosPadrao().statusFixas
        };
        if (mudanca(dados) === false) return;
        t.set(ref, dados);
    }).catch(err => alert("Não foi possível salvar: " + err.message));
}

function novoId() {
    return Date.now() + Math.floor(Math.random() * 1000) / 1000;
}

// Dono do registro pela conta (uid), que não muda quando alguém troca o nome no perfil.
// Registros antigos, de antes do uid, continuam pelo nome.
function ehDono(item) {
    const u = auth.currentUser;
    if (item.uid) return Boolean(u) && item.uid === u.uid;
    return item.quem === usuarioLogadoNome;
}

// --- LANÇAMENTOS ---
function addEntrada() {
    const d = document.getElementById('descEntrada');
    const v = document.getElementById('valEntrada');
    const t = document.getElementById('tipoEntrada').value;
    if (!d.value || !v.value) return;
    const item = { id: novoId(), desc: d.value, val: parseFloat(v.value), tipo: t, quem: usuarioLogadoNome, uid: auth.currentUser.uid, data: formatarData() };
    mutarMes(dados => { dados.db.entradas.push(item); });
    d.value = ''; v.value = '';
}

function addGasto(tipo) {
    const d = document.getElementById(tipo === 'variavel' ? 'descVar' : 'descMerc');
    const v = document.getElementById(tipo === 'variavel' ? 'valVar' : 'valMerc');
    if (!d.value || !v.value) return;
    const item = { id: novoId(), desc: d.value, val: parseFloat(v.value), quem: usuarioLogadoNome, uid: auth.currentUser.uid, data: formatarData() };
    mutarMes(dados => { dados.db[tipo].push(item); });
    d.value = ''; v.value = '';
}

// Conta fixa paga por esta pessoa: marcada pela conta (uid); marcações antigas eram pelo nome
function fixaPaga(fixa) {
    const uid = auth.currentUser && auth.currentUser.uid;
    if (uid && uid in fixa) return Boolean(fixa[uid]);
    return Boolean(fixa[usuarioLogadoNome]);
}

// Grava a marcação pela conta e apaga a antiga pelo nome (migra aos poucos, sem perder nada)
function marcarFixa(fixa, chaveNome, uid, pago) {
    if (uid) {
        fixa[uid] = pago;
        delete fixa[chaveNome];
    } else {
        fixa[chaveNome] = pago;
    }
}

function toggleFixo(c) {
    const uid = auth.currentUser.uid;
    mutarMes(dados => {
        const fixas = dados.statusFixas;
        if (!fixas[c]) fixas[c] = { valor: 1000 };
        const st = !fixaPaga(fixas[c]);
        marcarFixa(fixas[c], usuarioLogadoNome, uid, st);
        const metade = fixas[c].valor / 2;
        if (st) {
            dados.db.variavel.push({ id: novoId(), desc: `FIXA: ${c.toUpperCase()}`, val: metade, quem: usuarioLogadoNome, uid, data: formatarData(), isFixa: true, refFixo: c });
        } else {
            dados.db.variavel = dados.db.variavel.filter(g => !(g.refFixo === c && g.isFixa && ehDono(g)));
        }
    });
}

function deletar(col, id) {
    const item = db[col].find(g => g.id === id);
    if (!item || !ehDono(item)) { alert("Apenas o dono do registo pode excluir!"); return; }
    mutarMes(dados => {
        const atual = dados.db[col].find(g => g.id === id);
        if (!atual || !ehDono(atual)) return false;
        if (atual.isFixa && dados.statusFixas[atual.refFixo]) marcarFixa(dados.statusFixas[atual.refFixo], atual.quem, atual.uid, false);
        dados.db[col] = dados.db[col].filter(g => g.id !== id);
    });
}

// --- INTERFACE ---
function atualizarInterface() {
    if (!usuarioLogadoNome) return;

    const entBanco = db.entradas.filter(e => e.tipo === 'banco').reduce((a, b) => a + b.val, 0);
    const gasBanco = db.variavel.reduce((a, b) => a + b.val, 0);
    const saldoGeral = entBanco - gasBanco;

    const entMinha = db.entradas.filter(e => e.tipo === 'banco' && e.quem === usuarioLogadoNome).reduce((a, b) => a + b.val, 0);
    const gasMinha = db.variavel.filter(g => g.quem === usuarioLogadoNome).reduce((a, b) => a + b.val, 0);
    const saldoMeu = entMinha - gasMinha;

    const entVA = db.entradas.filter(e => e.tipo === 'va').reduce((a, b) => a + b.val, 0);
    const gasVA = db.mercado.reduce((a, b) => a + b.val, 0);
    const saldoVA = entVA - gasVA;

    document.getElementById('saldoBancarioHeader').innerText = `R$ ${saldoGeral.toFixed(2)}`;
    document.getElementById('meuSaldoIndividual').innerText = `R$ ${saldoMeu.toFixed(2)}`;
    document.getElementById('saldoVAHeader').innerText = `R$ ${saldoVA.toFixed(2)}`;

    const df = document.getElementById('listaFixas'); df.innerHTML = '';
    for (let c in statusFixas) {
        const i = statusFixas[c], m = i.valor / 2, pago = fixaPaga(i);
        df.innerHTML += `<div class=\"fixa-row\"><span>${escaparHtml(c.toUpperCase())} (R$ ${m})</span><button class=\"${pago?'pago':''}\" onclick=\"toggleFixo('${escaparHtml(c)}')\">${pago?'PAGO ✓':'MARCAR'}</button></div>`;
    }

    const rendT = (id, lista, col) => {
        const el = document.getElementById(id); el.innerHTML = '';
        if (!lista || lista.length === 0) { el.innerHTML = '<p class=\"empty-msg\">Vazio</p>'; return; }
        lista.slice().reverse().forEach(ev => {
            const btn = ehDono(ev) ? `<button class=\"btn-del-hist\" onclick=\"deletar('${col}', ${Number(ev.id)})\">x</button>` : '';
            el.innerHTML += `<div class=\"timeline-item ${ev.isFixa?'fixa-item':''} ${col==='mercado'?'va-item':''} ${col==='entradas'?'entry-item':''}\">
                <div class=\"time\">${escaparHtml(ev.data)}</div>
                <div class=\"details\"><strong>${escaparHtml(ev.desc)}</strong> - R$ ${ev.val.toFixed(2)}<br><small>Por: ${escaparHtml(ev.quem)}</small></div>
                ${btn}
            </div>`;
        });
    };
    rendT('timelineEntradas', db.entradas, 'entradas');
    rendT('timelineGeral', db.variavel, 'variavel');
    rendT('timelineMercado', db.mercado, 'mercado');
}

// Texto digitado vira texto na tela, nunca código HTML
function escaparHtml(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function formatarData() {
    const d = new Date();
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
}

function limparTudo() {
    if (confirm('Limpar todos os dados deste mês?')) db_nuvem.collection("dados").doc(obterIdMes(dataVisualizacao)).delete().then(() => location.reload());
}