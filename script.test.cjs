const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  canSpawnItem,
  findNonOverlappingPosition,
  rectsOverlap
} = require("./script.js");

test("canSpawnItem blocks new items at the configured maximum", () => {
  assert.equal(canSpawnItem(0, 4), true);
  assert.equal(canSpawnItem(3, 4), true);
  assert.equal(canSpawnItem(4, 4), false);
  assert.equal(canSpawnItem(5, 4), false);
});

test("rectsOverlap treats the minimum distance as padding around rectangles", () => {
  const first = { left: 10, top: 10, width: 100, height: 100 };
  const tooClose = { left: 122, top: 10, width: 100, height: 100 };
  const farEnough = { left: 140, top: 10, width: 100, height: 100 };

  assert.equal(rectsOverlap(first, tooClose, 24), true);
  assert.equal(rectsOverlap(first, farEnough, 24), false);
});

test("findNonOverlappingPosition skips overlapping attempts and returns a safe spot", () => {
  const activeRects = [{ left: 20, top: 20, width: 130, height: 160 }];
  const randomValues = [0, 0, 0.85, 0.75];
  const random = () => randomValues.shift() ?? 0.5;

  const position = findNonOverlappingPosition({
    stageWidth: 640,
    stageHeight: 420,
    itemWidth: 130,
    itemHeight: 160,
    activeRects,
    minDistance: 24,
    maxAttempts: 4,
    random
  });

  assert.notEqual(position, null);
  assert.equal(
    rectsOverlap(
      { left: position.left, top: position.top, width: 130, height: 160 },
      activeRects[0],
      24
    ),
    false
  );
  assert.ok(position.left >= 24);
  assert.ok(position.top >= 24);
  assert.ok(position.left <= 486);
  assert.ok(position.top <= 236);
});

test("findNonOverlappingPosition keeps a bottom safe zone for rotated cards", () => {
  const position = findNonOverlappingPosition({
    stageWidth: 640,
    stageHeight: 420,
    itemWidth: 130,
    itemHeight: 160,
    activeRects: [],
    minDistance: 24,
    bottomSafeZone: 36,
    random: () => 1
  });

  assert.notEqual(position, null);
  assert.equal(position.top, 200);
});

test("memory data uses English text for captions and notes", () => {
  global.window = {};
  delete require.cache[require.resolve("./assets/data/memories.js")];
  require("./assets/data/memories.js");

  const allText = window.memories
    .flatMap((memory) => [memory.caption, memory.text].filter(Boolean))
    .join(" ");

  assert.match(allText, /favorite person/i);
  assert.doesNotMatch(allText, /Lieblingsmensch|schoener|Danke|vergessen|Lachen|dich/i);

  delete global.window;
});

test("memory template separates position, drift, pop, and hover layers", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("styles.css", "utf8");

  assert.match(html, /class="memory-item__float"/);
  assert.match(html, /class="memory-item__pop"/);
  assert.match(html, /class="memory-item__inner"/);
  assert.match(css, /\.memory-item__pop[\s\S]*scale\(0\)/);
  assert.match(css, /animation: inflateIn var\(--inflate-duration,\s*1800ms\) linear forwards/);
  assert.match(css, /@keyframes inflateIn[\s\S]*scale\(0\)[\s\S]*scale\(1\)/);
  assert.doesNotMatch(css, /\.memory-item__image\s*\{[^}]*animation:/);
  assert.doesNotMatch(css, /animation-duration:\s*1ms\s*!important/);
});

test("initial memories spawn after the wall reveal instead of during the fade", () => {
  const js = fs.readFileSync("script.js", "utf8");

  assert.match(js, /memoryWallRevealMs:\s*950/);
  assert.match(js, /photoLifetimeMs:\s*5000/);
  assert.match(js, /window\.setTimeout\(\(\)\s*=>\s*\{[\s\S]*spawnMemory[\s\S]*memoryWallRevealMs/);
});

test("cards use random 1.5-2s inflate durations and respawn after deflate", () => {
  const js = fs.readFileSync("script.js", "utf8");

  assert.match(js, /inflateDurationMinMs:\s*1500/);
  assert.match(js, /inflateDurationMaxMs:\s*2000/);
  assert.match(js, /--inflate-duration/);
  assert.match(js, /spawnMemory\(\);\s*\}\s*,\s*\{\s*once:\s*true\s*\}/);
});

test("intro copy starts memories from the page without a button", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const js = fs.readFileSync("script.js", "utf8");

  assert.doesNotMatch(html, /intro__eyebrow|For Leslie/);
  assert.doesNotMatch(html, /enterButton|Start the memories|intro__button/);
  assert.doesNotMatch(html, /intro__signature/);
  assert.match(html, /intro__love-line--first">I love you<\/span>/);
  assert.match(html, /intro__love-line--second">Jannik<\/span>/);
  assert.doesNotMatch(js, /enterButton/);
  assert.match(js, /intro\.addEventListener\("click", startMemoryWall\)/);
});

test("confetti canvas starts on the birthday intro transition", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("styles.css", "utf8");
  const js = fs.readFileSync("script.js", "utf8");

  assert.match(html, /<canvas[^>]+id="confettiCanvas"/);
  assert.match(css, /\.confetti-canvas[\s\S]*pointer-events:\s*none/);
  assert.match(css, /\.confetti-canvas\.is-active[\s\S]*opacity:\s*1/);
  assert.match(js, /confettiDurationMs:\s*2200/);
  assert.match(js, /confettiParticleCount:\s*680/);
  assert.match(js, /function createConfettiParticles\(/);
  assert.match(js, /function runConfettiExplosion\(/);
  assert.match(js, /function getBirthdayTitleOrigin\(\)/);
  assert.doesNotMatch(js, /function getWelcomeTextOrigin\(\)/);
  assert.match(js, /revealBirthdayIntro\(\);\s*window\.requestAnimationFrame\(\(\)\s*=>\s*\{[\s\S]*runConfettiExplosion\(getBirthdayTitleOrigin\(\),/);
});

test("createConfettiParticles emits deterministic gravity-driven particles", () => {
  const { createConfettiParticles } = require("./script.js");
  const randomValues = [0.25, 0.25, 0.75, 0.1, 0.9, 0.2, 0.8, 0.3, 0.7];
  const random = () => randomValues.shift() ?? 0.5;

  const particles = createConfettiParticles({
    originX: 100,
    originY: 80,
    count: 1,
    random
  });

  assert.equal(particles.length, 1);
  assert.equal(particles[0].x, 100);
  assert.equal(particles[0].y, 80);
  assert.ok(particles[0].vx > -0.01 && particles[0].vx < 0.01);
  assert.ok(particles[0].vy < 0);
  assert.ok(particles[0].gravity > 0);
  assert.ok(particles[0].size >= 6);
  assert.ok(particles[0].color);
});

test("welcome gate appears before the birthday intro", () => {
  const html = fs.readFileSync("index.html", "utf8");
  const css = fs.readFileSync("styles.css", "utf8");
  const js = fs.readFileSync("script.js", "utf8");

  assert.match(html, /id="welcome"/);
  assert.match(html, /Coucou mon Amoureuse, are you ready to see your gift\?/);
  assert.match(html, /id="acceptGift"/);
  assert.match(html, /id="declineGift"/);
  assert.match(html, /id="backToQuestion"/);
  assert.match(html, /class="intro is-hidden"/);
  assert.match(css, /\.welcome[\s\S]*place-items:\s*center/);
  assert.match(css, /\.welcome__button--yes[\s\S]*#2f9e44/);
  assert.match(css, /\.welcome__button--no[\s\S]*#d94848/);
  assert.match(css, /\.welcome__button--back[\s\S]*#2f80ed/);
  assert.match(js, /function showBirthdayIntro\(\)/);
  assert.match(js, /function showPleaseMessage\(\)/);
  assert.match(js, /function showReadyQuestion\(\)/);
});

test("intro love text fades in place later and spawn area has extra bottom space", () => {
  const css = fs.readFileSync("styles.css", "utf8");

  assert.match(css, /\.intro__content[\s\S]*translateY\(calc\(-1 \* clamp/);
  assert.match(css, /\.intro__title[\s\S]*line-height:\s*1\.02/);
  assert.match(css, /\.intro__love-line[\s\S]*animation:\s*fadeInPlace\s+1000ms\s+ease\s+1600ms\s+both/);
  assert.match(css, /\.intro__love-line--second[\s\S]*animation-delay:\s*3600ms/);
  assert.match(css, /@keyframes fadeInPlace[\s\S]*opacity:\s*0[\s\S]*opacity:\s*1/);
  assert.doesNotMatch(css, /@keyframes fadeInPlace[\s\S]*translateY/);
  assert.match(css, /inset:\s*clamp\(72px,\s*11vh,\s*108px\)\s+clamp\(16px,\s*4vw,\s*64px\)\s+clamp\(54px,\s*calc\(6vh \+ 30px\),\s*86px\)/);
  assert.match(css, /inset:\s*82px\s+12px\s+52px/);
});
