const canvas = document.querySelector("#overlayCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const TAU = Math.PI * 2;

const localBaseUrl = "http://localhost:3041";
const apiBaseUrl = location.protocol === "file:" ? localBaseUrl : "";

if (new URLSearchParams(location.search).get("bg") === "green") {
  document.documentElement.classList.add("green-bg");
}

const imageCache = new Map();
let characters = [];
let seenId = 0;
let queue = [];
let currentToast = null;
let lastPoll = 0;

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const img = new Image();
  img.src = src;
  imageCache.set(src, img);
  return img;
}

function loadCharacters() {
  fetch(`${apiBaseUrl}/api/characters`, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : [])
    .then((data) => {
      if (!Array.isArray(data) || data.length === 0) return;
      characters = data.filter((character) => character.name && character.image);
      characters.slice(0, 24).forEach((character) => loadImage(character.image));
    })
    .catch(() => {});
}

function pickCharacter() {
  if (characters.length === 0) {
    return { name: "Goku", image: "character-images/Goku.jpg" };
  }
  return characters[Math.floor(Math.random() * characters.length)];
}

function avatarUrl(url) {
  if (!url) return "";
  return `${apiBaseUrl}/api/avatar?url=${encodeURIComponent(url)}`;
}

function pollEvents(now) {
  if (now - lastPoll < 1000) return;
  lastPoll = now;
  const url = `${apiBaseUrl}/api/events`;
  fetch(url, { cache: "no-store" })
    .then((response) => response.ok ? response.json() : [])
    .then((events) => {
      if (!Array.isArray(events)) return;
      events.slice().reverse().forEach((event) => {
        if (!event || !event.id || event.id <= seenId) return;
        seenId = Math.max(seenId, Number(event.id));
        queue.push(event);
      });
      if (!currentToast) startNextToast(now);
    })
    .catch(() => {});
}

function startNextToast(now) {
  const event = queue.shift();
  if (!event) return;
  const character = pickCharacter();
  const avatar = loadImage(avatarUrl(event.avatar));
  currentToast = {
    start: now,
    duration: 4800,
    name: String(event.name || event.username || "Nuevo seguidor").trim(),
    avatar,
    character,
    characterImage: loadImage(character.image)
  };
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCircularImage(img, x, y, r, fallbackColor = "#f4c342") {
  ctx.save();
  ctx.fillStyle = "#f4c342";
  ctx.beginPath();
  ctx.arc(x, y, r + 6, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(
      img,
      (img.naturalWidth - size) / 2,
      (img.naturalHeight - size) / 2,
      size,
      size,
      x - r,
      y - r,
      r * 2,
      r * 2
    );
  } else {
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, 4, x, y, r);
    grad.addColorStop(0, "#fffdf0");
    grad.addColorStop(0.62, fallbackColor);
    grad.addColorStop(1, "#b98113");
    ctx.fillStyle = grad;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

function fitText(text, maxWidth, startSize, minSize) {
  let size = startSize;
  do {
    ctx.font = `900 ${size}px Inter, Arial, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 1;
  } while (size > minSize);
  return minSize;
}

function drawToast(now) {
  if (!currentToast) return;
  const age = now - currentToast.start;
  if (age > currentToast.duration) {
    currentToast = null;
    startNextToast(now);
    return;
  }

  const inT = easeOutCubic(age / 520);
  const outT = age > currentToast.duration - 650
    ? 1 - easeOutCubic((age - (currentToast.duration - 650)) / 650)
    : 1;
  const alpha = inT * outT;
  const y = H * 0.66;
  const x = W / 2 - 260 + (1 - inT) * -90;
  const w = 520;
  const h = 132;
  const pulse = 1 + Math.sin(now / 150) * 0.012;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(pulse, pulse);
  ctx.translate(-(x + w / 2), -(y + h / 2));

  ctx.shadowColor = "rgba(31, 42, 74, 0.34)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  roundedRect(x, y, w, h, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 204, 62, 0.95)";
  ctx.lineWidth = 5;
  ctx.stroke();

  drawCircularImage(currentToast.avatar, x + 67, y + h / 2, 42, "#82d6ff");
  drawCircularImage(currentToast.characterImage, x + w - 67, y + h / 2, 43, "#ffd055");

  const name = currentToast.name.toUpperCase();
  const characterName = currentToast.character.name.toUpperCase();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  ctx.font = "900 19px Inter, Arial, sans-serif";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(255,255,255,0.94)";
  ctx.fillStyle = "#d8a514";
  ctx.strokeText(name.length > 18 ? `${name.slice(0, 17)}...` : name, x + w / 2, y + 34);
  ctx.fillText(name.length > 18 ? `${name.slice(0, 17)}...` : name, x + w / 2, y + 34);

  ctx.font = "900 18px Inter, Arial, sans-serif";
  ctx.fillStyle = "#26304c";
  ctx.strokeText("TU PERSONAJE ES", x + w / 2, y + 66);
  ctx.fillText("TU PERSONAJE ES", x + w / 2, y + 66);

  const size = fitText(characterName, 230, 27, 15);
  ctx.font = `900 ${size}px Inter, Arial, sans-serif`;
  ctx.fillStyle = "#ff642f";
  ctx.strokeText(characterName, x + w / 2, y + 101);
  ctx.fillText(characterName, x + w / 2, y + 101);

  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 8; i++) {
    const a = now / 520 + i * TAU / 8;
    const px = x + w / 2 + Math.cos(a) * (226 + i % 2 * 12);
    const py = y + h / 2 + Math.sin(a) * (54 + i % 2 * 6);
    ctx.fillStyle = `rgba(255, 222, 88, ${0.22 + i * 0.025})`;
    ctx.beginPath();
    ctx.arc(px, py, 3.4, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

function draw(now) {
  ctx.clearRect(0, 0, W, H);
  pollEvents(now);
  drawToast(now);
  requestAnimationFrame(draw);
}

loadCharacters();
requestAnimationFrame(draw);
