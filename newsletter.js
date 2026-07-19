// Troque pela sua URL do Formspree (veja o passo a passo no COMO_USAR.md)
const FORMSPREE_URL = "https://formspree.io/f/SEU_CODIGO_AQUI";

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

    try {
      const resposta = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          whatsapp,
          consentimento_lgpd: "Sim, aceito receber novidades e compartilhar meus dados.",
          origem: "Formulário de novidades - site Estamparty"
        })
      });

      if (resposta.ok) {
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
