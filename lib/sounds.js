let context;
let enabled = true;
export function configureSound(value) { enabled = value; }
export function unlockSound() {
  if (!enabled) return;
  try { const Audio = window.AudioContext || window.webkitAudioContext; if (Audio) { context ||= new Audio(); if (context.state === "suspended") context.resume().catch(() => {}); } } catch { /* Audio may be unavailable. */ }
}
export function playChessSound(type) {
  if (!enabled || !context || context.state !== "running") return;
  const notes = type === "mate" ? [523, 659, 784, 1047] : type === "check" ? [660, 880] : type === "capture" ? [180, 120] : [420];
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator(); const gain = context.createGain();
    const start = context.currentTime + index * .09;
    oscillator.type = type === "capture" ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.06, start + .01); gain.gain.exponentialRampToValueAtTime(.001, start + .13);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(start); oscillator.stop(start + .15);
  });
}
