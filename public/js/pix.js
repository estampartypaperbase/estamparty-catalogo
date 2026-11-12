// Pix: monta o código "copia e cola" (BR Code) e confere a chave. Tudo no aparelho, sem servidor.
// O dinheiro vai direto da conta do cliente para a conta do barbeiro; o sistema nunca toca nele.

export function crc16(texto) {
  let crc = 0xFFFF;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function campo(id, valor) {
  return id + String(valor.length).padStart(2, '0') + valor;
}

// O padrão do Pix aceita só letras sem acento, números e espaço, em caixa alta.
export function limparTexto(texto, max) {
  return String(texto || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const TIPOS_CHAVE = [
  { id: 'cpfcnpj', rotulo: 'CPF ou CNPJ', exemplo: '000.000.000-00' },
  { id: 'celular', rotulo: 'Celular', exemplo: '(11) 91234-5678' },
  { id: 'email', rotulo: 'E-mail', exemplo: 'nome@email.com' },
  { id: 'aleatoria', rotulo: 'Chave aleatória', exemplo: '123e4567-e89b-12d3-a456-426614174000' },
];

// Devolve a chave no formato que o Pix exige, ou null se estiver inválida.
export function normalizarChave(tipo, texto) {
  const t = String(texto || '').trim();
  const digitos = t.replace(/\D/g, '');
  if (tipo === 'cpfcnpj') return digitos.length === 11 || digitos.length === 14 ? digitos : null;
  if (tipo === 'celular') {
    const n = digitos.replace(/^55(?=\d{10,11}$)/, '');
    return n.length === 10 || n.length === 11 ? `+55${n}` : null;
  }
  if (tipo === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) && t.length <= 77 ? t.toLowerCase() : null;
  if (tipo === 'aleatoria') return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? t.toLowerCase() : null;
  return null;
}

// Código "copia e cola". `valor` em reais (ex.: 15 ou 15.5).
export function gerarPix({ chave, nome, cidade, valor }) {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  let p = campo('00', '01') + campo('01', '11') + campo('26', conta) + campo('52', '0000') + campo('53', '986');
  if (valor > 0) p += campo('54', Number(valor).toFixed(2));
  p += campo('58', 'BR') + campo('59', limparTexto(nome, 25) || 'BARBEARIA') + campo('60', limparTexto(cidade, 15) || 'BRASIL');
  p += campo('62', campo('05', '***'));
  p += '6304';
  return p + crc16(p);
}

// Quanto o cliente paga agora: o valor todo ou um sinal (percentual do serviço).
export function valorDoPix(pix, preco) {
  if (!pix || !pix.ativo || !(preco > 0)) return 0;
  if (pix.modo === 'total') return Math.round(preco * 100) / 100;
  const pct = Math.min(100, Math.max(1, Number(pix.percentual) || 30));
  return Math.max(0.01, Math.round(preco * pct) / 100);
}
