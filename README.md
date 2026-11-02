# Don't Forget the Lyrics!

A four-team music trivia game with a local video stage and individual player buzzers.

## Run the stage and buzzer server

Install [Node.js](https://nodejs.org/) once. In a terminal opened in this project folder, run:

```powershell
npm install
npm start
```

Open `http://localhost:3000`. The main stage and media are served from your computer. The Socket.IO relay listens separately on port `3001`; the public tunnel should expose **only port 3001**, never the stage server on port 3000.

The buzzer page is available locally at `http://localhost:3000/buzzer/`. This is useful for local testing. For players joining from the internet, deploy the contents of `buzzer/` to GitHub Pages and connect it to the public relay URL as described below.

## Publish the buzzer page from this repository

The workflow in `.github/workflows/publish-buzzer.yml` deploys only the `buzzer/` folder as the GitHub Pages website. In the repository’s **Settings → Pages**, set the build and deployment source to **GitHub Actions**. Push the workflow and buzzer files to `main`, then wait for the Pages deployment to finish. Its URL will look like:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

This limits what the Pages website serves. Files committed elsewhere in a public repository are still viewable through the repository itself and its Git history.

## Let players connect over the internet

The relay is on port `3001`, separate from the server that serves `index.html`, videos, hints, and songs. Use a tunnel to expose port 3001 without exposing the media server or configuring router port forwarding.

1. Start the local app with `npm start`.
2. In a second terminal, start a Cloudflare Quick Tunnel:

   ```powershell
   cloudflared tunnel --url http://localhost:3001
   ```

3. Copy the HTTPS `trycloudflare.com` address it prints.
4. On the stage, enter that address in **Public server address** and click **Set server**.
5. Click **Copy invite** and send the link to players. They enter their name, team, and the room code shown on the stage.

Quick Tunnel addresses change when restarted. Keep both the Node server and tunnel running for the full game. For a stable address, set up a named Cloudflare Tunnel and use its hostname in **Public server address**.

For a permanent GitHub Pages invite URL, set `BUZZER_URL` before starting the Node server. In PowerShell:

```powershell
$env:BUZZER_URL = "https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/"
npm start
```

The stage will append the relay address and room code to that buzzer page URL. If you do not set `BUZZER_URL`, the stage provides the local `/buzzer/` page instead.

## How the live buzzer works

- Each player joins individually and chooses one of four teams. The server allows four registered players per team.
- The host opens a steal window from the stage modal. Auto-close is enabled by default at five seconds; the host can change the duration or turn auto-close off and close it manually.
- Every valid individual buzz is listed in server-received order. Multiple players from one team appear in the list; the earliest player from each team represents that team’s claim.
- The first eligible team can be marked correct. If that team answers incorrectly, or no team buzzes, choose **No Steal / Forfeit**.
- If the server disconnects, the stage offers manual team selection as a fallback.

Keyboard shortcuts during the steal modal: **O** opens/closes the buzz window, **C** marks the first eligible team correct, and **X** chooses **No Steal / Forfeit**.

## Project contents

- `index.html`, `styles.css`, `app.js` — stage interface and game flow.
- `server.js` — local static file server and Socket.IO buzzer relay.
- `buzzer/` — standalone player join and buzzer webpage.
- `songs.csv`, `songs/`, `hints/`, `teams/`, `audios/`, `bg.png` — game content and media.
- [Game Content and Run Guide](Game%20Content%20and%20Run%20Guide.md) — content preparation, game flow, keyboard reference, and host script.
