const root = document.documentElement;
const themeToggle = document.querySelector(".theme-toggle");
const particleCanvas = document.querySelector("#particle-field");
const ctx = particleCanvas.getContext("2d");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const savedTheme = localStorage.getItem("equidade-theme");
if (savedTheme === "light" || savedTheme === "dark") {
  root.dataset.theme = savedTheme;
}

function syncThemeButton() {
  const isLight = root.dataset.theme === "light";
  themeToggle.setAttribute("aria-pressed", String(isLight));
  themeToggle.querySelector(".theme-text").textContent = isLight ? "Claro" : "Escuro";
}

themeToggle.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem("equidade-theme", root.dataset.theme);
  syncThemeButton();
});

syncThemeButton();

document.querySelectorAll("img").forEach((image) => {
  image.addEventListener("error", () => {
    image.classList.add("is-missing");
    image.closest(".photo-card")?.classList.add("is-missing");
  });
});

const revealElements = Array.from(document.querySelectorAll(".reveal"));

revealElements.forEach((element) => {
  const rect = element.getBoundingClientRect();
  element.classList.add(rect.top < window.innerHeight * 0.45 ? "from-above" : "from-below");
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        entry.target.classList.remove("from-above", "from-below");
      } else {
        entry.target.classList.remove("is-visible");
        const isAboveViewport = entry.boundingClientRect.bottom < 0;
        entry.target.classList.toggle("from-above", isAboveViewport);
        entry.target.classList.toggle("from-below", !isAboveViewport);
      }
    });
  },
  { rootMargin: "-8% 0px -8% 0px", threshold: 0.12 }
);

revealElements.forEach((element) => {
  revealObserver.observe(element);
});

const appleShots = Array.from(document.querySelectorAll(".apple-shot"));

let lastScrollY = window.scrollY;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function easeInOut(value) {
  return value * value * (3 - 2 * value);
}

function updateScrollAnimation() {
  const currentScrollY = window.scrollY;
  const scrollDirection = currentScrollY >= lastScrollY ? "down" : "up";
  root.dataset.scrollDirection = scrollDirection;
  lastScrollY = currentScrollY;

  const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = currentScrollY / maxScroll;
  root.style.setProperty("--scroll-progress", progress.toFixed(4));

  if (prefersReducedMotion) return;

  appleShots.forEach((shot) => {
    const rect = shot.getBoundingClientRect();
    const progress = clamp(
      (window.innerHeight - rect.top) / (window.innerHeight + rect.height),
      0,
      1
    );
    const centerDistance = Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
    const focus = clamp(1 - centerDistance / (window.innerHeight * 0.62), 0, 1);

    shot.style.setProperty("--shot-progress", easeInOut(progress).toFixed(3));
    shot.style.setProperty("--shot-focus", easeInOut(focus).toFixed(3));
  });
}

let tickingScroll = false;
function requestScrollUpdate() {
  if (tickingScroll) return;
  tickingScroll = true;
  requestAnimationFrame(() => {
    updateScrollAnimation();
    tickingScroll = false;
  });
}

let width = 0;
let height = 0;
let particles = [];
let pointerX = 0;
let pointerY = 0;

function themeParticleColor() {
  return root.dataset.theme === "light"
    ? "rgba(0, 0, 0, 0.28)"
    : "rgba(255, 255, 255, 0.34)";
}

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  particleCanvas.width = Math.floor(width * pixelRatio);
  particleCanvas.height = Math.floor(height * pixelRatio);
  particleCanvas.style.width = `${width}px`;
  particleCanvas.style.height = `${height}px`;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const total = Math.min(54, Math.max(26, Math.floor((width * height) / 32000)));
  particles = Array.from({ length: total }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.42,
    vy: (Math.random() - 0.5) * 0.42,
    size: Math.random() * 1.8 + 0.6
  }));
}

function drawParticles() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = themeParticleColor();
  ctx.strokeStyle = root.dataset.theme === "light"
    ? "rgba(0, 0, 0, 0.08)"
    : "rgba(255, 255, 255, 0.09)";

  particles.forEach((particle, index) => {
    const dx = particle.x - pointerX;
    const dy = particle.y - pointerY;
    const distance = Math.hypot(dx, dy);

    if (distance < 130) {
      particle.vx += dx * 0.00008;
      particle.vy += dy * 0.00008;
    }

    particle.x += particle.vx;
    particle.y += particle.vy;

    if (particle.x < 0 || particle.x > width) particle.vx *= -1;
    if (particle.y < 0 || particle.y > height) particle.vy *= -1;

    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();

    const connectionLimit = Math.min(particles.length, index + 8);
    for (let nextIndex = index + 1; nextIndex < connectionLimit; nextIndex += 1) {
      const other = particles[nextIndex];
      const lineDistance = Math.hypot(particle.x - other.x, particle.y - other.y);

      if (lineDistance < 118) {
        ctx.globalAlpha = 1 - lineDistance / 118;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(other.x, other.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  });

  requestAnimationFrame(drawParticles);
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", requestScrollUpdate);
window.addEventListener("scroll", requestScrollUpdate, { passive: true });
window.addEventListener("pointermove", (event) => {
  pointerX = event.clientX;
  pointerY = event.clientY;
});

resizeCanvas();
updateScrollAnimation();
if (!prefersReducedMotion) {
  requestAnimationFrame(drawParticles);
}
