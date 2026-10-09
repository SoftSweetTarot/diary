/* 말랑달콤 다이어리 - js/arrival.js
   🎁 선물 도착 : 🪙 코인 · 🎀 마스킹테이프 · 🍬 달콤배경지 · 🎁 캡슐 스티커 · 🖼️ 배경화면 을 '알림 창 하나'로 보여 줘요 + 메뉴에 NEW 표시
   - 서버(말랑달콤 사람들)가 도착 신호 한 장을 남겨요 (js/presence.js 가 로그인할 때 · 1분마다 받아 와요)
       { t: 🎀 · p: 🍬 · s: 🎁 → { all 또는 이름: [끝나는 날, 늘어남(1=원래 있던 것에 이어 붙음), 더한 일수] } , c: 🪙 [더한 개수, 지금 코인] , w: 🖼️ { 번호: [이름, 링크] } , n: 신호 번호 }
   - 놓치지 않게 (알림이 안 뜨는 일이 없게)
       ① 신호를 받으면 먼저 이 기기에 저장(malang_arrive)하고 → 그다음에 서버에 '받았어요'(gift_ack)를 알려요 · 서버는 그때까지 신호를 지우지 않아요
       ② 창은 사용자가 '닫기'를 눌러야 닫혀요 · 닫기 전에 다이어리를 꺼도 다음에 켜면 다시 떠요
       ③ 다이어리를 안 쓰는 동안 받은 선물은 서버에 남아 있다가, 접속하면 바로 창으로 떠요
       ④ 여러 번 받아도 한 창에 합쳐서(기간은 더해서) 보여 줘요
   - 🔔 NEW 표시 : 선물을 받으면 그 아이템이 있는 메뉴 버튼에 표시가 붙고, 안으로 들어갈수록 어느 버튼인지 이어져요 · 그 버튼을 누르면 사라져요
       index.html 의 data-nw="종류" (그 자리 버튼 · 누르면 사라짐) · data-nw-any="종류,종류" (바깥 버튼 · 안쪽 것이 하나라도 새것이면 표시)
       종류 : tape 🎀 · pat 🍬 · caps 🎁 · coin 🪙 · wall 🖼️
   ※ 이 파일이 없어도 다이어리는 정상 동작 */

        const AR_PENDING = 'malang_arrive';          // 아직 '닫기'를 안 누른 도착 알림 (합쳐 둔 한 장)
        const AR_SEEN = 'malang_arrive_n';           // 이미 받아 둔 신호 번호들 (서버가 '받았어요'를 못 받아 또 보내도 두 번 안 더하려고)
        const AR_NEW = 'malang_new';                 // 메뉴에 붙일 NEW { me, tape: {id|all: 1}, pat: {…}, caps: {…}, coin: 1, wall: {번호: 1} }
        const arRead = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
        const arWrite = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
        const arEsc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
        const arMe = () => (typeof pr !== 'undefined' && pr.me) || '';
        const arDayOk = u => /^\d{4}-\d{2}-\d{2}$/.test(u || '');

        /* ---------- 🔔 NEW 표시 ---------- */
        function nwGet() {
            const n = arRead(AR_NEW, {});
            return n && typeof n === 'object' && (!n.me || !arMe() || n.me === arMe()) ? n : {};      // 다른 계정이 남긴 표시는 안 써요
        }
        function nwHas(kind, id) {                      // 그 종류(와 디자인)가 새것이면 true
            const v = nwGet()[kind];
            return !!v && (typeof v !== 'object' || !!(id == null ? Object.keys(v).length : (v[id] || v.all)));
        }
        const nwOn = kind => nwHas(kind);
        function nwMark(g) {
            const n = nwGet(); n.me = arMe();
            const put = (k, o) => { if (!o || typeof o !== 'object' || !Object.keys(o).length) return; n[k] = n[k] && typeof n[k] === 'object' ? n[k] : {}; Object.keys(o).forEach(id => { n[k][id] = 1; }); };
            put('tape', g.t); put('pat', g.p); put('caps', g.s); put('wall', g.w);
            if (g.c) n.coin = 1;
            arWrite(AR_NEW, n); nwRefresh();
        }
        function nwClear(kind) {
            const n = nwGet(); if (!(kind in n)) return;
            delete n[kind]; arWrite(AR_NEW, n); nwRefresh();
        }
        function nwRefresh() {
            document.querySelectorAll('[data-nw]').forEach(el => el.classList.toggle('nw-on', nwOn(el.dataset.nw)));
            document.querySelectorAll('[data-nw-any]').forEach(el => el.classList.toggle('nw-on', el.dataset.nwAny.split(',').some(nwOn)));
        }
        const nwChip = (kind, id) => nwHas(kind, id) ? '<em class="nw-chip">NEW</em>' : '';     // 목록 안 디자인 카드에 붙이는 작은 표시 (tape.js · skins.js · gacha.js · wall.js)
        document.addEventListener('click', e => {       // 그 자리 버튼을 누르면 표시 지우기 (버튼이 하는 일이 먼저 끝난 뒤에)
            const el = e.target.closest && e.target.closest('[data-nw]');
            if (el && nwOn(el.dataset.nw)) setTimeout(() => nwClear(el.dataset.nw), 0);
        }, true);
        /* 하단메뉴 ✨ 스티커의 NEW : 안쪽 버튼을 눌러야 사라지는데, 그 버튼이 안 보이는 종류(기간이 끝나 🎀 마스킹테이프 버튼이 숨은 경우 등)는
           지울 방법이 없어서 계속 남았어요 → 스티커 창을 열 때 '눈에 안 보이는 버튼의 NEW'는 같이 지워요 */
        document.addEventListener('click', e => {
            const tb = e.target.closest && e.target.closest('.tb-sticker[data-nw-any]'); if (!tb) return;
            setTimeout(() => tb.dataset.nwAny.split(',').forEach(k => {
                const seen = [...document.querySelectorAll('#stickerMakeModal [data-nw="' + k + '"]')].some(b => b.offsetParent);
                if (!seen && nwOn(k)) nwClear(k);
            }), 0);
        }, true);
        document.addEventListener('DOMContentLoaded', nwRefresh);
        window.addEventListener('load', () => setTimeout(nwRefresh, 800));

        /* ---------- 📥 도착 신호 받기 (js/presence.js 의 prGift 가 불러요) ---------- */
        function arMerge(a, g) {                        // g 를 a 에 합치기 : 기간 · 코인은 더하고, 끝나는 날은 새것 · 이미 열려 있던 거면 '이어 붙음' 표시 유지
            ['t', 'p', 's'].forEach(k => {
                if (!g[k] || typeof g[k] !== 'object') return;
                const o = a[k] = a[k] || {};
                Object.keys(g[k]).forEach(id => {
                    const v = g[k][id]; if (!Array.isArray(v) || !/^[\w-]{1,30}$/.test(id)) return;
                    const old = o[id];
                    o[id] = [arDayOk(v[0]) ? v[0] : (old ? old[0] : ''), old ? old[1] : (v[1] ? 1 : 0), (old ? +old[2] || 0 : 0) + (+v[2] || 0)];
                });
            });
            if (Array.isArray(g.c)) a.c = [(a.c ? +a.c[0] || 0 : 0) + (+g.c[0] || 0), g.c[1] == null ? (a.c ? a.c[1] : null) : +g.c[1]];
            if (g.w && typeof g.w === 'object') a.w = Object.assign(a.w || {}, g.w);
        }
        function arAck(n) {                             // 서버에 '받아서 저장했어요' (못 닿으면 다음에 같은 신호가 또 와요 → 번호로 걸러내고 다시 알려요)
            if (typeof MEMBER_API_URL === 'undefined' || !arMe()) return;
            const url = MEMBER_API_URL + '?action=gift_ack&u=' + encodeURIComponent(arMe()) + '&n=' + encodeURIComponent(n || '');
            const go = i => fetch(url, { credentials: 'omit' }).then(r => r.json()).then(j => { if (!(j && j.ok)) throw 0; }).catch(() => { if (i < 3) setTimeout(() => go(i + 1), 4000 * (i + 1)); });
            go(0);
        }
        function arPush(g) {
            if (!g || typeof g !== 'object') return false;
            const hasT = o => o && typeof o === 'object' && Object.keys(o).length;
            if (!(hasT(g.t) || hasT(g.p) || hasT(g.s) || hasT(g.w) || Array.isArray(g.c))) { arAck(g.n); return false; }
            const n = String(g.n || ''), seen = arRead(AR_SEEN, []);
            if (n && seen.indexOf(n) >= 0) { arAck(n); return false; }              // 이미 받아 둔 신호 : 지우라고만 다시 알려요
            const p = arRead(AR_PENDING, null), a = p && p.me === arMe() && p.g ? p.g : {};
            arMerge(a, g);
            arWrite(AR_PENDING, { me: arMe(), g: a });                              // ① 먼저 이 기기에 저장
            if (n) { seen.push(n); arWrite(AR_SEEN, seen.slice(-30)); }
            if (typeof giftApply === 'function') giftApply(g);                       // 🎀 · 🍬 지금 가진 것에 바로 합치기 (js/settings.js)
            if (g.w && typeof wlGift === 'function') wlGift(g.w);                    // 🖼️ 받은 배경화면 목록에 더하기 (js/wall.js)
            arCaps(g.s); arCoin(g.c);
            nwMark(g);
            arAck(n);                                                                // ② 그다음에 서버에 알려요
            arShow();
            return true;
        }
        function arCaps(s) {                            // 🎁 캡슐 스티커 : 선물권 목록 맞추기 (끝나는 날을 아는 건 바로 · 그리고 서버에서도 한 번 더)
            if (!s || typeof s !== 'object' || typeof capsPasses !== 'function' || typeof capsSet !== 'function') return;
            const list = capsPasses();
            Object.keys(s).forEach(id => {
                const u = s[id] && s[id][0]; if (!arDayOk(u)) return;
                const i = list.findIndex(x => x.id === id);
                if (i >= 0) list[i].until = u; else list.push({ id: id, until: u });
            });
            capsSet(list);
            if (typeof gcApi === 'function') gcApi('status').then(r => { if (r && r.ok) { capsSet(r.passes); const act = document.querySelector('.cat-btn.cs-cat.active'); if (act && typeof loadCapsStickers === 'function') loadCapsStickers(null, true); } }).catch(() => {});
        }
        function arCoin(c) {                            // 🪙 랜덤박스가 열려 있으면 코인 표시 바로 맞추기
            if (!Array.isArray(c) || c[1] == null) return;
            try { if (typeof gc !== 'undefined' && gc.open && typeof gcSetCoin === 'function') gcSetCoin(+c[1]); } catch (e) {}
        }

        /* ---------- 🎁 도착 창 (하나) ---------- */
        const AR_WHERE = {
            coin: ['🪙', '코인', '☕ 카페 → 🌱 매일 → 🎁 랜덤박스'],
            tape: ['🎀', '마스킹테이프', '✨ 스티커 → 🎀 마스킹테이프 → 이벤트'],
            pat: ['🍬', '달콤배경지', '🎨 페이지 → 🌈 배경지 → 이벤트'],
            caps: ['🎁', '캡슐 스티커', '✨ 스티커 → 🎁 캡슐 스티커'],
            wall: ['🖼️', '배경화면', '☕ 카페 → 📱 말랑달콤 배경화면']
        };
        const arDay = u => { const d = new Date(u + 'T00:00:00'); return isNaN(d) ? '' : `${d.getMonth() + 1}월 ${d.getDate()}일`; };
        function arNames(kind, sig) {                   // 신호 → 보여 줄 묶음 [{ names:[…], until, more, add }] (같은 기간끼리 한 줄)
            const lib = kind === 'tape' ? (typeof TAPES !== 'undefined' ? TAPES : [])
                : kind === 'pat' ? (typeof BG_PATTERNS !== 'undefined' ? BG_PATTERNS : [])
                : (typeof capsList === 'function' ? capsList() : []);
            const whole = kind === 'tape' ? '마스킹테이프 전체' : '달콤배경지 전체';
            const groups = {};
            Object.keys(sig || {}).sort((x, y) => (x === 'all' ? -1 : y === 'all' ? 1 : 0)).forEach(id => {
                const v = sig[id]; if (!Array.isArray(v)) return;
                const f = id === 'all' ? null : lib.find(x => x.id === id), key = [v[0], v[1] ? 1 : 0, +v[2] || 0].join('|');
                (groups[key] = groups[key] || { until: arDayOk(v[0]) ? v[0] : '', more: !!v[1], add: +v[2] || 0, names: [] }).names.push(id === 'all' ? whole : (f ? f.name : id));
            });
            return Object.keys(groups).map(k => groups[k]);
        }
        function arPeriod(x) {                          // 한 묶음의 기간 안내 : 끝나는 날 · 남은 기간 · (원래 있던 거면) 원래 + 더한 기간
            const left = x.until && typeof giftLeft === 'function' ? giftLeft(x.until) : -1, dl = left >= 0 && typeof dLabel === 'function' ? dLabel(left) : '';
            const lines = [];
            if (x.until) lines.push(`${arDay(x.until)}까지${dl ? ` · 남은 기간 <em>${dl}</em>` : ''}`);
            if (x.add > 0) {
                const before = left - x.add;
                lines.push(x.more && before >= 0 ? `원래 <b>${typeof dLabel === 'function' ? dLabel(before) : before + '일'}</b> + <b>${x.add}일</b> = <b>${dl}</b> 로 늘어났어요` : `<b>${x.add}일</b> 동안 쓸 수 있어요${x.more ? ' (기간이 늘어났어요)' : ''}`);
            }
            return lines.join('<br>');
        }
        function arRow(kind, body, go) {
            const w = AR_WHERE[kind];
            return `<li class="ar-li" data-k="${kind}"><span>${w[0]}</span><div>${body}
                <small class="ar-where">📍 ${w[2]}</small>${go ? `<button type="button" class="btn ar-go" data-go="${kind}">열어 보기 ›</button>` : ''}</div></li>`;
        }
        function arShow() {
            const p = arRead(AR_PENDING, null);
            if (!p || !p.g || p.me !== arMe()) return false;
            const g = p.g, old = document.getElementById('arPop'); if (old) old.remove();
            const rows = []; let allMore = true, any = false;
            if (Array.isArray(g.c)) { any = true; allMore = false; rows.push(arRow('coin', `<b>코인 +${+g.c[0] || 0}개</b>${g.c[1] != null ? `<small class="gp-dd">지금 코인 <em>${+g.c[1]}개</em></small>` : ''}`, true)); }
            [['tape', g.t], ['pat', g.p], ['caps', g.s]].forEach(([kind, sig]) => {
                const gr = arNames(kind, sig); if (!gr.length) return;
                any = true;
                if (!gr.every(x => x.more)) allMore = false;
                rows.push(arRow(kind, gr.map(x => `<b>${x.names.map(arEsc).join(' · ')}</b><small class="gp-dd">${arPeriod(x)}</small>`).join(''), true));
            });
            const walls = Object.keys(g.w || {}).map(Number).filter(no => no > 0 && typeof wlMine !== 'undefined' && wlMine[no]).sort((a, b) => a - b);
            if (walls.length) {
                any = true; allMore = false;
                walls.forEach(no => {
                    const m = wlMine[no], isPc = typeof wlIsPc === 'function' && wlIsPc(no), tag = typeof wlTag === 'function' ? wlTag(no) : no;
                    rows.push(`<li class="ar-li" data-k="wall"><span>${isPc ? '💻' : '📱'}</span><div><b>${arEsc(m.n || '배경화면 ' + tag + '번')}</b>
                        <small class="gp-dd">링크를 누르면 <em>구글 드라이브</em>가 열려요</small>
                        <a class="wl-lp-url" href="${arEsc(m.u)}" target="_blank" rel="noopener">${arEsc(m.u.replace(/^https:\/\//, '').replace(/\?.*$/, ''))}</a>
                        <div class="wl-lp-btns"><button type="button" class="btn wl-lp-open" data-n="${no}">🔗 링크 열기</button><button type="button" class="btn wl-lp-copy" data-n="${no}">📋 복사</button></div>
                        <small class="ar-where">📍 ${AR_WHERE.wall[2]} → 🎁 받기 에서도 다시 볼 수 있어요</small></div></li>`);
                });
            }
            if (!any) { localStorage.removeItem(AR_PENDING); return false; }
            const hearts = Array.from({ length: 12 }, (_, i) => `<i style="--x:${Math.round(Math.cos(i / 12 * 6.283) * (60 + i % 3 * 18))}px;--y:${Math.round(-70 - Math.abs(Math.sin(i / 12 * 6.283)) * 60 - i % 4 * 10)}px;--d:${(i % 4) * .08}s">${['💗', '✨', '💕', '⭐'][i % 4]}</i>`).join('');
            const el = document.createElement('div');
            el.id = 'arPop'; el.className = 'gp-wrap ar-pop';
            el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
            el.innerHTML = `
              <div class="gp-card">
                <div class="gp-ribbon">${allMore ? '선물 기간이 늘어났어요' : 'SPECIAL GIFT'}</div>
                <div class="gp-box">
                  <div class="gp-burst">${hearts}</div>
                  <svg viewBox="0 0 120 110" aria-hidden="true">
                    <rect x="16" y="50" width="88" height="56" rx="8" fill="#ff9fbb"/><rect x="16" y="50" width="88" height="12" fill="#ff86a8"/>
                    <rect x="52" y="50" width="16" height="56" fill="#ffe08a"/>
                    <g class="gp-lid"><rect x="8" y="34" width="104" height="20" rx="7" fill="#ffb3c8"/><rect x="52" y="34" width="16" height="20" fill="#ffe08a"/>
                      <path d="M60 34 C44 14 30 22 40 32 C46 37 56 35 60 34Z M60 34 C76 14 90 22 80 32 C74 37 64 35 60 34Z" fill="#ffd54f" stroke="#f2b400" stroke-width="2"/><circle cx="60" cy="33" r="5" fill="#f2b400"/></g>
                  </svg>
                </div>
                <div class="gp-t">💝 선물이 도착했어요!</div>
                <p class="gp-s">고마운 마음을 담아 보냈어요<br>아래에서 <b>무엇이 어디에 생겼는지</b> 확인해 주세요</p>
                <ul class="gp-list ar-list">${rows.join('')}</ul>
                <div class="gp-until">🔔 해당 메뉴 버튼에 <b>NEW</b> 표시를 붙여 두었어요 · 버튼을 누르면 사라져요</div>
                <button type="button" class="btn btn-primary gp-close">닫기</button>
              </div>`;
            const shut = () => { localStorage.removeItem(AR_PENDING); el.classList.add('out'); setTimeout(() => el.remove(), 260); };
            el.querySelector('.gp-close').onclick = shut;
            el.querySelectorAll('.ar-go').forEach(b => { b.onclick = () => { shut(); setTimeout(() => arGo(b.dataset.go), 280); }; });
            el.querySelectorAll('.wl-lp-open').forEach(b => { b.onclick = () => window.open(wlMine[b.dataset.n].u, '_blank', 'noopener'); });
            el.querySelectorAll('.wl-lp-copy').forEach(b => { b.onclick = async () => {
                const u = wlMine[b.dataset.n].u;
                if (typeof pigCopy === 'function') await pigCopy(u, '링크'); else { try { await navigator.clipboard.writeText(u); } catch (e) {} }
                b.textContent = '✅ 복사했어요'; setTimeout(() => { b.textContent = '📋 복사'; }, 1800);
            }; });
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('on'));
            setTimeout(() => { if (typeof sndChime === 'function') sndChime(); }, 900);
            setTimeout(() => { if (typeof pigCoin === 'function') pigCoin(); }, 1100);
            return true;
        }
        function arGo(kind) {                           // '열어 보기' : 그 아이템이 있는 자리로 바로
            try {
                if (kind === 'tape' || kind === 'caps') openStickerList(kind);
                else if (kind === 'pat') openPatternList('paid');
                else if (kind === 'coin') openRandomBox();
                else if (kind === 'wall') openWall();
            } catch (e) {}
        }
        /* 아직 못 본 알림이 있으면(다이어리를 껐다 켰을 때 · 로그인이 끝났을 때) 띄우기 */
        setInterval(() => {
            if (document.hidden || document.getElementById('arPop') || !arMe()) return;
            const gate = document.getElementById('driveGate'), lock = document.getElementById('lockScreen');
            if (gate && gate.style.display !== 'none' && getComputedStyle(gate).display !== 'none') return;     // 로그인 화면 위에는 안 띄워요
            if (lock && !lock.hidden) return;                                                                    // 잠금 화면 위에도 안 띄워요 (풀면 떠요)
            const p = arRead(AR_PENDING, null); if (p && p.g && p.me === arMe()) arShow();
        }, 2000);

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['arrival'] = true;
