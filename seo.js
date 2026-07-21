async function aplicarSEO() {
  try {
    const resposta = await fetch("seo.json", { cache: "no-store" });
    const dados = await resposta.json();

    if (dados.titulo) {
      document.title = dados.titulo;
      const ogTitulo = document.querySelector('meta[property="og:title"]');
      if (ogTitulo) ogTitulo.setAttribute("content", dados.titulo);
    }

    if (dados.descricao) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", dados.descricao);
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute("content", dados.descricao);
    }

    if (dados.palavrasChave) {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) metaKeywords.setAttribute("content", dados.palavrasChave);
    }
  } catch (erro) {
    // Se der erro, os valores já escritos direto no HTML continuam valendo normalmente.
  }
}

aplicarSEO();
