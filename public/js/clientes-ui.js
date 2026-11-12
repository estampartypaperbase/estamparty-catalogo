// Lista de clientes e mailing de WhatsApp. Usada no painel do barbeiro e no painel do dono.

import { h, brl } from './util.js';

const ui = { busca: '', filtro: 'todos', modelo: 'promo', texto: null, enviados: new Set() };
const DIAS_SUMIDO = 30;

const MODELOS = [
  { id: 'promo', rotulo: 'Promoção', texto: 'Olá, {nome}! Aqui é da {loja}. [escreva aqui a sua promoção]. Agende pelo link: {link}' },
  { id: 'pacote', rotulo: 'Pacotes', texto: 'Olá, {nome}! A {loja} tem pacotes com preço especial. [descreva o pacote]. Fale comigo ou agende: {link}' },
  { id: 'link', rotulo: 'Link de agendamento', texto: 'Olá, {nome}! Para agendar na {loja}, é só acessar: {link}' },
  { id: 'livre', rotulo: 'Mensagem livre', texto: 'Olá, {nome}! ' },
];

const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const foneBonito = (n) => (n.length === 11 ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}` : `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`);
const ultima = (c) => c.ultimaVisita || c.ultimoAgendamento || '';

function diasDesde(iso) {
  if (!iso) return Infinity;
  const [a, m, d] = iso.split('-').map(Number);
  return Math.floor((Date.now() - new Date(a, m - 1, d).getTime()) / 86400000);
}

function filtrar(lista) {
  const q = ui.busca.trim().toLowerCase();
  const so = q.replace(/\D/g, '');
  return lista
    .filter((c) => !q || (c.nome || '').toLowerCase().includes(q) || (so && (c.whatsapp || '').includes(so)))
    .filter((c) => ui.filtro === 'todos' || (ui.filtro === 'promo' && c.marketing) || (ui.filtro === 'sumidos' && diasDesde(ultima(c)) >= DIAS_SUMIDO))
    .sort((a, b) => ultima(b).localeCompare(ultima(a)));
}

function mensagem(loja, c) {
  const modelo = ui.texto ?? MODELOS.find((m) => m.id === ui.modelo).texto;
  return modelo.replaceAll('{nome}', (c.nome || '').split(' ')[0]).replaceAll('{loja}', loja.nome).replaceAll('{link}', `${location.origin}/${loja.id}`);
}

function exportarCsv(loja, lista) {
  const esc = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const linhas = [['nome', 'whatsapp', 'agendamentos', 'atendimentos_concluidos', 'gasto_total', 'ultima_visita', 'aceita_promocoes'].join(',')]
    .concat(lista.map((c) => [c.nome, `55${c.whatsapp}`, c.agendamentos || 0, c.concluidos || 0, c.gasto || 0, ultima(c), c.marketing ? 'sim' : 'nao'].map(esc).join(',')));
  const url = URL.createObjectURL(new Blob(['﻿' + linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = h('a', { href: url, download: `clientes-${loja.id}.csv` });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// lista === null: carregando. aoMudar: função que redesenha a tela.
export function blocoClientes({ loja, lista, aoMudar, extras }) {
  if (!lista) return h('p', { class: 'texto', 'aria-live': 'polite' }, 'Carregando clientes...');
  const visiveis = filtrar(lista);
  const comPromo = lista.filter((c) => c.marketing).length;
  const fila = visiveis.filter((c) => ui.modelo === 'link' || c.marketing);
  const mudar = (fn) => () => { fn(); aoMudar(); };

  const chip = (rotulo, ativo, aoClicar) => h('button', { type: 'button', class: 'dia-filtro', 'aria-pressed': String(ativo), onclick: aoClicar }, rotulo);
  return h('div', { class: 'clientes' },
    h('p', { class: 'resumo-dia' }, `${lista.length} ${lista.length === 1 ? 'cliente' : 'clientes'} · ${comPromo} aceitam promoções`),
    h('input', {
      class: 'campo-livre', type: 'search', placeholder: 'Buscar por nome ou WhatsApp', value: ui.busca, 'aria-label': 'Buscar cliente',
      oninput: (e) => { ui.busca = e.target.value; const pos = e.target.selectionStart; aoMudar(); const novo = document.querySelector('input[type=search]'); if (novo) { novo.focus(); novo.setSelectionRange(pos, pos); } },
    }),
    h('div', { class: 'filtros', role: 'group', 'aria-label': 'Filtrar clientes' },
      chip('Todos', ui.filtro === 'todos', mudar(() => { ui.filtro = 'todos'; })),
      chip('Aceitam promoções', ui.filtro === 'promo', mudar(() => { ui.filtro = 'promo'; })),
      chip(`Sumidos (${DIAS_SUMIDO}+ dias)`, ui.filtro === 'sumidos', mudar(() => { ui.filtro = 'sumidos'; }))),
    !lista.length
      ? h('div', { class: 'vazio' }, h('p', { class: 'texto' }, 'Os clientes aparecem aqui automaticamente quando agendam.'))
      : h('div', { class: 'lista' }, visiveis.map((c) => h('article', { class: 'ag' },
        h('div', { class: 'ag-topo' },
          h('div', { class: 'ag-corpo' },
            h('p', { class: 'ag-cliente' }, c.nome),
            h('p', { class: 'ag-detalhe' }, `${foneBonito(c.whatsapp)} · ${c.agendamentos || 0} agend. · última: ${dataBR(ultima(c))}`),
            (c.gasto > 0) && h('p', { class: 'ag-detalhe' }, `Já gastou ${brl.format(c.gasto)} em ${c.concluidos || 0} atendimentos`),
            c.marketing && h('span', { class: 'chip chip-confirmado' }, 'Aceita promoções'))),
        h('div', { class: 'ag-acoes' },
          h('a', { class: 'btn-acao', target: '_blank', rel: 'noopener', href: `https://wa.me/55${c.whatsapp}` }, 'WhatsApp')),
        extras && extras(c)))),
    h('div', { class: 'cartao-ajuste' },
      h('h2', { class: 'subtitulo' }, 'Mensagem para vários clientes'),
      h('p', { class: 'campo-ajuda' }, 'Promoções e pacotes só vão para quem aceitou receber. O envio é um toque por cliente, pelo seu WhatsApp, para evitar bloqueio do número.'),
      h('div', { class: 'filtros', role: 'group', 'aria-label': 'Modelo de mensagem' }, MODELOS.map((m) => chip(m.rotulo, ui.modelo === m.id, mudar(() => { ui.modelo = m.id; ui.texto = null; })))),
      h('textarea', {
        class: 'campo-livre', rows: '4', 'aria-label': 'Texto da mensagem', oninput: (e) => { ui.texto = e.target.value; },
        onchange: () => aoMudar(),
      }, ui.texto ?? MODELOS.find((m) => m.id === ui.modelo).texto),
      h('p', { class: 'campo-ajuda' }, '{nome} vira o primeiro nome do cliente, {loja} o nome da barbearia e {link} o link de agendamento.'),
      h('p', { class: 'resumo-dia' }, `Fila de envio: ${fila.length} ${fila.length === 1 ? 'cliente' : 'clientes'} (segue o filtro acima)`),
      h('div', { class: 'lista' }, fila.map((c) => h('div', { class: 'ag-acoes' },
        h('span', { class: 'ag-detalhe' }, c.nome),
        h('a', {
          class: ui.enviados.has(c.whatsapp) ? 'btn-acao' : 'btn-acao primario', target: '_blank', rel: 'noopener',
          href: `https://wa.me/55${c.whatsapp}?text=${encodeURIComponent(mensagem(loja, c))}`,
          onclick: () => { ui.enviados.add(c.whatsapp); setTimeout(aoMudar, 300); },
        }, ui.enviados.has(c.whatsapp) ? 'Enviado ✓ (enviar de novo)' : 'Enviar'))))),
    h('button', { type: 'button', class: 'botao botao-contorno', onclick: () => exportarCsv(loja, lista) }, 'Baixar lista (CSV)'));
}
