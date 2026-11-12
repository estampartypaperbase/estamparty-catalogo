// Regras de horário, sem acesso a banco de dados.
// A agenda é dividida em blocos de 30 minutos. Cada bloco ocupado vira um
// documento com ID previsível (profissional + dia + hora). Como o ID é único,
// dois clientes nunca conseguem reservar o mesmo bloco.

export const PASSO = 30;

export function paraMin(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function deMin(min) {
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

export function dataISO(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

export function dataDeISO(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function qtdBlocos(minutos) {
  return Math.max(1, Math.ceil(minutos / PASSO));
}

export function chaveBloco(profId, data, min) {
  return `${profId}_${data}_${deMin(min).replace(':', '')}`;
}

// IDs de todos os blocos que um serviço ocupa a partir do horário de início.
export function blocosDe(profId, data, inicioMin, minutos) {
  return Array.from({ length: qtdBlocos(minutos) }, (_, i) => chaveBloco(profId, data, inicioMin + i * PASSO));
}

// Períodos de trabalho que o barbeiro pode ligar ou desligar em cada dia.
export const PERIODOS = [
  { id: 'manha', nome: 'Manhã', abre: '08:00', fecha: '12:00' },
  { id: 'tarde', nome: 'Tarde', abre: '13:00', fecha: '18:00' },
  { id: 'noite', nome: 'Noite', abre: '18:00', fecha: '21:00' },
];

// Devolve sempre {0..6: [{id, abre, fecha}]} (0 = domingo), seja o formato novo
// (horario.semana) ou o antigo (abre, fecha e dias), para os dados já gravados.
export function semanaDe(horario) {
  const semana = {};
  for (let d = 0; d < 7; d++) {
    if (horario.semana) {
      semana[d] = (horario.semana[d] || []).map((p) => ({ ...p }));
    } else {
      semana[d] = (horario.dias || []).includes(d) ? [{ id: 'manha', abre: horario.abre, fecha: horario.fecha }] : [];
    }
  }
  return semana;
}

export function periodosDoDia(horario, date) {
  return semanaDe(horario)[date.getDay()];
}

// Próximos dias em que a barbearia abre (hoje só entra se ainda couber algum horário).
export function proximosDias(horario, agora, quantidade = 14) {
  const dias = [];
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  for (let i = 0; i < quantidade; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i);
    const periodos = periodosDoDia(horario, d);
    if (!periodos.length) continue;
    if (i === 0 && agoraMin >= Math.max(...periodos.map((p) => paraMin(p.fecha))) - PASSO) continue;
    dias.push({ iso: dataISO(d), date: d });
  }
  return dias;
}

// Horários possíveis de um dia (somando os períodos), marcando quais estão livres.
export function listarHorarios({ horario, data, minutos, profId, ocupados, agora }) {
  const duracao = qtdBlocos(minutos) * PASSO;
  const ehHoje = dataISO(agora) === data;
  const agoraMin = agora.getHours() * 60 + agora.getMinutes();
  const porHora = new Map();
  for (const periodo of periodosDoDia(horario, dataDeISO(data))) {
    const abre = paraMin(periodo.abre);
    const fecha = paraMin(periodo.fecha);
    for (let t = abre; t + duracao <= fecha; t += PASSO) {
      if (ehHoje && t <= agoraMin) continue;
      const livre = blocosDe(profId, data, t, minutos).every((k) => !ocupados.has(k));
      porHora.set(t, { min: t, hora: deMin(t), livre });
    }
  }
  return [...porHora.values()].sort((x, y) => x.min - y.min);
}

// Um bloco reservado para quem ainda vai pagar o Pix vale só até `expiraEm`; depois disso o horário volta a ficar livre.
export function blocoVigente(dados, agora = Date.now()) {
  return Boolean(dados) && !(typeof dados.expiraEm === 'number' && dados.expiraEm < agora);
}
