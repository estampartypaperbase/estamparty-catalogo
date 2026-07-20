function formatarPrecoRec(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function gerarEmbedVideoRec(link) {
  if (!link) return null;
  const instagram = link.match(/instagram\.com\/(p|reel)\/([^/?]+)/);
  if (instagram) return `https://www.instagram.com/${instagram[1]}/${instagram[2]}/embed`;

  const shortsMatch = link.match(/youtube\.com\/shorts\/([^/?]+)/);
  const youtuBeMatch = link.match(/youtu\.be\/([^/?]+)/);
  const watchMatch = link.match(/youtube\.com\/watch\?v=([^&]+)/);
  const idYoutube = (shortsMatch || youtuBeMatch || watchMatch || [])[1];
  if (idYoutube) return `https://www.youtube.com/embed/${idYoutube}`;

  return null;
}

async function carregarRecomendacao() {
  const wrap = document.getElementById("recomendacaoWrap");
  if (!wrap) return;

  try {
    const resposta = await fetch("recomendacao.json", { cache: "no-store" });
    const produto = await resposta.json();

    if (!produto.ativo || !produto.nome) { wrap.style.display = "none"; return; }

    const imagens = (produto.imagens && produto.imagens.length) ? produto.imagens : [produto.imagem];
    const outrasFotos = imagens.slice(1, 5);
    const embedVideo = gerarEmbedVideoRec(produto.video);

    const descricaoCompleta = produto.descricao || "";
    const descricaoCurta = descricaoCompleta.slice(0, 200);
    const temMais = descricaoCompleta.length > 200;

    wrap.innerHTML = `
      <h2 class="recomendacao-titulo">Nossa recomendação</h2>
      <div class="recomendacao-card">
        <div class="recomendacao-galeria">
          <div class="recomendacao-foto-principal">
            <img id="recImgPrincipal" src="${imagens[0]}" alt="${produto.nome}">
          </div>
          ${outrasFotos.length ? `
            <div class="recomendacao-miniaturas">
              ${outrasFotos.map(url => `<button class="rec-mini" data-src="${url}"><img src="${url}" alt=""></button>`).join("")}
            </div>
          ` : ""}
          ${embedVideo ? `
            <div class="recomendacao-video">
              <iframe src="${embedVideo}" loading="lazy" allowtransparency="true" frameborder="0" scrolling="no" allowfullscreen></iframe>
            </div>
          ` : ""}
        </div>
        <div class="recomendacao-info">
          <div class="card-cat">${produto.categoria || ""}</div>
          <h3>${produto.nome}</h3>
          <div class="price-por" style="font-size:1.8rem;">${formatarPrecoRec(produto.preco)}</div>
          <p class="recomendacao-desc" id="recDescricao">${temMais ? descricaoCurta + "…" : descricaoCompleta}</p>
          ${temMais ? `<button class="rec-ver-mais" id="recVerMais">Ver mais</button>` : ""}
          <a class="card-cta" href="${produto.linkML}" target="_blank" rel="noopener noreferrer nofollow sponsored">
            <img src="mercadolivre-icon.png" alt="" class="cta-icone-ml">
            Ver no Mercado Livre
          </a>
        </div>
      </div>
    `;

    wrap.querySelectorAll(".rec-mini").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("recImgPrincipal").src = btn.dataset.src;
      });
    });

    const btnVerMais = document.getElementById("recVerMais");
    if (btnVerMais) {
      let aberto = false;
      btnVerMais.addEventListener("click", () => {
        aberto = !aberto;
        document.getElementById("recDescricao").textContent = aberto ? descricaoCompleta : descricaoCurta + "…";
        btnVerMais.textContent = aberto ? "Ver menos" : "Ver mais";
      });
    }
  } catch (erro) {
    wrap.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", carregarRecomendacao);
