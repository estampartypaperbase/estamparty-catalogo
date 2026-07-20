// Troque pela sua chave da API do YouTube Data v3 (veja o passo a passo no COMO_USAR.md)
const YT_API_KEY = "AIzaSyAdFQuOuKZI6GAT1osPdckHPlefR9VHyV0";
const YT_CHANNEL_HANDLE = "EstampartyVideos"; // sem o @
const YT_MAX_VIDEOS = 24;

async function buscarPlaylistDeUploads() {
  // Tenta achar o canal pelo "handle" (@EstampartyVideos)
  const urlHandle = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${YT_CHANNEL_HANDLE}&key=${YT_API_KEY}`;
  let resp = await fetch(urlHandle);
  let dados = await resp.json();

  if (dados.error) throw new Error(dados.error.message || "Erro ao consultar a API do YouTube.");

  // Se não achar por handle, tenta por busca (fallback pra contas mais antigas)
  if (!dados.items || !dados.items.length) {
    const urlBusca = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(YT_CHANNEL_HANDLE)}&key=${YT_API_KEY}`;
    const respBusca = await fetch(urlBusca);
    const dadosBusca = await respBusca.json();
    if (dadosBusca.error) throw new Error(dadosBusca.error.message || "Erro ao consultar a API do YouTube.");
    if (!dadosBusca.items || !dadosBusca.items.length) throw new Error("Canal não encontrado.");

    const channelId = dadosBusca.items[0].snippet.channelId;
    const urlPorId = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YT_API_KEY}`;
    const respPorId = await fetch(urlPorId);
    dados = await respPorId.json();
  }

  if (!dados.items || !dados.items.length) throw new Error("Canal não encontrado.");
  return dados.items[0].contentDetails.relatedPlaylists.uploads;
}

async function buscarVideosDaPlaylist(playlistId) {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${YT_MAX_VIDEOS}&key=${YT_API_KEY}`;
  const resp = await fetch(url);
  const dados = await resp.json();
  if (dados.error) throw new Error(dados.error.message || "Erro ao buscar os vídeos.");
  return (dados.items || []).map(item => ({
    id: item.snippet.resourceId.videoId,
    titulo: item.snippet.title,
    thumb: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || ""
  }));
}

function criarCardVideo(video) {
  return `
    <article class="yt-card">
      <div class="yt-card-video" data-id="${video.id}">
        <img src="${video.thumb}" alt="${video.titulo}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;">
      </div>
      <div class="yt-card-info">
        <p class="yt-card-titulo">${video.titulo}</p>
        <a class="yt-card-link" href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener noreferrer">Ver no YouTube ↗</a>
      </div>
    </article>
  `;
}

function ativarPlayNoClique() {
  document.querySelectorAll(".yt-card-video").forEach(div => {
    div.addEventListener("click", () => {
      const id = div.dataset.id;
      div.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>`;
    }, { once: true });
  });
}

async function iniciar() {
  const grid = document.getElementById("ytGrid");

  if (YT_API_KEY === "SUA_CHAVE_DA_API_AQUI") {
    grid.innerHTML = `<div class="yt-erro">
      A busca automática de vídeos ainda não foi configurada. Veja o passo a passo no
      COMO_USAR.md pra gerar sua chave gratuita da API do YouTube.
    </div>`;
    return;
  }

  try {
    const playlistId = await buscarPlaylistDeUploads();
    const videos = await buscarVideosDaPlaylist(playlistId);

    if (!videos.length) {
      grid.innerHTML = `<div class="yt-erro">Nenhum vídeo encontrado no canal ainda.</div>`;
      return;
    }

    grid.innerHTML = videos.map(criarCardVideo).join("");
    ativarPlayNoClique();
  } catch (erro) {
    grid.innerHTML = `<div class="yt-erro">Não foi possível carregar os vídeos: ${erro.message}</div>`;
  }
}

iniciar();
