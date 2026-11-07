/* =========================================================
   Boda Kervens & Clariza — lógica de la invitación
   ========================================================= */

// ---------- CONFIGURACIÓN (editar para cada boda) ----------
const FECHA_BODA = '2027-03-20T16:30:00-04:00';

// Enlaces de los botones. Si uno queda vacío, el botón muestra "disponible muy pronto".
const ENLACES = {
    fotos: 'https://photos.app.goo.gl/6ou2zR5AR3tNfXmc8',   // Álbum compartido de Google Fotos
    asistencia: '',                                         // PENDIENTE: formulario de confirmación
    regalos: ''                                             // PENDIENTE: mesa de regalos
};
const UBICACIONES = {
    // Club Naval para Oficiales (ceremonia y recepción en el mismo lugar)
    ceremony: 'https://maps.app.goo.gl/W7fApKd9apYCf19c6',
    reception: 'https://maps.app.goo.gl/W7fApKd9apYCf19c6'
};

let isPlaying = false;
let pasesMax = 0;

// ---------- Intro: sobre de dos puertas ----------
function setupIntroEnvelope() {
    const overlay = document.getElementById('introOverlay');
    if (!overlay) { enterInvitation(); return; }
    let opened = false;
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    function open() {
        if (opened) return;
        opened = true;
        startMusic();
        enterInvitation();
        overlay.classList.add('is-opening');
        setTimeout(function () {
            document.documentElement.style.overflow = '';
            overlay.remove();
        }, 3200);
    }
    overlay.addEventListener('click', open);
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') open(); });
    overlay.tabIndex = 0;
}

function enterInvitation() {
    document.body.classList.add('invite-enter', 'hero-revealed');
    const mp = document.getElementById('musicPlayer');
    if (mp) mp.style.display = 'block';
}

// ---------- Música ----------
function startMusic() {
    const music = document.getElementById('bgMusic');
    if (!music) return;
    music.volume = 0.85;
    const p = music.play();
    if (p && p.then) p.catch(function () { isPlaying = false; updateMusicIcon(); });
}

function setupMusic() {
    const music = document.getElementById('bgMusic');
    const toggle = document.getElementById('musicToggle');
    updateMusicIcon();
    if (!music) return;
    music.addEventListener('play', function () { isPlaying = true; updateMusicIcon(); });
    music.addEventListener('pause', function () { isPlaying = false; updateMusicIcon(); });
    if (toggle) toggle.addEventListener('click', function () {
        if (music.paused) music.play().catch(function () {}); else music.pause();
    });
    let wasPlaying = false;
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) { wasPlaying = !music.paused; music.pause(); }
        else if (wasPlaying) music.play().catch(function () {});
    });
}

function updateMusicIcon() {
    const icon = document.getElementById('volumeIcon');
    if (!icon) return;
    icon.innerHTML = '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="#fff"></polygon>' + (isPlaying
        ? '<path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08" stroke="#fff" stroke-width="2" fill="none"></path>'
        : '<path d="M22 9l-6 6M16 9l6 6" stroke="#fff" stroke-width="2"></path>');
}

// ---------- Cuenta regresiva ----------
function initializeCountdown() {
    const target = new Date(FECHA_BODA).getTime();
    const ids = ['days', 'hours', 'minutes', 'seconds'];
    function tick() {
        const d = Math.max(0, target - Date.now());
        const vals = [
            Math.floor(d / 86400000),
            Math.floor((d % 86400000) / 3600000),
            Math.floor((d % 3600000) / 60000),
            Math.floor((d % 60000) / 1000)
        ];
        ids.forEach(function (id, i) {
            const el = document.getElementById(id);
            if (el) el.textContent = String(vals[i]).padStart(2, '0');
        });
    }
    tick();
    setInterval(tick, 1000);
}

// ---------- Galería (deslizar, flechas y avance automático) ----------
function initializeGallery() {
    const track = document.getElementById('galTrack');
    if (!track) return;
    const slides = track.children;
    const total = slides.length;
    const actual = document.getElementById('galActual');
    const totalEl = document.getElementById('galTotal');
    if (totalEl) totalEl.textContent = total;

    function index() { return Math.round(track.scrollLeft / track.clientWidth); }
    function go(i) {
        i = (i + total) % total;
        track.scrollTo({ left: i * track.clientWidth });
    }
    let raf;
    track.addEventListener('scroll', function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () { if (actual) actual.textContent = index() + 1; });
    });

    let paused = false, resumeT;
    function pause() { paused = true; clearTimeout(resumeT); resumeT = setTimeout(function () { paused = false; }, 7000); }
    document.querySelector('.gal-prev').addEventListener('click', function () { pause(); go(index() - 1); });
    document.querySelector('.gal-next').addEventListener('click', function () { pause(); go(index() + 1); });
    track.addEventListener('touchstart', pause, { passive: true });
    track.addEventListener('pointerdown', pause);

    let visible = false;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.4 }).observe(track);
    }
    setInterval(function () { if (visible && !paused && !document.hidden) go(index() + 1); }, 3500);
}

// ---------- Invitados / pases desde el enlace ----------
// Formatos: ?invitados=Juan Arias,Yerianny Arias   ·   ?familia=Arias&pases=4   ·   ?pases=2
function initializeGuests() {
    const params = new URLSearchParams(window.location.search);
    const invitados = (params.get('invitados') || '').split(',').map(function (n) { return n.trim(); }).filter(Boolean);
    const familia = (params.get('familia') || '').trim();
    let pases = parseInt(params.get('pases'), 10);
    if (!(pases > 0)) pases = invitados.length || 0;
    if (!pases) return;

    pasesMax = pases;
    document.getElementById('pasesNum').textContent = pases;
    document.getElementById('pasesArco').hidden = false;
    if (pases === 1) document.querySelector('.pases-pie').innerHTML = 'Lugar en su<br>honor';

    const nombres = invitados.length ? invitados.join(' · ') : (familia ? 'Familia ' + familia : '');
    if (nombres) {
        const el = document.getElementById('pasesNombres');
        el.textContent = nombres;
        el.hidden = false;
        const nombreInput = document.getElementById('rNombre');
        if (nombreInput && !nombreInput.value) nombreInput.value = invitados[0] || ('Familia ' + familia);
    }
    const personas = document.getElementById('rPersonas');
    if (personas) {
        personas.max = pases;
        personas.placeholder = '(Máximo ' + pases + (pases === 1 ? ' persona)' : ' personas)');
    }
}

// ---------- Aparición suave al hacer scroll ----------
function setupScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    const items = document.querySelectorAll('.content .sec > *, .content .vestimenta > *, .content .arco > *');
    const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) {
        if (el.classList.contains('arco') || el.classList.contains('vestimenta')) return; // sus hijos se animan
        el.classList.add('reveal');
        io.observe(el);
    });
}

// ---------- Botones ----------
function openLocation(key) {
    const url = UBICACIONES[key];
    if (url) window.open(url, '_blank', 'noopener');
}

function initializeLinks() {
    const avisos = {
        fotos: 'El álbum de fotos estará disponible muy pronto',
        asistencia: 'La confirmación estará disponible muy pronto',
        regalos: 'La mesa de regalos estará disponible muy pronto'
    };
    document.querySelectorAll('[data-enlace]').forEach(function (a) {
        const key = a.dataset.enlace;
        if (ENLACES[key]) { a.href = ENLACES[key]; return; }
        a.addEventListener('click', function (e) { e.preventDefault(); showToast(avisos[key]); });
    });
}

let toastT;
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('show'); }, 3200);
}

document.addEventListener('DOMContentLoaded', function () {
    initializeCountdown();
    initializeGallery();
    initializeGuests();
    initializeLinks();
    setupIntroEnvelope();
    setupMusic();
    setupScrollReveal();
});
