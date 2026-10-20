'use strict';

/* ==========================================================
   ANAVI - script.js
   1. Configuração   2. Catálogo   3. Utilitários   4. Carrinho (store)
   5. Renderização   6. Drawer     7. Router        8. Busca / menu
   9. Checkout (adaptador)         10. SEO e links  11. Inicialização
   ========================================================== */

/* ---------- 1. CONFIGURAÇÃO ---------- */
const CONFIG = {
    whatsapp: '5547996794457',
    freeShippingMin: 99,
    checkoutProvider: 'whatsapp',
    social: {
        instagram: 'https://www.instagram.com/giftsanavi/',
        tiktok: 'https://www.tiktok.com/@giftsanavi'
    }
};

/* ---------- 2. CATÁLOGO ---------- */
const products = [
    {
        id: 'kit-30', units: 30,
        name: 'Kit 30 Ímãs (5x5 cm - Imagem Inteira)',
        tag: 'Mais Vendido 🔥',
        originalPrice: 79.90, price: 49.90,
        image: 'imagenes/kit 2.jpg',
        desc: '30 ímãs no tamanho 5x5cm com foto preenchendo 100% da superfície e brilho protetor.'
    },
    {
        id: 'kit-24', units: 24,
        name: 'Kit 24 Ímãs Família (5x5 cm)',
        tag: 'Tendência ✨',
        originalPrice: 69.90, price: 44.90,
        image: 'imagenes/kit 1.jpg',
        desc: 'Ímãs fotográficos sem bordas laterais, laminação brilhante impermeável.'
    },
    {
        id: 'kit-50', units: 50,
        name: 'Kit 50 Ímãs Super Coleção (5x5 cm)',
        tag: 'Super Oferta',
        originalPrice: 129.90, price: 79.90,
        image: 'imagenes/kit 3.jpg',
        desc: '50 ímãs de imagem inteira para fotos e lembranças inesquecíveis.'
    },
    {
        id: 'kit-20', units: 20,
        name: 'Lembrancinhas Aniversário (Kit 20 Ímãs)',
        tag: 'Lembranças 💖',
        originalPrice: 59.90, price: 39.90,
        image: 'imagenes/kit 4.jpg',
        desc: 'Personalização da foto em ímãs inteiros 5x5 cm para convidados.'
    },
    {
        id: 'kit-12', units: 12,
        name: 'Kit 12 Ímãs Momentos Especiais',
        tag: 'Natal 💖',
        originalPrice: 45.00, price: 29.90,
        image: 'imagenes/kit 6.jpg',
        desc: '12 ímãs 5x5 cm com alta aderência magnética e acabamento impecável.'
    },
    {
        id: 'kit-40', units: 40,
        name: 'Kit 40 Ímãs Lembrança de Casamento',
        tag: 'Casamento 💍',
        originalPrice: 99.90, price: 69.90,
        image: 'imagenes/kit 5.jpg',
        desc: 'Ímãs personalizados em alta definição para marcar datas especiais.'
    },
    {   // Upsell do carrinho: fica fora do catálogo (hidden)
        id: 'upsell-10', units: 10, hidden: true,
        name: 'Kit 10 Ímãs Extras (5x5 cm)',
        tag: '',
        originalPrice: 35.00, price: 25.00,
        image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=150&q=80',
        desc: '10 ímãs extras 5x5 cm para completar o seu pedido.'
    }
];

/* ---------- 3. UTILITÁRIOS ---------- */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const esc = value => String(value).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const findProduct     = id => products.find(p => p.id === id);
const visibleProducts = () => products.filter(p => !p.hidden);
const waUrl = text => `https://wa.me/${CONFIG.whatsapp}` + (text ? `?text=${encodeURIComponent(text)}` : '');

const bestValueId = visibleProducts()
    .reduce((a, b) => (a.price / a.units <= b.price / b.units ? a : b)).id;

function announce(msg) {
    const live = $('#liveStatus');
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = msg; });
}

/* ---------- 4. CARRINHO (store) ---------- */
const CART_KEY = 'anavi:cart:v1';

const Cart = (() => {
    let lines = [];
    try {
        const saved = JSON.parse(localStorage.getItem(CART_KEY));
        if (Array.isArray(saved)) lines = saved.filter(l => findProduct(l.id) && l.qty > 0);
    } catch { /* sem storage disponível: segue em memória */ }

    const subscribers = new Set();
    const save = () => {
        try { localStorage.setItem(CART_KEY, JSON.stringify(lines)); } catch { /* ignora */ }
        subscribers.forEach(fn => fn());
    };

    return {
        // guardamos só id + qty; nome e preço vêm sempre do catálogo
        items:    () => lines.map(l => ({ ...findProduct(l.id), qty: l.qty })),
        count:    () => lines.reduce((s, l) => s + l.qty, 0),
        subtotal: () => lines.reduce((s, l) => s + findProduct(l.id).price * l.qty, 0),
        has:      id => lines.some(l => l.id === id),
        add(id) {
            const line = lines.find(l => l.id === id);
            line ? line.qty++ : lines.push({ id, qty: 1 });
            save();
        },
        change(id, delta) {
            const line = lines.find(l => l.id === id);
            if (!line) return;
            line.qty += delta;
            lines = lines.filter(l => l.qty > 0);
            save();
        },
        remove(id) { lines = lines.filter(l => l.id !== id); save(); },
        subscribe(fn) { subscribers.add(fn); fn(); }
    };
})();

/* ---------- 5. RENDERIZAÇÃO ---------- */
const state = { query: '' };

function productCard(p) {
    const perUnit = BRL.format(p.price / p.units);
    const best = p.id === bestValueId
        ? '<span class="absolute bottom-2 left-2 bg-white text-anavi-cta text-xs font-bold px-2.5 py-1 rounded-full shadow z-10">Melhor custo por ímã</span>'
        : '';
    return `
        <article class="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300 flex flex-col justify-between p-3">
            <div>
                <div class="relative h-52 w-full magnet-realistic mb-3">
                    <img src="${esc(p.image)}" alt="${esc(p.name)}" width="500" height="500" loading="lazy" decoding="async" class="w-full h-full object-cover">
                    <span class="absolute top-2 left-2 bg-anavi-cta text-white text-xs font-bold px-2.5 py-1 rounded-full shadow z-10">${esc(p.tag)}</span>
                    ${best}
                </div>
                <div class="px-2">
                    <h3 class="font-bold text-gray-800 text-base mb-1">${esc(p.name)}</h3>
                    <p class="text-xs text-gray-600 mb-3">${esc(p.desc)}</p>
                </div>
            </div>
            <div class="px-2 pt-2 flex items-center justify-between border-t border-gray-100">
                <div>
                    <span class="text-xs text-gray-500 line-through">${BRL.format(p.originalPrice)}</span>
                    <div class="text-xl font-extrabold text-anavi-dark">${BRL.format(p.price)}</div>
                    <div class="text-xs text-gray-600">${perUnit} por ímã</div>
                </div>
                <button type="button" data-action="add" data-id="${esc(p.id)}" class="bg-anavi-cta hover:bg-white text-white hover:text-anavi-cta border-2 border-anavi-cta font-bold py-2.5 px-3.5 rounded-xl shadow hover:shadow-md transition-all duration-300 text-xs flex items-center gap-1.5">
    <i class="fa-solid fa-cart-plus" aria-hidden="true"></i> <span>Adicionar</span>
</button>
            </div>
        </article>`;
}

function renderGrid(elId, items, emptyHtml = '') {
    const el = document.getElementById(elId);
    if (el) el.innerHTML = items.length ? items.map(productCard).join('') : emptyHtml;
}

function renderCatalog() {
    renderGrid('homeFeaturedGrid', visibleProducts().slice(0, 4));

    const q = norm(state.query.trim());
    const list = q
        ? visibleProducts().filter(p => norm(`${p.name} ${p.desc} ${p.tag}`).includes(q))
        : visibleProducts();

    renderGrid('productsGrid', list, `
        <p class="col-span-full text-center text-gray-600 py-12">
            Nenhum kit encontrado. Tente buscar por "casamento", "festa" ou "família".
        </p>`);

    $('#resultsInfo').textContent = q
        ? `${list.length} ${list.length === 1 ? 'kit encontrado' : 'kits encontrados'} para “${state.query.trim()}”`
        : '';
}

function shippingBar(total) {
    const min = CONFIG.freeShippingMin;
    const missing = Math.max(0, min - total);
    const pct = Math.min(100, (total / min) * 100);
    return `
        <div class="mb-5 p-3 bg-anavi-light/60 rounded-2xl border border-anavi-soft">
            <p class="text-xs font-semibold text-gray-700 mb-2">
                ${missing > 0
                    ? `Faltam <b>${BRL.format(missing)}</b> para ganhar frete grátis`
                    : '🎉 Você ganhou frete grátis!'}
            </p>
            <div class="h-2 bg-white rounded-full overflow-hidden" role="progressbar" aria-label="Progresso para frete grátis"
                 aria-valuemin="0" aria-valuemax="${min}" aria-valuenow="${Math.min(total, min)}">
                <div class="h-full bg-anavi-cta rounded-full transition-[width] duration-500" style="width:${pct}%"></div>
            </div>
        </div>`;
}

function cartLine(item) {
    const lineTotal = BRL.format(item.price * item.qty);
    return `
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <img src="${esc(item.image)}" alt="" width="64" height="64" class="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0">
            <div class="flex-1 min-w-0">
                <h3 class="text-xs font-bold text-gray-800 leading-tight mb-1 line-clamp-2">${esc(item.name)}</h3>
                <div class="text-xs font-extrabold text-anavi-dark mb-2">${BRL.format(item.price)}</div>
                <div class="inline-flex items-center border border-gray-300 bg-white rounded-lg">
                    <button type="button" data-action="qty" data-id="${esc(item.id)}" data-delta="-1" aria-label="Diminuir quantidade de ${esc(item.name)}" class="w-8 h-8 text-gray-700 font-bold hover:text-anavi-cta">−</button>
                    <span class="text-xs font-bold w-6 text-center" aria-label="Quantidade">${item.qty}</span>
                    <button type="button" data-action="qty" data-id="${esc(item.id)}" data-delta="1" aria-label="Aumentar quantidade de ${esc(item.name)}" class="w-8 h-8 text-gray-700 font-bold hover:text-anavi-cta">+</button>
                </div>
            </div>
            <div class="flex flex-col justify-between items-end self-stretch">
                <button type="button" data-action="remove" data-id="${esc(item.id)}" aria-label="Remover ${esc(item.name)}" class="text-gray-500 hover:text-red-600 w-8 h-8 transition">
                    <i class="fa-regular fa-trash-can" aria-hidden="true"></i>
                </button>
                <span class="text-sm font-extrabold text-gray-900">${lineTotal}</span>
            </div>
        </div>`;
}

function upsellCard() {
    const u = findProduct('upsell-10');
    return `
        <div class="mt-5 pt-4 border-t border-gray-100">
            <p class="text-xs font-semibold text-gray-700 mb-2">Complete seu pedido</p>
            <div class="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
                <img src="${esc(u.image)}" alt="" width="48" height="48" class="w-12 h-12 rounded-lg object-cover">
                <div class="flex-1 min-w-0">
                    <h3 class="text-xs font-bold text-gray-800 truncate">${esc(u.name)}</h3>
                    <div class="flex items-center gap-2 text-xs">
                        <span class="line-through text-gray-500">${BRL.format(u.originalPrice)}</span>
                        <span class="font-bold text-anavi-dark">${BRL.format(u.price)}</span>
                    </div>
                </div>
                <button type="button" data-action="add" data-id="${esc(u.id)}" class="px-3 py-2 bg-anavi-cta text-white font-bold text-xs rounded-lg hover:bg-anavi-cta-dark transition">Adicionar</button>
            </div>
        </div>`;
}

function renderCart() {
    const items = Cart.items();
    const total = Cart.subtotal();
    const count = Cart.count();

    $('#cartBadge').textContent = count;
    $('#cartBtn').setAttribute('aria-label', `Abrir carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`);
    $('#cartDrawerSubtotal').textContent = BRL.format(total);
    $('#checkoutBtn').disabled = items.length === 0;

    if (!items.length) {
        $('#cartShipping').innerHTML = '';
        $('#cartUpsell').innerHTML = '';
        $('#cartDrawerItems').innerHTML = `
            <div class="text-center py-12 text-gray-600 text-sm">
                <i class="fa-solid fa-bag-shopping text-4xl mb-3 text-gray-300" aria-hidden="true"></i>
                <p class="mb-4">Seu carrinho está vazio.</p>
                <a href="#/produtos" data-action="close-cart" class="inline-block bg-anavi-cta hover:bg-anavi-cta-dark text-white font-bold px-5 py-2.5 rounded-xl text-sm">Ver kits de ímãs</a>
            </div>`;
        return;
    }

    $('#cartShipping').innerHTML = shippingBar(total);
    $('#cartDrawerItems').innerHTML = items.map(cartLine).join('');
    $('#cartUpsell').innerHTML = Cart.has('upsell-10') ? '' : upsellCard();
}

/* ---------- 6. DRAWER DO CARRINHO ---------- */
let lastFocus = null;

function setCart(open) {
    const drawer = $('#cartDrawer');
    const overlay = $('#cartOverlay');
    if (open) lastFocus = document.activeElement;

    drawer.classList.toggle('translate-x-full', !open);
    overlay.classList.toggle('opacity-0', !open);
    overlay.classList.toggle('pointer-events-none', !open);
    drawer.inert = !open;
    $$('[data-bg]').forEach(el => { el.inert = open; });    // "focus trap" sem bibliotecas
    document.body.classList.toggle('overflow-hidden', open);

    if (open) {
        $('button', drawer).focus();
    } else if (lastFocus && lastFocus.isConnected) {
        lastFocus.focus();
    }
}
const isCartOpen = () => !$('#cartDrawer').inert;

function addToCart(id, button) {
    const product = findProduct(id);
    if (!product) return;
    Cart.add(id);
    announce(`${product.name} adicionado ao carrinho`);

    const badge = $('#cartBadge');
    badge.classList.remove('bump');
    void badge.offsetWidth;                                  // reinicia a animação
    badge.classList.add('bump');

    if (button && button.isConnected) {                      // botões do drawer são re-renderizados
        const label = $('span', button);
        if (label) {
            label.textContent = 'Adicionado ✓';
            setTimeout(() => { label.textContent = 'Adicionar'; }, 1200);
        }
    }
}

/* ---------- 7. ROUTER (hash) ---------- */
const ROUTES = {
    '':           { tab: 'inicio',   title: 'ANAVI | Ímãs Personalizados 5x5 cm de Imagem Inteira' },
    '#/':         { tab: 'inicio',   title: 'ANAVI | Ímãs Personalizados 5x5 cm de Imagem Inteira' },
    '#/produtos': { tab: 'produtos', title: 'Kits de Ímãs Personalizados 5x5 cm | ANAVI' },
    '#/sobre':    { tab: 'sobre',    title: 'Sobre Nós | ANAVI' },
    '#/contato':  { tab: 'contato',  title: 'Contato e Atendimento | ANAVI' }
};
let firstRoute = true;

function route() {
    const { tab, title } = ROUTES[location.hash] || ROUTES[''];

    $$('.page-tab').forEach(s => s.classList.toggle('hidden', s.id !== `page-${tab}`));
    $$('a[data-route]').forEach(a => {
        a.dataset.route === tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
    });

    document.title = title;
    setMenu(false);
    window.scrollTo(0, 0);
    if (!firstRoute) $('#main').focus({ preventScroll: true });   // leitores de tela notam a troca de página
    firstRoute = false;
}

/* ---------- 8. BUSCA E MENU MOBILE ---------- */
function setMenu(open) {
    const btn = $('#menuBtn');
    $('#mobileMenu').classList.toggle('hidden', !open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
}

function initSearch() {
    let timer;
    const inputs = $$('.js-search');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            inputs.forEach(o => { if (o !== input) o.value = input.value; });
            clearTimeout(timer);
            timer = setTimeout(() => {
                state.query = input.value;
                renderCatalog();
                if (state.query.trim() && location.hash !== '#/produtos') location.hash = '#/produtos';
            }, 200);
        });
    });
}

/* ---------- 9. CHECKOUT (padrão adaptador) ---------- */
function buildOrder() {
    return {
        id: 'ANV-' + Date.now().toString(36).toUpperCase().slice(-5),
        customer: { name: $('#customerName').value.trim() },
        notes: $('#customerNotes').value.trim(),
        items: Cart.items(),
        subtotal: Cart.subtotal()
    };
}

function whatsappCheckout(order) {
    const parts = [
        `Olá ANAVI! Sou *${order.customer.name}* e quero fechar o pedido *${order.id}*:`,
        '',
        '🛒 *ITENS:*',
        ...order.items.map((it, i) => `${i + 1}. ${it.name} (x${it.qty}) - ${BRL.format(it.price * it.qty)}`),
        '',
        `💰 *SUBTOTAL:* ${BRL.format(order.subtotal)}`
    ];
    if (order.subtotal >= CONFIG.freeShippingMin) parts.push('🚚 Frete grátis aplicado');
    if (order.notes) parts.push(`📝 Observações: ${order.notes}`);
    parts.push('', 'Vou enviar as fotos por aqui para a personalização dos ímãs 5x5 cm. 📲');

    window.open(waUrl(parts.join('\n')), '_blank', 'noopener');
}

// Para adicionar pagamento online: crie a função (que chame sua API/serverless,
// NUNCA coloque tokens secretos aqui) e registre abaixo.
const checkoutProviders = { whatsapp: whatsappCheckout };

function checkout() {
    if (!Cart.count()) return;
    const nameInput = $('#customerName');
    const error = $('#nameError');

    if (!nameInput.value.trim()) {
        error.classList.remove('hidden');
        nameInput.setAttribute('aria-invalid', 'true');
        nameInput.focus();
        return;
    }
    error.classList.add('hidden');
    nameInput.removeAttribute('aria-invalid');
    checkoutProviders[CONFIG.checkoutProvider](buildOrder());
}

/* ---------- 10. SEO (JSON-LD) E LINKS DINÂMICOS ---------- */
function injectStructuredData() {
    const sameAs = Object.values(CONFIG.social).filter(Boolean);
    const graph = [
        {
            '@type': 'Store',
            name: 'ANAVI Ímãs Personalizados',
            telephone: `+${CONFIG.whatsapp}`,
            openingHours: 'Mo-Sa 08:00-18:00',
            areaServed: 'BR',
            ...(sameAs.length ? { sameAs } : {})
        },
        ...visibleProducts().map(p => ({
            '@type': 'Product',
            name: p.name,
            description: p.desc,
            image: p.image,
            offers: {
                '@type': 'Offer',
                priceCurrency: 'BRL',
                price: p.price.toFixed(2),
                availability: 'https://schema.org/InStock'
            }
        }))
    ];
    const tag = document.createElement('script');
    tag.type = 'application/ld+json';
    tag.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
    document.head.appendChild(tag);
}

function wireStaticLinks() {
    $$('[data-wa]').forEach(a => { a.href = waUrl(a.dataset.wa); });
    $$('[data-social]').forEach(a => {
        const url = CONFIG.social[a.dataset.social];
        if (url) { a.href = url; a.hidden = false; }
    });
}

/* ---------- 11. INICIALIZAÇÃO ---------- */
document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (el) {
        const { action, id, delta } = el.dataset;
        switch (action) {
            case 'add':        addToCart(id, el); break;
            case 'qty':        Cart.change(id, Number(delta)); break;
            case 'remove':     Cart.remove(id); break;
            case 'open-cart':  setCart(true); break;
            case 'close-cart': setCart(false); break;
            case 'checkout':   checkout(); break;
            case 'menu':       setMenu($('#mobileMenu').classList.contains('hidden')); break;
        }
    }
    // fecha o menu mobile ao escolher uma página
    if (e.target.closest('#mobileMenu a')) setMenu(false);
});

document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (isCartOpen()) setCart(false);
    else setMenu(false);
});
// Carrossel de banners da home
function initBannerCarousel() {
    const root = $('#bannerCarousel');
    if (!root) return;
    const track = $('#bannerTrack');
    const slides = track.children.length;
    const dots = $('#bannerDots');
    let index = 0, timer;

    for (let i = 0; i < slides; i++) {
        const d = document.createElement('button');
        d.type = 'button';
        d.setAttribute('aria-label', `Ir para o banner ${i + 1}`);
        d.className = 'w-2.5 h-2.5 rounded-full bg-white/60 transition-all';
        d.addEventListener('click', () => { go(i); restart(); });
        dots.appendChild(d);
    }

    function go(i) {
        index = (i + slides) % slides;
        track.style.transform = `translateX(-${index * 100}%)`;
        [...dots.children].forEach((d, n) => {
            d.classList.toggle('bg-white', n === index);
            d.classList.toggle('w-6', n === index);
        });
    }
    function restart() {
        clearInterval(timer);
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            timer = setInterval(() => go(index + 1), 5000);
        }
    }

    $('#bannerPrev').addEventListener('click', () => { go(index - 1); restart(); });
    $('#bannerNext').addEventListener('click', () => { go(index + 1); restart(); });
    root.addEventListener('mouseenter', () => clearInterval(timer));
    root.addEventListener('mouseleave', restart);

    // Deslizar con el dedo en el celular
    let startX = null;
    root.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', e => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); restart(); }
        startX = null;
    });

    go(0);
    restart();
}
window.addEventListener('hashchange', route);

document.addEventListener('DOMContentLoaded', () => {
    renderCatalog();
    Cart.subscribe(renderCart);
    initSearch();
    wireStaticLinks();
    injectStructuredData();
    initBannerCarousel();   // <- nueva línea
    route();
});