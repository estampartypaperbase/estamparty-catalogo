import { getLoja, getOcupados, criarAgendamento } from './data.js';
import { h, icone, brl, iniciais, lerSessao, gravarSessao, aplicarTema } from './util.js';
import { listarHorarios, proximosDias, dataDeISO, deMin } from './horarios.js';
import { frasesDaPolitica, pixAtivo, descricaoDoPagamento } from './politica.js';
import { gerarPix, valorDoPix } from './pix.js';
import { blocoPix } from './pix-ui.js';
import { prepararPwa, blocoInstalar } from './pwa.js';

const LOJA_PADRAO = 'barbearia-modelo';
const DURACAO_ENTRADA_MS = 3000;
const raiz = document.getElementById('app');

const estado = {
  loja: null,
  tela: 'entrada',
  timer: null,
  foco: null,
  servicoId: null,
  profId: null,
  data: null,
  hora: null,
  ocupados: null,
  erroHorarios: false,
  nome: '',
  whats: '',
  marketing: false,
  erroForm: '',
  enviando: false,
  resultado: null,
  avisoOcupado: false,
};

/* ---------- utilidades ---------- */

const ICONE_RELOGIO = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>';
const ICONE_CHECK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';
const ICONE_CHECK_GRANDE = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';

function diaCompleto(iso) {
  return dataDeISO(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ---------- peças de tela ---------- */

function logo(loja, tamanho) {
  const classe = `logo logo-${tamanho}`;
  if (loja.logo) {
    return h('div', { class: classe }, h('img', { src: loja.logo, alt: `Logo da ${loja.nome}` }));
  }
  return h('div', { class: classe, 'aria-hidden': 'true' }, iniciais(loja.nome));
}

function cabecalho(loja) {
  return h('header', { class: 'cabecalho' },
    logo(loja, 'pequeno'),
    h('div', {},
      h('p', { class: 'cabecalho-nome' }, loja.nome),
      h('p', { class: 'cabecalho-sub' }, loja.funcionamento)));
}

function passo(n) {
  return h('div', { class: 'passo' },
    h('p', { class: 'passo-texto' }, `Passo ${n} de 4`),
    h('div', { class: 'passo-barras', 'aria-hidden': 'true' },
      [1, 2, 3, 4].map((i) => h('span', { class: i <= n ? 'on' : '' }))));
}

function servicoEscolhido() {
  const { loja } = estado;
  return loja.servicos.find((s) => s.id === estado.servicoId) ?? loja.servicos[0];
}

function profissionalEscolhido() {
  const { loja } = estado;
  return loja.profissionais.find((p) => p.id === estado.profId) ?? loja.profissionais[0];
}

// Rodapé fixo: resumo opcional e botões Voltar / avançar.
function rodape({ resumo, voltar, avancar, textoAvancar, desativarAvancar }) {
  return h('div', { class: 'rodape' },
    resumo,
    h('div', { class: 'rodape-acoes' },
      voltar && h('button', { type: 'button', class: 'botao botao-contorno', onclick: voltar }, 'Voltar'),
      h('button', { type: 'button', class: 'botao', disabled: desativarAvancar, onclick: avancar }, textoAvancar)));
}

function linhaResumo(esquerda, direita) {
  return h('div', { class: 'resumo' }, h('span', {}, esquerda), h('strong', {}, direita));
}

function cartaoOpcao({ id, titulo, meta, direita, selecionado, aoEscolher, avatar }) {
  return h('button', {
    type: 'button',
    class: 'servico',
    'aria-pressed': String(selecionado),
    'data-opcao': id,
    onclick: aoEscolher,
  },
    h('span', { class: 'servico-corpo' },
      avatar && h('span', { class: 'avatar', 'aria-hidden': 'true' }, avatar),
      h('span', {},
        h('span', { class: 'servico-nome' }, titulo),
        meta && h('span', { class: 'servico-meta' }, icone(ICONE_RELOGIO), meta))),
    h('span', { class: 'servico-preco' },
      direita,
      h('span', { class: 'servico-check' }, icone(ICONE_CHECK))));
}

/* ---------- telas ---------- */

function telaEntrada() {
  const { loja } = estado;
  const abrirAgenda = () => irPara('servico');
  estado.timer = setTimeout(abrirAgenda, DURACAO_ENTRADA_MS);
  return h('section', { class: 'entrada' },
    h('div', { class: 'entrada-centro' },
      logo(loja, 'grande'),
      h('h1', { class: 'entrada-nome' }, loja.nome),
      h('p', { class: 'entrada-frase' }, loja.frase)),
    h('div', { class: 'entrada-rodape' },
      h('p', { class: 'entrada-aviso', 'aria-live': 'polite' }, 'Abrindo a agenda...'),
      h('div', { class: 'barra-trilho', 'aria-hidden': 'true' }, h('div', { class: 'barra-preenche' })),
      h('button', { type: 'button', class: 'botao botao-contorno', onclick: abrirAgenda }, 'Ir para a agenda agora')));
}

function telaServico() {
  const { loja } = estado;
  if (!loja.servicos.length) return telaIndisponivel();
  const escolhido = servicoEscolhido();
  return h('section', { class: 'tela' },
    cabecalho(loja),
    passo(1),
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Escolha o serviço'),
      h('div', { class: 'lista' }, loja.servicos.map((s) => cartaoOpcao({
        id: s.id,
        titulo: s.nome,
        meta: `${s.minutos} min`,
        direita: brl.format(s.preco),
        selecionado: s.id === escolhido.id,
        aoEscolher: () => {
          estado.servicoId = s.id;
          estado.hora = null;
          estado.foco = s.id;
          render();
        },
      })))),
    rodape({
      resumo: linhaResumo(`${escolhido.nome} · ${escolhido.minutos} min`, brl.format(escolhido.preco)),
      avancar: () => irPara('profissional'),
      textoAvancar: 'Continuar',
    }));
}

function telaProfissional() {
  const { loja } = estado;
  const escolhido = profissionalEscolhido();
  return h('section', { class: 'tela' },
    cabecalho(loja),
    passo(2),
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Com quem?'),
      h('div', { class: 'lista' }, loja.profissionais.map((p) => cartaoOpcao({
        id: p.id,
        titulo: p.nome,
        avatar: iniciais(p.nome),
        selecionado: p.id === escolhido.id,
        aoEscolher: () => {
          estado.profId = p.id;
          estado.hora = null;
          estado.foco = p.id;
          render();
        },
      })))),
    rodape({
      voltar: () => irPara('servico'),
      avancar: () => abrirHorarios(),
      textoAvancar: 'Continuar',
    }));
}

function telaHorario() {
  const { loja } = estado;
  const servico = servicoEscolhido();
  const prof = profissionalEscolhido();
  const dias = proximosDias(loja.horario, new Date());
  let corpo;
  if (!dias.length) {
    corpo = h('p', { class: 'texto' }, 'Não há dias disponíveis para agendar agora.');
  } else {
    const grade = h('div', { class: 'horarios', role: 'group', 'aria-label': 'Horários' });
    if (estado.erroHorarios) {
      corpo = h('p', { class: 'texto' }, 'Não foi possível carregar os horários. Tente outro dia ou recarregue a página.');
    } else if (!estado.ocupados) {
      corpo = h('p', { class: 'texto', 'aria-live': 'polite' }, 'Carregando horários...');
    } else {
      const lista = listarHorarios({
        horario: loja.horario,
        data: estado.data,
        minutos: servico.minutos,
        profId: prof.id,
        ocupados: estado.ocupados,
        agora: new Date(),
      });
      if (!lista.some((x) => x.livre)) {
        corpo = h('p', { class: 'texto' }, 'Sem horários livres neste dia. Escolha outro dia.');
      } else {
        lista.forEach((x) => grade.append(h('button', {
          type: 'button',
          class: 'horario',
          disabled: !x.livre,
          'aria-pressed': String(x.min === estado.hora),
          onclick: () => { estado.hora = x.min; estado.avisoOcupado = false; render(); },
        }, x.hora)));
        corpo = grade;
      }
    }
  }
  return h('section', { class: 'tela' },
    cabecalho(loja),
    passo(3),
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Dia e horário'),
      estado.avisoOcupado && h('p', { class: 'erro', role: 'alert' }, 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro.'),
      h('div', { class: 'dias', role: 'group', 'aria-label': 'Dias' }, dias.map((d) => h('button', {
        type: 'button',
        class: 'dia',
        'aria-pressed': String(d.iso === estado.data),
        'aria-label': diaCompleto(d.iso),
        onclick: () => escolherDia(d.iso),
      },
        h('span', { class: 'dia-semana' }, d.date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')),
        h('span', { class: 'dia-numero' }, d.date.getDate()),
        h('span', { class: 'dia-mes' }, d.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''))))),
      corpo),
    rodape({
      resumo: linhaResumo(`${servico.nome} · ${prof.nome}`, estado.hora != null ? deMin(estado.hora) : 'Escolha um horário'),
      voltar: () => irPara('profissional'),
      avancar: () => irPara('dados'),
      textoAvancar: 'Continuar',
      desativarAvancar: estado.hora == null,
    }));
}

function cartaoPolitica(loja) {
  return h('div', { class: 'politica' },
    h('p', { class: 'politica-titulo' }, 'Política de cancelamento'),
    frasesDaPolitica(loja).map((f) => h('p', {}, f)));
}

function telaDados() {
  const { loja } = estado;
  const servico = servicoEscolhido();
  const prof = profissionalEscolhido();
  const erro = h('p', { class: 'erro', role: 'alert' }, estado.erroForm);
  const comPix = pixAtivo(loja);
  return h('section', { class: 'tela' },
    cabecalho(loja),
    passo(4),
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Seus dados'),
      h('div', { class: 'cartao' },
        h('p', { class: 'cartao-titulo' }, servico.nome),
        h('p', { class: 'cartao-linha' }, `${diaCompleto(estado.data)} às ${deMin(estado.hora)}`),
        h('p', { class: 'cartao-linha' }, `com ${prof.nome} · ${servico.minutos} min · ${brl.format(servico.preco)}`)),
      h('label', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'Seu nome'),
        h('input', {
          type: 'text', autocomplete: 'name', maxlength: '60', value: estado.nome,
          oninput: (e) => { estado.nome = e.target.value; },
        })),
      h('label', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'WhatsApp com DDD'),
        h('input', {
          type: 'tel', inputmode: 'tel', autocomplete: 'tel', maxlength: '20', placeholder: '(11) 91234-5678', value: estado.whats,
          oninput: (e) => { estado.whats = e.target.value; },
        })),
      comPix && h('div', { class: 'politica' },
        h('p', { class: 'politica-titulo' }, 'Pagamento antecipado'),
        h('p', {}, descricaoDoPagamento(loja, servico.preco, valorDoPix(loja.pix, servico.preco)))),
      cartaoPolitica(loja),
      h('p', { class: 'campo-ajuda' }, 'Ao confirmar, você concorda com esta política.'),
      h('label', { class: 'consentimento' },
        h('input', { type: 'checkbox', checked: estado.marketing, onchange: (e) => { estado.marketing = e.target.checked; } }),
        h('span', {}, 'Quero receber promoções e novidades desta barbearia pelo WhatsApp (opcional). Você pode pedir para parar quando quiser.')),
      erro),
    rodape({
      voltar: () => irPara('horario'),
      avancar: () => confirmar(erro),
      textoAvancar: estado.enviando ? 'Confirmando...' : (comPix ? 'Confirmar e pagar com Pix' : 'Confirmar agendamento'),
      desativarAvancar: estado.enviando,
    }));
}

function horaDoPrazo(ms) {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function telaSucesso() {
  const { loja, resultado: r } = estado;
  const quando = `${diaCompleto(r.data)} às ${r.inicio}`;
  const link = (texto) => (loja.whatsapp && /^\d{10,15}$/.test(loja.whatsapp)
    ? `https://wa.me/${loja.whatsapp}?text=${encodeURIComponent(texto)}`
    : null);
  const zap = link(`Olá! Agendei ${r.servicoNome} com ${r.profissionalNome} para ${quando}. Meu nome é ${r.nome}.`);
  const zapComprovante = r.pix && link(`Olá! Sou ${r.nome}. Fiz o Pix de ${brl.format(r.pix.valor)} do agendamento de ${r.servicoNome} (${quando}). Segue o comprovante:`);
  return h('section', { class: 'tela' },
    cabecalho(loja),
    h('div', { class: 'conteudo sucesso' },
      h('div', { class: 'sucesso-selo' }, icone(ICONE_CHECK_GRANDE)),
      h('h1', { class: 'titulo' }, r.pix ? 'Quase lá!' : 'Agendado!'),
      h('p', { class: 'texto' }, r.pix
        ? `${r.nome}, seu horário está reservado até as ${horaDoPrazo(r.pix.pagarAte)}. Pague o Pix abaixo e envie o comprovante para a barbearia confirmar.`
        : `${r.nome}, seu horário está reservado. Chegue alguns minutos antes.`),
      h('div', { class: 'cartao' },
        h('p', { class: 'cartao-titulo' }, r.servicoNome),
        h('p', { class: 'cartao-linha' }, quando),
        h('p', { class: 'cartao-linha' }, `com ${r.profissionalNome} · ${brl.format(r.preco)}`)),
      r.pix && blocoPix({ codigo: r.pix.codigo, valor: r.pix.valor }),
      r.pix && zapComprovante && h('a', { class: 'botao botao-link', href: zapComprovante, target: '_blank', rel: 'noopener' }, 'Enviar comprovante no WhatsApp'),
      !r.pix && zap && h('a', { class: 'botao botao-link', href: zap, target: '_blank', rel: 'noopener' }, 'Avisar a barbearia no WhatsApp'),
      blocoInstalar({ titulo: `Atalho da ${loja.nome} na tela inicial`, ajuda: 'Agende mais rápido da próxima vez, sem procurar o link.' }),
      cartaoPolitica(loja)),
    h('div', { class: 'rodape' },
      h('button', { type: 'button', class: 'botao botao-contorno', onclick: novoAgendamento }, 'Fazer outro agendamento')));
}

function telaIndisponivel() {
  return h('section', { class: 'tela' },
    cabecalho(estado.loja),
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Agenda indisponível'),
      h('p', { class: 'texto' }, 'Esta barbearia ainda não cadastrou serviços ou profissionais. Fale diretamente com ela.')));
}

function telaExpirada() {
  const { loja } = estado;
  const zap = loja.whatsapp && /^\d{10,15}$/.test(loja.whatsapp) ? `https://wa.me/${loja.whatsapp}` : null;
  return h('section', { class: 'tela' },
    cabecalho(loja),
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Agenda indisponível'),
      h('p', { class: 'texto' }, 'A agenda online desta barbearia está temporariamente fora do ar. Fale diretamente com a barbearia para marcar seu horário.'),
      zap && h('a', { class: 'botao botao-link', href: zap, target: '_blank', rel: 'noopener' }, 'Chamar no WhatsApp')));
}

function telaNaoEncontrada() {
  return h('section', { class: 'tela' },
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Barbearia não encontrada'),
      h('p', { class: 'texto' }, 'Confira o endereço do link ou fale com a barbearia.')));
}

function telaFalha() {
  return h('section', { class: 'tela' },
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, 'Sem conexão'),
      h('p', { class: 'texto' }, 'Não foi possível carregar a agenda. Verifique a internet e tente de novo.'),
      h('button', { type: 'button', class: 'botao', onclick: () => location.reload() }, 'Tentar de novo')));
}

/* ---------- ações ---------- */

async function escolherDia(iso) {
  estado.data = iso;
  estado.hora = null;
  estado.ocupados = null;
  estado.erroHorarios = false;
  render();
  try {
    const ocupados = await getOcupados(estado.loja.id, iso);
    if (estado.data !== iso) return; // o cliente já trocou de dia
    estado.ocupados = ocupados;
  } catch {
    if (estado.data !== iso) return;
    estado.erroHorarios = true;
  }
  render();
}

function abrirHorarios() {
  const dias = proximosDias(estado.loja.horario, new Date());
  irPara('horario');
  if (dias.length) escolherDia(dias.some((d) => d.iso === estado.data) ? estado.data : dias[0].iso);
}

function telefoneValido(texto) {
  const n = texto.replace(/\D/g, '');
  return n.length === 10 || n.length === 11 ? n : null;
}

async function confirmar(erroEl) {
  const nome = estado.nome.trim().replace(/\s+/g, ' ');
  const whatsapp = telefoneValido(estado.whats);
  if (nome.length < 2) { erroEl.textContent = 'Digite seu nome.'; return; }
  if (!whatsapp) { erroEl.textContent = 'Digite o WhatsApp com DDD, por exemplo (11) 91234-5678.'; return; }
  estado.erroForm = '';
  estado.enviando = true;
  render();
  const servico = servicoEscolhido();
  const prof = profissionalEscolhido();
  const inicio = deMin(estado.hora);
  const loja = estado.loja;
  let pix = null;
  if (pixAtivo(loja)) {
    const valor = valorDoPix(loja.pix, servico.preco);
    if (valor > 0) pix = { valor, pagarAte: Date.now() + (Number(loja.pix.prazoMin) || 30) * 60000 };
  }
  try {
    await criarAgendamento(estado.loja.id, {
      profissionalId: prof.id,
      profissionalNome: prof.nome,
      servico: { id: servico.id, nome: servico.nome, minutos: servico.minutos, preco: servico.preco },
      data: estado.data,
      inicio,
      cliente: { nome, whatsapp, marketing: estado.marketing },
      pix,
    });
    estado.resultado = {
      nome, servicoNome: servico.nome, profissionalNome: prof.nome, data: estado.data, inicio, preco: servico.preco,
      pix: pix && {
        valor: pix.valor,
        pagarAte: pix.pagarAte,
        codigo: gerarPix({ chave: loja.pix.chave, nome: loja.pix.nome, cidade: loja.pix.cidade, valor: pix.valor }),
      },
    };
    estado.enviando = false;
    irPara('sucesso');
  } catch (e) {
    estado.enviando = false;
    if (e && e.message === 'ocupado') {
      estado.erroForm = '';
      estado.hora = null;
      abrirHorarios();
      estado.erroHorarios = false;
      estado.avisoOcupado = true;
    } else {
      estado.erroForm = 'Não foi possível confirmar agora. Tente de novo em instantes.';
      render();
    }
  }
}

function novoAgendamento() {
  estado.servicoId = estado.loja.servicos[0]?.id ?? null;
  estado.profId = estado.loja.profissionais[0]?.id ?? null;
  estado.data = null;
  estado.hora = null;
  estado.ocupados = null;
  estado.nome = '';
  estado.whats = '';
  estado.marketing = false;
  estado.resultado = null;
  irPara('servico');
}

/* ---------- navegação ---------- */

function limparTimer() {
  if (estado.timer) clearTimeout(estado.timer);
  estado.timer = null;
}

function render() {
  limparTimer();
  raiz.replaceChildren();
  if (estado.tela === 'falha') {
    raiz.append(telaFalha());
    return;
  }
  if (!estado.loja) {
    raiz.append(telaNaoEncontrada());
    return;
  }
  const telas = {
    entrada: telaEntrada,
    servico: telaServico,
    profissional: telaProfissional,
    horario: telaHorario,
    dados: telaDados,
    sucesso: telaSucesso,
    expirada: telaExpirada,
  };
  raiz.append(telas[estado.tela]());
  if (estado.foco) {
    const alvo = raiz.querySelector(`[data-opcao="${CSS.escape(estado.foco)}"]`);
    if (alvo) alvo.focus();
    estado.foco = null;
  }
}

function irPara(tela) {
  if (tela === 'servico' && estado.loja) gravarSessao(`entrada-vista:${estado.loja.id}`, '1');
  estado.tela = tela;
  render();
  window.scrollTo(0, 0);
}

// O endereço define a barbearia: /nome-da-barbearia ou ?b=nome-da-barbearia.
function descobrirSlug() {
  const consulta = new URLSearchParams(location.search).get('b');
  if (consulta) return consulta;
  const parte = location.pathname.split('/').filter(Boolean)[0];
  if (parte && !parte.includes('.')) return parte;
  return LOJA_PADRAO;
}

async function iniciar() {
  const slug = descobrirSlug();
  try {
    estado.loja = await getLoja(slug);
  } catch {
    estado.tela = 'falha';
    render();
    return;
  }
  if (estado.loja) {
    estado.servicoId = estado.loja.servicos[0]?.id ?? null;
    estado.profId = estado.loja.profissionais[0]?.id ?? null;
  }
  aplicarTema(estado.loja);
  if (estado.loja && !estado.loja.expirada) prepararPwa({ nome: estado.loja.nome, cor: estado.loja.cor, logo: estado.loja.logo, inicio: `${location.origin}/${slug}` });
  estado.tela = estado.loja && estado.loja.expirada ? 'expirada' : (lerSessao(`entrada-vista:${slug}`) === '1' ? 'servico' : 'entrada');
  render();
}

iniciar();
