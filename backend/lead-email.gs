/**
 * Recebe os leads do simulador, grava numa planilha e envia um e-mail
 * personalizado pelo Gmail de quem publicar este script.
 *
 * Instalação: veja backend/README.md
 */

var DESTINATARIO = "o.rafaelpequino@gmail.com";
var NOME_REMETENTE = "Simulador Luciana Szarota";
// Alias "Enviar e-mail como" já confirmado no Gmail. Deixe vazio para enviar pelo Gmail padrão.
var REMETENTE = "leads@rafaelpequino.com.br";

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (!d || !d.nome || !d.telefoneDigitos || !d.email) {
      return resposta("invalido");
    }
    salvarNaPlanilha(d);
    enviarEmail(d);
    return resposta("ok");
  } catch (err) {
    return resposta("erro");
  }
}

function resposta(status) {
  return ContentService.createTextOutput(status);
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Evita que textos digitados pelo lead sejam interpretados como fórmula na planilha.
function txt(s) {
  s = String(s == null ? "" : s);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

var CABECALHO = [
  "Data", "Nome", "WhatsApp", "E-mail", "Conquista", "Valor do bem", "Disponível por mês",
  "Disponível à vista", "Urgência", "Decisão",
  "Consórcio - Quando conquista", "Consórcio - Entrada/lance", "Consórcio - Parcela mensal",
  "Consórcio - Prazo", "Consórcio - Total a pagar", "Consórcio - Custo adicional", "Consórcio - Alerta",
  "Financiamento - Condição", "Financiamento - Quando conquista", "Financiamento - Entrada",
  "Financiamento - Parcela mensal", "Financiamento - Prazo", "Financiamento - Total a pagar",
  "Financiamento - Custo adicional", "Financiamento - Alerta",
  "Investimento - Prazo para juntar", "Investimento - Inicial", "Investimento - Aporte mensal",
  "Investimento - Total investido", "Investimento - Rendimento", "Investimento - Valor acumulado",
  "Economia com o consórcio", "Vantagens do consórcio",
];

function salvarNaPlanilha(d) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) return;
  var sh = ss.getSheetByName("Leads") || ss.insertSheet("Leads");
  sh.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO]).setFontWeight("bold");
  sh.setFrozenRows(1);

  var c = d.consorcio || {};
  var f = d.financiamento || {};
  var i = d.investimento || {};
  var indisponivel = d.financiamento ? "" : "Indisponível";
  sh.appendRow([
    new Date(), txt(d.nome), txt(d.telefone), txt(d.email), txt(d.conquista), d.valor,
    d.parcelaDisponivel, d.entrada, txt(d.urgencia), txt(d.decisao),
    c.quando, c.entrada, c.parcela, c.prazo, c.total, c.taxa, c.alerta,
    f.tabela || indisponivel, f.quando || indisponivel, f.entrada, f.parcela, f.prazo, f.total, f.juros, f.alerta,
    i.prazo, i.inicial, i.aporte, i.investido, i.rendimento, i.acumulado,
    d.economia, d.vantagens,
  ].map(function (v) { return v == null ? "" : v; }));
}

function linha(rotulo, valor) {
  return (
    '<tr><td style="padding:8px 0;color:#6b7a90;font-size:13px;width:44%">' + esc(rotulo) +
    '</td><td style="padding:8px 0;color:#051837;font-size:14px;font-weight:600">' + esc(valor) + "</td></tr>"
  );
}

function bloco(titulo, cor, linhas) {
  return (
    '<div style="margin:18px 0;padding:14px 16px;border-left:4px solid ' + cor +
    ';background:#f5f8fc;border-radius:8px"><div style="font-weight:700;color:#051837;margin-bottom:4px">' +
    esc(titulo) + '</div><table style="width:100%;border-collapse:collapse">' + linhas + "</table></div>"
  );
}

function enviarEmail(d) {
  var wa = "https://wa.me/55" + d.telefoneDigitos + "?text=" +
    encodeURIComponent("Olá " + d.nome.split(" ")[0] + "! Aqui é a Luciana, vi sua simulação de consórcio e quero te ajudar.");

  var c = d.consorcio;
  var f = d.financiamento;
  var i = d.investimento;

  var cons = c
    ? bloco("Consórcio" + (c.alerta ? " — " + c.alerta : ""), "#19a85b",
        linha("Quando conquista", c.quando) + linha("Entrada / lance hoje", c.entrada) +
        linha("Parcela mensal", c.parcela) + linha("Prazo", c.prazo) +
        linha("Total a pagar", c.total) + linha("Custo adicional", c.taxa))
    : "";
  var fin = f
    ? bloco("Financiamento", "#d93636",
        (f.tabela ? linha("Condição", f.tabela) : "") +
        linha("Quando conquista", f.quando) + linha("Entrada / lance hoje", f.entrada) +
        linha("Parcela mensal", f.parcela) + linha("Prazo", f.prazo) +
        linha("Total a pagar", f.total) + linha("Custo adicional", f.juros) +
        (f.alerta ? linha("Alerta", f.alerta) : ""))
    : bloco("Financiamento", "#d93636", linha("Situação", "Indisponível para este tipo de conquista"));
  var inv = i
    ? bloco("Investimento próprio", "#1f5fbf",
        linha("Prazo para juntar o valor", i.prazo) + linha("Investimento inicial", i.inicial) +
        linha("Aporte mensal", i.aporte) + linha("Total investido (do bolso)", i.investido) +
        linha("Rendimento (1% ao mês)", i.rendimento) + linha("Valor acumulado", i.acumulado))
    : "";
  var eco = d.economia
    ? '<div style="margin:18px 0;padding:12px 16px;background:#e8f7ef;border-radius:8px;color:#0b5a30;font-size:14px;font-weight:600">' +
      esc(d.economia) + (d.vantagens ? '<div style="font-weight:400;font-size:13px;margin-top:4px">' + esc(d.vantagens) + "</div>" : "") + "</div>"
    : d.vantagens
    ? '<div style="margin:18px 0;padding:12px 16px;background:#e8f7ef;border-radius:8px;color:#0b5a30;font-size:13px">' + esc(d.vantagens) + "</div>"
    : "";

  var botao =
    '<div style="text-align:center;margin-top:22px"><a href="' + wa +
    '" style="display:inline-block;background:#25d366;color:#04230f;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:10px">Chamar no WhatsApp</a></div>';

  var html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;background:#fff;border:1px solid #e1e8f2;border-radius:14px;overflow:hidden">' +
    '<div style="background:#051837;color:#fff;padding:22px 24px"><div style="font-size:12px;opacity:.7">NOVO LEAD DO SIMULADOR</div>' +
    '<div style="font-size:22px;font-weight:700;margin-top:4px">' + esc(d.nome) + "</div></div>" +
    '<div style="padding:22px 24px">' +
    '<table style="width:100%;border-collapse:collapse">' +
    linha("WhatsApp", d.telefone) + linha("E-mail", d.email) + linha("Conquista", d.conquista) +
    linha(d.valorLabel || "Valor", d.valor) + linha("Disponível por mês", d.parcelaDisponivel) +
    linha("Disponível à vista", d.entrada) + linha("Urgência", d.urgencia) + linha("Decisão", d.decisao) +
    "</table>" + botao +
    '<div style="margin-top:26px;padding-top:20px;border-top:1px solid #e1e8f2">' +
    '<div style="font-size:16px;font-weight:700;color:#051837;margin-bottom:4px">Resultado da simulação:</div>' +
    eco + cons + fin + inv + "</div>" + botao +
    "</div></div>";

  var opcoes = {
    htmlBody: html,
    name: NOME_REMETENTE,
    replyTo: d.email,
  };
  if (REMETENTE) opcoes.from = REMETENTE;

  GmailApp.sendEmail(DESTINATARIO, "Novo lead: " + d.nome + " — " + d.conquista + " " + d.valor, "Novo lead de " + d.nome + " (" + d.telefone + ")", opcoes);
}
