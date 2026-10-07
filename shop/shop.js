// 말랑달콤 문구점 · 주소: #/ (전체) · #/c/대분류 · #/c/대분류/소분류 · #/p/번호
const SHOP_API_URL = 'https://script.google.com/macros/s/AKfycbxL7hfPoBvaHb_bZV7CQAGGwFcvdf7887PPwkSu4Nwbj9h_B80dal0e6IYGxLv-IS9_/exec'; // ← 문구점 앱스크립트 웹 앱 주소
const TALL_CATS = ['배경화면']; // 썸네일을 세로로 보여 줄 대분류 (PC 소분류는 아래서 가로)
let SH = { cats: [], items: [] };
let CHAT = '';

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = n => n > 0 ? n.toLocaleString('ko-KR') + '원' : '문의';
const $ = id => document.getElementById(id);

// 드라이브 링크 → 작은 그림 주소 (그 밖의 https 주소는 그대로 · 나머지는 막음)
function img(u, w) {
  if (!u) return '';
  const m = u.match(/\/d\/([\w-]+)/) || u.match(/[?&]id=([\w-]+)/);
  if (m && /drive\.google\.com/.test(u)) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w' + w;
  return /^https:\/\//.test(u) ? u : '';
}

function card(it) {
  const tall = TALL_CATS.includes(it.c) && it.s !== 'PC';
  return '<a class="sh-card' + (tall ? ' tall' : '') + '" href="#/p/' + encodeURIComponent(it.id) + '">' +
    (it.b ? '<span class="sh-badge">' + esc(it.b) + '</span>' : '') +
    '<div class="im" style="background-image:url(\'' + esc(img(it.t, 500)) + '\')"></div>' +
    '<div class="tx"><div class="nm">' + esc(it.n) + '</div><div class="pr">' + won(it.p) + '</div></div></a>';
}

function render() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, '')).split('/');
  const view = $('shView'), main = $('shMain'), sub = $('shSub');
  let cur = '', cs = '';
  if (h[0] === 'p') {
    const it = SH.items.find(x => x.id === h[1]);
    if (!it) { view.innerHTML = '<p class="sh-msg">상품을 찾지 못했어요</p>'; return; }
    cur = it.c; cs = it.s;
    const pics = [it.t].concat(it.d).filter(Boolean);
    view.innerHTML = '<div class="sh-det"><a class="sh-back" href="#/c/' + encodeURIComponent(it.c) + (it.s ? '/' + encodeURIComponent(it.s) : '') + '">‹ 목록으로</a>' +
      pics.map(u => '<img loading="lazy" alt="" src="' + esc(img(u, 1000)) + '">').join('') +
      '<h2>' + esc(it.n) + '</h2><div class="pr">' + won(it.p) + '</div>' +
      '<div class="ds">' + esc(it.x) + '</div>' +
      '<button class="sh-buy" id="shBuy">💬 주문하기</button>' +
      '<div class="sh-guide">누르면 주문 문구가 복사되고 오픈채팅이 열려요 · 채팅에 붙여 넣어 주세요</div></div>';
    $('shBuy').onclick = () => buy(it);
    scrollTo(0, 0);
  } else {
    if (h[0] === 'c') { cur = h[1] || ''; cs = h[2] || ''; }
    const list = SH.items.filter(x => (!cur || x.c === cur) && (!cs || x.s === cs));
    view.innerHTML = list.length ? '<div class="sh-grid">' + list.map(card).join('') + '</div>' : '<p class="sh-msg">준비 중이에요 🍬</p>';
  }
  main.innerHTML = '<a href="#/" class="' + (cur ? '' : 'on') + '">전체</a>' +
    SH.cats.map(c => '<a href="#/c/' + encodeURIComponent(c.n) + '" class="' + (c.n === cur ? 'on' : '') + '">' + esc(c.n) + '</a>').join('');
  const c = SH.cats.find(x => x.n === cur);
  sub.innerHTML = c && c.s.length ? '<a href="#/c/' + encodeURIComponent(c.n) + '" class="' + (cs ? '' : 'on') + '">전체</a>' +
    c.s.map(s => '<a href="#/c/' + encodeURIComponent(c.n) + '/' + encodeURIComponent(s) + '" class="' + (s === cs ? 'on' : '') + '">' + esc(s) + '</a>').join('') : '';
}

function buy(it) {
  const t = '[말랑달콤 문구점] ' + it.c + (it.s ? ' > ' + it.s : '') + ' · ' + it.n + ' (번호 ' + it.id + ')';
  try { navigator.clipboard.writeText(t); } catch (e) {}
  if (CHAT) window.open(CHAT, '_blank', 'noopener');
}

async function init() {
  try {
    const r = await fetch('../an.txt');
    const m = (await r.text()).match(/오픈채팅\s*=\s*(\S+)/);
    if (m && /^https:\/\//.test(m[1])) CHAT = m[1];
  } catch (e) {}
  try {
    if (!SHOP_API_URL) throw 0;
    const j = await (await fetch(SHOP_API_URL + '?action=shop')).json();
    if (!j.ok) throw 0;
    SH = j;
  } catch (e) {
    $('shView').innerHTML = '<p class="sh-msg">상품을 불러오지 못했어요. 잠시 뒤 다시 와 주세요</p>';
    return;
  }
  addEventListener('hashchange', render);
  render();
}
init();
