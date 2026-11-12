// QR Code do link de agendamento da barbearia, com o logo no centro, pronto para baixar e imprimir.

import qrcode from './vendor/qrcode.js';
import { h } from './util.js';

function carregarImagem(src) {
  return new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = src; });
}

async function desenhar(canvas, loja, url) {
  const L = 640; const A = 760; const QR = 520;
  canvas.width = L; canvas.height = A;
  const g = canvas.getContext('2d');
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, L, A);
  g.fillStyle = '#16181C'; g.textAlign = 'center'; g.textBaseline = 'middle';
  let tam = 44;
  g.font = `700 ${tam}px system-ui, sans-serif`;
  while (g.measureText(loja.nome).width > L - 60 && tam > 20) { tam -= 2; g.font = `700 ${tam}px system-ui, sans-serif`; }
  g.fillText(loja.nome, L / 2, 56);
  const qr = qrcode(0, 'H');
  qr.addData(url); qr.make();
  const n = qr.getModuleCount();
  const x0 = (L - QR) / 2; const y0 = 110; const cel = QR / n;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect(Math.floor(x0 + c * cel), Math.floor(y0 + r * cel), Math.ceil(cel), Math.ceil(cel));
  if (loja.logo) {
    try {
      const img = await carregarImagem(loja.logo);
      const caixa = 112; const cx = L / 2; const cy = y0 + QR / 2;
      g.fillStyle = '#FFFFFF'; g.beginPath(); g.roundRect(cx - caixa / 2, cy - caixa / 2, caixa, caixa, 16); g.fill();
      const k = Math.min((caixa - 16) / img.width, (caixa - 16) / img.height);
      g.drawImage(img, cx - img.width * k / 2, cy - img.height * k / 2, img.width * k, img.height * k);
    } catch { /* sem logo: QR puro */ }
  }
  g.fillStyle = '#16181C'; g.font = '600 28px system-ui, sans-serif';
  g.fillText('Aponte a câmera do celular e agende', L / 2, y0 + QR + 50);
  g.fillStyle = '#5C5A55'; g.font = '22px system-ui, sans-serif';
  g.fillText(url.replace(/^https?:\/\//, ''), L / 2, y0 + QR + 88);
}

export function blocoQrLoja(loja) {
  const url = `${location.origin}/${loja.id}`;
  const canvas = h('canvas', { class: 'qr-cartao', role: 'img', 'aria-label': `QR Code de agendamento da ${loja.nome}` });
  desenhar(canvas, loja, url);
  const baixar = () => canvas.toBlob((blob) => {
    const href = URL.createObjectURL(blob);
    const a = h('a', { href, download: `qrcode-${loja.id}.png` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
  }, 'image/png');
  return h('div', { class: 'qr-bloco' }, canvas,
    h('button', { type: 'button', class: 'botao botao-contorno', onclick: baixar }, 'Baixar QR Code (PNG)'));
}
