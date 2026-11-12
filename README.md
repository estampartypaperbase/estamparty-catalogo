# Agenda para barbearias

Sistema padrão de agendamento. O mesmo código atende várias barbearias; o que
muda é a configuração de cada uma (nome, logo, cor, fundo, serviços).

## Arquivos

- `wrangler.jsonc`: diz ao Cloudflare que o site está na pasta `public`.
- `public/index.html`: página única do site.
- `public/styles.css`: aparência; cores e fundo vêm da configuração da barbearia.
- `public/js/app.js`: telas (entrada de 3 segundos, escolha do serviço).
- `public/js/data.js`: único lugar que acessa os dados. Hoje usa exemplos; na etapa 4
  passa a usar o Firestore.
- `public/js/firebase-config.js`: configuração pública do projeto Firebase.
- `public/js/horarios.js`: regras de horário (blocos de 30 minutos; períodos manhã, tarde e noite por dia da semana).
- `firestore.rules`: regras de segurança do banco (colar em Firebase > Firestore > Regras). Cliente só cria o próprio agendamento; barbeiro só a própria barbearia, dentro do prazo; dono tudo.
- `public/painel.html` e `public/js/painel.js`: painel do barbeiro (login, agenda do dia, agendar cliente, serviços e preços, equipe, ajustes).
- `public/js/data-painel.js`: acesso ao banco do painel. `public/js/util.js`: peças comuns.
- `public/dono.html`, `public/js/dono.js` e `public/js/data-dono.js`: painel do dono (cadastrar barbearia com logo, nome, cores e prazo de uso; renovar, suspender).
- `public/js/pix.js`, `pix-ui.js`, `politica.js`, `reserva.js`, `vendor/qrcode.js`: Pix antecipado (código copia e cola e QR gerados no aparelho), texto da política de cancelamento e reserva de horário com prazo de pagamento.
- `public/js/clientes-ui.js`: lista de clientes e mailing de WhatsApp (painel do barbeiro e do dono). Clientes ficam em `barbearias/{slug}/clientes/{whatsapp}`.
- `public/sw.js`, `public/js/pwa.js`, `public/js/qr-ui.js`: instalar como app (nome e ícone da barbearia) e QR Code do link de agendamento.
- Painel do barbeiro, Agenda: bloqueio de horários (almoço, folga, dia inteiro). Aba Histórico: lista por dia e resumo financeiro do período.
- `public/js/pacotes-ui.js`: fidelidade (cartão de carimbos) e pacotes (catálogo, venda, saldo e baixa), ligados pelo dono por barbearia (campo `recursos`).

## Como a barbearia é escolhida

Pelo endereço: `/barbearia-modelo`, `/corte-fino` ou `?b=studio-vila`.
O Cloudflare abre o mesmo site para qualquer endereço (regra no wrangler.jsonc).
