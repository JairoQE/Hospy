const NOTIFICATION_SOUND_URL = "/Notificacion.mp3";

let audio: HTMLAudioElement | null = null;
let unlocked = false;

function getAudio(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.preload = "auto";
  }
  return audio;
}

function tryUnlock() {
  if (unlocked) return;
  const el = getAudio();
  el.volume = 0;
  const p = el.play();
  if (!p) return;
  p.then(() => {
    el.pause();
    el.currentTime = 0;
    el.volume = 0.85;
    unlocked = true;
  }).catch(() => {
    el.volume = 0.85;
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", tryUnlock, { once: true, passive: true });
  window.addEventListener("keydown", tryUnlock, { once: true });
}

export function playInboxNotificationSound() {
  if (typeof window === "undefined") return;
  const el = getAudio();
  el.volume = 0.85;
  el.currentTime = 0;
  void el.play().catch(() => {
    /* autoplay bloqueado hasta interacción del usuario */
  });
}
