// ====== УТИЛИТЫ/DOM ===========================================================
const $ = (sel, root = document) => root.querySelector(sel);
const listView = $('#listView');
const detailView = $('#detailView');
const cardsRoot = $('#cards');
const detailImg = $('#detailImg');
const detailTitle = $('#detailTitle');
const detailShort = $('#detailShort');
const detailBullets = $('#detailBullets');
const detailLong = $('#detailLong');
const usernameSlot = $('#usernameSlot');
const unifiedNavBtn = document.getElementById('unifiedNavBtn');
const consultBtn = $('#consultBtn');
const buyBtn = $('#buyBtn');
const cartBtn = $('#cartBtn');
const cartCount = $('#cartCount');
const toastEl = $('#toast');
const consultModal = $('#consultModal');
const consultForm = $('#consultForm');
const consultCancel = $('#consultCancel');
const consultProductTitle = $('#consultProductTitle');
const cName = $('#cName');
const cContact = $('#cContact');
const cMsg = $('#cMsg');
const tg = window.Telegram?.WebApp;
const inTelegram = Boolean(tg && typeof tg.initData !== 'undefined');
const requestModal = $('#requestModal');
const requestForm = $('#requestForm');
const requestCancel = $('#requestCancel');
const requestProductTitle = $('#requestProductTitle');
const rPhone = $('#rPhone');
const rName = $('#rName');
const rUseUsername = $('#rUseUsername');
const rUsernamePreview = $('#rUsernamePreview');
const rCity = $('#rCity');
const rComment = $('#rComment');
const consultBtnMain = $('#consultBtnMain');

const galleryModal = document.getElementById('galleryModal');
const galleryImg   = document.getElementById('galleryImg');
const galleryClose = document.getElementById('galleryClose');
const galleryPrev  = document.getElementById('galleryPrev');
const galleryNext  = document.getElementById('galleryNext');
const CACHE_KEY_PRODUCTS = 'tma.PRODUCTS.v1';
const adminBtn = document.getElementById('adminBtn');
const addCardBtn = document.getElementById('addCardBtn');
const addToCartBtn = $('#addToCartBtn');

adminBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  showAdmin();
});

// Only the header admin button opens the admin panel. Hide the addCardBtn from UI.
addCardBtn?.classList.add('hidden');
function showAdminButton(){ adminBtn?.classList.remove('hidden'); }
function hideAdminButton(){ adminBtn?.classList.add('hidden'); }

document.getElementById('adminBtn')?.classList.add('hidden');
document.getElementById('addCardBtn')?.classList.add('hidden');
document.getElementById('unifiedNavBtn')?.classList.add('hidden');

const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#161b22"/><text x="50%" y="50%" fill="#8b949e" dy=".3em" font-family="Arial" font-size="20" text-anchor="middle">Нет изображения</text></svg>');

function loadProductsCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY_PRODUCTS) || '[]'); } catch { return []; }
}
function saveProductsCache(list) {
  try { localStorage.setItem(CACHE_KEY_PRODUCTS, JSON.stringify(list || [])); } catch {}
}
function normalizeProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.items))     return payload.items;
  if (payload && Array.isArray(payload.data))      return payload.data;
  if (payload && Array.isArray(payload.products))  return payload.products;
  return [];
}

function openGallery(p) {
  const imgs = Array.isArray(p.imgs) ? p.imgs : [];
  if (!imgs.length) return;
  galleryImg.src = detailImg.src;
  galleryModal.classList.remove('hidden');
  if (typeof updateUnifiedNav === 'function') updateUnifiedNav();


  galleryPrev.onclick = async () => { await prevImage(p); galleryImg.src = detailImg.src; };
  galleryNext.onclick = async () => { await nextImage(p); galleryImg.src = detailImg.src; };

  galleryClose.onclick = () => { galleryModal.classList.add('hidden'); if (typeof updateUnifiedNav === 'function') updateUnifiedNav(); };

  // свайп в модалке
  if (!galleryModal._swipeBound) {
    attachSwipe(galleryModal, {
      onLeft: async () => { await nextImage(p); galleryImg.src = detailImg.src; },
      onRight: async () => { await prevImage(p); galleryImg.src = detailImg.src; },
      min: 24
    });
    galleryModal._swipeBound = true;
  }
}

let requestContext = null;
let currentIndex = 0;      
let currentImageIndex = 0;   

// Быстрый helper: безопасно взять первую картинку
function currentImage(p) {
  const arr = Array.isArray(p.imgs) ? p.imgs : [];
  return arr[currentImageIndex] && (arr[currentImageIndex].url || arr[currentImageIndex]);
}

function isPdf(src) {
  return typeof src === 'string' && /\.pdf(\?|#|$)/i.test(src);
}

async function renderPdfFirstPageToDataUrl(url, scale = 1.5) {
  if (!window.pdfjsLib) throw new Error('pdfjs not loaded');
  const pdf = await window.pdfjsLib.getDocument(url).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/png');
}

async function getVisualSrcFor(p) {
  const raw = (p && currentImage(p)) || detailImg?.src || '';
  const src = typeof raw === 'string' ? raw : (raw?.url || raw?.path || '');
  if (!src) return '';
  if (isPdf(src)) {
    try { return await renderPdfFirstPageToDataUrl(src); }
    catch { return ''; }
  }
  return src;
}

async function setDetailVisual(p, withSwipeClass) {
  const visual = await getVisualSrcFor(p);
  if (!visual) return;
  if (withSwipeClass === 'left') {
    detailImg.classList.remove('img-swipe-left','img-swipe-right');
    detailImg.classList.add('img-swipe-left');
  }
  if (withSwipeClass === 'right') {
    detailImg.classList.remove('img-swipe-left','img-swipe-right');
    detailImg.classList.add('img-swipe-right');
  }
  detailImg.addEventListener('transitionend', () => {
    detailImg.classList.remove('img-swipe-left','img-swipe-right');
  }, { once: true });
  detailImg.src = visual;
}

let __lastNetToast = 0;
function toastOncePer30s(msg) {
  const now = Date.now();
  if (now - __lastNetToast > 30_000) { toast(msg); __lastNetToast = now; }
}

// Универсальный свайп-лисенер
function attachSwipe(el, { onLeft, onRight, min = 30 }) {
  if (!el) return;
  let x0 = 0, y0 = 0, dx = 0, dy = 0, active = false;
  el.addEventListener('touchstart', (e) => {
    const t = e.changedTouches[0];
    x0 = t.clientX; y0 = t.clientY; dx = 0; dy = 0; active = true;
  }, { passive: true });
  el.addEventListener('touchmove', (e) => {
    if (!active) return;
    const t = e.changedTouches[0];
    dx = t.clientX - x0; dy = t.clientY - y0;
  }, { passive: true });
  el.addEventListener('touchend', () => {
    if (!active) return;
    active = false;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > min) {
      if (dx < 0 && typeof onLeft === 'function')  onLeft();
      if (dx > 0 && typeof onRight === 'function') onRight();
    }
  }, { passive: true });
}

// Анимация контейнера карточки (вход/выход)
function animateCardEnter(container) {
  container.classList.add('swipe-enter');
  void container.offsetWidth;
  container.classList.add('swipe-enter-active');
  container.addEventListener('transitionend', () => {
    container.classList.remove('swipe-enter','swipe-enter-active');
  }, { once: true });
}
function animateCardLeave(container, cb) {
  container.classList.add('swipe-leave');
  void container.offsetWidth;
  container.classList.add('swipe-leave-active');
  container.addEventListener('transitionend', () => {
    container.classList.remove('swipe-leave','swipe-leave-active');
    if (cb) cb();
  }, { once: true });
}

function closeRequest(){
  requestModal?.classList.add('hidden');
  requestContext = null;
}

function modalShow(el){
  el.classList.remove('hidden');
  requestAnimationFrame(()=> el.classList.add('show'));
  // update unified nav after modal opens
  setTimeout(()=> { try { if (typeof updateUnifiedNav === 'function') updateUnifiedNav(); } catch {} }, 10);
}
function modalHide(el){
  el.classList.remove('show');
  setTimeout(()=> { el.classList.add('hidden'); try { if (typeof updateUnifiedNav === 'function') updateUnifiedNav(); } catch {} }, 200);
}

function openRequest(product){
  requestContext = product || null;

  if (requestProductTitle) {
    requestProductTitle.textContent = product ? product.title : '';
  }

  const tUser = tg?.initDataUnsafe?.user;
  if (tUser && rName && !rName.value.trim()) {
    rName.value = [tUser.first_name, tUser.last_name].filter(Boolean).join(' ');
  }

  if (rPhone) rPhone.value = '';
  if (rCity && !rCity.value) rCity.value = 'Санкт-Петербург';
  if (rComment) rComment.value = '';

  if (requestModal) modalShow(requestModal);
}

requestCancel.addEventListener('click', closeRequest);

requestModal.addEventListener('click', (e)=>{
  if (e.target === requestModal) closeRequest();
});

requestForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name  = rName?.value?.trim()  || '';
  const phone = rPhone?.value?.trim() || '';
  const city  = (window.rCity?.value || '').trim();
  const comment = (window.rComment?.value || '').trim();
  const okName  = name.length >= 2;
  const okPhone = /^[+0-9()\-\s]{6,}$/.test(phone);
  if (!okName || !okPhone) { toast('Заполните имя и корректный телефон'); return; }

  const serviceTitle = requestContext ? requestContext.title : 'Заявка';

  const payload = {
    type: 'lead',
    action: 'send_request_form',
    ts: Date.now(),
    service: serviceTitle,
    name,
    phone,
    city,
    comment,
    include_username: Boolean(tg?.initDataUnsafe?.user?.username),
    username: tg?.initDataUnsafe?.user?.username || null,
    from: tg?.initDataUnsafe?.user || null
  };

  try {
    sendToBot(payload);
    tg?.HapticFeedback?.notificationOccurred?.('success');
    toast('Заявка отправлена');
    closeRequest();
  } catch (err) {
    console.error('[Request Form] sendData error:', err);
    tg?.HapticFeedback?.notificationOccurred?.('error');
    tg?.showAlert?.('Не удалось отправить заявку');
  }

});

// (инициализация Telegram-контекста делается ниже вместе с обработчиком BackButton)

// Глобальная логика кнопки "Назад" — вынесена наружу для стабильности
// Removed goBack function — navigation is handled by unifiedNavBtn handlers.

if (inTelegram) {
  tg.ready();
  tg.expand();
  usernameSlot.textContent = tg.initDataUnsafe.user?.username
    ? `@${tg.initDataUnsafe.user.username}`
    : 'без username';

  // Back button functionality removed — keep unified nav button hidden
  if (unifiedNavBtn) unifiedNavBtn.classList.add('hidden');

  tg.onEvent('themeChanged', applyThemeFromTelegram);
} else {
  if (unifiedNavBtn) unifiedNavBtn.classList.add('hidden');
}


async function sendToBot(payload) {
  const API = window.__API_URL; 
  try {
    console.log('[sendToBot] payload:', payload);

    if (!API) throw new Error('API_URL не задан');

    const res = await fetch(`${API}/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({ ok: false, error: 'empty' }));

    console.log('[sendToBot] response:', data);

    if (!res.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    tg?.HapticFeedback?.notificationOccurred?.('success');
    toast('Заявка отправлена');
  } catch (err) {
    console.error('[sendToBot] error:', err);
    tg?.HapticFeedback?.notificationOccurred?.('error');
    toast('Ошибка отправки: ' + (err.message || 'неизвестно'));
  }
}

function applyThemeFromTelegram() {
  if (!inTelegram) return;
  const tp = tg.themeParams || {};
  const root = document.documentElement;
  const set = (v, val, fb) => root.style.setProperty(v, val || fb);
  set('--bg', tp.bg_color, '#0e1117');
  set('--text', tp.text_color, '#e6edf3');
  set('--hint', tp.hint_color, '#8b949e');
  set('--link', tp.link_color, '#4495ff');
  set('--btn', tp.button_color, '#2ea043');
  set('--btn-text', tp.button_text_color, '#ffffff');
  set('--card', tp.secondary_bg_color, '#161b22');
  set('--sep', tp.section_separator_color, 'rgba(255,255,255,.08)');
}
applyThemeFromTelegram();

// ============ КОРЗИНА ====================
let CART = loadCart();
function updateCartUI(){
  const count = CART.items.length;
  if (count > 0) {
    cartCount.textContent = count > 99 ? '99+' : String(count);
    cartCount.classList.remove('hidden');
    cartBtn.classList.remove('muted');
  } else {
    cartCount.classList.add('hidden');
    cartBtn.classList.add('muted');
  }
}
updateCartUI();

function loadCart(){ try{ const data = sessionStorage.getItem('cart'); return data ? JSON.parse(data) : { items:[] }; }catch(e){ return { items:[] }; } }
function saveCart(){ try{ sessionStorage.setItem('cart', JSON.stringify(CART)); }catch(e){} }
function inCart(id){ return CART.items.findIndex(x => x.id === id) >= 0; }

// ============ ДАННЫЕ ТОВАРОВ ================
const API_BASE = (typeof __API_URL === 'string' && __API_URL) || window.API_BASE || '';
const PRODUCTS_URL = API_BASE ? new URL('/products', API_BASE).toString() : '';
const CREATE_URL   = API_BASE ? new URL('/product',  API_BASE).toString() : '';
let PRODUCTS = [];
const defaultProducts = [
  { id: 'book_alphalife', title: 'ALPHALIFE Sasha Trun', imgs: ['./assets/cards/book1.jpg'], short: 'Книга от художника Sasha Trun — коллекция букв латинского алфавита', price: '10 000₽', link:'', long:['A book...'], bullets:['Фото: 1 основное (обложка книги)'], cta:'Свяжитесь для уточнения заказа' }
];

async function fetchWithRetry(url, opts = {}, retries = 2, delay = 700){
  for (let i = 0; i <= retries; i++){
    try{
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    }catch(e){
      if (i === retries) throw e;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function loadProducts() {
  // 0) показать кэш мгновенно
  const cached = loadProductsCache();
  if (Array.isArray(cached) && cached.length) { PRODUCTS = cached; renderCards?.(); }

  // 1) без бэка – используем дефолт
  if (!API_BASE || !PRODUCTS_URL) {
    if (!PRODUCTS.length && typeof defaultProducts !== 'undefined') {
      PRODUCTS = defaultProducts;
      renderCards?.();
    }
    return;
  }

  // 2) онлайн-обновление
  try {
    const res = await fetchWithRetry(PRODUCTS_URL, { mode: 'cors' }, 2, 700);
    const json = await res.json();
    const list = normalizeProducts(json);
    if (Array.isArray(list) && list.length >= 0) {
      PRODUCTS = list;
      saveProductsCache(PRODUCTS);
      renderCards?.();
    } else {
      console.warn('[loadProducts] payload not list → keep cache');
    }
  } catch (e) {
    console.warn('[loadProducts] network error → keep cache', e);
    toastOncePer30s?.('Нет сети. Показан офлайн-список.');
  }
}

async function saveProductToServer(product){
  try{
    const init_data = window.Telegram?.WebApp?.initData || '';
    const init_data_unsafe = window.Telegram?.WebApp?.initDataUnsafe || null;
    const url = new URL('/products', API_BASE).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Telegram-Init-Data': init_data
      },
      body: JSON.stringify({ init_data, init_data_unsafe, product })
    });
    const j = await res.json().catch(()=>({ok:false}));
    if (!j.ok) alert('Ошибка сохранения: ' + (j.error || (res.status + ' ' + res.statusText)));
    return j;
  }catch(e){ console.error('saveProductToServer error', e); return { ok:false }; }
}

async function deleteProductOnServer(id){
  try{
    const init_data = window.Telegram?.WebApp?.initData || '';
    const init_data_unsafe = window.Telegram?.WebApp?.initDataUnsafe || null;
    const res = await fetch(new URL(`/products/${encodeURIComponent(id)}`, API_BASE).toString(), {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ init_data, init_data_unsafe })
    });
    return await res.json();
  }catch(e){ console.error('deleteProductOnServer error', e); return { ok:false }; }
}

// ============= UI ВСПОМОГАТЕЛЬНЫЕ ===============
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  toastEl.style.opacity = '1';
  setTimeout(()=>{ toastEl.style.opacity='0'; setTimeout(()=>toastEl.classList.add('hidden'),200); },1600);
}

// ============ КАРТОЧКИ =================
function renderCards() {
  cardsRoot.innerHTML = '';
  PRODUCTS.forEach((p, i) => {
    const card = document.createElement('article');
    card.className = 'card rounded-xl overflow-hidden transition hover:scale-[1.01] card-appear';
    card.style.setProperty('--delay', `${i * 60}ms`);

    const link = document.createElement('a');
    link.href = `#/product/${p.id}`;
    link.setAttribute('aria-label', `Подробнее: ${p.title}`);
    link.className = 'block';

    const img = document.createElement('img');
    function firstImg(prod){
      if (!prod) return '';
      const a = Array.isArray(prod.imgs) ? prod.imgs : [];
      if (a.length) {
        const v = a[0];
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object') return v.url || v.path || '';
      }
      if (typeof prod.img === 'string') return prod.img;
      return PLACEHOLDER;
    }
    img.src = firstImg(p);
    img.alt = p.title;
    img.loading = 'lazy';
    img.className = 'w-full img-cover';
    img.onerror = () => {
      if (!p || typeof p.img !== 'string') {
        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="%23161b22"/><text x="50%" y="50%" fill="%238b949e" dy=".3em" font-family="Arial" font-size="20" text-anchor="middle">Нет изображения</text></svg>';
        return;
      }
      if (p.img.endsWith('.png')) {
        const jpg = p.img.replace('.png', '.jpg');
        img.onerror = () => {
          console.warn('Image not found:', p.img, 'and', jpg);
          img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="%23161b22"/><text x="50%" y="50%" fill="%238b949e" dy=".3em" font-family="Arial" font-size="20" text-anchor="middle">Нет изображения</text></svg>';
        };
        img.src = jpg;
      } else {
        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="%23161b22"/><text x="50%" y="50%" fill="%238b949e" dy=".3em" font-family="Arial" font-size="20" text-anchor="middle">Нет изображения</text></svg>';
      }
    };

    link.appendChild(img);

    const body = document.createElement('div');
    body.className = 'p-4 space-y-2';

    const h3 = document.createElement('h3');
    h3.textContent = p.title || '';
    h3.className = 'font-semibold';

    const small = document.createElement('p');
    small.textContent = p.short || '';
    small.className = 'text-sm muted';

    const more = document.createElement('a');
    more.href = `#/product/${p.id}`;
    more.textContent = 'Подробнее';
    more.className = 'link text-sm';

    body.append(h3, small, more);
    if (window.__isAdmin) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Редактировать';
      editBtn.className = 'rounded-lg px-3 py-1 text-xs border ml-2';
      editBtn.style.borderColor = 'var(--sep)';
      editBtn.onclick = (e) => {
        e.preventDefault();
        showAdmin();
        setTimeout(() => openAdminEdit(p.id), 0);
      };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.textContent = 'Удалить';
      delBtn.className = 'rounded-lg px-3 py-1 text-xs border ml-2 text-red-400 hover:text-red-500';
      delBtn.style.borderColor = 'var(--sep)';
      delBtn.onclick = async (e) => {
        e.preventDefault();
        if (!confirm(`Удалить «${p.title}»?`)) return;
        const r = await deleteProductOnServer(p.id);
        if (r?.ok) {
          PRODUCTS = PRODUCTS.filter(x => x.id !== p.id);
          saveProductsCache(PRODUCTS);
          renderCards();
          toast('Удалено');
        } else {
          toast('Ошибка удаления');
        }
      };

      body.append(editBtn, delBtn);
    }

    card.append(link, body);
    cardsRoot.appendChild(card);
  });
    // refresh unified nav state after re-render
    updateUnifiedNav();
}

function switchViews(hideEl, showEl) {
  if (hideEl && !hideEl.classList.contains('hidden')) {
    hideEl.classList.remove('view-enter'); hideEl.classList.add('view-leave');
    setTimeout(() => {
      hideEl.classList.add('hidden'); hideEl.classList.remove('view-leave');
      showEl.classList.remove('hidden'); showEl.classList.add('view-enter');
      setTimeout(() => showEl.classList.remove('view-enter'), 220);
    }, 180);
  } else {
    showEl.classList.remove('hidden'); showEl.classList.add('view-enter');
    setTimeout(() => showEl.classList.remove('view-enter'), 220);
  }
}

// =========== ОТПРАВКА =========================
function prepareSend(product, action, viaMainButton = false) {
  const payload = {
    v: 1,
    type: 'lead',
    action,
    product: { id: product.id, title: product.title },
    selected: product.title, 
    at: new Date().toISOString()
  };

  console.log('[buyBtn] click. payload ->', payload);

  if (!inTelegram) {
    alert('Откройте через Telegram, чтобы отправить заявку.\n\n' + JSON.stringify(payload, null, 2));
    return;
  }

  try {
    sendToBot(payload);
  } catch (err) {
    console.error('[sendData] error:', err);
    tg?.HapticFeedback?.notificationOccurred?.('error');
    toast('Ошибка отправки: ' + (err?.message || 'неизвестно'));
  }
}

// Корзина
function addToCart(product){
  if (inCart(product.id)) { toast('Уже в заявке'); return; }
  CART.items.push({ id: product.id, title: product.title });
  saveCart(); toast('Добавлено в заявку'); tg?.HapticFeedback?.notificationOccurred?.('success'); updateCartUI();
}

function sendCart(){
  if (CART.items.length === 0) return;
  const payload = { v:1, type:'lead', action:'send_cart', items:CART.items, at:new Date().toISOString() };
  try {
    sendToBot(payload);
    tg?.HapticFeedback?.notificationOccurred?.('success');
    toast('Заявка отправлена');
  } catch (err) {
    console.error('[Request Form] sendData error:', err);
    tg?.HapticFeedback?.notificationOccurred?.('error');
    tg?.showAlert?.('Не удалось отправить заявку');
  }
  CART = { items:[] }; saveCart(); updateCartUI();
}
cartBtn.addEventListener('click', ()=>{ if (CART.items.length) sendCart(); });

// Консультация
let consultContext = null;
function openConsult(product){
  consultContext = product || null;
  consultProductTitle.textContent = product ? product.title : 'Общая консультация';
  cName.value = ''; cContact.value = ''; cMsg.value = '';
  modalShow(consultModal);
}
function closeConsult(){ modalHide(consultModal); consultContext = null; }

consultCancel.addEventListener('click', closeConsult);
consultModal.addEventListener('click', (e)=>{
  if (e.target === consultModal) closeConsult();
});

if (consultBtnMain) {
  consultBtnMain.addEventListener('click', () => openConsult(null));
}

// Отправка консультации
consultForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const contact = cContact.value.trim();
  if (!contact) { toast('Укажите контакт'); return; }

  const payload = {
    v: 1,
    type: 'lead',
    action: 'consult',
    product: consultContext ? { id: consultContext.id, title: consultContext.title } : null,
    name: cName.value.trim() || null,
    contact,
    message: cMsg.value.trim() || null,
    at: new Date().toISOString()
  };

  try {
    sendToBot(payload);
    tg?.HapticFeedback?.notificationOccurred?.('success');
    toast('Заявка отправлена');
    closeConsult();
  } catch (err) {
    console.error('[Request Form] sendData error:', err);
    tg?.HapticFeedback?.notificationOccurred?.('error');
    tg?.showAlert?.('Не удалось отправить заявку');
  }
  closeConsult();
});

function goNextCard() {
  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) return;
  const next = (currentIndex + 1) % PRODUCTS.length;
  animateCardLeave(detailView, () => {
    location.hash = `#/product/${PRODUCTS[next].id}`;
  });
}

function goPrevCard() {
  if (!Array.isArray(PRODUCTS) || PRODUCTS.length === 0) return;
  const prev = (currentIndex - 1 + PRODUCTS.length) % PRODUCTS.length;
  animateCardLeave(detailView, () => {
    location.hash = `#/product/${PRODUCTS[prev].id}`;
  });
}

// Unified navigation button updater
function updateUnifiedNav() {
  if (!unifiedNavBtn) {
    console.log('[updateUnifiedNav] unifiedNavBtn not found');
    return;
  }
  // make sure button overlays telegram header controls if present
  try { unifiedNavBtn.style.zIndex = '1200'; } catch (e) {}
  console.log('[updateUnifiedNav] called — state:', {
    adminView: !!document.getElementById('adminView'),
    galleryOpen: !!(galleryModal && !galleryModal.classList.contains('hidden')),
    consultOpen: !!(consultModal && !consultModal.classList.contains('hidden')),
    requestOpen: !!(requestModal && !requestModal.classList.contains('hidden')),
    detailVisible: !!(detailView && !detailView.classList.contains('hidden'))
  });

  // admin view open -> show 'Закрыть'
  const adminView = document.getElementById('adminView');
  if (adminView) {
    console.log('[updateUnifiedNav] adminView open — showing Close');
    unifiedNavBtn.classList.remove('hidden');
    unifiedNavBtn.textContent = 'Закрыть';
    unifiedNavBtn.onclick = () => {
      const el = document.getElementById('adminView');
      if (el) el.remove();
      showList();
    };
    return;
  }

  // gallery modal open -> close gallery and stay on product
  if (galleryModal && !galleryModal.classList.contains('hidden')) {
    console.log('[updateUnifiedNav] gallery open — showing К карточке');
    unifiedNavBtn.classList.remove('hidden');
    unifiedNavBtn.textContent = 'К карточке';
    unifiedNavBtn.onclick = () => { galleryModal.classList.add('hidden'); updateUnifiedNav(); };
    return;
  }

  // consult modal open -> close consult
  if (consultModal && !consultModal.classList.contains('hidden')) {
    console.log('[updateUnifiedNav] consult modal open — showing Close');
    unifiedNavBtn.classList.remove('hidden');
    unifiedNavBtn.textContent = 'Закрыть';
    unifiedNavBtn.onclick = () => { closeConsult(); updateUnifiedNav(); };
    return;
  }

  // request modal open -> close request
  if (requestModal && !requestModal.classList.contains('hidden')) {
    console.log('[updateUnifiedNav] request modal open — showing Close');
    unifiedNavBtn.classList.remove('hidden');
    unifiedNavBtn.textContent = 'Закрыть';
    unifiedNavBtn.onclick = () => { closeRequest(); updateUnifiedNav(); };
    return;
  }

  // product detail visible -> show 'К списку'
  if (detailView && !detailView.classList.contains('hidden')) {
    console.log('[updateUnifiedNav] detail view visible — showing К списку');
    unifiedNavBtn.classList.remove('hidden');
    unifiedNavBtn.textContent = 'К списку';
    unifiedNavBtn.onclick = () => { showList(); };
    return;
  }

  // otherwise hide
  console.log('[updateUnifiedNav] no matching state — hiding button');
  unifiedNavBtn.classList.add('hidden');
  unifiedNavBtn.onclick = null;
}

async function nextImage(p) {
  const imgs = Array.isArray(p.imgs) ? p.imgs : [];
  if (!imgs.length) return;
  currentImageIndex = (currentImageIndex + 1) % imgs.length;
  await setDetailVisual(p, 'left');
}

async function prevImage(p) {
  const imgs = Array.isArray(p.imgs) ? p.imgs : [];
  if (!imgs.length) return;
  currentImageIndex = (currentImageIndex - 1 + imgs.length) % imgs.length;
  await setDetailVisual(p, 'right');
}

function showList() {
  // Update unified nav button and show list
  switchViews(detailView, listView);
  updateCartUI();
  updateUnifiedNav();
}

function showDetail(productId){
  const p = PRODUCTS.find(x => x.id === productId);
  currentIndex = Math.max(0, PRODUCTS.findIndex(x => x.id === productId));

  currentImageIndex = 0;

  if (!p) return showList();

  const img = currentImage(p);
  detailImg.alt = p.title;
  setDetailVisual(p);

  const galleryRootId = 'detailGalleryThumbs';
  let galleryRoot = document.getElementById(galleryRootId);
  if (!galleryRoot) {
    galleryRoot = document.createElement('div');
    galleryRoot.id = galleryRootId;
    galleryRoot.className = 'flex gap-2';
    detailImg.parentNode.insertBefore(galleryRoot, detailImg.nextSibling);
  }
  galleryRoot.innerHTML = '';

  (p.imgs || []).forEach((item, idx) => {
    const src = (typeof item === 'string') ? item : (item?.url || item?.path || '');
    if (!src) return;
    const tn = document.createElement('img');
    tn.src = src;
    tn.className = 'w-20 h-12 object-cover rounded cursor-pointer border';
    tn.onclick = async () => {
      currentImageIndex = idx;
      await setDetailVisual(p);
    };
    galleryRoot.appendChild(tn);
  });

  detailTitle.textContent = p.title;
  detailShort.textContent = (p.shortDescription ?? p.short ?? '').toString();

  detailBullets.innerHTML = '';
  const bullets = Array.isArray(p.bullets) ? p.bullets : [];
  if (bullets.length) {
    const ul = document.createElement('ul');
    ul.className = 'list-disc ml-5';
    bullets.forEach(b => {
      const li = document.createElement('li');
      li.textContent = b;
      ul.appendChild(li);
    });
    detailBullets.appendChild(ul);
  }

  detailLong.innerHTML = '';
    const longText = (typeof p.description === 'string' && p.description.trim())
    ? p.description
    : (Array.isArray(p.long) ? p.long.join('\n\n') : '');
  if (longText) {
    longText
      .split(/\n{2,}/)             
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(par => {
        const el = document.createElement('p');
        el.textContent = par;
        el.className = 'mb-2';
        detailLong.appendChild(el);
      });
  }
  // unified nav will be updated after the final switchViews below
  if (consultBtn) consultBtn.onclick = () => openConsult(p);
  buyBtn.textContent = 'Отправить заявку';
  buyBtn.onclick = () => openRequest(p);
  addToCartBtn.onclick = () => addToCart(p);
  // openPdfBtn removed — PDF open feature disabled per request

  animateCardEnter(detailView);
  attachSwipe(detailView, {
    onLeft:  () => goNextCard(),
    onRight: () => goPrevCard(),
    min: 28
  });
  attachSwipe(detailImg, {
    onLeft:  () => nextImage(p),
    onRight: () => prevImage(p),
    min: 24
  });
  detailImg.onclick = () => openGallery(p);
  // final switch to detail view — update unified nav shortly after to reflect new state
  switchViews(listView, detailView);
  setTimeout(()=> updateUnifiedNav(), 10);
}


// ========= РОУТЕР/СТАРТ ================
function getStartParam(){
  const fromInit = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  const sp = new URLSearchParams(location.search);
  return (fromInit || sp.get('tgWebAppStartParam') || sp.get('s') || '').trim();
}
function handleStartParam(raw){
  if (!raw) return;
  const v = String(raw).toLowerCase();
  const alias = { tgbot:'tg-bot', 'tma+chatbot':'tma-chatbot', tma_chatbot:'tma-chatbot' };
  let id = v.startsWith('product:') ? v.split(':')[1] : v; id = alias[id] || id;
  if (['tma','tg-bot','tma-chatbot'].includes(id)) location.hash = `#/product/${id}`;
}

(async function initApp(){
  await loadProducts();
  renderCards();
  cardsRoot.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/product/"]');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('href').replace('#/product/','');
    showDetail(id);
  });
  updateCartUI();
  handleStartParam(getStartParam());
  ensureAdminButton();
  window.addEventListener('hashchange', () => { router(); });
  router();
})();

function router(){
  const hash = location.hash || '#/';
  if (hash === '#/' || hash === '') {
    showList();
  } else if (hash.startsWith('#/product/')) {
    const id = hash.replace('#/product/','');
    showDetail(id);
  } else if (hash === '#/admin') {
    showAdmin();
  } else if (hash === '#/add') {
    showAdmin();
  }
  updateUnifiedNav();
}

// ========== ADMIN: простая админка на клиенте (localStorage) ==========
async function ensureAdminButton(){
  const tg = window.Telegram?.WebApp;
  const init_data = tg?.initData || '';
  const init_data_unsafe = tg?.initDataUnsafe || null;

  const $admin = document.getElementById('adminBtn');
  const $add   = document.getElementById('addCardBtn');

  const show = () => { $admin?.classList.remove('hidden'); };
  const hide = () => { $admin?.classList.add('hidden');  };

  if (!init_data) {
    window.__isAdmin = false;
    hide();
    renderCards();          // ← перерендер без кнопок
    updateUnifiedNav();
    return;
  }

  try {
    const res = await fetch(new URL('/check_admin', API_BASE).toString(), {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ init_data, init_data_unsafe })
    });
    const j = await res.json().catch(() => null);
    window.__isAdmin = Boolean(j && j.ok && j.isAdmin);
    if (window.__isAdmin) show(); else hide();
    renderCards();          // ← перерендер с/без кнопок
    updateUnifiedNav();
  } catch {
    window.__isAdmin = false;
    hide();
    renderCards();          // ← перерендер без кнопок
    updateUnifiedNav();
  }
}

function openAdminEdit(id){
  let p = id ? PRODUCTS.find(x=>x.id===id) : null;
  const root = document.getElementById('adminEditRoot') || document.querySelector('#adminView #adminEditRoot');
  if (!root) return;
  root.innerHTML = '';

  const form = document.createElement('form');
  form.className = 'card p-4 rounded space-y-2';
  form.innerHTML = `
    <label class="block text-sm"><span class="muted">ID (латиница, уникальный)</span>
      <input name="id" required class="w-full mt-1 rounded bg-transparent border px-3 py-2"/></label>

    <label class="block text-sm"><span class="muted">Заголовок</span>
      <input name="title" class="w-full mt-1 rounded bg-transparent border px-3 py-2"/></label>

    <label class="block text-sm"><span class="muted">Короткое описание</span>
      <input name="shortDescription" class="w-full mt-1 rounded bg-transparent border px-3 py-2"/></label>

    <label class="block text-sm"><span class="muted">Полное описание</span>
      <textarea name="description" class="w-full mt-1 rounded bg-transparent border px-3 py-2" rows="5"></textarea></label>

    <div class="block text-sm">
      <span class="muted">Галерея</span>
      <div id="adminGallery" class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3"></div>
    </div>

    <div class="block text-sm">
      <input id="imgUpload" type="file" accept="image/*" multiple class="hidden" />
      <button id="imgPickBtn" type="button" class="btn rounded px-3 py-2">Загрузить</button>
      <span id="imgUploadStatus" class="text-sm muted ml-2"></span>
    </div>

    <div class="flex gap-2 pt-2">
      <button type="submit" class="btn rounded px-3 py-2">Сохранить</button>
      <button type="button" id="adminCancel" class="rounded px-3 py-2 border" style="border-color:var(--sep)">Отмена</button>
    </div>
  `;
  root.appendChild(form);

  // инициализация значений
  const imgs = (p && Array.isArray(p.imgs)) ? p.imgs.slice() : [];
  const idInput = form.querySelector('input[name="id"]');
  const titleInput = form.querySelector('input[name="title"]');
  const shortInput = form.querySelector('input[name="shortDescription"]');
  const descInput = form.querySelector('textarea[name="description"]');

  if (p) {
    if (idInput) idInput.value = p.id;
    if (titleInput) titleInput.value = p.title || '';
    if (shortInput) shortInput.value = p.shortDescription || p.short || '';
    if (descInput) descInput.value = p.description || '';
  }

  // примеры-плейсхолдеры
  if (idInput) idInput.placeholder = 'poster_ultra';
  if (titleInput) titleInput.placeholder = 'Постер «Космос: Туманность Ориона»';
  if (shortInput) shortInput.placeholder = 'Печать на холсте, 50×70 см, быстрая доставка';
  if (descInput) descInput.placeholder = 'Плотный холст 350 г/м², стойкие пигменты. Индивидуальная корректировка по фото.';

  // --- загрузка серии фото: состояние и UI
  const selectedFiles = [];                  // File[]
  const gallery   = root.querySelector('#adminGallery');
  const fileInput = form.querySelector('#imgUpload');
  const pickBtn   = form.querySelector('#imgPickBtn');
  const statusEl  = form.querySelector('#imgUploadStatus');

  function updatePickBtn(){
    pickBtn.textContent = selectedFiles.length ? `Отправить ${selectedFiles.length} фото` : 'Загрузить';
    statusEl.textContent = selectedFiles.length ? 'Фото выбраны, можно отправлять' : '';
  }

  pickBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) fileInput.click();
    else await uploadSelectedFiles();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length) {
      selectedFiles.push(...Array.from(fileInput.files));
      fileInput.value = ''; 
      renderGallery();
      updatePickBtn();
    }
  });

  function renderGallery(){
    gallery.innerHTML = '';

    imgs.forEach((img, idx) => {
      const src = (typeof img === 'string') ? img : (img.url || '');
      const wrap = document.createElement('div');
      wrap.className = 'relative rounded overflow-hidden border';
      wrap.style.borderColor = 'var(--sep)';
      wrap.innerHTML = `
        <img src="${src}" class="w-full h-24 object-cover" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'320\\' height=\\'180\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23161b22\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%238b949e\\' dy=\\'.3em\\' font-family=\\'Arial\\' font-size=\\'14\\' text-anchor=\\'middle\\'>Нет изображения</text></svg>'">
        <button type="button" data-exist="${idx}" class="absolute top-1 right-1 bg-black/60 hover:bg-black text-white text-xs px-2 py-1 rounded">Удалить</button>
      `;

      gallery.appendChild(wrap);

      wrap.querySelector('button').onclick = async () => {
        if (!confirm('Удалить изображение?')) return;
        const imgObj = imgs[idx];
        const init_data = window.Telegram?.WebApp?.initData || '';
        const init_data_unsafe = window.Telegram?.WebApp?.initDataUnsafe || null;
        const body = { init_data, init_data_unsafe, productId: (idInput && idInput.value) || id };
        if (typeof imgObj === 'string') body.path = imgObj;
        else { body.public_id = imgObj.public_id || imgObj.path || null; body.path = imgObj.url || null; }
        try {
          const res = await fetch(new URL('/images', API_BASE).toString(), {
            method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
          });
          const j = await res.json().catch(()=>({ok:false}));
          if (j.ok) { imgs.splice(idx,1); renderGallery(); toast('Изображение удалено'); }
          else toast('Ошибка удаления');
        } catch(e){ console.error('delete image error', e); toast('Ошибка удаления'); }
      };
    });

    selectedFiles.forEach((f, idx) => {
     const wrap = document.createElement('div');
    wrap.className = 'relative rounded overflow-hidden border';
    wrap.style.borderColor = 'var(--sep)';
    wrap.innerHTML = `
      <img class="w-full h-24 object-cover" alt="">
      <button type="button" class="absolute top-1 right-1 bg-black/60 hover:bg-black text-white text-xs px-2 py-1 rounded">Убрать</button>
    `;
    const imgEl = wrap.querySelector('img');
    imgEl.onerror = () => {
      imgEl.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="%23161b22"/><text x="50%" y="50%" fill="%238b949e" dy=".3em" font-family="Arial" font-size="14" text-anchor="middle">Нет изображения</text></svg>';
    };
    const reader = new FileReader();
    reader.onload = () => { imgEl.src = reader.result; };
    reader.readAsDataURL(f);

    gallery.appendChild(wrap);

    wrap.querySelector('button').onclick = () => {
      selectedFiles.splice(idx,1);
      renderGallery();
      updatePickBtn();
    };
    });

    if (imgs.length === 0 && selectedFiles.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'text-sm muted';
      empty.textContent = 'Нет изображений';
      gallery.appendChild(empty);
    }
  }

  async function uploadSelectedFiles(){
    if (selectedFiles.length === 0) return;
    const cardId = (idInput && idInput.value) || id || ('p_' + Date.now());
    statusEl.textContent = 'Загрузка...';
    pickBtn.disabled = true;

    for (const file of selectedFiles) {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('cardId', cardId);

      try {
        const res = await fetch(new URL('/upload-image', API_BASE).toString(), { method:'POST', body: fd });
        const j = await res.json().catch(()=>({ok:false}));
        if (j.ok) {
          const obj = (j.url || j.path) ? { url: j.url || j.path, public_id: j.path } : (j.path || j.url);
          imgs.push(obj);
        } else {
          console.warn('upload failed', j); toast('Не удалось загрузить одно из изображений');
        }
      } catch(e){ console.error('upload error', e); toast('Ошибка сети при загрузке'); }
    }

    selectedFiles.length = 0;
    statusEl.textContent = 'Готово';
    pickBtn.disabled = false;
    updatePickBtn();
    renderGallery();
  }

  renderGallery();
  updatePickBtn();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn?.setAttribute('disabled','disabled');

    const idv = ((idInput && idInput.value) || '').trim();
    const payload = {
      id: idv || ('p_' + Date.now()),
      title: (titleInput && titleInput.value || '').trim(),
      shortDescription: (shortInput && shortInput.value || '').trim(),
      description: (descInput && descInput.value || '').trim(),
      imgs
    };
    const init_data = window.Telegram?.WebApp?.initData || '';

    try {
      const url = new URL('/products', API_BASE).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Init-Data': init_data
        },
        body: JSON.stringify({ init_data, product: payload })
      });
      const j = await res.json().catch(()=> ({}));
      if (!res.ok || j.ok === false) {
        toast('Ошибка сохранения: ' + (j.error || (res.status + ' ' + res.statusText)));
        submitBtn?.removeAttribute('disabled');
        return;
      }

      const created = j.product || j.data || j.item || j.created || j || {};
      const tmpId = 'tmp_' + Date.now();

      const base = {
        id: created.id || payload.id || tmpId,
        title: created.title ?? payload.title ?? '',
        shortDescription: created.shortDescription ?? created.short ?? payload.shortDescription ?? '',
        description: created.description ?? payload.description ?? '',
        imgs: Array.isArray(created.imgs) ? created.imgs
            : Array.isArray(payload.imgs) ? payload.imgs : []
      };

      // оптимистично в список + кэш
      PRODUCTS = [base, ...PRODUCTS.filter(x => x.id !== base.id)];
      saveProductsCache(PRODUCTS);
      renderCards?.();

      // закрыть форму и перейти на карточку
      toast('Сохранено');
      root.innerHTML = '';
      location.hash = `#/product/${base.id}`;

      // фоновая синхронизация: если сервер вернёт «настоящий» id — переоткроем
      loadProducts().then(() => {
        const real = PRODUCTS.find(x =>
          (x.title||'') === (base.title||'') &&
          (x.shortDescription||x.short||'') === (base.shortDescription||base.short||'')
        );
        if (real && real.id && real.id !== base.id) {
          location.hash = `#/product/${real.id}`;
        }
      }).catch(()=>{});
    } catch (e2) {
      console.error('save product error', e2);
      toast('Ошибка сохранения');
    } finally {
      submitBtn?.removeAttribute('disabled');
    }
  });

  root.querySelector('#adminCancel').addEventListener('click', ()=>{ root.innerHTML=''; showList(); updateUnifiedNav(); });
}

function renderAdmin(){
  const exist = document.getElementById('adminView'); 
  if (exist) exist.remove();

  const view = document.createElement('main');
  view.id = 'adminView';
  view.className = 'max-w-5xl mx-auto p-4 fade-in';
  view.innerHTML = `
    <div class="flex items-center gap-3 mb-3">
      <h2 class="text-lg font-semibold">Админка: карточки</h2>
    </div>
    <div id="adminEditRoot"></div>
  `;

  document.body.appendChild(view);
  openAdminEdit(null);
  updateUnifiedNav();
}

function showAdmin(){
  listView.classList.add('hidden'); detailView.classList.add('hidden');
  const exist = document.getElementById('adminView'); if (exist) exist.remove();
  renderAdmin();
  updateUnifiedNav();
}

// router() определён выше; эта версия была дублирована и удалена

function openOrderForm(product) {
  const root = document.getElementById('root');
  root.innerHTML = `
    <div class="p-4 text-white">
      <h2 class="text-2xl font-bold mb-3">${product.title}</h2>
      <p class="mb-3">${product.short || ''}</p>
      <p class="opacity-80 mb-4">${product.desc || ''}</p>
      <button id="confirmOrder" class="bg-green-600 hover:bg-green-700 rounded px-4 py-2">
        Подтвердить заказ
      </button>
    </div>
  `;
  
  document.getElementById('confirmOrder').onclick = () => {
    Telegram.WebApp.sendData(JSON.stringify({
      action: 'order',
      id: product.id,
      title: product.title
    }));
    Telegram.WebApp.close();
  };
}