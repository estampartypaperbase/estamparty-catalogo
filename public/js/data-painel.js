// Acesso ao banco para o painel do barbeiro (login + dados completos).
// Mesma ideia do data.js: o painel só chama estas funções.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, query, where, runTransaction, increment,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { blocosDe, paraMin, blocoVigente } from './horarios.js';
import { reservarBlocos } from './reserva.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- login ---------- */

export function aoMudarUsuario(callback) {
  return onAuthStateChanged(auth, callback);
}
export function entrar(email, senha) {
  return signInWithEmailAndPassword(auth, email, senha);
}
export function sair() {
  return signOut(auth);
}
export function recuperarSenha(email) {
  return sendPasswordResetEmail(auth, email);
}

// Documento usuarios/{uid}: diz a qual barbearia este login pertence.
export async function getPerfil(uid) {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  if (!snap.exists() || !snap.data().barbearia) return null;
  return { uid, barbearia: snap.data().barbearia, papel: snap.data().papel || 'barbeiro' };
}

/* ---------- barbearia ---------- */

function listaOrdenada(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

// Barbearia com TODOS os serviços e profissionais, inclusive os desativados.
export async function getLojaPainel(slug) {
  const ref = doc(db, 'barbearias', slug);
  const [snap, servicos, profissionais, pacotes] = await Promise.all([
    getDoc(ref),
    getDocs(collection(ref, 'servicos')),
    getDocs(collection(ref, 'profissionais')),
    getDocs(collection(ref, 'pacotes')),
  ]);
  if (!snap.exists()) return null;
  return { id: slug, ...snap.data(), servicos: listaOrdenada(servicos), profissionais: listaOrdenada(profissionais), pacotes: pacotes.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || '').localeCompare(b.nome || '')) };
}

/* ---------- agenda ---------- */

export async function getAgendamentosDoDia(slug, data) {
  const snap = await getDocs(query(collection(db, 'barbearias', slug, 'agendamentos'), where('data', '==', data)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.inicio.localeCompare(b.inicio));
}

export async function mudarStatus(slug, id, status, ag) {
  await updateDoc(doc(db, 'barbearias', slug, 'agendamentos', id), { status, atualizadoEm: Date.now() });
  // Atendimento concluído soma na ficha do cliente.
  if (status === 'concluido' && ag && ag.cliente && ag.cliente.whatsapp) {
    await setDoc(doc(db, 'barbearias', slug, 'clientes', ag.cliente.whatsapp), {
      concluidos: increment(1), gasto: increment(ag.preco || 0), ultimaVisita: ag.data,
    }, { merge: true });
  }
}

// Histórico: todos os agendamentos num período (de/ate em AAAA-MM-DD; qualquer um pode ser omitido).
export async function getHistorico(slug, de, ate) {
  const filtros = [];
  if (de) filtros.push(where('data', '>=', de));
  if (ate) filtros.push(where('data', '<=', ate));
  const snap = await getDocs(query(collection(db, 'barbearias', slug, 'agendamentos'), ...filtros));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getClientes(slug) {
  const snap = await getDocs(collection(db, 'barbearias', slug, 'clientes'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Cancelar também libera os horários reservados.
export async function cancelarAgendamento(slug, ag, motivo = '') {
  const refAg = doc(db, 'barbearias', slug, 'agendamentos', ag.id);
  const blocos = blocosDe(ag.profissionalId, ag.data, paraMin(ag.inicio), ag.minutos);
  await runTransaction(db, async (tx) => {
    const atual = await tx.get(refAg);
    if (!atual.exists() || atual.data().status === 'cancelado') return;
    tx.update(refAg, { status: 'cancelado', canceladoPor: 'barbearia', motivoCancelamento: motivo, atualizadoEm: Date.now() });
    blocos.forEach((b) => tx.delete(doc(db, 'barbearias', slug, 'ocupados', b)));
  });
}

/* ---------- serviços ---------- */

export async function salvarServico(slug, servico) {
  const { id, ...campos } = servico;
  await setDoc(doc(db, 'barbearias', slug, 'servicos', id), campos, { merge: true });
}

/* ---------- equipe ---------- */

export async function salvarProfissional(slug, profissional) {
  const { id, ...campos } = profissional;
  await setDoc(doc(db, 'barbearias', slug, 'profissionais', id), campos, { merge: true });
}

/* ---------- agendamento feito pelo barbeiro ---------- */

export async function getOcupados(slug, data) {
  const snap = await getDocs(query(collection(db, 'barbearias', slug, 'ocupados'), where('data', '==', data)));
  return new Set(snap.docs.filter((d) => blocoVigente(d.data())).map((d) => d.id));
}

// Igual ao agendamento do cliente (reserva os blocos de forma atômica), mas já nasce confirmado.
export async function criarAgendamentoManual(slug, a) {
  const id = crypto.randomUUID();
  const blocos = blocosDe(a.profissionalId, a.data, paraMin(a.inicio), a.servico.minutos);
  await runTransaction(db, async (tx) => {
    await reservarBlocos(tx, db, slug, blocos, { agendamentoId: id, data: a.data, expiraEm: 0 });
    tx.set(doc(db, 'barbearias', slug, 'agendamentos', id), {
      profissionalId: a.profissionalId,
      profissionalNome: a.profissionalNome,
      servicoId: a.servico.id,
      servicoNome: a.servico.nome,
      minutos: a.servico.minutos,
      preco: a.servico.preco,
      data: a.data,
      inicio: a.inicio,
      cliente: { nome: a.cliente.nome, whatsapp: a.cliente.whatsapp },
      status: 'confirmado',
      origem: 'balcao',
      criadoEm: Date.now(),
    });
    if (a.cliente.whatsapp) {
      tx.set(doc(db, 'barbearias', slug, 'clientes', a.cliente.whatsapp), {
        nome: a.cliente.nome, whatsapp: a.cliente.whatsapp, ultimoAgendamento: a.data, agendamentos: increment(1), atualizadoEm: Date.now(),
      }, { merge: true });
    }
  });
  return id;
}

/* ---------- bloqueio de horários (folga, almoço, dia fechado) ---------- */

export async function getBloqueios(slug, data) {
  const snap = await getDocs(query(collection(db, 'barbearias', slug, 'bloqueios'), where('data', '==', data)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// Bloqueia os horários como se fossem um agendamento: o cliente simplesmente não vê esses horários.
// Se já houver cliente marcado no intervalo, nada é bloqueado (erro "ocupado").
export async function criarBloqueio(slug, b) {
  const id = crypto.randomUUID();
  const minutos = paraMin(b.fim) - paraMin(b.inicio);
  const blocos = b.profissionais.flatMap((p) => blocosDe(p.id, b.data, paraMin(b.inicio), minutos));
  await runTransaction(db, async (tx) => {
    await reservarBlocos(tx, db, slug, blocos, { agendamentoId: `bloqueio-${id}`, data: b.data, expiraEm: 0 });
    tx.set(doc(db, 'barbearias', slug, 'bloqueios', id), {
      data: b.data, inicio: b.inicio, fim: b.fim, motivo: b.motivo || '',
      profissionalId: b.profissionais.length === 1 ? b.profissionais[0].id : 'todos',
      profissionalNome: b.profissionais.length === 1 ? b.profissionais[0].nome : 'Todos',
      blocos, criadoEm: Date.now(),
    });
  });
  return id;
}

export async function removerBloqueio(slug, b) {
  await runTransaction(db, async (tx) => {
    b.blocos.forEach((x) => tx.delete(doc(db, 'barbearias', slug, 'ocupados', x)));
    tx.delete(doc(db, 'barbearias', slug, 'bloqueios', b.id));
  });
}

/* ---------- pagamento antecipado (Pix) ---------- */

// O barbeiro viu o dinheiro na conta: confirma o agendamento. Se o prazo já tinha vencido, o horário
// só volta a ser do cliente se ninguém mais o tomou nesse meio tempo (erro "ocupado").
export async function confirmarPagamento(slug, ag) {
  const refAg = doc(db, 'barbearias', slug, 'agendamentos', ag.id);
  const refs = blocosDe(ag.profissionalId, ag.data, paraMin(ag.inicio), ag.minutos).map((b) => doc(db, 'barbearias', slug, 'ocupados', b));
  await runTransaction(db, async (tx) => {
    const atual = await tx.get(refAg);
    if (!atual.exists() || !['aguardando_pagamento', 'expirado'].includes(atual.data().status)) return;
    const snaps = [];
    for (const ref of refs) snaps.push(await tx.get(ref));
    if (snaps.some((s) => s.exists() && s.data().agendamentoId !== ag.id)) throw new Error('ocupado');
    refs.forEach((ref) => tx.set(ref, { data: ag.data, agendamentoId: ag.id }));
    tx.update(refAg, { status: 'confirmado', pago: true, pagoEm: Date.now(), atualizadoEm: Date.now() });
  });
}

// Prazo vencido sem pagamento: o barbeiro libera o horário (ou o próximo cliente que agendar o toma sozinho).
export async function liberarVencido(slug, ag) {
  const refAg = doc(db, 'barbearias', slug, 'agendamentos', ag.id);
  const refs = blocosDe(ag.profissionalId, ag.data, paraMin(ag.inicio), ag.minutos).map((b) => doc(db, 'barbearias', slug, 'ocupados', b));
  await runTransaction(db, async (tx) => {
    const atual = await tx.get(refAg);
    if (!atual.exists() || atual.data().status !== 'aguardando_pagamento') return;
    const snaps = [];
    for (const ref of refs) snaps.push(await tx.get(ref));
    tx.update(refAg, { status: 'expirado', atualizadoEm: Date.now() });
    snaps.forEach((s, i) => { if (s.exists() && s.data().agendamentoId === ag.id) tx.delete(refs[i]); });
  });
}

/* ---------- ajustes da barbearia ---------- */

export async function salvarLoja(slug, campos) {
  await updateDoc(doc(db, 'barbearias', slug), campos);
}

/* ---------- fidelidade e pacotes (plano completo) ---------- */

export async function salvarPacote(slug, pacote) {
  const { id, ...campos } = pacote;
  await setDoc(doc(db, 'barbearias', slug, 'pacotes', id), campos, { merge: true });
}

export async function getPacotesDoCliente(slug, whatsapp) {
  const snap = await getDocs(collection(db, 'barbearias', slug, 'clientes', whatsapp, 'pacotes'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.comprouEm - a.comprouEm);
}

export async function venderPacote(slug, whatsapp, pacote) {
  const id = crypto.randomUUID();
  const agora = Date.now();
  const novo = {
    id, pacoteId: pacote.id, nome: pacote.nome, servicoId: pacote.servicoId || '', total: pacote.total, restante: pacote.total,
    preco: pacote.preco, comprouEm: agora, venceEm: agora + pacote.validadeDias * 86400000,
  };
  const { id: _, ...campos } = novo;
  await setDoc(doc(db, 'barbearias', slug, 'clientes', whatsapp, 'pacotes', id), campos);
  return novo;
}

// Dá baixa de 1 uso (nunca abaixo de zero e nunca depois do vencimento).
export async function baixaPacote(slug, whatsapp, id) {
  const ref = doc(db, 'barbearias', slug, 'clientes', whatsapp, 'pacotes', id);
  await runTransaction(db, async (tx) => {
    const p = await tx.get(ref);
    if (!p.exists() || p.data().restante < 1 || p.data().venceEm < Date.now()) throw new Error('sem-saldo');
    tx.update(ref, { restante: p.data().restante - 1, atualizadoEm: Date.now() });
  });
}

// Conclui o atendimento usando um uso do pacote: não entra como dinheiro no resumo.
export async function concluirComPacote(slug, ag, pacoteId) {
  const refAg = doc(db, 'barbearias', slug, 'agendamentos', ag.id);
  const refPac = doc(db, 'barbearias', slug, 'clientes', ag.cliente.whatsapp, 'pacotes', pacoteId);
  await runTransaction(db, async (tx) => {
    const p = await tx.get(refPac);
    if (!p.exists() || p.data().restante < 1 || p.data().venceEm < Date.now()) throw new Error('sem-saldo');
    tx.update(refPac, { restante: p.data().restante - 1, atualizadoEm: Date.now() });
    tx.update(refAg, { status: 'concluido', pagoComPacote: true, pacoteId, atualizadoEm: Date.now() });
    tx.set(doc(db, 'barbearias', slug, 'clientes', ag.cliente.whatsapp), { concluidos: increment(1), ultimaVisita: ag.data }, { merge: true });
  });
}

export async function resgatarFidelidade(slug, whatsapp) {
  await setDoc(doc(db, 'barbearias', slug, 'clientes', whatsapp), { resgates: increment(1) }, { merge: true });
}
