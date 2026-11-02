## Recommended plan

Keep the **stage and its media on your PC**, run a small Node.js real-time server on that same PC, and let the server communicate with a separate buzzer webpage hosted on GitHub Pages.

```text
Your PC
├── Main stage in your browser
├── Videos, hints, and CSV loaded locally
└── Node.js + Socket.IO game server
          ▲                       ▲
          │ local connection      │ public secure connection
          │                       │
   Main stage browser        Players' phones
                              Buzzer page on GitHub Pages
```

The stage and phones don’t connect directly to each other. They both connect to the game server, which relays the game state and decides which buzz arrived first.

### Technologies and what they do

- **Node.js** runs the local game server on your computer. It can serve the stage files and read the videos, hints, and CSV from your project folder.
- **Socket.IO** provides the live connection between the stage and players’ phones. The server can announce “steal window open,” receive buzzes, and send the winning team back to the stage. It supports ordered messages and acknowledgements, which are useful for confirming that a buzz reached the server. [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/), [Socket.IO acknowledgements](https://socket.io/docs/v4/emitting-events/)
- **GitHub Pages** hosts the buzzer webpage as a static site. That page is lightweight and doesn’t contain or stream the music videos. GitHub Pages can’t run the Node server itself. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- **Cloudflare Tunnel** gives the Node server a public HTTPS address so phones outside your home network can reach it. It routes traffic to your local server without router port forwarding. [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)

Since the buzzer page uses HTTPS, it connects to the server through a secure WebSocket connection (`WSS`). The stage connects to the same server locally. The server should allow connections from your exact GitHub Pages address.

### What happens during a steal

1. The stage tells the server to open a steal window for that game room.
2. The buzzer page enables the team buttons.
3. When a player taps a team’s buzzer, the server records the first valid buzz and locks out later buzzes for that window.
4. The stage displays which team buzzed first.
5. You, the game master, judge the answer. The buzzer only records who buzzed; it doesn’t decide whether the lyrics were correct.
6. If the answer is wrong, you can reopen the steal window for the remaining teams or select **No Steal / Forfeit**, depending on the rules you want.

Each game gets a short **room code**. The stage has a host-only control to create the room and open or close buzz windows. Players enter the code and choose their team. The server rejects buzzes when the window is closed, ignores duplicate buzzes from the same team, and sends a clear confirmation or rejection back to each phone.

### Why I’d use a tunnel instead of port forwarding

Port forwarding can work, but it requires router and firewall configuration, and your home internet address may change. A tunnel gives the local Node server a public route without opening an inbound router port.

For a quick trial, Cloudflare Quick Tunnels provide a temporary public hostname, but the hostname changes and Cloudflare documents them as having no uptime guarantee. That’s fine for a test, but I’d use a stable named tunnel for an actual game. [Quick Tunnel limitations](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)

### Runtime and failure behavior

Your PC and Node server must stay awake and connected for the buzzer to work. If the connection drops, the stage should show **Buzzer disconnected** and the game should fall back to your existing manual team selection. The server should also keep the room active through short phone reconnects, while never accepting a late buzz for a window that has already closed.

This keeps video playback local. Only small messages—room joins, window open/close, buzzes, and acknowledgements—cross the internet.

**In short:** Node.js + Socket.IO on your PC, GitHub Pages for the separate buzzer interface, and Cloudflare Tunnel for secure public access. Vercel isn’t needed for this setup.


## Proposed buzzer experience

Each of the 16 players joins the same game room individually. They enter a display name, choose one of the four teams, and tap **Ready**. The stage shows how many players are connected for each team, so the game master can spot a missing player before starting.

When a steal window opens, every player on the three non-active teams gets their own buzzer. Buzzing is recorded per player, not per team. The stage shows the full order, including multiple players from the same team. The earliest eligible buzz sets that team’s turn to answer; the team receives credit if correct, regardless of which teammate pressed first.

### Player buzzer page

Before a steal window, each phone shows the game name, team, player name, connection status, and a clear **Waiting for steal** state. When the window opens, it changes to one large, easy-to-tap buzzer. After a player buzzes, their button locks and confirms their place in the queue. Players on the active team see that their team is currently answering and can’t buzz.

### Updated steal modal on the stage

Replace the current team-choice grid with a live host panel:

```text
STEAL WINDOW                         04.2

1  Player B · Aurelia       FIRST
2  Player D · Solaris
3  Player A · Aurelia
4  Player C · Frostveil

[Close buzzers]                  [No Steal / Forfeit]
```

The list records the **player order** and shows each player’s team. If several players from Aurelia buzz, they all appear in the log, but the earliest valid Aurelia buzz represents that team’s claim. After the game master closes the window, the game identifies the first eligible team. The game master then judges that team’s answer as correct or incorrect. A correct answer proceeds to Take It / Give It; an incorrect answer follows the existing **No Steal / Forfeit** outcome.

That keeps “who buzzed first” separate from “who answered correctly,” while still awarding the box to a team.

### Timing and game master control

I suggest a setting on the stage:

- **Auto-close:** on or off.
- **Window length:** adjustable in seconds, defaulting to **5 seconds** when auto-close is on.
- The game master can always close the window early.
- With auto-close off, it stays open until the game master closes it.

The timer is only for collecting buzzes. If the game master needs more time because players are lagging, they can leave the window open or close it manually; the timer should not declare an answer wrong or forfeit points by itself.

### Game flow with buzzers

1. Active team answers after the song cutoff.
2. If incorrect, the game master opens the steal window.
3. Eligible players buzz individually; the stage displays the live ordered queue.
4. The window closes manually or when its optional timer ends.
5. The first eligible team gets the steal attempt. The game master marks the answer correct or incorrect.
6. Correct → answer segment → Take It / Give It.
7. Incorrect or no buzz → **No Steal / Forfeit**.

If a player disconnects, the stage should show that clearly. The host can close the window or continue with the players still connected. The keyboard controls for the rest of the game stay in place; we’d add a host shortcut to open or close the steal window.

The one rule I recommend locking in is that a team gets **one steal attempt per box**. Other players’ buzzes remain visible in the order log, but they don’t create additional attempts for a team that already answered. That matches the current forfeit-on-wrong-steal rule.