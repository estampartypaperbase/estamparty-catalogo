// Texto da política de cancelamento e do pagamento antecipado, montado a partir dos Ajustes da barbearia.
// O mesmo texto aparece para o cliente e na prévia do barbeiro.

import { brl } from './util.js';

export const PRAZOS_CANCELAMENTO = [
  { horas: 0, rotulo: 'Sem prazo fixo' },
  { horas: 1, rotulo: '1 hora' },
  { horas: 2, rotulo: '2 horas' },
  { horas: 4, rotulo: '4 horas' },
  { horas: 12, rotulo: '12 horas' },
  { horas: 24, rotulo: '24 horas' },
];

export function pixAtivo(loja) {
  const p = loja && loja.pix;
  return Boolean(p && p.ativo && p.chave && /^\d{10,15}$/.test(loja.whatsapp || ''));
}

function textoPrazo(horas) {
  return horas === 1 ? '1 hora' : `${horas} horas`;
}

// Lista de frases curtas (uma por linha na tela).
export function frasesDaPolitica(loja) {
  const pol = (loja && loja.politica) || {};
  const horas = Number(pol.cancelaHoras) || 0;
  const frases = [];
  frases.push(horas
    ? `Para cancelar ou remarcar, avise a barbearia pelo WhatsApp com pelo menos ${textoPrazo(horas)} de antecedência.`
    : 'Para cancelar ou remarcar, avise a barbearia pelo WhatsApp com a maior antecedência possível.');
  if (pixAtivo(loja)) {
    frases.push(horas
      ? 'Cancelando dentro do prazo, o valor pago antecipadamente é devolvido ou fica como crédito. Fora do prazo ou em caso de falta, ele não é devolvido.'
      : 'O valor pago antecipadamente é abatido do serviço. Em caso de falta ou cancelamento de última hora, ele pode não ser devolvido.');
  } else {
    frases.push('Atrasos grandes podem fazer o horário ser remarcado.');
  }
  if (pol.nota && pol.nota.trim()) frases.push(pol.nota.trim());
  return frases;
}

export function descricaoDoPagamento(loja, preco, valor) {
  const pix = loja.pix;
  const quando = `Você tem ${pix.prazoMin || 30} minutos para pagar depois de agendar; depois disso o horário é liberado.`;
  return pix.modo === 'total'
    ? `Pagamento antecipado por Pix: ${brl.format(valor)} (valor total). ${quando}`
    : `Pagamento antecipado por Pix: sinal de ${brl.format(valor)} (${pix.percentual || 30}% de ${brl.format(preco)}), o resto você paga na barbearia. ${quando}`;
}
