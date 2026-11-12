// Instalação como app (PWA): nome e ícone da barbearia, botão "Instalar" e guia para iPhone.
// O manifesto é montado no próprio aparelho com os dados da barbearia, sem servidor.

import { h, corSobre, iniciais } from './util.js';

let adiado = null;
const ouvintes = new Set();
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); adiado = e; ouvintes.forEach((f) => f()); });
window.addEventListener('appinstalled', () => { adiado = null; ouvintes.forEach((f) => f()); });

export const jaInstalado = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
export const ehIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function carregarImagem(src) {
  return new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
}

async function icone(tam, { nome, cor, logo }) {
  const c = document.createElement('canvas');
  c.width = c.height = tam;
  const g = c.getContext('2d');
  g.fillStyle = cor;
  g.fillRect(0, 0, tam, tam);
  let desenhou = false;
  if (logo) {
    try {
      const img = await carregarImagem(logo);
      const area = tam * 0.68;
      const k = Math.min(area / img.width, area / img.height);
      g.drawImage(img, (tam - img.width * k) / 2, (tam - img.height * k) / 2, img.width * k, img.height * k);
      desenhou = true;
    } catch { /* sem logo legível: usa as iniciais */ }
  }
  if (!desenhou) {
    g.fillStyle = corSobre(cor);
    g.font = `700 ${tam * 0.42}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(iniciais(nome), tam / 2, tam / 2 + tam * 0.02);
  }
  return c;
}

function pegarTag(tag, rel, atributo = 'rel') {
  let no = document.head.querySelector(`${tag}[${atributo}="${rel}"]`);
  if (!no) { no = document.createElement(tag); no.setAttribute(atributo, rel); document.head.append(no); }
  return no;
}

export async function prepararPwa({ nome, cor, logo, inicio }) {
  try {
    const corOk = /^#[0-9a-f]{6}$/i.test(cor) ? cor : '#D4A64A';
    const dados = { nome, cor: corOk, logo };
    const [c192, c512, c180] = await Promise.all([icone(192, dados), icone(512, dados), icone(180, dados)]);
    const curto = nome.length > 14 ? nome.slice(0, 14).trim() : nome;
    const manifesto = {
      name: nome, short_name: curto, start_url: inicio, scope: `${location.origin}/`, display: 'standalone', lang: 'pt-BR',
      background_color: corOk, theme_color: corOk,
      icons: [
        { src: c192.toDataURL('image/png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: c512.toDataURL('image/png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      ],
    };
    pegarTag('link', 'manifest').href = URL.createObjectURL(new Blob([JSON.stringify(manifesto)], { type: 'application/manifest+json' }));
    pegarTag('link', 'apple-touch-icon').href = c180.toDataURL('image/png');
    pegarTag('meta', 'apple-mobile-web-app-capable', 'name').content = 'yes';
    pegarTag('meta', 'apple-mobile-web-app-title', 'name').content = curto;
    pegarTag('meta', 'theme-color', 'name').content = corOk;
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  } catch { /* instalar é um extra: se falhar, o site segue normal */ }
}

// Cartão "Instalar": botão no Android, passo a passo no iPhone, dica nos demais. Some se já estiver instalado.
export function blocoInstalar({ titulo, ajuda }) {
  const caixa = h('div', { class: 'politica' });
  const desenhar = () => {
    caixa.replaceChildren();
    caixa.hidden = jaInstalado();
    if (caixa.hidden) return;
    caixa.append(h('p', { class: 'politica-titulo' }, titulo), ajuda && h('p', {}, ajuda));
    if (adiado) {
      caixa.append(h('button', { type: 'button', class: 'botao', onclick: async () => { adiado.prompt(); await adiado.userChoice.catch(() => {}); adiado = null; desenhar(); } }, 'Instalar na tela inicial'));
    } else if (ehIos()) {
      caixa.append(
        h('p', {}, 'No iPhone, abra este link no Safari e siga:'),
        h('p', {}, '1. Toque em Compartilhar (o quadrado com uma seta para cima).'),
        h('p', {}, '2. Role e toque em "Adicionar à Tela de Início".'),
        h('p', {}, '3. Toque em "Adicionar".'));
    } else {
      caixa.append(h('p', {}, 'No menu do navegador (os três pontinhos), toque em "Instalar app" ou "Adicionar à tela inicial".'));
    }
  };
  ouvintes.add(desenhar);
  desenhar();
  return caixa;
}
