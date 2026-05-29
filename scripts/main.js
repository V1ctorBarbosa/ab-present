/* ============================================================
   presente-bia — sistema de níveis
   ============================================================
   navegação entre <section class="level"> via classe .is-active.
   transições e animações de entrada são puramente CSS.
   ============================================================ */

(() => {
  "use strict";

  const stage = document.getElementById("stage");
  if (!stage) return;

  const levels = Array.from(stage.querySelectorAll(".level"));
  if (levels.length === 0) return;

  /** duração da saída — precisa bater com .level.is-exiting em levels.css */
  const EXIT_DURATION_MS = 1200;

  /** fade-in da música — dá uma entrada cinematográfica, em ms */
  const MUSIC_FADE_MS = 2200;

  let currentIndex = 0;
  let isTransitioning = false;

  // estado inicial: o primeiro nível está ativo
  levels[0].classList.add("is-active");

  /**
   * faz fade-in da música até o volume alvo (0..1).
   */
  function fadeMusicIn(audio, targetVolume = 1, duration = MUSIC_FADE_MS) {
    const start = performance.now();
    const startVolume = audio.volume;
    function step(now) {
      const t = Math.min((now - start) / duration, 1);
      audio.volume = startVolume + (targetVolume - startVolume) * t;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /**
   * controla a música de fundo baseado no atributo data-music do nível.
   * "play" inicia (com fade-in se estava parada).
   * "stop" pausa e volta pro início.
   * "pause" só pausa.
   */
  function handleMusic(level) {
    const music = document.getElementById("bg-music");
    if (!music) return;
    const action = level.dataset.music;
    if (!action) return;

    if (action === "play") {
      if (music.paused) {
        music.volume = 0;
        const p = music.play();
        const startFade = () => fadeMusicIn(music, 1);
        if (p && typeof p.then === "function") {
          p.then(startFade).catch(() => {
            /* autoplay bloqueado — ignora silenciosamente */
          });
        } else {
          startFade();
        }
      }
    } else if (action === "stop") {
      music.pause();
      music.currentTime = 0;
    } else if (action === "pause") {
      music.pause();
    }
  }

  /**
   * navega para um nível específico (por índice).
   * silenciosamente ignora índices inválidos ou navegação durante transição.
   */
  function goToLevel(targetIndex) {
    if (isTransitioning) return;
    if (typeof targetIndex !== "number" || Number.isNaN(targetIndex)) return;
    if (targetIndex < 0 || targetIndex >= levels.length) return;
    if (targetIndex === currentIndex) return;

    isTransitioning = true;

    const current = levels[currentIndex];
    const target = levels[targetIndex];

    // sai do nível atual
    current.classList.remove("is-active");
    current.classList.add("is-exiting");

    // depois que a saída termina, entra no próximo
    window.setTimeout(() => {
      current.classList.remove("is-exiting");
      target.classList.add("is-active");
      handleMusic(target);
      currentIndex = targetIndex;

      // pequena folga pra desbloquear cliques
      window.setTimeout(() => {
        isTransitioning = false;
      }, 80);
    }, EXIT_DURATION_MS);
  }

  /**
   * cria um pequeno "ripple" radial dentro do botão ao clicar.
   */
  function createRipple(button, event) {
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (event.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (event.clientY || rect.top + rect.height / 2) - rect.top - size / 2;

    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    // limpa ripples anteriores pra não acumular
    const old = button.querySelector(".ripple");
    if (old) old.remove();

    button.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  }

  // delegação de cliques no palco
  stage.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-action]");
    if (!trigger) return;

    if (trigger.classList.contains("btn")) {
      createRipple(trigger, event);
    }

    const action = trigger.dataset.action;

    switch (action) {
      case "next":
        goToLevel(currentIndex + 1);
        break;
      case "prev":
        goToLevel(currentIndex - 1);
        break;
      case "goto": {
        const idx = Number.parseInt(trigger.dataset.target, 10);
        if (!Number.isNaN(idx)) goToLevel(idx);
        break;
      }
      case "restart":
        goToLevel(0);
        break;
    }
  });

  // API pública — útil pra controlar do console ou de scripts futuros
  window.presente = {
    next: () => goToLevel(currentIndex + 1),
    prev: () => goToLevel(currentIndex - 1),
    goTo: goToLevel,
    current: () => currentIndex,
    total: () => levels.length,
  };

  /* ============================================================
     quiz (nível 2) — seleção de adjetivos
     ============================================================ */
  function initQuiz() {
    const grid = document.getElementById("quiz-grid");
    if (!grid) return;
    const feedback = document.getElementById("quiz-feedback");

    // mensagens rotativas pros cliques errados
    const wrongMessages = [
      "essa não",
      "nops",
      "negativo",
      "longe disso",
      "não, né",
      "definitivamente não",
      "naaah",
      "aí já é demais",
      "passa longe",
      "essa não é você",
      "sai disso",
      "tá errada",
    ];

    // mensagens rotativas pros cliques certos
    const rightMessages = [
      "muito bem",
      "isso aí",
      "essaaaa",
      "exato",
      "muito que bem",
      "claaaro",
      "óbvio",
      "linda",
      "é isso",
      "uhumm",
      "sim",
      "essa é você",
    ];

    // mensagem final, quando todos os certos estão marcados
    const finalMessage = "você é tudo isso aí mesmo";

    // embaralha os cards de forma estável (Fisher-Yates) e move no DOM
    const order = Array.from(grid.children);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = order[i];
      order[i] = order[j];
      order[j] = tmp;
    }
    order.forEach((card, i) => {
      card.style.setProperty("--i", i);
      grid.appendChild(card); // move pra nova posição
    });

    const totalRights = grid.querySelectorAll('[data-correct="true"]').length;
    let rightsSelected = 0;
    let isQuizComplete = false;
    let feedbackTimer = null;
    let lastWrongIdx = -1;
    let lastRightIdx = -1;

    function pickRandom(arr, lastIdxRef) {
      if (arr.length === 1) return { msg: arr[0], idx: 0 };
      let idx;
      do {
        idx = Math.floor(Math.random() * arr.length);
      } while (idx === lastIdxRef.value);
      lastIdxRef.value = idx;
      return { msg: arr[idx], idx };
    }

    function pickWrongMessage() {
      const ref = { value: lastWrongIdx };
      const r = pickRandom(wrongMessages, ref);
      lastWrongIdx = ref.value;
      return r.msg;
    }

    function pickRightMessage() {
      const ref = { value: lastRightIdx };
      const r = pickRandom(rightMessages, ref);
      lastRightIdx = ref.value;
      return r.msg;
    }

    function showFeedback(message) {
      if (!feedback) return;
      if (feedbackTimer) window.clearTimeout(feedbackTimer);

      let span = feedback.querySelector(".quiz-feedback__text");
      if (!span) {
        span = document.createElement("span");
        span.className = "quiz-feedback__text";
        feedback.appendChild(span);
      }
      span.textContent = message;
      feedback.classList.remove("is-final");
      feedback.classList.add("is-visible");

      feedbackTimer = window.setTimeout(() => {
        feedback.classList.remove("is-visible");
      }, 1800);
    }

    function showFinalMessage() {
      if (!feedback) return;
      if (feedbackTimer) {
        window.clearTimeout(feedbackTimer);
        feedbackTimer = null;
      }
      // tira a classe is-visible primeiro pra forçar uma re-entrada animada
      feedback.classList.remove("is-visible");

      let span = feedback.querySelector(".quiz-feedback__text");
      if (!span) {
        span = document.createElement("span");
        span.className = "quiz-feedback__text";
        feedback.appendChild(span);
      }
      span.textContent = finalMessage;
      feedback.classList.add("is-final");

      // pequeno reflow + frame pra a transição da .is-final pegar
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          feedback.classList.add("is-visible");
        });
      });
    }

    grid.addEventListener("click", (event) => {
      if (isQuizComplete) return;

      const card = event.target.closest(".quiz-card");
      if (!card) return;
      if (
        card.classList.contains("is-selected") ||
        card.classList.contains("is-wrong") ||
        card.classList.contains("is-fading")
      ) {
        return;
      }

      if (card.dataset.correct === "true") {
        card.classList.add("is-selected");
        rightsSelected += 1;

        if (rightsSelected === totalRights) {
          // trava: nenhum clique mais vai contar
          isQuizComplete = true;

          // fade-out em cascata dos erros que sobraram
          const remainingWrongs = Array.from(
            grid.querySelectorAll(
              '.quiz-card:not(.is-selected):not(.is-wrong):not(.is-fading)'
            )
          );
          remainingWrongs.forEach((c, i) => {
            window.setTimeout(() => c.classList.add("is-fading"), 300 + i * 80);
          });

          // mensagem final aparece um pouquinho depois do bounce do último
          window.setTimeout(showFinalMessage, 700);
          // e depois avança
          window.setTimeout(() => {
            if (window.presente) window.presente.next();
          }, 3700);
        } else {
          showFeedback(pickRightMessage());
        }
      } else {
        card.classList.add("is-wrong");
        showFeedback(pickWrongMessage());
        // remove do DOM depois das animações de shake + fade
        window.setTimeout(() => {
          card.remove();
        }, 900);
      }
    });
  }

  initQuiz();

  /* ============================================================
     jogo da memória (nível 3)
     ============================================================
     6 pares de fotos. Acerto mostra um modal com a foto + texto da
     memória; depois as duas cartas somem. Erro vira de volta.
     Quando todos os pares são encontrados, mostra a mensagem final.
     ============================================================ */
  function initMemoryGame() {
    const grid = document.getElementById("memory-grid");
    if (!grid) return;

    /* edite aqui as fotos e os textos de cada par.
       coloque os arquivos em assets/photos/ com os nomes batendo. */
    const memoryPairs = [
      {
        id: 1,
        photo: "assets/photos/game-01.jpg",
        text: "Praia do sossego. A gente tinha tido uma conversa longa e difícil uma noite antes, mas foi bom estar com você em lugar mais leve e rindo e se sentindo bem. Sempre é bom estar com você, sempre",
      },
      {
        id: 2,
        photo: "assets/photos/game-02.jpg",
        text: "Essa foi do dia em que começou nosso namoro oficialmente. Você estava um grude e me dizendo as coisas mais bonitas do mundo enquanto a gente se pegava na minha sala. Tem uns vídeos desse momento que ainda fodem a minha cabeça kkkk",
      },
      {
        id: 3,
        photo: "assets/photos/game-03.jpg",
        text: "Aniversário da minha mãe lá no Salgueiro. Eu fiquei tão feliz de ter você no lugar onde eu cresci, ver minha parede de posteres, e ter você perto da minha familia. Tomara que possamos ter mais dias assim. Eu adoraria",
      },
      {
        id: 4,
        photo: "assets/photos/game-04.jpg",
        text: "Petrópolis. Talvez a nossa viagem mais cozy. Eu adorei cada segundo e ainda lembro com muita emoção de tudo, especialmente da noite. Tomara que possamos voltar pra lá logo",
      },
      {
        id: 5,
        photo: "assets/photos/game-05.jpg",
        text: "Eu sempre fico com um pouco de FOMO quando você me mostra tudo que já viveu e os lugares incríveis onde esteve, principalmente em fotos assim. Então fico muito feliz de estar presente, pelo menos em uma foto dessas, em um momento tão especial desses",
      },
      {
        id: 6,
        photo: "assets/photos/game-06.jpg",
        text: "Isso foi na cabana que a Taylor gravou o Folklore. Eu estava tentando escovar os dentes e você não parava de me agarrar. Eu sempre adorei isso (e nós estamos sem roupa nessa foto aí...)",
      },
    ];

    // duplica cada par pra ter 12 cartas
    const deck = [];
    memoryPairs.forEach((pair) => {
      deck.push({ ...pair });
      deck.push({ ...pair });
    });

    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = deck[i];
      deck[i] = deck[j];
      deck[j] = tmp;
    }

    // SVG do coração do verso das cartas
    const heartSvg = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 19s-6.5-4-6.5-9.2C5.5 7 7.4 5.2 9.5 5.2c1.4 0 2.6 0.8 3.2 2 0.7-1.2 1.8-2 3.2-2 2.1 0 4 1.8 4 3.6 0 5.2-7.9 9.2-7.9 9.2z"
              fill="#b08585" fill-opacity="0.55" />
      </svg>
    `;

    // renderiza as cartas
    deck.forEach((card, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "memory-card";
      btn.dataset.pair = String(card.id);
      btn.style.setProperty("--i", i);
      btn.innerHTML = `
        <div class="memory-card__inner">
          <div class="memory-card__face memory-card__face--back">
            ${heartSvg}
          </div>
          <div class="memory-card__face memory-card__face--front">
            <img src="${card.photo}" alt="" loading="lazy" />
          </div>
        </div>
      `;
      grid.appendChild(btn);
    });

    // lookup rápido id → pair
    const pairById = {};
    memoryPairs.forEach((p) => {
      pairById[p.id] = p;
    });

    const panel = document.getElementById("memory-panel");
    const panelPhoto = document.getElementById("memory-panel-photo");
    const panelText = document.getElementById("memory-panel-text");
    const finalEl = document.getElementById("memory-final");

    let flipped = [];
    let matchedPairs = 0;
    let busy = false;

    function openPanel(photo, text, onDismiss) {
      if (!panel) {
        onDismiss();
        return;
      }
      panelPhoto.src = photo;
      panelText.textContent = text;
      panel.classList.add("is-visible");
      panel.setAttribute("aria-hidden", "false");

      function dismiss() {
        panel.classList.remove("is-visible");
        panel.setAttribute("aria-hidden", "true");
        panel.removeEventListener("click", dismiss);
        // espera o fade do painel terminar antes de seguir
        window.setTimeout(onDismiss, 600);
      }

      // pequena folga pra evitar dismiss imediato pelo mesmo clique
      window.setTimeout(() => {
        panel.addEventListener("click", dismiss);
      }, 80);
    }

    function showMemoryFinal() {
      if (!finalEl) return;
      finalEl.hidden = false;
      // double rAF pra a transição pegar depois de remover hidden
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          finalEl.classList.add("is-visible");
        });
      });
    }

    grid.addEventListener("click", (event) => {
      if (busy) return;

      const card = event.target.closest(".memory-card");
      if (!card) return;
      if (card.classList.contains("is-flipped")) return;
      if (card.classList.contains("is-matched")) return;

      card.classList.add("is-flipped");
      flipped.push(card);

      if (flipped.length < 2) return;

      busy = true;
      const [a, b] = flipped;
      const isMatch = a.dataset.pair === b.dataset.pair;

      if (isMatch) {
        const pairId = Number.parseInt(a.dataset.pair, 10);
        const pair = pairById[pairId];

        // pequena pausa pra ela ver as duas cartas viradas, depois painel
        window.setTimeout(() => {
          openPanel(pair.photo, pair.text, () => {
            // depois do dismiss, marca pra sumir
            a.classList.add("is-matched");
            b.classList.add("is-matched");
            matchedPairs += 1;
            flipped = [];

            // remove do DOM depois da animação
            window.setTimeout(() => {
              a.remove();
              b.remove();

              if (matchedPairs === memoryPairs.length) {
                window.setTimeout(showMemoryFinal, 400);
                window.setTimeout(() => {
                  if (window.presente) window.presente.next();
                }, 5200);
              } else {
                busy = false;
              }
            }, 1000);
          });
        }, 600);
      } else {
        // não combinou — vira de volta após 1s
        window.setTimeout(() => {
          a.classList.remove("is-flipped");
          b.classList.remove("is-flipped");
          flipped = [];
          busy = false;
        }, 1000);
      }
    });
  }

  initMemoryGame();

  /* ============================================================
     nível 4 — você ou (jogo de escolhas)
     ============================================================
     Cada rodada mostra a bia + uma alternativa. Bia é sempre o
     "certo"; ela tem que clicar nela pra avançar. Erra → shake +
     mensagem negativa, tenta de novo. Posição da bia alterna a
     cada rodada pra não decorar.
     ============================================================ */
  function initChooseGame() {
    const arena = document.getElementById("choose-arena");
    if (!arena) return;
    const feedback = document.getElementById("choose-feedback");

    // ---- ordem fixa, cada alternativa com sua resposta personalizada ----
    const biaCard = {
      photo: "assets/photos/bia.jpg",
      label: "você",
    };

    const alternatives = [
      {
        photo: "assets/photos/cat.jpg",
        label: "gatinho",
        biaPositive: "entre um gato e a minha gatinha, claro que escolho você",
        wrongMessages: [
          "eles são fofos, mas pensa legal",
          "muito bonitinhos, mas calma",
          "pensa bem",
          "pensa legal",
          "vê direitinho isso aí",
        ],
      },
      {
        photo: "assets/photos/hot-shower.jpg",
        label: "banho quente",
        biaPositive: "eu só gosto de banho quente com você, claro que te escolho",
        wrongMessages: [
          "é relaxante, mas calma",
          "eu aprendi a gostar, mas pera aí",
          "tem seu valor nesse frio, mas pera",
          "vê legal aí",
        ],
      },
      {
        photo: "assets/photos/harry.jpg",
        label: "Harry Styles",
        biaPositive: "eu gosto dele, mas o que eu gosto mais de você é brincadeira",
        wrongMessages: [
          "to ansioso pro show, mas nem tanto",
          "ok, ele é bonitinho, mas pera aí",
          "o homi sabe, mas pensa bem",
          "ouço direto, mas calma lá",
        ],
      },
      {
        photo: "assets/photos/cookies.jpg",
        label: "um monte de cookies",
        biaPositive: "você é muito mais saborosa que qualquer cookie",
        wrongMessages: [
          "ookie cookie é bom, mas vê legal",
          "pensa uma, duas, até três vezes",
          "vê direitinho",
        ],
      },
      {
        photo: "assets/photos/jesus.jpg",
        label: "Jesus",
        biaPositive: "com todo respeito ao nosso Senhor, é claro",
        wrongMessages: [
          "com todo respeito ao nosso senhor",
          "eu digo com todo respeito",
          "eu já fiz muito o trabalho dele",
          "já li muito esse cara aí, mas...",
        ],
      },
      {
        photo: "assets/photos/ronaldo.jpg",
        label: "Cristiano",
        // rodada especial: precisa clicar na bia 2x
        requiresHesitation: true,
        biaHesitation: "po amor, é o cristiano",
        biaPositive: "era um páreo duro, mas óbvio que eu prefiro você",
        wrongMessages: [
          "o homem é uma besta enjaulada",
          "um líder nato",
          "um vencedor",
          "po... é o cris",
          "o homi é um gigante",
        ],
      },
    ];

    // fallback caso alguma alternativa fique sem wrongMessages no futuro
    const defaultWrongMessages = [
      "errado",
      "tenta de novo",
      "olha de novo",
    ];

    let roundIdx = 0;
    let busy = false;
    let feedbackTimer = null;
    let lastWrongIdx = -1;
    let biaClicksThisRound = 0;

    function pickMessage(arr, lastIdx) {
      if (arr.length === 1) return { msg: arr[0], idx: 0 };
      let idx;
      do {
        idx = Math.floor(Math.random() * arr.length);
      } while (idx === lastIdx);
      return { msg: arr[idx], idx };
    }

    function showFeedback(message, isFinal = false) {
      if (!feedback) return;
      if (feedbackTimer) {
        window.clearTimeout(feedbackTimer);
        feedbackTimer = null;
      }

      if (isFinal) {
        feedback.classList.remove("is-visible");
      }

      let span = feedback.querySelector(".choose-feedback__text");
      if (!span) {
        span = document.createElement("span");
        span.className = "choose-feedback__text";
        feedback.appendChild(span);
      }
      span.textContent = message;

      if (isFinal) {
        feedback.classList.add("is-final");
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            feedback.classList.add("is-visible");
          });
        });
      } else {
        feedback.classList.remove("is-final");
        feedback.classList.add("is-visible");
        feedbackTimer = window.setTimeout(() => {
          feedback.classList.remove("is-visible");
        }, 1700);
      }
    }

    function makeCard(data, choice) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "choose-card";
      btn.dataset.choice = choice;
      btn.innerHTML = `
        <img class="choose-card__photo" src="${data.photo}" alt="" loading="lazy" />
        <span class="choose-card__label">${data.label}</span>
      `;
      return btn;
    }

    function renderRound() {
      arena.innerHTML = "";
      biaClicksThisRound = 0;
      lastWrongIdx = -1;

      const alt = alternatives[roundIdx];
      // bia sempre primeiro (esquerda no desktop, topo no mobile)
      const order = [
        { data: biaCard, choice: "bia" },
        { data: alt, choice: "alt" },
      ];

      arena.classList.add("is-entering");
      // card 1 → "vs" → card 2
      arena.appendChild(makeCard(order[0].data, order[0].choice));
      const vs = document.createElement("span");
      vs.className = "choose-vs";
      vs.textContent = "vs";
      vs.setAttribute("aria-hidden", "true");
      arena.appendChild(vs);
      arena.appendChild(makeCard(order[1].data, order[1].choice));

      // double rAF pra a transição pegar
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          arena.classList.remove("is-entering");
        });
      });
    }

    // primeira renderização
    renderRound();

    arena.addEventListener("click", (event) => {
      if (busy) return;
      const card = event.target.closest(".choose-card");
      if (!card) return;
      if (card.classList.contains("is-correct")) return;
      if (card.classList.contains("is-wrong")) return;

      const alt = alternatives[roundIdx];

      if (card.dataset.choice === "bia") {
        // rodada com hesitação (cristiano): 1º clique na bia não vale,
        // só mostra o "hmmmmm" e deixa a carta clicável de novo
        if (alt.requiresHesitation && biaClicksThisRound === 0) {
          biaClicksThisRound = 1;
          showFeedback(alt.biaHesitation);
          card.classList.add("is-hesitating");
          window.setTimeout(() => {
            card.classList.remove("is-hesitating");
          }, 500);
          return;
        }

        // clique válido na bia: trava, limpa hesitação se tiver, mostra positivo
        busy = true;
        card.classList.remove("is-hesitating");
        card.classList.add("is-correct");

        const isLastRound = roundIdx === alternatives.length - 1;
        if (isLastRound) {
          // mensagem positiva da última rodada serve como final do nível
          window.setTimeout(() => {
            showFeedback(alt.biaPositive, true);
          }, 700);
          window.setTimeout(() => {
            if (window.presente) window.presente.next();
          }, 5200);
          return;
        }

        // rodada normal: positivo personalizado + próxima rodada
        showFeedback(alt.biaPositive);
        window.setTimeout(() => {
          arena.classList.add("is-leaving");
          window.setTimeout(() => {
            roundIdx += 1;
            arena.classList.remove("is-leaving");
            renderRound();
            busy = false;
          }, 600);
        }, 2200);
      } else {
        // errou (ou clicou na alternativa) — shake + mensagem,
        // usa o array da própria rodada se tiver, senão o default
        card.classList.add("is-wrong");
        const wrongs = alt.wrongMessages || defaultWrongMessages;
        const w = pickMessage(wrongs, lastWrongIdx);
        lastWrongIdx = w.idx;
        showFeedback(w.msg);

        window.setTimeout(() => {
          card.classList.remove("is-wrong");
        }, 400);
      }
    });
  }

  initChooseGame();
})();
