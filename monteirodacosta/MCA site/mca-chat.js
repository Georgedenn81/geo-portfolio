/* ============================================================
 * MCA Atende — widget de atendimento ativo da landing page
 * Monteiro da Costa Advogados
 * ------------------------------------------------------------
 * Funil conversacional (Área → Momento → Urgência → Contato) que
 * percebe a rota e leva a pessoa pro WhatsApp com o contexto já
 * preenchido. É 100% client-side: nada sai do navegador até a
 * pessoa clicar em "Continuar no WhatsApp". Assim não há risco de
 * o atendimento dar orientação jurídica no site (trava OAB) e o
 * widget funciona mesmo se o servidor estiver fora do ar.
 *
 * COMO USAR: inclua este arquivo no final do <body>:
 *   <script src="mca-chat.js" defer></script>
 * Personalize pelo objeto CONFIG abaixo.
 * ============================================================ */
(function () {
  "use strict";

  var CONFIG = {
    escritorio: "Monteiro da Costa Advogados",
    assistente: "Sofia",
    avatarUrl: "img/sofia-avatar.jpg",  // foto da assistente no cabeçalho do chat ("" = mostra só a inicial)
    botaoTexto: "Fale conosco",         // texto que aparece ao expandir a bolha
    whatsapp: "5511932007557",          // só dígitos (formato wa.me)
    abrirSozinhoEm: 0,                  // ms até abrir sozinho (0 = nunca; espera o clique)
    esconderNaSecao: "#contato",        // some a bolha quando esta seção está na tela ("" desliga)
    // Cores da marca
    navy: "#1D2959",
    navyDk: "#131C3E",
    gold: "#84754D",
    creme: "#EFECE4",
    cremeLt: "#F7F5F0",
    ink: "#141613",
  };

  // ----- Taxonomia da triagem (idêntica ao formulário do site) -----
  var AREAS = [
    "Direito Educacional",
    "Direito Trabalhista",
    "Família e Sucessões",
    "Contratos e Imobiliário",
    "Consumidor e Saúde",
    "Outra questão",
  ];
  var MOMENTOS = [
    "Quero prevenir — ainda não virou conflito",
    "Recebi uma notificação ou citação",
    "Já existe processo em andamento",
    "Quero entrar com uma ação",
  ];
  var URGENCIAS = [
    "Urgente — tenho prazo correndo",
    "Nas próximas semanas",
    "Sem pressa — busco orientação",
  ];

  var state = { area: null, momento: null, urgencia: null, nome: "", resumo: "" };

  // ----- Estilos (injetados uma vez) -----
  var css = `
  .mcac-fab{position:fixed;right:20px;bottom:20px;z-index:99999;display:flex;align-items:center;
    background:${CONFIG.navy};color:#fff;border:none;border-radius:999px;height:58px;max-width:58px;padding:0;
    font:600 15px/1 'Gesta',system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 30px rgba(19,28,62,.28);
    overflow:hidden;white-space:nowrap;
    transition:max-width .5s cubic-bezier(.16,1,.3,1),transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s,opacity .3s}
  .mcac-fab:hover,.mcac-fab.mcac-peek{max-width:280px;transform:translateY(-2px);box-shadow:0 16px 40px rgba(19,28,62,.34)}
  .mcac-ic{flex:0 0 58px;width:58px;height:58px;display:flex;align-items:center;justify-content:center}
  .mcac-ic svg{width:26px;height:26px}
  .mcac-lbl{opacity:0;transform:translateX(-8px);padding-right:24px;
    transition:opacity .28s ease .06s,transform .4s cubic-bezier(.16,1,.3,1) .06s}
  .mcac-fab:hover .mcac-lbl,.mcac-fab.mcac-peek .mcac-lbl{opacity:1;transform:none}
  .mcac-fab.mcac-hide{opacity:0;pointer-events:none;transform:scale(.9)}
  .mcac-panel{position:fixed;right:20px;bottom:20px;z-index:100000;width:min(380px,calc(100vw - 32px));
    height:min(600px,calc(100vh - 40px));background:${CONFIG.cremeLt};border-radius:22px;overflow:hidden;
    display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(19,28,62,.34);
    opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;
    transition:opacity .28s cubic-bezier(.16,1,.3,1),transform .28s cubic-bezier(.16,1,.3,1);
    font:400 15px/1.5 'Gesta',system-ui,sans-serif;color:${CONFIG.ink}}
  .mcac-panel.mcac-open{opacity:1;transform:none;pointer-events:auto}
  .mcac-head{background:${CONFIG.navy};color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}
  .mcac-head .mcac-av{width:40px;height:40px;border-radius:50%;background:${CONFIG.gold};display:flex;
    align-items:center;justify-content:center;font-weight:700;font-size:16px;flex:0 0 auto;
    background-size:cover;background-position:center;overflow:hidden}
  .mcac-head .mcac-av.mcac-av-photo{color:transparent}
  .mcac-head h4{margin:0;font-size:15px;font-weight:600}
  .mcac-head p{margin:2px 0 0;font-size:12px;opacity:.75}
  .mcac-head .mcac-x{margin-left:auto;background:none;border:none;color:#fff;opacity:.7;cursor:pointer;
    font-size:22px;line-height:1;padding:4px}
  .mcac-head .mcac-x:hover{opacity:1}
  .mcac-body{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px;scroll-behavior:smooth}
  .mcac-msg{max-width:82%;padding:11px 14px;border-radius:16px;font-size:14.5px;animation:mcac-in .3s ease both}
  .mcac-bot{align-self:flex-start;background:#fff;border:1px solid rgba(20,22,19,.08);border-bottom-left-radius:5px}
  .mcac-user{align-self:flex-end;background:${CONFIG.navy};color:#fff;border-bottom-right-radius:5px}
  @keyframes mcac-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  .mcac-chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 18px 4px}
  .mcac-chip{background:#fff;border:1px solid ${CONFIG.gold};color:${CONFIG.navy};border-radius:999px;
    padding:9px 14px;font:500 13.5px/1 'Gesta',system-ui,sans-serif;cursor:pointer;transition:.18s}
  .mcac-chip:hover{background:${CONFIG.navy};color:#fff;border-color:${CONFIG.navy}}
  .mcac-form{padding:0 18px 18px;display:flex;flex-direction:column;gap:10px}
  .mcac-form input,.mcac-form textarea{width:100%;box-sizing:border-box;border:1px solid rgba(20,22,19,.15);
    border-radius:12px;padding:11px 13px;font:400 14.5px/1.4 'Gesta',system-ui,sans-serif;background:#fff;
    color:${CONFIG.ink};resize:vertical}
  .mcac-form input:focus,.mcac-form textarea:focus{outline:none;border-color:${CONFIG.gold}}
  .mcac-cta{background:${CONFIG.navy};color:#fff;border:none;border-radius:12px;padding:13px;
    font:600 15px/1 'Gesta',system-ui,sans-serif;cursor:pointer;display:flex;align-items:center;
    justify-content:center;gap:9px;transition:.2s}
  .mcac-cta:hover{background:${CONFIG.navyDk}}
  .mcac-cta svg{width:20px;height:20px}
  .mcac-foot{text-align:center;font-size:11px;color:#8A8F84;padding:0 18px 14px}
  .mcac-body::-webkit-scrollbar{width:6px}.mcac-body::-webkit-scrollbar-thumb{background:rgba(20,22,19,.15);border-radius:3px}
  @media(max-width:480px){.mcac-panel{right:8px;bottom:8px;width:calc(100vw - 16px);height:calc(100vh - 16px)}}
  `;

  var waIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.03c-.24.68-1.42 1.31-1.95 1.35-.5.04-.99.22-3.37-.7-2.86-1.13-4.68-4.03-4.82-4.22-.14-.19-1.15-1.53-1.15-2.92s.73-2.07.99-2.35c.26-.28.57-.35.76-.35.19 0 .38 0 .55.01.18.01.42-.07.65.5.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.9 1.05.94 1.94 1.23 2.22 1.37.28.14.44.12.6-.07.16-.19.69-.81.87-1.09.18-.28.37-.23.62-.14.25.09 1.6.76 1.87.9.28.14.46.21.53.33.07.12.07.68-.17 1.36z"/></svg>';

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  var panel, body, fab, opened = false, sectionVisible = false;

  function panelOpen() { return panel.classList.contains("mcac-open"); }
  // A bolha some quando o painel está aberto OU quando a seção de
  // contato (com o formulário) está na tela — pra não competir com ele.
  function updateFab() { fab.classList.toggle("mcac-hide", panelOpen() || sectionVisible); }

  function scrollDown() { body.scrollTop = body.scrollHeight; }

  function botMsg(text, delay) {
    setTimeout(function () {
      var m = el("div", "mcac-msg mcac-bot", text);
      body.appendChild(m); scrollDown();
    }, delay || 0);
  }
  function userMsg(text) {
    var m = el("div", "mcac-msg mcac-user", text);
    body.appendChild(m); scrollDown();
  }

  function clearInteractive() {
    Array.prototype.forEach.call(
      body.querySelectorAll(".mcac-chips,.mcac-form"),
      function (n) { n.remove(); }
    );
  }

  function showChips(options, onPick) {
    var wrap = el("div", "mcac-chips");
    options.forEach(function (opt) {
      var c = el("button", "mcac-chip", opt);
      c.onclick = function () {
        clearInteractive();
        userMsg(opt);
        onPick(opt);
      };
      wrap.appendChild(c);
    });
    body.appendChild(wrap); scrollDown();
  }

  // ----- Fluxo -----
  function start() {
    botMsg("Olá! Aqui é a " + CONFIG.assistente + ", do atendimento da " +
      CONFIG.escritorio + ". Vou te ajudar em 4 passinhos rápidos e já encaminho ao advogado certo. 🙂", 100);
    setTimeout(askArea, 700);
  }

  function askArea() {
    botMsg("Para começar: <strong>qual área mais se aproxima da sua questão?</strong>");
    setTimeout(function () { showChips(AREAS, function (v) { state.area = v; askMomento(); }); }, 500);
  }

  function askMomento() {
    botMsg("Entendi. E <strong>em que momento está a questão?</strong>", 300);
    setTimeout(function () { showChips(MOMENTOS, function (v) { state.momento = v; askUrgencia(); }); }, 750);
  }

  function askUrgencia() {
    botMsg("Certo. <strong>Qual a urgência?</strong> Se houver prazo, isso ajuda a priorizar.", 300);
    setTimeout(function () { showChips(URGENCIAS, function (v) { state.urgencia = v; askContato(); }); }, 750);
  }

  function askContato() {
    var urgente = isUrgente();
    botMsg(urgente
      ? "Como pode haver prazo, vou marcar como <strong>prioridade</strong>. Me diga seu nome e um resumo em poucas linhas — o restante você conversa direto com a equipe."
      : "Por fim, me diga seu nome e um resumo breve da questão. Não precisa detalhar tudo por aqui — o sigilo é preservado e o advogado aprofunda com você.", 300);

    setTimeout(function () {
      var form = el("div", "mcac-form");
      var nome = el("input"); nome.type = "text"; nome.placeholder = "Seu nome";
      var resumo = el("textarea"); resumo.rows = 3; resumo.placeholder = "Resumo da sua questão (opcional)";
      var cta = el("button", "mcac-cta", waIcon + "<span>Continuar no WhatsApp</span>");
      cta.onclick = function () {
        state.nome = nome.value.trim();
        state.resumo = resumo.value.trim();
        finalizar();
      };
      form.appendChild(nome); form.appendChild(resumo); form.appendChild(cta);
      body.appendChild(form); scrollDown();
      nome.focus();
    }, 800);
  }

  function isUrgente() {
    return /urgente/i.test(state.urgencia || "") || /notifica|cita/i.test(state.momento || "");
  }

  function finalizar() {
    clearInteractive();
    var urgente = isUrgente();
    var linhas = [];
    if (state.nome) linhas.push("Olá! Sou " + state.nome + " e vim pelo site da " + CONFIG.escritorio + ".");
    else linhas.push("Olá! Vim pelo site da " + CONFIG.escritorio + ".");
    if (urgente) linhas.push("🔴 URGENTE / com prazo.");
    linhas.push("Área: " + state.area);
    linhas.push("Momento: " + state.momento);
    linhas.push("Urgência: " + state.urgencia);
    if (state.resumo) linhas.push("Resumo: " + state.resumo);
    var texto = linhas.join("\n");
    var link = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(texto);

    botMsg(urgente
      ? "Prontinho! Já preparei tudo com <strong>prioridade</strong>. Toque abaixo para enviar direto à equipe pelo WhatsApp — o histórico segue com você."
      : "Prontinho! Preparei um resumo da sua questão. Toque abaixo para enviar à equipe pelo WhatsApp — ela dá sequência com você.");

    setTimeout(function () {
      var wrap = el("div", "mcac-form");
      var cta = el("a", "mcac-cta");
      cta.href = link; cta.target = "_blank"; cta.rel = "noopener";
      cta.innerHTML = waIcon + "<span>Abrir WhatsApp com meu resumo</span>";
      wrap.appendChild(cta);
      var foot = el("div", "mcac-foot",
        "Atendimento inicial. A orientação jurídica é dada pelo advogado, conforme seu caso.");
      wrap.appendChild(foot);
      body.appendChild(wrap); scrollDown();
    }, 600);
  }

  // ----- Abre/fecha -----
  function open() {
    panel.classList.add("mcac-open");
    updateFab();
    if (!opened) { opened = true; start(); }
  }
  function close() {
    panel.classList.remove("mcac-open");
    updateFab();
  }

  // ----- Monta a UI -----
  function mount() {
    var style = el("style"); style.textContent = css; document.head.appendChild(style);

    fab = el("button", "mcac-fab");
    fab.setAttribute("aria-label", CONFIG.botaoTexto);
    fab.innerHTML =
      '<span class="mcac-ic">' + waIcon + "</span>" +
      '<span class="mcac-lbl">' + CONFIG.botaoTexto + "</span>";
    fab.onclick = open;

    panel = el("div", "mcac-panel");
    var head = el("div", "mcac-head");
    var av = el("div", "mcac-av", CONFIG.assistente.charAt(0));
    if (CONFIG.avatarUrl) {
      av.classList.add("mcac-av-photo");
      av.style.backgroundImage = "url('" + CONFIG.avatarUrl + "')";
    }
    var info = el("div");
    info.appendChild(el("h4", null, CONFIG.escritorio));
    info.appendChild(el("p", null, "Atendimento • normalmente responde rápido"));
    var x = el("button", "mcac-x", "&times;"); x.onclick = close;
    head.appendChild(av); head.appendChild(info); head.appendChild(x);

    body = el("div", "mcac-body");
    panel.appendChild(head); panel.appendChild(body);

    document.body.appendChild(fab);
    document.body.appendChild(panel);

    // "Espiada" fluida: uma vez por sessão, a bolha se expande sozinha
    // mostrando "Fale conosco" e recolhe de novo — um convite discreto.
    try {
      if (!sessionStorage.getItem("mcac_peek")) {
        setTimeout(function () {
          if (panelOpen() || sectionVisible) return;
          fab.classList.add("mcac-peek");
          setTimeout(function () { fab.classList.remove("mcac-peek"); }, 2600);
          try { sessionStorage.setItem("mcac_peek", "1"); } catch (e) {}
        }, 1400);
      }
    } catch (e) {}

    // Esconde a bolha enquanto a seção de contato (o formulário) está
    // visível — os dois canais não competem pela mesma área da tela.
    if (CONFIG.esconderNaSecao && "IntersectionObserver" in window) {
      var alvo = document.querySelector(CONFIG.esconderNaSecao);
      if (alvo) {
        new IntersectionObserver(function (entries) {
          sectionVisible = entries[0].isIntersecting;
          updateFab();
        }, { threshold: 0.2 }).observe(alvo);
      }
    }

    // Abre sozinho no máximo UMA vez por sessão do navegador (não é
    // reaberto a cada página) — um convite discreto, sem insistência.
    if (CONFIG.abrirSozinhoEm > 0) {
      try {
        if (!sessionStorage.getItem("mcac_auto")) {
          setTimeout(function () {
            if (!opened) { open(); try { sessionStorage.setItem("mcac_auto", "1"); } catch (e) {} }
          }, CONFIG.abrirSozinhoEm);
        }
      } catch (e) {
        setTimeout(function () { if (!opened) open(); }, CONFIG.abrirSozinhoEm);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
