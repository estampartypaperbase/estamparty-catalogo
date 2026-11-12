// Peça visual do Pix: QR Code + "copia e cola". Usada na tela do cliente e na prévia dos Ajustes.

import qrcode from './vendor/qrcode.js';
import { h, brl } from './util.js';

const NS = 'http://www.w3.org/2000/svg';

function desenharQr(codigo) {
  const qr = qrcode(0, 'M');
  qr.addData(codigo);
  qr.make();
  const n = qr.getModuleCount();
  const margem = 3;
  const tam = n + margem * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + margem} ${r + margem}h1v1h-1z`;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${tam} ${tam}`);
  svg.setAttribute('class', 'pix-qr');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'QR Code do Pix');
  svg.setAttribute('shape-rendering', 'crispEdges');
  const fundo = document.createElementNS(NS, 'rect');
  fundo.setAttribute('width', tam); fundo.setAttribute('height', tam); fundo.setAttribute('fill', '#FFFFFF');
  const caminho = document.createElementNS(NS, 'path');
  caminho.setAttribute('d', d); caminho.setAttribute('fill', '#000000');
  svg.append(fundo, caminho);
  return svg;
}

export function blocoPix({ codigo, valor }) {
  const aviso = h('p', { class: 'campo-ajuda', role: 'status' }, '');
  const caixa = h('textarea', { class: 'pix-codigo', readonly: true, rows: '4', 'aria-label': 'Código Pix copia e cola' }, codigo);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      aviso.textContent = 'Código copiado. Cole no app do seu banco, em Pix > Copia e cola.';
    } catch {
      caixa.focus(); caixa.select();
      aviso.textContent = 'Toque e segure no código para copiar.';
    }
  };
  return h('div', { class: 'pix' },
    h('p', { class: 'pix-valor' }, brl.format(valor)),
    desenharQr(codigo),
    h('p', { class: 'campo-ajuda' }, 'Abra o app do seu banco e leia o QR Code, ou use o Pix copia e cola:'),
    caixa,
    h('button', { type: 'button', class: 'botao botao-contorno', onclick: copiar }, 'Copiar código Pix'),
    aviso);
}
