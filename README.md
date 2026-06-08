# Leslie Birthday Gift Website

A small static birthday website for Leslie. It starts with a romantic intro and
then loops through floating photos and little love-note easter eggs.

## Add Your Photos

1. Put your photos in `assets/photos/`.
2. Keep the filenames in `assets/data/memories.js` in sync.
3. Add as many photo entries as you want:

```js
{
  type: "photo",
  src: "assets/photos/photo4.jpg",
  alt: "Leslie and Jannik",
  caption: "A caption only you two understand"
}
```

Love notes are mixed into the same loop:

```js
{
  type: "note",
  text: "You are my favorite person."
}
```

## Run Locally

Open `index.html` directly in your browser, or run a small static server:

```bash
npx serve .
```

Then open the shown local URL.

## Deploy To GitHub Pages

1. Create a GitHub repository named `LeslieGiftWebsite`.
2. Commit and push this folder to the repository.
3. In GitHub, open **Settings > Pages**.
4. Choose **Deploy from a branch**.
5. Select the `main` branch and `/root`.
6. Save.

After GitHub finishes deploying, the site will be available at a URL like:

```text
https://<username>.github.io/LeslieGiftWebsite/
```

## Customize

Animation settings live in `script.js`:

```js
const CONFIG = {
  maxVisibleItems: 4,
  spawnIntervalMs: 1800,
  photoLifetimeMs: 5000,
  inflateDurationMinMs: 1500,
  inflateDurationMaxMs: 2000,
  noteChance: 0.18,
  minDistancePx: 24,
  introAutoAdvanceMs: 7000,
  memoryWallRevealMs: 950
};
```

The site uses only relative paths, so it is safe for GitHub Pages.
