/* =========================================================
   Mesa de regalos — Kervens & Clariza
   Los regalos elegidos se guardan en Supabase (proyecto Invitavale).
   Los invitados solo pueden ver qué regalos siguen disponibles y elegir uno;
   los nombres solo se ven desde "Acceso novios" con el PIN.
   ========================================================= */
(function () {
    const SUPABASE_URL = 'https://nsujtmfmyoeibbvwkzez.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_vngm39TRXt50jchjL2_gGQ_kZIl_n_P';
    const EVENTO = 'boda-kervens-clariza';

    const REGALOS = [
        { cat: 'Electrodomésticos', items: [
            { id: 'microondas', t: 'Microondas', d: 'Marca Ninja u Oster' },
            { id: 'freidora', t: 'Freidora de aire', d: 'Marca Ninja u Oster' },
            { id: 'tostadora', t: 'Tostadora', d: 'Marca Ninja u Oster' },
            { id: 'cafetera', t: 'Cafetera eléctrica', d: 'Marca Ninja u Oster' },
            { id: 'licuadora', t: 'Licuadora de alta potencia', d: 'Marca Ninja' },
            { id: 'procesador', t: 'Procesador de alimentos', d: 'Marca Ninja u Oster' },
            { id: 'aire', t: 'Aire acondicionado Inverter', d: 'De bajo consumo energético' },
            { id: 'abanico', t: 'Abanico de pared', d: 'Marca Discovery Universal' }
        ]},
        { cat: 'Cocina y utensilios', items: [
            { id: 'plancha-tabla', t: 'Plancha y tabla de planchar', inc: ['Plancha para ropa', 'Tabla de planchar'] },
            { id: 'olla-cuchillos-cucharones', t: 'Olla de presión, cuchillos y cucharones', inc: ['Olla de presión', 'Juego de cuchillos de cocina', 'Set de cucharones de buena calidad'] },
            { id: 'juego-ollas', t: 'Juego de ollas de 12 piezas', d: 'Marca Ninja, Tramontina o Cuisinart' },
            { id: 'sartenes', t: 'Sartén tipo plancha y set de sartenes', inc: ['Sartén tipo plancha', 'Set de 3 sartenes'], d: 'Ambos de buena calidad' },
            { id: 'especias-cristaleria', t: 'Especieros y cristalería', inc: ['Set de recipientes para especias y condimentos', 'Juego de vasos, tazas, copas y jarras de vidrio'], d: 'De buena calidad' },
            { id: 'hermeticos-fuentes', t: 'Recipientes herméticos y fuentes para hornear', inc: ['Recipientes herméticos grandes para alimentos y carnes', 'Juego de fuentes para hornear'] }
        ]},
        { cat: 'Muebles y organización del hogar', items: [
            { id: 'despensa', t: 'Despensa organizadora de cocina', d: 'Con espacio para microondas, licuadora y tostadora, y compartimientos para almacenar alimentos' }
        ]},
        { cat: 'Iluminación y decoración', items: [
            { id: 'lamparas', t: 'Lámparas de techo y de mesa', inc: ['Juego de lámparas de techo para la sala', 'Juego de lámparas de mesa para la habitación'] }
        ]},
        { cat: 'Dormitorio y baño', items: [
            { id: 'dormitorio-bano', t: 'Juego de dormitorio y baño', inc: ['Juego de sábanas', 'Juego de toallas', 'Juego de cortinas', 'Juego de alfombras para el baño y la habitación'] }
        ]}
    ];
    const TODOS = REGALOS.flatMap(function (c) { return c.items; });
    const POR_ID = {}; TODOS.forEach(function (i) { POR_ID[i.id] = i; });

    let tomados = new Set();
    let mios = new Set();
    try { mios = new Set(JSON.parse(localStorage.getItem('regalos-' + EVENTO) || '[]')); } catch (_) {}
    let sondeo = null;
    let modal, grid, estado, contador;

    function rpc(fn, body) {
        return fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY },
            body: JSON.stringify(body)
        }).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        });
    }

    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

    function guardarMios() { try { localStorage.setItem('regalos-' + EVENTO, JSON.stringify(Array.from(mios))); } catch (_) {} }

    function construir() {
        modal = document.createElement('div');
        modal.className = 'mr-overlay';
        modal.id = 'mesaRegalos';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'mrTitulo');
        modal.hidden = true;
        modal.innerHTML =
            '<div class="mr-panel">' +
                '<header class="mr-cabecera">' +
                    '<div><p class="mr-kicker">Kervens &amp; Clariza</p><h2 class="mr-titulo" id="mrTitulo">Mesa de regalos</h2></div>' +
                    '<button class="mr-cerrar" type="button" aria-label="Cerrar mesa de regalos">' +
                        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>' +
                    '</button>' +
                '</header>' +
                '<div class="mr-cuerpo">' +
                    '<p class="mr-intro">Elige el regalo que deseas obsequiarnos y escribe tu nombre para apartarlo. Cuando alguien elige un regalo, aparece como <em>ya elegido</em> para los demás.</p>' +
                    '<p class="mr-contador" id="mrContador" aria-live="polite"></p>' +
                    '<p class="mr-estado" id="mrEstado" role="status"></p>' +
                    '<div id="mrGrid"></div>' +
                    '<div class="mr-admin">' +
                        '<button class="mr-admin-link" type="button" id="mrAdminBtn">Acceso novios</button>' +
                        '<form class="mr-admin-form" id="mrAdminForm" hidden>' +
                            '<label for="mrPin">PIN de los novios</label>' +
                            '<div class="mr-admin-fila"><input id="mrPin" type="password" autocomplete="off" inputmode="text" maxlength="20"><button type="submit">Ver</button></div>' +
                            '<p class="mr-admin-error" id="mrAdminError" role="alert"></p>' +
                        '</form>' +
                        '<div class="mr-admin-lista" id="mrAdminLista" hidden></div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);
        grid = modal.querySelector('#mrGrid');
        estado = modal.querySelector('#mrEstado');
        contador = modal.querySelector('#mrContador');

        let html = '';
        REGALOS.forEach(function (c) {
            html += '<section class="mr-cat"><h3 class="mr-cat-titulo">' + esc(c.cat) + '</h3><div class="mr-grid">';
            c.items.forEach(function (i) {
                html += '<article class="mr-card" data-id="' + i.id + '">' +
                    '<div class="mr-img"><img src="regalos/' + i.id + '.webp?v=2" alt="" loading="lazy"><span class="mr-sello">Ya fue elegido</span></div>' +
                    '<div class="mr-info">' +
                        (i.inc ? '<p class="mr-junto">Regalo en conjunto · ' + i.inc.length + ' artículos</p>' : '') +
                        '<h4 class="mr-nombre">' + esc(i.t) + '</h4>' +
                        (i.inc ? '<ul class="mr-incluye">' + i.inc.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
                        (i.d ? '<p class="mr-detalle">' + esc(i.d) + '</p>' : '') +
                        '<div class="mr-accion">' +
                            '<button class="mr-elegir" type="button">Elegir este regalo</button>' +
                            '<form class="mr-form" hidden>' +
                                '<label for="mrNom-' + i.id + '">Tu nombre</label>' +
                                '<input id="mrNom-' + i.id + '" type="text" maxlength="60" autocomplete="name" placeholder="Nombre y apellido">' +
                                '<div class="mr-form-botones"><button type="submit" class="mr-confirmar">Confirmar</button><button type="button" class="mr-cancelar">Cancelar</button></div>' +
                                '<p class="mr-form-error" role="alert"></p>' +
                            '</form>' +
                            '<p class="mr-hecho"></p>' +
                        '</div>' +
                    '</div>' +
                '</article>';
            });
            html += '</div></section>';
        });
        grid.innerHTML = html;

        modal.querySelector('.mr-cerrar').addEventListener('click', cerrar);
        modal.addEventListener('click', function (e) { if (e.target === modal) cerrar(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) cerrar(); });

        grid.addEventListener('click', function (e) {
            const card = e.target.closest('.mr-card'); if (!card) return;
            const form = card.querySelector('.mr-form');
            if (e.target.closest('.mr-elegir')) {
                grid.querySelectorAll('.mr-form').forEach(function (f) { if (f !== form) cerrarForm(f.closest('.mr-card')); });
                card.classList.add('abierta'); form.hidden = false; card.querySelector('.mr-elegir').hidden = true;
                const inp = form.querySelector('input');
                try { inp.value = inp.value || localStorage.getItem('regalos-nombre') || ''; } catch (_) {}
                inp.focus();
            } else if (e.target.closest('.mr-cancelar')) {
                cerrarForm(card);
            }
        });
        grid.addEventListener('submit', function (e) {
            e.preventDefault();
            const card = e.target.closest('.mr-card');
            elegir(card);
        });

        modal.querySelector('#mrAdminBtn').addEventListener('click', function () {
            const f = modal.querySelector('#mrAdminForm'); f.hidden = !f.hidden;
            if (!f.hidden) modal.querySelector('#mrPin').focus();
        });
        modal.querySelector('#mrAdminForm').addEventListener('submit', function (e) {
            e.preventDefault(); verNombres();
        });
        initLiberar();
    }

    function cerrarForm(card) {
        card.classList.remove('abierta');
        card.querySelector('.mr-form').hidden = true;
        card.querySelector('.mr-form-error').textContent = '';
        if (!tomados.has(card.dataset.id)) card.querySelector('.mr-elegir').hidden = false;
    }

    function pintar() {
        grid.querySelectorAll('.mr-card').forEach(function (card) {
            const id = card.dataset.id, t = tomados.has(id);
            card.classList.toggle('tomado', t);
            const btn = card.querySelector('.mr-elegir'), hecho = card.querySelector('.mr-hecho');
            if (t) {
                card.classList.remove('abierta');
                card.querySelector('.mr-form').hidden = true;
                btn.hidden = true;
                hecho.textContent = mios.has(id) ? '✓ Lo elegiste tú. ¡Gracias!' : 'Este regalo ya fue elegido';
                card.classList.toggle('mio', mios.has(id));
            } else {
                hecho.textContent = '';
                if (card.querySelector('.mr-form').hidden) btn.hidden = false;
            }
        });
        const libres = TODOS.length - TODOS.filter(function (i) { return tomados.has(i.id); }).length;
        contador.textContent = libres === 0 ? '¡Todos los regalos ya fueron elegidos! Gracias por su cariño.' : libres + ' de ' + TODOS.length + ' regalos disponibles';
    }

    function actualizar() {
        return rpc('regalos_get_claimed', { p_event: EVENTO }).then(function (ids) {
            tomados = new Set(ids || []);
            estado.textContent = '';
            pintar();
        }).catch(function () {
            estado.textContent = 'No pudimos cargar la lista. Revisa tu conexión e inténtalo de nuevo.';
        });
    }

    function elegir(card) {
        const id = card.dataset.id;
        const inp = card.querySelector('.mr-form input');
        const err = card.querySelector('.mr-form-error');
        const btn = card.querySelector('.mr-confirmar');
        const nombre = inp.value.trim().replace(/\s+/g, ' ');
        if (nombre.length < 3) { err.textContent = 'Escribe tu nombre para apartar el regalo.'; inp.focus(); return; }
        btn.disabled = true; btn.textContent = 'Guardando…'; err.textContent = '';
        rpc('regalos_claim', { p_event: EVENTO, p_item_ids: [id], p_name: nombre }).then(function (r) {
            if (r && r.ok && (r.claimed || []).indexOf(id) !== -1) {
                mios.add(id); guardarMios();
                try { localStorage.setItem('regalos-nombre', nombre); } catch (_) {}
                tomados.add(id);
                pintar();
                if (typeof showToast === 'function') showToast('¡Gracias, ' + nombre.split(' ')[0] + '! Tu regalo quedó apartado.');
            } else if (r && r.ok) {
                tomados.add(id); pintar();
                if (typeof showToast === 'function') showToast('Alguien eligió este regalo justo antes. Elige otro, por favor.');
            } else {
                err.textContent = 'No se pudo guardar. Inténtalo de nuevo.';
            }
        }).catch(function () {
            err.textContent = 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
        }).finally(function () {
            btn.disabled = false; btn.textContent = 'Confirmar';
        });
    }

    let pinNovios = '';

    function verNombres(pinGuardado) {
        const pin = pinGuardado || modal.querySelector('#mrPin').value;
        const err = modal.querySelector('#mrAdminError');
        const lista = modal.querySelector('#mrAdminLista');
        if (!pinGuardado) err.textContent = 'Cargando…';
        return rpc('regalos_admin_list', { p_event: EVENTO, p_pin: pin }).then(function (r) {
            if (!r || !r.ok) { err.textContent = 'PIN incorrecto.'; lista.hidden = true; pinNovios = ''; return; }
            pinNovios = pin;
            err.textContent = '';
            const porItem = {}; (r.claims || []).forEach(function (c) { porItem[c.item_id] = c; });
            let html = '<p class="mr-admin-resumen">' + (r.claims || []).length + ' de ' + TODOS.length + ' regalos elegidos</p>' +
                '<p class="mr-admin-ayuda">Toca «Liberar» para que un regalo vuelva a estar disponible.</p><ul>';
            TODOS.forEach(function (i) {
                const c = porItem[i.id];
                const fecha = c ? new Date(c.created_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }) : '';
                html += '<li class="' + (c ? 'si' : 'no') + '" data-id="' + i.id + '"><span class="ad-reg">' + esc(i.t) + '</span>' +
                    (c ? '<span class="ad-der"><span class="ad-nom">' + esc(c.guest_name) + ' <small>' + fecha + '</small></span>' +
                         '<span class="ad-acc"><button type="button" class="ad-liberar">Liberar</button>' +
                         '<span class="ad-confirma" hidden>¿Liberar? <button type="button" class="ad-si">Sí</button><button type="button" class="ad-no">No</button></span></span></span>'
                       : '<span class="ad-nom libre">Disponible</span>') + '</li>';
            });
            lista.innerHTML = html + '</ul>';
            lista.hidden = false;
            modal.querySelector('#mrAdminForm').hidden = true;
        }).catch(function () { err.textContent = 'No se pudo conectar. Inténtalo de nuevo.'; });
    }

    // Liberar un regalo (solo novios, con el PIN ya verificado)
    function initLiberar() {
        const lista = modal.querySelector('#mrAdminLista');
        lista.addEventListener('click', function (e) {
            const li = e.target.closest('li[data-id]'); if (!li) return;
            const btn = li.querySelector('.ad-liberar'), conf = li.querySelector('.ad-confirma');
            if (e.target.closest('.ad-liberar')) { btn.hidden = true; conf.hidden = false; }
            else if (e.target.closest('.ad-no')) { btn.hidden = false; conf.hidden = true; }
            else if (e.target.closest('.ad-si')) {
                const id = li.dataset.id;
                conf.textContent = 'Liberando…';
                rpc('regalos_admin_release', { p_event: EVENTO, p_pin: pinNovios, p_item_id: id }).then(function (r) {
                    if (!r || !r.ok) throw new Error('pin');
                    tomados.delete(id); mios.delete(id); guardarMios();
                    pintar();
                    if (typeof showToast === 'function') showToast('«' + POR_ID[id].t + '» vuelve a estar disponible');
                    return verNombres(pinNovios);
                }).catch(function () {
                    conf.textContent = 'No se pudo liberar. Inténtalo de nuevo.';
                });
            }
        });
    }

    function abrir() {
        if (!modal) construir();
        modal.hidden = false;
        document.documentElement.classList.add('mr-abierto');
        requestAnimationFrame(function () { modal.classList.add('visible'); });
        estado.textContent = tomados.size ? '' : 'Cargando regalos…';
        actualizar();
        clearInterval(sondeo);
        sondeo = setInterval(function () { if (!document.hidden) actualizar(); }, 15000);
        setTimeout(function () { modal.querySelector('.mr-cerrar').focus(); }, 50);
    }

    function cerrar() {
        modal.classList.remove('visible');
        document.documentElement.classList.remove('mr-abierto');
        clearInterval(sondeo);
        setTimeout(function () { modal.hidden = true; }, 350);
    }

    window.abrirMesaRegalos = abrir;
})();
