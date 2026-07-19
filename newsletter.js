// Troque pela sua URL do Formspree (veja o passo a passo no COMO_USAR.md)
const FORMSPREE_URL = "https://formspree.io/f/mrenkggr";

// Opcional: troque pela URL do seu Google Apps Script pra também cair numa planilha
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzoz9a4QHcPIugLFjfHJKBy8lfEJO-oXvFn8-BSre8Sz0MkXq7Zh9DN7hVqUSQO2p77Cw/exec";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formNewsletter");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = document.getElementById("statusNewsletter");
    const btn = document.getElementById("btnEnviarNewsletter");

    if (FORMSPREE_URL.includes("SEU_CODIGO_AQUI")) {
      status.textContent = "⚠️ O formulário ainda não foi configurado (veja o COMO_USAR.md).";
      return;
    }

    const nome = document.getElementById("nl_nome").value.trim();
    const whatsapp = document.getElementById("nl_whatsapp").value.trim();
    const consentimento = document.getElementById("nl_consentimento").checked;

    if (!consentimento) {
      status.textContent = "É necessário aceitar o compartilhamento de dados pra continuar.";
      return;
    }

    btn.disabled = true;
    status.textContent = "Enviando...";

    const corpo = {
      nome,
      whatsapp,
      consentimento_lgpd: "Sim, aceito receber novidades e compartilhar meus dados.",
      origem: "Formulário de novidades - site Estamparty"
    };

    try {
      const chamadas = [
        fetch(FORMSPREE_URL, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(corpo)
        })
      ];

      // Se a planilha do Google estiver configurada, envia pra ela também.
      // Apps Script não devolve resposta legível pro navegador (bloqueio de CORS
      // do próprio Google), por isso usamos "no-cors": o envio funciona mesmo
      // sem conseguirmos ler a resposta de volta.
      if (!GOOGLE_SHEETS_URL.includes("SUA_URL_DO_APPS_SCRIPT")) {
        chamadas.push(fetch(GOOGLE_SHEETS_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo)
        }));
      }

      const [respostaFormspree] = await Promise.all(chamadas);

      if (respostaFormspree.ok) {
        status.textContent = "✅ Cadastrado! Em breve você recebe nossas novidades.";
        form.reset();
      } else {
        status.textContent = "❌ Não foi possível enviar. Tente novamente em instantes.";
      }
    } catch (erro) {
      status.textContent = "❌ Erro de conexão. Tente novamente.";
    } finally {
      btn.disabled = false;
    }
  });
});
