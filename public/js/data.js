// Único ponto de acesso ao banco de dados (Firestore).
// O resto do site só chama estas funções. Se um dia o sistema mudar de banco ou
// de hospedagem, é só reescrever este arquivo.
//
// Estrutura no Firestore (um projeto para todas as barbearias):
//   barbearias/{slug}                      nome, frase, cor, fundo, logo, horario, whatsapp, ativa
//   barbearias/{slug}/servicos/{id}        nome, minutos, preco, ativo, ordem
//   barbearias/{slug}/profissionais/{id}   nome, ativo, ordem
//   barbearias/{slug}/ocupados/{bloco}     data, agendamentoId   (sem dados pessoais)
//   barbearias/{slug}/agendamentos/{id}    serviço, profissional, dia, hora, cliente, status

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getFirestore, doc, collection, getDoc, getDocs, query, where, runTransaction, increment,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import { blocosDe, paraMin, blocoVigente } from './horarios.js';
import { reservarBlocos } from './reserva.js';

const db = getFirestore(initializeApp(firebaseConfig));

function listaAtiva(snap) {
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((x) => x.ativo !== false)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
}

// Devolve a barbearia com serviços e profissionais ativos, ou null se não existir.
export async function getLoja(slug) {
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) return null;
  const ref = doc(db, 'barbearias', slug);
  const [snap, servicos, profissionais] = await Promise.all([
    getDoc(ref),
    getDocs(collection(ref, 'servicos')),
    getDocs(collection(ref, 'profissionais')),
  ]);
  if (!snap.exists() || snap.data().ativa === false) return null;
  const dados = snap.data();
  // Prazo de uso vencido: o site mostra "agenda indisponível". Sem prazo cadastrado = liberada.
  const expirada = typeof dados.validoAte === 'number' && dados.validoAte < Date.now();
  return { id: slug, ...dados, expirada, servicos: listaAtiva(servicos), profissionais: listaAtiva(profissionais) };
}

// Conjunto com os IDs dos blocos já ocupados num dia (todos os profissionais).
export async function getOcupados(slug, data) {
  const consulta = query(collection(db, 'barbearias', slug, 'ocupados'), where('data', '==', data));
  const snap = await getDocs(consulta);
  return new Set(snap.docs.filter((d) => blocoVigente(d.data())).map((d) => d.id));
}

// Cria o agendamento e reserva os blocos de uma vez só. Se alguém reservou
// qualquer um deles no meio tempo, nada é gravado e o erro é "ocupado".
export async function criarAgendamento(slug, a) {
  const id = crypto.randomUUID();
  const blocos = blocosDe(a.profissionalId, a.data, paraMin(a.inicio), a.servico.minutos);
  // Com Pix antecipado o horário fica reservado só até `pix.pagarAte`.
  const pix = a.pix || null;
  await runTransaction(db, async (tx) => {
    await reservarBlocos(tx, db, slug, blocos, { agendamentoId: id, data: a.data, expiraEm: pix ? pix.pagarAte : 0 });
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
      status: pix ? 'aguardando_pagamento' : 'pendente',
      ...(pix ? { valorPix: pix.valor, pagarAte: pix.pagarAte } : {}),
      criadoEm: Date.now(),
    });
    // Cadastro automático do cliente (chave = WhatsApp). `marketing` só vira true com o consentimento marcado.
    tx.set(doc(db, 'barbearias', slug, 'clientes', a.cliente.whatsapp), {
      nome: a.cliente.nome, whatsapp: a.cliente.whatsapp, ultimoAgendamento: a.data, ultimoAgendamentoId: id, agendamentos: increment(1), atualizadoEm: Date.now(),
      ...(a.cliente.marketing ? { marketing: true, marketingEm: Date.now() } : {}),
    }, { merge: true });
  });
  return id;
}
