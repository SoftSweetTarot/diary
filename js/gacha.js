/* 말랑달콤 다이어리 - js/gacha.js
   🎁 랜덤박스 : 문방구 캡슐 뽑기 기계 (구글 계정당 하루 한 번)
   - 당첨 결정 · 하루 한 번 확인 · 상품 링크는 모두 '랜덤박스 서버'(구글 앱스크립트)가 해요.
     다이어리 코드에는 상품 링크도 확률 계산도 없어서, 코드를 열어 봐도 상품을 미리 볼 수 없어요.
   - 서버 코드 : 랜덤박스_앱스크립트.gs (랜덤박스 시트 → 확장 프로그램 → Apps Script 에 붙여 넣기)
     배포한 웹 앱 주소를 아래 GACHA_API_URL 에 넣어요.
   - 로그인한 사용자만 돌릴 수 있어요 (구글 계정으로 하루 한 번을 확인하기 때문)
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
            raf: 0, ac: null, rumble: null, sound: true, timers: []
        };
        const gq = id => document.getElementById(id);

        /* ---------- 랜덤박스 서버와 이야기하기 ----------
           보내는 것 : 다이어리 로그인 정보(토큰) — 서버가 구글에 '누구인지'만 확인해요
           받는 것   : status → { used, odds } · play → { kind: 'miss'|'image'|'video', url } */
        function gcUseDrive() { return typeof drive !== 'undefined' && drive.ready && !drive.guest; }
        async function gcApi(action) {
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
            used: '오늘은 이미 돌렸어요. 내일 또 만나요!'
        };
        function gcDriveId(u) {
            let m = String(u).match(/drive\.google\.com\/file\/d\/([\w-]{10,})/);
            if (!m && /drive\.google\.com|docs\.google\.com/.test(u)) m = String(u).match(/[?&]id=([\w-]{10,})/);
            return m ? m[1] : null;
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
                  <div class="gc-title">🎁 말랑 캡슐뽑기</div>
                  <span class="gc-chip" id="gcChip"><span class="gc-coin-ico">말</span><span id="gcChipText">오늘의 코인 1개</span></span>
                  <button class="gc-x" type="button" onclick="closeGacha()" aria-label="닫기">✕</button>
                </div>
                <div class="gc-machine">
                  <div class="gc-dome" id="gcDome"><canvas id="gcCanvas" width="500" height="460"></canvas></div>
                  <div class="gc-body" id="gcBody">
                    <div class="gc-label">MALANG CAPSULE<small>하루 한 번 · 무료</small></div>
                    <div class="gc-slot"><i></i><div class="gc-coin" id="gcCoin">말</div><span>코인 1개</span></div>
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
                <button class="gc-main" id="gcInsert" type="button">🪙 말랑 코인 넣기</button>
                <div class="gc-result" id="gcResult" hidden></div>
                <details class="gc-odds"><summary>🎲 확률 안내</summary><table id="gcOdds"></table>
                  <p>하루에 한 번 돌릴 수 있어요. 밤 12시가 지나면 코인이 다시 생겨요.</p></details>
                <button class="gc-sound" id="gcSound" type="button">🔊 소리 켜짐</button>
              </div>
              <canvas class="gc-burst" id="gcBurst"></canvas>`;
            document.body.appendChild(el);

            /* 기계 안 캡슐 */
            const W = 500, H = 460;
            gc.balls = Array.from({ length: 22 }, (_, i) => ({
                x: 70 + Math.random() * (W - 140), y: 120 + Math.random() * (H - 200),
                vx: 0, vy: 0, r: 34 + Math.random() * 6, c: GC_CAPS[i % GC_CAPS.length], a: Math.random() * 6
            }));
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

            el.addEventListener('pointerdown', gcUnlockAudio, true);      // 랜덤박스 화면 어디를 눌러도 소리 깨우기
            el.addEventListener('keydown', gcUnlockAudio, true);
            gq('gcInsert').onclick = gcInsertCoin;
            gq('gcCapsule').onclick = gcTapCapsule;
            gq('gcSound').onclick = () => { gcUnlockAudio(); gc.sound = !gc.sound; gq('gcSound').textContent = gc.sound ? '🔊 소리 켜짐' : '🔇 소리 꺼짐'; if (!gc.sound) gcStopRumble(); };
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

        function gcRenderOdds(odds) {
            const v = odds ? odds.video : 2000, im = odds ? odds.image : 8000;
            const pct = n => (n / 10000).toFixed(n && n < 10000 ? 1 : 0) + '%';
            gq('gcOdds').innerHTML = `<tr><td>🎬 말랑 영상</td><td>${pct(v)}</td></tr><tr><td>🖼 말랑 이미지</td><td>${pct(im)}</td></tr><tr><td>🍀 꽝 (오늘의 한마디)</td><td>${pct(1000000 - v - im)}</td></tr>`;
        }

        /* ---------- 열기 · 닫기 ---------- */
        async function openGacha() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            gcBuild();
            gcUnlockAudio();                                   // 놀이터에서 누른 순간에 소리 미리 깨우기
            gq('gachaRoom').classList.add('show');
            gc.open = true;
            gcReset();
            gcLoop();
            gcRenderOdds(null);
            gcSetCoin('checking');
            const r = await gcApi('status');
            if (!gc.open || gc.stage !== 'idle') return;
            gc.test = !!(r.ok && r.test);
            if (r.ok) { gcRenderOdds(r.odds); gcSetCoin(r.used ? 'used' : 'ready'); }
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
        /* 코인 상태 : checking(확인 중) · ready(오늘 1개) · used(오늘 씀) · error(로그인 필요 등) */
        function gcSetCoin(state, err) {
            const chip = gq('gcChip'), txt = gq('gcChipText'), btn = gq('gcInsert'), say = gq('gcSay');
            chip.classList.toggle('empty', state !== 'ready');
            txt.textContent = gc.test && state !== 'error' && state !== 'checking' ? '🧪 테스트 모드 · 무제한'
                : { checking: '코인 확인 중…', ready: '오늘의 코인 1개', used: '오늘 코인을 썼어요', error: '코인 없음' }[state];
            btn.disabled = state !== 'ready';
            say.textContent = state === 'ready' ? '코인을 넣고 손잡이를 돌려 보세요!'
                : state === 'used' ? GC_ERR.used : state === 'checking' ? '…' : (GC_ERR[err] || GC_ERR.server);
        }

        /* ---------- 1. 코인 넣기 ---------- */
        async function gcInsertCoin() {
            if (gc.stage !== 'idle') return;
            gcUnlockAudio();
            gc.stage = 'asking';
            gq('gcInsert').disabled = true;
            gq('gcSay').textContent = '코인을 확인하고 있어요…';
            const r = await gcApi('play');                  // 결과는 서버가 정해요 (연출은 그대로)
            if (!gc.open) return;
            if (!r.ok) {
                gc.stage = 'idle';
                if (r.odds) gcRenderOdds(r.odds);
                gcSetCoin(r.error === 'used' ? 'used' : 'error', r.error);
                return;
            }
            gc.outcome = { kind: r.kind, url: r.url || '', odds: r.odds };
            gc.test = !!r.test;
            gc.stage = 'coin';
            gcSetCoin('used'); gq('gcSay').textContent = '';
            const coin = gq('gcCoin'); coin.classList.remove('drop'); void coin.offsetWidth; coin.classList.add('drop');
            gcSfx.coin(); gcBuzz(20);
            gq('gcSay').textContent = '짤랑! 코인이 들어갔어요';
            gcLater(() => {
                gc.stage = 'turning'; gc.turned = 0; gc.ticks = 0;
                const c = gq('gcCrank'); c.disabled = false; c.classList.add('ready');
                gq('gcCrankHint').textContent = '손잡이를 한 바퀴 돌려요 ↻';
                gq('gcSay').textContent = '손잡이를 끝까지 돌려 주세요!';
                c.focus({ preventScroll: true });
            }, 800);
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
            const box = gq('gcResult'), o = gc.outcome;
            box.hidden = false;
            if (o.kind === 'miss') {
                box.className = 'gc-result';
                gcSfx.miss();
                box.innerHTML = `<h3>꽝!</h3>
                    <div class="gc-fortune">🍀 오늘의 말랑 한마디<br><b>${GACHA_FORTUNES[Math.floor(Math.random() * GACHA_FORTUNES.length)]}</b></div>
                    <p>다음 코인까지 <span class="gc-timer" id="gcTimer"></span></p>`;
                gq('gcSay').textContent = '아쉬워요! 내일 또 도전해요';
            } else {
                box.className = 'gc-result win';
                gcSfx.win(); gcBuzz([60, 40, 60, 40, 120]); gcConfetti();
                const id = gcDriveId(o.url);
                const dl = id ? `https://drive.google.com/uc?export=download&id=${id}` : o.url;
                const preview = o.kind === 'image'
                    ? `<img class="gc-prize" alt="당첨 이미지" src="${id ? 'https://lh3.googleusercontent.com/d/' + id : o.url}">`
                    : (id ? `<iframe class="gc-prize video" src="https://drive.google.com/file/d/${id}/preview" allow="autoplay" title="당첨 영상"></iframe>`
                          : `<video class="gc-prize video" src="${o.url}" controls playsinline></video>`);
                box.innerHTML = `<h3>🎉 당첨!</h3>
                    <p><b>${o.kind === 'image' ? '🖼 말랑 이미지' : '🎬 말랑 영상'}</b></p>
                    ${preview}
                    <a class="gc-main gc-dl" href="${dl}" target="_blank" rel="noopener">⬇ 내려받기</a>
                    <p class="gc-small">새 창에서 파일이 열리면 내려받기를 눌러 저장하세요.</p>
                    <p>다음 코인까지 <span class="gc-timer" id="gcTimer"></span></p>`;
                gq('gcSay').textContent = '축하해요! 정말 운이 좋아요!';
            }
            if (gc.test) {                                      // 🧪 테스트 모드 : 바로 한 번 더
                const again = document.createElement('button');
                again.type = 'button'; again.className = 'gc-main gc-again';
                again.textContent = '🔁 한 번 더 돌리기 (테스트 모드)';
                again.onclick = () => { gcReset(); gcRenderOdds(o.odds); gcSetCoin('ready'); gq('gcCapsule').scrollIntoView({ block: 'center', behavior: 'smooth' }); };
                box.appendChild(again);
                const t = box.querySelector('.gc-timer'); if (t) t.parentElement.remove();
            }
            gcTimer();
        }
        function gcTimer() {
            const el = gq('gcTimer'); if (!el || !gc.open) return;
            const kst = Date.now() + 9 * 3600000;               // 한국 시간 밤 12시까지 (서버와 같은 기준)
            const s = Math.max(0, Math.floor((86400000 - kst % 86400000) / 1000)), z = n => String(n).padStart(2, '0');
            el.textContent = `${z(Math.floor(s / 3600))}:${z(Math.floor(s % 3600 / 60))}:${z(s % 60)}`;
            gcLater(gcTimer, 1000);
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
        function gcDraw() {
            const cv = gq('gcCanvas'), g = cv.getContext('2d');
            g.clearRect(0, 0, cv.width, cv.height);
            for (const b of gc.balls) {
                g.save(); g.translate(b.x, b.y); g.rotate(b.a);
                g.beginPath(); g.arc(0, 0, b.r, Math.PI, 0); g.closePath(); g.fillStyle = b.c; g.fill();
                g.beginPath(); g.arc(0, 0, b.r, 0, Math.PI); g.closePath(); g.fillStyle = 'rgba(235,245,255,.85)'; g.fill();
                g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.12)'; g.beginPath(); g.arc(0, 0, b.r, 0, Math.PI * 2); g.stroke();
                g.beginPath(); g.moveTo(-b.r, 0); g.lineTo(b.r, 0); g.stroke();
                g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-b.r * .35, -b.r * .5, b.r * .22, b.r * .12, -.5, 0, Math.PI * 2); g.fill();
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
        function gcLoop(t) {
            if (!gc.open) return;
            gcStep(); gcDraw();
            t = t || performance.now();
            let gap = 420;
            if (gc.led === 'spin') { const k = Math.min(1, (t - gc.mixStart) / (gc.mixMs || GACHA_MIX_MS)); gap = 110 - 85 * k; }   // 점점 빨라짐
            if (gc.led !== 'all' && t - gc.ledLast > gap) {
                gc.ledLast = t; gc.ledPos = (gc.ledPos + 1) % gc.bulbs.length; gcRenderBulbs();
                if (gc.led === 'spin') gcTone(900 + (gc.ledPos % 5) * 90, .03, 'square', .025);
            }
            gc.raf = requestAnimationFrame(gcLoop);
        }

        /* ---------- 소리 (파일 없이 WebAudio) · 진동 ---------- */
        function gcAudio() { if (!gc.ac) { try { gc.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return gc.ac; }
        /* 🔊 소리 켜기 : 브라우저는 사용자가 화면을 누를 때만 소리를 허락해요.
           - 오디오가 '일시정지(suspended)' 상태로 시작하면 resume() 으로 깨우기
           - 아이폰 무음 모드에서도 들리게 : 아주 짧은 무음 소리를 한 번 재생해서 '미디어 재생' 모드로 바꾸기 */
        const GC_SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
        function gcUnlockAudio() {
            const a = gcAudio();
            if (a && a.state !== 'running') { try { a.resume(); } catch (e) {} }
            if (!gc.unlocked) {
                gc.unlocked = true;
                try {
                    const el = new Audio(GC_SILENT);
                    el.setAttribute('playsinline', ''); el.volume = 0;
                    const pr = el.play(); if (pr && pr.catch) pr.catch(() => {});
                } catch (e) {}
                try {                                            // 아이폰 사파리 : 무음 한 조각을 바로 재생해 오디오 길을 열어 둠
                    const b = a.createBuffer(1, 1, 22050), src = a.createBufferSource();
                    src.buffer = b; src.connect(a.destination); src.start(0);
                } catch (e) {}
            }
        }
        function gcTone(freq, dur, type = 'sine', vol = .15, when = 0, slideTo) {
            if (!gc.sound) return; const a = gcAudio(); if (!a) return;
            const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
            o.type = type; o.frequency.setValueAtTime(freq, t);
            if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
            o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
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
            if (!gc.sound) return; const a = gcAudio(); if (!a) return;
            const t = a.currentTime, len = a.sampleRate * 2, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            const n = a.createBufferSource(); n.buffer = buf; n.loop = true;
            const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1400, t + ms / 1000);
            const o = a.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(260, t + ms / 1000);
            const og = a.createGain(); og.gain.value = .035;
            const g = a.createGain(); g.gain.setValueAtTime(.02, t); g.gain.linearRampToValueAtTime(.16, t + ms / 1000);
            n.connect(lp).connect(g); o.connect(og).connect(g); g.connect(a.destination);
            n.start(t); o.start(t);
            gc.rumble = { n, o, g };
        }
        function gcStopRumble() {
            if (!gc.rumble) return; const a = gcAudio(), t = a.currentTime;
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
