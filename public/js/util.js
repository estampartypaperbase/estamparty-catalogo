// Peças compartilhadas pelo site do cliente e pelo painel do barbeiro.

// Monta elementos sem usar innerHTML, para que nomes vindos do banco nunca virem código.
export function h(tag, props = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor === false || valor == null) continue;
    if (chave === 'class') no.className = valor;
    else if (chave.startsWith('on')) no.addEventListener(chave.slice(2), valor);
    else no.setAttribute(chave, valor === true ? '' : valor);
  }
  for (const filho of filhos.flat()) {
    if (filho == null || filho === false) continue;
    no.append(filho.nodeType ? filho : document.createTextNode(String(filho)));
  }
  return no;
}

// Só para ícones fixos escritos no código, nunca para texto vindo de barbearia.
export function icone(svg) {
  const molde = document.createElement('template');
  molde.innerHTML = svg.trim();
  return molde.content.firstChild;
}

const moeda0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const moeda2 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Inteiro sem centavos (R$ 50); com centavos sempre com duas casas (R$ 13,50).
export const brl = { format: (v) => (Number.isInteger(v) ? moeda0 : moeda2).format(v) };

export function iniciais(nome) {
  return nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

export function lerSessao(chave) {
  try { return sessionStorage.getItem(chave); } catch { return null; }
}
export function gravarSessao(chave, valor) {
  try { sessionStorage.setItem(chave, valor); } catch { /* sem armazenamento: segue sem lembrar */ }
}

/* ---------- tema da barbearia ---------- */

function luminancia(hex) {
  const n = parseInt(hex.slice(1), 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

// Escolhe texto escuro ou branco, o que tiver mais contraste sobre a cor de destaque.
export function corSobre(hex) {
  const l = luminancia(hex);
  const contrasteEscuro = (l + 0.05) / (luminancia('#16181C') + 0.05);
  const contrasteBranco = 1.05 / (l + 0.05);
  return contrasteEscuro >= contrasteBranco ? '#16181C' : '#FFFFFF';
}

export function aplicarTema(loja, titulo) {
  const cor = loja && /^#[0-9a-f]{6}$/i.test(loja.cor) ? loja.cor : '#D4A64A';
  const raizDoc = document.documentElement;
  raizDoc.dataset.tema = loja && loja.fundo === 'claro' ? 'claro' : 'escuro';
  raizDoc.style.setProperty('--accent', cor);
  raizDoc.style.setProperty('--on-accent', corSobre(cor));
  document.title = titulo || (loja ? loja.nome : 'Agenda');
}

export function logo(loja, tamanho) {
  const classe = `logo logo-${tamanho}`;
  if (loja.logo) {
    return h('div', { class: classe }, h('img', { src: loja.logo, alt: `Logo da ${loja.nome}` }));
  }
  return h('div', { class: classe, 'aria-hidden': 'true' }, iniciais(loja.nome));
}
