// Reserva dos blocos de horário dentro de uma transação (usada pelo cliente e pelo barbeiro).
// Um bloco de quem não pagou o Pix a tempo está vencido: pode ser tomado por outro cliente,
// e o agendamento antigo passa a "expirado".

import { doc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { blocoVigente } from './horarios.js';

export async function reservarBlocos(tx, db, slug, blocos, { agendamentoId, data, expiraEm }) {
  const agora = Date.now();
  const refs = blocos.map((b) => doc(db, 'barbearias', slug, 'ocupados', b));
  const snaps = [];
  for (const ref of refs) snaps.push(await tx.get(ref));
  const vencidos = new Set();
  for (const s of snaps) {
    if (!s.exists()) continue;
    if (blocoVigente(s.data(), agora)) throw new Error('ocupado');
    vencidos.add(s.data().agendamentoId);
  }
  // O agendamento antigo (que não pagou a tempo) passa a "expirado". O cliente não pode ler o agendamento
  // dos outros, então a troca é feita direto; as regras do banco só aceitam isso para prazos vencidos.
  vencidos.forEach((id) => tx.update(doc(db, 'barbearias', slug, 'agendamentos', id), { status: 'expirado', atualizadoEm: agora }));
  refs.forEach((ref) => tx.set(ref, expiraEm ? { data, agendamentoId, expiraEm } : { data, agendamentoId }));
}
