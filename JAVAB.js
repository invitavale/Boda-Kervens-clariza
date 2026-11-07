/* =========================================================
   Boda Kervens & Clariza — lógica de la invitación
   ========================================================= */

// ---------- CONFIGURACIÓN (editar para cada boda) ----------
const FECHA_BODA = '2027-03-20T16:30:00-04:00';

// Enlaces de los botones. Si uno queda vacío, el botón muestra "disponible muy pronto".
const ENLACES = {
    fotos: 'https://photos.app.goo.gl/6ou2zR5AR3tNfXmc8',   // Álbum compartido de Google Fotos
    asistencia: 'https://docs.google.com/forms/d/e/1FAIpQLSc8tCEwaFVjesAfWgGbxIS2rOAi7MF1sNwVJIJTxCsb18ir9g/viewform'   // Google Forms
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
    const carta = document.getElementById('carta');
    const video = document.getElementById('introVideo');
    let opened = false, finished = false;
    document.documentElement.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    // Al terminar el video (termina en luz crema) se desvanece y queda la carta
    function finish() {
        if (finished) return;
        finished = true;
        if (carta) {
            document.body.classList.add('carta-visible');
            escribirCarta(carta);
        } else {
            document.documentElement.style.overflow = '';
        }
        overlay.classList.add('is-done');
        setTimeout(function () { overlay.remove(); }, 950);
    }

    function open() {
        if (opened) return;
        opened = true;
        startMusic();
        showMusicPlayer();
        if (carta) document.body.classList.add('carta-activa');
        else enterInvitation();
        overlay.classList.add('is-opening');
        if (video) {
            video.addEventListener('ended', finish);
            video.addEventListener('timeupdate', function () {
                if (video.duration && video.currentTime >= video.duration - 0.35) finish();
            });
            const p = video.play();
            if (p && p.catch) p.catch(finish);
            setTimeout(finish, 11000); // por si el video no carga
        } else {
            finish();
        }
    }
    overlay.addEventListener('click', open);
    overlay.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') open(); });
    overlay.tabIndex = 0;
}

// Cierra la carta y muestra la invitación
function cerrarCarta() {
    const carta = document.getElementById('carta');
    if (!carta || carta.classList.contains('is-closing')) return;
    carta.classList.add('is-closing');
    enterInvitation();
    setTimeout(function () {
        carta.remove();
        document.body.classList.remove('carta-activa', 'carta-visible');
        document.documentElement.style.overflow = '';
    }, 1000);
}
const CARTA_TIEMPO_LECTURA = 6000; // ms que el mensaje completo queda visible antes de entrar solo

// ---------- Carta: efecto de escritura ----------
function prepararEscritura(el) {
    // Envuelve cada letra en <span class="ch"> (agrupadas por palabra para que no se corten)
    const letras = [];
    (function recorrer(nodo) {
        Array.from(nodo.childNodes).forEach(function (n) {
            if (n.nodeType === 3) {
                const frag = document.createDocumentFragment();
                n.textContent.split(/(\s+)/).forEach(function (trozo) {
                    if (!trozo) return;
                    if (/^\s+$/.test(trozo)) { frag.appendChild(document.createTextNode(trozo)); return; }
                    const pal = document.createElement('span'); pal.className = 'pal';
                    Array.from(trozo).forEach(function (c) {
                        const s = document.createElement('span'); s.className = 'ch'; s.textContent = c;
                        pal.appendChild(s); letras.push(s);
                    });
                    frag.appendChild(pal);
                });
                n.replaceWith(frag);
            } else if (n.nodeType === 1 && n.tagName !== 'BR') recorrer(n);
        });
    })(el);
    return letras;
}

function escribirCarta(carta) {
    if (!carta) return;
    const pasos = Array.from(carta.querySelectorAll('[data-tipo]'));
    const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timers = [];
    let terminado = false;
    let entrada = null;
    function programarEntrada() {
        if (entrada) return;
        entrada = setTimeout(cerrarCarta, CARTA_TIEMPO_LECTURA);
        const btn = document.getElementById('cartaEntrar');
        if (btn) btn.classList.add('on'); // botón discreto para no esperar
        const sc = carta.querySelector('.carta-scroll');
        if (sc && sc.scrollHeight > sc.clientHeight + 2) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
    }
    const btnEntrar = document.getElementById('cartaEntrar');
    if (btnEntrar) btnEntrar.addEventListener('click', function (e) { e.stopPropagation(); clearTimeout(entrada); cerrarCarta(); });

    function mostrarTodo() {
        if (terminado) return;
        terminado = true;
        timers.forEach(clearTimeout);
        carta.querySelectorAll('.ch, [data-tipo]').forEach(function (e) { e.classList.add('on'); });
        const sc = carta.querySelector('.carta-scroll');
        if (sc) sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' });
        programarEntrada();
    }
    if (reducido) { pasos.forEach(function (p) { if (p.dataset.tipo === 'escribir') prepararEscritura(p); }); mostrarTodo(); return; }

    // Si la carta no cabe en la pantalla, se desplaza sola siguiendo lo que se escribe
    const scroller = carta.querySelector('.carta-scroll');
    function seguir(el) {
        if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 2) return;
        const r = el.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
        if (r.bottom > sr.bottom - 20) scroller.scrollBy({ top: r.bottom - sr.bottom + 40, behavior: 'smooth' });
    }
    let t = 0;
    pasos.forEach(function (p) {
        const tipo = p.dataset.tipo;
        timers.push(setTimeout(function () { seguir(p); }, t));
        if (tipo === 'escribir') {
            const vel = parseInt(p.dataset.vel, 10) || 18;
            prepararEscritura(p).forEach(function (s) {
                timers.push(setTimeout(function () { s.classList.add('on'); }, t));
                t += vel;
            });
            t += 450;
        } else {
            timers.push(setTimeout(function () { p.classList.add('on'); }, t));
            t += tipo === 'trazo' ? 2600 : 600;
        }
    });
    timers.push(setTimeout(function () { terminado = true; programarEntrada(); }, t + 600));
    // Tocar la carta mientras se escribe la completa al instante
    carta.addEventListener('click', function (e) {
        if (!terminado) mostrarTodo();
    });
}

function showMusicPlayer() {
    const mp = document.getElementById('musicPlayer');
    if (mp) mp.style.display = 'block';
}

function enterInvitation() {
    document.body.classList.add('invite-enter', 'hero-revealed');
    showMusicPlayer();
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
        asistencia: 'La confirmación estará disponible muy pronto'
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
