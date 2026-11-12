// Pacotes e fidelidade (recursos do plano completo, ligados pelo dono em cada barbearia).
//  - blocoCatalogoPacotes: o barbeiro cadastra os pacotes que vende (aba Serviços).
//  - criarExtras: na ficha de cada cliente (aba Clientes): cartão fidelidade e pacotes comprados.

import { h, brl } from './util.js';

const DIA = 86400000;
const dataBR = (ms) => new Date(ms).toLocaleDateString('pt-BR');

function lerPreco(t) {
  const s = String(t).trim();
  const n = s.includes(',') ? Number(s.replace(/\./g, '').replace(',', '.')) : Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export const pacoteUsavel = (p, servicoId) => p.restante > 0 && p.venceEm >= Date.now() && (!p.servicoId || p.servicoId === servicoId);

/* ---------- catálogo de pacotes ---------- */

const ed = { atual: null, erro: '', salvando: false };

export function blocoCatalogoPacotes({ loja, salvar, aoMudar }) {
  const pacotes = loja.pacotes || [];
  const nomeServico = (id) => (loja.servicos.find((s) => s.id === id) || {}).nome;
  if (ed.atual) {
    const p = ed.atual;
    const campo = (rotulo, valor, aoDigitar, extras = {}) => h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, rotulo),
      h('input', { type: 'text', value: valor, oninput: (e) => aoDigitar(e.target.value), ...extras }));
    return h('div', { class: 'cartao-ajuste' },
      h('h2', { class: 'subtitulo' }, p.id ? 'Editar pacote' : 'Novo pacote'),
      campo('Nome do pacote', p.nome, (v) => { p.nome = v; }, { maxlength: '60', placeholder: 'Ex.: 4 cortes' }),
      campo('Quantidade de usos', String(p.total), (v) => { p.total = v; }, { inputmode: 'numeric', maxlength: '3' }),
      campo('Preço do pacote (R$)', p.preco, (v) => { p.preco = v; }, { inputmode: 'decimal', placeholder: '160,00' }),
      h('div', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Validade'),
        h('div', { class: 'filtros', role: 'group', 'aria-label': 'Validade' }, [30, 60, 90, 180].map((d) => h('button', {
          type: 'button', class: 'dia-filtro', 'aria-pressed': String(p.validadeDias === d), onclick: () => { p.validadeDias = d; aoMudar(); },
        }, `${d} dias`)))),
      h('label', { class: 'campo' }, h('span', { class: 'campo-rotulo' }, 'Vale para'),
        h('select', { onchange: (e) => { p.servicoId = e.target.value; } },
          h('option', { value: '', selected: !p.servicoId }, 'Qualquer serviço'),
          loja.servicos.filter((s) => s.ativo !== false).map((s) => h('option', { value: s.id, selected: p.servicoId === s.id }, s.nome)))),
      ed.erro && h('p', { class: 'erro', role: 'alert' }, ed.erro),
      h('div', { class: 'ag-acoes' },
        h('button', {
          type: 'button', class: 'btn-acao primario', disabled: ed.salvando,
          onclick: async () => {
            const total = Number(p.total); const preco = lerPreco(p.preco);
            if (p.nome.trim().length < 2) { ed.erro = 'Dê um nome ao pacote.'; aoMudar(); return; }
            if (!Number.isInteger(total) || total < 1 || total > 100) { ed.erro = 'A quantidade de usos deve ser de 1 a 100.'; aoMudar(); return; }
            if (preco === null) { ed.erro = 'Informe o preço, por exemplo 160,00.'; aoMudar(); return; }
            ed.erro = ''; ed.salvando = true; aoMudar();
            try {
              await salvar({ id: p.id || crypto.randomUUID(), nome: p.nome.trim(), total, preco, validadeDias: p.validadeDias, servicoId: p.servicoId || '', ativo: p.ativo !== false });
              ed.atual = null;
            } catch { ed.erro = 'Não foi possível salvar agora. Tente de novo.'; }
            ed.salvando = false; aoMudar();
          },
        }, ed.salvando ? 'Salvando...' : 'Salvar pacote'),
        h('button', { type: 'button', class: 'btn-acao', onclick: () => { ed.atual = null; ed.erro = ''; aoMudar(); } }, 'Cancelar')));
  }
  return h('div', { class: 'cartao-ajuste' },
    h('h2', { class: 'subtitulo' }, 'Pacotes'),
    h('p', { class: 'campo-ajuda' }, 'Combos com preço fechado (ex.: 4 cortes). O cliente paga na barbearia; você vende o pacote na aba Clientes e o sistema controla o saldo.'),
    h('button', {
      type: 'button', class: 'btn-acao',
      onclick: () => { ed.atual = { id: null, nome: '', total: '4', preco: '', validadeDias: 90, servicoId: '', ativo: true }; ed.erro = ''; aoMudar(); },
    }, 'Novo pacote'),
    pacotes.length
      ? h('div', { class: 'lista' }, pacotes.map((p) => h('article', { class: 'ag' },
        h('div', { class: 'ag-corpo' },
          h('p', { class: 'ag-cliente' }, `${p.nome}${p.ativo === false ? ' (desativado)' : ''}`),
          h('p', { class: 'ag-detalhe' }, `${p.total} usos · ${brl.format(p.preco)} · ${p.validadeDias} dias · ${p.servicoId ? (nomeServico(p.servicoId) || 'serviço') : 'qualquer serviço'}`)),
        h('div', { class: 'ag-acoes' },
          h('button', { type: 'button', class: 'btn-acao', onclick: () => { ed.atual = { ...p, total: String(p.total), preco: String(p.preco).replace('.', ',') }; ed.erro = ''; aoMudar(); } }, 'Editar'),
          h('button', {
            type: 'button', class: 'btn-acao',
            onclick: async () => { try { await salvar({ ...p, ativo: p.ativo === false }); } catch { /* mantém como está */ } aoMudar(); },
          }, p.ativo === false ? 'Ativar' : 'Desativar')))))
      : h('p', { class: 'texto' }, 'Nenhum pacote cadastrado ainda.'));
}

/* ---------- extras na ficha do cliente ---------- */

export function criarExtras({ loja, api, aoMudar }) {
  const rec = loja.recursos || {};
  const fid = loja.fidelidade || {};
  const usaFid = rec.fidelidade && fid.ativo && Number(fid.meta) > 0;
  if (!usaFid && !rec.pacotes) return null;
  const estado = { abertos: new Set(), pac: new Map(), aviso: new Map(), vendendo: new Map() };
  const link = (c, texto) => `https://wa.me/55${c.whatsapp}?text=${encodeURIComponent(texto)}`;
  const primeiro = (c) => (c.nome || '').split(' ')[0];

  async function carregar(c) {
    estado.pac.set(c.whatsapp, null);
    aoMudar();
    try { estado.pac.set(c.whatsapp, await api.getPacotesDoCliente(loja.id, c.whatsapp)); } catch { estado.pac.set(c.whatsapp, []); }
    aoMudar();
  }
  const dizer = (c, t) => { estado.aviso.set(c.whatsapp, t); aoMudar(); };

  function blocoFidelidade(c) {
    const meta = Number(fid.meta);
    const atual = Math.max(0, (c.concluidos || 0) - (c.resgates || 0) * meta);
    const pronto = atual >= meta;
    const texto = pronto
      ? `Olá, ${primeiro(c)}! Você completou ${meta} atendimentos na ${loja.nome} e ganhou: ${fid.premio}. Fale comigo para resgatar!`
      : `Olá, ${primeiro(c)}! Você já tem ${atual} de ${meta} atendimentos no cartão fidelidade da ${loja.nome}. Ao completar, você ganha: ${fid.premio}.`;
    return h('div', { class: 'ag-acoes' },
      h('span', { class: 'ag-detalhe' }, `Fidelidade: ${Math.min(atual, meta)}/${meta}${pronto ? ' · prêmio liberado' : ''}`),
      pronto && h('button', {
        type: 'button', class: 'btn-acao primario',
        onclick: async () => { try { await api.resgatarFidelidade(loja.id, c.whatsapp); c.resgates = (c.resgates || 0) + 1; dizer(c, 'Prêmio resgatado.'); } catch { dizer(c, 'Não foi possível resgatar agora.'); } },
      }, `Resgatar: ${fid.premio}`),
      h('a', { class: 'btn-acao', target: '_blank', rel: 'noopener', href: link(c, texto) }, pronto ? 'Avisar prêmio' : 'Enviar saldo'));
  }

  function blocoPacotes(c) {
    const aberto = estado.abertos.has(c.whatsapp);
    const lista = estado.pac.get(c.whatsapp);
    if (!aberto) {
      return h('div', { class: 'ag-acoes' }, h('button', { type: 'button', class: 'btn-acao', onclick: () => { estado.abertos.add(c.whatsapp); carregar(c); } }, 'Pacotes'));
    }
    const catalogo = (loja.pacotes || []).filter((p) => p.ativo !== false);
    const escolhido = estado.vendendo.get(c.whatsapp) || (catalogo[0] && catalogo[0].id);
    return h('div', { class: 'cartao-ajuste' },
      h('p', { class: 'politica-titulo' }, 'Pacotes de ' + primeiro(c)),
      !lista ? h('p', { class: 'ag-detalhe' }, 'Carregando...')
        : !lista.length ? h('p', { class: 'ag-detalhe' }, 'Nenhum pacote comprado.')
        : lista.map((p) => {
          const ok = pacoteUsavel(p, null) || (p.restante > 0 && p.venceEm >= Date.now());
          return h('div', { class: 'ag-acoes' },
            h('span', { class: 'ag-detalhe' }, `${p.nome}: restam ${p.restante} de ${p.total} · ${p.venceEm < Date.now() ? 'venceu' : 'vence'} em ${dataBR(p.venceEm)}`),
            ok && h('button', {
              type: 'button', class: 'btn-acao',
              onclick: async () => { try { await api.baixaPacote(loja.id, c.whatsapp, p.id); p.restante -= 1; dizer(c, 'Baixa registrada.'); } catch { dizer(c, 'Não foi possível dar baixa agora.'); } },
            }, 'Dar baixa'));
        }),
      catalogo.length
        ? h('div', { class: 'ag-acoes' },
          h('select', { 'aria-label': 'Pacote para vender', onchange: (e) => { estado.vendendo.set(c.whatsapp, e.target.value); } },
            catalogo.map((p) => h('option', { value: p.id, selected: p.id === escolhido }, `${p.nome} · ${brl.format(p.preco)}`))),
          h('button', {
            type: 'button', class: 'btn-acao primario',
            onclick: async () => {
              const p = catalogo.find((x) => x.id === (estado.vendendo.get(c.whatsapp) || catalogo[0].id));
              try {
                const novo = await api.venderPacote(loja.id, c.whatsapp, p);
                estado.pac.set(c.whatsapp, [novo, ...(estado.pac.get(c.whatsapp) || [])]);
                dizer(c, `Pacote vendido. Válido até ${dataBR(novo.venceEm)}.`);
              } catch { dizer(c, 'Não foi possível registrar a venda agora.'); }
            },
          }, 'Vender pacote'))
        : h('p', { class: 'campo-ajuda' }, 'Cadastre pacotes na aba Serviços para vender aqui.'),
      h('button', { type: 'button', class: 'link', onclick: () => { estado.abertos.delete(c.whatsapp); aoMudar(); } }, 'Fechar'));
  }

  return (c) => h('div', { class: 'extras-cliente' },
    usaFid && blocoFidelidade(c),
    rec.pacotes && blocoPacotes(c),
    estado.aviso.get(c.whatsapp) && h('p', { class: 'aviso-ok', role: 'status' }, estado.aviso.get(c.whatsapp)));
}
