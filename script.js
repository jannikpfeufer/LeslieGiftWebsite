(function initModule(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.LeslieBirthday = api;
  }
})(typeof window !== "undefined" ? window : null, function createBirthdayApi() {
  const CONFIG = {
    maxVisibleItems: 4,
    spawnIntervalMs: 1800,
    photoLifetimeMs: 4000,
    inflateDurationMinMs: 1000,
    inflateDurationMaxMs: 1500,
    noteChance: 0.05,
    stickerChance: 0.12,
    minDistancePx: 24,
    bottomSafeZonePx: 36,
    introAutoAdvanceMs: 7000,
    memoryWallRevealMs: 950,
    confettiDurationMs: 2200,
    confettiParticleCount: 680,
    loveLetterMinDelayMs: 45000,
    loveLetterMaxDelayMs: 60000,
    loveLetterFlightDurationMs: 9000,
    crazySpawnIntervalMs: 150,
    crazyBurstCount: 8,
    crazyMaxItems: 60,
    leslieCrazyMaxItems: 120
  };

  const CONFETTI_COLORS = ["#f77ca7", "#b79cff", "#f4c96b", "#bfead9", "#ff8f70", "#7ab7ff"];
  const LESLIE_LETTER_POINTS = [
    [0.02, 0.08],
    [0.02, 0.24],
    [0.02, 0.4],
    [0.02, 0.56],
    [0.02, 0.72],
    [0.02, 0.88],
    [0.11, 0.88],
    [0.2, 0.88],
    [0.31, 0.1],
    [0.22, 0.1],
    [0.22, 0.28],
    [0.22, 0.46],
    [0.31, 0.46],
    [0.22, 0.64],
    [0.22, 0.82],
    [0.31, 0.82],
    [0.34, 0.18],
    [0.43, 0.1],
    [0.52, 0.18],
    [0.43, 0.46],
    [0.35, 0.7],
    [0.43, 0.86],
    [0.53, 0.76],
    [0.58, 0.08],
    [0.58, 0.24],
    [0.58, 0.4],
    [0.58, 0.56],
    [0.58, 0.72],
    [0.58, 0.88],
    [0.68, 0.08],
    [0.68, 0.24],
    [0.68, 0.4],
    [0.68, 0.56],
    [0.68, 0.72],
    [0.68, 0.88],
    [0.8, 0.1],
    [0.71, 0.1],
    [0.71, 0.28],
    [0.71, 0.46],
    [0.8, 0.46],
    [0.71, 0.64],
    [0.71, 0.82],
    [0.8, 0.82]
  ];

  function canSpawnItem(activeCount, maxVisibleItems) {
    return activeCount < maxVisibleItems;
  }

  function rectsOverlap(first, second, minDistance) {
    const gap = minDistance || 0;

    return !(
      first.left + first.width + gap <= second.left ||
      second.left + second.width + gap <= first.left ||
      first.top + first.height + gap <= second.top ||
      second.top + second.height + gap <= first.top
    );
  }

  function findNonOverlappingPosition(options) {
    const {
      stageWidth,
      stageHeight,
      itemWidth,
      itemHeight,
      activeRects,
      minDistance,
      bottomSafeZone = 0,
      maxAttempts = 40,
      random = Math.random
    } = options;

    const minLeft = minDistance;
    const minTop = minDistance;
    const maxLeft = Math.max(minLeft, stageWidth - itemWidth - minDistance);
    const maxTop = Math.max(minTop, stageHeight - itemHeight - minDistance - bottomSafeZone);
    const leftRange = Math.max(0, maxLeft - minLeft);
    const topRange = Math.max(0, maxTop - minTop);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const left = Math.round(minLeft + random() * leftRange);
      const top = Math.round(minTop + random() * topRange);
      const candidate = { left, top, width: itemWidth, height: itemHeight };
      const overlaps = activeRects.some((rect) => rectsOverlap(candidate, rect, minDistance));

      if (!overlaps) {
        return { left, top };
      }
    }

    return null;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function randomBetween(min, max, random) {
    return min + random() * (max - min);
  }

  function createConfettiParticles(options) {
    const {
      originX,
      originY,
      count,
      random = Math.random,
      colors = CONFETTI_COLORS
    } = options;

    return Array.from({ length: count }, () => {
      const angle = randomBetween(-Math.PI, Math.PI, random);
      const speed = randomBetween(10, 24, random);

      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randomBetween(7, 16, random),
        size: randomBetween(5, 14, random),
        widthScale: randomBetween(0.55, 1.35, random),
        rotation: randomBetween(0, Math.PI * 2, random),
        spin: randomBetween(-0.28, 0.28, random),
        gravity: randomBetween(0.28, 0.52, random),
        drag: randomBetween(0.985, 0.995, random),
        color: colors[Math.floor(random() * colors.length)] || colors[0]
      };
    });
  }

  function getMemoryPools(memories) {
    return {
      photos: memories.filter((memory) => memory.type === "photo"),
      notes: memories.filter((memory) => memory.type === "note"),
      stickers: memories.filter((memory) => memory.type === "sticker")
    };
  }

  function pickMemory(memories, noteChance, stickerChance, random) {
    if (typeof stickerChance === "function") {
      random = stickerChance;
      stickerChance = 0;
    }

    const pools = getMemoryPools(memories);
    const roll = random();
    const shouldPickSticker = pools.stickers.length > 0 && roll < stickerChance;
    const shouldPickNote = pools.notes.length > 0 && roll < stickerChance + noteChance;
    let pool = pools.photos;

    if (shouldPickSticker) {
      pool = pools.stickers;
    } else if (shouldPickNote || pools.photos.length === 0) {
      pool = pools.notes;
    }

    if (pool.length === 0) {
      pool = pools.stickers.length > 0 ? pools.stickers : pools.notes;
    }

    if (pool.length === 0) {
      return null;
    }

    return pool[Math.floor(random() * pool.length)];
  }

  function getItemSize(type, stageRect) {
    if (type === "sticker") {
      const size = Math.round(clamp(stageRect.width * 0.16, 96, 180));

      return {
        width: size,
        height: size
      };
    }

    if (type === "note") {
      return {
        width: Math.round(clamp(stageRect.width * 0.24, 170, 235)),
        height: Math.round(clamp(stageRect.height * 0.24, 132, 180))
      };
    }

    return {
      width: Math.round(clamp(stageRect.width * 0.26, 178, 280)),
      height: Math.round(clamp(stageRect.height * 0.46, 226, 340))
    };
  }

  function initBirthdaySite(options = {}) {
    if (typeof document === "undefined") {
      return null;
    }

    const config = { ...CONFIG, ...(options.config || {}) };
    const random = options.random || Math.random;
    const memories = options.memories || window.memories || [];
    const welcome = document.getElementById("welcome");
    const welcomeMessage = document.getElementById("welcomeMessage");
    const landingImage = document.getElementById("landingImage");
    const wrongAnswerImage = document.getElementById("wrongAnswerImage");
    const confettiCanvas = document.getElementById("confettiCanvas");
    const readyActions = document.getElementById("readyActions");
    const pleaseActions = document.getElementById("pleaseActions");
    const acceptGift = document.getElementById("acceptGift");
    const declineGift = document.getElementById("declineGift");
    const backToQuestion = document.getElementById("backToQuestion");
    const intro = document.getElementById("intro");
    const memoryWall = document.getElementById("memoryWall");
    const stage = document.getElementById("memoryStage");
    const template = document.getElementById("memoryItemTemplate");
    const loveLetterFlyer = document.getElementById("loveLetterFlyer");
    const loveLetterModal = document.getElementById("loveLetterModal");
    const closeLoveLetterButton = document.getElementById("closeLoveLetter");

    if (
      !welcome ||
      !welcomeMessage ||
      !landingImage ||
      !wrongAnswerImage ||
      !confettiCanvas ||
      !readyActions ||
      !pleaseActions ||
      !acceptGift ||
      !declineGift ||
      !backToQuestion ||
      !intro ||
      !memoryWall ||
      !stage ||
      !template ||
      !loveLetterFlyer ||
      !loveLetterModal ||
      !closeLoveLetterButton
    ) {
      return null;
    }

    const state = {
      activeItems: new Map(),
      counter: 0,
      hasStarted: false,
      spawnTimer: null,
      introTimer: null,
      revealTimer: null,
      confettiFrameId: null,
      loveLetterTimer: null,
      loveLetterFlightTimer: null,
      crazySpawnTimer: null,
      crazyBurstTimers: [],
      crazyItems: new Set(),
      isCrazyMode: false,
      leslieCrazySpawnTimer: null,
      leslieCrazyBurstTimers: [],
      leslieCrazyItems: new Set(),
      leslieLetterIndex: 0,
      isLeslieCrazyMode: false,
      niquerCrazySpawnTimer: null,
      niquerCrazyBurstTimers: [],
      niquerCrazyItems: new Set(),
      isNiquerCrazyMode: false,
      isEnteringGift: false
    };

    const readyQuestion = "Coucou mon Amoureuse, are you ready to see your gift?";
    const pleaseMessage =
      '<span class="welcome__message-line welcome__message-line--main">Wrong answer!</span><span class="welcome__message-line welcome__message-line--sub">i prepared this gift for you, please take a look</span>';

    function getBirthdayTitleOrigin() {
      const title = intro.querySelector(".intro__title");
      const rect = title.getBoundingClientRect();

      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    }

    function sizeConfettiCanvas() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = confettiCanvas.getBoundingClientRect();

      confettiCanvas.width = Math.max(1, Math.round(rect.width * ratio));
      confettiCanvas.height = Math.max(1, Math.round(rect.height * ratio));

      return ratio;
    }

    function revealBirthdayIntro() {
      welcome.classList.add("is-leaving");
      welcome.setAttribute("aria-hidden", "true");
      intro.classList.remove("is-hidden");
      intro.classList.add("is-ready");
      intro.focus();
      state.introTimer = window.setTimeout(startMemoryWall, config.introAutoAdvanceMs);
    }

    function runConfettiExplosion(origin, onComplete) {
      const context = confettiCanvas.getContext("2d");

      if (!context) {
        onComplete();
        return;
      }

      const ratio = sizeConfettiCanvas();
      const particles = createConfettiParticles({
        originX: origin.x,
        originY: origin.y,
        count: config.confettiParticleCount,
        random
      });
      let startTime = null;

      confettiCanvas.classList.add("is-active");

      function draw(timestamp) {
        if (startTime === null) {
          startTime = timestamp;
        }

        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / config.confettiDurationMs, 1);
        const timeScale = 1.12;

        context.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        context.save();
        context.scale(ratio, ratio);

        particles.forEach((particle) => {
          particle.vx *= particle.drag;
          particle.vy += particle.gravity * timeScale;
          particle.x += particle.vx * timeScale;
          particle.y += particle.vy * timeScale;
          particle.rotation += particle.spin * timeScale;

          context.save();
          context.globalAlpha = 1 - Math.max(0, progress - 0.74) / 0.26;
          context.translate(particle.x, particle.y);
          context.rotate(particle.rotation);
          context.fillStyle = particle.color;
          context.fillRect(
            -particle.size / 2,
            -(particle.size * particle.widthScale) / 2,
            particle.size,
            particle.size * particle.widthScale
          );
          context.restore();
        });

        context.restore();

        if (progress < 1) {
          state.confettiFrameId = window.requestAnimationFrame(draw);
          return;
        }

        context.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        confettiCanvas.classList.remove("is-active");
        state.confettiFrameId = null;
        onComplete();
      }

      state.confettiFrameId = window.requestAnimationFrame(draw);
    }

    function showBirthdayIntro() {
      if (state.isEnteringGift) {
        return;
      }

      state.isEnteringGift = true;
      acceptGift.disabled = true;
      declineGift.disabled = true;
      revealBirthdayIntro();
      window.requestAnimationFrame(() => {
        runConfettiExplosion(getBirthdayTitleOrigin(), () => {});
      });
    }

    function showPleaseMessage() {
      welcomeMessage.innerHTML = pleaseMessage;
      landingImage.classList.add("is-hidden");
      wrongAnswerImage.classList.remove("is-hidden");
      readyActions.classList.add("is-hidden");
      pleaseActions.classList.remove("is-hidden");
    }

    function showReadyQuestion() {
      welcomeMessage.textContent = readyQuestion;
      wrongAnswerImage.classList.add("is-hidden");
      landingImage.classList.remove("is-hidden");
      pleaseActions.classList.add("is-hidden");
      readyActions.classList.remove("is-hidden");
    }

    function activeRects() {
      const stageRect = stage.getBoundingClientRect();

      return Array.from(state.activeItems.values()).map((item) => {
        const rect = item.element.getBoundingClientRect();

        return {
          left: rect.left - stageRect.left,
          top: rect.top - stageRect.top,
          width: rect.width,
          height: rect.height
        };
      });
    }

    function removeItem(id) {
      const item = state.activeItems.get(id);

      if (!item || item.isLeaving) {
        return;
      }

      if (item.isPinned) {
        item.isExpired = true;
        return;
      }

      item.isLeaving = true;
      item.element.classList.add("is-leaving");
      item.element.addEventListener(
        "animationend",
        () => {
          item.element.remove();
          state.activeItems.delete(id);
          spawnMemory();
        },
        { once: true }
      );
    }

    function scheduleRemoval(item) {
      item.timeoutId = window.setTimeout(() => {
        removeItem(item.id);
      }, config.photoLifetimeMs);
    }

    function pinItem(item) {
      item.isPinned = true;
    }

    function unpinItem(item) {
      item.isPinned = false;

      if (item.isExpired) {
        window.setTimeout(() => removeItem(item.id), 450);
      }
    }

    function buildPhoto(memory, item) {
      const img = document.createElement("img");
      img.className = "memory-item__image";
      img.src = memory.src;
      img.alt = memory.alt || "A sweet memory with Leslie";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => {
        item.classList.add("is-missing");
      });

      const caption = document.createElement("figcaption");
      caption.className = "memory-item__caption";
      caption.textContent = memory.caption || "A moment with you";

      return [img, caption];
    }

    function buildNote(memory) {
      const note = document.createElement("p");
      note.className = "memory-item__note";
      note.textContent = memory.text;
      return [note];
    }

    function buildSticker(memory) {
      const sticker = document.createElement("img");
      sticker.className = "sticker-item";
      sticker.src = memory.src;
      sticker.alt = memory.alt || "A cute sticker";
      sticker.loading = "lazy";
      sticker.decoding = "async";
      return sticker;
    }

    function createItemElement(memory, size, position) {
      if (memory.type === "sticker") {
        const sticker = buildSticker(memory);
        const rotation = `${randomBetween(-12, 12, random).toFixed(2)}deg`;

        sticker.style.setProperty("--item-width", `${size.width}px`);
        sticker.style.setProperty("--item-height", `${size.height}px`);
        sticker.style.setProperty("--item-left", `${position.left}px`);
        sticker.style.setProperty("--item-top", `${position.top}px`);
        sticker.style.setProperty("--item-rotation", rotation);
        sticker.style.setProperty(
          "--inflate-duration",
          `${Math.round(randomBetween(config.inflateDurationMinMs, config.inflateDurationMaxMs, random))}ms`
        );

        return sticker;
      }

      const fragment = template.content.cloneNode(true);
      const item = fragment.querySelector(".memory-item");
      const inner = item.querySelector(".memory-item__inner");
      const rotation = `${randomBetween(-8, 8, random).toFixed(2)}deg`;

      item.classList.toggle("is-note", memory.type === "note");
      item.style.setProperty("--item-width", `${size.width}px`);
      item.style.setProperty("--item-height", `${size.height}px`);
      item.style.setProperty("--item-left", `${position.left}px`);
      item.style.setProperty("--item-top", `${position.top}px`);
      item.style.setProperty("--item-rotation", rotation);
      item.style.setProperty(
        "--inflate-duration",
        `${Math.round(randomBetween(config.inflateDurationMinMs, config.inflateDurationMaxMs, random))}ms`
      );

      const children = memory.type === "note" ? buildNote(memory) : buildPhoto(memory, item);
      children.forEach((child) => inner.appendChild(child));

      return item;
    }

    function spawnMemory() {
      if (!canSpawnItem(state.activeItems.size, config.maxVisibleItems)) {
        return;
      }

      const memory = pickMemory(memories, config.noteChance, config.stickerChance, random);

      if (!memory) {
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const size = getItemSize(memory.type, stageRect);
      const position = findNonOverlappingPosition({
        stageWidth: stageRect.width,
        stageHeight: stageRect.height,
        itemWidth: size.width,
        itemHeight: size.height,
        activeRects: activeRects(),
        minDistance: config.minDistancePx,
        bottomSafeZone: config.bottomSafeZonePx,
        random
      });

      if (!position) {
        return;
      }

      const id = `memory-${state.counter}`;
      state.counter += 1;

      const element = createItemElement(memory, size, position);
      const itemState = {
        id,
        element,
        isExpired: false,
        isLeaving: false,
        isPinned: false,
        timeoutId: null
      };

      element.dataset.memoryId = id;
      element.addEventListener("pointerenter", () => pinItem(itemState));
      element.addEventListener("pointerleave", () => unpinItem(itemState));
      element.addEventListener("focusin", () => pinItem(itemState));
      element.addEventListener("focusout", () => unpinItem(itemState));

      state.activeItems.set(id, itemState);
      stage.appendChild(element);
      scheduleRemoval(itemState);
    }

    function findCrazyPosition(size, stageRect) {
      const maxLeft = Math.max(0, stageRect.width - size.width);
      const maxTop = Math.max(0, stageRect.height - size.height);

      return {
        left: Math.round(random() * maxLeft),
        top: Math.round(random() * maxTop)
      };
    }

    function spawnCrazyMemory() {
      const memory = pickMemory(memories, config.noteChance, config.stickerChance, random);

      if (!memory) {
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const size = getItemSize(memory.type, stageRect);
      const position = findCrazyPosition(size, stageRect);
      const element = createItemElement(memory, size, position);

      element.classList.add("is-crazy-memory");
      element.style.zIndex = String(20 + (state.counter % 300));
      state.counter += 1;
      state.crazyItems.add(element);
      stage.appendChild(element);
      trimCrazyItems();
    }

    function getLeslieStickerMemory() {
      return (
        memories.find(
          (memory) => memory.type === "sticker" && /LeslieSticker\.png$/i.test(memory.src || "")
        ) || {
          type: "sticker",
          src: "assets/stickers/LeslieSticker.png",
          alt: "Leslie sticker"
        }
      );
    }

    function findLeslieLetterPosition(size, stageRect) {
      if (state.leslieLetterIndex >= LESLIE_LETTER_POINTS.length) {
        return findCrazyPosition(size, stageRect);
      }

      const point = LESLIE_LETTER_POINTS[state.leslieLetterIndex % LESLIE_LETTER_POINTS.length];
      const maxLeft = Math.max(0, stageRect.width - size.width);
      const maxTop = Math.max(0, stageRect.height - size.height);
      const wordWidth = Math.min(maxLeft, stageRect.width * 0.94);
      const wordHeight = Math.min(maxTop, stageRect.height * 0.72);
      const originLeft = Math.max(0, (stageRect.width - wordWidth - size.width) / 2);
      const originTop = Math.max(0, (stageRect.height - wordHeight - size.height) / 2);
      const jitterX = randomBetween(-10, 10, random);
      const jitterY = randomBetween(-10, 10, random);

      state.leslieLetterIndex += 1;

      return {
        left: Math.round(clamp(originLeft + point[0] * wordWidth + jitterX, 0, maxLeft)),
        top: Math.round(clamp(originTop + point[1] * wordHeight + jitterY, 0, maxTop))
      };
    }

    function spawnLeslieCrazyMemory() {
      const memory = getLeslieStickerMemory();
      const stageRect = stage.getBoundingClientRect();
      const size = getItemSize(memory.type, stageRect);
      const position = findLeslieLetterPosition(size, stageRect);
      const element = createItemElement(memory, size, position);

      element.classList.add("is-crazy-memory", "is-leslie-crazy-memory");
      element.style.zIndex = String(20 + (state.counter % 300));
      state.counter += 1;
      state.leslieCrazyItems.add(element);
      stage.appendChild(element);
      trimLeslieCrazyItems();
    }

    function getNiquerMemories() {
      return memories.filter(
        (memory) => memory.type === "photo" && /\/niquer(0[1-9]|1[0-4])\./i.test(memory.src || "")
      );
    }

    function pickNiquerMemory() {
      const niquerMemories = getNiquerMemories();

      if (niquerMemories.length === 0) {
        return null;
      }

      return niquerMemories[Math.floor(random() * niquerMemories.length)];
    }

    function spawnNiquerCrazyMemory() {
      const memory = pickNiquerMemory();

      if (!memory) {
        return;
      }

      const stageRect = stage.getBoundingClientRect();
      const size = getItemSize(memory.type, stageRect);
      const position = findCrazyPosition(size, stageRect);
      const element = createItemElement(memory, size, position);

      element.classList.add("is-crazy-memory", "is-niquer-crazy-memory");
      element.style.zIndex = String(20 + (state.counter % 300));
      state.counter += 1;
      state.niquerCrazyItems.add(element);
      stage.appendChild(element);
      trimNiquerCrazyItems();
    }

    function stopNormalSpawnTimer() {
      window.clearInterval(state.spawnTimer);
      state.spawnTimer = null;
    }

    function clearActiveRemovalTimers() {
      state.activeItems.forEach((item) => {
        window.clearTimeout(item.timeoutId);
        item.isExpired = false;
      });
    }

    function trimCrazyItems() {
      while (state.crazyItems.size > config.crazyMaxItems) {
        const oldestItem = state.crazyItems.values().next().value;

        if (!oldestItem) {
          return;
        }

        oldestItem.remove();
        state.crazyItems.delete(oldestItem);
      }
    }

    function trimLeslieCrazyItems() {
      while (state.leslieCrazyItems.size > config.leslieCrazyMaxItems) {
        const oldestItem = state.leslieCrazyItems.values().next().value;

        if (!oldestItem) {
          return;
        }

        oldestItem.remove();
        state.leslieCrazyItems.delete(oldestItem);
      }
    }

    function trimNiquerCrazyItems() {
      while (state.niquerCrazyItems.size > config.crazyMaxItems) {
        const oldestItem = state.niquerCrazyItems.values().next().value;

        if (!oldestItem) {
          return;
        }

        oldestItem.remove();
        state.niquerCrazyItems.delete(oldestItem);
      }
    }

    function clearCrazyItems() {
      state.crazyItems.forEach((item) => item.remove());
      state.crazyItems.clear();
    }

    function clearLeslieCrazyItems() {
      state.leslieCrazyItems.forEach((item) => item.remove());
      state.leslieCrazyItems.clear();
    }

    function clearNiquerCrazyItems() {
      state.niquerCrazyItems.forEach((item) => item.remove());
      state.niquerCrazyItems.clear();
    }

    function clearCrazyBurstTimers() {
      state.crazyBurstTimers.forEach((timerId) => window.clearTimeout(timerId));
      state.crazyBurstTimers = [];
    }

    function clearLeslieCrazyBurstTimers() {
      state.leslieCrazyBurstTimers.forEach((timerId) => window.clearTimeout(timerId));
      state.leslieCrazyBurstTimers = [];
    }

    function clearNiquerCrazyBurstTimers() {
      state.niquerCrazyBurstTimers.forEach((timerId) => window.clearTimeout(timerId));
      state.niquerCrazyBurstTimers = [];
    }

    function restartNormalSpawnTimer() {
      if (!state.hasStarted || state.spawnTimer !== null) {
        return;
      }

      state.spawnTimer = window.setInterval(spawnMemory, config.spawnIntervalMs);
    }

    function restartActiveRemovalTimers() {
      state.activeItems.forEach((item) => {
        if (!item.isLeaving) {
          scheduleRemoval(item);
        }
      });
    }

    function startCrazyMode() {
      if (!state.hasStarted || state.isCrazyMode) {
        return;
      }

      stopLeslieCrazyMode();
      stopNiquerCrazyMode();
      state.isCrazyMode = true;
      document.body.classList.add("is-crazy-mode");
      memoryWall.classList.add("is-crazy-mode");
      stopNormalSpawnTimer();
      clearActiveRemovalTimers();

      for (let index = 0; index < config.crazyBurstCount; index += 1) {
        const timerId = window.setTimeout(spawnCrazyMemory, index * 35);
        state.crazyBurstTimers.push(timerId);
      }

      state.crazySpawnTimer = window.setInterval(spawnCrazyMemory, config.crazySpawnIntervalMs);
    }

    function stopCrazyMode() {
      if (!state.isCrazyMode) {
        return;
      }

      state.isCrazyMode = false;
      document.body.classList.remove("is-crazy-mode");
      memoryWall.classList.remove("is-crazy-mode");
      window.clearInterval(state.crazySpawnTimer);
      state.crazySpawnTimer = null;
      clearCrazyBurstTimers();
      clearCrazyItems();
      restartActiveRemovalTimers();
      restartNormalSpawnTimer();
    }

    function toggleCrazyMode() {
      if (state.isCrazyMode) {
        stopCrazyMode();
        return;
      }

      startCrazyMode();
    }

    function startLeslieCrazyMode() {
      if (!state.hasStarted || state.isLeslieCrazyMode) {
        return;
      }

      stopCrazyMode();
      stopNiquerCrazyMode();
      state.isLeslieCrazyMode = true;
      state.leslieLetterIndex = 0;
      document.body.classList.add("is-crazy-mode", "is-leslie-crazy-mode");
      memoryWall.classList.add("is-crazy-mode", "is-leslie-crazy-mode");
      stopNormalSpawnTimer();
      clearActiveRemovalTimers();

      for (let index = 0; index < config.crazyBurstCount; index += 1) {
        const timerId = window.setTimeout(spawnLeslieCrazyMemory, index * 35);
        state.leslieCrazyBurstTimers.push(timerId);
      }

      state.leslieCrazySpawnTimer = window.setInterval(
        spawnLeslieCrazyMemory,
        config.crazySpawnIntervalMs
      );
    }

    function stopLeslieCrazyMode() {
      if (!state.isLeslieCrazyMode) {
        return;
      }

      state.isLeslieCrazyMode = false;
      document.body.classList.remove("is-crazy-mode", "is-leslie-crazy-mode");
      memoryWall.classList.remove("is-crazy-mode", "is-leslie-crazy-mode");
      window.clearInterval(state.leslieCrazySpawnTimer);
      state.leslieCrazySpawnTimer = null;
      clearLeslieCrazyBurstTimers();
      clearLeslieCrazyItems();
      restartActiveRemovalTimers();
      restartNormalSpawnTimer();
    }

    function toggleLeslieCrazyMode() {
      if (state.isLeslieCrazyMode) {
        stopLeslieCrazyMode();
        return;
      }

      startLeslieCrazyMode();
    }

    function startNiquerCrazyMode() {
      if (!state.hasStarted || state.isNiquerCrazyMode) {
        return;
      }

      stopCrazyMode();
      stopLeslieCrazyMode();
      state.isNiquerCrazyMode = true;
      document.body.classList.add("is-crazy-mode", "is-niquer-crazy-mode");
      memoryWall.classList.add("is-crazy-mode", "is-niquer-crazy-mode");
      stopNormalSpawnTimer();
      clearActiveRemovalTimers();

      for (let index = 0; index < config.crazyBurstCount; index += 1) {
        const timerId = window.setTimeout(spawnNiquerCrazyMemory, index * 35);
        state.niquerCrazyBurstTimers.push(timerId);
      }

      state.niquerCrazySpawnTimer = window.setInterval(
        spawnNiquerCrazyMemory,
        config.crazySpawnIntervalMs
      );
    }

    function stopNiquerCrazyMode() {
      if (!state.isNiquerCrazyMode) {
        return;
      }

      state.isNiquerCrazyMode = false;
      document.body.classList.remove("is-crazy-mode", "is-niquer-crazy-mode");
      memoryWall.classList.remove("is-crazy-mode", "is-niquer-crazy-mode");
      window.clearInterval(state.niquerCrazySpawnTimer);
      state.niquerCrazySpawnTimer = null;
      clearNiquerCrazyBurstTimers();
      clearNiquerCrazyItems();
      restartActiveRemovalTimers();
      restartNormalSpawnTimer();
    }

    function toggleNiquerCrazyMode() {
      if (state.isNiquerCrazyMode) {
        stopNiquerCrazyMode();
        return;
      }

      startNiquerCrazyMode();
    }

    function shouldIgnoreSpaceShortcut(event) {
      const target = event.target;

      return Boolean(
        target &&
          target.closest &&
          target.closest('button, a, input, textarea, select, [contenteditable="true"]')
      );
    }

    function getLoveLetterDelay() {
      return Math.round(
        randomBetween(config.loveLetterMinDelayMs, config.loveLetterMaxDelayMs, random)
      );
    }

    function scheduleLoveLetterFlight() {
      window.clearTimeout(state.loveLetterTimer);
      state.loveLetterTimer = window.setTimeout(launchLoveLetterFlyer, getLoveLetterDelay());
    }

    function hideLoveLetterFlyer() {
      loveLetterFlyer.classList.add("is-hidden");
      loveLetterFlyer.classList.remove("is-flying");
    }

    function launchLoveLetterFlyer() {
      if (!state.hasStarted || !loveLetterModal.classList.contains("is-hidden")) {
        scheduleLoveLetterFlight();
        return;
      }

      const top = Math.round(randomBetween(28, 68, random));
      loveLetterFlyer.style.setProperty("--letter-top", `${top}vh`);
      loveLetterFlyer.style.setProperty(
        "--letter-flight-duration",
        `${config.loveLetterFlightDurationMs}ms`
      );
      loveLetterFlyer.classList.remove("is-hidden");
      loveLetterFlyer.classList.remove("is-flying");
      void loveLetterFlyer.offsetWidth;
      loveLetterFlyer.classList.add("is-flying");

      window.clearTimeout(state.loveLetterFlightTimer);
      state.loveLetterFlightTimer = window.setTimeout(() => {
        hideLoveLetterFlyer();
        scheduleLoveLetterFlight();
      }, config.loveLetterFlightDurationMs);
    }

    function openLoveLetter() {
      window.clearTimeout(state.loveLetterFlightTimer);
      hideLoveLetterFlyer();
      loveLetterModal.classList.remove("is-hidden");
      closeLoveLetterButton.focus();
    }

    function closeLoveLetter() {
      loveLetterModal.classList.add("is-hidden");

      if (state.hasStarted) {
        scheduleLoveLetterFlight();
      }
    }

    function startMemoryWall() {
      if (state.hasStarted) {
        return;
      }

      state.hasStarted = true;
      window.clearTimeout(state.introTimer);
      intro.classList.add("is-leaving");
      memoryWall.classList.remove("is-hidden");

      window.setTimeout(() => {
        intro.setAttribute("aria-hidden", "true");
      }, config.memoryWallRevealMs);

      state.revealTimer = window.setTimeout(() => {
        for (let index = 0; index < config.maxVisibleItems; index += 1) {
          window.setTimeout(spawnMemory, index * 420);
        }

        state.spawnTimer = window.setInterval(spawnMemory, config.spawnIntervalMs);
        scheduleLoveLetterFlight();
      }, config.memoryWallRevealMs);
    }

    intro.addEventListener("click", startMemoryWall);
    intro.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startMemoryWall();
      }
    });

    acceptGift.addEventListener("click", showBirthdayIntro);
    declineGift.addEventListener("click", showPleaseMessage);
    backToQuestion.addEventListener("click", showReadyQuestion);
    loveLetterFlyer.addEventListener("click", openLoveLetter);
    closeLoveLetterButton.addEventListener("click", closeLoveLetter);
    loveLetterModal.addEventListener("click", (event) => {
      if (event.target === loveLetterModal) {
        closeLoveLetter();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !loveLetterModal.classList.contains("is-hidden")) {
        closeLoveLetter();
      }

      if (event.code === "Space" && state.hasStarted && !shouldIgnoreSpaceShortcut(event)) {
        event.preventDefault();
        toggleCrazyMode();
      }

      if (event.key.toLowerCase() === "l" && state.hasStarted && !shouldIgnoreSpaceShortcut(event)) {
        event.preventDefault();
        toggleLeslieCrazyMode();
      }

      if (event.key.toLowerCase() === "n" && state.hasStarted && !shouldIgnoreSpaceShortcut(event)) {
        event.preventDefault();
        toggleNiquerCrazyMode();
      }
    });

    return {
      destroy() {
        window.clearInterval(state.spawnTimer);
        window.clearTimeout(state.introTimer);
        window.clearTimeout(state.revealTimer);
        window.clearTimeout(state.loveLetterTimer);
        window.clearTimeout(state.loveLetterFlightTimer);
        window.clearInterval(state.crazySpawnTimer);
        window.clearInterval(state.leslieCrazySpawnTimer);
        window.clearInterval(state.niquerCrazySpawnTimer);
        clearCrazyBurstTimers();
        clearLeslieCrazyBurstTimers();
        clearNiquerCrazyBurstTimers();
        if (state.confettiFrameId !== null) {
          window.cancelAnimationFrame(state.confettiFrameId);
        }
        state.activeItems.forEach((item) => {
          window.clearTimeout(item.timeoutId);
          item.element.remove();
        });
        state.activeItems.clear();
        clearCrazyItems();
        clearLeslieCrazyItems();
        clearNiquerCrazyItems();
      },
      spawnMemory,
      spawnCrazyMemory,
      spawnLeslieCrazyMemory,
      spawnNiquerCrazyMemory,
      startMemoryWall,
      startCrazyMode,
      stopCrazyMode,
      toggleCrazyMode,
      startLeslieCrazyMode,
      stopLeslieCrazyMode,
      toggleLeslieCrazyMode,
      startNiquerCrazyMode,
      stopNiquerCrazyMode,
      toggleNiquerCrazyMode,
      scheduleLoveLetterFlight,
      launchLoveLetterFlyer,
      openLoveLetter,
      closeLoveLetter,
      showBirthdayIntro,
      showPleaseMessage,
      showReadyQuestion,
      state
    };
  }

  if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", () => initBirthdaySite());
  }

  return {
    CONFIG,
    canSpawnItem,
    createConfettiParticles,
    findNonOverlappingPosition,
    initBirthdaySite,
    pickMemory,
    rectsOverlap
  };
});
