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

let usuarioLogado = localStorage.getItem('usuario_logado');
let dataVisualizacao = new Date();
let db = { variavel: [], mercado: [], logsFixas: [] };
let statusFixas = {
    aluguel: { Eu: false, Namorada: false, valor: 1000.0 },
    internet: { Eu: false, Namorada: false, valor: 109.99 },
};
let desinscreverOuvinte = null;

function obterIdMes(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}`;
}

function mudarMes(direcao) {
    dataVisualizacao.setMonth(dataVisualizacao.getMonth() + direcao);
    const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('mesExibido').innerText = `${nomesMeses[dataVisualizacao.getMonth()]} ${dataVisualizacao.getFullYear()}`;
    ativarOuvinteFirebase();
}

function abrirAba(evt, abaNome) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = "none";
        contents[i].classList.remove("active");
    }
    const btns = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < btns.length; i++) {
        btns[i].classList.remove("active");
    }
    document.getElementById(abaNome).style.display = "block";
    document.getElementById(abaNome).classList.add("active");
    evt.currentTarget.classList.add("active");
}

function ativarOuvinteFirebase() {
    const idMes = obterIdMes(dataVisualizacao);
    if (desinscreverOuvinte) desinscreverOuvinte();

    desinscreverOuvinte = db_nuvem.collection("dados").doc(idMes)
    .onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            db = data.db || { variavel: [], mercado: [], logsFixas: [] };
            statusFixas = data.statusFixas || {
                aluguel: { Eu: false, Namorada: false, valor: 1000.0 },
                internet: { Eu: false, Namorada: false, valor: 109.99 },
            };
            if(data.rendas) {
                localStorage.setItem('s_eu', data.rendas.s_eu || 0);
                localStorage.setItem('s_ela', data.rendas.s_ela || 0);
                localStorage.setItem('va_eu', data.rendas.va_eu || 0);
                localStorage.setItem('va_ela', data.rendas.va_ela || 0);
            }
        } else {
            db = { variavel: [], mercado: [], logsFixas: [] };
            statusFixas = {
                aluguel: { Eu: false, Namorada: false, valor: 1000.0 },
                internet: { Eu: false, Namorada: false, valor: 109.99 },
            };
        }
        atualizarInterface();
    });
}

function salvarNaNuvem() {
    const idMes = obterIdMes(dataVisualizacao);
    const dados = {
        db,
        statusFixas,
        rendas: {
            s_eu: localStorage.getItem('s_eu') || 0,
            s_ela: localStorage.getItem('s_ela') || 0,
            va_eu: localStorage.getItem('va_eu') || 0,
            va_ela: localStorage.getItem('va_ela') || 0
        }
    };
    db_nuvem.collection("dados").doc(idMes).set(dados);
}

function fazerLogin(nome) {
  localStorage.setItem('usuario_logado', nome);
  location.reload();
}

function logout() {
  localStorage.removeItem('usuario_logado');
  location.reload();
}

function formatarData() {
  const agora = new Date();
  return agora.toLocaleDateString('pt-BR') + ' às ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function salvarRendaIndividual() {
  const rb = document.getElementById('minhaRendaBancaria').value;
  const rv = document.getElementById('meuRendaVA').value;
  const sufixo = usuarioLogado === 'Eu' ? 'eu' : 'ela';
  localStorage.setItem('s_' + sufixo, rb);
  localStorage.setItem('va_' + sufixo, rv);
  salvarNaNuvem();
}

function addGasto(tipo) {
  const d = document.getElementById(tipo === 'variavel' ? 'descVar' : 'descMerc');
  const v = document.getElementById(tipo === 'variavel' ? 'valVar' : 'valMerc');
  if (!d.value || !v.value) return;

  db[tipo].push({
    id: Date.now(),
    desc: d.value,
    val: parseFloat(v.value),
    quem: usuarioLogado,
    data: formatarData(),
  });
  
  salvarNaNuvem();
  d.value = '';
  v.value = '';
}

function toggleFixo(c) {
  statusFixas[c][usuarioLogado] = !statusFixas[c][usuarioLogado];
  salvarNaNuvem();
}

function deletar(tipo, id) {
  db[tipo] = db[tipo].filter((g) => g.id !== id);
  salvarNaNuvem();
}

function atualizarInterface() {
  if (!usuarioLogado) return;
  document.getElementById('userNameDisplay').innerText = usuarioLogado;

  const sEu = parseFloat(localStorage.getItem('s_eu')) || 0;
  const sEla = parseFloat(localStorage.getItem('s_ela')) || 0;
  const vaEu = parseFloat(localStorage.getItem('va_eu')) || 0;
  const vaEla = parseFloat(localStorage.getItem('va_ela')) || 0;

  const lVar = document.getElementById('listaVariavel');
  lVar.innerHTML = '';
  let tVarGeral = 0, meuVar = 0;
  db.variavel.slice().reverse().forEach((g) => {
      tVarGeral += g.val;
      if (g.quem === usuarioLogado) meuVar += g.val;
      lVar.innerHTML += `<li><span>${g.desc} <small>${g.data} (${g.quem})</small></span><b>R$ ${g.val.toFixed(2)}</b><button onclick="deletar('variavel',${g.id})">x</button></li>`;
  });

  const dFix = document.getElementById('listaFixas');
  dFix.innerHTML = '';
  let tFixGeral = 0, meuFix = 0;
  for (let c in statusFixas) {
    const i = statusFixas[c];
    const m = i.valor / 2;
    if (i.Eu) tFixGeral += m;
    if (i.Namorada) tFixGeral += m;
    if (i[usuarioLogado]) meuFix += m;
    dFix.innerHTML += `<div class="fixa-row"><span>${c.toUpperCase()} (R$ ${m})</span><button class="${i[usuarioLogado] ? 'pago' : ''}" onclick="toggleFixo('${c}')">${i[usuarioLogado] ? 'PAGO ✓' : 'MARCAR'}</button></div>`;
  }

  const lMerc = document.getElementById('listaMercado');
  lMerc.innerHTML = '';
  let tMerc = 0;
  db.mercado.slice().reverse().forEach((g) => {
      tMerc += g.val;
      lMerc.innerHTML += `<li><span>${g.desc} <small>${g.data} (${g.quem})</small></span><b>R$ ${g.val.toFixed(2)}</b><button onclick="deletar('mercado',${g.id})">x</button></li>`;
  });

  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  const todosEventos = [...db.variavel, ...db.mercado].sort((a, b) => b.id - a.id);
  todosEventos.forEach((ev) => {
    timeline.innerHTML += `<div class="timeline-item"><div class="time">${ev.data}</div><div class="details"><strong>${ev.desc}</strong> - R$ ${ev.val.toFixed(2)}<br><small>Por: ${ev.quem}</small></div></div>`;
  });

  const minhaRendaB = usuarioLogado === 'Eu' ? sEu : sEla;
  document.getElementById('saldoBancarioHeader').innerText = `R$ ${(sEu + sEla - tVarGeral - tFixGeral).toFixed(2)}`;
  document.getElementById('meuSaldoIndividual').innerText = `R$ ${(minhaRendaB - meuVar - meuFix).toFixed(2)}`;
  document.getElementById('saldoVAHeader').innerText = `R$ ${(vaEu + vaEla - tMerc).toFixed(2)}`;
  
  // Preencher os inputs de renda se estiverem vazios
  const sufixo = usuarioLogado === 'Eu' ? 'eu' : 'ela';
  if (!document.getElementById('minhaRendaBancaria').value) {
      document.getElementById('minhaRendaBancaria').value = localStorage.getItem('s_' + sufixo) || '';
  }
  if (!document.getElementById('meuRendaVA').value) {
      document.getElementById('meuRendaVA').value = localStorage.getItem('va_' + sufixo) || '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (usuarioLogado) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appHeader').style.display = 'block';
    document.getElementById('appContent').style.display = 'block';
    ativarOuvinteFirebase();
  }
});

function limparTudo() {
  if (confirm('Deseja zerar os dados deste mês no banco de dados?')) {
    const idMes = obterIdMes(dataVisualizacao);
    db_nuvem.collection("dados").doc(idMes).delete().then(() => location.reload());
  }
}