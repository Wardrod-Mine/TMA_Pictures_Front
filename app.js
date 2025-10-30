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
const backBtn = $('#backBtn');         
const consultBtn = $('#consultBtn');
const buyBtn = $('#buyBtn');
const cartBtn = $('#cartBtn');
const cartCount = $('#cartCount');
const toastEl = $('#toast');

// Модалка консультации
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

let requestContext = null;

function closeRequest(){
  requestModal?.classList.add('hidden');
  requestContext = null;
}

// Утилиты для плавных модалок
function modalShow(el){
  el.classList.remove('hidden');
  requestAnimationFrame(()=> el.classList.add('show'));
}
function modalHide(el){
  el.classList.remove('show');
  setTimeout(()=> el.classList.add('hidden'), 200);
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

if (inTelegram) {
  tg.ready();
  tg.expand();
  tg.onEvent('themeChanged', applyThemeFromTelegram);

  const username = tg.initDataUnsafe?.user?.username;
  if (username) usernameSlot.textContent = `@${username}`;

  if (tg?.BackButton?.onClick) {
    tg.BackButton.onClick(() => {
      if (location.hash.startsWith('#/product/')) location.hash = '#/';
      else location.hash = '#/'; 
    });
  }
} else {
  usernameSlot.textContent = 'Откройте через Telegram для полного функционала';
}

// Кнопка «Назад» в шапке — доступна и вне Telegram
backBtn.addEventListener('click', () => {
  if (location.hash.startsWith('#/product/')) location.hash = '#/';
  else location.hash = '#/';
});

async function sendToBot(payload) {
  const API = window.__API_URL; // задан в index.html
  try {
    console.log('[sendToBot] payload:', payload);

    if (!API) throw new Error('API_URL не задан');

    const res = await fetch(`${API}/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // credentials не нужны; CORS решим на сервере
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

// ============== СОСТОЯНИЕ КОРЗИНЫ/ЗАЯВКИ ===================
let CART = loadCart();
function loadCart(){ try{ return JSON.parse(sessionStorage.getItem('cart') || '{"items":[]}'); }catch(e){ return {items:[]}; } }
function saveCart(){ sessionStorage.setItem('cart', JSON.stringify(CART)); }
function inCart(id){ return CART.items.some(x => x.id === id); }

// ============ ДАННЫЕ ТОВАРОВ ================
// Продукты грузим с бэкенда; fallback — локальные дефолтные
const API_BASE = window.__API_URL || '';
let PRODUCTS = [];
const defaultProducts = [
  { id: 'book_alphalife', title: 'ALPHALIFE Sasha Trun', imgs: ['./assets/cards/book1.jpg'], short: 'Книга от художника Sasha Trun — коллекция букв латинского алфавита', price: '10 000₽', link:'', long:['A book...'], bullets:['Фото: 1 основное (обложка книги)'], cta:'Свяжитесь для уточнения заказа' }
];

async function loadProducts(){
  try{
    const res = await fetch(new URL('/products', API_BASE).toString());
    const data = await res.json().catch(()=>null);
    if (res.ok && data && Array.isArray(data.products)) { PRODUCTS = data.products; return; }
  }catch(e){ console.warn('loadProducts error', e); }
  PRODUCTS = defaultProducts.slice();
}

async function saveProductToServer(product){
  try{
    const init_data = window.Telegram?.WebApp?.initData || '';
    const res = await fetch(new URL('/products', API_BASE).toString(), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ init_data, product }) });
    const j = await res.json().catch(()=>({ok:false}));
    if (!j.ok) {
      alert('Ошибка сохранения: ' + (j.error || (res.status + ' ' + res.statusText)));
    }
    return j;
  }catch(e){ console.error('saveProductToServer error', e); return { ok:false }; }
}

async function deleteProductOnServer(id){
  try{
    const init_data = window.Telegram?.WebApp?.initData || '';
    const res = await fetch(new URL(`/products/${encodeURIComponent(id)}`, API_BASE).toString(), { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ init_data }) });
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

function updateCartUI(){
  const n = CART.items.length;
  cartCount.textContent = n;
  if (n>0) {
    cartBtn.classList.remove('hidden');
  } else {
    cartBtn.classList.add('hidden');
  }
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
      return './assets/cards/placeholder.jpg';
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

    card.append(link, body);
    cardsRoot.appendChild(card);
  });
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

// Кнопка на главном экране
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
    closeRequest();
  } catch (err) {
    console.error('[Request Form] sendData error:', err);
    tg?.HapticFeedback?.notificationOccurred?.('error');
    tg?.showAlert?.('Не удалось отправить заявку');
  }
  closeConsult();
});

function showDetail(productId){
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return showList();
  const pick = (v) => (typeof v === 'string' ? v : ((v && (v.url || v.path)) || ''));
  const mainSrc = (Array.isArray(p.imgs) && p.imgs.length)
    ? pick(p.imgs[0])
    : (typeof p.img === 'string' ? p.img : '');
  detailImg.src = mainSrc;
  detailImg.alt = p.title;

  const galleryRootId = 'detailGalleryThumbs';
  let galleryRoot = document.getElementById(galleryRootId);
  if (!galleryRoot) {
    galleryRoot = document.createElement('div');
    galleryRoot.id = galleryRootId;
    galleryRoot.className = 'flex gap-2';
    detailImg.parentNode.insertBefore(galleryRoot, detailImg.nextSibling);
  }
  galleryRoot.innerHTML = '';

  (p.imgs || []).forEach((item) => {
    const src = pick(item);
    if (!src) return;
    const tn = document.createElement('img');
    tn.src = src;
    tn.className = 'w-20 h-12 object-cover rounded cursor-pointer border';
    tn.onclick = () => { detailImg.src = src; };
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
  backBtn.classList.remove('hidden');
  if (tg?.BackButton?.show) tg.BackButton.show();
  if (consultBtn) consultBtn.onclick = () => openConsult(p);
  buyBtn.textContent = 'Отправить заявку';
  buyBtn.onclick = () => openRequest(p);

  switchViews(listView, detailView);
}

function showList(){
  backBtn.classList.add('hidden');
  if (tg?.BackButton?.hide) tg.BackButton.hide();
  switchViews(detailView, listView);
  updateCartUI();
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

// Инициализация: сначала загружаем продукты с сервера, затем рендерим
(async function initApp(){
  await loadProducts();
  renderCards();
  updateCartUI();
  handleStartParam(getStartParam());
  ensureAdminButton();
  window.addEventListener('hashchange', router);
  router();
})();

// ========== ADMIN: простая админка на клиенте (localStorage) ==========
const adminBtn = document.getElementById('adminBtn');
async function ensureAdminButton(){
  if (!adminBtn) return;
  adminBtn.classList.add('hidden');
  const addCardBtn = document.getElementById('addCardBtn');
  if (addCardBtn) addCardBtn.classList.add('hidden');

  try {
    const init_data = window.Telegram?.WebApp?.initData || '';
    const init_data_unsafe = window.Telegram?.WebApp?.initDataUnsafe || null;
    const url = new URL('/check_admin', API_BASE);
    url.searchParams.set('init_data', init_data || '');
    url.searchParams.set('unsafe', 'true'); // чтобы работал фолбэк при десктопе
    const res = await fetch(url.toString(), { method: 'GET' });

    const j = await res.json().catch(()=>({ ok:false }));
    const isAdmin = (typeof j.isAdmin !== 'undefined') ? j.isAdmin : !!j.admin;
    console.log('[ensureAdminButton] /check_admin ->', j, 'isAdmin=', isAdmin);
    if (j.ok && isAdmin) {

      adminBtn.classList.remove('hidden');
      adminBtn.onclick = () => { location.hash = '#/admin'; };
      if (addCardBtn) {
        addCardBtn.classList.remove('hidden');
        addCardBtn.onclick = () => { location.hash = '#/admin'; };
      }
    }
  } catch (e) {
    console.warn('check_admin error', e);
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
  if (p) {
    form.id.value = p.id;
    form.title.value = p.title || '';
    form.shortDescription.value = p.shortDescription || p.short || '';
    form.description.value = p.description || '';
  }

  // примеры-плейсхолдеры
  form.id.placeholder = 'poster_ultra';
  form.title.placeholder = 'Постер «Космос: Туманность Ориона»';
  form.shortDescription.placeholder = 'Печать на холсте, 50×70 см, быстрая доставка';
  form.description.placeholder = 'Плотный холст 350 г/м², стойкие пигменты. Индивидуальная корректировка по фото.';

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
      fileInput.value = ''; // чтобы можно было выбирать те же имена повторно
      renderGallery();
      updatePickBtn();
    }
  });

  function renderGallery(){
    gallery.innerHTML = '';

    // 1) уже загруженные у товара
    imgs.forEach((img, idx) => {
      const src = (typeof img === 'string') ? img : (img.url || '');
      const wrap = document.createElement('div');
      wrap.className = 'relative rounded overflow-hidden border';
      wrap.style.borderColor = 'var(--sep)';
      wrap.innerHTML = `
        <img src="${src}" class="w-full h-24 object-cover">
        <button data-exist="${idx}" class="absolute top-1 right-1 bg-black/60 hover:bg-black text-white text-xs px-2 py-1 rounded">Удалить</button>
      `;
      gallery.appendChild(wrap);

      wrap.querySelector('button').onclick = async () => {
        if (!confirm('Удалить изображение?')) return;
        const imgObj = imgs[idx];
        const init_data = window.Telegram?.WebApp?.initData || '';
        const body = { init_data, productId: form.id.value || id };
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

    // 2) локально выбранные (ещё не загруженные)
    selectedFiles.forEach((f, idx) => {
      const url = URL.createObjectURL(f);
      const wrap = document.createElement('div');
      wrap.className = 'relative rounded overflow-hidden border';
      wrap.style.borderColor = 'var(--sep)';
      wrap.innerHTML = `
        <img src="${url}" class="w-full h-24 object-cover">
        <button class="absolute top-1 right-1 bg-black/60 hover:bg-black text-white text-xs px-2 py-1 rounded">Убрать</button>
      `;
      gallery.appendChild(wrap);

      wrap.querySelector('button').onclick = () => {
        selectedFiles.splice(idx,1);
        URL.revokeObjectURL(url);
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
    const cardId = form.id.value || id || ('p_' + Date.now());
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
    const idv = form.id.value.trim();
    const payload = {
      id: idv || ('p_' + Date.now()),
      title: form.title.value.trim(),
      shortDescription: form.shortDescription.value.trim(),
      description: form.description.value.trim(),
      imgs
    };
    const init_data = window.Telegram?.WebApp?.initData || '';
    try{
      const res = await fetch(new URL('/products', API_BASE).toString(), {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ init_data, product: payload })
      });
      const j = await res.json().catch(()=>({ ok:false }));
      if (j.ok) {
        alert('Сохранено');
        await loadProducts(); renderCards(); root.innerHTML = '';
      } else {
        alert('Ошибка сохранения: ' + (j.error || (res.status + ' ' + res.statusText)));
      }
    } catch(e){ console.error('save product error', e); alert('Ошибка сохранения'); }
  });

  root.querySelector('#adminCancel').addEventListener('click', ()=>{ root.innerHTML=''; });
}

// Простая обёртка для экрана админки
function renderAdmin(){
  // Уберём прошлую админ-вёрстку (если была)
  const exist = document.getElementById('adminView'); 
  if (exist) exist.remove();

  const view = document.createElement('main');
  view.id = 'adminView';
  view.className = 'max-w-5xl mx-auto p-4 fade-in';
  view.innerHTML = `
    <h2 class="text-lg font-semibold mb-3">Админка: карточки</h2>
    <div id="adminEditRoot"></div>
  `;
  document.body.appendChild(view);

  // откроем форму создания/редактирования
  openAdminEdit(null);
}

// При навигации в админку
function showAdmin(){
  // скрыть другие views
  listView.classList.add('hidden'); detailView.classList.add('hidden');
  // remove existing adminView if any
  const exist = document.getElementById('adminView'); if (exist) exist.remove();
  renderAdmin();
}

// Обновим роутер чтобы поддержать #/admin
const _oldRouter = router;
function router(){
  const hash = location.hash || '#/';
  if (hash === '#/admin') { showAdmin(); return; }
  if (hash.startsWith('#/product/')) showDetail(hash.replace('#/product/',''));
  else showList();
}

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

try {
  window.removeEventListener('hashchange', _oldRouter);
} catch {}
window.addEventListener('hashchange', router);
