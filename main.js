const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EMAIL = "simonmilanonicolas@gmail.com";

// Interruptor de tema: el nuevo tema se abre en círculo desde el botón
const themeBtn = document.getElementById("theme");
themeBtn.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  const apply = () => {
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch (e) {}
  };
  if (!document.startViewTransition || reduce) return apply();
  const r = themeBtn.getBoundingClientRect();
  root.style.setProperty("--vt-x", `${r.left + r.width / 2}px`);
  root.style.setProperty("--vt-y", `${r.top + r.height / 2}px`);
  document.startViewTransition(apply);
});

// Línea inferior de la barra al hacer scroll
const bar = document.getElementById("bar");
const onScroll = () => bar.classList.toggle("is-stuck", scrollY > 8);
onScroll();
addEventListener("scroll", onScroll, { passive: true });

// Enlace activo de la barra según la sección visible
const links = [...document.querySelectorAll(".bar__links a")];
const spy = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
    }
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
links.forEach((a) => spy.observe(document.querySelector(a.getAttribute("href"))));

// Nombre: cada línea se estira con el eje de anchura de Anybody hasta ocupar
// exactamente el ancho de la columna, como un bloque de agenda.
const name = document.getElementById("name");
const lines = [...name.querySelectorAll(".name__line")];
function fitName() {
  name.classList.add("is-measuring");
  const width = name.clientWidth;
  lines.forEach((line, i) => {
    line.style.setProperty("--i", i);
    let lo = 50;
    let hi = 150;
    for (let k = 0; k < 12; k++) {
      const mid = (lo + hi) / 2;
      line.style.fontStretch = `${mid}%`;
      if (line.offsetWidth > width) hi = mid;
      else lo = mid;
    }
    line.style.fontStretch = "";
    line.style.setProperty("--w", `${lo}%`);
  });
  name.offsetWidth; // aplica el estado medido antes de volver a activar la transición
  name.classList.remove("is-measuring");
}

// Agenda: los próximos cinco días laborables, de 9:00 a 19:00
const cal = document.getElementById("cal");
const offer = document.getElementById("offer");
const offerWhen = document.getElementById("offer-when");
const offerSend = document.getElementById("offer-send");
const offerNote = offer.querySelector(".offer__note");
const FIRST = 9;
const HOURS = 10;
const fmtDow = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const fmtLong = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });
const isWeekday = (d) => d.getDay() % 6 !== 0;
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const day = new Date(today);
if (now.getHours() >= FIRST + HOURS) day.setDate(day.getDate() + 1);
const days = [];
while (days.length < 5) {
  if (isWeekday(day)) days.push(new Date(day));
  day.setDate(day.getDate() + 1);
}

cal.setAttribute("role", "group");
cal.setAttribute("aria-label", "Huecos para proponer una entrevista");
cal.append(el("div"));
days.forEach((d, c) => {
  const head = el("div", "cal__day");
  head.style.setProperty("--c", c);
  if (+d === +today) head.classList.add("is-today");
  head.append(el("span", "cal__dow", fmtDow.format(d).replace(".", "")), el("span", "cal__num", d.getDate()));
  cal.append(head);
});
const hours = el("div", "cal__hours");
hours.setAttribute("aria-hidden", "true");
for (let h = 0; h < HOURS; h++) hours.append(el("span", null, `${String(FIRST + h).padStart(2, "0")}:00`));
cal.append(hours);

let nowLine = null;
days.forEach((d, c) => {
  const col = el("div", "cal__col");
  const dateText = fmtLong.format(d).replace(",", "");
  for (let h = 0; h < HOURS; h++) {
    const time = `${String(FIRST + h).padStart(2, "0")}:00`;
    const slot = el("button", "slot");
    slot.type = "button";
    slot.style.setProperty("--r", h);
    slot.style.setProperty("--c", c);
    slot.dataset.when = `${dateText} a las ${time}`;
    slot.setAttribute("aria-label", `Proponer entrevista el ${slot.dataset.when}`);
    slot.setAttribute("aria-pressed", "false");
    const start = new Date(d);
    start.setHours(FIRST + h);
    if (start < now) slot.disabled = true;
    slot.append(el("span", "slot__t", time));
    col.append(slot);
  }
  if (+d === +today) {
    nowLine = el("span", "cal__now");
    col.append(nowLine);
  }
  cal.append(col);
});

function placeNow() {
  if (!nowLine) return;
  const t = new Date();
  const pos = (t.getHours() + t.getMinutes() / 60 - FIRST) / HOURS;
  nowLine.hidden = pos < 0 || pos > 1;
  nowLine.style.setProperty("--now-top", `${pos * 100}%`);
}
placeNow();
setInterval(placeNow, 60_000);

// Propuesta: tú eliges el hueco, yo preparo el email y tú lo envías
let picked = null;
offer.inert = true;
const enc = encodeURIComponent;
cal.addEventListener("click", (e) => {
  const slot = e.target.closest(".slot");
  if (!slot || slot.disabled) return;
  if (picked) {
    picked.classList.remove("is-picked");
    picked.setAttribute("aria-pressed", "false");
  }
  picked = slot;
  slot.classList.add("is-picked");
  slot.setAttribute("aria-pressed", "true");
  const when = slot.dataset.when;
  offerWhen.textContent = `Entrevista el ${when}`;
  offerNote.textContent = "Se abrirá tu correo con el mensaje escrito. Yo te respondo para confirmarla.";
  offerSend.href =
    `mailto:${EMAIL}?subject=${enc(`Entrevista: ${when}`)}` +
    `&body=${enc(`Hola, Nicolás:\n\nHe visto tu portfolio y me gustaría proponerte una entrevista el ${when}.\n\nUn saludo,\n`)}`;
  offer.classList.add("is-open");
  offer.inert = false;
});
offerSend.addEventListener("click", () => {
  offerNote.textContent = "Propuesta preparada en tu correo. Cuando la envíes, te respondo para confirmarla.";
});
document.getElementById("offer-reset").addEventListener("click", () => {
  offer.classList.remove("is-open");
  offer.inert = true;
  if (!picked) return;
  picked.classList.remove("is-picked");
  picked.setAttribute("aria-pressed", "false");
  picked.focus();
  picked = null;
});

// Historia de AgendIA: manda el paso más cercano al centro de la pantalla
const story = document.getElementById("story");
const steps = [...story.querySelectorAll(".step")];
const shots = [...story.querySelectorAll(".stage__shot")];
story.classList.add("is-live");
let step = -1;
function syncStory() {
  const mid = innerHeight / 2;
  let best = 0;
  let dist = Infinity;
  steps.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const d = Math.abs((r.top + r.bottom) / 2 - mid);
    if (d < dist) {
      dist = d;
      best = i;
    }
  });
  if (best === step) return;
  step = best;
  steps.forEach((el, k) => el.classList.toggle("is-active", k === best));
  shots.forEach((el, k) => el.classList.toggle("is-on", k === best));
}
syncStory();
addEventListener("scroll", syncStory, { passive: true });

// Animaciones de scroll: si el navegador no las lleva por CSS, se escribe --p
// (0 a 1) en cada elemento y el CSS lo convierte en tiempo de animación.
const native = CSS.supports("animation-timeline: view()");
root.classList.toggle("sd-native", native);
if (!native && !reduce) {
  const ins = [...document.querySelectorAll(".sd-in")];
  const tops = [...document.querySelectorAll(".sd-top")];
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const update = () => {
    const vh = innerHeight;
    for (const el of ins) {
      const r = el.getBoundingClientRect();
      // 0 cuando el borde superior entra por abajo; 1 al 35 % del recorrido, como en el CSS
      el.style.setProperty("--p", clamp((vh - r.top) / (vh + r.height) / 0.35));
    }
    const top = clamp(scrollY / (vh * 0.45));
    for (const el of tops) el.style.setProperty("--p", top);
  };
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();
}

// Trayectoria: línea de hoy sobre el Gantt (septiembre de 2024 a diciembre de 2026)
const gantt = document.getElementById("gantt");
const monthsIn = (now.getFullYear() - 2024) * 12 + now.getMonth() - 8;
const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
const m = monthsIn + (now.getDate() - 1) / dim;
if (m >= 0 && m <= 28) {
  gantt.style.setProperty("--today", `${(m / 28) * 100}%`);
  gantt.classList.add("has-now");
}

document.getElementById("year").textContent = now.getFullYear();

// Arranque: cuando las fuentes están listas se mide el nombre y empieza la secuencia
let started = false;
function start() {
  if (started) return;
  started = true;
  fitName();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-ready")));
  // Cuando el nombre ha terminado de estirarse, el scroll pasa a gobernarlo
  setTimeout(() => root.classList.add("is-settled"), reduce ? 0 : 1700);
  let lastWidth = name.clientWidth;
  new ResizeObserver(() => {
    if (name.clientWidth === lastWidth) return;
    lastWidth = name.clientWidth;
    fitName();
  }).observe(name);
}
document.fonts.ready.then(start);
setTimeout(start, 1500);
