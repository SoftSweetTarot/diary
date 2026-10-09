/* 🛍️ 말랑달콤 문구점 - shop/shop.js
   주소 : #/ (처음) · #/c/대분류 · #/c/대분류/소분류 · #/p/번호 · #/q/찾는말 · #/cart (🧺 장바구니)
   - 칸은 다이어리 보관 창과 같은 이름이에요 (SH_TREE) · 시트 '카테고리' 탭에만 있는 칸도 뒤에 붙여 보여 줘요
     시트 이름은 띄어쓰기가 달라도 같은 칸 ('마스킹 테이프' = 마스킹테이프 · '기본패턴 배경지' = 배경지 > 기본패턴)
   - 🧺 장바구니 : 이 기기에만 기억 (localStorage) · 주문하기 → 저금 코드 + 담은 것 + 합계를 복사하고 오픈채팅 열기 (PC 는 QR)
     저금 코드는 다이어리가 접속할 때 이 기기에 적어 둬요 (js/presence.js 'malang_code') · 없으면 직접 적어요
   - 상품 목록 : 문구점_앱스크립트.gs (?action=shop) { cats:[{n,s:[]}], items:[{id,c,s,n,p,t,d,x,b}] } */
const SHOP_API_URL = 'https://script.google.com/macros/s/AKfycbxL7hfPoBvaHb_bZV7CQAGGwFcvdf7887PPwkSu4Nwbj9h_B80dal0e6IYGxLv-IS9_/exec'; // ← 문구점 앱스크립트 웹 앱 주소
const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
const CART_KEY = 'malang_shop_cart', CODE_KEY = 'malang_code';

/* 다이어리와 같은 칸 (이름 · 아이콘 · 한 줄 소개) */
const SH_TREE = [
  { n: '스티커', i: '🏷️', d: '씰 · 마테 · 떡메', s: [['씰스티커', '🏷️'], ['조각스티커', '🧩'], ['마스킹테이프', '🎀'], ['모조지', '📄'], ['메모지', '📝'], ['떡메모지', '🧻'], ['속지', '📃']] },
  { n: '페이지', i: '📔', d: '한 장 통째로', s: [] },
  { n: '배경지', i: '🌈', d: '바탕 무늬', s: [['기본패턴', '🔸'], ['그림패턴', '🌷'], ['이미지', '🖼️'], ['영상', '🎬']] },
  { n: '배경화면', i: '🖼️', d: '폰 · PC 배경', s: [['스마트폰', '📱'], ['PC', '💻']] }
];
const TALL = { '배경화면': s => s !== 'PC' };                    // 세로로 긴 그림 칸

let SH = { cats: [], items: [] }, CATS = [], CHAT = '', sortBy = 'new';
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = n => n > 0 ? n.toLocaleString('ko-KR') + '원' : '문의';
const nm = s => String(s || '').replace(/\s+/g, '');
const link = (c, s) => '#/c/' + encodeURIComponent(c) + (s ? '/' + encodeURIComponent(s) : '');
const isPhone = () => /Android|iPhone|iPod/i.test(navigator.userAgent) || (/iPad|Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

/* 드라이브 링크 → 작은 그림 주소 (그 밖의 https 주소는 그대로 · 나머지는 막음) */
function img(u, w) {
  if (!u) return '';
  const m = u.match(/\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/);
  if (m && /drive\.google\.com/.test(u)) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w' + w;
  return /^https:\/\//.test(u) ? u : '';
}

/* ---------- 칸 : SH_TREE + 시트에만 있는 칸 ---------- */
function canon(c, s) {                                        // 시트 이름 → 화면 칸 이름
  const t = CATS.find(x => nm(x.n) === nm(c));
  if (!t) return [String(c || '').trim(), String(s || '').trim()];
  const sub = s && t.s.find(x => nm(x[0]) === nm(s) || nm(x[0]) + nm(t.n) === nm(s));
  return [t.n, sub ? sub[0] : String(s || '').trim()];
}
function buildCats() {
  CATS = SH_TREE.map(t => ({ n: t.n, i: t.i, d: t.d, s: t.s.map(x => x.slice()) }));
  SH.cats.forEach(c => {
    let t = CATS.find(x => nm(x.n) === nm(c.n));
    if (!t) { t = { n: c.n, i: '🎁', d: '', s: [] }; CATS.push(t); }
    (c.s || []).forEach(s => { const [, cs] = canon(t.n, s); if (cs && !t.s.some(x => x[0] === cs)) t.s.push([cs, '✨']); });
  });
  SH.items.forEach(it => { [it.c, it.s] = canon(it.c, it.s); });
}

/* ---------- 🧺 장바구니 (이 기기에만) ---------- */
function cartGet() { try { const a = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); return Array.isArray(a) ? a.filter(x => x && x.id && x.q > 0) : []; } catch (e) { return []; } }
function cartPut(a) { try { localStorage.setItem(CART_KEY, JSON.stringify(a)); } catch (e) {} cartBadge(); }
function cartRows() { return cartGet().map(x => ({ it: SH.items.find(i => i.id === x.id), q: Math.min(99, x.q | 0) })).filter(r => r.it); }
function cartAdd(id, q) {
  const a = cartGet(), r = a.find(x => x.id === id);
  if (r) r.q = Math.min(99, r.q + q); else a.push({ id, q });
  cartPut(a);
}
function cartSet(id, q) { cartPut(cartGet().map(x => x.id === id ? { id, q } : x).filter(x => x.q > 0)); render(); }
function cartBadge() {
  const n = cartRows().reduce((s, r) => s + r.q, 0), fab = $('shCartFab');
  $('shCartN').textContent = n;
  fab.hidden = !n || location.hash === '#/cart';
}
function codeGet() { try { return localStorage.getItem(CODE_KEY) || ''; } catch (e) { return ''; } }

/* ---------- 그리기 ---------- */
function card(it) {
  const tall = TALL[it.c] && TALL[it.c](it.s), cheap = it.p > 0 && it.p <= 100;
  return '<a class="sh-card' + (tall ? ' tall' : '') + '" href="#/p/' + encodeURIComponent(it.id) + '">' +
    '<span class="sh-tape" aria-hidden="true"></span>' +
    '<span class="im">' + (img(it.t, 400) ? '<img loading="lazy" alt="" src="' + esc(img(it.t, 400)) + '">' : '<i>' + icon(it.c, it.s) + '</i>') + '</span>' +
    (it.b ? '<span class="sh-badge">' + esc(it.b) + '</span>' : '') +
    '<span class="tx"><span class="nm">' + esc(it.n) + '</span><span class="pr' + (cheap ? ' cheap' : '') + '">' + won(it.p) + '</span></span></a>';
}
function icon(c, s) { const t = CATS.find(x => x.n === c); if (!t) return '🎁'; const x = s && t.s.find(y => y[0] === s); return x ? x[1] : t.i; }
function grid(list, empty) {
  if (!list.length) return '<div class="sh-empty"><span>🍬</span>' + (empty || '곧 예쁜 상품이 들어와요!') + '</div>';
  return '<div class="sh-grid">' + list.map(card).join('') + '</div>';
}
const byNew = (a, b) => (parseFloat(b.id) || 0) - (parseFloat(a.id) || 0) || String(b.id).localeCompare(String(a.id));
function sorted(list) {
  const a = list.slice();
  if (sortBy === 'low') a.sort((x, y) => (x.p || 1e9) - (y.p || 1e9) || byNew(x, y));
  else if (sortBy === 'high') a.sort((x, y) => y.p - x.p || byNew(x, y));
  else a.sort(byNew);
  return a;
}
function sortBar(n) {
  return '<div class="sh-bar"><span class="sh-cnt">' + n + '개</span><span class="sh-sort">' +
    [['new', '🆕 신상순'], ['low', '💰 낮은 가격'], ['high', '💎 높은 가격']].map(([k, t]) => '<button type="button" data-sort="' + k + '" class="' + (k === sortBy ? 'on' : '') + '">' + t + '</button>').join('') + '</span></div>';
}
function row(title, list, more) {
  if (!list.length) return '';
  return '<section class="sh-row"><h3>' + title + (more ? '<a href="' + more + '">더 보기 ›</a>' : '') + '</h3><div class="sh-strip">' + list.map(card).join('') + '</div></section>';
}

function home() {
  const items = SH.items, fresh = items.filter(x => /new|신상/i.test(x.b)), cheap = items.filter(x => x.p > 0 && x.p <= 100);
  const code = codeGet();
  return '<section class="sh-hero"><div class="sh-hero-tx"><p class="sh-hi">어서 오세요 ♡</p><h1>오늘은 어떤 걸로<br>꾸며 볼까요?</h1>' +
    '<p class="sh-hero-s">100원부터 시작하는 작은 행복 🍬</p>' + (code ? '<span class="sh-code">💗 내 저금 코드 <b>' + esc(code) + '</b></span>' : '') + '</div>' +
    '<div class="sh-hero-art" aria-hidden="true"><span class="a1">🎀</span><span class="a2">🧸</span><span class="a3">🌷</span><span class="a4">✨</span><span class="a5">🍓</span></div></section>' +
    '<section class="sh-tiles">' + CATS.map(c => {
      const n = items.filter(x => x.c === c.n).length;
      return '<a class="sh-tile" href="' + link(c.n) + '"><span class="ic">' + c.i + '</span><b>' + esc(c.n) + '</b><small>' + (c.d ? esc(c.d) : n + '개') + '</small></a>';
    }).join('') + '</section>' +
    row('🆕 새로 들어왔어요', (fresh.length ? fresh : items).slice().sort(byNew).slice(0, 12)) +
    row('💰 100원 코너', cheap.sort(byNew).slice(0, 12)) +
    '<section class="sh-all"><h3>🛍️ 전체 상품</h3>' + sortBar(items.length) + grid(sorted(items)) + '</section>';
}

function detail(it) {
  const pics = [it.t].concat(it.d || []).map(u => img(u, 1000)).filter(Boolean);
  const tall = TALL[it.c] && TALL[it.c](it.s);
  return '<div class="sh-det"><a class="sh-back" href="' + link(it.c, it.s) + '">‹ ' + esc(it.s || it.c) + '</a>' +
    '<div class="sh-gal' + (tall ? ' tall' : '') + '" id="shGal">' + (pics.length ? pics.map(u => '<img loading="lazy" alt="" src="' + esc(u) + '">').join('') : '<i>' + icon(it.c, it.s) + '</i>') + '</div>' +
    (pics.length > 1 ? '<div class="sh-dots" id="shDots">' + pics.map((_, i) => '<i class="' + (i ? '' : 'on') + '"></i>').join('') + '</div>' : '') +
    '<div class="sh-det-tx">' + (it.b ? '<span class="sh-badge in">' + esc(it.b) + '</span>' : '') +
    '<p class="sh-path">' + icon(it.c, it.s) + ' ' + esc(it.c) + (it.s ? ' · ' + esc(it.s) : '') + '</p>' +
    '<h2>' + esc(it.n) + '</h2><div class="pr">' + won(it.p) + '</div>' +
    (it.x ? '<div class="ds">' + esc(it.x) + '</div>' : '') +
    '<div class="sh-qty"><span>수량</span><button type="button" data-q="-1" aria-label="하나 빼기">−</button><b id="shQ">1</b><button type="button" data-q="1" aria-label="하나 더">＋</button></div>' +
    '<div class="sh-acts"><button type="button" class="sh-btn soft" id="shPut">🧺 장바구니 담기</button><button type="button" class="sh-btn" id="shNow">💬 바로 주문</button></div>' +
    '<p class="sh-guide">주문하면 저금 코드와 주문 내용이 복사되고 말랑달콤 오픈채팅이 열려요</p></div></div>';
}

function cartView() {
  const rows = cartRows(), code = codeGet();
  if (!rows.length) return '<div class="sh-cart"><h2>🧺 장바구니</h2><div class="sh-empty"><span>🧺</span>장바구니가 비어 있어요<br><a class="sh-btn soft" href="#/">구경하러 가기</a></div></div>';
  const sum = rows.reduce((s, r) => s + (r.it.p || 0) * r.q, 0), ask = rows.some(r => !(r.it.p > 0));
  return '<div class="sh-cart"><h2>🧺 장바구니</h2><ul class="sh-lines">' + rows.map(r =>
    '<li><a class="th" href="#/p/' + encodeURIComponent(r.it.id) + '">' + (img(r.it.t, 200) ? '<img alt="" src="' + esc(img(r.it.t, 200)) + '">' : '<i>' + icon(r.it.c, r.it.s) + '</i>') + '</a>' +
    '<div class="tx"><b>' + esc(r.it.n) + '</b><small>' + esc(r.it.c) + (r.it.s ? ' · ' + esc(r.it.s) : '') + '</small><span class="pr">' + won((r.it.p || 0) * r.q) + '</span></div>' +
    '<div class="sh-qty sm"><button type="button" data-cq="' + esc(r.it.id) + '" data-d="-1" aria-label="하나 빼기">−</button><b>' + r.q + '</b><button type="button" data-cq="' + esc(r.it.id) + '" data-d="1" aria-label="하나 더">＋</button></div>' +
    '<button type="button" class="x" data-cx="' + esc(r.it.id) + '" aria-label="빼기">✕</button></li>').join('') + '</ul>' +
    '<div class="sh-sum"><span>합계</span><b>' + sum.toLocaleString('ko-KR') + '원' + (ask ? ' + 문의' : '') + '</b></div>' +
    '<label class="sh-codein">💗 저금 코드 <input id="shCode" maxlength="12" placeholder="말랑0000" value="' + esc(code) + '"></label>' +
    '<p class="sh-guide">' + (code ? '받은 스티커를 넣어 드릴 때 이 코드로 찾아요' : '다이어리 → ☕ 카페 → 💗 저금통에서 내 코드를 볼 수 있어요') + '</p>' +
    '<button type="button" class="sh-btn big" id="shOrder">💬 오픈채팅으로 주문하기</button>' +
    '<p class="sh-guide">주문 내용이 복사돼요 · 채팅방에 붙여 넣고 합계만큼 카카오페이로 보내 주세요</p></div>';
}

function render() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
  const view = $('shView');
  let cur = '', cs = '';
  if (h[0] === 'p') {
    const it = SH.items.find(x => x.id === h[1]);
    if (it) { cur = it.c; cs = it.s; view.innerHTML = detail(it); detailWire(it); }
    else view.innerHTML = '<div class="sh-empty"><span>🔎</span>상품을 찾지 못했어요<br><a class="sh-btn soft" href="#/">처음으로</a></div>';
  } else if (h[0] === 'cart') {
    view.innerHTML = cartView(); cartWire();
  } else if (h[0] === 'q') {
    const w = nm(h.slice(1).join('/')).toLowerCase();
    const list = SH.items.filter(x => nm(x.n + x.c + x.s + x.x + x.b).toLowerCase().includes(w));
    view.innerHTML = '<h2 class="sh-h">🔍 “' + esc(h.slice(1).join('/')) + '”</h2>' + sortBar(list.length) + grid(sorted(list), '찾는 상품이 없어요. 다른 말로 찾아볼까요?');
    $('shFindIn').value = h.slice(1).join('/');
  } else if (h[0] === 'c') {
    const t = CATS.find(x => x.n === h[1]) || CATS.find(x => nm(x.n) === nm(h[1]));
    cur = t ? t.n : h[1] || ''; cs = t ? canon(cur, h[2] || '')[1] : h[2] || '';
    const list = SH.items.filter(x => x.c === cur && (!cs || x.s === cs));
    view.innerHTML = '<h2 class="sh-h">' + icon(cur, cs) + ' ' + esc(cs || cur) + '</h2>' + sortBar(list.length) + grid(sorted(list));
  } else view.innerHTML = home();
  const main = $('shMain'), sub = $('shSub');
  main.innerHTML = '<a href="#/" class="' + (cur || h[0] === 'cart' || h[0] === 'q' ? '' : 'on') + '">🏠 처음</a>' +
    CATS.map(c => '<a href="' + link(c.n) + '" class="' + (c.n === cur ? 'on' : '') + '">' + c.i + ' ' + esc(c.n) + '</a>').join('');
  const c = CATS.find(x => x.n === cur);
  sub.innerHTML = c && c.s.length ? '<a href="' + link(c.n) + '" class="' + (cs ? '' : 'on') + '">전체</a>' +
    c.s.map(([s, i]) => '<a href="' + link(c.n, s) + '" class="' + (s === cs ? 'on' : '') + '">' + i + ' ' + esc(s) + '</a>').join('') : '';
  const on = main.querySelector('.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  cartBadge();
}

/* ---------- 누르기 ---------- */
function detailWire(it) {
  let q = 1;
  $('shView').querySelectorAll('[data-q]').forEach(b => b.onclick = () => { q = Math.max(1, Math.min(99, q + +b.dataset.q)); $('shQ').textContent = q; });
  $('shPut').onclick = () => { cartAdd(it.id, q); pop('<b class="pt">🧺</b><p>장바구니에 담았어요!</p><div class="pb"><button type="button" class="sh-btn soft" data-close>더 구경하기</button><a class="sh-btn" href="#/cart" data-close>장바구니 보기</a></div>'); };
  $('shNow').onclick = () => order([{ it, q }]);
  const g = $('shGal'), dots = $('shDots');
  if (g && dots) g.onscroll = () => { const i = Math.round(g.scrollLeft / g.clientWidth); dots.querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === i)); };
  scrollTo(0, 0);
}
function cartWire() {
  const v = $('shView');
  v.querySelectorAll('[data-cq]').forEach(b => b.onclick = () => { const r = cartGet().find(x => x.id === b.dataset.cq); if (r) cartSet(r.id, Math.min(99, r.q + +b.dataset.d)); });
  v.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => cartSet(b.dataset.cx, 0));
  const ci = $('shCode'); if (ci) ci.onchange = () => { try { localStorage.setItem(CODE_KEY, ci.value.trim()); } catch (e) {} };
  const ob = $('shOrder'); if (ob) ob.onclick = () => order(cartRows(), true);
}
/* 💬 주문 : 문구 복사 → 휴대폰은 오픈채팅 열기 · PC 는 QR */
async function order(rows, fromCart) {
  const ci = $('shCode'), code = (ci ? ci.value.trim() : codeGet()) || '';
  if (ci) { try { localStorage.setItem(CODE_KEY, code); } catch (e) {} }
  const sum = rows.reduce((s, r) => s + (r.it.p || 0) * r.q, 0);
  const text = '[말랑달콤 문구점 주문]\n저금 코드 : ' + (code || '(모름)') + '\n' +
    rows.map(r => '· ' + r.it.c + (r.it.s ? ' > ' + r.it.s : '') + ' · ' + r.it.n + ' (번호 ' + r.it.id + ') × ' + r.q + ' = ' + won((r.it.p || 0) * r.q)).join('\n') +
    '\n합계 : ' + sum.toLocaleString('ko-KR') + '원';
  let copied = false;
  try { await navigator.clipboard.writeText(text); copied = true; } catch (e) {}
  const phone = isPhone();
  pop('<b class="pt">💌</b><p>' + (copied ? '주문 내용을 복사했어요!' : '아래 주문 내용을 길게 눌러 복사해 주세요') + '</p>' +
    '<pre class="sh-order">' + esc(text) + '</pre>' +
    '<p class="sm">' + (phone ? '채팅방에 붙여 넣고 <b>' + sum.toLocaleString('ko-KR') + '원</b>을 카카오페이로 보내 주세요 💗' : '카카오페이 송금은 휴대폰에서만 돼요.<br>휴대폰 카메라로 QR 을 찍어 채팅방을 열어 주세요 💗') + '</p>' +
    (!phone && CHAT ? '<div class="sh-qr" id="shQr"></div>' : '') +
    '<div class="pb">' + (CHAT ? '<a class="sh-btn" href="' + esc(CHAT) + '" target="_blank" rel="noopener" data-close>💬 채팅방 열기</a>' : '') +
    '<button type="button" class="sh-btn soft" data-close>닫기</button></div>' +
    (fromCart ? '<button type="button" class="sh-link" id="shClear">주문했어요 · 장바구니 비우기</button>' : ''));
  const cl = $('shClear'); if (cl) cl.onclick = () => { cartPut([]); popClose(); render(); };
  if (!phone && CHAT) qr(CHAT, $('shQr'));
}
function qr(text, box) {
  const draw = () => { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { box.remove(); } };
  if (window.qrcode) return draw();
  const s = document.createElement('script'); s.src = QR_LIB; s.onload = draw; s.onerror = () => box.remove(); document.head.appendChild(s);
}
function pop(html) {
  const p = $('shPop');
  p.innerHTML = '<div class="sh-pop-card" role="dialog" aria-modal="true">' + html + '</div>';
  p.hidden = false;
  p.onclick = e => { if (e.target === p || e.target.closest('[data-close]')) popClose(); };
}
function popClose() { $('shPop').hidden = true; $('shPop').innerHTML = ''; }

document.addEventListener('click', e => {
  const s = e.target.closest('[data-sort]'); if (!s) return;
  sortBy = s.dataset.sort; render();
});
$('shFindBtn').onclick = () => { const f = $('shFind'); f.hidden = !f.hidden; if (!f.hidden) $('shFindIn').focus(); };
$('shFind').onsubmit = e => { e.preventDefault(); const w = $('shFindIn').value.trim(); if (w) location.hash = '#/q/' + encodeURIComponent(w); };
/* ✕ : 카페에서 열린 탭이면 그냥 닫기 (다이어리 탭이 그대로 남아 로그인 안 해도 됨) · 못 닫으면 다이어리로 */
$('shClose').onclick = () => { window.close(); setTimeout(() => { location.href = '../'; }, 300); };
addEventListener('storage', e => { if (e.key === CART_KEY) cartBadge(); });

async function init() {
  try {
    const r = await fetch('../an.txt', { cache: 'no-store' });
    const m = (await r.text()).match(/오픈채팅\s*=\s*(\S+)/);
    if (m && /^https:\/\//.test(m[1])) CHAT = m[1];
  } catch (e) {}
  try {
    if (!SHOP_API_URL) throw 0;
    const j = await (await fetch(SHOP_API_URL + '?action=shop')).json();
    if (!j.ok) throw 0;
    SH = { cats: Array.isArray(j.cats) ? j.cats : [], items: Array.isArray(j.items) ? j.items : [] };
  } catch (e) {
    $('shView').innerHTML = '<div class="sh-empty"><span>🌧️</span>상품을 불러오지 못했어요<br>잠시 뒤 다시 와 주세요</div>';
    return;
  }
  buildCats();
  addEventListener('hashchange', () => { popClose(); render(); });
  render();
}
init();
