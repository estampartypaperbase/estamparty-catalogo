// Acesso ao banco para o painel do dono (você): login, lista de barbearias,
// cadastro de barbearia nova com o login do barbeiro, e renovação de prazo.

import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, createUserWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, collection, getDoc, getDocs, updateDoc, writeBatch, query, where,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export function aoMudarUsuario(callback) { return onAuthStateChanged(auth, callback); }
export function entrar(email, senha) { return signInWithEmailAndPassword(auth, email, senha); }
export function sair() { return signOut(auth); }
export function recuperarSenha(email) { return sendPasswordResetEmail(auth, email); }

// Só quem tem papel "dono" em usuarios/{uid} entra neste painel.
export async function getPapel(uid) {
  const snap = await getDoc(doc(db, 'usuarios', uid));
  return snap.exists() ? snap.data().papel || null : null;
}

export async function listarBarbearias() {
  const snap = await getDocs(collection(db, 'barbearias'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
}

export async function slugExiste(slug) {
  return (await getDoc(doc(db, 'barbearias', slug))).exists();
}

export async function atualizarBarbearia(slug, campos) {
  await updateDoc(doc(db, 'barbearias', slug), campos);
}

// Cria o login do barbeiro e todos os dados iniciais da barbearia.
// O login é criado num app secundário para o seu login de dono não ser trocado.
export async function criarBarbearia(slug, dados, { email, senha, servicos, profissionais }) {
  const secundario = initializeApp(firebaseConfig, `secundario-${Date.now()}`);
  let uid;
  try {
    const authSec = getAuth(secundario);
    const cred = await createUserWithEmailAndPassword(authSec, email, senha);
    uid = cred.user.uid;
    await signOut(authSec);
  } finally {
    await deleteApp(secundario);
  }
  const lote = writeBatch(db);
  const base = doc(db, 'barbearias', slug);
  lote.set(base, dados);
  servicos.forEach((s, i) => lote.set(doc(base, 'servicos', s.id), { nome: s.nome, minutos: s.minutos, preco: s.preco, ativo: true, ordem: i }));
  profissionais.forEach((p, i) => lote.set(doc(base, 'profissionais', p.id), { nome: p.nome, ativo: true, ordem: i }));
  lote.set(doc(db, 'usuarios', uid), { barbearia: slug, papel: 'barbeiro' });
  await lote.commit();
}

// O dono vê a lista completa de clientes de cada barbearia.
export async function getClientesDe(slug) {
  const snap = await getDocs(collection(db, 'barbearias', slug, 'clientes'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Apaga a barbearia e tudo dentro dela (agenda, clientes, serviços, equipe) e os acessos de barbeiro ligados a ela.
// O e-mail de login do barbeiro continua existindo no Firebase Authentication (só dá para remover pelo console).
export async function excluirBarbearia(slug) {
  const ref = doc(db, 'barbearias', slug);
  for (const sub of ['servicos', 'profissionais', 'ocupados', 'agendamentos', 'clientes']) {
    const docs = (await getDocs(collection(ref, sub))).docs;
    for (let i = 0; i < docs.length; i += 400) {
      const lote = writeBatch(db);
      docs.slice(i, i + 400).forEach((d) => lote.delete(d.ref));
      await lote.commit();
    }
  }
  const acessos = await getDocs(query(collection(db, 'usuarios'), where('barbearia', '==', slug)));
  const lote = writeBatch(db);
  acessos.docs.forEach((d) => lote.delete(d.ref));
  lote.delete(ref);
  await lote.commit();
}
