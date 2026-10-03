/* 말랑달콤 다이어리 - js/attend.js
   📅 출석 도장판 : 하루에 한 번 도장을 꾹! (카페 → 매일 말랑 → 📅 출석 도장판)
   - 오늘 날짜에만 찍을 수 있어요. 지나간 날은 나중에 찍을 수 없어요.
   - 날마다 도장 그림이 달라요. (날짜로 정해져서 어느 기기에서 봐도 같은 그림)
   - 🎁 도장을 모으면(3·7·15·30·50·100개) · 연속 7·14·21일 · 한 달 개근이면 움직이는 출석 스티커를 받아요 (그림 : js/attend-stickers.js)
     받은 스티커는 스티커 창의 '🎁 출석 스티커'에서 다이어리에 붙여요. 받았는지는 출석 기록으로 계산해서 따로 저장하지 않아요.
   - 기록은 설정(settings.json)에 암호로 저장 (🔐 js/drive.js 암호 보관) → 다른 기기에서도 같은 도장판. 게스트는 이 기기에 기억
   ※ 이 파일이 없어도 다이어리는 정상 동작 (출석 도장판만 '준비 중') */

        const AT_KEY = VAULT_KEYS[0];             // 🔐 암호 보관 (js/drive.js) → { "2026-10": [1,2,5], ... }
        const AT_STAMPS = ['🐰', '🍓', '🌷', '⭐', '🐻', '🍑', '🌈', '🐥', '🍀', '🧁', '🐱', '🌙', '🍒', '🦊', '🌻', '🐶', '🍰', '🐳', '🎀', '🐹', '🍋', '🦄', '🌸', '🐧', '🍩', '☁️', '🐨', '🍉', '🌼', '🐼', '💖'];
        const AT_COLORS = ['#e8546e', '#f08a3c', '#e2a400', '#4caf7a', '#3d9be0', '#8a6be0', '#e06bb5'];
        const atS = { built: false, y: 0, m: 0, d: null, pop: [] };
        const atq = id => document.getElementById(id);

        function atYm(y, m) { return y + '-' + String(m + 1).padStart(2, '0'); }
        function atToday() { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() }; }
        function atStamp(y, m, d) { const i = (y * 372 + m * 31 + d) * 7 % AT_STAMPS.length; return { e: AT_STAMPS[i], c: AT_COLORS[(y + m * 3 + d) % AT_COLORS.length] }; }

        /* ---------- 저장 ---------- */
        const atSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;     // 로그인 → 드라이브 설정 / 게스트 → 이 기기
        function atRead() {
            const o = vaultGet(AT_KEY, atSync()); return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        }
        function atWrite() {
            vaultPut(AT_KEY, atS.d, atSync());
        }
        function atHas(y, m, d) { const a = atS.d[atYm(y, m)]; return !!a && a.includes(d); }

        /* 오늘(또는 어제)부터 거꾸로 이어진 날 수 */
        function atStreak() {
            const t = new Date(); t.setHours(12, 0, 0, 0);
            if (!atHas(t.getFullYear(), t.getMonth(), t.getDate())) t.setDate(t.getDate() - 1);   // 오늘 아직 안 찍었으면 어제부터
            let n = 0;
            while (atHas(t.getFullYear(), t.getMonth(), t.getDate())) { n++; t.setDate(t.getDate() - 1); }
            return n;
        }
        function atBest() {
            const days = [];
            Object.keys(atS.d).forEach(k => { const [y, m] = k.split('-').map(Number); atS.d[k].forEach(d => days.push(Date.UTC(y, m - 1, d) / 86400000)); });
            days.sort((a, b) => a - b);
            let best = 0, run = 0, prev = null;
            days.forEach(x => { run = prev !== null && x - prev === 1 ? run + 1 : 1; best = Math.max(best, run); prev = x; });
            return best;
        }

        /* ---------- 🎁 출석 스티커 ---------- */
        const atStk = () => typeof ATTEND_STICKERS !== 'undefined' ? ATTEND_STICKERS : [];
        const atStkUrl = k => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(k.svg);
        function atTotal() { return Object.values(atS.d).reduce((a, b) => a + b.length, 0); }
        function atFullMonths() { return Object.keys(atS.d).filter(k => { const [y, m] = k.split('-').map(Number); return atS.d[k].length === new Date(y, m, 0).getDate(); }).length; }
        function atHasStk(k, v) { return k.type === 'total' ? v.total >= k.n : k.type === 'streak' ? v.best >= k.n : v.full >= k.n; }
        function atStkView() { return { total: atTotal(), best: atBest(), full: atFullMonths() }; }
        function atNeedText(k) { return k.type === 'total' ? `도장 ${k.n}개` : k.type === 'streak' ? `${k.n}일 연속` : '한 달 개근'; }
        function atEarnedIds() { const v = atStkView(); return atStk().filter(k => atHasStk(k, v)).map(k => k.id); }

        /* ---------- 화면 ---------- */
        function atBuild() {
            if (atS.built) return;
            atS.built = true;
            const el = document.createElement('div');
            el.id = 'attendRoom'; el.className = 'at-room';
            el.innerHTML = `
              <div class="at-bar"><span class="at-sp"></span><b>📅 출석 도장판</b><button class="at-x" type="button" onclick="closeAttend()" aria-label="닫기">✕</button></div>
              <div class="at-wrap">
                <div class="at-board">
                  <div class="at-head">
                    <button type="button" class="at-nav" onclick="atMove(-1)" aria-label="지난달">‹</button>
                    <b id="atTitle"></b>
                    <button type="button" class="at-nav" id="atNext" onclick="atMove(1)" aria-label="다음 달">›</button>
                  </div>
                  <div class="at-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
                  <div class="at-grid" id="atGrid"></div>
                  <div class="at-count" id="atCount"></div>
                </div>
                <div class="at-stats">
                  <div><small>연속 출석</small><b id="atStreak">0</b>일</div>
                  <div><small>가장 긴 연속</small><b id="atBest">0</b>일</div>
                  <div><small>모은 도장</small><b id="atTotal">0</b>개</div>
                </div>
                <button class="at-go" type="button" id="atGo" onclick="atPress()"></button>
                <div class="at-stk" id="atStkBox">
                  <div class="at-stk-head"><b>🎁 출석 스티커</b><span id="atStkCount"></span></div>
                  <div class="at-stk-next" id="atStkNext"></div>
                  <div class="at-stk-grid" id="atStkGrid"></div>
                  <p class="at-stk-note">받은 스티커는 ✏️ 스티커 창의 <b>🎁 출석 스티커</b>에서 다이어리에 붙일 수 있어요. 붙인 뒤에도 계속 움직여요!</p>
                </div>
                <p class="at-tip">💡 도장은 하루라도 빠져도 모은 개수는 그대로예요. 연속 스티커는 가장 길게 이어 간 기록으로 받아요.<br>🌷 도장을 찍은 날 일기도 쓰면 화분에 물까지 줄 수 있어요.</p>
              </div>
              <div class="at-pop-wrap" id="atPopWrap" hidden>
                <div class="at-pop-box">
                  <div class="at-pop-t">🎉 새 스티커를 받았어요!</div>
                  <img id="atPopImg" alt="">
                  <b id="atPopName"></b>
                  <button class="at-go" type="button" onclick="atPopStick()">📌 오늘 다이어리에 붙이기</button>
                  <button class="at-pop-later" type="button" onclick="atPopClose()">나중에 붙일게요</button>
                </div>
              </div>`;
            document.body.appendChild(el);
        }

        function atRender(pop) {
            const T = atToday(), y = atS.y, m = atS.m;
            atq('atTitle').textContent = `${y}년 ${m + 1}월`;
            atq('atNext').style.visibility = (y === T.y && m === T.m) ? 'hidden' : 'visible';
            const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate();
            let h = '';
            for (let i = 0; i < first; i++) h += '<span class="at-cell at-empty"></span>';
            for (let d = 1; d <= last; d++) {
                const isT = y === T.y && m === T.m && d === T.d;
                const fut = y > T.y || (y === T.y && (m > T.m || (m === T.m && d > T.d)));
                const s = atStamp(y, m, d), has = atHas(y, m, d);
                h += `<span class="at-cell${isT ? ' at-today' : ''}${fut ? ' at-fut' : ''}${has ? ' at-on' : ''}${has && pop && isT ? ' at-pop' : ''}"><i>${d}</i>`
                    + (has ? `<em style="--c:${s.c}">${s.e}</em>` : '') + '</span>';
            }
            atq('atGrid').innerHTML = h;
            const cnt = (atS.d[atYm(y, m)] || []).length;
            const full = y === T.y && m === T.m ? T.d : last;                          // 이번 달은 오늘까지
            atq('atCount').innerHTML = cnt === last ? `🏆 <b>${m + 1}월 개근!</b> 한 달 내내 와 줬어요` : `${m + 1}월 도장 <b>${cnt}</b>개` + (cnt && cnt === full && y === T.y && m === T.m ? ' · 이번 달 하루도 안 빠졌어요!' : '');
            const streak = atStreak(), best = atBest();
            atq('atStreak').textContent = streak;
            atq('atBest').textContent = best;
            atq('atTotal').textContent = atTotal();
            atRenderStk();
            const done = atHas(T.y, T.m, T.d), go = atq('atGo');
            go.disabled = done;
            go.innerHTML = done ? '오늘 도장 찍었어요 · 내일 또 만나요' : `${atStamp(T.y, T.m, T.d).e} 오늘 도장 꾹!`;
        }

        function atRenderStk() {
            const list = atStk(), box = atq('atStkBox');
            box.hidden = !list.length;
            if (!list.length) return;
            const v = atStkView(), got = list.filter(k => atHasStk(k, v));
            atq('atStkCount').textContent = `${got.length} / ${list.length}`;
            const nt = list.filter(k => k.type === 'total' && v.total < k.n)[0], ns = list.filter(k => k.type === 'streak' && v.best < k.n)[0];
            const cur = atStreak(), msg = [];
            if (nt) msg.push(`도장 <b>${nt.n - v.total}개</b> 더 모으면 <b>${nt.name}</b>`);
            if (ns) msg.push(`<b>${ns.n - cur}일</b> 더 이어 가면 <b>${ns.name}</b>`);
            atq('atStkNext').innerHTML = msg.length ? '🎯 ' + msg.join('<br>🎯 ') : '🏆 스티커를 모두 모았어요!';
            atq('atStkGrid').innerHTML = list.map(k => atHasStk(k, v)
                ? `<span class="at-stk-it on"><img src="${atStkUrl(k)}" alt="${k.name}"><small>${k.name}</small></span>`
                : `<span class="at-stk-it"><img src="${atStkUrl(k)}" alt="${k.name}"><small>${atNeedText(k)}</small></span>`).join('');
        }
        function atPopShow(ids) {
            atS.pop = ids.slice();
            const k = atStk().find(x => x.id === atS.pop[0]); if (!k) return;
            atq('atPopImg').src = atStkUrl(k); atq('atPopName').textContent = k.name;
            atq('atPopWrap').hidden = false;
        }
        function atPopClose() {
            atS.pop.shift();
            if (atS.pop.length) atPopShow(atS.pop); else atq('atPopWrap').hidden = true;
        }
        function atPopStick() {
            const k = atStk().find(x => x.id === atS.pop[0]);
            if (k) attendStickerAdd(k.id, true);
            atPopClose();
        }
        /* 다이어리 오늘 페이지에 붙이기 (팝업 · 스티커 창 공통) */
        function attendStickerAdd(id, fromRoom) {
            const k = atStk().find(x => x.id === id); if (!k || typeof addImage !== 'function') return false;
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">받은 스티커는 ✏️ 스티커 창의 🎁 출석 스티커에 있어요.</span>'); return false; }
            if (!addImage(atStkUrl(k))) return false;
            const box = document.querySelector('#canvasArea .element-box:last-child'); if (box) box.style.width = '120px';
            if (fromRoom) closeAttend();
            if (typeof closeModal === 'function') closeModal('stickerModal');
            toastAt(`🎁 ${k.name} 스티커를 붙였어요` + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
            return true;
        }
        /* ✏️ 스티커 창 → 🎁 출석 스티커 칸 */
        function loadAttendStickers(btn) {
            if (btn) { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
            atS.d = atRead();
            const v = atStkView(), grid = atq('stickerGrid');
            grid.innerHTML = '<div class="at-sg-note">📅 출석 도장을 모으면 움직이는 스티커가 하나씩 열려요</div>' + atStk().map(k => atHasStk(k, v)
                ? `<button type="button" class="at-sg on" onclick="attendStickerAdd('${k.id}')"><img src="${atStkUrl(k)}" alt="${k.name}"><small>${k.name}</small></button>`
                : `<span class="at-sg"><img src="${atStkUrl(k)}" alt="${k.name}"><small>${atNeedText(k)}</small></span>`).join('');
        }

        function atMove(dir) {
            const T = atToday();
            let y = atS.y, m = atS.m + dir;
            if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
            if (y > T.y || (y === T.y && m > T.m)) return;
            atS.y = y; atS.m = m; atRender();
        }

        function atPress() {
            const T = atToday();
            if (atHas(T.y, T.m, T.d)) return;
            const k = atYm(T.y, T.m), before = atEarnedIds();
            atS.d[k] = (atS.d[k] || []).concat(T.d).sort((a, b) => a - b);
            atWrite();
            atS.y = T.y; atS.m = T.m;
            atRender(true);
            const fresh = atEarnedIds().filter(id => !before.includes(id));
            if (fresh.length) { setTimeout(() => atPopShow(fresh), 600); return; }
            const streak = atStreak(), last = new Date(T.y, T.m + 1, 0).getDate();
            if ((atS.d[k] || []).length === last) toastAt(`🏆 ${T.m + 1}월 개근! 한 달 내내 와 줘서 고마워요`);
            else if (streak > 1) toastAt(`${streak}일 연속 출석이에요!`);
            else toastAt('오늘도 와 줘서 고마워요!');
        }
        function toastAt(msg) { if (typeof toast === 'function') toast(msg); }

        function openAttend() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            atBuild();
            atS.d = atRead();
            const T = atToday(); atS.y = T.y; atS.m = T.m;
            atq('attendRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            atRender();
        }
        function closeAttend() {
            const r = atq('attendRoom'); if (r) r.classList.remove('show');
            const pw = atq('atPopWrap'); if (pw) pw.hidden = true;
            document.body.classList.remove('fc-lock');
        }
        function attendDone() { const T = atToday(), a = atRead()[atYm(T.y, T.m)]; return !!a && a.includes(T.d); }   // 오늘 도장 찍었나요?
        window.openAttend = openAttend;
        window.attendDone = attendDone;
        window.loadAttendStickers = loadAttendStickers;
