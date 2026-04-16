let usuarioLogado = localStorage.getItem('usuario_logado');
let db = JSON.parse(localStorage.getItem('financas_v6')) || {
  variavel: [],
  mercado: [],
  logsFixas: [],
};
let statusFixas = JSON.parse(localStorage.getItem('fixas_v6')) || {
  aluguel: { Eu: false, Namorada: false, valor: 1000.0 },
  internet: { Eu: false, Namorada: false, valor: 109.99 },
};

function fazerLogin(nome) {
  localStorage.setItem('usuario_logado', nome);
  location.reload();
}

function logout() {
  localStorage.removeItem('usuario_logado');
  location.reload();
}

function abrirAba(aba) {
  document
    .querySelectorAll('.tab-content')
    .forEach((t) => (t.style.display = 'none'));
  document
    .querySelectorAll('.tab-btn')
    .forEach((b) => b.classList.remove('active'));
  document.getElementById(aba).style.display = 'block';
  if (event) event.currentTarget.classList.add('active');
}

function formatarData() {
  const agora = new Date();
  return (
    agora.toLocaleDateString('pt-BR') +
    ' às ' +
    agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

function salvarRendaIndividual() {
  const rb = document.getElementById('minhaRendaBancaria').value;
  const rv = document.getElementById('meuRendaVA').value;
  const sufixo = usuarioLogado === 'Eu' ? 'eu' : 'ela';
  localStorage.setItem('s_' + sufixo, rb);
  localStorage.setItem('va_' + sufixo, rv);
  atualizar();
}

function addGasto(tipo) {
  const d = document.getElementById(
    tipo === 'variavel' ? 'descVar' : 'descMerc'
  );
  const v = document.getElementById(tipo === 'variavel' ? 'valVar' : 'valMerc');
  if (!d.value || !v.value) return;

  db[tipo].push({
    id: Date.now(),
    desc: d.value,
    val: parseFloat(v.value),
    quem: usuarioLogado,
    data: formatarData(),
  });
  salvar();
  d.value = '';
  v.value = '';
}

function toggleFixo(c) {
  const novoStatus = !statusFixas[c][usuarioLogado];
  statusFixas[c][usuarioLogado] = novoStatus;

  if (novoStatus) {
    db.logsFixas.push({
      id: Date.now(),
      desc: `Pagamento: ${c}`,
      val: statusFixas[c].valor / 2,
      quem: usuarioLogado,
      data: formatarData(),
    });
  } else {
    db.logsFixas = db.logsFixas.filter(
      (l) => !(l.desc.includes(c) && l.quem === usuarioLogado)
    );
  }
  salvar();
}

function deletar(tipo, id) {
  db[tipo] = db[tipo].filter((g) => g.id !== id);
  salvar();
}

function salvar() {
  localStorage.setItem('financas_v6', JSON.stringify(db));
  localStorage.setItem('fixas_v6', JSON.stringify(statusFixas));
  atualizar();
}

function atualizar() {
  if (!usuarioLogado) return;
  document.getElementById('userNameDisplay').innerText = usuarioLogado;

  const sEu = parseFloat(localStorage.getItem('s_eu')) || 0;
  const sEla = parseFloat(localStorage.getItem('s_ela')) || 0;
  const vaEu = parseFloat(localStorage.getItem('va_eu')) || 0;
  const vaEla = parseFloat(localStorage.getItem('va_ela')) || 0;

  // Listas Geral
  let tVarGeral = 0,
    meuVar = 0;
  const lVar = document.getElementById('listaVariavel');
  lVar.innerHTML = '';
  db.variavel
    .slice()
    .reverse()
    .forEach((g) => {
      tVarGeral += g.val;
      if (g.quem === usuarioLogado) meuVar += g.val;
      lVar.innerHTML += `<li><span>${g.desc} <small>${g.data} (${
        g.quem
      })</small></span><b>R$ ${g.val.toFixed(
        2
      )}</b><button onclick="deletar('variavel',${g.id})">x</button></li>`;
    });

  // Fixas
  let tFixGeral = 0,
    meuFix = 0;
  const dFix = document.getElementById('listaFixas');
  dFix.innerHTML = '';
  for (let c in statusFixas) {
    const i = statusFixas[c];
    const m = i.valor / 2;
    if (i.Eu) tFixGeral += m;
    if (i.Namorada) tFixGeral += m;
    if (i[usuarioLogado]) meuFix += m;
    dFix.innerHTML += `<div class="fixa-row"><span>${c.toUpperCase()} (R$ ${m})</span><button class="${
      i[usuarioLogado] ? 'pago' : ''
    }" onclick="toggleFixo('${c}')">${
      i[usuarioLogado] ? 'PAGO ✓' : 'MARCAR'
    }</button></div>`;
  }

  // Mercado
  let tMerc = 0;
  const lMerc = document.getElementById('listaMercado');
  lMerc.innerHTML = '';
  db.mercado
    .slice()
    .reverse()
    .forEach((g) => {
      tMerc += g.val;
      lMerc.innerHTML += `<li><span>${g.desc} <small>${g.data} (${
        g.quem
      })</small></span><b>R$ ${g.val.toFixed(
        2
      )}</b><button onclick="deletar('mercado',${g.id})">x</button></li>`;
    });

  // TIMELINE
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  const todosEventos = [...db.variavel, ...db.mercado, ...db.logsFixas].sort(
    (a, b) => b.id - a.id
  );
  todosEventos.forEach((ev) => {
    timeline.innerHTML += `
            <div class="timeline-item">
                <div class="time">${ev.data}</div>
                <div class="details"><strong>${
                  ev.desc
                }</strong> - R$ ${ev.val.toFixed(2)}<br><small>Por: ${
      ev.quem
    }</small></div>
            </div>`;
  });

  const minhaRendaB = usuarioLogado === 'Eu' ? sEu : sEla;
  document.getElementById('saldoBancarioHeader').innerText = `R$ ${(
    sEu +
    sEla -
    tVarGeral -
    tFixGeral
  ).toFixed(2)}`;
  document.getElementById('meuSaldoIndividual').innerText = `R$ ${(
    minhaRendaB -
    meuVar -
    meuFix
  ).toFixed(2)}`;
  document.getElementById('saldoVAHeader').innerText = `R$ ${(
    vaEu +
    vaEla -
    tMerc
  ).toFixed(2)}`;
}

document.addEventListener('DOMContentLoaded', () => {
  if (usuarioLogado) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appHeader').style.display = 'block';
    document.getElementById('appContent').style.display = 'block';
    const sufixo = usuarioLogado === 'Eu' ? 'eu' : 'ela';
    document.getElementById('minhaRendaBancaria').value =
      localStorage.getItem('s_' + sufixo) || '';
    document.getElementById('meuRendaVA').value =
      localStorage.getItem('va_' + sufixo) || '';
    atualizar();
  }
});

function limparTudo() {
  if (confirm('Resetar mês?')) {
    localStorage.clear();
    location.reload();
  }
}
