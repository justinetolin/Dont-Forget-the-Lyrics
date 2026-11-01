Here is the complete, execution-ready master plan formatted in Markdown. You can copy and paste this directly into **Google Project Antigravity** as the system context or instructions file.

---

# 🎬 "Don't Forget the Lyrics!" — Web Application Technical Blueprint

## 📌 Executive Summary & Scope

This document serves as the implementation specification for building a single-page interactive game show web application titled **"Don't Forget the Lyrics!" (Live Party Edition)**.

The application must be built using **vanilla HTML5, CSS3, and JavaScript (ES6+)** contained in a single `index.html` file (or modularized locally without external frameworks/servers) to run seamlessly directly inside any modern web browser (Google Chrome, Microsoft Edge) in full-screen mode ($F11$).

---

## 📁 Project Directory & Asset Structure

The application will read all media and metadata relative to `index.html` using the following standardized directory layout:

```text
/ (Project Root)
├── index.html                  # Core application entry point (HTML + CSS + JS)
├── songs.csv                   # Song metadata, cutoffs, points, and file paths
├── final_game_mechanics.md     # Official game rules and timeline guide
├── /hints/                     # Square 1:1 ratio song teaser icons (PNG)
│   ├── 1.png
│   ├── 2.png
│   └── ... (up to 16.png)
├── /teams/                     # Team brand logos/icons (PNG)
│   ├── florea.png
│   ├── solaris.png
│   ├── aurelia.png
│   └── frostveil.png
└── /songs/                     # Video/Audio track files
    ├── 1_stop_the_wedding.mp4
    ├── 2_na_para_bang.mp4
    └── ... (up to 16 video files)

```

> **Important Naming Conventions:**
> * Team names must be strictly spelled as: **Florea**, **Solaris**, **Aurelia**, and **Frostveil**.
> * File paths, image names, and team logo filenames are strictly **lowercase**.
> * songs inside the songs/ folder will be named as 1, 2, 3,
> 

---

## 📊 CSV Metadata Schema (`songs.csv`)

Antigravity must generate `songs.csv` pre-populated with 16 rows using the following schema. Paths inside the CSV point directly to relative locations in `/songs/`:

```csv
id,title,filename,cutoff,points
1,Stop the Wedding,songs/1_stop_the_wedding.mp4,71.44,-10
2,Na Para Bang,songs/2_na_para_bang.mp4,19.28,30
3,The Cure,songs/3_the_cure.mp4,24.24,10
4,This Is Me,songs/4_this_is_me.mp4,27.86,50
5,Track Title 5,songs/5_track_5.mp4,15.00,20
6,Track Title 6,songs/6_track_6.mp4,20.00,-30
7,Track Title 7,songs/7_track_7.mp4,18.50,40
8,Track Title 8,songs/8_track_8.mp4,22.10,50
9,Track Title 9,songs/9_track_9.mp4,14.30,-20
10,Track Title 10,songs/10_track_10.mp4,30.00,100
11,Track Title 11,songs/11_track_11.mp4,16.80,30
12,Track Title 12,songs/12_track_12.mp4,25.00,-50
13,Track Title 13,songs/13_track_13.mp4,19.90,40
14,Track Title 14,songs/14_track_14.mp4,21.00,20
15,Track Title 15,songs/15_track_15.mp4,17.50,60
16,Track Title 16,songs/16_track_16.mp4,28.00,-40

```
> CORRECTION:
> * The song filename is in numbers like songs/1.mp4. so after the filename column you would add a title column.
> * id,title,filename,title,cutoff,points


---

## 🎨 Aesthetic & Visual Theme (Coraline / Dark Whimsical Gothic)

The entire presentation must adopt a **Coraline-inspired dark, magical, hand-crafted aesthetic** generated strictly using **pure CSS and inline SVG** (no external texture images required):

* **Color Palette:**
* Background: Deep Void Blue / Indigo (`#0a0e1a` / `#0f172a`)
* Accent / Highlights: Button Yellow (`#facc15` / `#eab308`)
* Team / Card Panels: Stitched Velvet / Slate (`#1e293b` / `#2e1065`)
* Positive / Negative Points: Emerald Green (`#22c55e`) / Crimson Red (`#ef4444`)


* **Styling Features:**
* **Stitched Borders:** All box cards, modals, and team panels feature dashed border styling (`border: 3px dashed #facc15`) mimicking hand-stitched fabric seams.
* **Button-Eye & Seeing Stone Accents:** SVG keyholes, needle threads, and button-eye shapes integrated into score containers and tile headers.
* **Spiral Atmosphere:** Pure CSS radial background gradients with subtle spinning spiral animation effects (`@keyframes webSpin`).

I know css so please after you finish, indicate to me how can i change these colors like maybe just set a var globally so i can change colors easily.

---

## 🖥️ Screen Layout & User Interface Architecture

```
+-----------------------------------------------------------------------------------+
|  [LOGO / HEADER] - 🎵 DON'T FORGET THE LYRICS! (LIVE EDITION)                    |
+-------------------+-------------------------------------------+-------------------+
|   LEFT SIDEBAR    |              CENTER STAGE                |   RIGHT SIDEBAR   |
|                   |                (4x4 GRID)                 |                   |
|  [FLOREA CARD]    |  +---------+---------+---------+---------+ |  [AURELIA CARD]   |
|  - Logo           |  | Box #1  | Box #2  | Box #3  | Box #4  | |  - Logo           |
|  - Score: 0       |  +---------+---------+---------+---------+ |  - Score: 0       |
|                   |  | Box #5  | Box #6  | Box #7  | Box #8  | |                   |
|  [SOLARIS CARD]   |  +---------+---------+---------+---------+ |  [FROSTVEIL CARD] |
|  - Logo           |  | Box #9  | Box #10 | Box #11 | Box #12 | |  - Logo           |
|  - Score: 0       |  +---------+---------+---------+---------+ |  - Score: 0       |
|                   |  | Box #13 | Box #14 | Box #15 | Box #16 | |                   |
|                   |  +---------+---------+---------+---------+ |                   |
+-------------------+-------------------------------------------+-------------------+

```

### 1. Main Stage (16-Box Interactive Grid)

* **Scoreboard Positioning:**
* Left Column: **Floraya** and **Solaris** cards.
* Right Column: **Aurelia** and **Frostveil** cards.
* Each card displays the team icon from `/teams/{teamname}.png` alongside a live-updating score counter.


* **Tile State Lifecycle:**
* **Unopened State:** Displays stitched box numbers (`#1` through `#16`).
* **Hint Revealed State:** Clicking an unopened box replaces the box content *in-place* on the grid with its corresponding teaser image from `/hints/{id}.png`.
* **Opened / Played State:** Once the song challenge concludes, the tile permanently dims into an inert, greyed-out state displaying a button-eye icon or completed marker.



---

### 2. Full-Screen Video Arena & Floating Command Hub

* Clicking a revealed hint image opens a **near-fullscreen video overlay** stage.
* **No Spoilers:** Song titles, cutoffs, and point values are hidden from public view.
* **Floating Command Hub (Lower-Right Overlay):** A small, translucent floating control window that stays perpetually focused to intercept host hotkey inputs without obstructing the video playback.
* **On-Video 5-Second Timer Overlay:** A large visual countdown timer displayed at the top-center of the video viewport that triggers immediately after the video auto-pauses.

---

Note that the floating command hub is active at all times and will be used as well in selecting the song boxes, revealing the hint, and entering the Arena as well. This ill control everything to avoid moving the mouse which is visible for audience. just include maybe that when this box is hovered a small current active state instructions will appear. For example, hovering during the main stage would show that Arrow keys for moving, Enter to select/enter Space to reveal. and this changes when its stealing timme or others.

## 🕹️ Game State Machine & Keyboard Navigation Rules

The application must be completely controllable via **Keyboard Hotkeys** operated from the Floating Command Hub:

```
                  [Click Hint Icon on Grid]
                              │
                              ▼
               [Opens Fullscreen Video Stage]
                              │
                    (Press SPACEBAR)
                              │
                              ▼
            [Video Plays & Auto-Pauses at Cutoff]
                              │
                              ▼
            [Triggers 5-Sec Countdown Overlay]
                              │
                              ▼
                  [Host Verdict Selection]
                   │                     │
      (SPACEBAR = Correct)         (X Key = Wrong)
                   │                     │
                   ▼                     ▼
          [GIVE / TAKE Modal]   [STEAL TEAM SELECTOR Modal]
                   │                     │
                   │            Select Stealing Team (Arrows + ENTER)
                   │                     │
                   │             (Steal Correct) ──► Opens [GIVE/TAKE Modal]
                   │             (Steal Wrong)   ──► [Forfeit Points & Return]
                   ▼
         Select GIVE or TAKE (Hotkey 1 / 2 OR Left/Right Arrows + ENTER)
                   │
                   ├──► TAKE: Prepares points for Active/Stealing Team
                   └──► GIVE: Opens TARGET TEAM SELECTOR Modal (Arrows + ENTER)
                                         │
                                         ▼
                            [REVEAL MYSTERY POINTS]
                                         │
                                         ▼
                       [Update Scoreboard & Return to Grid]

```

### Detailed Keyboard Control Scheme:

1. **Video Control:**
* `SPACEBAR`: Start / Pause video playback.


2. **Post-Cutoff Verdict:**
* `SPACEBAR` or `C`: Mark turn as **Correct** (Opens Give/Take modal).
* `X` or `W`: Mark turn as **Wrong** (Triggers Steal Window modal).


3. **Modal Selection & Navigation:**
* `1` / `LEFT ARROW`: Highlight **TAKE**.
* `2` / `RIGHT ARROW`: Highlight **GIVE**.
* `UP / DOWN / LEFT / RIGHT ARROWS`: Cycle focus across teams in Team Selector modals.
* `ENTER`: Lock in highlighted modal option.


4. **Point Reveal & Exit:**
* `ENTER` or `SPACEBAR`: Trigger point reveal animation, apply scores, close modal, and update grid tile state.


the chart maybe outdated since we would need to be controlling everything with keyboard.

---

## 🔊 Sound Effects Hook Architecture (Placeholder System)

To prepare for future audio enhancements, the JavaScript code must include central audio trigger functions. Audio paths remain unlinked or linked to fallback silent buffers until files are added:

```javascript
const soundEffects = {
  gridClick: new Audio(),
  hintReveal: new Audio(),
  timerTick: new Audio(),
  correctFanfare: new Audio(),
  wrongBuzzer: new Audio(),
  pointsReveal: new Audio()
};

function playSound(effectName) {
  if (soundEffects[effectName] && soundEffects[effectName].src) {
    soundEffects[effectName].currentTime = 0;
    soundEffects[effectName].play().catch(() => {});
  }
}

```

However, you will not implement and include this for now, until I instructed you so

---

## 🚀 Execution Instructions for Antigravity

When executing this project, Antigravity must perform the following tasks sequentially:

1. **Directory Setup:** Create the project folders: `/hints/`, `/teams/`, and `/songs/`. PS. they are done, just check if yoou can access them in this project directory.
2. **Metadata Generation:** Generate the complete `songs.csv` file with all 16 pre-populated song entries, cutoff timestamps, and mystery point values.
3. **Code Assembly:** Create `index.html` containing the full HTML structure, CSS rules (Coraline gothic aesthetic with stitched borders, custom scrollbars, and animations), CSV fetching parser, frame-accurate HTML5 video time-update engine, keyboard hotkey event listeners, modal state machine, and dynamic scoreboard update engine. please separate html, css and js

Fell free to clarify things before implementing, unless you are sure alreayd, you may implement now.