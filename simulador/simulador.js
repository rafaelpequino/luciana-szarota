(function () {
  var WHATSAPP = "5511910060796";
  var RATE_INVEST = 0.01;
  var RATE_FINANCE = 0.018;
  var RATE_FINANCE_HOME = 0.01;
  var ADMIN_FEE = 0.2;

  var ICONS = {
    imovel: '<path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6"/>',
    auto: '<path d="M5 16H3v-4l2-5h14l2 5v4h-2M5 16h14M3 12h18"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/>',
    pesado: '<path d="M2 6h12v10H2zM14 9h4l4 4v3h-8"/><circle cx="6.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/>',
    reforma: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  };

  // finMax / consMax: prazos máximos (meses) usados nas simulações.
  var ITEMS = {
    imovel: { label: "Imóvel", em: "no imóvel", o: "o imóvel", seu: "seu imóvel", doSeu: "do seu imóvel", valorLabel: "Valor do imóvel", caro: "mais caro", finMax: 420, consMax: 240 },
    auto: { label: "Automóvel", em: "no automóvel", o: "o automóvel", seu: "seu automóvel", doSeu: "do seu automóvel", valorLabel: "Valor do automóvel", caro: "mais caro", finMax: 84, consMax: 100 },
    pesado: { label: "Veículo pesado", em: "no veículo pesado", o: "o veículo pesado", seu: "seu veículo pesado", doSeu: "do seu veículo pesado", valorLabel: "Valor do veículo pesado", caro: "mais caro", finMax: 120, consMax: 100 },
    reforma: { label: "Reforma", em: "na reforma", o: "a reforma", seu: "sua reforma", doSeu: "da sua reforma", valorLabel: "Valor da reforma", caro: "mais cara", finMax: 0, consMax: 100 },
  };

  function seq(from, to, step) {
    var out = [];
    for (var v = from; v <= to; v += step) out.push(v);
    return out;
  }

  var VALORES = [].concat(
    seq(30000, 150000, 10000),
    seq(175000, 500000, 25000),
    seq(550000, 1000000, 50000),
    seq(1100000, 5000000, 100000)
  );
  var PARCELAS = seq(200, 10000, 50);

  function entradaValues(max) {
    var out = [];
    var v = 0;
    while (v <= max) {
      out.push(v);
      v += v < 10000 ? 500 : v < 50000 ? 1000 : v < 100000 ? 2500 : v < 500000 ? 5000 : 10000;
    }
    if (out[out.length - 1] !== max) out.push(max);
    return out;
  }

  var brl = function (n) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(Math.round(n));
  };

  function val(x, a) {
    return typeof x === "function" ? x(a) : x;
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---------- Cálculos ----------
  function pmt(principal, rate, n) {
    return (principal * rate) / (1 - Math.pow(1 + rate, -n));
  }

  function financeRate(a) {
    return a.objetivo === "imovel" ? RATE_FINANCE_HOME : RATE_FINANCE;
  }

  // Parcela mínima: a menor entre financiamento (Price, prazo máximo) e consórcio (prazo máximo).
  function minMonthly(a) {
    var item = ITEMS[a.objetivo];
    var V = a.valor;
    var e = a.entrada || 0;
    var min = (V * (1 + ADMIN_FEE) - e) / item.consMax;
    if (item.finMax) min = Math.min(min, pmt(V - e, financeRate(a), item.finMax));
    return Math.ceil(min / 50) * 50;
  }

  function investPlan(target, entry, monthly) {
    var balance = entry;
    var n = 0;
    while (balance < target && n < 600) {
      balance = balance * (1 + RATE_INVEST) + monthly;
      n++;
    }
    var invested = entry + monthly * n;
    return { months: n, balance: balance, invested: invested, gain: balance - invested };
  }

  function financeTerm(principal, rate, monthly, maxTerm) {
    var best = 6;
    for (var n = 6; n <= maxTerm; n++) {
      if (Math.abs(pmt(principal, rate, n) - monthly) <
          Math.abs(pmt(principal, rate, best) - monthly)) best = n;
    }
    return best;
  }

  function duration(months) {
    if (months >= 600) return "Mais de 50 anos";
    var y = Math.floor(months / 12);
    var m = months % 12;
    var parts = [];
    if (y) parts.push(y + (y === 1 ? " ano" : " anos"));
    if (m) parts.push(m + (m === 1 ? " mês" : " meses"));
    return parts.join(" e ") || "Imediato";
  }

  function compute(a) {
    var item = ITEMS[a.objetivo];
    var V = a.valor;
    var e = a.entrada;
    var m = Math.max(a.parcela, minMonthly(a));

    var own = investPlan(V, e, m);

    var fin = null;
    if (item.finMax) {
      var rate = financeRate(a);
      var loan = V - e;
      var n2 = financeTerm(loan, rate, m, item.finMax);
      var p2 = pmt(loan, rate, n2);
      fin = { rate: rate, months: n2, pmt: p2, total: e + p2 * n2, interest: p2 * n2 - loan, over: p2 > m * 1.1 };
    }

    var letter = V * (1 + ADMIN_FEE);
    var remaining = letter - e;
    var n3 = Math.min(item.consMax, Math.max(12, Math.round(remaining / m)));
    var p3 = remaining / n3;
    var cons = { months: n3, pmt: p3, total: letter, fee: V * ADMIN_FEE, over: p3 > m * 1.1 };

    return { own: own, fin: fin, cons: cons };
  }

  // ---------- Perguntas ----------
  var QUESTIONS = [
    {
      id: "objetivo",
      type: "choice",
      chipLabel: "Conquista",
      chip: function (v) {
        return ITEMS[v].label;
      },
      title: "Qual conquista você está buscando?",
      hint: "Escolha a opção que mais se aproxima.",
      options: [
        { icon: "imovel", label: "Imóvel", value: "imovel" },
        { icon: "auto", label: "Automóvel", value: "auto" },
        { icon: "pesado", label: "Veículo pesado", value: "pesado" },
        { icon: "reforma", label: "Reforma", value: "reforma" },
      ],
    },
    {
      id: "valor",
      type: "range",
      chipLabel: "Valor",
      chip: function (v) {
        return brl(v) + (v === 5000000 ? "+" : "");
      },
      title: function (a) {
        return "Qual valor você pensa em investir " + ITEMS[a.objetivo].em + "?";
      },
      hint: "Arraste para ajustar. Uma estimativa já ajuda.",
      values: function () {
        return VALORES;
      },
      initial: 250000,
      plus: true,
    },
    {
      id: "entrada",
      type: "range",
      chipLabel: "À vista",
      chip: brl,
      title: "Qual valor à vista você tem disponível neste momento para entrada/lance?",
      hint: function (a) {
        return "O valor deve estar entre R$ 0,00 e metade do valor " + ITEMS[a.objetivo].doSeu + ".";
      },
      values: function (a) {
        return entradaValues(a.valor / 2);
      },
      initial: 0,
    },
    {
      id: "parcela",
      type: "range",
      chipLabel: "Por mês",
      chip: function (v) {
        return brl(v) + (v === 10000 ? "+" : "");
      },
      title: "Quanto cabe no seu bolso por mês?",
      hint: "Pense em um valor confortável, sem apertar seu orçamento.",
      values: function () {
        return PARCELAS;
      },
      initial: 1500,
      plus: true,
      minimum: minMonthly,
      errorText: function (a, min) {
        return (
          "Esse valor não é suficiente para conquistar " + ITEMS[a.objetivo].seu +
          " com as condições informadas. A parcela precisa ser de pelo menos " +
          brl(min) + " por mês."
        );
      },
    },
    {
      id: "urgencia",
      type: "choice",
      chipLabel: "Urgência",
      chip: function (v) {
        return v;
      },
      title: function (a) {
        return "Qual a sua urgência para conquistar " + ITEMS[a.objetivo].o + "?";
      },
      hint: "",
      options: [
        { label: "O mais rápido possível", value: "O mais rápido possível" },
        { label: "Em até 3 meses", value: "Em até 3 meses" },
        { label: "Em até 6 meses", value: "Em até 6 meses" },
        { label: "Tenho prazo para planejar", value: "Tenho prazo para planejar" },
      ],
    },
    {
      id: "decisao",
      type: "choice",
      chipLabel: "Decisão",
      chip: function (v) {
        return v;
      },
      title: "Para definir os próximos passos, a decisão depende só de você ou de mais alguém?",
      hint: "",
      options: [
        { label: "Decido sozinho(a)", value: "Sozinho(a)" },
        { label: "Decido junto com meu/minha cônjuge", value: "Com cônjuge" },
        { label: "Decido junto com um familiar", value: "Com familiar" },
        { label: "Decido junto com outra pessoa", value: "Com outra pessoa" },
      ],
    },
  ];

  var answers = {};
  var index = -1; // -1 intro, 0..n-1 perguntas, n contato, n+1 resultado
  var total = QUESTIONS.length;

  var $ = function (id) {
    return document.getElementById(id);
  };
  var screens = {
    intro: $("screen-intro"),
    question: $("screen-question"),
    contact: $("screen-contact"),
    result: $("screen-result"),
  };
  var form = $("contact-form");
  var slider = $("q-slider");
  var currentRange = null;

  function show(name, back) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.remove("is-active", "is-back");
    });
    screens[name].classList.add("is-active");
    if (back) screens[name].classList.add("is-back");
    window.scrollTo(0, 0);
    var h = screens[name].querySelector("h1,h2");
    if (h) {
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
    }
  }

  function renderChips() {
    var box = $("chips");
    box.innerHTML = "";
    var locked = index > total;
    for (var i = 0; i < total; i++) {
      (function (i) {
        var q = QUESTIONS[i];
        if (answers[q.id] == null) return;
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (i === index ? " is-current" : "");
        b.disabled = locked;
        b.setAttribute("aria-label", "Corrigir: " + q.chipLabel);
        var s = document.createElement("span");
        s.textContent = q.chipLabel;
        var st = document.createElement("strong");
        st.textContent = q.chip(answers[q.id]);
        b.appendChild(s);
        b.appendChild(st);
        b.addEventListener("click", function () {
          go(i, i < index);
        });
        box.appendChild(b);
      })(i);
    }
    box.hidden = !box.children.length || index > total;
  }

  function updateChrome() {
    var inFlow = index >= 0 && index <= total;
    $("progress").hidden = !inFlow;
    $("btn-back").hidden = !inFlow;
    $("progress-bar").style.width =
      Math.round(((index + 1) / (total + 1)) * 100) + "%";
    renderChips();
  }

  function go(step, back) {
    index = step;
    if (index < 0) {
      show("intro", back);
    } else if (index < total) {
      renderQuestion(QUESTIONS[index]);
      show("question", back);
    } else if (index === total) {
      show("contact", back);
    } else {
      renderResult();
      show("result", back);
    }
    updateChrome();
  }

  function nearestIndex(values, x) {
    var best = 0;
    for (var i = 1; i < values.length; i++) {
      if (Math.abs(values[i] - x) < Math.abs(values[best] - x)) best = i;
    }
    return best;
  }

  function renderQuestion(q) {
    $("q-count").textContent = "Pergunta " + (index + 1) + " de " + total;
    $("q-title").textContent = val(q.title, answers);
    $("q-hint").textContent = val(q.hint, answers) || "";
    var box = $("q-options");
    var rangeBox = $("q-range");
    box.innerHTML = "";
    box.hidden = q.type !== "choice";
    rangeBox.hidden = q.type !== "range";
    if (q.type === "range") renderRange(q);
    else renderChoices(q, box);
  }

  function renderChoices(q, box) {
    q.options.forEach(function (o) {
      var selected = answers[q.id] === o.value;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "option" + (selected ? " is-selected" : "");
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(selected));
      if (o.icon) {
        var i = document.createElement("span");
        i.className = "icon";
        i.innerHTML =
          '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICONS[o.icon] + "</svg>";
        b.appendChild(i);
      }
      var t = document.createElement("span");
      t.textContent = o.label;
      b.appendChild(t);
      b.addEventListener("click", function () {
        answers[q.id] = o.value;
        b.classList.add("is-selected");
        setTimeout(function () {
          go(index + 1);
        }, 220);
      });
      box.appendChild(b);
    });
  }

  function formatRange(q, values, i) {
    return brl(values[i]) + (q.plus && i === values.length - 1 ? "+" : "");
  }

  function paintSlider() {
    var r = currentRange;
    var i = Number(slider.value);
    var max = Number(slider.max) || 1;
    slider.style.setProperty("--pct", (i / max) * 100 + "%");
    var text = formatRange(r.q, r.values, i);
    $("q-value").textContent = text;
    slider.setAttribute("aria-valuetext", text);

    var invalid = false;
    var msg = "";
    if (r.q.minimum) {
      var min = r.q.minimum(answers);
      // A última opção ("10.000+") é aberta e sempre permitida.
      invalid = r.values[i] < min && i < r.values.length - 1;
      if (invalid) msg = r.q.errorText(answers, min);
    }
    $("q-range").classList.toggle("is-invalid", invalid);
    $("q-error").textContent = msg;
    $("q-next").disabled = invalid;
  }

  function renderRange(q) {
    var values = q.values(answers);
    currentRange = { q: q, values: values };
    var start = answers[q.id] != null ? answers[q.id] : q.initial;
    if (answers[q.id] == null && q.minimum) start = Math.max(start, q.minimum(answers));
    slider.min = 0;
    slider.max = values.length - 1;
    slider.step = 1;
    slider.value = nearestIndex(values, start);
    $("q-min").textContent = formatRange(q, values, 0);
    $("q-max").textContent = formatRange(q, values, values.length - 1);
    paintSlider();
  }

  // Mantém respostas dependentes coerentes com as respostas anteriores.
  function normalizeAnswers() {
    if (answers.entrada != null && answers.valor != null && answers.entrada > answers.valor / 2) {
      answers.entrada = answers.valor / 2;
    }
    if (answers.parcela != null && answers.valor != null && answers.entrada != null) {
      var min = minMonthly(answers);
      if (answers.parcela < min) answers.parcela = Math.min(min, 10000);
    }
  }

  slider.addEventListener("input", function () {
    var r = currentRange;
    var i = Number(slider.value);
    paintSlider();
    if ($("q-next").disabled) {
      delete answers[r.q.id];
    } else {
      answers[r.q.id] = r.values[i];
      normalizeAnswers();
    }
    renderChips();
  });
  $("q-next").addEventListener("click", function () {
    var r = currentRange;
    answers[r.q.id] = r.values[Number(slider.value)];
    normalizeAnswers();
    go(index + 1);
  });

  // ---------- Resultado ----------
  function rows(list) {
    return list
      .map(function (r) {
        var cls = r[2] ? ' class="hl hl-' + r[2] + '"' : "";
        return "<div" + cls + "><dt>" + r[0] + "</dt><dd>" + r[1] + "</dd></div>";
      })
      .join("");
  }

  function card(cls, title, subtitle, list, note, badge) {
    return (
      '<article class="cmp-card ' + cls + '"><header><h3>' + title + "</h3><p>" +
      subtitle + "</p></header>" +
      (badge || []).map(function (b) { return '<p class="cmp-badge">' + b + "</p>"; }).join("") +
      "<dl>" + rows(list) + '</dl><p class="cmp-note">' + note + "</p></article>"
    );
  }

  function renderResult() {
    var a = answers;
    var item = ITEMS[a.objetivo];
    var c = compute(a);
    var name = form.nome.value.trim().split(" ")[0];
    $("r-name").textContent = name || "Olá";
    $("r-item").textContent = item.seu;

    $("r-summary").innerHTML =
      "<li><span>" + item.valorLabel + "</span><strong>" + brl(a.valor) + (a.valor === 5000000 ? "+" : "") + "</strong></li>" +
      "<li><span>Disponível por mês</span><strong>" + brl(a.parcela) + (a.parcela === 10000 ? "+" : "") + "</strong></li>" +
      "<li><span>Disponível à vista</span><strong>" + brl(a.entrada) + "</strong></li>";

    var own = card(
      "cmp-own",
      "Investimento próprio",
      "Investir a 1% ao mês e comprar à vista",
      [
        ["Prazo para juntar o valor", duration(c.own.months), "bad"],
        ["Investimento inicial", brl(a.entrada)],
        ["Aporte mensal", brl(Math.max(a.parcela, minMonthly(a)))],
        ["Total investido (do seu bolso)", brl(c.own.invested)],
        ["Rendimento (1% ao mês)", brl(c.own.gain)],
        ["Valor acumulado", brl(c.own.balance)],
      ],
      "Considerando um rendimento de 1% ao mês. Mas durante esse tempo " + item.seu + " sofre correções de preço e estará " + item.caro + " quando você conseguir o valor total."
    );

    var noFin = a.objetivo === "reforma";
    var finRows = noFin
      ? null
      : [
          ["Em poucos dias"],
          [brl(a.entrada)],
          [brl(c.fin.pmt), "bad"],
          [c.fin.months + " meses", "bad"],
          [brl(c.fin.total)],
          [brl(c.fin.interest) + " em juros", "bad"],
        ];
    var consRows = [
      ["Por sorteio ou lance"],
      [brl(a.entrada)],
      [brl(c.cons.pmt), "good"],
      [c.cons.months + " meses", "good"],
      [brl(c.cons.total)],
      [brl(c.cons.fee) + " de taxa, sem juros", "good"],
    ];
    var labels = ["Quando conquista", "Entrada / lance hoje", "Parcela mensal", "Prazo", "Total a pagar", "Custo adicional"];
    var finRate = noFin ? "" : String(Math.round(c.fin.rate * 1000) / 10).replace(".", ",");
    var finNote = noFin
      ? "Não existe financiamento para este tipo de conquista."
      : "Parcelas fixas calculadas pela Tabela Price. Você conquista " + item.seu + " logo, mas paga o valor com juros, e durante um prazo maior." +
        (c.fin.over ? " Neste prazo máximo, a parcela fica acima do seu orçamento." : "");
    var consNote =
      "Carta de crédito de " + brl(a.valor) + " + 20% de taxa administrativa (" + brl(c.cons.fee) + "). Sua entrada pode ser usada como lance para antecipar a sua contemplação." +
      (c.cons.over ? " Neste prazo máximo, a parcela fica acima do seu orçamento." : "");

    var badges = [];
    if (c.fin && c.fin.interest > c.cons.fee) {
      badges.push("Custo " + brl(c.fin.interest - c.cons.fee) + " menor que o do financiamento");
    }
    if (c.fin && c.fin.months > c.cons.months) {
      badges.push("Prazo " + (c.fin.months - c.cons.months) + " meses menor que o do financiamento");
    }
    if (!badges.length) badges.push("Sem juros: você paga só a taxa administrativa");

    function td(cls, cell) {
      var h = cell && cell[1] ? " hl hl-" + cell[1] : "";
      return '<td class="' + cls + h + '">' + (cell ? cell[0] : "—") + "</td>";
    }
    var body = labels
      .map(function (l, i) {
        return "<tr><th scope=\"row\">" + l + "</th>" + td("fin", finRows && finRows[i]) + td("cons", consRows[i]) + "</tr>";
      })
      .join("");

    var table =
      '<div class="cmp-wrap"><table class="cmp-table' + (noFin ? " no-fin" : "") + '">' +
      "<thead><tr><td></td>" +
      '<th scope="col" class="fin"><h3>Financiamento</h3><p>' + (noFin ? "Indisponível para reforma" : "Tabela Price, juros de " + finRate + "% ao mês") + "</p></th>" +
      '<th scope="col" class="cons"><h3>Consórcio</h3><p>Sem juros, taxa administrativa média de 20%</p></th>' +
      "</tr></thead><tbody>" + body +
      '<tr class="notes"><td></td><td class="fin">' + finNote + '</td><td class="cons">' + consNote + "</td></tr>" +
      "</tbody></table></div>";

    var saveMoney = c.fin ? c.fin.interest - c.cons.fee : 0;
    var saveMonths = c.fin ? c.fin.months - c.cons.months : 0;
    var parts = [];
    if (saveMoney > 0) parts.push("<strong>" + brl(saveMoney) + "</strong>");
    if (saveMonths > 0) parts.push("<strong>" + saveMonths + " meses</strong>");
    var sv = $("r-savings");
    sv.hidden = !parts.length;
    sv.innerHTML = parts.length
      ? "Com o consórcio você economiza " + parts.join(" e ") + " em comparação ao financiamento."
      : "";

    function stackCard(cls, title, subtitle, cells, note) {
      var list = cells
        ? cells.map(function (cell, i) { return [labels[i], cell[0], cell[1]]; })
        : [];
      return card(cls, title, subtitle, list, note);
    }
    var stackCons = stackCard("is-featured", "Consórcio", "Sem juros, taxa administrativa média de 20%", consRows, consNote);
    var stackFin = noFin
      ? '<article class="cmp-card is-disabled" aria-disabled="true"><header><h3>Financiamento</h3><p>Indisponível para reforma</p></header><p class="cmp-note">' + finNote + "</p></article>"
      : stackCard("", "Financiamento", "Tabela Price, juros de " + finRate + "% ao mês", finRows, finNote);

    $("r-cards").innerHTML =
      '<div class="cmp-desktop">' + table + own + "</div>" +
      '<div class="cmp-stack">' + stackCons + stackFin + own + "</div>";

    var msg =
      "Olá Luciana! Fiz a simulação no site." +
      "\nConquista: " + item.label +
      "\n" + item.valorLabel + ": " + brl(a.valor) +
      "\nParcela mensal: " + brl(a.parcela) +
      "\nValor à vista: " + brl(a.entrada) +
      "\nUrgência: " + a.urgencia +
      "\nDecisão: " + a.decisao +
      "\nNome: " + form.nome.value.trim();
    $("r-whatsapp").href = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(msg);
  }

  // ---------- Formulário de contato ----------
  var submitBtn = $("btn-submit");
  var touched = {};

  // Remove o código do país (+55) e zero à esquerda vindos de autofill/colagem,
  // sem confundir com o DDD 55 quando o usuário digita manualmente.
  function phoneDigits(raw, inputType) {
    var d = raw.replace(/\D/g, "");
    var typing = inputType === "insertText" || inputType === "deleteContentBackward";
    var hasPlus = /^\s*\+?\s*55/.test(raw) && /^\s*\+/.test(raw);
    if (d.indexOf("55") === 0 && d.length > 11 && (hasPlus || !typing)) d = d.slice(2);
    else if (hasPlus && d.length >= 12) d = d.slice(2);
    if (d.charAt(0) === "0" && d.length > 11) d = d.slice(1);
    return d.slice(0, 11);
  }

  function fieldError(name) {
    var digits = phoneDigits(form.telefone.value);
    if (name === "nome") return form.nome.value.trim().length < 2 ? "Informe seu nome." : "";
    if (name === "telefone")
      return digits.length < 10 ? "Informe um WhatsApp válido com DDD." : "";
    if (name === "email")
      return /^\S+@\S+\.\S+$/.test(form.email.value.trim()) ? "" : "Informe um e-mail válido.";
    return "";
  }

  function showError(name) {
    var err = fieldError(name);
    var field = form[name].closest(".field");
    field.classList.toggle("invalid", !!err);
    field.querySelector(".error").textContent = err;
  }

  function isValid() {
    return !fieldError("nome") && !fieldError("telefone") && !fieldError("email") && form.consent.checked;
  }

  function syncSubmit() {
    submitBtn.disabled = !isValid();
  }

  ["nome", "telefone", "email"].forEach(function (name) {
    form[name].addEventListener("blur", function () {
      touched[name] = true;
      showError(name);
    });
    form[name].addEventListener("input", function () {
      if (touched[name]) showError(name);
    });
  });
  form.addEventListener("input", syncSubmit);
  form.addEventListener("change", syncSubmit);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!isValid()) return;
    go(total + 1);
    sendLead();
  });

  // Envia o lead para o Google Apps Script (backend/lead-email.gs), que manda o e-mail
  // e grava na planilha. Falhas não afetam o resultado mostrado ao usuário.
  var LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbxnJAbQGhVzMy72LtfSeJxVSRPYux_r6_OYL8uLFZea3xu1KD6j_kniDo14-M970bFP/exec";
  var leadSent = false;
  function sendLead() {
    if (leadSent || LEAD_ENDPOINT.indexOf("https://") !== 0) return;
    leadSent = true;
    var a = answers;
    var item = ITEMS[a.objetivo];
    var c = compute(a);
    var saveMoney = c.fin ? c.fin.interest - c.cons.fee : 0;
    var saveMonths = c.fin ? c.fin.months - c.cons.months : 0;
    var economia = [];
    if (saveMoney > 0) economia.push(brl(saveMoney));
    if (saveMonths > 0) economia.push(saveMonths + " meses");
    var vantagens = [];
    if (saveMoney > 0) vantagens.push("Custo " + brl(saveMoney) + " menor que o do financiamento");
    if (saveMonths > 0) vantagens.push("Prazo " + saveMonths + " meses menor que o do financiamento");
    if (!vantagens.length) vantagens.push("Sem juros: você paga só a taxa administrativa");
    var acima = "Neste prazo máximo, a parcela fica acima do orçamento";

    var data = {
      nome: form.nome.value.trim(),
      telefone: form.telefone.value.trim(),
      telefoneDigitos: phoneDigits(form.telefone.value),
      email: form.email.value.trim(),
      conquista: item.label,
      valorLabel: item.valorLabel,
      valor: brl(a.valor) + (a.valor === 5000000 ? "+" : ""),
      parcelaDisponivel: brl(a.parcela) + (a.parcela === 10000 ? "+" : ""),
      entrada: brl(a.entrada),
      urgencia: a.urgencia,
      decisao: a.decisao,
      economia: economia.length ? "Com o consórcio você economiza " + economia.join(" e ") + " em comparação ao financiamento." : "",
      vantagens: vantagens.join(" | "),
      consorcio: {
        quando: "Por sorteio ou lance",
        entrada: brl(a.entrada),
        parcela: brl(c.cons.pmt),
        prazo: c.cons.months + " meses",
        total: brl(c.cons.total),
        taxa: brl(c.cons.fee) + " de taxa, sem juros",
        alerta: c.cons.over ? acima : "",
      },
      financiamento: c.fin
        ? {
            tabela: "Tabela Price, juros de " + String(Math.round(c.fin.rate * 1000) / 10).replace(".", ",") + "% ao mês",
            quando: "Em poucos dias",
            entrada: brl(a.entrada),
            parcela: brl(c.fin.pmt),
            prazo: c.fin.months + " meses",
            total: brl(c.fin.total),
            juros: brl(c.fin.interest) + " em juros",
            alerta: c.fin.over ? acima : "",
          }
        : null,
      investimento: {
        prazo: duration(c.own.months),
        inicial: brl(a.entrada),
        aporte: brl(Math.max(a.parcela, minMonthly(a))),
        investido: brl(c.own.invested),
        rendimento: brl(c.own.gain),
        acumulado: brl(c.own.balance),
      },
    };
    fetch(LEAD_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
      keepalive: true,
    }).catch(function () {
      leadSent = false;
    });
  }

  form.telefone.addEventListener("input", function (e) {
    var d = phoneDigits(e.target.value, e.inputType);
    var out = d;
    if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length > 6)
      out = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
    e.target.value = out;
  });

  $("btn-start").addEventListener("click", function () {
    go(0);
  });
  $("btn-redo").addEventListener("click", function () {
    go(0, true);
  });
  $("btn-back").addEventListener("click", function () {
    if (index > -1 && index <= total) go(index - 1, true);
  });

  go(-1);
})();
