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
    photoLifetimeMs: 5000,
    inflateDurationMinMs: 1500,
    inflateDurationMaxMs: 2000,
    noteChance: 0.18,
    minDistancePx: 24,
    bottomSafeZonePx: 36,
    introAutoAdvanceMs: 7000,
    memoryWallRevealMs: 950
  };

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

  function getMemoryPools(memories) {
    return {
      photos: memories.filter((memory) => memory.type === "photo"),
      notes: memories.filter((memory) => memory.type === "note")
    };
  }

  function pickMemory(memories, noteChance, random) {
    const pools = getMemoryPools(memories);
    const shouldPickNote = pools.notes.length > 0 && random() < noteChance;
    const pool = shouldPickNote || pools.photos.length === 0 ? pools.notes : pools.photos;

    if (pool.length === 0) {
      return null;
    }

    return pool[Math.floor(random() * pool.length)];
  }

  function getItemSize(type, stageRect) {
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
    const intro = document.getElementById("intro");
    const memoryWall = document.getElementById("memoryWall");
    const stage = document.getElementById("memoryStage");
    const template = document.getElementById("memoryItemTemplate");

    if (!intro || !memoryWall || !stage || !template) {
      return null;
    }

    const state = {
      activeItems: new Map(),
      counter: 0,
      hasStarted: false,
      spawnTimer: null,
      introTimer: null,
      revealTimer: null
    };

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

    function createItemElement(memory, size, position) {
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

      const memory = pickMemory(memories, config.noteChance, random);

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
      }, config.memoryWallRevealMs);
    }

    intro.addEventListener("click", startMemoryWall);
    intro.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startMemoryWall();
      }
    });

    state.introTimer = window.setTimeout(startMemoryWall, config.introAutoAdvanceMs);

    return {
      destroy() {
        window.clearInterval(state.spawnTimer);
        window.clearTimeout(state.introTimer);
        window.clearTimeout(state.revealTimer);
        state.activeItems.forEach((item) => {
          window.clearTimeout(item.timeoutId);
          item.element.remove();
        });
        state.activeItems.clear();
      },
      spawnMemory,
      startMemoryWall,
      state
    };
  }

  if (typeof window !== "undefined") {
    window.addEventListener("DOMContentLoaded", () => initBirthdaySite());
  }

  return {
    CONFIG,
    canSpawnItem,
    findNonOverlappingPosition,
    initBirthdaySite,
    pickMemory,
    rectsOverlap
  };
});
