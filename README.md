# Don't Forget the Lyrics!

A browser based music trivia party game for four teams. Teams choose mystery boxes, listen to song clips, complete the missing lyrics, and decide whether to take or give the hidden points.

## Live preview

[Open the game](https://justinetolin.github.io/Dont-Forget-the-Lyrics/index.html)

## Run locally

The app uses vanilla HTML, CSS, and JavaScript, with Vite as a local development server. From the project folder, run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The game loads `songs.csv` and its media files relative to the project, so serve it through the development server rather than opening `index.html` directly.

## Project contents

- `index.html`, `styles.css`, `app.js` — game interface, presentation, and gameplay logic.
- `songs.csv` — song titles, video paths, cutoff and answer reveal times, and mystery points.
- `songs/` — music video clips, named by box number (for example, `1.mp4`).
- `hints/` — box hint images, named by box number (for example, `1.png`).
- `teams/` — team logo images.
- `audios/` — game theme and gameplay audio cues.
- `bg.png` — shared background image for the title card and game board.

## Guides

For content managers preparing videos, hints, CSV data, and the shared background, and for game operators running rounds and hosting the game, see the [Game Content and Run Guide](Game%20Content%20and%20Run%20Guide.md).
