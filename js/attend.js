/* 말랑달콤 다이어리 - js/attend.js
   📅 출석 도장판 : 하루에 한 번 도장을 꾹! (카페 → 매일 말랑 → 📅 출석 도장판)
   - 오늘 날짜에만 찍을 수 있어요. 지나간 날은 나중에 찍을 수 없어요.
   - 날마다 도장 그림이 달라요. (날짜로 정해져서 어느 기기에서 봐도 같은 그림)
   - 🪙 숨은 코인 : 달력에 한 달에 7번 말랑 코인이 숨어 있어요. 도장을 찍으면 그날 칸이 휘리릭 뒤집히다가 앞면이 보여요.
     숨은 날인지는 랜덤박스 서버만 알아요 (랜덤박스_앱스크립트.gs · stamp) · 몇 개 남았는지는 보여 주지 않아요 (모르는 게 더 두근두근)
     그날 도장을 못 찍으면 그 코인은 놓쳐요 · 찾은 코인으로 🎁 랜덤박스(js/gacha.js)에서 캡슐을 뽑아요
     로그인하지 않으면(게스트) 코인을 찾을 수 없어요
   - 기록은 설정(settings.json)에 암호로 저장 (🔐 js/drive.js 암호 보관) → 다른 기기에서도 같은 도장판. 게스트는 이 기기에 기억
   ※ 이 파일이 없어도 다이어리는 정상 동작 (출석 도장판만 '준비 중') */

        const AT_KEY = VAULT_KEYS[0];             // 🔐 암호 보관 (js/drive.js) → { "2026-10": [1,2,5], ... }
        const AT_STAMPS = ['🐰', '🍓', '🌷', '⭐', '🐻', '🍑', '🌈', '🐥', '🍀', '🧁', '🐱', '🌙', '🍒', '🦊', '🌻', '🐶', '🍰', '🐳', '🎀', '🐹', '🍋', '🦄', '🌸', '🐧', '🍩', '☁️', '🐨', '🍉', '🌼', '🐼', '💖'];
        const AT_COLORS = ['#e8546e', '#f08a3c', '#e2a400', '#4caf7a', '#3d9be0', '#8a6be0', '#e06bb5'];
        const atS = { built: false, y: 0, m: 0, d: null, busy: false };
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

        function atTotal() { return Object.values(atS.d).reduce((a, b) => a + b.length, 0); }

        /* ---------- 🪙 숨은 코인 : 랜덤박스 서버에 '오늘 도장 찍었어요' 알리기 ----------
           하루 한 번 · 같은 날 다시 물어봐도 같은 답 → 연결이 끊겨 못 물어봤으면 다음에 열 때 다시 물어봐요 */
        const AT_SENT = 'malang_stamp_sent';            // 서버에 알린 날 (이 기기)
        async function atAskCoin() {
            if (typeof gcApi !== 'function') return { ok: false, error: 'setup' };
            const r = await gcApi('stamp');
            if (r.ok) try { localStorage.setItem(AT_SENT, atDay()); } catch (e) {}
            return r;
        }
        function atDay() { const T = atToday(); return atYm(T.y, T.m) + '-' + String(T.d).padStart(2, '0'); }
        function atSent() { try { return localStorage.getItem(AT_SENT) === atDay(); } catch (e) { return false; } }

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
                <p class="at-tip">🪙 달력 어딘가에 <b>말랑 코인</b>이 숨어 있어요. 도장을 찍으면 그날 칸이 뒤집혀요. 코인이 나오면 🎁 랜덤박스에서 캡슐을 뽑을 수 있어요!<br>숨은 날에 도장을 못 찍으면 그 코인은 사라져요.</p>
              </div>
              <div class="at-flip-wrap" id="atFlipWrap" hidden>
                <div class="at-flip-stage">
                  <div class="at-card" id="atCard">
                    <div class="at-face at-front" id="atFront"></div>
                    <div class="at-face at-back"><b id="atBackDay"></b><small>말랑달콤</small></div>
                  </div>
                  <div class="at-flip-msg" id="atFlipMsg"></div>
                  <div class="at-flip-btns" id="atFlipBtns"></div>
                </div>
                <canvas class="at-burst" id="atBurst"></canvas>
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
            const done = atHas(T.y, T.m, T.d), go = atq('atGo');
            go.disabled = done;
            go.innerHTML = done ? '오늘 도장 찍었어요 · 내일 또 만나요' : `${atStamp(T.y, T.m, T.d).e} 오늘 도장 꾹!`;
        }

        function atMove(dir) {
            const T = atToday();
            let y = atS.y, m = atS.m + dir;
            if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
            if (y > T.y || (y === T.y && m > T.m)) return;
            atS.y = y; atS.m = m; atRender();
        }

        /* ---------- 📅 도장 꾹 → 칸이 휘리릭 뒤집히다가 앞면 공개 ---------- */
        const AT_SPIN_MIN = 2600;                        // 최소 뒤집기 시간 (서버 답이 빨라도 두근두근하게)
        const AT_MISS = ['오늘은 코인이 숨어 있지 않았어요', '여기엔 없었네요! 내일 또 찾아봐요', '꽁꽁 숨었나 봐요… 내일 만나요 🌙', '오늘도 와 줘서 고마워요 💕'];
        async function atPress() {
            const T = atToday();
            if (atHas(T.y, T.m, T.d) || atS.busy) return;
            atS.busy = true;
            const k = atYm(T.y, T.m);
            atS.d[k] = (atS.d[k] || []).concat(T.d).sort((a, b) => a - b);
            atWrite();
            atS.y = T.y; atS.m = T.m;
            atRender(true);
            atSfx.stamp();
            await atFlip(T, atAskCoin());
            atS.busy = false;
        }
        /* 큰 카드가 빙글빙글 → 서버 답 + 최소 시간이 지나면 천천히 멈추며 앞면 */
        async function atFlip(T, ask) {
            const wrap = atq('atFlipWrap'), card = atq('atCard'), s = atStamp(T.y, T.m, T.d);
            atq('atBackDay').textContent = (T.m + 1) + '월 ' + T.d + '일';
            atq('atFront').className = 'at-face at-front';
            atq('atFront').innerHTML = '';
            atq('atFlipMsg').textContent = '두근두근…'; atq('atFlipBtns').innerHTML = '';
            card.className = 'at-card'; void card.offsetWidth;
            wrap.hidden = false;
            await atLater(450);                                   // 칸이 커지며 떠오르기
            card.classList.add('spin');
            const ticks = setInterval(() => atSfx.tick(), 140);
            const [r] = await Promise.all([ask, atLater(AT_SPIN_MIN)]);
            clearInterval(ticks);
            if (!atq('attendRoom').classList.contains('show')) return;
            const hit = !!(r && r.ok && r.hit);
            atq('atFront').classList.add(hit ? 'coin' : 'miss');
            atq('atFront').innerHTML = hit ? '<span class="at-coin">말</span><b>말랑 코인!</b>' : `<em style="--c:${s.c}">${s.e}</em><b>${T.d}일 도장</b>`;
            card.classList.remove('spin'); card.classList.add('land');
            await atLater(1100);
            if (hit) {
                atSfx.win(); atConfetti();
                atq('atFlipMsg').innerHTML = '🎉 <b>숨은 말랑 코인</b>을 찾았어요!';
                atq('atFlipBtns').innerHTML = `<button class="at-go" type="button" onclick="atToBox()">🎁 랜덤박스에서 캡슐 뽑기</button>
                    <button class="at-pop-later" type="button" onclick="atFlipClose()">나중에 뽑을게요</button>`;
            } else {
                atSfx.miss();
                const why = r && r.error === 'login' ? '구글로 로그인하면 숨은 코인을 찾을 수 있어요'
                    : r && !r.ok ? '코인을 확인하지 못했어요. 다음에 열면 다시 확인해요' : AT_MISS[Math.floor(Math.random() * AT_MISS.length)];
                atq('atFlipMsg').textContent = why;
                atq('atFlipBtns').innerHTML = `<button class="at-go" type="button" onclick="atFlipClose()">좋아요</button>`;
            }
        }
        function atLater(ms) { return new Promise(r => setTimeout(r, ms)); }
        function atFlipClose() { const w = atq('atFlipWrap'); if (w) w.hidden = true; }
        function atToBox() { atFlipClose(); closeAttend(); if (typeof openGacha === 'function') openGacha(); }

        /* 소리 (연출 소리가 꺼져 있으면 조용히 · js/sound.js) */
        function atTone(f, dur, type, vol, at) {
            const a = typeof sndFx === 'function' ? sndFx() : null; if (!a) return;
            const t = a.currentTime + (at || 0), o = a.createOscillator(), g = a.createGain();
            o.type = type || 'sine'; o.frequency.value = f;
            g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
            o.connect(g).connect(sndOut()); o.start(t); o.stop(t + dur + .05);
        }
        const atSfx = {
            stamp() { atTone(160, .18, 'sine', .3); atTone(90, .25, 'triangle', .15, .02); },
            tick() { atTone(1300 + Math.random() * 400, .05, 'triangle', .06); },
            win() { [1319, 1568, 2093, 2637].forEach((f, i) => atTone(f, .5, 'triangle', .12, i * .09)); atTone(2637, .8, 'sine', .06, .45); },
            miss() { atTone(660, .25, 'triangle', .1); atTone(880, .35, 'triangle', .08, .12); }
        };
        function atConfetti() {
            if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            const cv = atq('atBurst'), g = cv.getContext('2d'), C = ['#ffd23f', '#ff7aa8', '#6cc4ff', '#9be27a', '#c79bff'];
            cv.width = innerWidth; cv.height = innerHeight;
            const ps = Array.from({ length: 120 }, () => ({ x: innerWidth / 2, y: innerHeight * .42, vx: (Math.random() - .5) * 15, vy: -Math.random() * 15 - 4, r: 4 + Math.random() * 5, c: C[Math.floor(Math.random() * C.length)], a: Math.random() * 6 }));
            let f = 0;
            (function anim() {
                g.clearRect(0, 0, cv.width, cv.height);
                for (const p of ps) { p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += .2; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); g.restore(); }
                if (++f < 150) requestAnimationFrame(anim); else g.clearRect(0, 0, cv.width, cv.height);
            })();
        }

        function openAttend() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            atBuild();
            atS.d = atRead();
            const T = atToday(); atS.y = T.y; atS.m = T.m;
            atq('attendRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            atRender();
            /* 오늘 도장은 찍었는데 서버에 못 알렸으면 (연결 끊김 등) 지금 다시 알리고, 코인이면 보여 줘요 */
            if (atHas(T.y, T.m, T.d) && !atSent() && !atS.busy) atAskCoin().then(r => { if (r.ok && r.hit && !r.again) { atS.busy = true; atFlip(T, Promise.resolve(r)).then(() => { atS.busy = false; }); } });
        }
        function closeAttend() {
            const r = atq('attendRoom'); if (r) r.classList.remove('show');
            atFlipClose();
            document.body.classList.remove('fc-lock');
        }
        function attendDone() { const T = atToday(), a = atRead()[atYm(T.y, T.m)]; return !!a && a.includes(T.d); }   // 오늘 도장 찍었나요?
        window.openAttend = openAttend;
        window.attendDone = attendDone;
