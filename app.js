const TEAMS = [
  { id: "florea", name: "Florea", logo: "teams/florea.PNG" },
  { id: "solaris", name: "Solaris", logo: "teams/solaris.PNG" },
  { id: "aurelia", name: "Aurelia", logo: "teams/aurelia.PNG" },
  { id: "frostveil", name: "Frostveil", logo: "teams/frostveil.PNG" }
];
// Video volume while the answer segment plays; change this to tune the reveal bed.
const ANSWER_REVEAL_VOLUME = 0.15;

const state = {
  songs: [], scores: Object.fromEntries(TEAMS.map(team => [team.id, 0])), results: {},
  played: new Set(), selected: 0, activeIndex: 0, box: null, winner: null,
  giveTake: null, target: null, flow: "board", modalOptions: [], modalIndex: 0,
  timer: null, countdownTimer: null, verdictTimer: null,
  turnOrder: [], turnPosition: 0, round: 1, randomizeTimer: null,
  started: false, revealTimer: null, pendingForfeit: false,
  launchPhase: "start", titleTimer: null
};

const $ = selector => document.querySelector(selector);
const grid = $("#grid");
const arena = $("#arena");
const video = $("#song-video");
const backdrop = $("#modal-backdrop");
const cues = Object.fromEntries([["theme","1 Game Theme"],["board","2 Board Ambience"],["round","3 Round Sting"],["randomizer","4 Randomizer"],["select","5 Box Selection"],["hint","6 Hint Reveal"],["correct","7 Active Correct"],["wrong","8 Active Wrong"],["steal","9 Steal Round"],["lock","10 Lock In"],["forfeit","11 Points Forfeit"],["reveal","12 Points Reveal"],["topup","13 Points Topup"]].map(([k,n])=>[k,new Audio(`audios/${n}.mp3`)]));
let cueVolume = 0.8;
function cue(k,loop=false){const a=cues[k];if(a){a.loop=loop;if(k!=="theme")a.volume=cueVolume;a.currentTime=0;a.play().catch(()=>{});}}
function stopCue(k){const a=cues[k];if(a){a.pause();a.currentTime=0;a.loop=false;}}

function showTitleCard() {
  if (state.launchPhase !== "start") return;
  state.launchPhase = "title";
  cue("theme", true);
  $("#launch-screen").classList.add("leaving");
  $("#title-card").classList.add("visible");
  $("#title-card").setAttribute("aria-hidden", "false");
  state.titleTimer = window.setTimeout(() => {
    if (state.launchPhase !== "title") return;
    state.launchPhase = "titleReady";
    $("#title-continue").textContent = "Space to continue";
    $("#title-card").classList.add("ready");
  }, 5000);
}

function enterGameStage() {
  if (state.launchPhase !== "titleReady") return;
  clearTimeout(state.titleTimer);
  state.launchPhase = "stage";
  stopCue("theme");
  $("#title-card").classList.add("leaving");
  $("#title-card").setAttribute("aria-hidden", "true");
  $("#game-shell").classList.add("visible");
  $("#game-shell").setAttribute("aria-hidden", "false");
  window.setTimeout(() => $("#title-card").classList.remove("visible", "leaving", "ready"), 720);
}

async function loadSongs() {
  const response = await fetch("songs.csv");
  if (!response.ok) throw new Error("Could not load songs.csv");
  const lines = (await response.text()).trim().split(/\r?\n/);
  const rows = lines.slice(1).map(line => {
    const [id, title, filename, cutoff, aftrev, points] = line.split(",");
    const cutAt = Number(cutoff);
    const answerAt = Number(aftrev);
    return { id: Number(id), title, filename, cutoff: cutAt, aftrev: answerAt > cutAt ? answerAt : cutAt + 5, points: Number(points) };
  });
  state.songs = rows;
}

function renderTeams() {
  const renderCard = team => `<article class="team-card ${state.started && TEAMS[state.activeIndex].id === team.id ? "active" : ""}" data-team="${team.id}">
    <img class="team-logo" src="${team.logo}" alt="" onerror="this.style.visibility='hidden'">
    <div class="team-name">${team.name}</div><div class="team-score" id="score-${team.id}">${state.scores[team.id]}</div></article>`;
  $("#teams-left").innerHTML = TEAMS.slice(0, 2).map(renderCard).join("");
  $("#teams-right").innerHTML = TEAMS.slice(2).map(renderCard).join("");
  $("#active-team-name").textContent = state.started ? TEAMS[state.activeIndex].name : "Awaiting draw";
  $("#remaining-boxes").textContent = state.songs.length - state.played.size;
}

function playableIndices() {
  return state.songs.map((song, index) => state.played.has(song.id) ? -1 : index).filter(index => index >= 0);
}

function renderGrid() {
  grid.innerHTML = state.songs.map((song, index) => {
    const played = state.played.has(song.id);
    const selected = !played && index === state.selected;
    const hinted = state.flow === "hint" && state.box?.id === song.id;
    const record = state.results[song.id];
    let content = `<span class="box-number">#${song.id}</span>`;
    if (hinted) content = `<img class="box-hint" src="hints/${song.id}.png" alt="Song hint for box ${song.id}" onerror="this.outerHTML='<span class=\'hint-fallback\'>Hint<br>Box ${song.id}</span>'">`;
    if (played && record) {
      const playedBy = TEAMS.find(team => team.id === record.playedBy);
      const receiver = TEAMS.find(team => team.id === record.awardedTo);
      content = `<div class="played-details"><strong class="played-title">${song.title}</strong><b class="played-points">${record.points > 0 ? "+" : ""}${record.points} pts</b><span class="played-by">Played by <img src="${playedBy.logo}" alt=""> ${playedBy.name}</span><span class="played-to">${receiver ? `Points to <img src="${receiver.logo}" alt=""> ${receiver.name}` : "Points forfeited"}</span></div>`;
    }
    return `<button class="box ${played ? "played" : ""} ${selected ? "selected" : ""} ${hinted ? "hint-revealed" : ""}" role="gridcell" aria-label="${played ? `Box ${song.id}: ${song.title}, ${record.points} points` : `Box ${song.id}${hinted ? ", hint revealed" : ""}`}" data-index="${index}" ${played ? "disabled" : ""}>${content}${hinted ? '<span class="sparkle-field" aria-hidden="true"></span>' : ""}</button>`;
  }).join("");
}

function setHub(phase, instruction) {
  const instructionElement = $("#hub-instruction");
  if (instructionElement) instructionElement.textContent = instruction;
}

function selectBox() {
  const song = state.songs[state.selected];
  if (!song || state.played.has(song.id)) return;
  state.box = song;
  state.flow = "hint";
  stopCue("board"); cue("hint");
  renderGrid();
  setHub("Hint revealed", "Enter: open song arena · Esc: hide hint");
}

function enterArena() {
  if (!state.box) return;
  stopCue("board");
  state.flow = "arena";
  $("#arena-box-label").textContent = `MYSTERY BOX #${state.box.id}`;
  $("#video-notice").textContent = "";
  $("#video-message").textContent = "Ready when you are";
  $("#video-message").classList.remove("hidden");
  $("#countdown").textContent = "";
  $("#cutoff-progress").style.width = "0%";
  video.src = state.box.filename;
  video.volume = Number($("#volume-slider").value);
  video.load();
  arena.classList.add("visible");
  arena.setAttribute("aria-hidden", "false");
  setHub("Song arena", "Space: play or pause · Esc: return to board");
}

function startVideo() {
  if (state.flow !== "arena" || !state.box) return;
  if (!video.paused) { video.pause(); return; }
  $("#video-message").classList.add("hidden");
  if (video.currentTime >= state.box.cutoff) video.currentTime = 0;
  video.play().then(() => { watchVideoFrame(); }).catch(() => {
    $("#video-notice").textContent = "Video unavailable. Check this song file, then press Space to try again.";
  });
}

function updateCutoffProgress() {
  if (!state.box) return;
  const ratio = Math.min(1, Math.max(0, video.currentTime / state.box.cutoff));
  $("#cutoff-progress").style.width = `${ratio * 100}%`;
}

video.addEventListener("timeupdate", () => {
  updateCutoffProgress();
  if (state.flow === "arena" && state.box && video.currentTime >= state.box.cutoff) {
    video.pause();
    video.currentTime = state.box.cutoff;
    startCountdown();
  } else if (["answerPlayback", "forfeitPlayback"].includes(state.flow) && state.box && video.currentTime >= state.box.aftrev) {
    onAftrevReached();
  }
});

function watchVideoFrame() {
  if (typeof video.requestVideoFrameCallback !== "function") return;
  video.requestVideoFrameCallback((_, metadata) => {
    if (state.flow === "arena" && state.box && metadata.mediaTime >= state.box.cutoff) {
      video.pause();
      video.currentTime = state.box.cutoff;
      startCountdown();
    } else if (["answerPlayback", "forfeitPlayback"].includes(state.flow) && state.box && metadata.mediaTime >= state.box.aftrev) {
      onAftrevReached();
    } else if (!video.paused && ["arena", "answerPlayback", "forfeitPlayback"].includes(state.flow)) watchVideoFrame();
  });
}

video.addEventListener("ended", () => {
  if (state.flow === "arena") startCountdown();
  else if (["answerPlayback", "forfeitPlayback"].includes(state.flow)) onAftrevReached();
});

function beginAnswerPlayback(forfeited) {
  stopCue("steal");
  clearInterval(state.countdownTimer);
  state.countdownTimer = null;
  state.pendingForfeit = forfeited;
  backdrop.classList.remove("visible", "blurred-stage", "clear-stage");
  backdrop.setAttribute("aria-hidden", "true");
  state.flow = forfeited ? "forfeitPlayback" : "answerPlayback";
  $("#video-notice").textContent = "";
  $("#video-message").classList.add("hidden");
  setHub("Answer reveal", forfeited ? "Playing answer, then returning to board…" : "Playing answer at low volume…");
  if (video.currentTime >= state.box.aftrev) { onAftrevReached(); return; }
  video.play().then(() => watchVideoFrame()).catch(() => {
    $("#video-notice").textContent = "Video unavailable. The box will return to the board.";
    if (forfeited) finishBox(false);
    else onAftrevReached();
  });
}

function onAftrevReached() {
  if (state.flow === "forfeitPlayback") {
    state.flow = "forfeitReveal";
    video.volume = ANSWER_REVEAL_VOLUME;
    openModal("No steal", "The points will be forfeited. Reveal the mystery points to continue.", [{ label: "Reveal points", value: "reveal" }], "forfeitReveal");
  } else if (state.flow === "answerPlayback") {
    state.flow = "giveTake";
    video.volume = ANSWER_REVEAL_VOLUME;
    openModal("The answer is revealed", "Choose what to do with this box's mystery points.", [
      { label: "TAKE", value: "take" },
      { label: "GIVE", value: "give" }
    ], "giveTake");
  }
}

function fadeForfeitAudio() {
  if (state.flow !== "forfeitPlayback") return;
  state.flow = "forfeitFade";
  const steps = 18;
  const startingVolume = video.volume;
  let step = 0;
  const fade = setInterval(() => {
    step += 1;
    video.volume = Math.max(0, startingVolume * (1 - step / steps));
    if (step >= steps) {
      clearInterval(fade);
      video.pause();
      video.volume = Number($("#volume-slider").value);
      finishBox(false);
    }
  }, 45);
}

function startCountdown() {
  if (state.flow !== "arena") return;
  state.flow = "countdown";
  let elapsed = 5;
  $("#countdown").textContent = elapsed;
  setHub("Host command", "C or Space: correct · X or W: wrong");
  state.countdownTimer = setInterval(() => {
    elapsed = Math.max(0, elapsed - 1);
    $("#countdown").textContent = elapsed;
    if (elapsed === 0) {
      clearInterval(state.countdownTimer);
      state.countdownTimer = null;
    }
  }, 1000);
}

function handleCorrect() {
  clearInterval(state.countdownTimer);
  state.countdownTimer = null;
  $("#countdown").textContent = "";
  cue("correct");
  beginAnswerPlayback(false);
}

function controllingTeamId() {
  return state.winner || TEAMS[state.activeIndex].id;
}

function handleWrong() {
  if (state.flow !== "countdown") return;
  clearInterval(state.countdownTimer);
  state.countdownTimer = null;
  $("#countdown").textContent = "";
  cue("wrong");
  const options = TEAMS.filter((_, index) => index !== state.activeIndex)
    .map(team => ({ label: team.name, value: team.id }));
  options.push({ label: "No Steal / Forfeit", value: "forfeit" });
  openModal("Incorrect lyrics", "Other teams may buzz in. Select the team that won the steal.", options, "steal");
}

function startRound(roundNumber) {
  state.round = roundNumber;
  state.flow = "randomizing";
  stopCue("board"); cue("round"); cue("randomizer");
  backdrop.classList.remove("round-intro");
  state.modalOptions = [];
  $("#modal-kicker").textContent = `Round ${roundNumber} · turn order`;
  $("#modal-title").textContent = "Drawing the turn order";
  $("#modal-copy").textContent = "The team order is being randomized…";
  $("#modal-options").innerHTML = "";
  $("#reveal-result").classList.remove("show");
  backdrop.classList.add("visible");
  backdrop.setAttribute("aria-hidden", "false");
  setHub("Randomizer", "Drawing team order…");
  let tick = 0;
  clearInterval(state.randomizeTimer);
  state.randomizeTimer = setInterval(() => {
    $("#modal-title").textContent = TEAMS[tick % TEAMS.length].name;
    $("#modal-title").classList.add("drawing-team");
    tick += 1;
  }, 110);
  window.setTimeout(() => {
    clearInterval(state.randomizeTimer);
    state.turnOrder = [...TEAMS.keys()];
    for (let index = state.turnOrder.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [state.turnOrder[index], state.turnOrder[swap]] = [state.turnOrder[swap], state.turnOrder[index]];
    }
    state.turnPosition = 0;
    $("#modal-title").classList.remove("drawing-team");
    $("#modal-title").textContent = `Round ${roundNumber} turn order`;
    $("#modal-copy").textContent = state.turnOrder.map((index, position) => `${position + 1}. ${TEAMS[index].name}`).join("   ·   ");
    state.flow = "roundStart";
    stopCue("randomizer");
    state.modalOptions = [{ label: `Start Round ${roundNumber}`, value: "start" }];
    state.modalIndex = 0;
    renderOptions();
    updateHubForModal();
  }, 2100);
}

function showRoundIntro(roundNumber) {
  state.round = roundNumber;
  state.flow = "roundIntro";
  $("#modal-kicker").textContent = "Next round";
  $("#modal-title").textContent = `ROUND ${roundNumber}`;
  $("#modal-copy").textContent = "Press Space to randomize the team order.";
  $("#modal-options").innerHTML = "";
  $("#reveal-result").className = "reveal-result";
  backdrop.classList.remove("blurred-stage");
  backdrop.classList.add("visible", "clear-stage", "round-intro");
  backdrop.setAttribute("aria-hidden", "false");
  setHub("Round intro", "Space: randomize the next round");
}

function openModal(title, copy, options, flow) {
  if (flow === "steal") cue("steal", true); else stopCue("steal");
  state.flow = flow;
  state.modalOptions = options;
  state.modalIndex = 0;
  $("#modal-title").textContent = title;
  $("#modal-copy").textContent = copy;
  $("#reveal-result").classList.remove("show");
  $("#reveal-result").textContent = "";
  $(".game-modal").classList.remove("suspense");
  renderOptions();
  const blurStage = flow === "steal";
  backdrop.classList.toggle("blurred-stage", blurStage);
  backdrop.classList.toggle("clear-stage", !blurStage);
  backdrop.classList.add("visible");
  backdrop.setAttribute("aria-hidden", "false");
  updateHubForModal();
}

function renderOptions() {
  const optionsEl = $("#modal-options");
  optionsEl.innerHTML = state.modalOptions.map((option, index) => {
    const team = TEAMS.find(item => item.id === option.value);
    let content = option.label;
    let classes = "modal-option";
    if (state.flow === "giveTake") {
      classes += " choice-option";
      content = option.value === "take" ? `<span class="choice-icon">💎</span><span>Take It</span>` : `<span class="choice-icon">🎁</span><span>Give It</span>`;
    } else if (team && ["steal", "target"].includes(state.flow)) {
      classes += " team-option";
      content = `<img src="${team.logo}" alt=""><span>${team.name}</span>`;
    } else if (option.value === "forfeit") {
      classes += " team-option no-steal-option";
      content = `<span class="choice-icon">—</span><span>No Steal / Forfeit</span>`;
    }
    return `<button class="${classes} ${index === state.modalIndex ? "selected" : ""}" data-option="${index}">${content}</button>`;
  }).join("");
  [...optionsEl.children].forEach(button => button.addEventListener("click", () => {
    state.modalIndex = Number(button.dataset.option);
    renderOptions();
    confirmOption();
  }));
}

function updateHubForModal() {
  const hints = {
    randomizing: "Randomly drawing team order…",
    roundStart: "Enter: begin round",
    roundIntro: "Space: randomize the next round",
    giveTake: "← / → or 1 / 2: choose · Enter: confirm",
    steal: "↑ / ↓: choose team · Enter: confirm",
    target: "↑ / ↓: choose target · Enter: confirm",
    reveal: "Enter or Space: reveal mystery points",
    finish: "Enter or Space: return to board",
    gameOver: "Enter or Space: finish game"
  };
  setHub(state.flow, hints[state.flow] || "↑ / ↓ move · Enter confirm · Esc back");
}

function moveOption(step) {
  if (!state.modalOptions.length) return;
  state.modalIndex = (state.modalIndex + step + state.modalOptions.length) % state.modalOptions.length;
  renderOptions();
}

function confirmOption() {
  const selected = state.modalOptions[state.modalIndex];
  if (!selected) return;
  if (state.flow === "roundStart") {
    stopCue("randomizer"); cue("board", true);
    state.started = true;
    state.activeIndex = state.turnOrder[0];
    state.turnPosition = 0;
    backdrop.classList.remove("visible");
    backdrop.setAttribute("aria-hidden", "true");
    state.flow = "board";
    renderTeams();
    renderGrid();
    setHub(`Round ${state.round}`, "↑ ↓ ← → move · Enter select · Space reveal");
  } else if (state.flow === "gameOver") {
    backdrop.classList.remove("visible");
    backdrop.setAttribute("aria-hidden", "true");
    state.flow = "complete";
    setHub("Game complete", "All twelve round turns have been played.");
  } else if (state.flow === "giveTake") {
    cue("lock");
    state.giveTake = selected.value;
    if (selected.value === "take") {
      state.target = controllingTeamId();
      openModal("Mystery points are ready", "Confirm to reveal the value and update the score.", [{ label: "Reveal points", value: "reveal" }], "reveal");
    } else {
      const candidates = TEAMS.filter(team => team.id !== controllingTeamId());
      openModal("Choose a team to give points", "The selected team will receive this box's mystery points.", candidates.map(team => ({ label: team.name, value: team.id })), "target");
    }
  } else if (state.flow === "steal") {
    if (selected.value === "forfeit") { cue("forfeit"); beginAnswerPlayback(true); return; }
    state.winner = selected.value;
    beginAnswerPlayback(false);
  } else if (state.flow === "target") {
    state.target = selected.value;
    cue("lock");
    openModal("Mystery points are ready", `Points will go to ${TEAMS.find(team => team.id === state.target).name}. Confirm to reveal.`, [{ label: "Reveal points", value: "reveal" }], "reveal");
  } else if (state.flow === "reveal") revealPoints();
  else if (state.flow === "forfeitReveal") beginPointReveal(true);
  else if (state.flow === "forfeitRevealDone") finishBox(false);
  else if (state.flow === "suspense") return;
  else if (state.flow === "finish") closeRound();
}

function revealPoints() { beginPointReveal(false); }

function beginPointReveal(forfeited) {
  clearInterval(state.countdownTimer);
  state.countdownTimer = null;
  state.pendingForfeit = forfeited;
  video.pause();
  stopCue("steal"); cue("reveal");
  state.flow = "suspense";
  $(".game-modal").classList.add("suspense");
  state.modalOptions = [];
  $("#modal-options").innerHTML = "";
  $("#reveal-result").className = "reveal-result";
  $("#modal-title").textContent = "Opening the mystery box…";
  const receiverId = state.target || state.winner || TEAMS[state.activeIndex].id;
  const controllerName = TEAMS.find(team => team.id === controllingTeamId()).name;
  const receiverName = TEAMS.find(team => team.id === receiverId).name;
  const message = forfeited ? "No team claimed this box. Its points will be forfeited." : state.giveTake === "give" ? `${controllerName} gives the points to ${receiverName}.` : `${controllerName} takes the points.`;
  $("#modal-copy").textContent = message;
  $("#modal-kicker").textContent = "The reveal";
  setHub("Host command", "Revealing mystery points…");
  clearTimeout(state.revealTimer);
  state.revealTimer = window.setTimeout(() => {
    const points = state.box.points;
    if (!forfeited) {
      const receiver = state.target || state.winner || TEAMS[state.activeIndex].id;
      state.scores[receiver] += points;
      $(`#score-${receiver}`).textContent = state.scores[receiver];
    }
    $("#modal-title").textContent = forfeited ? "Points forfeited" : "Mystery points revealed";
    $("#modal-copy").textContent = forfeited ? "No team receives these points." : `${controllerName} ${state.giveTake === "give" ? `gave the points to ${receiverName}` : `took the points`}.`;
    const result = $("#reveal-result");
    result.textContent = `${points > 0 ? "+" : ""}${points} POINTS`;
    result.classList.add("show", points >= 0 ? "positive" : "negative");
    $(".game-modal").classList.remove("suspense");
    state.flow = forfeited ? "forfeitRevealDone" : "finish";
    state.modalOptions = [{ label: "Continue", value: "continue" }];
    state.modalIndex = 0;
    renderOptions();
    updateHubForModal();
  }, 2000);
}

function launchPointParticles(teamId, positive) {
  cue("topup");
  const origin = $(".game-modal").getBoundingClientRect();
  const target = document.querySelector(`.team-card[data-team="${teamId}"] .team-score`);
  if (!target) return;
  const destination = target.getBoundingClientRect();
  for (let index = 0; index < 18; index += 1) {
    const particle = document.createElement("span");
    particle.className = `point-particle ${positive ? "positive" : "negative"}`;
    particle.style.left = `${origin.left + origin.width / 2}px`;
    particle.style.top = `${origin.top + origin.height / 2}px`;
    particle.style.setProperty("--dx", `${destination.left + destination.width / 2 - origin.left - origin.width / 2}px`);
    particle.style.setProperty("--dy", `${destination.top + destination.height / 2 - origin.top - origin.height / 2}px`);
    particle.style.animationDelay = `${index * 24}ms`;
    document.body.appendChild(particle);
    window.setTimeout(() => particle.remove(), 1400);
  }
  target.classList.remove("point-arrival");
  void target.offsetWidth;
  target.classList.add("point-arrival");
  window.setTimeout(() => target.classList.remove("point-arrival"), 1000);
}

function finishBox(scored) {
  stopCue("steal"); stopCue("board"); stopCue("reveal");
  const particleTeam = scored ? (state.target || state.winner || TEAMS[state.activeIndex].id) : null;
  const particlePositive = state.box ? state.box.points >= 0 : true;
  clearInterval(state.countdownTimer);
  state.countdownTimer = null;
  clearTimeout(state.revealTimer);
  if (state.box) {
    state.played.add(state.box.id);
    state.results[state.box.id] = {
      points: state.box.points,
      playedBy: TEAMS[state.activeIndex].id,
      awardedTo: scored ? (state.target || state.winner || TEAMS[state.activeIndex].id) : null
    };
  }
  video.pause();
  video.volume = Number($("#volume-slider").value);
  arena.classList.remove("visible");
  arena.setAttribute("aria-hidden", "true");
  backdrop.classList.remove("visible", "blurred-stage", "clear-stage", "round-intro");
  backdrop.setAttribute("aria-hidden", "true");
  state.flow = "board";
  state.box = null;
  state.winner = null;
  state.giveTake = null;
  state.target = null;
  const available = playableIndices();
  if (available.length && state.played.has(state.songs[state.selected]?.id)) state.selected = available[0];
  renderGrid();
  state.turnPosition += 1;
  if (state.turnPosition < TEAMS.length) {
    cue("board", true);
    state.activeIndex = state.turnOrder[state.turnPosition];
    renderTeams();
    if (particleTeam) launchPointParticles(particleTeam, particlePositive);
    setHub(`Round ${state.round}`, `Next turn: ${TEAMS[state.activeIndex].name}`);
  } else if (state.round < 3) {
    renderTeams();
    if (particleTeam) launchPointParticles(particleTeam, particlePositive);
    showRoundIntro(state.round + 1);
  } else {
    renderTeams();
    if (particleTeam) launchPointParticles(particleTeam, particlePositive);
    const highScore = Math.max(...TEAMS.map(team => state.scores[team.id]));
    const winners = TEAMS.filter(team => state.scores[team.id] === highScore);
    const title = winners.length > 1 ? "Game complete — tied score!" : `${winners[0].name} wins!`;
    const finalScores = TEAMS.map(team => `${team.name} ${state.scores[team.id]}`).join(" · ");
    openModal(title, `Final scores: ${finalScores}`, [{ label: "Finish", value: "finish" }], "gameOver");
  }
}

function closeRound() { finishBox(true); }

function cancelFlow() {
  if (state.flow === "hint") {
    state.flow = "board";
    cue("board", true);
    state.box = null;
    renderGrid();
    setHub(`Round ${state.round}`, "↑ ↓ ← → move · Enter select · Space reveal");
  } else if (["arena", "countdown", "answerPlayback", "forfeitPlayback"].includes(state.flow)) {
    beginAnswerPlayback(true);
  } else if (backdrop.classList.contains("visible")) {
    if (state.box) beginAnswerPlayback(true);
  }
}

function moveGrid(key) {
  const open = new Set(playableIndices());
  if (!open.size) return;
  let index = state.selected;
  const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -4, ArrowDown: 4 }[key];
  for (let attempts = 0; attempts < state.songs.length; attempts++) {
    index = (index + delta + state.songs.length) % state.songs.length;
    if (open.has(index)) { state.selected = index; break; }
  }
  renderGrid();
  cue("select");
}

document.addEventListener("keydown", event => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
  if (state.launchPhase === "start") {
    if (event.code === "Space" || event.key === "Enter") showTitleCard();
    return;
  }
  if (state.launchPhase === "title") return;
  if (state.launchPhase === "titleReady") {
    if (event.code === "Space" || event.key === "Enter") enterGameStage();
    return;
  }
  if (state.flow === "board") {
    if (!state.started) {
      if (event.code === "Space") startRound(1);
    } else if (event.key.startsWith("Arrow")) moveGrid(event.key);
    else if (event.key === "Enter") selectBox();
    else if (event.code === "Space") { if (!state.box) selectBox(); else enterArena(); }
  } else if (state.flow === "hint") {
    if (event.key === "Enter" || event.code === "Space") enterArena();
    else if (event.key === "Escape") cancelFlow();
  } else if (state.flow === "arena") {
    if (event.code === "Space") startVideo();
    else if (event.key === "Escape") cancelFlow();
  } else if (state.flow === "countdown") {
    if (event.code === "Space" || event.key.toLowerCase() === "c") handleCorrect();
    else if (["x", "w"].includes(event.key.toLowerCase())) handleWrong();
  } else if (backdrop.classList.contains("visible")) {
    if (["roundStart", "gameOver"].includes(state.flow)) {
      if (event.key === "Enter" || event.code === "Space") confirmOption();
    } else if (state.flow === "giveTake") {
      if (event.key === "ArrowLeft" || event.key === "1") { state.modalIndex = 0; renderOptions(); }
      else if (event.key === "ArrowRight" || event.key === "2") { state.modalIndex = 1; renderOptions(); }
      else if (event.key === "Enter") confirmOption();
      else if (event.key === "Escape") cancelFlow();
    } else if (["steal", "target"].includes(state.flow)) {
      if (event.key === "ArrowDown" || event.key === "ArrowRight") moveOption(1);
      else if (event.key === "ArrowUp" || event.key === "ArrowLeft") moveOption(-1);
      else if (event.key === "Enter") confirmOption();
      else if (event.key === "Escape") cancelFlow();
    } else if (state.flow === "roundIntro" && event.code === "Space") startRound(state.round);
    else if (["reveal", "forfeitReveal", "forfeitRevealDone"].includes(state.flow) && (event.key === "Enter" || event.code === "Space")) confirmOption();
    else if (state.flow === "finish" && (event.key === "Enter" || event.code === "Space")) closeRound();
  }
});

$("#start-game").addEventListener("click", showTitleCard);
$("#title-card").addEventListener("click", () => {
  if (state.launchPhase === "titleReady") enterGameStage();
});

grid.addEventListener("click", event => {
  const card = event.target.closest(".box");
  if (!card || card.disabled || state.flow !== "board" || !state.started) return;
  state.selected = Number(card.dataset.index);
  selectBox();
});
$("#arena-close").addEventListener("click", cancelFlow);
$("#volume-slider").addEventListener("input", event => {
  if (!["answerPlayback", "forfeitPlayback", "forfeitFade", "giveTake", "target"].includes(state.flow)) video.volume = Number(event.currentTarget.value);
  $("#volume-button").textContent = video.volume === 0 ? "🔇" : video.volume < 0.35 ? "🔉" : "🔊";
});
$("#volume-button").addEventListener("click", () => $("#volume-slider").focus());
$("#cue-volume-slider").addEventListener("input", event => {
  cueVolume = Number(event.currentTarget.value);
  Object.entries(cues).forEach(([key, audio]) => { if (key !== "theme") audio.volume = cueVolume; });
});

async function init() {
  try {
    await loadSongs();
    state.selected = 0;
    renderTeams();
    renderGrid();
    setHub("Ready", "Space: randomize the team order");
  } catch (error) {
    $("#grid").innerHTML = `<p class="board-note">${error.message}. Open this page through a local web server so the browser can load the CSV.</p>`;
  }
}

init();
