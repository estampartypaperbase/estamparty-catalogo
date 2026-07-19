async function carregarDepoimentos() {
  const wrap = document.getElementById("depoimentosWrap");
  if (!wrap) return;

  try {
    const resposta = await fetch("depoimentos.json", { cache: "no-store" });
    const dados = await resposta.json();
    const depoimentos = (dados.depoimentos || []).slice(0, 10);

    if (!depoimentos.length) { wrap.style.display = "none"; return; }

    // Duplica a lista pra criar o efeito de rolagem contínua (sem "salto" no final)
    const listaDuplicada = [...depoimentos, ...depoimentos];

    wrap.innerHTML = `
      <h2 class="depoimentos-titulo">O que dizem sobre a gente</h2>
      <div class="depoimentos-trilho">
        <div class="depoimentos-track">
          ${listaDuplicada.map(d => `
            <div class="depoimento-avatar">
              <img src="${d.imagem}" alt="Depoimento de cliente" loading="lazy">
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } catch (erro) {
    wrap.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", carregarDepoimentos);
