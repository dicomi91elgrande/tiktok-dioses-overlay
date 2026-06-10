const canvas = document.querySelector("#overlayCanvas");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const TAU = Math.PI * 2;

if (new URLSearchParams(location.search).get("bg") === "green") {
  document.documentElement.classList.add("green-bg");
}

const gods = [
  { name: "Zeus", image: "deity-images/ZEUS.png" },
  { name: "Hera", image: "deity-images/HERA.png" },
  { name: "Poseidon", image: "deity-images/POSEIDON.png" },
  { name: "Atenea", image: "deity-images/ATENEA.png" },
  { name: "Apolo", image: "deity-images/APOLO.png" },
  { name: "Artemisa", image: "deity-images/ARTEMISA.png" },
  { name: "Ares", image: "deity-images/ARES.png" },
  { name: "Afrodita", image: "deity-images/AFRODITA.png" },
  { name: "Hermes", image: "deity-images/HERMES.png" },
  { name: "Hades", image: "deity-images/HADES.png" },
  { name: "Dioniso", image: "deity-images/DIONISIO.png" },
  { name: "Demeter", image: "deity-images/DEMETER.png" },
  { name: "Hefesto", image: "deity-images/EFESO.png" },
  { name: "Persefone", image: "deity-images/PERSEFONE.png" },
  { name: "Hercules", image: "deity-images/HERCULES.png" },
  { name: "Aquiles", image: "deity-images/AQUILES.png" },
  { name: "Odiseo", image: "deity-images/ODISEO.png" },
  { name: "Perseo", image: "deity-images/PERSEO.png" },
  { name: "Teseo", image: "deity-images/TESEO.png" },
  { name: "Orfeo", image: "deity-images/ORFEO.png" },
  { name: "Medusa", image: "deity-images/MEDUSA.png" },
  { name: "Pegaso", image: "deity-images/PEGASO.png" },
  { name: "Minotauro", image: "deity-images/minotauro.jpg" },
  { name: "Anubis", image: "deity-images/anubis.jpg" }
];

const imageCache = new Map();
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

gods.forEach((god) => loadImage(god.image));

function pickGod() {
  return gods[Math.floor(Math.random() * gods.length)];
}

function avatarUrl(url) {
  if (!url) return "";
  if (location.protocol === "file:") return `http://localhost:3041/api/avatar?url=${encodeURIComponent(url)}`;
  return `/api/avatar?url=${encodeURIComponent(url)}`;
}

function pollEvents(now) {
  if (now - lastPoll < 420) return;
  lastPoll = now;
  const url = location.protocol === "file:" ? "http://localhost:3041/api/events" : "/api/events";
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
  const god = pickGod();
  const avatar = loadImage(avatarUrl(event.avatar));
  currentToast = {
    start: now,
    duration: 4800,
    name: String(event.name || event.username || "Nuevo seguidor").trim(),
    avatar,
    god,
    godImage: loadImage(god.image)
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
  drawCircularImage(currentToast.godImage, x + w - 67, y + h / 2, 43, "#ffd055");

  const name = currentToast.name.toUpperCase();
  const godName = currentToast.god.name.toUpperCase();
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
  ctx.strokeText("TE ASIGNO A", x + w / 2, y + 66);
  ctx.fillText("TE ASIGNO A", x + w / 2, y + 66);

  const size = fitText(godName, 210, 27, 18);
  ctx.font = `900 ${size}px Inter, Arial, sans-serif`;
  ctx.fillStyle = "#ff642f";
  ctx.strokeText(godName, x + w / 2, y + 101);
  ctx.fillText(godName, x + w / 2, y + 101);

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

requestAnimationFrame(draw);
