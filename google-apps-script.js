// Cole este código em: Extensões > Apps Script (dentro da sua planilha do Google)
// Depois siga o passo de "Implantar" explicado no COMO_USAR.md

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var dados = JSON.parse(e.postData.contents);

  sheet.appendRow([
    new Date(),
    dados.nome || "",
    dados.whatsapp || "",
    dados.consentimento_lgpd || ""
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ resultado: "sucesso" }))
    .setMimeType(ContentService.MimeType.JSON);
}
