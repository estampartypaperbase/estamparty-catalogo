// api/buscar-produto.js
// Function gratuita (Vercel) que recebe um link do Mercado Livre e devolve
// nome, imagens, preço, descrição e categoria, usando a API pública oficial do ML.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const link = req.query.link;
  if (!link) {
    return res.status(400).json({ erro: "Envie o link do anúncio em ?link=" });
  }

  try {
    // Segue o link (funciona com links curtos /sec/ também) até a página final
    const resposta = await fetch(link, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EstampartyBot/1.0)" }
    });

    if (!resposta.ok) {
      return res.status(404).json({ erro: "Não consegui abrir essa página do anúncio." });
    }

    const html = await resposta.text();

    const pegarMeta = (propriedade) => {
      const regex = new RegExp(`<meta[^>]+property=["']${propriedade}["'][^>]+content=["']([^"']+)["']`, "i");
      const regexInvertido = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${propriedade}["']`, "i");
      const match = html.match(regex) || html.match(regexInvertido);
      return match ? match[1] : "";
    };

    const nome = pegarMeta("og:title");
    const imagem = pegarMeta("og:image");
    const descricao = pegarMeta("og:description");

    // O preço geralmente não vem no og:, mas costuma aparecer no HTML como
    // "price":123.45 dentro dos dados internos da página
    const matchPreco = html.match(/"price"\s*:\s*"?(\d+(\.\d+)?)"?/);
    const preco = matchPreco ? parseFloat(matchPreco[1]) : "";

    if (!nome) {
      return res.status(422).json({ erro: "Não consegui identificar os dados desse anúncio. Cadastre manualmente." });
    }

    return res.status(200).json({
      nome,
      preco,
      imagem,
      descricao: (descricao || "").slice(0, 400),
      linkOriginal: resposta.url
    });
  } catch (erro) {
    return res.status(500).json({ erro: "Erro ao buscar o anúncio: " + erro.message });
  }
}
