# Don't Forget the Lyrics!

A static browser game for four teams. Teams choose mystery boxes, listen to song clips, complete the missing lyrics, and decide whether to take or give the hidden points. It uses HTML, CSS, and JavaScript and does not require Node.js or npm for normal use.

## Live preview

[Open the game](https://justinetolin.github.io/Dont-Forget-the-Lyrics/index.html)

## Play the hosted game

The simplest way to play is to open the [live preview](https://justinetolin.github.io/Dont-Forget-the-Lyrics/index.html) in a modern browser.

## Run a local copy

Please install VS Code and add the Live Server extension.
Right click from the `index.html` and select `Open a Live Server`.

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
