"use strict";

const downloader = new DownloadEngine();
const $ = id => document.getElementById(id);
const ui = {
  stage: $("tv-stage"), tv: $("television"), speech: $("speech"), mood: $("mood"),
  progress: $("progress-track"), fill: $("progress-fill"), number: $("progress-value"),
  size: $("file-size"), speed: $("speed"), eta: $("eta"), count: $("urge-count"),
  activity: $("activity"), nudge: $("tv-nudge"), coffee: $("coffee"),
  form: $("encouragement-form"), input: $("encouragement"), feedback: $("message-feedback"),
  suggestion: $("suggestion"), reset: $("reset-button")
};

const moods = {
  calm: { label: "Feeling calm · Taking my time", face: "calm", speech: "I’m working on it. Just let me find my rhythm.", thought: "Just a little TV, moving little bytes. Please be gentle." },
  happy: { label: "Feeling happy · A little kindness helps", face: "happy", speech: "A little kindness goes a long way. I’ve got this!", thought: "Being understood makes moving all these bytes feel a little lighter." },
  excited: {
  label: "Feeling inspired · Kindness boost!",
  face: "starry-eyed",
  speech: "Three kind messages? You’ve made my day!",
  thought: "So much kindness! Watch these little bytes fly."
},
  annoyed: { label: "Feeling annoyed · Slowing down", face: "annoyed", speech: "Every nudge makes my brain buffer a little more…", thought: "I know you’re in a hurry. Give me 5 seconds to find my rhythm again." },
  anxious: { label: "Feeling anxious · Too much pressure", face: "anxious", speech: "Caffeine and pressure? Now I’ve got the jitters…", thought: "My heart and my progress bar are both jittering. Coffee can’t cancel out pressure." },
  strike: { label: "On strike · Download paused", face: "angry, striking", speech: "Three nudges in five seconds? I’m on strike.", thought: "Work has stopped. One coffee and some fresh encouragement, please." },
  complete: { label: "All done · A lovely day, delivered", face: "celebrating", speech: "All done! Thanks for believing in this little TV.", thought: "A lovely little day, delivered. A little patience goes a long way." }
};
let previousMood = "";
let lastTick = performance.now();
let previousProgressAnnouncement = -1;

function render() {
  const { emotion, progress, speed, completed } = downloader;
  const mood = moods[emotion];
  if (emotion !== previousMood) {
    ui.stage.dataset.mood = emotion;
    ui.tv.setAttribute("aria-label", `An orange television with a ${mood.face} face`);
    ui.speech.textContent = mood.speech;
    ui.mood.innerHTML = `<span></span>${mood.label}`;
    ui.activity.textContent = mood.thought;
    previousMood = emotion;
  }
  ui.stage.classList.toggle("has-coffee", downloader.hasCoffee);
  ui.progress.classList.toggle("anxious-progress", emotion === "anxious");
  ui.fill.style.width = `${progress}%`;
  ui.fill.style.backgroundColor = emotion === "strike" ? "#bd8c87" : completed ? "#92a77d" : "";
  const integer = Math.floor(progress);
  ui.number.textContent = integer;
  // No live region on a ticking progress bar; announce only meaningful state changes.
  if (integer !== previousProgressAnnouncement) {
    ui.progress.setAttribute("aria-valuenow", integer);
    previousProgressAnnouncement = integer;
  }
  ui.size.textContent = `${(progress * 1.28).toFixed(1)} / 128 MB`;
  ui.speed.textContent = `${(speed * 1.28).toFixed(2)} MB/s`;
  if (completed) ui.eta.textContent = "Complete · A lovely day, delivered";
  else if (downloader.isOnStrike) ui.eta.textContent = "Waiting for coffee + kind words";
  else {
    const seconds = Math.ceil((100 - progress) / speed);
    ui.eta.textContent = `About ${seconds >= 60 ? `${Math.floor(seconds / 60)} min ` : ""}${seconds % 60} sec remaining`;
  }
  ui.count.textContent = downloader.urgeCount;
  ui.nudge.setAttribute("aria-disabled", String(completed));
  ui.coffee.disabled = completed;
  ui.input.disabled = completed;
  ui.form.querySelector("button").disabled = completed;
  ui.suggestion.disabled = completed;
}

ui.nudge.addEventListener("click", () => {
  if (downloader.completed) return;
  downloader.urge(performance.now());
  render();
  ui.tv.classList.remove("bump");
  void ui.tv.offsetWidth;
  ui.tv.classList.add("bump");
  if (downloader.isOnStrike) {
    ui.activity.textContent = downloader.hasEncouragement ? "Kind words received. Now I just need a coffee." : downloader.hasCoffee ? "Coffee received. Now I just need some kind words." : moods.strike.thought;
  }
});

// Match native button keyboard behavior without duplicating pointer clicks.
ui.nudge.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    if (!event.repeat && !downloader.completed) ui.nudge.click();
  }
});

ui.coffee.addEventListener("change", () => {
  const wasStrike = downloader.isOnStrike;
  downloader.giveCoffee(ui.coffee.checked, performance.now());
  render();
  if (wasStrike && !downloader.isOnStrike) recoveryMessage();
  else if (downloader.isOnStrike) ui.activity.textContent = downloader.hasCoffee ? "Coffee received. Now I just need some kind words." : "Still waiting for coffee. It takes coffee AND kindness to make up.";
  else if (downloader.hasCoffee && downloader.emotion === "happy") ui.speech.textContent = "Coffee! A little more energy, a little more speed.";
  else if (!downloader.hasCoffee && downloader.emotion === "calm") ui.speech.textContent = "No coffee? That’s okay. I’ll take my time.";
});

function recoveryMessage() {
  ui.speech.textContent = "Coffee and kind words? Okay. Let’s try again.";
  ui.activity.textContent = "Back on the clock, with a fresh start. Let’s be a little gentler this time.";
}

// Bounded phrase recognition keeps this beginner-friendly and entirely local.
function isEncouragement(text) {
  const normalized = text.toLowerCase().replace(/[\s.,!?'’";:\-–—]/g, "");
  const pressure = /hurryup|faster|speedup|tooslow|stupid|useless|idiot|hateyou/;
  const warmth = /youcandoit|takeyourtime|thankyou|thanks|goodjob|greatjob|welldone|believeinyou|youvegotthis|yougotthis|norush|nohurry|proudofyou|keepgoing|doinggreat|youaregreat|youreawesome|itsokay|dontworry|cheerup|yourethebest/;
  return !pressure.test(normalized) && warmth.test(normalized);
}

ui.form.addEventListener("submit", event => {
  event.preventDefault();
  if (downloader.completed) return;
  const text = ui.input.value.trim();
  ui.feedback.classList.remove("message-error");
  if (!text) {
    ui.feedback.textContent = "Write a little something first. I’m listening.";
    ui.feedback.classList.add("message-error");
    ui.input.focus();
    return;
  }
  if (!isEncouragement(text)) {
    ui.feedback.textContent = "Try “Take your time”, “You’ve got this” or “I believe in you”.";
    ui.feedback.classList.add("message-error");
    ui.speech.textContent = "I hear you. Could you give me a few kind words?";
    return;
  }
  const wasStrike = downloader.isOnStrike;
  downloader.encourage(performance.now());
  render();
  ui.feedback.textContent = `Delivered: “${text}”`;
  ui.input.value = "";
  if (wasStrike && !downloader.isOnStrike) recoveryMessage();
  else if (downloader.isOnStrike) {
    ui.speech.textContent = "Thanks for the kind words. Could I have a coffee too?";
    ui.activity.textContent = "Kind words received. Now I just need a coffee.";
    } else if (downloader.emotion === "excited") {
    ui.speech.textContent = moods.excited.speech;
  } else {
    ui.speech.textContent = downloader.emotion === "anxious" ? "Thank you! Just give me a moment to settle my nerves." : downloader.emotion === "annoyed" ? "I hear you. Let me catch my breath first." : "Aw, you’re making my little screen blush.";
  }
});

ui.suggestion.addEventListener("click", () => {
  ui.input.value = "Take your time. I believe in you.";
  ui.input.focus();
});

ui.reset.addEventListener("click", () => {
  downloader.reset();
  ui.coffee.checked = false;
  ui.input.value = "";
  ui.feedback.textContent = "Kind words don’t go unnoticed.";
  ui.feedback.classList.remove("message-error");
  previousMood = "";
  previousProgressAnnouncement = -1;
  lastTick = performance.now();
  render();
});

// Use elapsed time rather than a fixed increment; pause while the tab is hidden.
setInterval(() => {
  const now = performance.now();
  const elapsed = Math.min((now - lastTick) / 1000, 0.5);
  lastTick = now;
  if (!document.hidden) {
    downloader.tick(elapsed, now);
    render();
  }
}, 100);
document.addEventListener("visibilitychange", () => { lastTick = performance.now(); });
render();
