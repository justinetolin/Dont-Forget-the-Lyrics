(() => {
  const params = new URLSearchParams(location.search);
  const serverUrl = params.get("server") || location.origin;
  const socket = io(serverUrl, { transports: ["websocket", "polling"], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelayMax: 4000 });
  const $ = id => document.getElementById(id);
  let me = null, activeTeam = null, lastState = null;
  const teamLabels = { florea: "Florea", solaris: "Solaris", aurelia: "Aurelia", frostveil: "Frostveil" };
  function status(text, mode = "") { $("player-status").textContent = text; $("player-status").className = `player-status ${mode}`; }
  function applyState(s) {
    lastState = s; activeTeam = s.activeTeam;
    if (!me) return;
    const myBuzz = s.buzzes.find(b => b.playerId === me.playerId);
    if (myBuzz) { $("buzz-button").disabled = true; status(`Buzz received · #${s.buzzes.findIndex(b => b.playerId === myBuzz.playerId) + 1} in order`, "locked"); return; }
    if (!s.window?.open) { $("buzz-button").disabled = true; status("Waiting for the host to open the steal window"); return; }
    if (me.team === s.activeTeam) { $("buzz-button").disabled = true; status("Your team is the active team this turn"); return; }
    $("buzz-button").disabled = false; status("STEAL WINDOW OPEN · tap once to buzz", "open");
  }
  socket.on("connect", () => { $("connection").textContent = "ONLINE"; $("connection").className = "connection online"; if (me) socket.emit("player:join", { code: $("room-code").value, name: me.name, team: me.team, playerId: me.playerId }, reply => { if (reply?.ok) { me = { ...me, ...reply }; $("player-identity").textContent = `${reply.name} · ${reply.teamName}`; $("join-card").hidden = true; $("player-card").hidden = false; if (lastState) applyState(lastState); } else { me = null; $("player-card").hidden = true; $("join-card").hidden = false; $("join-error").textContent = reply?.error || "Could not reconnect. Join again."; } }); });
  socket.on("disconnect", () => { $("connection").textContent = "RECONNECTING"; $("connection").className = "connection"; if (me) { $("buzz-button").disabled = true; status("Connection lost · reconnecting…"); } });
  socket.on("game:state", applyState);
  $("join-button").addEventListener("click", () => {
    const values = { code: $("room-code").value.trim().toUpperCase(), name: $("player-name").value.trim(), team: $("player-team").value };
    $("join-error").textContent = "";
    if (!values.code || !values.name || !values.team) { $("join-error").textContent = "Enter the game code, your name, and your team."; return; }
    const playerId = sessionStorage.getItem("lyrics-buzzer-id") || crypto.randomUUID();
    socket.emit("player:join", { ...values, playerId }, reply => {
      if (!reply?.ok) { $("join-error").textContent = reply?.error || "Could not join this game."; return; }
      me = { playerId: reply.playerId, name: reply.name, team: reply.team };
      sessionStorage.setItem("lyrics-buzzer", JSON.stringify({ ...me, code: values.code }));
      sessionStorage.setItem("lyrics-buzzer-id", me.playerId);
      $("player-identity").textContent = `${reply.name} · ${reply.teamName}`;
      $("join-card").hidden = true; $("player-card").hidden = false;
      if (lastState) applyState(lastState);
    });
  });
  $("buzz-button").addEventListener("click", () => {
    $("buzz-button").disabled = true; status("Sending buzz…", "open");
    socket.timeout(3000).emit("player:buzz", {}, (error, reply) => {
      if (error) { status("No server confirmation · check connection"); return; }
      if (!reply?.ok) { status(reply?.error || "Buzz not accepted"); if (lastState) applyState(lastState); return; }
      status(`Buzz received · #${reply.order} in order`, "locked");
    });
  });
  $("leave-button").addEventListener("click", () => { socket.emit("player:leave"); me = null; sessionStorage.removeItem("lyrics-buzzer"); sessionStorage.removeItem("lyrics-buzzer-id"); $("player-card").hidden = true; $("join-card").hidden = false; });
  $("room-code").addEventListener("input", e => { e.currentTarget.value = e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, ""); });
  const saved = sessionStorage.getItem("lyrics-buzzer");
  if (saved) { try { const p = JSON.parse(saved); $("room-code").value = p.code; $("player-name").value = p.name; $("player-team").value = p.team; me = p; $("join-button").textContent = "Reconnect to game"; } catch {} }
})();
