/* 말랑달콤 다이어리 - js/gacha.js
   🎁 랜덤박스 : 문방구 캡슐 뽑기 기계
   - 🪙 코인 1개로 한 번 뽑아요. 코인은 📅 출석 도장판의 숨은 날에 도장을 찍으면 나와요 (js/attend.js)
   - 캡슐에서 🎁 캡슐 스티커(움직이는 스티커 10종 · js/capsule-stickers.js)가 나오면 30일 선물권이 생겨요
     선물권이 있는 동안 ✏️ 스티커 창의 🎁 캡슐 스티커 칸에서 다이어리에 붙여요 (기간이 끝나도 이미 붙인 건 그대로)
   - 코인 · 당첨 · 선물권은 모두 '랜덤박스 서버'(구글 앱스크립트)가 정하고 기억해요.
     선물권 목록은 이 기기에도 기억해 둬서 스티커 창을 열자마자 보여요 (서버 답이 오면 맞춰요)
   - 서버 코드 : 랜덤박스_앱스크립트.gs (랜덤박스 시트 → 확장 프로그램 → Apps Script 에 붙여 넣기)
     배포한 웹 앱 주소를 아래 GACHA_API_URL 에 넣어요.
   - 로그인한 사용자만 돌릴 수 있어요 (구글 계정으로 하루 한 번을 확인하기 때문)
   - 🎁 첫 선물 : 처음 로그인한 사람에게 캡슐 스티커 하나를 30일 선물권으로 줘요
     '말랑달콤 사람들' 서버가 처음 온 사람이라고 알려 주면(js/presence.js · first) → 랜덤박스 서버 welcome ('코인' 탭에 줄이 없을 때만 · 한 번)
     '첫 선물이 도착했어요' 창은 🎨 스티커 → 🎁 캡슐 스티커 칸을 처음 눌렀을 때 떠요 (그때까지 이 기기에 'malang_welcome_pop' 으로 기억)
     → '첫 선물이 도착했어요' 창으로 움직이는 스티커를 보여 주고, 얻는 방법(출석 도장 → 코인 → 랜덤박스)을 알려 줘요
   - 이 파일이 없어도 다이어리는 정상 동작 (랜덤박스만 '준비 중')
   ※ 파일 불러오는 순서: … → service → gacha */

        const GACHA_API_URL = 'https://script.google.com/macros/s/AKfycbwkuQlkD_jwpozbSlyz2Nj5py7MgYRfrWu3BtxTXHYOZ5pE4CYGbxqJGdy-6_UOsWTvCQ/exec';                      // ← 앱스크립트 웹 앱 주소 (https://script.google.com/macros/s/…/exec)
        const GACHA_MIX_MS = 12600;                    // 공 섞는 시간 (긴장감!)
        const GACHA_FORTUNES = [
            '오늘 쓴 일기 한 줄이 내일의 나를 웃게 해요.',
            '말랑한 하루! 좋아하는 간식을 하나 먹어요.',
            '내일은 더 좋은 캡슐이 나올지도 몰라요.',
            '오늘의 행운 색은 하늘색이에요.',
            '좋아하는 노래를 한 곡 들어 보세요.',
            '작은 칭찬 하나가 큰 기쁨이 돼요.',
            '오늘 하루도 정말 수고했어요.'
        ];
        const GC_CAPS = ['#ff7aa8', '#6cc4ff', '#9be27a', '#c79bff', '#ff9f5a', '#5fe0c9'];
        const GC_BULBS = ['#ff4d6d', '#ffd23f', '#3ddc84', '#4dabff', '#c77dff'];

        const gc = {
            built: false, open: false, stage: 'idle', outcome: null, prizes: null,
            turned: 0, ticks: 0, lastAng: null, dragged: false, taps: 0,
            balls: [], mixing: false, frozen: false, swirl: 1, swirlFlip: 0,
            bulbs: [], led: 'idle', ledPos: 0, ledLast: 0, mixStart: 0,
            raf: 0, rumble: null, timers: [], lastT: 0, acc: 0, noise: null, toneAt: 0, steps: 0
        };
        const gq = id => document.getElementById(id);

        /* ---------- 랜덤박스 서버와 이야기하기 ----------
           보내는 것 : 다이어리 로그인 정보(토큰) — 서버가 구글에 '누구인지'만 확인해요
           받는 것   : status → { coins, passes, rate } · play → { kind: 'miss'|'sticker', id, until, coins, passes } · stamp → { hit, coins } */
        function gcUseDrive() { return typeof drive !== 'undefined' && drive.ready && !drive.guest; }
        async function gcApi(action) {                 // 📅 출석 도장판(js/attend.js)도 같이 써요 : stamp
            if (!GACHA_API_URL) return { ok: false, error: 'setup' };
            if (!gcUseDrive()) return { ok: false, error: 'login' };
            try { await ensureToken(); } catch (e) { return { ok: false, error: 'login' }; }
            try {
                const res = await fetch(GACHA_API_URL, { method: 'POST', body: JSON.stringify({ action, token: drive.token }) });
                return await res.json();
            } catch (e) { return { ok: false, error: 'network' }; }
        }
        const GC_ERR = {
            setup: '🎁 랜덤박스를 준비하고 있어요. 조금만 기다려 주세요!',
            login: '☁ 구글 계정으로 로그인하면 하루 한 번 돌릴 수 있어요.',
            auth: '☁ 로그인 정보를 확인하지 못했어요. 다이어리를 새로고침해 주세요.',
            network: '📶 랜덤박스 서버에 연결하지 못했어요. 잠시 후 다시 해 주세요.',
            server: '⚠ 랜덤박스 서버에 문제가 생겼어요. 잠시 후 다시 해 주세요.',
            nocoin: '🪙 코인이 없어요. 📅 출석 도장판에 숨은 코인을 찾아보세요!'
        };

        /* ---------- 🎁 캡슐 스티커 선물권 [{ id, until:'yyyy-MM-dd' }] · 당첨된 순서 (서버가 정한 순서 그대로) ---------- */
        const CAPS_LOCAL = 'malang_caps';
        const capsList = () => typeof CAPSULE_STICKERS !== 'undefined' ? CAPSULE_STICKERS : [];
        const capsUrl = k => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(k.svg);
        const capsToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
        function capsPasses() {                       // 아직 안 끝난 것만
            let a; try { a = JSON.parse(localStorage.getItem(CAPS_LOCAL)); } catch (e) {}
            return Array.isArray(a) ? a.filter(p => p && p.id && p.until >= capsToday()) : [];
        }
        function capsSet(list) {
            const a = (list || []).filter(p => p && p.id && p.until).map(p => ({ id: p.id, until: p.until }));
            try { localStorage.setItem(CAPS_LOCAL, JSON.stringify(a)); } catch (e) {}
        }
        function capsLeft(id) {                       // 남은 날 (0 = 오늘이 마지막 날) · 없으면 -1
            const p = capsPasses().find(x => x.id === id); if (!p) return -1;
            return Math.round((Date.parse(p.until) - Date.parse(capsToday())) / 864e5);
        }
        /* ✏️ 스티커 창 → 🎁 캡슐 스티커 칸 : 선물권이 있는 스티커만 당첨된 순서대로 (끝난 건 빠지고 뒤의 것이 앞으로) */
        function loadCapsStickers(btn, fresh) {
            if (btn) { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
            const grid = gq('stickerGrid'); if (!grid) return;
            if (btn) capsWelcomeShow();
            const mine = capsPasses().map(p => ({ k: capsList().find(x => x.id === p.id), left: capsLeft(p.id) })).filter(x => x.k);
            grid.innerHTML = (mine.length
                ? mine.map(({ k, left }) => `<button type="button" class="cs-it" onclick="capsStickerAdd('${k.id}')">${typeof nwChip === 'function' ? nwChip('caps', k.id) : ''}<img src="${capsUrl(k)}" alt="${k.name}"><small>${k.name}</small><i>${left ? 'D-' + left : 'D-day'}</i></button>`).join('')
                : '<div class="cs-empty">🎁 아직 캡슐 스티커가 없어요</div>') + capsGuide();
            if (!fresh && gcUseDrive()) gcApi('status').then(r => {                   // 서버의 선물권으로 맞추기
                if (!r.ok) return; capsSet(r.passes);
                const act = document.querySelector('.cat-btn.cs-cat.active'); if (act) loadCapsStickers(null, true);
            });
        }
        /* 🧭 캡슐 스티커 얻는 방법 (스티커 칸 아래 · 첫 선물 창 공통) : 늘 보여요 */
        function capsGuide(inPop) {
            return `<div class="cs-guide${inPop ? ' in-pop' : ''}">
              <div class="cs-guide-t">✨ 움직이는 캡슐 스티커, 이렇게 모아요</div>
              <ol>
                <li><b>☕ 카페 → 🌱 매일 → 📅 출석 도장판</b>에서 하루 한 번 도장을 찍어요</li>
                <li>한 달에 몇 번, 도장 밑에 숨은 <b>🪙 코인</b>이 나와요</li>
                <li><b>☕ 카페 → 🌱 매일 → 🎁 랜덤박스</b>에 코인을 넣고 캡슐을 뽑아요</li>
                <li>나온 스티커는 <b>30일 동안</b> 여기 <b>🎁 캡슐 스티커</b> 칸에서 붙일 수 있어요</li>
              </ol>
              <button type="button" class="btn cs-guide-go" onclick="capsGoAttend()">📅 출석 도장 찍으러 가기</button>
            </div>`;
        }
        function capsGoAttend() {
            const pop = document.getElementById('capsWelcome'); if (pop) pop.remove();
            if (typeof closeModal === 'function') closeModal('stickerModal');
            if (typeof openAttend === 'function') openAttend();
        }

        /* 🎁 첫 선물 : 처음 온 사람이면 js/presence.js 가 불러요 */
        async function capsWelcome() {
            const r = await gcApi('welcome');
            if (!r || !r.ok || !r.gift) return;
            capsSet(r.passes || [r.gift]);
            try { localStorage.setItem(CAPS_WELCOME_POP, JSON.stringify(r.gift)); } catch (e) {}
        }
        const CAPS_WELCOME_POP = 'malang_welcome_pop';
        function capsWelcomeShow() {                   // 🎁 캡슐 스티커 칸을 누르면 (한 번만)
            let g = null; try { g = JSON.parse(localStorage.getItem(CAPS_WELCOME_POP)); localStorage.removeItem(CAPS_WELCOME_POP); } catch (e) {}
            if (g && g.id) capsWelcomePop(g.id, g.until);
        }
        function capsWelcomePop(id, until) {
            const k = capsList().find(x => x.id === id); if (!k) return;
            const old = document.getElementById('capsWelcome'); if (old) old.remove();
            const d = new Date(until + 'T00:00:00'), when = isNaN(d) ? '' : `${d.getMonth() + 1}월 ${d.getDate()}일`;
            const el = document.createElement('div');
            el.id = 'capsWelcome'; el.className = 'gp-wrap';
            el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
            el.innerHTML = `
              <div class="gp-card">
                <div class="gp-ribbon">WELCOME GIFT</div>
                <div class="cw-stk"><img src="${capsUrl(k)}" alt="${k.name}"></div>
                <div class="gp-t">🎁 첫 선물이 도착했어요!</div>
                <p class="gp-s">말랑달콤에 온 걸 환영해요 💕<br><b>움직이는 캡슐 스티커</b> <em>'${k.name}'</em>를 선물로 드려요</p>
                ${when ? `<div class="gp-until">이 스티커는 <b>${when}</b>까지 쓸 수 있어요</div>` : ''}
                ${capsGuide(true)}
                <button type="button" class="btn btn-primary gp-close">닫기</button>
              </div>`;
            el.querySelector('.gp-close').onclick = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('on'));
            setTimeout(() => { if (typeof sndChime === 'function') sndChime(); }, 500);
        }

        /* 다이어리 오늘 페이지에 붙이기 (스티커 창 · 당첨 화면 공통) */
        function capsStickerAdd(id, fromBox) {
            const k = capsList().find(x => x.id === id); if (!k || typeof addImage !== 'function') return false;
            if (capsLeft(id) < 0) { showMsg('🎁 선물권 기간이 끝났어요.<br>랜덤박스 캡슐에서 다시 만나요!'); return false; }
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">받은 스티커는 ✏️ 스티커 창의 🎁 캡슐 스티커에 있어요.</span>'); return false; }
            if (!addImage(capsUrl(k))) return false;
            const box = document.querySelector('#canvasArea .element-box:last-child'); if (box) box.style.width = '120px';
            if (fromBox) closeGacha();
            if (typeof closeModal === 'function') closeModal('stickerModal');
            return true;
        }

        /* ---------- 화면 만들기 ---------- */
        function gcBuild() {
            if (gc.built) return;
            gc.built = true;
            const el = document.createElement('div');
            el.id = 'gachaRoom';
            el.className = 'gc-room';
            el.innerHTML = `
              <div class="gc-wrap">
                <div class="gc-head">
                  <div class="gc-title">🎁 캡슐뽑기</div>
                  <span class="gc-chip" id="gcChip"><span class="gc-coin-ico">C</span><span id="gcChipText">코인 확인 중…</span></span>
                  <button class="gc-x" type="button" onclick="closeGacha()" aria-label="닫기">✕</button>
                </div>
                <div class="gc-machine">
                  <div class="gc-dome" id="gcDome"><canvas id="gcCanvas" width="500" height="460"></canvas></div>
                  <div class="gc-body" id="gcBody">
                    <div class="gc-label">MALANG CAPSULE<small>코인 1개 · 한 번</small></div>
                    <div class="gc-slot"><i></i><div class="gc-coin" id="gcCoin">C</div><span>코인 1개</span></div>
                    <button class="gc-crank" id="gcCrank" type="button" disabled aria-label="손잡이 돌리기"><span class="gc-bar" id="gcBar"></span></button>
                    <div class="gc-crank-hint" id="gcCrankHint"></div>
                    <div class="gc-chute"></div>
                    <div class="gc-bulbs" id="gcBulbs"></div>
                  </div>
                  <div class="gc-tray">
                    <button class="gc-capsule" id="gcCapsule" type="button" aria-label="캡슐 열기">
                      <span class="gc-half gc-bot"></span><span class="gc-half gc-top"></span><span class="gc-seam"></span><span class="gc-leak"></span>
                    </button>
                    <span class="gc-tap" id="gcTap" hidden>캡슐을 톡톡 눌러 열어요</span>
                  </div>
                </div>
                <div class="gc-say" id="gcSay">코인을 넣고 손잡이를 돌려 보세요!</div>
                <button class="gc-main" id="gcInsert" type="button">🪙 코인 넣기</button>
                <button class="gc-main gc-find" id="gcFind" type="button" onclick="gcGoAttend()" hidden>📅 출석 도장판에서 숨은 코인 찾기</button>
                <div class="gc-result" id="gcResult" hidden></div>
                <details class="gc-odds"><summary>🎲 확률 안내</summary><table id="gcOdds"></table>
                  <p>🪙 코인은 📅 출석 도장판에 한 달에 몇 번 숨어 있어요. 숨은 날 도장을 찍으면 찾을 수 있어요.<br>🎁 캡슐 스티커는 30일 선물권이에요. 같은 스티커가 또 나오면 30일이 더 늘어나요.</p></details>
                <button class="gc-sound snd-fx snd-fx-text" id="gcSound" type="button" onclick="sndToggleFx()">${typeof sndOn === 'function' && !sndOn() ? '🔇 소리 꺼짐' : '🔊 소리 켜짐'}</button>
              </div>
              <canvas class="gc-burst" id="gcBurst"></canvas>`;
            document.body.appendChild(el);

            /* 기계 안 캡슐 */
            const W = 500, H = 460;
            gc.balls = Array.from({ length: 22 }, (_, i) => ({
                x: 70 + Math.random() * (W - 140), y: 120 + Math.random() * (H - 200),
                vx: 0, vy: 0, r: 34 + Math.random() * 6, c: GC_CAPS[i % GC_CAPS.length], a: Math.random() * 6
            }));
            gc.balls.forEach(b => { b.img = gcSprite(b.r, b.c); });      // 공 그림은 한 번만 그려 두고 · 매 프레임엔 돌려서 붙이기만 해요 (가벼워요)
            for (let i = 0; i < 400; i++) gcStep();          // 처음부터 바닥에 가만히 쌓인 모습

            /* LED 전구 : 몸통 테두리를 따라 시계 방향 (캡슐 구멍 자리는 비움) */
            const box = gq('gcBulbs'), Wb = 270, Hb = 190, inset = 8, N = 34;
            const w = Wb - inset * 2, h = Hb - inset * 2, per = 2 * (w + h);
            for (let i = 0; i < N; i++) {
                let d = i * per / N, x, y;
                if (d < w) { x = d; y = 0; } else if ((d -= w) < h) { x = w; y = d; } else if ((d -= h) < w) { x = w - d; y = h; } else { d -= w; x = 0; y = h - d; }
                if (y === h && inset + x > 80 && inset + x < 190) continue;
                const b = document.createElement('span');
                b.className = 'gc-bulb';
                b.style.left = ((inset + x) / Wb * 100) + '%'; b.style.top = ((inset + y) / Hb * 100) + '%';
                b.style.setProperty('--c', GC_BULBS[i % GC_BULBS.length]);
                box.appendChild(b); gc.bulbs.push(b);
            }

            ['pointerdown', 'touchend', 'click', 'keydown'].forEach(t => el.addEventListener(t, gcUnlockAudio, true));   // 화면 어디를 눌러도 소리 깨우기 (아이패드는 touchend·click 이 확실)
            gq('gcInsert').onclick = gcInsertCoin;
            gq('gcCapsule').onclick = gcTapCapsule;
            document.addEventListener('snd-fx-off', gcStopRumble);
            const crank = gq('gcCrank');
            const angleOf = e => { const r = crank.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
            crank.addEventListener('pointerdown', e => { if (gc.stage !== 'turning') return; gc.lastAng = angleOf(e); gc.dragged = false; crank.setPointerCapture(e.pointerId); });
            crank.addEventListener('pointermove', e => {
                if (gc.lastAng === null || gc.stage !== 'turning') return;
                const a = angleOf(e); let d = a - gc.lastAng; if (d > 180) d -= 360; if (d < -180) d += 360;
                if (d > 0) { gcTurn(gc.turned + d); gc.dragged = true; }      // 시계 방향만
                gc.lastAng = a;
            });
            const end = () => { gc.lastAng = null; };
            crank.addEventListener('pointerup', end); crank.addEventListener('pointercancel', end);
            crank.addEventListener('click', () => { if (gc.stage === 'turning' && !gc.dragged) gcTurn(gc.turned + 90); gc.dragged = false; });
            crank.addEventListener('keydown', e => { if (gc.stage === 'turning' && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) { e.preventDefault(); gcTurn(gc.turned + 45); } });
        }

        function gcRenderOdds(rate) {
            const pct = n => (n / 10000).toFixed(n % 10000 ? 1 : 0) + '%';
            gq('gcOdds').innerHTML = rate === undefined ? '<tr><td>확률을 불러오는 중…</td><td></td></tr>'
                : `<tr><td>🎁 움직이는 캡슐 스티커 (30일 선물권)</td><td>${pct(rate)}</td></tr><tr><td>🍀 꽝 (오늘의 한마디)</td><td>${pct(1000000 - rate)}</td></tr>`;
        }
        function gcGoAttend() { closeGacha(); if (typeof openAttend === 'function') openAttend(); }

        /* ---------- 열기 · 닫기 ---------- */
        async function openGacha() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            gcBuild();
            gcUnlockAudio();                                   // 카페에서 누른 순간에 소리 미리 깨우기
            gq('gachaRoom').classList.add('show');
            gc.open = true;
            gcReset();
            gc.lastT = 0; gc.acc = 0;
            gcLoop();
            gcRenderOdds();
            gcSetCoin('checking');
            const r = await gcApi('status');
            if (!gc.open || gc.stage !== 'idle') return;
            gc.test = !!(r.ok && r.test);
            if (r.ok) { capsSet(r.passes); gcRenderOdds(r.rate); gcSetCoin(r.coins); }
            else gcSetCoin('error', r.error);
        }
        function closeGacha() {
            gc.open = false;
            cancelAnimationFrame(gc.raf);
            gc.timers.forEach(clearTimeout); gc.timers = [];
            gcStopRumble();
            const room = gq('gachaRoom'); if (room) room.classList.remove('show');
        }
        function gcLater(fn, ms) { const t = setTimeout(fn, ms); gc.timers.push(t); return t; }

        function gcReset() {
            gc.timers.forEach(clearTimeout); gc.timers = [];
            Object.assign(gc, { stage: 'idle', outcome: null, turned: 0, ticks: 0, taps: 0, mixing: false, frozen: false, led: 'idle' });
            gq('gcBar').style.transform = '';
            const c = gq('gcCrank'); c.disabled = true; c.classList.remove('ready');
            gq('gcCrankHint').textContent = '';
            gq('gcCapsule').className = 'gc-capsule';
            gq('gcTap').hidden = true; gq('gcResult').hidden = true;
            gq('gcDome').classList.remove('mixing');
        }
        /* 코인 : 'checking'(확인 중) · 숫자(가진 코인 수) · 'error'(로그인 필요 등) */
        function gcSetCoin(state, err) {
            gc.coin = state;
            const n = typeof state === 'number' ? state : 0, ok = typeof state === 'number';
            const chip = gq('gcChip'), txt = gq('gcChipText'), btn = gq('gcInsert'), say = gq('gcSay'), find = gq('gcFind');
            chip.classList.toggle('empty', !n && !gc.test);
            txt.textContent = gc.test && ok ? '🧪 테스트 모드 · 무제한' : state === 'checking' ? '코인 확인 중…' : ok ? `코인 ${n}개` : '코인 없음';
            btn.disabled = !(n > 0 || (gc.test && ok));
            find.hidden = !(ok && !n && !gc.test);
            say.textContent = state === 'checking' ? '…' : !ok ? (GC_ERR[err] || GC_ERR.server)
                : (n || gc.test) ? '코인을 넣고 손잡이를 돌려 보세요!' : '코인이 없어요.\n📅 출석 도장판 어딘가에 코인이 숨어 있어요!';
        }

        /* ---------- 1. 코인 넣기 ---------- */
        /* 코인이 떨어지는 모습 · 소리는 누르는 순간 바로 나와요 (서버 답을 기다리지 않아요 · 결과는 서버가 정하니까 연출만 먼저) */
        function gcDropCoin() {
            const coin = gq('gcCoin'); coin.classList.remove('drop'); void coin.offsetWidth; coin.classList.add('drop');
            gcSfx.coin(); gcBuzz(20);
        }
        async function gcInsertCoin() {
            if (gc.stage !== 'idle') return;
            gcUnlockAudio();
            gc.stage = 'asking';
            gq('gcInsert').disabled = true;
            gq('gcSay').textContent = '코인을 넣는 중…';
            const t0 = performance.now();
            gcDropCoin();
            const r = await gcApi('play');                  // 결과는 서버가 정해요 (연출은 그대로)
            if (!gc.open) return;
            if (!r.ok) {
                gc.stage = 'idle';
                gcSetCoin(r.error === 'nocoin' ? 0 : 'error', r.error);
                return;
            }
            gc.outcome = { kind: r.kind, id: r.id || '', until: r.until || '', coins: r.coins };
            capsSet(r.passes);
            gc.test = !!r.test;
            gc.stage = 'coin';
            gq('gcChipText').textContent = gc.test ? '🧪 테스트 모드 · 무제한' : `코인 ${r.coins}개`;
            gq('gcSay').textContent = '짤랑! 코인이 들어갔어요';
            gcLater(() => {
                gc.stage = 'turning'; gc.turned = 0; gc.ticks = 0;
                const c = gq('gcCrank'); c.disabled = false; c.classList.add('ready');
                gq('gcCrankHint').textContent = '손잡이를 한 바퀴 돌려요 ↻';
                gq('gcSay').textContent = '손잡이를 끝까지 돌려 주세요!';
                c.focus({ preventScroll: true });
            }, Math.max(350, 800 - (performance.now() - t0)));    // 코인이 다 떨어진 뒤에 손잡이 (서버가 늦게 답해도 바로 이어져요)
        }

        /* ---------- 2. 손잡이 ---------- */
        function gcTurn(deg) {
            gc.turned = Math.max(gc.turned, Math.min(360, deg));
            gq('gcBar').style.transform = `rotate(${gc.turned}deg)`;
            const t = Math.floor(gc.turned / 30);
            while (gc.ticks < t) { gc.ticks++; gcSfx.tick(); gcBuzz(8); }
            if (gc.turned >= 360) gcMix();
        }

        /* ---------- 3. 섞기 → 일제히 멈춤 → 캡슐 하나 ---------- */
        function gcMix() {
            if (gc.stage !== 'turning') return;
            gc.stage = 'mixing';
            const c = gq('gcCrank'); c.disabled = true; c.classList.remove('ready');
            gq('gcCrankHint').textContent = '';
            const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? GACHA_MIX_MS / 3 : GACHA_MIX_MS;
            gc.mixMs = ms;
            gc.mixing = true; gc.swirlFlip = 0; gq('gcDome').classList.add('mixing');
            gc.led = 'spin'; gc.mixStart = performance.now();
            gcStartRumble(ms);
            const lines = ['기계가 움직여요!', '섞는 중…', '와르르 와르르…', '두구두구두구…', '거의 다 왔어요…', '과연 오늘의 캡슐은…?!'];
            lines.forEach((t, i) => gcLater(() => { if (gc.stage === 'mixing') gq('gcSay').textContent = t; }, i * ms / lines.length));
            gcBuzz([40, 60, 40, 60, 40, 60, 40]);
            gcLater(gcFreeze, ms);
        }
        function gcFreeze() {
            gc.mixing = false; gc.frozen = true;                     // 공이 그 자리에서 딱!
            gq('gcDome').classList.remove('mixing');
            gcStopRumble();
            gc.led = 'all'; gcRenderBulbs();
            gq('gcBody').classList.add('flash');
            gcSfx.allOn(); gcBuzz(80);
            gq('gcSay').textContent = '…!';
            gcLater(() => {
                gc.frozen = false;
                gq('gcBody').classList.remove('flash');
                const cap = gq('gcCapsule');
                cap.style.setProperty('--cap', GC_CAPS[Math.floor(Math.random() * GC_CAPS.length)]);
                cap.className = 'gc-capsule show dropin' + (gc.outcome.kind !== 'miss' ? ' lucky' : '');
                gcSfx.thud(); gcBuzz([30, 40, 20]);
                gq('gcSay').textContent = '덜컹! 데구르르…';
                gc.taps = 0;
                gcLater(() => { gc.led = 'idle'; }, 1400);
                gcLater(() => { gc.stage = 'opening'; gq('gcTap').hidden = false; gq('gcSay').textContent = '캡슐이 나왔어요! 톡톡 눌러 열어 봐요'; cap.focus({ preventScroll: true }); }, 900);
            }, 1100);
        }

        /* ---------- 4. 캡슐 열기 (세 번) ---------- */
        function gcTapCapsule() {
            if (gc.stage !== 'opening') return;
            const cap = gq('gcCapsule');
            gc.taps++;
            cap.classList.remove('t1', 't2', 't3', 'dropin'); void cap.offsetWidth;
            cap.classList.add('t' + Math.min(gc.taps, 3));
            gcSfx.twist(gc.taps); gcBuzz(gc.taps * 25);
            if (gc.taps < 3) { gq('gcSay').textContent = gc.taps === 1 ? '딸깍…' : '끼익… 뭔가 반짝이는데?!'; return; }
            gc.stage = 'reveal';
            gq('gcTap').hidden = true;
            gq('gcSay').textContent = '두근두근…';
            for (let i = 0; i < 10; i++) gcTone(200 + i * 40, .07, 'square', .05, i * .08);
            gcLater(() => { cap.classList.add('open'); gcSfx.pop(); gcBuzz(60); }, 900);
            gcLater(gcShowResult, 1300);
        }

        /* ---------- 5. 결과 ---------- */
        function gcShowResult() {
            gc.stage = 'done';
            const box = gq('gcResult'), o = gc.outcome, k = capsList().find(x => x.id === o.id);
            box.hidden = false;
            if (o.kind !== 'sticker' || !k) {
                box.className = 'gc-result';
                gcSfx.miss();
                box.innerHTML = `<h3>꽝!</h3>
                    <div class="gc-fortune">🍀 오늘의 말랑 한마디<br><b>${GACHA_FORTUNES[Math.floor(Math.random() * GACHA_FORTUNES.length)]}</b></div>`;
                gq('gcSay').textContent = '아쉬워요! 다음 코인을 기대해요';
            } else {
                box.className = 'gc-result win';
                gcSfx.win(); gcBuzz([60, 40, 60, 40, 120]); gcConfetti();
                const [, mm, dd] = o.until.split('-');
                box.innerHTML = `<h3>🎉 당첨!</h3>
                    <img class="gc-prize gc-stk" alt="${k.name}" src="${capsUrl(k)}">
                    <p><b>🎁 ${k.name}</b><br>캡슐 스티커 <b>30일 선물권</b>이 도착했어요 💝</p>
                    <p class="gc-small">${+mm}월 ${+dd}일까지 ✏️ 스티커 창의 🎁 캡슐 스티커에서 붙일 수 있어요</p>
                    <button class="gc-main" type="button" onclick="capsStickerAdd('${k.id}', true)">📌 오늘 다이어리에 붙이기</button>`;
                gq('gcSay').textContent = '축하해요! 정말 운이 좋아요!';
            }
            if (o.coins > 0 || gc.test) {                          // 코인이 남았으면 바로 한 번 더
                const again = document.createElement('button');
                again.type = 'button'; again.className = 'gc-main gc-again';
                again.textContent = gc.test ? '🔁 한 번 더 돌리기 (테스트 모드)' : `🪙 코인 하나 더 넣기 (${o.coins}개 남음)`;
                again.onclick = () => { gcReset(); gcSetCoin(gc.test ? 1 : o.coins); gq('gcCapsule').scrollIntoView({ block: 'center', behavior: 'smooth' }); };
                box.appendChild(again);
            }
        }

        /* ---------- 기계 안 공 · 전구 그리기 ---------- */
        function gcStep() {
            if (gc.frozen) return;
            const W = 500, H = 460, floor = H - 8, cx = W / 2, cy = H * .55, R = W / 2 - 10, balls = gc.balls;
            if (gc.mixing && --gc.swirlFlip <= 0) { gc.swirl = Math.random() < .5 ? -1 : 1; gc.swirlFlip = 40 + Math.random() * 70; }
            for (const b of balls) {
                b.vy += .5;
                if (gc.mixing) {                                       // 사방으로 툭툭 · 소용돌이 · 바닥 바람
                    const ang = Math.random() * Math.PI * 2, mag = .8 + Math.random() * 1.4;
                    b.vx += Math.cos(ang) * mag; b.vy += Math.sin(ang) * mag;
                    const dx0 = b.x - cx, dy0 = b.y - cy, d0 = Math.hypot(dx0, dy0) || 1;
                    b.vx += -dy0 / d0 * .55 * gc.swirl; b.vy += dx0 / d0 * .55 * gc.swirl;
                    if (b.y + b.r > floor - 30) { b.vy -= 2.2 + Math.random() * 3.5; b.vx += (Math.random() - .5) * 4; }
                    const sp = Math.hypot(b.vx, b.vy); if (sp > 15) { b.vx *= 15 / sp; b.vy *= 15 / sp; }
                }
                b.vx *= gc.mixing ? .99 : .97; b.vy *= gc.mixing ? .99 : .97;
                b.x += b.vx; b.y += b.vy; b.a += b.vx * .03;
                const e = gc.mixing ? .9 : .35;
                if (b.y + b.r > floor) { b.y = floor - b.r; b.vy = -Math.abs(b.vy) * e; b.vx *= .92; }
                if (b.x - b.r < 10) { b.x = 10 + b.r; b.vx = Math.abs(b.vx) * e; }
                if (b.x + b.r > W - 10) { b.x = W - 10 - b.r; b.vx = -Math.abs(b.vx) * e; }
                const ddx = b.x - cx, ddy = b.y - cy, d = Math.hypot(ddx, ddy);
                if (b.y < cy && d + b.r > R) {
                    const nx = ddx / d, ny = ddy / d, k = (R - b.r) / d;
                    b.x = cx + ddx * k; b.y = cy + ddy * k;
                    const vn = b.vx * nx + b.vy * ny;
                    if (vn > 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; }
                }
            }
            for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
                const a = balls[i], b = balls[j], ddx = b.x - a.x, ddy = b.y - a.y, d = Math.hypot(ddx, ddy), m = a.r + b.r;
                if (d > 0 && d < m) {
                    const o = (m - d) / 2, nx = ddx / d, ny = ddy / d;
                    a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o;
                    const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
                    if (rv < 0) { const imp = rv * (gc.mixing ? .95 : .6); a.vx += imp * nx; a.vy += imp * ny; b.vx -= imp * nx; b.vy -= imp * ny; }
                }
            }
        }
        function gcSprite(r, color) {                          // 공 하나의 그림 (위쪽 색 · 아래쪽 투명 · 테두리 · 반짝) 을 미리 그려 둬요
            const pad = 4, sz = Math.ceil((r + pad) * 2), cv = document.createElement('canvas');
            cv.width = cv.height = sz;
            const g = cv.getContext('2d'); g.translate(sz / 2, sz / 2);
            g.beginPath(); g.arc(0, 0, r, Math.PI, 0); g.closePath(); g.fillStyle = color; g.fill();
            g.beginPath(); g.arc(0, 0, r, 0, Math.PI); g.closePath(); g.fillStyle = 'rgba(235,245,255,.85)'; g.fill();
            g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
            g.beginPath(); g.moveTo(-r, 0); g.lineTo(r, 0); g.stroke();
            g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-r * .35, -r * .5, r * .22, r * .12, -.5, 0, Math.PI * 2); g.fill();
            return cv;
        }
        function gcDraw() {
            const cv = gq('gcCanvas'), g = cv.getContext('2d');
            g.clearRect(0, 0, cv.width, cv.height);
            for (const b of gc.balls) {
                if (!b.img) b.img = gcSprite(b.r, b.c);
                g.save(); g.translate(b.x, b.y); g.rotate(b.a);
                g.drawImage(b.img, -b.img.width / 2, -b.img.height / 2);
                g.restore();
            }
        }
                function gcRenderBulbs() {
            const N = gc.bulbs.length;
            gc.bulbs.forEach((el, i) => {
                const on = gc.led === 'all' ? true : gc.led === 'spin' ? ((i - gc.ledPos) % N + N) % N < 5 : (i + gc.ledPos) % 3 === 0;
                el.classList.toggle('on', on);
            });
        }
        /* 프레임 속도와 상관없이 1초에 60걸음 (120Hz 아이패드도 · 잠깐 끊겨도 같은 속도) */
        const GC_STEP_MS = 1000 / 60;
        function gcLoop(t) {
            if (!gc.open) return;
            t = t || performance.now();
            const dt = gc.lastT ? Math.min(100, t - gc.lastT) : GC_STEP_MS;
            gc.lastT = t; gc.acc += dt;
            if (!gc.frozen) while (gc.acc >= GC_STEP_MS && (gc.acc -= GC_STEP_MS, ++gc.steps) <= 4) gcStep();
            gc.steps = 0;
            if (gc.acc > GC_STEP_MS * 4) gc.acc = 0;                     // 오래 멈췄다 돌아와도 한꺼번에 몰아서 계산하지 않아요
            gcDraw();
            let gap = 420;
            if (gc.led === 'spin') { const k = Math.min(1, (t - gc.mixStart) / (gc.mixMs || GACHA_MIX_MS)); gap = 110 - 85 * k; }   // 점점 빨라짐
            if (gc.led !== 'all' && t - gc.ledLast > gap) {
                gc.ledLast = t; gc.ledPos = (gc.ledPos + 1) % gc.bulbs.length; gcRenderBulbs();
                if (gc.led === 'spin' && t - gc.toneAt > 70) { gc.toneAt = t; gcTone(900 + (gc.ledPos % 5) * 90, .03, 'square', .025); }   // 삑삑 소리는 너무 촘촘하지 않게
            }
            gc.raf = requestAnimationFrame(gcLoop);
        }

        /* ---------- 소리 (파일 없이 WebAudio) · 진동 ---------- */
        const gcAudio = () => typeof sndFx === 'function' ? sndFx() : null;     // 연출 소리가 꺼져 있으면 null (js/sound.js)
        const gcUnlockAudio = () => { if (typeof sndUnlock === 'function') sndUnlock(); };     // 화면을 누를 때 소리 깨우기 (js/sound.js)
        function gcTone(freq, dur, type = 'sine', vol = .15, when = 0, slideTo) {
            const a = gcAudio(); if (!a) return;
            if (a.state !== 'running') { try { a.resume().catch(() => {}); } catch (e) {} }          // 잠들어 있으면 깨우기 (깨어나면 이어서 들려요)
            const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
            o.type = type; o.frequency.setValueAtTime(freq, t);
            if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
            o.connect(g).connect(sndOut()); o.start(t); o.stop(t + dur + .02);
        }
        const gcSfx = {
            coin() { gcTone(1900, .08, 'triangle', .12); gcTone(2500, .18, 'triangle', .1, .07); gcTone(700, .12, 'square', .05, .6); },
            tick() { gcTone(320, .04, 'square', .07); },
            thud() { gcTone(140, .25, 'sine', .3, 0, 60); gcTone(900, .05, 'triangle', .06, .25); gcTone(800, .05, 'triangle', .05, .45); },
            twist(n) { gcTone(300 + n * 160, .18, 'sawtooth', .05, 0, 420 + n * 200); },
            pop() { gcTone(500, .12, 'sine', .22, 0, 1400); },
            win() { [523, 659, 784, 1047].forEach((f, i) => gcTone(f, .35, 'triangle', .14, .08 + i * .12)); gcTone(1568, .6, 'sine', .08, .6); },
            miss() { gcTone(392, .2, 'triangle', .12, .05); gcTone(330, .35, 'triangle', .12, .25); },
            allOn() { gcTone(110, .12, 'square', .18); [784, 988, 1175].forEach(f => gcTone(f, .5, 'triangle', .08, .06)); }
        };
        function gcStartRumble(ms) {
            const a = gcAudio(); if (!a) return;
            const t = a.currentTime;
            if (!gc.noise || gc.noise.ctx !== a) {                       // 지글지글 잡음은 한 번만 만들어 두고 계속 써요 (섞을 때마다 새로 만들면 버벅여요)
                const len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
                for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
                gc.noise = { ctx: a, buf: buf };
            }
            const n = a.createBufferSource(); n.buffer = gc.noise.buf; n.loop = true;
            const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1400, t + ms / 1000);
            const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(260, t + ms / 1000);
            const og = a.createGain(); og.gain.value = .035;
            const g = a.createGain(); g.gain.setValueAtTime(.02, t); g.gain.linearRampToValueAtTime(.16, t + ms / 1000);
            n.connect(lp).connect(g); o.connect(og).connect(g); g.connect(sndOut());
            n.start(t); o.start(t);
            gc.rumble = { n, o, g };
        }
        function gcStopRumble() {
            if (!gc.rumble) return; const t = snd.ac.currentTime;
            gc.rumble.g.gain.cancelScheduledValues(t); gc.rumble.g.gain.setValueAtTime(gc.rumble.g.gain.value, t); gc.rumble.g.gain.linearRampToValueAtTime(0, t + .04);
            gc.rumble.n.stop(t + .06); gc.rumble.o.stop(t + .06); gc.rumble = null;
        }
        function gcBuzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

        /* 꽃가루 */
        function gcConfetti() {
            if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const cv = gq('gcBurst'), g = cv.getContext('2d');
            cv.width = innerWidth; cv.height = innerHeight;
            const ps = Array.from({ length: 140 }, () => ({ x: innerWidth / 2, y: innerHeight * .45, vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4, r: 4 + Math.random() * 5, c: GC_BULBS[Math.floor(Math.random() * 5)], a: Math.random() * 6 }));
            let f = 0;
            (function anim() {
                g.clearRect(0, 0, cv.width, cv.height);
                for (const p of ps) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += .2; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); }
                if (++f < 160) requestAnimationFrame(anim); else g.clearRect(0, 0, cv.width, cv.height);
            })();
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['gacha'] = true;
