import {
  aoMudarUsuario, entrar, sair, recuperarSenha, getPerfil, getLojaPainel,
  getAgendamentosDoDia, mudarStatus, cancelarAgendamento, salvarServico,
  salvarProfissional, getOcupados, criarAgendamentoManual, salvarLoja, confirmarPagamento, liberarVencido, getClientes, getHistorico, getBloqueios, salvarPacote, getPacotesDoCliente, venderPacote, baixaPacote, concluirComPacote, resgatarFidelidade, criarBloqueio, removerBloqueio,
} from './data-painel.js';
import { h, brl, logo, aplicarTema } from './util.js';
import { dataISO, dataDeISO, paraMin, deMin, listarHorarios, semanaDe, PERIODOS } from './horarios.js';
import { PRAZOS_CANCELAMENTO, frasesDaPolitica } from './politica.js';
import { TIPOS_CHAVE, normalizarChave, gerarPix, valorDoPix, limparTexto } from './pix.js';
import { blocoPix } from './pix-ui.js';
import { blocoClientes } from './clientes-ui.js';
import { blocoCatalogoPacotes, criarExtras, pacoteUsavel } from './pacotes-ui.js';
import { prepararPwa, blocoInstalar } from './pwa.js';
import { blocoQrLoja } from './qr-ui.js';

const raiz = document.getElementById('app');

const estado = {
  tela: 'carregando', // carregando | login | semperfil | falha | agenda | servicos
  loja: null,
  // login
  email: '', senha: '', erroLogin: '', avisoLogin: '', entrando: false,
  // agenda
  dia: dataISO(new Date()), lista: null, erroAgenda: false, filtro: 'todos', confirmandoCancelar: null, motivoCancel: { tipo: '', texto: '' }, ocupadoId: null,
  avisoAgenda: '',
  // serviços e equipe
  editando: null, erroForm: '', salvando: false, equipeEdit: null,
  // novo agendamento feito pelo barbeiro
  novo: null,
  // ajustes da barbearia
  ajustes: null, avisoAjustes: '', ofertaPacote: null,
  // histórico
  hist: { lista: null, periodo: 'futuro', grupo: 'todos', erro: false },
  bloqueios: [], bloq: { aberto: false, prof: 'todos', inicio: '12:00', fim: '13:00', motivo: 'Almoço', erro: '', salvando: false },
};

const ROTULO_STATUS = {
  pendente: 'Pendente', aguardando_pagamento: 'Aguardando pagamento', vencido: 'Prazo vencido', expirado: 'Expirado', confirmado: 'Confirmado', concluido: 'Concluído', nao_compareceu: 'Faltou', cancelado: 'Cancelado',
};

/* ---------- peças ---------- */

function cabecalho() {
  return h('header', { class: 'cabecalho cabecalho-painel' },
    logo(estado.loja, 'pequeno'),
    h('div', { class: 'cabecalho-texto' },
      h('p', { class: 'cabecalho-nome' }, estado.loja.nome),
      h('p', { class: 'cabecalho-sub' }, 'Painel do barbeiro')),
    h('button', { type: 'button', class: 'btn-acao', onclick: () => sair() }, 'Sair'));
}

function abas() {
  const aba = (id, texto) => h('button', {
    type: 'button', class: 'aba', 'aria-current': estado.tela === id ? 'page' : null,
    onclick: () => { abrirAba(id); },
  }, texto);
  return h('nav', { class: 'abas', 'aria-label': 'Seções do painel' }, aba('agenda', 'Agenda'), aba('agendar', 'Agendar'), aba('servicos', 'Serviços'), aba('clientes', 'Clientes'), aba('historico', 'Histórico'), aba('equipe', 'Equipe'), aba('ajustes', 'Ajustes'));
}

function avisoDePrazo() {
  const v = estado.loja && estado.loja.validoAte;
  if (typeof v !== 'number') return null;
  const dias = Math.ceil((v - Date.now()) / 86400000);
  if (dias > 7) return null;
  return h('p', { class: 'aviso-prazo', role: 'status' },
    `Seu acesso vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}. Fale com o suporte para renovar e não perder o acesso.`);
}

function telaExpirado() {
  return h('section', { class: 'tela' },
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Acesso expirado'),
      h('p', { class: 'texto' }, 'O prazo de uso desta barbearia terminou ou foi suspenso. Nada foi apagado: fale com o suporte para renovar e voltar a usar.'),
      h('button', { type: 'button', class: 'botao botao-contorno', onclick: () => sair() }, 'Sair')));
}

function moldura(...conteudo) {
  return h('section', { class: 'tela' }, cabecalho(), h('div', { class: 'conteudo' }, avisoDePrazo(), conteudo), abas());
}

function diaPorExtenso(iso) {
  const texto = dataDeISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function somarDias(iso, n) {
  const d = dataDeISO(iso);
  d.setDate(d.getDate() + n);
  return dataISO(d);
}

/* ---------- login ---------- */

function mensagemDeErro(e) {
  const codigo = e && e.code ? e.code : '';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(codigo)) return 'E-mail ou senha incorretos.';
  if (codigo === 'auth/too-many-requests') return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  if (codigo === 'auth/network-request-failed') return 'Sem conexão com a internet.';
  return 'Não foi possível entrar agora. Tente de novo.';
}

function telaLogin() {
  const erro = h('p', { class: 'erro', role: 'alert' }, estado.erroLogin);
  const aviso = h('p', { class: 'aviso-ok', role: 'status' }, estado.avisoLogin);
  const campoEmail = h('input', {
    type: 'email', autocomplete: 'username', inputmode: 'email', value: estado.email,
    oninput: (e) => { estado.email = e.target.value; },
  });
  return h('section', { class: 'tela' },
    h('div', { class: 'conteudo login' },
      h('h1', { class: 'titulo' }, 'Painel do barbeiro'),
      h('p', { class: 'texto' }, 'Entre para ver e gerenciar a agenda.'),
      h('form', {
        class: 'form',
        onsubmit: async (ev) => {
          ev.preventDefault();
          if (estado.entrando) return;
          const email = estado.email.trim();
          if (!email || !estado.senha) { erro.textContent = 'Preencha e-mail e senha.'; return; }
          estado.entrando = true;
          estado.erroLogin = '';
          erro.textContent = '';
          aviso.textContent = '';
          try {
            await entrar(email, estado.senha);
          } catch (e) {
            estado.erroLogin = mensagemDeErro(e);
            estado.avisoLogin = '';
          }
          estado.entrando = false;
          estado.senha = '';
          if (estado.tela === 'login') render();
        },
      },
        h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'E-mail'), campoEmail),
        h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Senha'), h('input', {
          type: 'password', autocomplete: 'current-password', value: estado.senha,
          oninput: (e) => { estado.senha = e.target.value; },
        })),
        erro,
        aviso,
        h('button', { type: 'submit', class: 'botao', disabled: estado.entrando }, estado.entrando ? 'Entrando...' : 'Entrar')),
      h('button', {
        type: 'button', class: 'link',
        onclick: async () => {
          const email = estado.email.trim();
          if (!email) { erro.textContent = 'Digite seu e-mail acima para receber o link de nova senha.'; return; }
          try {
            await recuperarSenha(email);
          } catch { /* resposta igual para não revelar quais e-mails existem */ }
          estado.erroLogin = '';
          erro.textContent = '';
          aviso.textContent = 'Se este e-mail tiver cadastro, enviamos um link para criar uma nova senha.';
        },
      }, 'Esqueci minha senha')));
}

function telaSemPerfil() {
  return h('section', { class: 'tela' },
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Conta sem barbearia'),
      h('p', { class: 'texto' }, 'Seu login existe, mas ainda não está ligado a nenhuma barbearia. Peça para o suporte concluir o cadastro.'),
      h('button', { type: 'button', class: 'botao botao-contorno', onclick: () => sair() }, 'Sair')));
}

function telaFalha() {
  return h('section', { class: 'tela' },
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Sem conexão'),
      h('p', { class: 'texto' }, 'Não foi possível carregar o painel. Verifique a internet e tente de novo.'),
      h('button', { type: 'button', class: 'botao', onclick: () => location.reload() }, 'Tentar de novo'),
      h('button', { type: 'button', class: 'botao botao-contorno', onclick: () => sair() }, 'Sair')));
}

/* ---------- agenda ---------- */

function statusVisivel(ag) {
  return ag.status === 'aguardando_pagamento' && ag.pagarAte < Date.now() ? 'vencido' : ag.status;
}

function hora(ms) {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

async function confirmarPag(ag) {
  estado.ocupadoId = ag.id;
  estado.avisoAgenda = '';
  render();
  try {
    await confirmarPagamento(estado.loja.id, ag);
    ag.status = 'confirmado';
    ag.recemConfirmado = true;
    ag.pago = true;
    estado.avisoAgenda = `Pagamento de ${ag.cliente.nome} confirmado.`;
  } catch (e) {
    if (e && e.message === 'ocupado') estado.avisoAgenda = 'Esse horário já foi reservado por outro cliente. Combine outro horário com este cliente.';
    else estado.erroAgenda = true;
  }
  estado.ocupadoId = null;
  render();
}

async function liberar(ag) {
  estado.ocupadoId = ag.id;
  estado.avisoAgenda = '';
  render();
  try {
    await liberarVencido(estado.loja.id, ag);
    ag.status = 'expirado';
  } catch {
    estado.erroAgenda = true;
  }
  estado.ocupadoId = null;
  render();
}

// Mensagem de confirmação pronta no WhatsApp do cliente (o barbeiro só toca em enviar).
function linkConfirmacao(ag) {
  const quando = dataDeISO(ag.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const primeiro = ag.cliente.nome.split(' ')[0];
  const pago = ag.pago ? ' Recebemos o seu pagamento, obrigado!' : '';
  const texto = `Olá, ${primeiro}! Seu agendamento está CONFIRMADO: ${ag.servicoNome} com ${ag.profissionalNome}, ${quando} às ${ag.inicio}, na ${estado.loja.nome}.${pago} Te esperamos! Se precisar cancelar ou remarcar, é só avisar por aqui.`;
  return `https://wa.me/55${ag.cliente.whatsapp}?text=${encodeURIComponent(texto)}`;
}

function avisoConfirmacao(ag) {
  if (!ag.cliente.whatsapp) return null;
  return h('a', {
    class: ag.recemConfirmado ? 'btn-acao primario' : 'btn-acao', target: '_blank', rel: 'noopener', href: linkConfirmacao(ag),
    onclick: () => { ag.recemConfirmado = false; setTimeout(render, 300); },
  }, ag.recemConfirmado ? 'Enviar confirmação ao cliente' : 'Reenviar confirmação');
}

function acoesDoAgendamento(ag) {
  const ocupado = estado.ocupadoId === ag.id;
  const btn = (texto, aoClicar, primario) => h('button', {
    type: 'button', class: primario ? 'btn-acao primario' : 'btn-acao', disabled: ocupado, onclick: aoClicar,
  }, texto);
  const zap = ag.cliente.whatsapp
    ? h('a', { class: 'btn-acao', target: '_blank', rel: 'noopener', href: `https://wa.me/55${ag.cliente.whatsapp}` }, 'WhatsApp')
    : null;

  if (estado.confirmandoCancelar === ag.id) {
    const m = estado.motivoCancel;
    return h('div', { class: 'ag-acoes' },
      h('p', { class: 'ag-pergunta' }, 'Cancelar este agendamento? O horário fica livre. Escolha o motivo que o cliente vai receber na mensagem:'),
      h('div', { class: 'filtros', role: 'group', 'aria-label': 'Motivo do cancelamento' }, MOTIVOS.map((o) => h('button', {
        type: 'button', class: 'dia-filtro', 'aria-pressed': String(m.tipo === o.id),
        onclick: () => { m.tipo = o.id; render(); },
      }, o.rotulo))),
      m.tipo === 'outro' && h('input', {
        class: 'campo-livre', type: 'text', maxlength: '120', placeholder: 'Explique em poucas palavras', value: m.texto,
        'aria-label': 'Motivo do cancelamento', oninput: (e) => { m.texto = e.target.value; },
      }),
      btn('Sim, cancelar', () => aplicar(ag, 'cancelado'), true),
      btn('Não', () => { estado.confirmandoCancelar = null; render(); }));
  }
  const pedirCancelar = () => { estado.confirmandoCancelar = ag.id; estado.motivoCancel = { tipo: '', texto: '' }; render(); };
  if (ag.status === 'aguardando_pagamento') {
    return h('div', { class: 'ag-acoes' },
      btn('Confirmar pagamento', () => confirmarPag(ag), true), zap,
      ag.pagarAte < Date.now() ? btn('Liberar horário', () => liberar(ag)) : btn('Cancelar', pedirCancelar));
  }
  if (ag.status === 'expirado') {
    return h('div', { class: 'ag-acoes' }, btn('Confirmar pagamento', () => confirmarPag(ag), true), zap);
  }
  if (ag.status === 'pendente') {
    return h('div', { class: 'ag-acoes' }, btn('Confirmar', () => aplicar(ag, 'confirmado'), true), zap, btn('Cancelar', pedirCancelar));
  }
  if (ag.status === 'confirmado') {
    return h('div', { class: 'ag-acoes' },
      avisoConfirmacao(ag),
      btn('Concluir', () => aplicar(ag, 'concluido'), true), btn('Faltou', () => aplicar(ag, 'nao_compareceu')), zap, btn('Cancelar', pedirCancelar));
  }
  if (ag.status === 'cancelado' && ag.canceladoPor !== 'cliente') {
    return h('div', { class: 'ag-acoes' }, ag.cliente.whatsapp
      ? h('a', { class: 'btn-acao primario', target: '_blank', rel: 'noopener', href: linkCancelamento(ag) }, 'Avisar cliente no WhatsApp')
      : h('p', { class: 'ag-detalhe' }, 'Cliente sem WhatsApp cadastrado: não dá para avisar por aqui.'));
  }
  return h('div', { class: 'ag-acoes' }, zap);
}

const MOTIVOS = [
  { id: '', rotulo: 'Sem explicar', texto: '' },
  { id: 'imprevisto', rotulo: 'Imprevisto', texto: 'um imprevisto' },
  { id: 'saude', rotulo: 'Problema de saúde', texto: 'um problema de saúde' },
  { id: 'fechado', rotulo: 'Barbearia fechada', texto: 'a barbearia estará fechada nesse horário' },
  { id: 'outro', rotulo: 'Outro', texto: '' },
];

function motivoEscolhido() {
  const m = estado.motivoCancel;
  if (m.tipo === 'outro') return m.texto.trim().replace(/\s+/g, ' ');
  return (MOTIVOS.find((o) => o.id === m.tipo) || MOTIVOS[0]).texto;
}

// Mensagem pronta; o barbeiro só precisa tocar em enviar no WhatsApp.
function linkCancelamento(ag) {
  const quando = dataDeISO(ag.data).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const primeiroNome = ag.cliente.nome.split(' ')[0];
  const motivo = ag.motivoCancelamento ? ` Motivo: ${ag.motivoCancelamento}.` : '';
  const texto = `Olá, ${primeiroNome}! Infelizmente precisamos cancelar o seu agendamento de ${ag.servicoNome}, ${quando} às ${ag.inicio}, na ${estado.loja.nome}.${motivo} Pedimos desculpas pelo transtorno. Se quiser, é só remarcar: ${location.origin}/${estado.loja.id}`;
  return `https://wa.me/55${ag.cliente.whatsapp}?text=${encodeURIComponent(texto)}`;
}

async function aplicar(ag, status) {
  // Cliente com pacote válido para este serviço: oferece usar um uso do pacote em vez de cobrar.
  if (status === 'concluido' && estado.loja.recursos && estado.loja.recursos.pacotes && ag.cliente.whatsapp && !ag.decidiuPacote) {
    try {
      const p = (await getPacotesDoCliente(estado.loja.id, ag.cliente.whatsapp)).find((x) => pacoteUsavel(x, ag.servicoId));
      if (p) { estado.ofertaPacote = { ag, p }; render(); return; }
    } catch { /* sem pacote: segue o fluxo normal */ }
  }
  estado.ocupadoId = ag.id;
  estado.confirmandoCancelar = null;
  const motivo = status === 'cancelado' ? motivoEscolhido() : '';
  render();
  try {
    if (status === 'cancelado') {
      await cancelarAgendamento(estado.loja.id, ag, motivo);
      ag.motivoCancelamento = motivo;
      ag.canceladoPor = 'barbearia';
    } else await mudarStatus(estado.loja.id, ag.id, status, ag);
    ag.status = status;
    if (status === 'confirmado') ag.recemConfirmado = true;
  } catch {
    estado.erroAgenda = true;
  }
  estado.ocupadoId = null;
  render();
}

function ofertaDePacote() {
  const { ag, p } = estado.ofertaPacote;
  return h('div', { class: 'ag-acoes' },
    h('p', { class: 'ag-pergunta' }, `${ag.cliente.nome} tem o pacote "${p.nome}" (restam ${p.restante}). Usar um uso neste atendimento?`),
    h('button', {
      type: 'button', class: 'btn-acao primario',
      onclick: async () => {
        try { await concluirComPacote(estado.loja.id, ag, p.id); ag.status = 'concluido'; ag.pagoComPacote = true; estado.avisoAgenda = `Atendimento concluído com o pacote (restam ${p.restante - 1}).`; } catch { estado.erroAgenda = true; }
        estado.ofertaPacote = null; render();
      },
    }, 'Usar pacote'),
    h('button', { type: 'button', class: 'btn-acao', onclick: () => { ag.decidiuPacote = true; estado.ofertaPacote = null; aplicar(ag, 'concluido'); } }, 'Cobrar normal'),
    h('button', { type: 'button', class: 'btn-acao', onclick: () => { estado.ofertaPacote = null; render(); } }, 'Voltar'));
}

function cartaoAgendamento(ag) {
  const fim = deMin(paraMin(ag.inicio) + ag.minutos);
  const vis = statusVisivel(ag);
  const linhaPix = ag.status === 'aguardando_pagamento'
    ? h('p', { class: 'ag-detalhe' }, `Pix de ${brl.format(ag.valorPix || 0)} · ${vis === 'vencido' ? 'prazo venceu' : 'pagar'} às ${hora(ag.pagarAte)}`)
    : (ag.pago ? h('p', { class: 'ag-detalhe' }, 'Pix recebido') : null);
  return h('article', { class: `ag ag-${ag.status}` },
    h('div', { class: 'ag-topo' },
      h('div', { class: 'ag-hora' }, h('strong', {}, ag.inicio), h('span', {}, `até ${fim}`)),
      h('div', { class: 'ag-corpo' },
        h('p', { class: 'ag-cliente' }, ag.cliente.nome),
        h('p', { class: 'ag-detalhe' }, `${ag.servicoNome} · ${ag.profissionalNome} · ${brl.format(ag.preco)}`),
        linhaPix,
        h('span', { class: `chip chip-${vis}` }, ROTULO_STATUS[vis] || vis))),
    estado.ofertaPacote && estado.ofertaPacote.ag.id === ag.id ? ofertaDePacote() : acoesDoAgendamento(ag));
}

/* ---------- bloqueio de horários ---------- */

function opcoesHora() {
  const lista = [];
  for (let m = 6 * 60; m <= 23 * 60 + 30; m += 30) lista.push(deMin(m));
  return lista;
}

async function salvarBloqueio() {
  const b = estado.bloq;
  const { loja } = estado;
  const ativos = loja.profissionais.filter((p) => p.ativo !== false);
  const profs = b.prof === 'todos' ? ativos : ativos.filter((p) => p.id === b.prof);
  if (paraMin(b.fim) <= paraMin(b.inicio)) { b.erro = 'O fim precisa ser depois do início.'; render(); return; }
  if (!profs.length) { b.erro = 'Nenhum profissional ativo para bloquear.'; render(); return; }
  b.erro = '';
  b.salvando = true;
  render();
  try {
    await criarBloqueio(loja.id, { data: estado.dia, inicio: b.inicio, fim: b.fim, motivo: b.motivo.trim(), profissionais: profs });
    b.aberto = false;
    estado.avisoAgenda = `Horário bloqueado: ${b.inicio} às ${b.fim}.`;
    estado.bloqueios = await getBloqueios(loja.id, estado.dia);
  } catch (e) {
    b.erro = e && e.message === 'ocupado'
      ? 'Já existe cliente marcado nesse intervalo. Cancele ou remarque antes de bloquear.'
      : 'Não foi possível bloquear agora. Tente de novo.';
  }
  b.salvando = false;
  render();
}

async function desbloquear(bl) {
  try {
    await removerBloqueio(estado.loja.id, bl);
    estado.bloqueios = estado.bloqueios.filter((x) => x.id !== bl.id);
    estado.avisoAgenda = 'Horário liberado.';
  } catch {
    estado.erroAgenda = true;
  }
  render();
}

function blocoBloqueios() {
  const b = estado.bloq;
  const { loja } = estado;
  const profs = loja.profissionais.filter((p) => p.ativo !== false);
  const horas = opcoesHora();
  const diaInteiro = () => {
    const periodos = semanaDe(loja.horario)[dataDeISO(estado.dia).getDay()];
    if (!periodos.length) { b.erro = 'A barbearia não abre neste dia da semana.'; render(); return; }
    b.inicio = periodos.map((p) => p.abre).sort()[0];
    b.fim = periodos.map((p) => p.fecha).sort().reverse()[0];
    b.motivo = 'Folga';
    b.erro = '';
    render();
  };
  const seletor = (rotulo, valor, opcoes, aoMudar) => h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo),
    h('select', { onchange: (ev) => aoMudar(ev.target.value) }, opcoes.map((o) => h('option', { value: o.v, selected: o.v === valor }, o.t))));
  return h('div', { class: 'bloqueios' },
    estado.bloqueios.map((bl) => h('div', { class: 'bloqueio-linha' },
      h('span', { class: 'ag-detalhe' }, `${bl.inicio}–${bl.fim} · ${bl.motivo || 'Bloqueado'} · ${bl.profissionalNome}`),
      h('button', { type: 'button', class: 'btn-acao', onclick: () => desbloquear(bl) }, 'Liberar'))),
    !b.aberto
      ? h('button', { type: 'button', class: 'btn-acao', onclick: () => { b.aberto = true; b.erro = ''; render(); } }, 'Bloquear horário')
      : h('div', { class: 'cartao-ajuste' },
        h('h2', { class: 'subtitulo' }, `Bloquear em ${diaPorExtenso(estado.dia)}`),
        h('div', { class: 'filtros', role: 'group', 'aria-label': 'Motivo' }, ['Almoço', 'Folga', 'Compromisso', 'Outro'].map((m) => h('button', {
          type: 'button', class: 'dia-filtro', 'aria-pressed': String(b.motivo === m), onclick: () => { b.motivo = m; render(); },
        }, m))),
        profs.length > 1 && seletor('Quem', b.prof, [{ v: 'todos', t: 'Todos os profissionais' }, ...profs.map((p) => ({ v: p.id, t: p.nome }))], (v) => { b.prof = v; }),
        h('div', { class: 'duas-colunas' },
          seletor('Das', b.inicio, horas.map((x) => ({ v: x, t: x })), (v) => { b.inicio = v; }),
          seletor('Até', b.fim, horas.map((x) => ({ v: x, t: x })), (v) => { b.fim = v; })),
        h('button', { type: 'button', class: 'link', onclick: diaInteiro }, 'Bloquear o dia inteiro'),
        b.erro && h('p', { class: 'erro', role: 'alert' }, b.erro),
        h('div', { class: 'ag-acoes' },
          h('button', { type: 'button', class: 'btn-acao primario', disabled: b.salvando, onclick: salvarBloqueio }, b.salvando ? 'Bloqueando...' : 'Bloquear'),
          h('button', { type: 'button', class: 'btn-acao', onclick: () => { b.aberto = false; render(); } }, 'Cancelar'))));
}

function telaAgenda() {
  const { loja } = estado;
  const ehHoje = estado.dia === dataISO(new Date());
  const filtros = loja.profissionais.filter((p) => p.ativo !== false);
  const lista = (estado.lista || []).filter((a) => estado.filtro === 'todos' || a.profissionalId === estado.filtro);
  const validos = lista.filter((a) => a.status !== 'cancelado' && a.status !== 'expirado' && statusVisivel(a) !== 'vencido');
  const previsto = validos.filter((a) => a.status !== 'nao_compareceu').reduce((s, a) => s + (a.preco || 0), 0);

  let corpo;
  if (estado.erroAgenda) {
    corpo = h('div', { class: 'vazio' },
      h('p', { class: 'texto' }, 'Algo deu errado ao carregar ou salvar. Tente de novo.'),
      h('button', { type: 'button', class: 'btn-acao primario', onclick: () => carregarDia(estado.dia) }, 'Recarregar'));
  } else if (!estado.lista) {
    corpo = h('p', { class: 'texto', 'aria-live': 'polite' }, 'Carregando agenda...');
  } else if (!lista.length) {
    corpo = h('div', { class: 'vazio' }, h('p', { class: 'texto' }, 'Nenhum agendamento neste dia.'));
  } else {
    corpo = h('div', { class: 'lista' }, lista.map(cartaoAgendamento));
  }

  return moldura(
    h('div', { class: 'dia-nav' },
      h('button', { type: 'button', class: 'btn-icone', 'aria-label': 'Dia anterior', onclick: () => carregarDia(somarDias(estado.dia, -1)) }, '‹'),
      h('div', { class: 'dia-nav-texto' },
        h('h1', { class: 'titulo titulo-menor' }, diaPorExtenso(estado.dia)),
        !ehHoje && h('button', { type: 'button', class: 'link', onclick: () => carregarDia(dataISO(new Date())) }, 'Voltar para hoje')),
      h('button', { type: 'button', class: 'btn-icone', 'aria-label': 'Próximo dia', onclick: () => carregarDia(somarDias(estado.dia, 1)) }, '›')),
    filtros.length > 1 && h('div', { class: 'filtros', role: 'group', 'aria-label': 'Filtrar por profissional' },
      [{ id: 'todos', nome: 'Todos' }, ...filtros].map((p) => h('button', {
        type: 'button', class: 'dia-filtro', 'aria-pressed': String(estado.filtro === p.id),
        onclick: () => { estado.filtro = p.id; render(); },
      }, p.nome))),
    estado.avisoAgenda && h('p', { class: 'aviso-ok', role: 'status' }, estado.avisoAgenda),
    blocoBloqueios(),
    estado.lista && h('p', { class: 'resumo-dia' }, `${validos.length} ${validos.length === 1 ? 'agendamento' : 'agendamentos'} · previsto ${brl.format(previsto)}`),
    corpo);
}

async function carregarDia(iso) {
  estado.dia = iso;
  estado.avisoAgenda = '';
  estado.lista = null;
  estado.bloqueios = [];
  estado.erroAgenda = false;
  estado.confirmandoCancelar = null;
  render();
  try {
    const lista = await getAgendamentosDoDia(estado.loja.id, iso);
    if (estado.dia !== iso) return;
    estado.lista = lista;
    getBloqueios(estado.loja.id, iso).then((b) => { if (estado.dia === iso) { estado.bloqueios = b; if (estado.tela === 'agenda') render(); } }).catch(() => {});
  } catch {
    if (estado.dia !== iso) return;
    estado.erroAgenda = true;
  }
  render();
}

/* ---------- histórico ---------- */

const PERIODOS_HIST = [
  { id: 'futuro', rotulo: 'De hoje em diante' }, { id: '30', rotulo: 'Últimos 30 dias' },
  { id: 'mes', rotulo: 'Este mês' }, { id: '90', rotulo: 'Últimos 90 dias' }, { id: 'tudo', rotulo: 'Tudo' },
];
const GRUPOS_HIST = [
  { id: 'todos', rotulo: 'Todos', ok: () => true },
  { id: 'abertos', rotulo: 'A confirmar', ok: (s) => ['pendente', 'aguardando_pagamento', 'vencido'].includes(s) },
  { id: 'confirmado', rotulo: 'Confirmados', ok: (s) => s === 'confirmado' },
  { id: 'concluido', rotulo: 'Concluídos', ok: (s) => s === 'concluido' },
  { id: 'perdidos', rotulo: 'Cancelados e faltas', ok: (s) => ['cancelado', 'nao_compareceu', 'expirado'].includes(s) },
];

async function carregarHistorico() {
  const h2 = estado.hist;
  h2.lista = null;
  h2.erro = false;
  const hoje = new Date();
  const de = h2.periodo === 'futuro' ? dataISO(hoje) : h2.periodo === 'tudo' ? null
    : h2.periodo === 'mes' ? dataISO(new Date(hoje.getFullYear(), hoje.getMonth(), 1))
      : dataISO(new Date(hoje.getTime() - Number(h2.periodo) * 86400000));
  const ate = h2.periodo === '30' || h2.periodo === '90' ? dataISO(hoje)
    : h2.periodo === 'mes' ? dataISO(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)) : null;
  render();
  const chave = `${h2.periodo}`;
  try {
    const lista = await getHistorico(estado.loja.id, de, ate);
    if (estado.hist.periodo !== h2.periodo || chave !== `${estado.hist.periodo}`) return;
    h2.lista = lista;
  } catch {
    h2.erro = true;
  }
  if (estado.tela === 'historico') render();
}

// Números do período: dinheiro só conta atendimento concluído; o resto é previsão.
function resumoDe(lista) {
  const soma = (a) => a.reduce((s, x) => s + (x.pagoComPacote ? 0 : (x.preco || 0)), 0);
  const concl = lista.filter((a) => a.status === 'concluido');
  const aReceber = lista.filter((a) => ['confirmado', 'pendente', 'aguardando_pagamento'].includes(statusVisivel(a)));
  const porProf = new Map();
  concl.forEach((a) => {
    const x = porProf.get(a.profissionalNome) || { n: 0, valor: 0 };
    x.n += 1; x.valor += a.preco || 0; porProf.set(a.profissionalNome, x);
  });
  return {
    faturado: soma(concl), atendimentos: concl.length, ticket: concl.length ? soma(concl) / concl.length : 0,
    aReceber: soma(aReceber), marcados: aReceber.length,
    faltas: lista.filter((a) => a.status === 'nao_compareceu').length,
    cancelados: lista.filter((a) => ['cancelado', 'expirado'].includes(a.status)).length,
    porProf: [...porProf.entries()].sort((a, b) => b[1].valor - a[1].valor),
  };
}

function cartaoResumo(lista) {
  const r = resumoDe(lista);
  const tile = (rotulo, valor) => h('div', { class: 'resumo-item' }, h('span', { class: 'resumo-valor' }, valor), h('span', { class: 'resumo-rotulo' }, rotulo));
  return h('div', { class: 'resumo' },
    h('div', { class: 'resumo-grade' },
      tile('Faturado (concluídos)', brl.format(r.faturado)),
      tile('Atendimentos', String(r.atendimentos)),
      tile('Ticket médio', brl.format(r.ticket)),
      tile(`A receber (${r.marcados} marcados)`, brl.format(r.aReceber)),
      tile('Faltas', String(r.faltas)),
      tile('Cancelados', String(r.cancelados))),
    r.porProf.length > 1 && h('div', { class: 'resumo-prof' }, r.porProf.map(([nome, x]) => h('p', { class: 'ag-detalhe' }, `${nome}: ${x.n} ${x.n === 1 ? 'atendimento' : 'atendimentos'} · ${brl.format(x.valor)}`))));
}

function telaHistorico() {
  const hs = estado.hist;
  const grupo = GRUPOS_HIST.find((g) => g.id === hs.grupo);
  let corpo;
  if (hs.erro) {
    corpo = h('div', { class: 'vazio' }, h('p', { class: 'texto' }, 'Não foi possível carregar o histórico.'),
      h('button', { type: 'button', class: 'btn-acao primario', onclick: carregarHistorico }, 'Tentar de novo'));
  } else if (!hs.lista) {
    corpo = h('p', { class: 'texto', 'aria-live': 'polite' }, 'Carregando histórico...');
  } else {
    const visiveis = hs.lista.filter((a) => grupo.ok(statusVisivel(a)));
    const contar = (g) => hs.lista.filter((a) => g.ok(statusVisivel(a))).length;
    const dias = [...new Set(visiveis.map((a) => a.data))].sort();
    if (hs.periodo !== 'futuro') dias.reverse();
    corpo = h('div', { class: 'historico' },
      cartaoResumo(hs.lista),
      h('div', { class: 'filtros', role: 'group', 'aria-label': 'Filtrar por situação' }, GRUPOS_HIST.map((g) => h('button', {
        type: 'button', class: 'dia-filtro', 'aria-pressed': String(hs.grupo === g.id),
        onclick: () => { hs.grupo = g.id; render(); },
      }, `${g.rotulo} (${contar(g)})`))),
      !visiveis.length ? h('div', { class: 'vazio' }, h('p', { class: 'texto' }, 'Nenhum agendamento neste filtro.'))
        : dias.map((dia) => h('div', { class: 'historico-dia' },
          h('h2', { class: 'subtitulo' }, diaPorExtenso(dia)),
          h('div', { class: 'lista' }, visiveis.filter((a) => a.data === dia).sort((x, y) => x.inicio.localeCompare(y.inicio)).map(cartaoAgendamento)))));
  }
  return moldura(
    h('h1', { class: 'titulo' }, 'Histórico'),
    h('div', { class: 'filtros', role: 'group', 'aria-label': 'Período' }, PERIODOS_HIST.map((p) => h('button', {
      type: 'button', class: 'dia-filtro', 'aria-pressed': String(hs.periodo === p.id),
      onclick: () => { hs.periodo = p.id; carregarHistorico(); },
    }, p.rotulo))),
    estado.avisoAgenda && h('p', { class: 'aviso-ok', role: 'status' }, estado.avisoAgenda),
    corpo);
}

/* ---------- serviços ---------- */

const DURACOES = [15, 30, 45, 60, 90, 120];

function lerPreco(texto) {
  const n = Number(String(texto).replace(/[^\d,.]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 && n <= 10000 ? Math.round(n * 100) / 100 : null;
}

function gerarId(nome, existentes) {
  const base = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'servico';
  let id = base;
  let i = 2;
  while (existentes.has(id)) id = `${base}-${i++}`;
  return id;
}

async function gravarServico(servico) {
  estado.salvando = true;
  render();
  try {
    await salvarServico(estado.loja.id, servico);
    const i = estado.loja.servicos.findIndex((s) => s.id === servico.id);
    if (i >= 0) estado.loja.servicos[i] = { ...estado.loja.servicos[i], ...servico };
    else estado.loja.servicos.push(servico);
    estado.editando = null;
    estado.erroForm = '';
  } catch {
    estado.erroForm = 'Não foi possível salvar agora. Tente de novo.';
  }
  estado.salvando = false;
  render();
}

function formServico() {
  const e = estado.editando;
  const erro = h('p', { class: 'erro', role: 'alert' }, estado.erroForm);
  const select = h('select', { onchange: (ev) => { e.minutos = Number(ev.target.value); } },
    DURACOES.map((m) => h('option', { value: m, selected: m === e.minutos }, `${m} min`)));
  return moldura(
    h('h1', { class: 'titulo' }, e.id ? 'Editar serviço' : 'Novo serviço'),
    h('form', {
      class: 'form',
      onsubmit: (ev) => {
        ev.preventDefault();
        const nome = e.nome.trim().replace(/\s+/g, ' ');
        const preco = lerPreco(e.preco);
        if (nome.length < 2) { erro.textContent = 'Digite o nome do serviço.'; return; }
        if (preco == null) { erro.textContent = 'Digite um preço válido, por exemplo 45 ou 45,50.'; return; }
        const servicos = estado.loja.servicos;
        const id = e.id || gerarId(nome, new Set(servicos.map((s) => s.id)));
        const ordem = e.id ? e.ordem : Math.max(-1, ...servicos.map((s) => s.ordem ?? 0)) + 1;
        gravarServico({ id, nome, minutos: e.minutos, preco, ativo: e.ativo, ordem });
      },
    },
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome do serviço'),
        h('input', { type: 'text', maxlength: '40', value: e.nome, oninput: (ev) => { e.nome = ev.target.value; } })),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Duração'), select,
        h('span', { class: 'campo-ajuda' }, 'A agenda trabalha em blocos de 30 minutos: 45 min ocupa 60.')),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Preço (R$)'),
        h('input', { type: 'text', inputmode: 'decimal', placeholder: '45,00', value: e.preco, oninput: (ev) => { e.preco = ev.target.value; } })),
      erro,
      h('button', { type: 'submit', class: 'botao', disabled: estado.salvando }, estado.salvando ? 'Salvando...' : 'Salvar'),
      h('button', { type: 'button', class: 'botao botao-contorno', onclick: () => { estado.editando = null; estado.erroForm = ''; render(); } }, 'Cancelar')));
}

function cartaoServico(s) {
  const ativo = s.ativo !== false;
  return h('article', { class: 'ag' },
    h('div', { class: 'ag-topo' },
      h('div', { class: 'ag-corpo' },
        h('p', { class: 'ag-cliente' }, s.nome),
        h('p', { class: 'ag-detalhe' }, `${s.minutos} min · ${brl.format(s.preco)}`),
        h('span', { class: `chip ${ativo ? 'chip-confirmado' : 'chip-cancelado'}` }, ativo ? 'Ativo na agenda' : 'Desativado'))),
    h('div', { class: 'ag-acoes' },
      h('button', {
        type: 'button', class: 'btn-acao primario',
        onclick: () => { estado.editando = { id: s.id, nome: s.nome, minutos: s.minutos, preco: String(s.preco).replace('.', ','), ativo, ordem: s.ordem ?? 0 }; estado.erroForm = ''; render(); window.scrollTo(0, 0); },
      }, 'Editar'),
      h('button', {
        type: 'button', class: 'btn-acao',
        onclick: () => gravarServico({ id: s.id, ativo: !ativo }),
      }, ativo ? 'Desativar' : 'Ativar')));
}

function telaServicos() {
  if (estado.editando) return formServico();
  const { servicos } = estado.loja;
  return moldura(
    h('h1', { class: 'titulo' }, 'Serviços e preços'),
    h('p', { class: 'texto' }, 'Mudanças valem na hora para novos agendamentos. Agendamentos já feitos mantêm o preço combinado.'),
    h('button', {
      type: 'button', class: 'botao',
      onclick: () => { estado.editando = { id: null, nome: '', minutos: 30, preco: '', ativo: true, ordem: 0 }; estado.erroForm = ''; render(); },
    }, 'Novo serviço'),
    servicos.length
      ? h('div', { class: 'lista' }, servicos.map(cartaoServico))
      : h('p', { class: 'texto' }, 'Nenhum serviço cadastrado ainda.'),
    estado.loja.recursos && estado.loja.recursos.pacotes && blocoCatalogoPacotes({
      loja: estado.loja, aoMudar: render,
      salvar: async (p) => {
        await salvarPacote(estado.loja.id, p);
        const lista = estado.loja.pacotes || [];
        const i = lista.findIndex((x) => x.id === p.id);
        estado.loja.pacotes = i >= 0 ? lista.map((x) => (x.id === p.id ? p : x)) : [...lista, p];
      },
    }));
}

/* ---------- agendar pelo painel ---------- */

function abrirAba(id) {
  estado.tela = id;
  estado.editando = null;
  estado.equipeEdit = null;
  estado.erroForm = '';
  if (id === 'agendar') iniciarNovo();
  if (id === 'ajustes') iniciarAjustes();
  if (id === 'clientes') carregarClientes();
  if (id === 'historico') carregarHistorico();
  render();
  window.scrollTo(0, 0);
}

async function carregarClientes() {
  estado.clientes = null;
  try {
    estado.clientes = await getClientes(estado.loja.id);
  } catch {
    estado.clientes = [];
  }
  if (estado.tela === 'clientes') render();
}

let extrasCache = null;
function extrasClientes() {
  if (!extrasCache || extrasCache.loja !== estado.loja) {
    extrasCache = { loja: estado.loja, fn: criarExtras({ loja: estado.loja, aoMudar: () => render(), api: { getPacotesDoCliente, venderPacote, baixaPacote, resgatarFidelidade } }) };
  }
  return extrasCache.fn;
}

function telaClientes() {
  return moldura(
    h('h1', { class: 'titulo' }, 'Clientes'),
    blocoClientes({ loja: estado.loja, lista: estado.clientes, aoMudar: render, extras: extrasClientes() }));
}

function iniciarNovo() {
  const servicos = estado.loja.servicos.filter((s) => s.ativo !== false);
  const profs = estado.loja.profissionais.filter((p) => p.ativo !== false);
  estado.novo = {
    servicoId: servicos[0]?.id ?? null, profId: profs[0]?.id ?? null, data: dataISO(new Date()),
    hora: null, ocupados: null, erroHorarios: false, nome: '', whats: '', salvando: false,
  };
  if (servicos.length && profs.length) carregarOcupadosNovo();
}

async function carregarOcupadosNovo() {
  const n = estado.novo;
  const iso = n.data;
  n.ocupados = null;
  n.erroHorarios = false;
  try {
    const ocupados = await getOcupados(estado.loja.id, iso);
    if (estado.novo !== n || n.data !== iso) return;
    n.ocupados = ocupados;
  } catch {
    if (estado.novo !== n || n.data !== iso) return;
    n.erroHorarios = true;
  }
  if (estado.tela === 'agendar') render();
}

function telefoneOpcional(texto) {
  const n = texto.replace(/\D/g, '');
  if (!n) return '';
  return n.length === 10 || n.length === 11 ? n : null;
}

function telaAgendar() {
  const { loja } = estado;
  const servicos = loja.servicos.filter((s) => s.ativo !== false);
  const profs = loja.profissionais.filter((p) => p.ativo !== false);
  if (!servicos.length || !profs.length) {
    return moldura(
      h('h1', { class: 'titulo' }, 'Agendar cliente'),
      h('p', { class: 'texto' }, 'Cadastre pelo menos um serviço ativo e um profissional ativo antes de agendar.'));
  }
  const n = estado.novo;
  const servico = servicos.find((s) => s.id === n.servicoId) ?? servicos[0];
  const prof = profs.find((p) => p.id === n.profId) ?? profs[0];
  const erro = h('p', { class: 'erro', role: 'alert' }, estado.erroForm);
  const abre = semanaDe(loja.horario)[dataDeISO(n.data).getDay()].length > 0;

  let horarios;
  if (!abre) {
    horarios = h('p', { class: 'texto' }, 'A barbearia não abre neste dia da semana.');
  } else if (n.erroHorarios) {
    horarios = h('p', { class: 'texto' }, 'Não foi possível carregar os horários. Troque o dia e tente de novo.');
  } else if (!n.ocupados) {
    horarios = h('p', { class: 'texto', 'aria-live': 'polite' }, 'Carregando horários...');
  } else {
    // Sem esconder horários já passados de hoje: o barbeiro também registra quem acabou de chegar.
    const lista = listarHorarios({
      horario: loja.horario, data: n.data, minutos: servico.minutos, profId: prof.id, ocupados: n.ocupados, agora: new Date(0),
    });
    horarios = h('div', { class: 'horarios', role: 'group', 'aria-label': 'Horários' }, lista.map((x) => h('button', {
      type: 'button', class: 'horario', disabled: !x.livre, 'aria-pressed': String(x.min === n.hora),
      onclick: () => { n.hora = x.min; render(); },
    }, x.hora)));
  }

  const selecao = (rotulo, itens, atual, aoMudar) => h('label', { class: 'campo' },
    h('span', { class: 'campo-rotulo' }, rotulo),
    h('select', { onchange: (ev) => { aoMudar(ev.target.value); n.hora = null; render(); } },
      itens.map((i) => h('option', { value: i.id, selected: i.id === atual }, i.rotulo))));

  return moldura(
    h('h1', { class: 'titulo' }, 'Agendar cliente'),
    h('p', { class: 'texto' }, 'Para quem ligou ou chegou no balcão. O agendamento já fica confirmado.'),
    h('form', {
      class: 'form',
      onsubmit: async (ev) => {
        ev.preventDefault();
        if (n.salvando) return;
        const nome = n.nome.trim().replace(/\s+/g, ' ');
        const whatsapp = telefoneOpcional(n.whats);
        if (n.hora == null) { erro.textContent = 'Escolha um horário.'; return; }
        if (nome.length < 2) { erro.textContent = 'Digite o nome do cliente.'; return; }
        if (whatsapp === null) { erro.textContent = 'WhatsApp inválido. Use DDD + número, ou deixe em branco.'; return; }
        n.salvando = true;
        estado.erroForm = '';
        render();
        try {
          await criarAgendamentoManual(loja.id, {
            profissionalId: prof.id, profissionalNome: prof.nome,
            servico: { id: servico.id, nome: servico.nome, minutos: servico.minutos, preco: servico.preco },
            data: n.data, inicio: deMin(n.hora), cliente: { nome, whatsapp },
          });
          estado.tela = 'agenda';
          estado.novo = null;
          carregarDia(n.data);
          estado.avisoAgenda = `Agendado: ${nome} às ${deMin(n.hora)}.`;
          render();
        } catch (e) {
          n.salvando = false;
          if (e && e.message === 'ocupado') {
            estado.erroForm = 'Esse horário acabou de ser ocupado. Escolha outro.';
            n.hora = null;
            carregarOcupadosNovo();
          } else {
            estado.erroForm = 'Não foi possível agendar agora. Tente de novo.';
          }
          render();
        }
      },
    },
      selecao('Serviço', servicos.map((s) => ({ id: s.id, rotulo: `${s.nome} · ${s.minutos} min · ${brl.format(s.preco)}` })), servico.id, (v) => { n.servicoId = v; }),
      selecao('Profissional', profs.map((p) => ({ id: p.id, rotulo: p.nome })), prof.id, (v) => { n.profId = v; }),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Dia'),
        h('input', {
          type: 'date', value: n.data, min: dataISO(new Date()),
          onchange: (ev) => { if (!ev.target.value) return; n.data = ev.target.value; n.hora = null; render(); carregarOcupadosNovo(); },
        })),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Horário'), horarios),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome do cliente'),
        h('input', { type: 'text', maxlength: '60', value: n.nome, oninput: (ev) => { n.nome = ev.target.value; } })),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'WhatsApp com DDD (opcional)'),
        h('input', { type: 'tel', inputmode: 'tel', maxlength: '20', placeholder: '(11) 91234-5678', value: n.whats, oninput: (ev) => { n.whats = ev.target.value; } }),
        h('span', { class: 'campo-ajuda' }, 'Sem WhatsApp, o cliente não poderá ser avisado nem entrar na fidelidade.')),
      erro,
      h('button', { type: 'submit', class: 'botao', disabled: n.salvando }, n.salvando ? 'Agendando...' : 'Agendar')));
}

/* ---------- equipe ---------- */

async function gravarProfissional(prof) {
  estado.salvando = true;
  render();
  try {
    await salvarProfissional(estado.loja.id, prof);
    const lista = estado.loja.profissionais;
    const i = lista.findIndex((p) => p.id === prof.id);
    if (i >= 0) lista[i] = { ...lista[i], ...prof };
    else lista.push(prof);
    estado.equipeEdit = null;
    estado.erroForm = '';
  } catch {
    estado.erroForm = 'Não foi possível salvar agora. Tente de novo.';
  }
  estado.salvando = false;
  render();
}

function formEquipe() {
  const e = estado.equipeEdit;
  const erro = h('p', { class: 'erro', role: 'alert' }, estado.erroForm);
  return moldura(
    h('h1', { class: 'titulo' }, e.id ? 'Editar profissional' : 'Novo profissional'),
    h('form', {
      class: 'form',
      onsubmit: (ev) => {
        ev.preventDefault();
        const nome = e.nome.trim().replace(/\s+/g, ' ');
        if (nome.length < 2) { erro.textContent = 'Digite o nome do profissional.'; return; }
        const lista = estado.loja.profissionais;
        const id = e.id || gerarId(nome, new Set(lista.map((p) => p.id)));
        const ordem = e.id ? e.ordem : Math.max(-1, ...lista.map((p) => p.ordem ?? 0)) + 1;
        gravarProfissional({ id, nome, ativo: e.ativo, ordem });
      },
    },
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Nome'),
        h('input', { type: 'text', maxlength: '40', value: e.nome, oninput: (ev) => { e.nome = ev.target.value; } })),
      erro,
      h('button', { type: 'submit', class: 'botao', disabled: estado.salvando }, estado.salvando ? 'Salvando...' : 'Salvar'),
      h('button', { type: 'button', class: 'botao botao-contorno', onclick: () => { estado.equipeEdit = null; estado.erroForm = ''; render(); } }, 'Cancelar')));
}

function telaEquipe() {
  if (estado.equipeEdit) return formEquipe();
  const lista = estado.loja.profissionais;
  return moldura(
    h('h1', { class: 'titulo' }, 'Equipe'),
    h('p', { class: 'texto' }, 'Quem aparece para os clientes escolherem. Desativar tira da agenda, mas mantém o histórico.'),
    h('button', {
      type: 'button', class: 'botao',
      onclick: () => { estado.equipeEdit = { id: null, nome: '', ativo: true, ordem: 0 }; estado.erroForm = ''; render(); },
    }, 'Novo profissional'),
    lista.length
      ? h('div', { class: 'lista' }, lista.map((p) => {
        const ativo = p.ativo !== false;
        return h('article', { class: 'ag' },
          h('div', { class: 'ag-topo' },
            h('div', { class: 'ag-corpo' },
              h('p', { class: 'ag-cliente' }, p.nome),
              h('span', { class: `chip ${ativo ? 'chip-confirmado' : 'chip-cancelado'}` }, ativo ? 'Ativo na agenda' : 'Desativado'))),
          h('div', { class: 'ag-acoes' },
            h('button', {
              type: 'button', class: 'btn-acao primario',
              onclick: () => { estado.equipeEdit = { id: p.id, nome: p.nome, ativo, ordem: p.ordem ?? 0 }; estado.erroForm = ''; render(); window.scrollTo(0, 0); },
            }, 'Renomear'),
            h('button', { type: 'button', class: 'btn-acao', onclick: () => gravarProfissional({ id: p.id, ativo: !ativo }) }, ativo ? 'Desativar' : 'Ativar')));
      }))
      : h('p', { class: 'texto' }, 'Nenhum profissional cadastrado ainda.'));
}

/* ---------- ajustes da barbearia ---------- */

const NOME_DIA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

function horaCurta(hhmm) {
  const [hh, mm] = hhmm.split(':').map(Number);
  return mm ? `${hh}h${String(mm).padStart(2, '0')}` : `${hh}h`;
}

// Texto sob o nome da barbearia. Dias seguidos com o mesmo horário viram um grupo:
// "Seg a Sex 9h–12h e 14h–19h · Sáb 9h–14h".
function textoFuncionamento(semana) {
  const grupos = [];
  for (const d of ORDEM_DIAS) {
    const periodos = semana[d];
    if (!periodos.length) continue;
    const chave = periodos.map((p) => `${p.abre}-${p.fecha}`).join('|');
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === chave && ORDEM_DIAS.indexOf(d) === ORDEM_DIAS.indexOf(ultimo.dias[ultimo.dias.length - 1]) + 1) ultimo.dias.push(d);
    else grupos.push({ chave, dias: [d], periodos });
  }
  if (!grupos.length) return 'Fechado';
  return grupos.map((g) => {
    const dias = g.dias.length >= 3 ? `${NOME_DIA[g.dias[0]]} a ${NOME_DIA[g.dias[g.dias.length - 1]]}` : g.dias.map((d) => NOME_DIA[d]).join(' e ');
    return `${dias} ${g.periodos.map((p) => `${horaCurta(p.abre)}–${horaCurta(p.fecha)}`).join(' e ')}`;
  }).join(' · ');
}

function iniciarAjustes() {
  const { loja } = estado;
  const semana = semanaDe(loja.horario);
  estado.ajustes = {
    semana,
    dia: ORDEM_DIAS.find((d) => semana[d].length) ?? 1,
    whats: String(loja.whatsapp || '').replace(/^55/, ''),
    cancelaHoras: Number(loja.politica?.cancelaHoras) || 0,
    nota: loja.politica?.nota || '',
    pix: {
      ativo: Boolean(loja.pix?.ativo), tipoChave: loja.pix?.tipoChave || 'celular', chave: loja.pix?.chave || '',
      nome: loja.pix?.nome || '', cidade: loja.pix?.cidade || '', modo: loja.pix?.modo || 'sinal',
      percentual: Number(loja.pix?.percentual) || 30, prazoMin: Number(loja.pix?.prazoMin) || 30,
    },
    testePix: false,
    fid: { ativo: Boolean(loja.fidelidade?.ativo), meta: Number(loja.fidelidade?.meta) || 10, premio: loja.fidelidade?.premio || '' },
  };
  estado.erroForm = '';
  estado.avisoAjustes = '';
}

function validarSemana(semana) {
  for (const d of ORDEM_DIAS) {
    const lista = [...semana[d]].sort((x, y) => paraMin(x.abre) - paraMin(y.abre));
    for (let i = 0; i < lista.length; i++) {
      const p = lista[i];
      if (!p.abre || !p.fecha || paraMin(p.abre) >= paraMin(p.fecha)) return `${NOME_DIA[d]}: em cada período, a abertura precisa ser antes do fechamento.`;
      if (i > 0 && paraMin(p.abre) < paraMin(lista[i - 1].fecha)) return `${NOME_DIA[d]}: os períodos não podem se sobrepor.`;
    }
  }
  if (!ORDEM_DIAS.some((d) => semana[d].length)) return 'Deixe pelo menos um período aberto em algum dia.';
  return '';
}

function blocoPeriodo(a, modelo) {
  const lista = a.semana[a.dia];
  const atual = lista.find((p) => p.id === modelo.id);
  const ordenar = () => lista.sort((x, y) => PERIODOS.findIndex((m) => m.id === x.id) - PERIODOS.findIndex((m) => m.id === y.id));
  return h('div', { class: 'periodo' },
    h('div', { class: 'periodo-topo' },
      h('span', { class: 'periodo-nome' }, modelo.nome),
      h('button', {
        type: 'button', class: 'interruptor', 'aria-pressed': String(Boolean(atual)), 'aria-label': `${modelo.nome}: ${atual ? 'aberto' : 'fechado'}`,
        onclick: () => {
          if (atual) lista.splice(lista.indexOf(atual), 1);
          else { lista.push({ id: modelo.id, abre: modelo.abre, fecha: modelo.fecha }); ordenar(); }
          estado.avisoAjustes = '';
          render();
        },
      }, atual ? 'Aberto' : 'Fechado')),
    atual && h('div', { class: 'duas-colunas' },
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Abre às'),
        h('input', { type: 'time', step: '1800', value: atual.abre, onchange: (ev) => { atual.abre = ev.target.value; estado.avisoAjustes = ''; } })),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Fecha às'),
        h('input', { type: 'time', step: '1800', value: atual.fecha, onchange: (ev) => { atual.fecha = ev.target.value; estado.avisoAjustes = ''; } }))));
}

function grupoChips(rotulo, ajuda, opcoes, atual, aoEscolher) {
  return h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo),
    h('div', { class: 'filtros', role: 'group', 'aria-label': rotulo }, opcoes.map((o) => h('button', {
      type: 'button', class: 'dia-filtro', 'aria-pressed': String(atual === o.valor),
      onclick: () => { aoEscolher(o.valor); estado.avisoAjustes = ''; render(); },
    }, o.rotulo))),
    ajuda && h('span', { class: 'campo-ajuda' }, ajuda));
}

function campoTexto(rotulo, valor, aoDigitar, extras = {}, ajuda = '') {
  return h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo),
    h('input', { type: 'text', value: valor, oninput: (ev) => { aoDigitar(ev.target.value); estado.avisoAjustes = ''; }, ...extras }),
    ajuda && h('span', { class: 'campo-ajuda' }, ajuda));
}

function secaoFidelidade(a) {
  if (!(estado.loja.recursos && estado.loja.recursos.fidelidade)) return null;
  const f = a.fid;
  return h('div', { class: 'cartao-ajuste' },
    h('h2', { class: 'subtitulo' }, 'Cartão fidelidade'),
    h('p', { class: 'campo-ajuda' }, 'A cada atendimento concluído o cliente ganha um carimbo. Ao completar, ganha o prêmio que você definir. Você acompanha e resgata na aba Clientes.'),
    h('div', { class: 'campo' }, h('button', {
      type: 'button', class: 'interruptor', 'aria-pressed': String(f.ativo), 'aria-label': `Fidelidade: ${f.ativo ? 'ligada' : 'desligada'}`,
      onclick: () => { f.ativo = !f.ativo; estado.avisoAjustes = ''; render(); },
    }, f.ativo ? 'Ligada' : 'Desligada')),
    f.ativo && grupoChips('Atendimentos para ganhar o prêmio', '', [5, 8, 10, 12].map((n) => ({ valor: n, rotulo: String(n) })), f.meta, (v) => { f.meta = v; }),
    f.ativo && campoTexto('Prêmio', f.premio, (v) => { f.premio = v; }, { maxlength: '60', placeholder: 'Ex.: 1 corte grátis' }));
}

function secaoPolitica(a) {
  return h('div', { class: 'cartao-ajuste' },
    h('h2', { class: 'subtitulo' }, 'Política de cancelamento'),
    grupoChips('Aviso mínimo para cancelar ou remarcar', 'O cliente vê esta regra antes de confirmar e depois de agendar.',
      PRAZOS_CANCELAMENTO.map((p) => ({ valor: p.horas, rotulo: p.rotulo })), a.cancelaHoras, (v) => { a.cancelaHoras = v; }),
    campoTexto('Observação extra (opcional)', a.nota, (v) => { a.nota = v; }, { maxlength: '200', placeholder: 'Ex.: Tolerância de atraso de 10 minutos.' }));
}

function secaoPix(a) {
  const p = a.pix;
  const tipo = TIPOS_CHAVE.find((t) => t.id === p.tipoChave);
  const chaveOk = normalizarChave(p.tipoChave, p.chave);
  let teste = null;
  if (a.testePix) {
    teste = chaveOk
      ? blocoPix({ codigo: gerarPix({ chave: chaveOk, nome: p.nome, cidade: p.cidade, valor: 1 }), valor: 1 })
      : h('p', { class: 'erro' }, 'Preencha uma chave Pix válida para testar.');
  }
  return h('div', { class: 'cartao-ajuste' },
    h('h2', { class: 'subtitulo' }, 'Pagamento antecipado por Pix'),
    h('p', { class: 'campo-ajuda' }, 'O cliente paga direto na sua conta, manda o comprovante no WhatsApp e você confirma aqui. O sistema não recebe nem guarda dinheiro.'),
    h('div', { class: 'campo' },
      h('button', {
        type: 'button', class: 'interruptor', 'aria-pressed': String(p.ativo), 'aria-label': `Pix antecipado: ${p.ativo ? 'ligado' : 'desligado'}`,
        onclick: () => { p.ativo = !p.ativo; estado.avisoAjustes = ''; render(); },
      }, p.ativo ? 'Ligado' : 'Desligado')),
    p.ativo && h('div', { class: 'chave-linha' },
      grupoChips('Tipo da chave Pix', '', TIPOS_CHAVE.map((t) => ({ valor: t.id, rotulo: t.rotulo })), p.tipoChave, (v) => { p.tipoChave = v; p.chave = ''; }),
      campoTexto('Sua chave Pix', p.chave, (v) => { p.chave = v; }, { maxlength: '80', placeholder: tipo.exemplo, autocomplete: 'off' }),
      campoTexto('Nome do recebedor', p.nome, (v) => { p.nome = v; }, { maxlength: '25', placeholder: 'Como aparece na sua conta' }, 'Máximo de 25 letras, sem acento.'),
      campoTexto('Cidade', p.cidade, (v) => { p.cidade = v; }, { maxlength: '15', placeholder: 'Ex.: São Paulo' }),
      grupoChips('O que o cliente paga agora', '', [{ valor: 'sinal', rotulo: 'Sinal' }, { valor: 'total', rotulo: 'Valor total' }], p.modo, (v) => { p.modo = v; }),
      p.modo === 'sinal' && grupoChips('Tamanho do sinal', '', [20, 30, 50].map((n) => ({ valor: n, rotulo: `${n}%` })), p.percentual, (v) => { p.percentual = v; }),
      grupoChips('Prazo para pagar', 'Passando o prazo, o horário volta a ficar livre para outros clientes.',
        [15, 30, 60, 120].map((n) => ({ valor: n, rotulo: n < 60 ? `${n} min` : `${n / 60} h` })), p.prazoMin, (v) => { p.prazoMin = v; }),
      h('p', { class: 'campo-ajuda' }, `Exemplo: num serviço de ${brl.format(50)} o cliente paga ${brl.format(valorDoPix({ ativo: true, modo: p.modo, percentual: p.percentual }, 50))} agora.`),
      h('button', { type: 'button', class: 'btn-acao', onclick: () => { a.testePix = !a.testePix; render(); } }, a.testePix ? 'Esconder teste' : 'Testar meu Pix (R$ 1,00)'),
      teste));
}

function telaAjustes() {
  const a = estado.ajustes;
  const erro = h('p', { class: 'erro', role: 'alert' }, estado.erroForm);
  const aviso = h('p', { class: 'aviso-ok', role: 'status' }, estado.avisoAjustes);
  const copiar = (destinos, rotulo) => {
    destinos.filter((d) => d !== a.dia).forEach((d) => { a.semana[d] = a.semana[a.dia].map((p) => ({ ...p })); });
    estado.avisoAjustes = `Horário de ${NOME_DIA[a.dia]} copiado para ${rotulo}. Toque em Salvar ajustes para valer.`;
    render();
  };
  const botaoCopiar = (rotulo, destinos) => h('button', { type: 'button', class: 'btn-acao', onclick: () => copiar(destinos, rotulo) }, rotulo);
  return moldura(
    h('h1', { class: 'titulo' }, 'Ajustes'),
    blocoInstalar({ titulo: 'Instalar o painel no celular', ajuda: 'Abre em tela cheia, como um app, com o nome e o logo da sua barbearia.' }),
    h('p', { class: 'texto' }, 'Defina os períodos de trabalho, a política de cancelamento e o Pix. Logo e cores são alterados pelo suporte.'),
    h('form', {
      class: 'form',
      onsubmit: async (ev) => {
        ev.preventDefault();
        if (estado.salvando) return;
        const problema = validarSemana(a.semana);
        if (problema) { erro.textContent = problema; return; }
        const digitos = a.whats.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
        if (digitos && digitos.length !== 10 && digitos.length !== 11) { erro.textContent = 'WhatsApp inválido. Use DDD + número, ou deixe em branco.'; return; }
        if (a.fid.ativo && estado.loja.recursos && estado.loja.recursos.fidelidade && a.fid.premio.trim().length < 2) { erro.textContent = 'Informe o prêmio do cartão fidelidade.'; return; }
        const p = a.pix;
        const chaveNorm = normalizarChave(p.tipoChave, p.chave);
        if (p.ativo) {
          if (!digitos) { erro.textContent = 'Para usar o Pix, cadastre o WhatsApp da barbearia: o cliente envia o comprovante por ele.'; return; }
          if (!chaveNorm) { erro.textContent = 'A chave Pix não parece válida para o tipo escolhido.'; return; }
          if (limparTexto(p.nome, 25).length < 2) { erro.textContent = 'Informe o nome do recebedor do Pix.'; return; }
          if (limparTexto(p.cidade, 15).length < 2) { erro.textContent = 'Informe a cidade do recebedor do Pix.'; return; }
        }
        const semana = {};
        for (let d = 0; d < 7; d++) semana[d] = [...a.semana[d]].sort((x, y) => paraMin(x.abre) - paraMin(y.abre));
        const abertos = ORDEM_DIAS.filter((d) => semana[d].length);
        const todos = abertos.flatMap((d) => semana[d]);
        const campos = {
          // "dias", "abre" e "fecha" ficam gravados também para versões antigas do site.
          horario: {
            semana, dias: abertos,
            abre: todos.map((p) => p.abre).sort()[0], fecha: todos.map((p) => p.fecha).sort().reverse()[0],
          },
          funcionamento: textoFuncionamento(semana),
          whatsapp: digitos ? `55${digitos}` : '',
          ...(estado.loja.recursos && estado.loja.recursos.fidelidade ? { fidelidade: { ativo: a.fid.ativo, meta: a.fid.meta, premio: a.fid.premio.trim().slice(0, 60) } } : {}),
          politica: { cancelaHoras: a.cancelaHoras, nota: a.nota.trim().replace(/\s+/g, ' ').slice(0, 200) },
          pix: {
            ativo: p.ativo, tipoChave: p.tipoChave, chave: chaveNorm || '', nome: limparTexto(p.nome, 25), cidade: limparTexto(p.cidade, 15),
            modo: p.modo, percentual: p.percentual, prazoMin: p.prazoMin,
          },
        };
        estado.salvando = true;
        estado.erroForm = '';
        render();
        try {
          await salvarLoja(estado.loja.id, campos);
          Object.assign(estado.loja, campos);
          estado.avisoAjustes = 'Ajustes salvos.';
        } catch {
          estado.erroForm = 'Não foi possível salvar agora. Tente de novo.';
        }
        estado.salvando = false;
        render();
      },
    },
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Dia da semana'),
        h('div', { class: 'filtros', role: 'group', 'aria-label': 'Escolher o dia para editar' }, ORDEM_DIAS.map((d) => h('button', {
          type: 'button', class: 'dia-filtro', 'aria-pressed': String(a.dia === d),
          onclick: () => { a.dia = d; estado.avisoAjustes = ''; render(); },
        }, NOME_DIA[d] + (a.semana[d].length ? '' : ' ·fechado')))),
        h('span', { class: 'campo-ajuda' }, 'Cada período pode ser aberto ou fechado separadamente. O intervalo entre eles fica sem horários.')),
      PERIODOS.map((m) => blocoPeriodo(a, m)),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, `Copiar o horário de ${NOME_DIA[a.dia]} para:`),
        h('div', { class: 'ag-acoes' },
          botaoCopiar('Todos os dias', [0, 1, 2, 3, 4, 5, 6]),
          botaoCopiar('Seg a Sex', [1, 2, 3, 4, 5]),
          botaoCopiar('Seg a Sáb', [1, 2, 3, 4, 5, 6]))),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'WhatsApp da barbearia (com DDD)'),
        h('input', { type: 'tel', inputmode: 'tel', maxlength: '20', placeholder: '(11) 91234-5678', value: a.whats, oninput: (ev) => { a.whats = ev.target.value; estado.avisoAjustes = ''; } }),
        h('span', { class: 'campo-ajuda' }, 'O cliente usa este número para avisar a barbearia depois de agendar.')),
      h('p', { class: 'campo-ajuda' }, `Vai aparecer assim para os clientes: ${textoFuncionamento(a.semana)}`),
      secaoPolitica(a),
      secaoFidelidade(a),
      secaoPix(a),
      h('div', { class: 'cartao-ajuste' },
        h('h2', { class: 'subtitulo' }, 'QR Code para os clientes'),
        h('p', { class: 'campo-ajuda' }, 'Imprima e cole no balcão e no espelho. O cliente aponta a câmera, abre a agenda e pode instalar o atalho no celular.'),
        blocoQrLoja(estado.loja)),
      h('div', { class: 'politica' },
        h('p', { class: 'politica-titulo' }, 'Assim o cliente vai ler a política'),
        frasesDaPolitica({ politica: { cancelaHoras: a.cancelaHoras, nota: a.nota }, pix: { ativo: a.pix.ativo, chave: 'x' }, whatsapp: '5511999999999' }).map((f) => h('p', {}, f))),
      erro,
      aviso,
      h('button', { type: 'submit', class: 'botao', disabled: estado.salvando }, estado.salvando ? 'Salvando...' : 'Salvar ajustes')));
}

/* ---------- navegação ---------- */

function render() {
  raiz.replaceChildren();
  const telas = {
    expirado: telaExpirado,
    carregando: () => h('section', { class: 'tela' }, h('div', { class: 'conteudo' }, h('p', { class: 'texto', 'aria-live': 'polite' }, 'Carregando...'))),
    login: telaLogin,
    semperfil: telaSemPerfil,
    falha: telaFalha,
    agenda: telaAgenda,
    servicos: telaServicos,
    agendar: telaAgendar,
    clientes: telaClientes,
    historico: telaHistorico,
    equipe: telaEquipe,
    ajustes: telaAjustes,
  };
  raiz.append(telas[estado.tela]());
}

async function aoEntrar(usuario) {
  if (!usuario) {
    estado.loja = null;
    estado.tela = 'login';
    aplicarTema(null, 'Painel do barbeiro');
    render();
    return;
  }
  estado.tela = 'carregando';
  render();
  try {
    const perfil = await getPerfil(usuario.uid);
    if (!perfil) { estado.tela = 'semperfil'; render(); return; }
    estado.loja = await getLojaPainel(perfil.barbearia);
    if (!estado.loja) { estado.tela = 'semperfil'; render(); return; }
    aplicarTema(estado.loja, `Painel · ${estado.loja.nome}`);
    prepararPwa({ nome: `Painel ${estado.loja.nome}`, cor: estado.loja.cor, logo: estado.loja.logo, inicio: `${location.origin}/painel.html` });
    if (estado.loja.ativa === false || (typeof estado.loja.validoAte === 'number' && estado.loja.validoAte < Date.now())) {
      estado.tela = 'expirado';
      render();
      return;
    }
    estado.tela = 'agenda';
    estado.filtro = 'todos';
    carregarDia(dataISO(new Date()));
  } catch {
    estado.tela = 'falha';
    render();
  }
}

estado.erroLogin = '';
render();
aoMudarUsuario(aoEntrar);
