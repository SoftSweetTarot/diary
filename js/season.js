/* 말랑달콤 다이어리 - js/season.js
   🌸☀️🍁⛄ 계절 테마 : 지금 계절에 맞는 다이어리 색 + 화면에 살랑살랑 날리는 꽃잎 · 물방울 · 낙엽 · 눈 (🎨 페이지 → 계절 테마)
   - 다이어리 페이지 오른쪽 아래에 계절 장식이 살짝 붙어요 (글 · 그림보다 뒤에 있어서 가리지 않아요)
   - 계절 : 봄 3~5월 · 여름 6~8월 · 가을 9~11월 · 겨울 12~2월 (계절이 바뀌면 테마도 저절로 바뀌어요)
   - 계절 스티커 : ✏️ 스티커 창 → 계절 칸 · 지금 계절의 스티커만 붙일 수 있어요 (다른 계절은 미리 보기)
     이미 붙인 스티커는 계절이 지나도 일기에 그대로 남아요
   - 켜고 끄기는 설정(설정.json)에 저장 ('diary_season' = 1) · 다른 페이지를 고르면 계절 테마는 꺼져요
   - 움직임 줄이기(기기 설정)를 켠 사람에게는 날리는 효과를 보여 주지 않아요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (계절 테마만 안 보여요)
   🔒 SEASON_OPEN : 특별한 날(이벤트)에만 true 로 열어요. false 면 계절 스티커 칸 · 페이지의 계절 테마 · 설정의 계절 장식 스위치가 모두 숨고,
      날리는 효과 · 모서리 장식도 나오지 않아요 (켜 둔 사람도 꺼진 것처럼 · 저장된 설정은 그대로라 다시 열면 돌아와요) */

        const SEASON_OPEN = false;
        const SEASON_KEY = 'diary_season';
        const SEASONS = {
            sp: { name: '봄', icon: '🌸', months: '3~5월', fx: '꽃잎', skin: { bg: '#ffeef3', cover: '#ffb7cb', page: '#fffafc', border: '#ffc9d8', accent: '#f06292' } },
            su: { name: '여름', icon: '🌊', months: '6~8월', fx: '물방울', skin: { bg: '#e3f6ff', cover: '#6ec6f0', page: '#f7fdff', border: '#a9dcf5', accent: '#1e9bd7' } },
            au: { name: '가을', icon: '🍁', months: '9~11월', fx: '낙엽', skin: { bg: '#fbefe3', cover: '#e8935a', page: '#fffaf3', border: '#f0c29b', accent: '#d0682c' } },
            wi: { name: '겨울', icon: '⛄', months: '12~2월', fx: '눈송이', skin: { bg: '#eef3fb', cover: '#8fa9d8', page: '#fbfdff', border: '#c5d3ee', accent: '#5a74b8' } }
        };
        /* 날리는 조각 그림 (작은 SVG) */
        const SEASON_FX = {
            sp: ['<path d="M12 2 C17 6 17 14 12 22 C7 14 7 6 12 2Z" fill="#ffc2d4"/>', '<path d="M12 3 C18 7 16 15 12 21 C8 15 6 7 12 3Z" fill="#ffd9e4"/>'],
            su: ['<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="2"/><circle cx="9" cy="9" r="2" fill="#fff"/>', '<circle cx="12" cy="12" r="5" fill="#fff" fill-opacity=".7"/>'],
            au: ['<path d="M12 1 L14 8 L21 5 L18 11 L23 13 L17 15 L19 21 L13 18 L12 23 L11 18 L5 21 L7 15 L1 13 L6 11 L3 5 L10 8Z" fill="#ff7a3d"/>', '<path d="M12 1 L14 8 L21 5 L18 11 L23 13 L17 15 L19 21 L13 18 L12 23 L11 18 L5 21 L7 15 L1 13 L6 11 L3 5 L10 8Z" fill="#ffb02e"/>', '<ellipse cx="12" cy="12" rx="6" ry="10" fill="#c9622f" transform="rotate(30 12 12)"/>'],
            wi: ['<circle cx="12" cy="12" r="5" fill="#fff"/>', '<path d="M12 2 V22 M3 7 L21 17 M3 17 L21 7" stroke="#fff" stroke-width="2" stroke-linecap="round"/>']
        };
        /* 다이어리 페이지 오른쪽 아래 모서리 장식 (80×80) */
        const SEASON_CORNER = {
            sp: '<path d="M80 30 C60 40 46 56 38 80" stroke="#8a5a44" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M58 50 C50 44 40 44 32 48" stroke="#8a5a44" stroke-width="3" fill="none" stroke-linecap="round"/>'
                + [[62, 38, 13], [36, 50, 10], [48, 70, 9]].map(([x, y, r]) => [0, 72, 144, 216, 288].map(a => `<ellipse cx="${x}" cy="${y - r * .6}" rx="${r * .42}" ry="${r * .6}" fill="#ffc2d4" transform="rotate(${a} ${x} ${y})"/>`).join('') + `<circle cx="${x}" cy="${y}" r="${r * .3}" fill="#ff7aa0"/>`).join(''),
            su: '<path d="M0 66 q10 -8 20 0 t20 0 t20 0 t20 0 V80 H0Z" fill="#8fd3f0"/><path d="M10 74 q10 -8 20 0 t20 0 t20 0 t20 0 V80 H10Z" fill="#5fbbe6"/><path d="M50 52 l10 -14 l10 14 q-10 6 -20 0z" fill="#ffd1df" stroke="#f29bb2" stroke-width="2"/><circle cx="26" cy="46" r="5" fill="none" stroke="#9fd8f5" stroke-width="2"/><circle cx="36" cy="34" r="3" fill="none" stroke="#9fd8f5" stroke-width="2"/>',
            au: [[58, 56, 20, '#ff7a3d', 20], [34, 66, 15, '#ffb02e', -30], [66, 28, 13, '#d9542f', 60]].map(([x, y, r, c, a]) => `<g transform="translate(${x} ${y}) rotate(${a}) scale(${r / 12})"><path d="M0 -11 L2 -4 L9 -7 L6 -1 L11 1 L5 3 L7 9 L1 6 L0 11 L-1 6 L-7 9 L-5 3 L-11 1 L-6 -1 L-9 -7 L-2 -4Z" fill="${c}"/></g>`).join('') + '<ellipse cx="22" cy="40" rx="5" ry="7" fill="#9a6a42"/><path d="M17 36 q5 -6 10 0z" fill="#6a4226"/>',
            wi: '<path d="M44 70 l8 -12 l8 12z M48 64 h8" fill="#4caf7a"/><circle cx="62" cy="64" r="5" fill="#e8384f"/><circle cx="54" cy="68" r="5" fill="#e8384f"/>' + [[66, 30, 9], [36, 44, 7], [20, 70, 5], [70, 48, 4]].map(([x, y, r]) => `<path d="M${x} ${y - r} V${y + r} M${x - r * .87} ${y - r / 2} L${x + r * .87} ${y + r / 2} M${x - r * .87} ${y + r / 2} L${x + r * .87} ${y - r / 2}" stroke="#a9c4f0" stroke-width="2" stroke-linecap="round"/>`).join('')
        };
        const ssq = id => document.getElementById(id);

        function seasonNow(d) { const m = (d || new Date()).getMonth() + 1; return m >= 3 && m <= 5 ? 'sp' : m >= 6 && m <= 8 ? 'su' : m >= 9 && m <= 11 ? 'au' : 'wi'; }
        function seasonOn() { if (!SEASON_OPEN) return false; try { return store.getItem(SEASON_KEY) === '1'; } catch (e) { return false; } }

        /* 날리는 효과 */
        function seasonFx(id) {
            let layer = ssq('seasonLayer');
            if (layer) layer.remove();
            document.documentElement.classList.remove('season-fx');
            if (!id || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            document.documentElement.classList.add('season-fx');
            layer = document.createElement('div');
            layer.id = 'seasonLayer'; layer.className = 'season-layer season-' + id;
            const pics = SEASON_FX[id], n = window.innerWidth < 600 ? 14 : 22;
            for (let i = 0; i < n; i++) {
                const p = document.createElement('i');
                const size = 12 + Math.random() * 14;
                p.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;`
                    + `animation-duration:${(9 + Math.random() * 10).toFixed(1)}s;animation-delay:-${(Math.random() * 18).toFixed(1)}s;--dx:${(Math.random() * 120 - 60).toFixed(0)}px;--r:${(Math.random() * 720 - 360).toFixed(0)}deg`;
                p.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${pics[i % pics.length]}</svg>`)}")`;
                layer.appendChild(p);
            }
            document.body.appendChild(layer);
        }
        /* 계절 테마 적용 (켜져 있을 때) */
        function seasonCorner(id) {
            let c = ssq('seasonCorner');
            if (!id) { if (c) c.remove(); return; }
            const page = ssq('innerPage'); if (!page) return;
            if (!c) { c = document.createElement('div'); c.id = 'seasonCorner'; c.className = 'season-corner'; page.appendChild(c); }
            c.style.backgroundImage = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">${SEASON_CORNER[id]}</svg>`)}")`;
        }
        function seasonApply() {
            const id = seasonNow(), S = SEASONS[id];
            document.body.dataset.season = id;
            if (typeof setSkinVars === 'function') setSkinVars(S.skin);
            seasonFx(id); seasonCorner(id);
        }
        function seasonRestore() { if (seasonOn()) seasonApply(); else { delete document.body.dataset.season; seasonFx(null); seasonCorner(null); } }
        function seasonToggle() {
            if (!SEASON_OPEN) return;
            const on = !seasonOn();
            store.setItem(SEASON_KEY, on ? '1' : '0');
            if (on) { seasonApply(); }
            else { delete document.body.dataset.season; seasonFx(null); seasonCorner(null); if (typeof restoreSkin === 'function') restoreSkin(); }
            seasonRenderCard();
        }
        /* 다른 스킨을 고르면 계절 테마는 꺼져요 (js/settings.js 의 applySkinPreset 에서 불러요) */
        function seasonStop() {
            if (!seasonOn()) return;
            store.setItem(SEASON_KEY, '0');
            delete document.body.dataset.season; seasonFx(null); seasonCorner(null);
            seasonRenderCard();
        }

        /* 🎨 스킨 창의 계절 테마 칸 */
        function seasonRenderCard() {
            const box = ssq('seasonCard'); if (!box) return;
            const now = seasonNow(), on = seasonOn(), S = SEASONS[now];
            box.innerHTML = `
              <div class="ss-now ss-${now}"><span>${S.icon}</span><div><b>지금은 ${S.name}이에요</b><small>${S.name} 색으로 바뀌고, 화면에 ${S.fx}이 날려요</small></div></div>
              <button type="button" class="btn ss-go${on ? ' on' : ''}" onclick="seasonToggle()">${on ? `✓ ${S.name} 테마 쓰는 중 · 끄기` : `${S.icon} ${S.name} 테마 켜기`}</button>
              <div class="ss-list">${Object.keys(SEASONS).map(k => `<span class="${k === now ? 'on' : ''}">${SEASONS[k].icon}<small>${SEASONS[k].name} ${SEASONS[k].months}</small></span>`).join('')}</div>
              <p class="ss-note">계절이 바뀌면 테마도 저절로 바뀌어요. ✏️ 스티커 창에서 <b>${S.name} 스티커</b>도 써 보세요!</p>`;
        }

        /* ✏️ 스티커 창 → 계절 스티커 칸 */
        function loadSeasonStickers(btn) {
            if (!SEASON_OPEN) return;
            if (btn) { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
            const now = seasonNow(), url = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg);
            const sec = k => {
                const S = SEASONS[k], open = k === now;
                return `<div class="ss-sg-head">${S.icon} ${S.name} 스티커 ${open ? '<em>지금 쓸 수 있어요!</em>' : `<small>${S.months}에 열려요</small>`}</div>`
                    + SEASON_STICKERS[k].map(s => open
                        ? `<button type="button" class="cs-it" onclick="seasonStick('${k}','${s.id}')"><img src="${url(s)}" alt="${s.name}"><small>${s.name}</small></button>`
                        : `<span class="cs-it"><img src="${url(s)}" alt="${s.name}"><small>${S.months}</small></span>`).join('');
            };
            const order = ['sp', 'su', 'au', 'wi'], i = order.indexOf(now);
            ssq('stickerGrid').innerHTML = order.slice(i).concat(order.slice(0, i)).map(sec).join('');
        }
        function seasonStick(k, id) {
            if (!SEASON_OPEN || k !== seasonNow()) return;
            const s = (SEASON_STICKERS[k] || []).find(x => x.id === id); if (!s || typeof addImage !== 'function') return;
            if (!addImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.svg))) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (el) el.style.width = '110px';
            if (window.stkBlink) stkBlink();
        }

        (function seasonInit() {
            const b = ssq('seasonTab'), sk = ssq('seasonSkin');
            if (sk) sk.hidden = !SEASON_OPEN;
            if (!SEASON_OPEN) return;
            if (b) { const S = SEASONS[seasonNow()]; b.textContent = `${S.icon} ${S.name} 스티커`; b.hidden = false; }
            seasonRenderCard();
        })();
        window.seasonToggle = seasonToggle;
        window.seasonStop = seasonStop;
        window.seasonRestore = seasonRestore;
        window.loadSeasonStickers = loadSeasonStickers;
        window.seasonStick = seasonStick;
