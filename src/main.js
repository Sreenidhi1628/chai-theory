import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import confetti from 'canvas-confetti';

// Register GSAP Plugins
gsap.registerPlugin(ScrollTrigger);

/* ==========================================================================
   1. LENIS SMOOTH SCROLL INITIALIZATION
   ========================================================================== */
const lenis = new Lenis({
  duration: 1.25,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1.0,
  touchMultiplier: 2.0,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

gsap.ticker.lagSmoothing(0);

/* ==========================================================================
   2. CUSTOM RING CURSOR & MAGNETIC MICRO-INTERACTIONS
   ========================================================================== */
const cursorDot = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let ringX = mouseX;
let ringY = mouseY;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // Move dot immediately
  if (cursorDot) {
    cursorDot.style.left = `${mouseX}px`;
    cursorDot.style.top = `${mouseY}px`;
  }
});

// Smooth RAF for cursor ring
function renderCursor() {
  ringX += (mouseX - ringX) * 0.18;
  ringY += (mouseY - ringY) * 0.18;

  if (cursorRing) {
    cursorRing.style.left = `${ringX}px`;
    cursorRing.style.top = `${ringY}px`;
  }

  requestAnimationFrame(renderCursor);
}
renderCursor();

// Magnetic Targets and hover effects
const magneticTargets = document.querySelectorAll('.magnetic-target, a, button');
magneticTargets.forEach((el) => {
  el.addEventListener('mouseenter', () => {
    cursorRing?.classList.add('cursor-hover');
  });

  el.addEventListener('mouseleave', () => {
    cursorRing?.classList.remove('cursor-hover');
    gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'power2.out' });
  });

  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * 0.22;
    const deltaY = (e.clientY - centerY) * 0.22;

    gsap.to(el, {
      x: deltaX,
      y: deltaY,
      duration: 0.2,
      ease: 'power1.out',
    });
  });
});

window.addEventListener('mousedown', () => cursorRing?.classList.add('cursor-active'));
window.addEventListener('mouseup', () => cursorRing?.classList.remove('cursor-active'));

/* ==========================================================================
   3. A. PRELOADER SEQUENCE (<1.5s)
   ========================================================================== */
const preloader = document.getElementById('preloader');
const preloaderBar = document.getElementById('preloaderBar');
const preloaderSpans = document.querySelectorAll('#preloaderTitle span');

function runPreloader() {
  const tl = gsap.timeline({
    onComplete: () => {
      // Transition out
      gsap.to(preloader, {
        yPercent: -100,
        duration: 0.8,
        ease: 'power3.inOut',
        onComplete: () => {
          preloader.style.display = 'none';
          initHeroAnimations();
        },
      });
    },
  });

  // Letter by letter fade in
  tl.to(preloaderSpans, {
    opacity: 1,
    y: 0,
    stagger: 0.04,
    duration: 0.35,
    ease: 'power2.out',
  });

  // Thin saffron progress bar
  tl.to(
    preloaderBar,
    {
      width: '100%',
      duration: 0.7,
      ease: 'power1.inOut',
    },
    '-=0.2'
  );

  // Brief hold before exit
  tl.to({}, { duration: 0.1 });
}

window.addEventListener('DOMContentLoaded', runPreloader);

/* ==========================================================================
   4. B. HERO SECTION ANIMATIONS
   ========================================================================== */
function initHeroAnimations() {
  const chars = document.querySelectorAll('#heroTitle .char');
  const kicker = document.getElementById('heroKicker');
  const tagline = document.getElementById('heroTagline');
  const scrollCue = document.getElementById('heroScrollCue');

  const heroTl = gsap.timeline();

  // Reveal Kicker
  heroTl.fromTo(
    kicker,
    { opacity: 0, y: -20 },
    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
  );

  // SplitText Character Stagger Reveal
  heroTl.to(
    chars,
    {
      opacity: 1,
      y: 0,
      rotate: 0,
      stagger: 0.045,
      duration: 0.9,
      ease: 'back.out(1.4)',
    },
    '-=0.3'
  );

  // Subtext & Credits
  heroTl.fromTo(
    tagline,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' },
    '-=0.5'
  );

  // Scroll cue
  heroTl.fromTo(
    scrollCue,
    { opacity: 0 },
    { opacity: 0.85, duration: 0.5 },
    '-=0.2'
  );

  // Parallax Zoom-out on scroll start
  gsap.to('#heroBg', {
    scale: 1.0,
    yPercent: 12,
    ease: 'none',
    scrollTrigger: {
      trigger: '#hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1,
    },
  });

  // Header background on scroll
  ScrollTrigger.create({
    start: 'top -50',
    onUpdate: (self) => {
      const header = document.getElementById('siteHeader');
      if (self.progress > 0) {
        header?.classList.add('scrolled');
      } else {
        header?.classList.remove('scrolled');
      }
    },
  });
}

/* ==========================================================================
   5. C. "OUR COFFEE" — FILTER COFFEE SHOWCASE
   ========================================================================== */
gsap.from('#coffeeHeading', {
  scrollTrigger: {
    trigger: '#coffee',
    start: 'top 75%',
    toggleActions: 'play none none reverse',
  },
  opacity: 0,
  y: 40,
  duration: 0.9,
  ease: 'power2.out',
});

gsap.from('.stat-pill', {
  scrollTrigger: {
    trigger: '#coffee',
    start: 'top 65%',
    toggleActions: 'play none none reverse',
  },
  opacity: 0,
  y: 30,
  stagger: 0.15,
  duration: 0.7,
  ease: 'power2.out',
});

/* ==========================================================================
   6. BONUS: SPICE ORBIT ROTATION (WITH COUNTER-ROTATION TO KEEP LABELS UPRIGHT)
   ========================================================================== */
const orbitTl = gsap.timeline({
  scrollTrigger: {
    trigger: '#spices',
    start: 'top bottom',
    end: 'bottom top',
    scrub: 1.5,
  },
});

orbitTl.to('#orbitRing', {
  rotation: 360,
  ease: 'none',
}, 0);

// Counter-rotate each label by the negative of the ring's rotation angle so text never flips
orbitTl.to('.orbit-node', {
  rotation: -360,
  ease: 'none',
}, 0);

/* ==========================================================================
   7. D1. "WHAT WE SERVE" — THE EXPLODED THALI (PINNED SCRUB HERO INTERACTION)
   ========================================================================== */
function setupExplodedThali() {
  const thaliVideo = document.getElementById('explodedThaliVideo');
  const progressFill = document.getElementById('thaliProgressFill');
  const progressVal = document.getElementById('thaliProgressVal');

  const labelDosa = document.getElementById('labelDosa');
  const labelSambar = document.getElementById('labelSambar');
  const labelVada = document.getElementById('labelVada');
  const labelChutney = document.getElementById('labelChutney');

  const katoriDosa = document.getElementById('katoriDosa');
  const katoriSambar = document.getElementById('katoriSambar');
  const katoriVada = document.getElementById('katoriVada');
  const katoriChutney = document.getElementById('katoriChutney');

  // Ensure video metadata is loaded or ready
  let videoDuration = 5; // default fallback seconds
  if (thaliVideo) {
    thaliVideo.addEventListener('loadedmetadata', () => {
      if (thaliVideo.duration && !isNaN(thaliVideo.duration)) {
        videoDuration = thaliVideo.duration;
      }
    });
  }

  ScrollTrigger.create({
    trigger: '#thali',
    pin: '#thaliPinContainer',
    start: 'top top',
    end: '+=1800',
    scrub: 0.8,
    onUpdate: (self) => {
      const p = self.progress;

      // 1. Bind video currentTime = progress * duration
      if (thaliVideo && thaliVideo.readyState >= 1) {
        thaliVideo.currentTime = p * (thaliVideo.duration || videoDuration);
      }

      // 2. Fallback Interactive Arena Animation:
      // In exploded state (p near 0), dishes fly outward; as p approaches 1, dishes settle into platter!
      const explodeFactor = (1 - p);
      if (katoriDosa) {
        gsap.set(katoriDosa, {
          x: -explodeFactor * 180,
          y: explodeFactor * 90,
          rotation: -6 + (explodeFactor * -22),
          scale: 0.88 + (p * 0.12),
        });
      }
      if (katoriSambar) {
        gsap.set(katoriSambar, {
          x: -explodeFactor * 140,
          y: -explodeFactor * 140,
          rotation: explodeFactor * 25,
          scale: 0.88 + (p * 0.12),
        });
      }
      if (katoriVada) {
        gsap.set(katoriVada, {
          x: explodeFactor * 140,
          y: -explodeFactor * 130,
          rotation: explodeFactor * -25,
          scale: 0.88 + (p * 0.12),
        });
      }
      if (katoriChutney) {
        gsap.set(katoriChutney, {
          x: 0,
          y: explodeFactor * 160,
          rotation: explodeFactor * 15,
          scale: 0.88 + (p * 0.12),
        });
      }

      // 3. Staggered Pop Labels in Saffron Orange as food items settle
      if (p > 0.3) labelDosa?.classList.add('label-visible');
      else labelDosa?.classList.remove('label-visible');

      if (p > 0.5) labelSambar?.classList.add('label-visible');
      else labelSambar?.classList.remove('label-visible');

      if (p > 0.7) labelVada?.classList.add('label-visible');
      else labelVada?.classList.remove('label-visible');

      if (p > 0.85) labelChutney?.classList.add('label-visible');
      else labelChutney?.classList.remove('label-visible');

      // 4. Update HUD Progress
      const pct = Math.round(p * 100);
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressVal) progressVal.textContent = `${pct}%`;
    },
  });
}
setupExplodedThali();

/* ==========================================================================
   8. D2. THE EXPLODED SCROLL MOMENT (HERO INTERACTION 2: SAMOSA)
   ========================================================================== */
function setupExplodedSamosa() {
  const samosaVideo = document.getElementById('explodedSamosaVideo');
  const progressFill = document.getElementById('samosaProgressFill');
  const progressVal = document.getElementById('samosaProgressVal');

  const labelPastry = document.getElementById('labelPastry');
  const labelCore = document.getElementById('labelCore');
  const labelMintDip = document.getElementById('labelMintDip');
  const samosaHeroImg = document.getElementById('samosaHeroImg');

  let videoDuration = 4;
  if (samosaVideo) {
    samosaVideo.addEventListener('loadedmetadata', () => {
      if (samosaVideo.duration && !isNaN(samosaVideo.duration)) {
        videoDuration = samosaVideo.duration;
      }
    });
  }

  ScrollTrigger.create({
    trigger: '#street-food',
    pin: '#samosaPinContainer',
    start: 'top top',
    end: '+=1600',
    scrub: 0.8,
    onUpdate: (self) => {
      const p = self.progress;

      // Bind video scrub
      if (samosaVideo && samosaVideo.readyState >= 1) {
        samosaVideo.currentTime = p * (samosaVideo.duration || videoDuration);
      }

      // Fallback graphic dynamics
      const explodeFactor = (1 - p);
      if (samosaHeroImg) {
        gsap.set(samosaHeroImg, {
          scale: 0.9 + (p * 0.15),
          rotateZ: (p - 0.5) * 6,
        });
      }

      // Pop labels in Chili Red
      if (p > 0.35) labelPastry?.classList.add('label-visible');
      else labelPastry?.classList.remove('label-visible');

      if (p > 0.6) labelCore?.classList.add('label-visible');
      else labelCore?.classList.remove('label-visible');

      if (p > 0.82) labelMintDip?.classList.add('label-visible');
      else labelMintDip?.classList.remove('label-visible');

      const pct = Math.round(p * 100);
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressVal) progressVal.textContent = `${pct}%`;
    },
  });
}
setupExplodedSamosa();

/* ==========================================================================
   9. E. "OUR SWEETS" — HORIZONTAL SCRUB CARD GALLERY
   ========================================================================== */
gsap.from('#sweetCard1', {
  scrollTrigger: {
    trigger: '#sweetsTrack',
    start: 'top 80%',
    toggleActions: 'play none none reverse',
  },
  opacity: 0,
  x: -60,
  duration: 0.9,
  ease: 'power2.out',
});

gsap.from('#sweetCard2', {
  scrollTrigger: {
    trigger: '#sweetsTrack',
    start: 'top 80%',
    toggleActions: 'play none none reverse',
  },
  opacity: 0,
  x: 60,
  duration: 0.9,
  ease: 'power2.out',
});

/* ==========================================================================
   10. F. "COLD & FUSION DRINKS" — SPLIT HOVER & PARALLAX
   ========================================================================== */
gsap.from('#mangoCard', {
  scrollTrigger: {
    trigger: '#fusion',
    start: 'top 70%',
    toggleActions: 'play none none reverse',
  },
  opacity: 0,
  x: -50,
  duration: 0.8,
  ease: 'power2.out',
});

gsap.from('#matchaCard', {
  scrollTrigger: {
    trigger: '#fusion',
    start: 'top 70%',
    toggleActions: 'play none none reverse',
  },
  opacity: 0,
  x: 50,
  duration: 0.8,
  ease: 'power2.out',
});

/* ==========================================================================
   11. G. INGREDIENT / TEXTURE GALLERY (HORIZONTAL SCROLL)
   ========================================================================== */
function setupHorizontalGallery() {
  const strip = document.getElementById('horizontalStrip');
  if (!strip) return;

  const totalWidth = strip.scrollWidth;
  const viewportWidth = window.innerWidth;
  const scrollDistance = totalWidth - viewportWidth + (viewportWidth * 0.1);

  gsap.to(strip, {
    x: () => -scrollDistance,
    ease: 'none',
    scrollTrigger: {
      trigger: '#gallery',
      pin: '#galleryPinWrapper',
      start: 'top top',
      end: () => `+=${scrollDistance * 1.2}`,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  // Parallax on photos inside cards
  const photos = document.querySelectorAll('.gallery-photo');
  photos.forEach((photo) => {
    gsap.fromTo(
      photo,
      { scale: 1.15, xPercent: -5 },
      {
        scale: 1.0,
        xPercent: 5,
        ease: 'none',
        scrollTrigger: {
          trigger: '#gallery',
          start: 'top top',
          end: () => `+=${scrollDistance * 1.2}`,
          scrub: 1.2,
        },
      }
    );
  });
}
setupHorizontalGallery();

/* ==========================================================================
   12. H. FINALE / CTA & RESERVATION MODAL WITH CONFETTI
   ========================================================================== */
const reserveBtn = document.getElementById('reserveTableBtn');
const headerReserveBtn = document.getElementById('headerReserveBtn');
const reserveModal = document.getElementById('reserveModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const reservationForm = document.getElementById('reservationForm');
const bookingSuccess = document.getElementById('bookingSuccess');

function openModal() {
  reserveModal?.classList.add('modal-open');
  reserveModal?.setAttribute('aria-hidden', 'false');
  lenis.stop(); // Pause smooth scroll while modal open
}

function closeModal() {
  reserveModal?.classList.remove('modal-open');
  reserveModal?.setAttribute('aria-hidden', 'true');
  lenis.start();
  // Reset success view after delay
  setTimeout(() => {
    if (bookingSuccess) bookingSuccess.style.display = 'none';
    if (reservationForm) reservationForm.style.display = 'flex';
  }, 400);
}

reserveBtn?.addEventListener('click', openModal);
headerReserveBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  openModal();
});
modalBackdrop?.addEventListener('click', closeModal);
modalCloseBtn?.addEventListener('click', closeModal);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && reserveModal?.classList.contains('modal-open')) {
    closeModal();
  }
});

// Form submission celebratory confetti
reservationForm?.addEventListener('submit', (e) => {
  e.preventDefault();

  // Trigger Saffron & Chili celebratory confetti
  confetti({
    particleCount: 120,
    spread: 75,
    origin: { y: 0.6 },
    colors: ['#E38A2C', '#C23B22', '#6B3F1D', '#D9A441', '#FAF8F0'],
  });

  // Switch to success card
  reservationForm.style.display = 'none';
  if (bookingSuccess) {
    bookingSuccess.style.display = 'block';
  }
});

/* ==========================================================================
   13. AMBIENT CAFE SOUND GENERATOR (WEB AUDIO API)
   ========================================================================== */
const soundToggle = document.getElementById('soundToggle');
let audioCtx = null;
let isAudioPlaying = false;
let ambientGain = null;

function toggleCafeAtmosphere() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Create warm soft pink noise + gentle harmonics (cafe acoustic resonance)
    const bufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to warm daylight frequencies
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;

    ambientGain = audioCtx.createGain();
    ambientGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    whiteNoise.start();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (!isAudioPlaying) {
    ambientGain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 1.2);
    isAudioPlaying = true;
    if (soundToggle) {
      soundToggle.innerHTML = '<span class="sound-icon">🔊</span><span class="sound-label">PLAYING</span>';
      soundToggle.style.color = 'var(--color-thali)';
      soundToggle.style.borderColor = 'var(--color-thali)';
    }
  } else {
    ambientGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
    isAudioPlaying = false;
    if (soundToggle) {
      soundToggle.innerHTML = '<span class="sound-icon">🔈</span><span class="sound-label">ATMOSPHERE</span>';
      soundToggle.style.color = 'var(--color-charcoal)';
      soundToggle.style.borderColor = 'var(--border-strong)';
    }
  }
}

soundToggle?.addEventListener('click', toggleCafeAtmosphere);

/* ==========================================================================
   14. GRACEFUL VIDEO ERROR & FALLBACK HANDLER
   ========================================================================== */
document.querySelectorAll('video').forEach((vid) => {
  vid.addEventListener('error', () => {
    // Hide video element and let the warm-white placeholder show effortlessly
    vid.style.display = 'none';
    const fallback = vid.parentElement?.querySelector('.warm-white-fallback');
    if (fallback) {
      fallback.style.display = 'flex';
      fallback.style.opacity = '1';
    }
  });

  vid.addEventListener('playing', () => {
    // If video plays successfully, gracefully fade out fallback if needed
    const fallback = vid.parentElement?.querySelector('.warm-white-fallback');
    if (fallback && !fallback.classList.contains('assembly-arena')) {
      gsap.to(fallback, { opacity: 0, duration: 0.4, pointerEvents: 'none' });
    }
  });
});

console.log('🍵 Chai Theory — Built By Sreenidhi initialized.');
