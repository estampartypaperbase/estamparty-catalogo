import {
  aoMudarUsuario, entrar, sair, recuperarSenha, getPapel, listarBarbearias, getClientesDe, excluirBarbearia, slugExiste, criarBarbearia, atualizarBarbearia,
} from './data-dono.js';
import { h, logo, aplicarTema, corSobre } from './util.js';
import { blocoClientes } from './clientes-ui.js';
import { blocoQrLoja } from './qr-ui.js';

const raiz = document.getElementById('app');
const PRAZOS = [15, 30, 60, 90];
const DIA_MS = 24 * 60 * 60 * 1000;

const estado = {
  tela: 'carregando', // carregando | login | negado | falha | lista | form
  lista: null,
  erroLista: false,
  email: '', senha: '', erroLogin: '', avisoLogin: '', entrando: false,
  renovando: null, // { slug, dias }
  clientesDe: null, clientes: null, excluindo: null, qrDe: null,
  aviso: '',
  form: null,
};

/* ---------- prazo de uso ---------- */

// Soma os dias ao vencimento atual se ainda não venceu; senão conta a partir de hoje.
// O prazo sempre termina às 23:59 do último dia.
function novoPrazo(validoAte, dias) {
  const base = validoAte && validoAte > Date.now() ? new Date(validoAte) : new Date();
  base.setDate(base.getDate() + dias);
  base.setHours(23, 59, 59, 999);
  return base.getTime();
}

function dataCurta(ms) {
  return new Date(ms).toLocaleDateString('pt-BR');
}

function situacao(b) {
  if (b.ativa === false) return { classe: 'chip-cancelado', texto: 'Suspensa', detalhe: 'Desativada por você' };
  if (typeof b.validoAte !== 'number') return { classe: 'chip-pendente', texto: 'Sem prazo definido', detalhe: 'Renove para definir o vencimento' };
  const dias = Math.ceil((b.validoAte - Date.now()) / DIA_MS);
  if (b.validoAte < Date.now()) return { classe: 'chip-nao_compareceu', texto: 'Vencida', detalhe: `Venceu em ${dataCurta(b.validoAte)}` };
  if (dias <= 7) return { classe: 'chip-pendente', texto: `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, detalhe: `Até ${dataCurta(b.validoAte)}` };
  return { classe: 'chip-confirmado', texto: `Ativa · ${dias} dias`, detalhe: `Até ${dataCurta(b.validoAte)}` };
}

/* ---------- utilidades ---------- */

function gerarSlug(nome) {
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

async function copiar(texto, rotulo) {
  try {
    await navigator.clipboard.writeText(texto);
    estado.aviso = `${rotulo} copiado.`;
  } catch {
    estado.aviso = `Copie manualmente: ${texto}`;
  }
  render();
}

// Reduz a imagem para no máximo 256 px e devolve um texto (data URL) que cabe dentro do cadastro.
async function processarLogo(arquivo) {
  const bitmap = await createImageBitmap(arquivo);
  for (const lado of [256, 192, 128]) {
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/webp', 0.9);
    if (url.length < 120000) return url;
  }
  throw new Error('imagem-grande');
}

function textoFuncionamentoPadrao() {
  return 'Seg a Sáb 9h–12h e 14h–19h';
}

function semanaPadrao() {
  const dia = [{ id: 'manha', abre: '09:00', fecha: '12:00' }, { id: 'tarde', abre: '14:00', fecha: '19:00' }];
  const semana = {};
  for (let d = 0; d < 7; d++) semana[d] = d === 0 ? [] : dia.map((p) => ({ ...p }));
  return semana;
}

/* ---------- login ---------- */

function mensagemDeErro(e) {
  const c = e && e.code ? e.code : '';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(c)) return 'E-mail ou senha incorretos.';
  if (c === 'auth/too-many-requests') return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
  if (c === 'auth/network-request-failed') return 'Sem conexão com a internet.';
  return 'Não foi possível entrar agora. Tente de novo.';
}

function telaLogin() {
  const erro = h('p', { class: 'erro', role: 'alert' }, estado.erroLogin);
  const aviso = h('p', { class: 'aviso-ok', role: 'status' }, estado.avisoLogin);
  return h('section', { class: 'tela' },
    h('div', { class: 'conteudo login' },
      h('h1', { class: 'titulo' }, 'Painel do dono'),
      h('p', { class: 'texto' }, 'Área restrita para liberar e acompanhar as barbearias.'),
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
          try { await entrar(email, estado.senha); } catch (e) { estado.erroLogin = mensagemDeErro(e); estado.avisoLogin = ''; }
          estado.entrando = false;
          estado.senha = '';
          if (estado.tela === 'login') render();
        },
      },
        h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'E-mail'),
          h('input', { type: 'email', autocomplete: 'username', inputmode: 'email', value: estado.email, oninput: (e) => { estado.email = e.target.value; } })),
        h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Senha'),
          h('input', { type: 'password', autocomplete: 'current-password', value: estado.senha, oninput: (e) => { estado.senha = e.target.value; } })),
        erro, aviso,
        h('button', { type: 'submit', class: 'botao', disabled: estado.entrando }, estado.entrando ? 'Entrando...' : 'Entrar')),
      h('button', {
        type: 'button', class: 'link',
        onclick: async () => {
          const email = estado.email.trim();
          if (!email) { erro.textContent = 'Digite seu e-mail acima para receber o link de nova senha.'; return; }
          try { await recuperarSenha(email); } catch { /* resposta igual para não revelar quais e-mails existem */ }
          erro.textContent = '';
          aviso.textContent = 'Se este e-mail tiver cadastro, enviamos um link para criar uma nova senha.';
        },
      }, 'Esqueci minha senha')));
}

function telaMensagem(titulo, texto, botoes) {
  return h('section', { class: 'tela' }, h('div', { class: 'conteudo' },
    h('h1', { class: 'titulo' }, titulo), h('p', { class: 'texto' }, texto), botoes));
}

/* ---------- lista de barbearias ---------- */

function cabecalhoDono() {
  return h('header', { class: 'cabecalho cabecalho-painel' },
    h('div', { class: 'cabecalho-texto' },
      h('p', { class: 'cabecalho-nome' }, 'Painel do dono'),
      h('p', { class: 'cabecalho-sub' }, 'Barbearias clientes')),
    h('button', { type: 'button', class: 'btn-acao', onclick: () => sair() }, 'Sair'));
}

async function aplicarPrazo(b, dias) {
  const campos = { validoAte: novoPrazo(b.validoAte, dias), ativa: true };
  try {
    await atualizarBarbearia(b.id, campos);
    Object.assign(b, campos);
    estado.aviso = `${b.nome}: liberada até ${dataCurta(b.validoAte)}.`;
  } catch {
    estado.aviso = 'Não foi possível renovar agora. Tente de novo.';
  }
  estado.renovando = null;
  render();
}

function areaRenovar(b) {
  const r = estado.renovando;
  return h('div', { class: 'renovar' },
    h('p', { class: 'campo-rotulo' }, 'Renovar por quantos dias?'),
    h('div', { class: 'filtros', role: 'group', 'aria-label': 'Prazo' }, PRAZOS.map((d) => h('button', {
      type: 'button', class: 'dia-filtro', 'aria-pressed': String(r.dias === d),
      onclick: () => { r.dias = d; render(); },
    }, `${d} dias`))),
    r.dias
      ? h('p', { class: 'campo-ajuda' }, `Novo vencimento: ${dataCurta(novoPrazo(b.validoAte, r.dias))}${b.validoAte && b.validoAte > Date.now() ? ' (soma ao prazo atual)' : ' (a partir de hoje)'}`)
      : h('p', { class: 'campo-ajuda' }, 'Escolha um prazo.'),
    h('div', { class: 'ag-acoes' },
      h('button', { type: 'button', class: 'btn-acao primario', disabled: !r.dias, onclick: () => aplicarPrazo(b, r.dias) }, 'Confirmar renovação'),
      h('button', { type: 'button', class: 'btn-acao', onclick: () => { estado.renovando = null; render(); } }, 'Cancelar')));
}

function areaExcluir(b) {
  const e = estado.excluindo;
  const ok = e.texto.trim() === b.id;
  const botao = h('button', { type: 'button', class: 'btn-acao primario', disabled: !ok || e.apagando, onclick: async () => {
    e.apagando = true; render();
    try {
      await excluirBarbearia(b.id);
      estado.lista = estado.lista.filter((x) => x.id !== b.id);
      estado.aviso = `${b.nome || b.id}: excluída com todos os dados.`;
      estado.excluindo = null;
    } catch { e.apagando = false; estado.aviso = 'Não foi possível excluir agora. Tente de novo.'; }
    render();
  } }, e.apagando ? 'Excluindo...' : 'Excluir definitivamente');
  return h('div', { class: 'ag-acoes' },
    h('p', { class: 'ag-pergunta' }, `Isto apaga ${b.nome || b.id} e TODOS os agendamentos, clientes e serviços dela. Não dá para desfazer. Para confirmar, digite: ${b.id}`),
    h('input', { class: 'campo-livre', type: 'text', placeholder: b.id, 'aria-label': 'Digite o endereço da barbearia para confirmar', value: e.texto,
      oninput: (ev) => { e.texto = ev.target.value; botao.disabled = ev.target.value.trim() !== b.id; } }),
    botao,
    h('button', { type: 'button', class: 'btn-acao', onclick: () => { estado.excluindo = null; render(); } }, 'Cancelar'));
}

function cartaoBarbearia(b) {
  const s = situacao(b);
  const origem = location.origin;
  return h('article', { class: 'ag' },
    h('div', { class: 'ag-topo' },
      logo({ nome: b.nome || b.id, logo: b.logo }, 'pequeno'),
      h('div', { class: 'ag-corpo' },
        h('p', { class: 'ag-cliente' }, b.nome || b.id),
        h('p', { class: 'ag-detalhe' }, `${origem.replace(/^https?:\/\//, '')}/${b.id}`),
        h('span', { class: `chip ${s.classe}` }, s.texto),
        h('p', { class: 'ag-detalhe' }, s.detalhe))),
    h('div', { class: 'filtros', role: 'group', 'aria-label': 'Recursos do plano completo' }, [['fidelidade', 'Fidelidade'], ['pacotes', 'Pacotes']].map(([k, r]) => {
      const ligado = Boolean(b.recursos && b.recursos[k]);
      return h('button', {
        type: 'button', class: 'dia-filtro', 'aria-pressed': String(ligado),
        onclick: async () => {
          const novo = { ...(b.recursos || {}), [k]: !ligado };
          try { await atualizarBarbearia(b.id, { recursos: novo }); b.recursos = novo; estado.aviso = `${b.nome || b.id}: ${r} ${novo[k] ? 'ligado' : 'desligado'}.`; } catch { estado.aviso = 'Não foi possível alterar agora.'; }
          render();
        },
      }, `${r}: ${ligado ? 'ligado' : 'desligado'}`);
    })),
    estado.excluindo && estado.excluindo.slug === b.id
      ? areaExcluir(b)
      : estado.renovando && estado.renovando.slug === b.id
      ? areaRenovar(b)
      : h('div', { class: 'ag-acoes' },
        h('button', { type: 'button', class: 'btn-acao primario', onclick: () => { estado.renovando = { slug: b.id, dias: null }; render(); } }, 'Renovar prazo'),
        h('button', { type: 'button', class: 'btn-acao', onclick: () => abrirForm(b) }, 'Editar'),
        h('button', { type: 'button', class: 'btn-acao', onclick: () => abrirClientes(b) }, 'Clientes'),
        h('button', { type: 'button', class: 'btn-acao', onclick: () => { estado.qrDe = b; estado.tela = 'qr'; render(); window.scrollTo(0, 0); } }, 'QR Code'),
        h('button', {
          type: 'button', class: 'btn-acao',
          onclick: async () => {
            const nova = b.ativa === false;
            try { await atualizarBarbearia(b.id, { ativa: nova }); b.ativa = nova; estado.aviso = `${b.nome}: ${nova ? 'reativada' : 'suspensa'}.`; } catch { estado.aviso = 'Não foi possível alterar agora.'; }
            render();
          },
        }, b.ativa === false ? 'Reativar' : 'Suspender'),
        h('button', { type: 'button', class: 'btn-acao', onclick: () => copiar(`${origem}/${b.id}`, 'Link do site') }, 'Copiar link do site'),
        h('button', { type: 'button', class: 'btn-acao', onclick: () => copiar(`${origem}/painel.html`, 'Link do painel do barbeiro') }, 'Copiar link do painel'),
        h('button', { type: 'button', class: 'btn-acao', onclick: () => { estado.excluindo = { slug: b.id, texto: '', apagando: false }; render(); } }, 'Excluir')));
}

async function abrirClientes(b) {
  estado.clientesDe = b;
  estado.clientes = null;
  estado.tela = 'clientes';
  render();
  window.scrollTo(0, 0);
  try { estado.clientes = await getClientesDe(b.id); } catch { estado.clientes = []; }
  if (estado.tela === 'clientes') render();
}

function telaClientesDono() {
  const b = estado.clientesDe;
  return h('section', { class: 'tela' }, cabecalhoDono(),
    h('div', { class: 'conteudo' },
      h('button', { type: 'button', class: 'btn-acao', onclick: () => { estado.tela = 'lista'; render(); } }, '‹ Voltar às barbearias'),
      h('h1', { class: 'titulo' }, `Clientes · ${b.nome || b.id}`),
      blocoClientes({ loja: { id: b.id, nome: b.nome || b.id }, lista: estado.clientes, aoMudar: render })));
}

function telaQr() {
  const b = estado.qrDe;
  return h('section', { class: 'tela' }, cabecalhoDono(),
    h('div', { class: 'conteudo' },
      h('button', { type: 'button', class: 'btn-acao', onclick: () => { estado.tela = 'lista'; render(); } }, '‹ Voltar às barbearias'),
      h('h1', { class: 'titulo' }, `QR Code · ${b.nome || b.id}`),
      blocoQrLoja({ id: b.id, nome: b.nome || b.id, logo: b.logo })));
}

function telaLista() {
  let corpo;
  if (estado.erroLista) corpo = h('p', { class: 'texto' }, 'Não foi possível carregar as barbearias. Recarregue a página.');
  else if (!estado.lista) corpo = h('p', { class: 'texto', 'aria-live': 'polite' }, 'Carregando...');
  else if (!estado.lista.length) corpo = h('p', { class: 'texto' }, 'Nenhuma barbearia cadastrada ainda.');
  else corpo = h('div', { class: 'lista' }, estado.lista.map(cartaoBarbearia));
  return h('section', { class: 'tela' }, cabecalhoDono(),
    h('div', { class: 'conteudo' },
      h('button', { type: 'button', class: 'botao', onclick: () => abrirForm(null) }, 'Nova barbearia'),
      estado.aviso && h('p', { class: 'aviso-ok', role: 'status' }, estado.aviso),
      corpo));
}

/* ---------- formulário de barbearia ---------- */

function abrirForm(b) {
  estado.aviso = '';
  estado.form = b
    ? { modo: 'editar', slug: b.id, nome: b.nome || '', frase: b.frase || '', logo: b.logo || null, cor: b.cor || '#D4A64A', fundo: b.fundo === 'claro' ? 'claro' : 'escuro', erro: '', salvando: false }
    : {
      modo: 'nova', slug: '', slugEditado: false, nome: '', frase: 'Agende seu horário em segundos', logo: null, cor: '#D4A64A', fundo: 'escuro',
      dias: 30, barbeiro: 'Barbeiro', email: '', senha: '', erro: '', salvando: false,
    };
  estado.tela = 'form';
  render();
  window.scrollTo(0, 0);
}

function previa(f) {
  const claro = f.fundo === 'claro';
  const cor = /^#[0-9a-f]{6}$/i.test(f.cor) ? f.cor : '#D4A64A';
  const nome = f.nome.trim() || 'Nome da barbearia';
  return h('div', {
    class: 'previa', role: 'img', 'aria-label': `Prévia da tela de entrada: ${nome}`,
    style: `background:${claro ? '#F7F5F0' : '#16181C'};color:${claro ? '#1B1D21' : '#F2F0EA'};border-color:${claro ? '#D9D3C5' : '#2E3238'}`,
  },
  h('div', { class: 'previa-logo', style: `background:${cor};color:${corSobre(cor)}` },
    f.logo ? h('img', { src: f.logo, alt: '' }) : nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase()),
  h('strong', {}, nome),
  h('span', { class: 'previa-frase', style: `color:${claro ? '#5C5A55' : '#A9A69D'}` }, f.frase || ' '),
  h('span', { class: 'previa-botao', style: `background:${cor};color:${corSobre(cor)}` }, 'Continuar'));
}

function telaForm() {
  const f = estado.form;
  const nova = f.modo === 'nova';
  const erro = h('p', { class: 'erro', role: 'alert' }, f.erro);
  const campoTexto = (rotulo, chave, extra = {}, ajuda) => h('label', { class: 'campo' },
    h('span', { class: 'campo-rotulo' }, rotulo),
    h('input', { type: 'text', value: f[chave], oninput: (e) => { f[chave] = e.target.value; extra.aoDigitar?.(); }, ...extra.attrs }),
    ajuda && h('span', { class: 'campo-ajuda' }, ajuda));
  const previaEl = previa(f);
  let previaEl2 = previaEl;
  const repor = () => { const novo = previa(f); previaEl2.replaceWith(novo); previaEl2 = novo; };

  return h('section', { class: 'tela' }, cabecalhoDono(),
    h('div', { class: 'conteudo' },
      h('h1', { class: 'titulo' }, nova ? 'Nova barbearia' : 'Editar barbearia'),
      previaEl,
      h('form', {
        class: 'form',
        onsubmit: async (ev) => {
          ev.preventDefault();
          if (f.salvando) return;
          const nome = f.nome.trim().replace(/\s+/g, ' ');
          if (nome.length < 2) { erro.textContent = 'Digite o nome da barbearia.'; return; }
          if (!/^#[0-9a-f]{6}$/i.test(f.cor)) { erro.textContent = 'A cor precisa ter o formato #RRGGBB.'; return; }
          f.salvando = true;
          erro.textContent = '';
          render();
          try {
            if (nova) {
              const slug = f.slug.trim();
              if (!/^[a-z0-9-]{2,40}$/.test(slug)) throw Object.assign(new Error('slug'), { msg: 'O endereço precisa ter de 2 a 40 letras minúsculas, números ou hífens.' });
              if (await slugExiste(slug)) throw Object.assign(new Error('slug'), { msg: 'Já existe uma barbearia com esse endereço. Escolha outro.' });
              if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) throw Object.assign(new Error('email'), { msg: 'Digite o e-mail do barbeiro.' });
              if (f.senha.length < 8) throw Object.assign(new Error('senha'), { msg: 'A senha provisória precisa ter 8 ou mais caracteres.' });
              const semana = semanaPadrao();
              await criarBarbearia(slug, {
                nome, frase: f.frase.trim(), cor: f.cor, fundo: f.fundo, logo: f.logo, whatsapp: '', ativa: true,
                funcionamento: textoFuncionamentoPadrao(),
                horario: { semana, dias: [1, 2, 3, 4, 5, 6], abre: '09:00', fecha: '19:00' },
                validoAte: novoPrazo(null, f.dias), criadoEm: Date.now(),
              }, {
                email: f.email.trim(), senha: f.senha,
                servicos: [{ id: 'corte', nome: 'Corte', minutos: 30, preco: 45 }, { id: 'barba', nome: 'Barba', minutos: 30, preco: 35 }, { id: 'corte-barba', nome: 'Corte + Barba', minutos: 60, preco: 70 }],
                profissionais: [{ id: gerarSlug(f.barbeiro) || 'barbeiro', nome: f.barbeiro.trim() || 'Barbeiro' }],
              });
              estado.aviso = `${nome} criada e liberada até ${dataCurta(novoPrazo(null, f.dias))}. Passe o e-mail e a senha ao barbeiro.`;
            } else {
              await atualizarBarbearia(f.slug, { nome, frase: f.frase.trim(), cor: f.cor, fundo: f.fundo, logo: f.logo });
              estado.aviso = `${nome}: alterações salvas.`;
            }
            estado.lista = null;
            estado.form = null;
            estado.tela = 'lista';
            render();
            carregarLista();
          } catch (e) {
            f.salvando = false;
            if (e.msg) f.erro = e.msg;
            else if (e.code === 'auth/email-already-in-use') f.erro = 'Este e-mail já tem login. Use outro e-mail para o barbeiro.';
            else if (e.code === 'auth/weak-password') f.erro = 'Senha fraca. Use 8 ou mais caracteres.';
            else if (e.code === 'auth/invalid-email') f.erro = 'E-mail inválido.';
            else f.erro = 'Não foi possível salvar agora. Tente de novo.';
            render();
          }
        },
      },
      campoTexto('Nome da barbearia', 'nome', {
        attrs: { maxlength: '40' },
        aoDigitar: () => {
          if (nova && !f.slugEditado) { f.slug = gerarSlug(f.nome); const campo = document.getElementById('campo-slug'); if (campo) campo.value = f.slug; }
          repor();
        },
      }),
      nova && h('label', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'Endereço do site'),
        h('input', { id: 'campo-slug', type: 'text', maxlength: '40', value: f.slug, autocapitalize: 'none', oninput: (e) => { f.slug = e.target.value.toLowerCase(); f.slugEditado = true; } }),
        h('span', { class: 'campo-ajuda' }, `Fica assim: ${location.host}/${f.slug || 'nome-da-barbearia'}. Não dá para mudar depois.`)),
      campoTexto('Frase de boas-vindas', 'frase', { attrs: { maxlength: '60' }, aoDigitar: repor }),
      h('div', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'Logo'),
        h('div', { class: 'ag-acoes' },
          h('label', { class: 'btn-acao' }, f.logo ? 'Trocar imagem' : 'Escolher imagem', h('input', {
            type: 'file', accept: 'image/*', class: 'oculto',
            onchange: async (e) => {
              const arquivo = e.target.files && e.target.files[0];
              if (!arquivo) return;
              try { f.logo = await processarLogo(arquivo); f.erro = ''; } catch { f.erro = 'Não foi possível usar essa imagem. Tente um PNG ou JPG menor.'; }
              render();
            },
          })),
          f.logo && h('button', { type: 'button', class: 'btn-acao', onclick: () => { f.logo = null; render(); } }, 'Remover')),
        h('span', { class: 'campo-ajuda' }, 'Sem imagem, o sistema usa as iniciais do nome. A imagem é reduzida automaticamente.')),
      h('div', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'Cor de destaque'),
        h('div', { class: 'cor-linha' },
          h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(f.cor) ? f.cor : '#D4A64A', 'aria-label': 'Escolher cor', oninput: (e) => { f.cor = e.target.value.toUpperCase(); const t = document.getElementById('campo-cor'); if (t) t.value = f.cor; repor(); } }),
          h('input', { id: 'campo-cor', type: 'text', maxlength: '7', value: f.cor, 'aria-label': 'Código da cor', oninput: (e) => { f.cor = e.target.value.trim(); repor(); } }))),
      h('div', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'Fundo'),
        h('div', { class: 'filtros', role: 'group', 'aria-label': 'Fundo' }, ['escuro', 'claro'].map((v) => h('button', {
          type: 'button', class: 'dia-filtro', 'aria-pressed': String(f.fundo === v),
          onclick: () => { f.fundo = v; render(); },
        }, v === 'escuro' ? 'Escuro' : 'Claro')))),
      nova && h('div', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'Prazo de uso liberado'),
        h('div', { class: 'filtros', role: 'group', 'aria-label': 'Prazo inicial' }, PRAZOS.map((d) => h('button', {
          type: 'button', class: 'dia-filtro', 'aria-pressed': String(f.dias === d),
          onclick: () => { f.dias = d; render(); },
        }, `${d} dias`))),
        h('span', { class: 'campo-ajuda' }, `Vence em ${dataCurta(novoPrazo(null, f.dias))}. Depois você renova na lista.`)),
      nova && campoTexto('Nome do primeiro barbeiro', 'barbeiro', { attrs: { maxlength: '40' } }, 'Aparece para o cliente escolher. O barbeiro pode mudar depois, em Equipe.'),
      nova && h('label', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'E-mail de login do barbeiro'),
        h('input', { type: 'email', inputmode: 'email', autocapitalize: 'none', value: f.email, oninput: (e) => { f.email = e.target.value; } })),
      nova && h('label', { class: 'campo' },
        h('span', { class: 'campo-rotulo' }, 'Senha provisória (8 ou mais caracteres)'),
        h('input', { type: 'text', autocomplete: 'off', value: f.senha, oninput: (e) => { f.senha = e.target.value; } }),
        h('span', { class: 'campo-ajuda' }, 'Passe para o barbeiro. Ele pode trocar usando "Esqueci minha senha" no painel.')),
      erro,
      h('button', { type: 'submit', class: 'botao', disabled: f.salvando }, f.salvando ? 'Salvando...' : (nova ? 'Criar e liberar barbearia' : 'Salvar alterações')),
      h('button', { type: 'button', class: 'botao botao-contorno', onclick: () => { estado.form = null; estado.tela = 'lista'; render(); } }, 'Voltar'))));
}

/* ---------- navegação ---------- */

function render() {
  raiz.replaceChildren();
  const telas = {
    carregando: () => h('section', { class: 'tela' }, h('div', { class: 'conteudo' }, h('p', { class: 'texto', 'aria-live': 'polite' }, 'Carregando...'))),
    login: telaLogin,
    negado: () => telaMensagem('Acesso negado', 'Esta conta não é de dono do sistema.', h('button', { type: 'button', class: 'botao', onclick: () => sair() }, 'Sair')),
    falha: () => telaMensagem('Sem conexão', 'Não foi possível carregar. Verifique a internet e tente de novo.', h('button', { type: 'button', class: 'botao', onclick: () => location.reload() }, 'Tentar de novo')),
    lista: telaLista,
    form: telaForm,
    clientes: telaClientesDono,
    qr: telaQr,
  };
  raiz.append(telas[estado.tela]());
}

async function carregarLista() {
  estado.erroLista = false;
  try {
    estado.lista = await listarBarbearias();
  } catch {
    estado.erroLista = true;
  }
  if (estado.tela === 'lista') render();
}

async function aoEntrar(usuario) {
  if (!usuario) {
    estado.tela = 'login';
    estado.lista = null;
    aplicarTema(null, 'Painel do dono');
    render();
    return;
  }
  estado.tela = 'carregando';
  render();
  try {
    if ((await getPapel(usuario.uid)) !== 'dono') { estado.tela = 'negado'; render(); return; }
    estado.tela = 'lista';
    render();
    carregarLista();
  } catch {
    estado.tela = 'falha';
    render();
  }
}

render();
aoMudarUsuario(aoEntrar);
