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
  if (tg?.BackButton?.onClick) {
    tg.BackButton.onClick(() => { if (location.hash.startsWith('#/product/')) location.hash = '#/'; })};
  tg.onEvent('themeChanged', applyThemeFromTelegram);
  const username = tg.initDataUnsafe?.user?.username;
  if (username) usernameSlot.textContent = `@${username}`;
  backBtn.addEventListener('click', () => { if (location.hash.startsWith('#/product/')) location.hash = '#/'; });
} else {
  usernameSlot.textContent = 'Откройте через Telegram для полного функционала';
}

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
    return await res.json();
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
  img.src = (p.imgs && p.imgs.length) ? p.imgs[0] : (p.img || './assets/cards/placeholder.jpg');
    img.alt = p.title;
    img.loading = 'lazy';
    img.className = 'w-full img-cover';
    img.onerror = () => { 
    if (p.img.endsWith('.png')) {
      const jpg = p.img.replace('.png', '.jpg');
      img.onerror = () => {
        console.warn('Image not found:', p.img, 'and', jpg);
        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="%23161b22"/><text x="50%" y="50%" fill="%238b949e" dy=".3em" font-family="Arial" font-size="20" text-anchor="middle">Нет изображения</text></svg>';
      };
      img.src = jpg;
      }
    };

    link.appendChild(img);

    const body = document.createElement('div');
    body.className = 'p-4 space-y-2';

    const h3 = document.createElement('h3');
    h3.textContent = p.title;
    h3.className = 'font-semibold';

    const small = document.createElement('p');
    small.textContent = p.short;
    small.className = 'text-sm muted';

    const more = document.createElement('a');
    more.href = `#/product/${p.id}`;
    more.className = 'link text-sm';
    more.textContent = 'Подробнее →';

    // Admin quick actions — handled by admin UI; leave no inline edit for safety

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
    selected: product.title,   // 🆕 сюда пишем, что выбрал клиент
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

// ======= ЭКРАНЫ ===================
function showDetail(productId){
  const p = PRODUCTS.find(x => x.id === productId);
  if (!p) return showList();
  // Gallery: use main image and render thumbnails
  detailImg.src = (p.imgs && p.imgs.length) ? p.imgs[0] : (p.img || ''); detailImg.alt = p.title;
  const galleryRootId = 'detailGalleryThumbs';
  let galleryRoot = document.getElementById(galleryRootId);
  if (!galleryRoot) {
    galleryRoot = document.createElement('div'); galleryRoot.id = galleryRootId; galleryRoot.className='flex gap-2';
    detailImg.parentNode.insertBefore(galleryRoot, detailImg.nextSibling);
  }
  galleryRoot.innerHTML = '';
  (p.imgs||[]).forEach((src, idx) => {
    const tn = document.createElement('img'); tn.src = src; tn.className='w-20 h-12 object-cover rounded cursor-pointer border';
    tn.onclick = () => { detailImg.src = src; };
    galleryRoot.appendChild(tn);
  });
  detailTitle.textContent = p.title; detailShort.textContent = p.short;

  detailBullets.innerHTML = '';
  const ul = document.createElement('ul'); ul.className = 'list-disc ml-5';
  p.bullets.forEach(b => { const li=document.createElement('li'); li.textContent=b; ul.appendChild(li); });
  detailBullets.appendChild(ul);

  detailLong.innerHTML = '';
  (p.long||[]).forEach(par => { const el=document.createElement('p'); el.textContent=par; detailLong.appendChild(el); });

  backBtn.classList.remove('hidden');

  if (consultBtn) consultBtn.onclick = () => openConsult(p);

  buyBtn.textContent = 'Отправить заявку';
  buyBtn.onclick = () => openRequest(p);


  switchViews(listView, detailView);
}

function showList(){
  backBtn.classList.add('hidden');
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
  window.addEventListener('hashchange', router);
  router();
})();

// ========== ADMIN: простая админка на клиенте (localStorage) ==========
const adminBtn = document.getElementById('adminBtn');
function ensureAdminButton(){
  if (!adminBtn) return;
  // проверим у бэкенда, является ли текущий пользователь админом
  adminBtn.classList.add('hidden');
  const addCardBtn = document.getElementById('addCardBtn');
  if (addCardBtn) addCardBtn.classList.add('hidden');
  (async ()=>{
    try{
  const init_data = window.Telegram?.WebApp?.initData || '';
  const init_data_unsafe = window.Telegram?.WebApp?.initDataUnsafe || null;
  const res = await fetch(new URL('/check_admin', API_BASE).toString(), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ init_data, init_data_unsafe }) });
      const j = await res.json().catch(()=>({ ok:false }));
      if (j.ok && j.isAdmin) { 
        adminBtn.classList.remove('hidden'); adminBtn.onclick = () => { location.hash = '#/admin'; };
        if (addCardBtn) { addCardBtn.classList.remove('hidden'); addCardBtn.onclick = () => { location.hash = '#/admin'; } }
      }
    }catch(e){ console.warn('check_admin error', e); }
  })();
}
ensureAdminButton();

async function renderAdmin(){
  // простой админский экран заменяет список
  const adminRoot = document.createElement('main');
  adminRoot.id = 'adminView'; adminRoot.className='max-w-4xl mx-auto p-4';
  adminRoot.innerHTML = `
    <div class="flex items-center gap-3 mb-4"><h2 class="text-lg font-semibold">Админка: карточки</h2>
      <div class="ml-auto"><button id="adminNew" class="btn rounded-lg px-3 py-2">Создать карточку</button></div>
    </div>
    <div id="adminList" class="space-y-3"></div>
    <div id="adminEditRoot" class="mt-4"></div>
  `;
  document.body.appendChild(adminRoot);

  const adminList = adminRoot.querySelector('#adminList');
  // гарантируем актуальность списка
  await loadProducts();
  function redraw(){
    const list = PRODUCTS || [];
    adminList.innerHTML='';
    list.forEach(p => {
      const el = document.createElement('div'); el.className='card p-3 rounded';
      el.innerHTML = `<div class="flex items-center gap-3"><div class="flex-1"><b>${p.title}</b><div class="text-sm muted">${p.short || ''}</div></div>
        <div class="flex gap-2"><button data-id="${p.id}" class="editBtn border rounded px-2 py-1">Ред.</button><button data-id="${p.id}" class="delBtn border rounded px-2 py-1">Удал.</button></div></div>`;
      adminList.appendChild(el);
    });
    adminList.querySelectorAll('.editBtn').forEach(b=>b.addEventListener('click',(e)=>openAdminEdit(e.target.dataset.id)));
    adminList.querySelectorAll('.delBtn').forEach(b=>b.addEventListener('click', async (e)=>{
      if (!confirm('Удалить?')) return;
      const id = e.target.dataset.id;
      const r = await deleteProductOnServer(id);
      if (r && r.ok) { alert('Удалено'); await loadProducts(); redraw(); renderCards(); }
      else alert('Ошибка удаления');
    }));
  }
  redraw();

  adminRoot.querySelector('#adminNew').addEventListener('click', ()=> openAdminEdit());
}

function openAdminEdit(id){
  let p = id ? PRODUCTS.find(x=>x.id===id) : null;
  const root = document.getElementById('adminEditRoot') || document.querySelector('#adminView #adminEditRoot');
  if (!root) return;
  root.innerHTML = '';
  const form = document.createElement('form'); form.className='card p-4 rounded space-y-2';
  form.innerHTML = `
    <label class="block text-sm"><span class="muted">ID (латиница, уникальный)</span><input name="id" required class="w-full mt-1 rounded bg-transparent border px-3 py-2"/></label>
    <label class="block text-sm"><span class="muted">Заголовок</span><input name="title" class="w-full mt-1 rounded bg-transparent border px-3 py-2"/></label>
    <label class="block text-sm"><span class="muted">Короткое описание</span><input name="shortDescription" class="w-full mt-1 rounded bg-transparent border px-3 py-2"/></label>
    <label class="block text-sm"><span class="muted">Полное описание</span><textarea name="description" class="w-full mt-1 rounded bg-transparent border px-3 py-2" rows="5"></textarea></label>
    <label class="block text-sm"><span class="muted">Ссылка</span><input name="link" class="w-full mt-1 rounded bg-transparent border px-3 py-2"/></label>
    <div class="block text-sm"><span class="muted">Галерея</span><div id="adminGallery" class="mt-2"></div></div>
    <label class="block text-sm"><span class="muted">Загрузить изображение</span>
      <div class="flex gap-2 mt-1"><input id="imgUpload" type="file" accept="image/*" class="rounded bg-transparent border px-3 py-2"/><button id="imgUploadBtn" type="button" class="btn rounded px-3 py-2">Загрузить</button></div>
      <div id="imgUploadStatus" class="text-sm muted mt-1"></div>
    </label>
    <div class="flex gap-2"><button type="submit" class="btn rounded px-3 py-2">Сохранить</button><button type="button" id="adminCancel" class="rounded border px-3 py-2">Отмена</button></div>
  `;
  root.appendChild(form);

  // initialize data
  const imgs = (p && Array.isArray(p.imgs)) ? p.imgs.slice() : []; // array of {url, public_id} or strings
  if (p) { form.id.value = p.id; form.title.value = p.title || ''; form.shortDescription.value = p.shortDescription || p.short || ''; form.description.value = p.description || ''; form.link.value = p.link || ''; }

  const gallery = root.querySelector('#adminGallery');
  function renderGallery(){
    gallery.innerHTML = '';
    imgs.forEach((img, idx) => {
      const src = (typeof img === 'string') ? img : (img.url || '');
      const wrap = document.createElement('div'); wrap.className = 'inline-block mr-2 mb-2';
      wrap.innerHTML = `<div class="w-28 h-20 bg-black/5 rounded overflow-hidden"><img src="${src}" class="w-full h-full object-cover"></div><div class="flex gap-1 mt-1"><button data-idx="${idx}" class="img-del rounded px-2 py-1 text-xs border" style="border-color:var(--sep)">Удалить</button></div>`;
      gallery.appendChild(wrap);
    });
    gallery.querySelectorAll('.img-del').forEach(b => b.addEventListener('click', async (ev)=>{
      const idx = Number(ev.target.dataset.idx);
      const img = imgs[idx];
      if (!confirm('Удалить изображение?')) return;
      const init_data = window.Telegram?.WebApp?.initData || '';
      const body = { init_data, productId: form.id.value || id };
      if (typeof img === 'string') body.path = img; else { body.public_id = img.public_id || img.path || null; body.path = img.url || null; }
      try{
        const res = await fetch(new URL('/images', API_BASE).toString(), { method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
        const j = await res.json().catch(()=>({ ok:false }));
        if (j.ok) { imgs.splice(idx,1); renderGallery(); toast('Изображение удалено'); }
        else { toast('Ошибка удаления'); }
      }catch(e){ console.error('delete image error', e); toast('Ошибка удаления'); }
    }));
  }
  renderGallery();

  // upload
  const uploadInput = form.querySelector('#imgUpload');
  const uploadBtn = form.querySelector('#imgUploadBtn');
  const uploadStatus = form.querySelector('#imgUploadStatus');
  uploadBtn.addEventListener('click', async ()=>{
    if (!uploadInput.files || !uploadInput.files.length) { alert('Выберите файл'); return; }
    const file = uploadInput.files[0];
    uploadStatus.textContent = 'Загрузка...';
    try{
      const fd = new FormData(); fd.append('image', file);
      const cardId = form.id.value || id || ('p_' + Date.now()); if (cardId) fd.append('cardId', cardId);
      const res = await fetch(new URL('/upload-image', API_BASE).toString(), { method:'POST', body: fd });
      const j = await res.json();
      if (j.ok) {
        const obj = (j.url || j.path) ? { url: j.url || j.path, public_id: j.path } : (j.path || j.url);
        imgs.push(obj);
        renderGallery();
        uploadStatus.textContent = 'Загружено';
      } else { uploadStatus.textContent = 'Ошибка загрузки'; console.warn('upload failed', j); }
    }catch(e){ uploadStatus.textContent = 'Ошибка'; console.error(e); }
  });

  form.addEventListener('submit', async (e)=>{ 
    e.preventDefault(); 
    const idv = form.id.value.trim();
    const payload = { id: idv || ('p_' + Date.now()), title: form.title.value.trim(), shortDescription: form.shortDescription.value.trim(), description: form.description.value.trim(), link: form.link.value.trim(), imgs: imgs };
    const init_data = window.Telegram?.WebApp?.initData || '';
    try{
      const res = await fetch(new URL('/products', API_BASE).toString(), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ init_data, product: payload }) });
      const j = await res.json().catch(()=>({ ok:false }));
      if (j.ok) { alert('Сохранено'); await loadProducts(); renderCards(); root.innerHTML=''; } else { alert('Ошибка сохранения'); }
    }catch(e){ console.error('save product error', e); alert('Ошибка сохранения'); }
  });

  root.querySelector('#adminCancel').addEventListener('click', ()=>{ root.innerHTML=''; });
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

