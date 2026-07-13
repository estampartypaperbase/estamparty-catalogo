/*
  ================================================================
  ARQUIVO DE PRODUTOS — edite só este arquivo para gerenciar o catálogo
  ================================================================

  Para ADICIONAR um produto: copie um bloco { ... } inteiro (do abre
  chave ao fecha chave + vírgula) e cole antes do "];" no final,
  depois troque os valores.

  Para REMOVER um produto: apague o bloco { ... } inteiro dele.

  Campos:
    id        -> número único (não repita)
    nome      -> nome do produto
    categoria -> usada para os filtros no topo do site
    preco     -> número, use ponto (.) para centavos. Ex: 149.90
    precoDe   -> (opcional) preço "de", pra mostrar desconto riscado. Apague a linha se não tiver.
    imagem    -> link direto da foto (pode ser do próprio Mercado Livre, clique com botão direito
                 na foto do anúncio > "Copiar endereço da imagem")
    video     -> (opcional) link de vídeo (YouTube, ou link direto .mp4). Apague a linha se não tiver.
    descricao -> texto curto sobre o produto
    linkML    -> SEU link de afiliado do Mercado Livre para esse produto
    destaque  -> true ou false — produtos com true aparecem primeiro / com selo "Destaque"
*/

const PRODUTOS = [
  {
    id: 1,
    nome: "Fone de Ouvido Bluetooth JBL Tune 510BT",
    categoria: "Eletrônicos",
    preco: 249.90,
    precoDe: 329.90,
    imagem: "https://http2.mlstatic.com/D_NQ_NP_2X_838669-MLA47569369553_092021-F.jpg",
    video: "",
    descricao: "Fone sem fio com até 40h de bateria, dobrável e com áudio JBL Pure Bass.",
    linkML: "https://mercadolivre.com/sec/COLOQUE_SEU_LINK_1",
    destaque: true
  },
  {
    id: 2,
    nome: "Cafeteira Elétrica Mondial 30 Xícaras",
    categoria: "Casa",
    preco: 119.90,
    precoDe: "",
    imagem: "https://http2.mlstatic.com/D_NQ_NP_2X_838669-MLA47569369554_092021-F.jpg",
    video: "",
    descricao: "Cafeteira compacta, ideal para o dia a dia, com jarra de vidro resistente.",
    linkML: "https://mercadolivre.com/sec/COLOQUE_SEU_LINK_2",
    destaque: false
  },
  {
    id: 3,
    nome: "Kit Panelas Antiaderentes 5 Peças",
    categoria: "Casa",
    preco: 189.90,
    precoDe: 259.90,
    imagem: "https://http2.mlstatic.com/D_NQ_NP_2X_838669-MLA47569369555_092021-F.jpg",
    video: "",
    descricao: "Kit completo com revestimento antiaderente, cabo ergonômico e fácil de limpar.",
    linkML: "https://mercadolivre.com/sec/COLOQUE_SEU_LINK_3",
    destaque: false
  },
  {
    id: 4,
    nome: "Smartwatch Esportivo Tela Amoled",
    categoria: "Eletrônicos",
    preco: 179.90,
    precoDe: "",
    imagem: "https://http2.mlstatic.com/D_NQ_NP_2X_838669-MLA47569369556_092021-F.jpg",
    video: "",
    descricao: "Monitor cardíaco, contador de passos, resistente à água, várias cores.",
    linkML: "https://mercadolivre.com/sec/COLOQUE_SEU_LINK_4",
    destaque: true
  }
];
