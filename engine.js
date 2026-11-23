"use strict";

// State is independent of the DOM, so timing and priority can be tested directly.
class DownloadEngine {
  constructor() { this.reset(); }

  reset() {
    this.progress = 0;
    this.urgeCount = 0;
    this.urgeTimes = [];
    this.hasCoffee = false;
    this.hasEncouragement = false;
    this.kindWordsCount = 0;
    this.isOnStrike = false;
    this.emotion = "calm";
    this.speed = 1; // percentage points per second; 128 MB simulated file
    this.completed = false;
  }

  recentUrges(now) {
    this.urgeTimes = this.urgeTimes.filter(time => now - time < 5000);
    return this.urgeTimes.length;
  }

  urge(now) {
    if (this.completed) return;
    this.urgeCount++;
    this.urgeTimes.push(now);
    if (!this.isOnStrike && this.recentUrges(now) >= 3) {
      this.isOnStrike = true;
      // Old encouragement cannot automatically undo a new strike.
      this.hasEncouragement = false;
    }
    this.evaluate(now);
  }

  giveCoffee(value, now) {
    if (this.completed) return;
    this.hasCoffee = value;
    this.tryRecover();
    this.evaluate(now);
  }

  encourage(now) {
  if (this.completed) return;

  this.hasEncouragement = true;
  this.kindWordsCount += 1;

  this.tryRecover();
  this.evaluate(now);
}
  tryRecover() {
    if (this.isOnStrike && this.hasCoffee && this.hasEncouragement) {
      this.isOnStrike = false;
      this.urgeTimes = []; // fresh start, no immediate return to strike/anxiety
    }
  }

  evaluate(now) {
    const recent = this.recentUrges(now);
    // IMPORTANT: Strike is checked BEFORE anxiety and persists until recovery.
    if (this.isOnStrike) {
      this.emotion = "strike";
      this.speed = 0;
    } else if (this.completed) {
      this.emotion = "complete";
      this.speed = 0;
    } else if (this.hasCoffee && recent >= 2) {
      this.emotion = "anxious";
      this.speed = 0.2;
    } else if (recent > 0) {
      this.emotion = "annoyed";
      this.speed = recent >= 2 ? 0.3 : 0.55;
    } else if (this.kindWordsCount >= 3) {
  this.emotion = "excited";
  this.speed = 2;
} else if (this.hasCoffee || this.hasEncouragement) {
  this.emotion = "happy";
  this.speed = this.hasCoffee ? 1.35 : 1;
    } else {
      this.emotion = "calm";
      this.speed = 1;
    }
  }

  tick(seconds, now) {
    this.evaluate(now);
    this.progress = Math.min(100, this.progress + this.speed * seconds);
    if (this.progress >= 100) {
      this.completed = true;
      this.evaluate(now);
    }
  }
}
