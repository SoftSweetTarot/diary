/* 말랑달콤 다이어리 - js/fortune.js
   🔮 포춘카드 : 마음속 질문 하나를 떠올리고 카드 한 장을 골라 메시지를 받아요 (놀이터 → 🔮 포춘카드)
   - 카드 고르기는 '포춘카드 서버'(구글 앱스크립트)가 해요. 다이어리 코드에는 카드 목록이 없어요.
     서버 코드 : 포춘카드_앱스크립트.gs (포춘카드 시트 → 확장 프로그램 → Apps Script 에 붙여 넣기)
     배포한 웹 앱 주소를 아래 FORTUNE_API_URL 에 넣어요.
   - 로그인하지 않아도(둘러보기) 뽑을 수 있어요. 뽑은 카드는 📌 다이어리에 붙일 수 있어요.
   ※ 이 파일이 없어도 다이어리는 정상 동작 (포춘카드만 '준비 중')
   ※ 파일 불러오는 순서: … → service → gacha → bgm → fortune */

        const FORTUNE_API_URL = 'https://script.google.com/macros/s/AKfycbwWsQSPOirHEvIb1K3v-GUrzr7zYMgnQtj7loWVDCMKdWvzRTUuly24NYwqQomm-GSrSA/exec';                     // ← 포춘카드 앱스크립트 웹 앱 주소 (https://script.google.com/macros/s/…/exec)
        const FC_TIMEOUT_MS = 12000;                    // 서버가 이보다 늦으면 '다시 해 주세요'
        const FC_FAN = 7;                               // 펼쳐 놓는 카드 수

        const fc = { built: false, open: false, stage: 'intro', req: null, card: null, last: -1, timers: [], noise: null };
        const fq = id => document.getElementById(id);
        function fcLater(fn, ms) { const t = setTimeout(fn, ms); fc.timers.push(t); return t; }
        function fcClearTimers() { fc.timers.forEach(clearTimeout); fc.timers = []; }

        /* ---------- 포춘카드 서버 : 카드 한 장 받기 + 이미지 미리 받기 ---------- */
        function fcRequest() {
            const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), FC_TIMEOUT_MS);
            const url = FORTUNE_API_URL + '?action=draw&last=' + fc.last + '&t=' + Date.now();
            return fetch(url, { credentials: 'omit', signal: ctl.signal })
                .then(r => r.json())
                .then(d => {
                    if (!d || !d.ok) throw new Error((d && d.error) || 'server');
                    fc.last = d.n;
                    const src = d.id ? 'https://lh3.googleusercontent.com/d/' + d.id : d.url;
                    const card = { id: d.id, src, show: d.id ? src + '=w1000' : src, text: d.text || '' };
                    return new Promise(res => {                          // 이미지를 다 받아 둔 뒤에 뒤집어야 깔끔해요
                        const img = new Image();
                        img.onload = () => { card.w = img.naturalWidth; card.h = img.naturalHeight; res(card); };
                        img.onerror = () => { card.bad = true; res(card); };
                        img.src = card.show;
                    });
                })
                .finally(() => clearTimeout(timer));
        }

        /* ---------- 화면 ---------- */
        function fcBuild() {
            if (fc.built) return;
            fc.built = true;
            const el = document.createElement('div');
            el.id = 'fortuneRoom';
            el.className = 'fc-room';
            el.innerHTML = `
              <div class="fc-sky" aria-hidden="true"><i class="fc-aurora a1"></i><i class="fc-aurora a2"></i><i class="fc-stars"></i><i class="fc-stars s2"></i></div>
              ${typeof sndFxBtn === 'function' ? sndFxBtn('fc-x fc-left') : ''}
              <button class="fc-x" type="button" onclick="closeFortuneCard()" aria-label="닫기">✕</button>
              <div class="fc-wrap">
                <section class="fc-stage" id="fcIntro">
                  <div class="fc-orb">🔮</div>
                  <h2 class="fc-title">카드가 건네는 메시지</h2>
                  <p class="fc-sub">마음속 질문 하나에, 한 번의 메시지만 효력이 있어요</p>
                  <button class="fc-btn" type="button" onclick="fcStart()">시작하기</button>
                </section>
                <section class="fc-stage" id="fcThink" hidden>
                  <p class="fc-say" id="fcSay"></p>
                  <div class="fc-fan" id="fcFan"></div>
                  <p class="fc-hint" id="fcHint"></p>
                </section>
                <section class="fc-stage" id="fcReveal" hidden>
                  <div class="fc-card-3d" id="fcCard">
                    <div class="fc-face fc-back"><span>🌙</span></div>
                    <div class="fc-face fc-front"><img id="fcImg" alt="뽑은 카드"></div>
                    <div class="fc-count" id="fcCount"></div>
                  </div>
                  <p class="fc-msg" id="fcMsg"></p>
                  <div class="fc-actions" id="fcActions">
                    <button class="fc-btn" type="button" onclick="fcStick()">📌 다이어리에 붙이기</button>
                    <button class="fc-btn ghost" type="button" onclick="fcAgain()">🔮 다른 질문하기</button>
                  </div>
                </section>
              </div>`;
            document.body.appendChild(el);
            fq('fcSay').addEventListener('click', () => { if (fc.stage === 'think') fcAskPick(); });   // 글을 누르면 기다리지 않고 바로
        }

        function fcShow(id) {
            ['fcIntro', 'fcThink', 'fcReveal'].forEach(s => { fq(s).hidden = s !== id; });
            fq('fortuneRoom').scrollTop = 0;
        }
        function fcFadeText(el, text) {                                  // 글이 스르르 바뀌기 (+ 신비로운 소리)
            el.classList.remove('on');
            fcLater(() => { el.textContent = text; el.classList.add('on'); fcWhisper(); }, 450);
        }

        function openFortuneCard() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            fcBuild();
            fq('fortuneRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            fc.open = true;
            fcReset();
            if (typeof warmServer === 'function') warmServer(FORTUNE_API_URL);
        }
        function closeFortuneCard() {
            fc.open = false;
            fcClearTimers();
            const room = fq('fortuneRoom'); if (room) room.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        function fcReset() {
            fcClearTimers();
            fc.stage = 'intro'; fc.req = null; fc.card = null;
            fcShow('fcIntro');
        }
        function fcAgain() { fcReset(); }

        /* 1. 시작 → 마음속 질문 떠올리기 (이때 서버에 미리 카드를 받아 둬요) */
        function fcStart() {
            fcSound();
            fc.stage = 'think';
            fc.req = fcRequest();
            fc.req.catch(() => {});
            fcShow('fcThink');
            fq('fcFan').innerHTML = ''; fq('fcFan').classList.remove('on', 'picked');
            fq('fcHint').textContent = '';
            const say = fq('fcSay');
            say.classList.remove('on'); say.textContent = '';
            fcFadeText(say, '카드로 알고 싶은 것을\n마음속에 떠올려 보세요.');
            fcLater(fcAskPick, 4200);
        }

        /* 2. 카드 펼치기 → 마음이 가는 카드 한 장 고르기 */
        function fcAskPick() {
            if (fc.stage !== 'think') return;
            fc.stage = 'pick';
            fcClearTimers();
            fcFadeText(fq('fcSay'), '준비되셨다면\n마음이 가는 카드 한 장을\n골라 주세요.');
            const fan = fq('fcFan');
            fan.innerHTML = '';
            for (let i = 0; i < FC_FAN; i++) {
                const c = document.createElement('button');
                c.type = 'button'; c.className = 'fc-mini';
                c.setAttribute('aria-label', (i + 1) + '번째 카드');
                c.style.setProperty('--i', i - (FC_FAN - 1) / 2);
                c.innerHTML = '<span>🌙</span>';
                c.onclick = () => fcPick(c);
                fan.appendChild(c);
            }
            fcLater(() => { fan.classList.add('on'); fcFanSound(); }, 500);
        }

        /* 3. 고른 카드 → 3 · 2 · 1 → 뒤집기 */
        async function fcPick(btn) {
            if (fc.stage !== 'pick') return;
            fc.stage = 'opening';
            fcSound(); fcChime([660], 0.12);
            const fan = fq('fcFan');
            btn.classList.add('chosen'); fan.classList.add('picked');
            fq('fcSay').classList.remove('on');
            await new Promise(r => fcLater(r, 700));
            if (!fc.open) return;
            fcShow('fcReveal');
            const card = fq('fcCard'), count = fq('fcCount');
            card.className = 'fc-card-3d glow';
            card.style.removeProperty('--ratio');
            fq('fcMsg').classList.remove('on'); fq('fcMsg').textContent = '';
            fq('fcActions').classList.remove('on');
            for (let n = 3; n >= 1; n--) {
                count.textContent = n; count.classList.remove('pop'); void count.offsetWidth; count.classList.add('pop');
                fcChime([523 + (3 - n) * 130], 0.08);
                await new Promise(r => fcLater(r, 900));
                if (!fc.open) return;
            }
            count.textContent = '';
            let data;
            const slow = fcLater(() => { count.textContent = '✨'; fq('fcMsg').textContent = '카드를 펼치는 중이에요…'; fq('fcMsg').classList.add('on'); }, 300);
            try {
                data = await fc.req;
                clearTimeout(slow);
            } catch (e) {
                clearTimeout(slow);
                if (!fc.open) return;
                fcFail(e);
                return;
            }
            if (!fc.open) return;
            fc.card = data;
            fcReveal(data);
        }

        function fcReveal(d) {
            fc.stage = 'done';
            const card = fq('fcCard'), img = fq('fcImg'), msg = fq('fcMsg');
            fq('fcCount').textContent = '';
            msg.classList.remove('on'); msg.textContent = '';
            if (d.w && d.h) card.style.setProperty('--ratio', d.w / d.h);
            img.src = d.bad ? '' : d.show;
            card.classList.toggle('broken', !!d.bad);
            card.classList.add('flip');
            fcChime([784, 988, 1175, 1568], 0.18);
            fcLater(() => {
                msg.textContent = d.bad ? (d.text || '') + (d.text ? '\n\n' : '') + '(카드 그림을 불러오지 못했어요)' : d.text;
                msg.classList.add('on');
            }, 1100);
            fcLater(() => fq('fcActions').classList.add('on'), 2600);
        }

        function fcFail(e) {
            fc.stage = 'done';
            const msg = fq('fcMsg');
            fq('fcCount').textContent = '';
            fq('fcCard').className = 'fc-card-3d';
            msg.textContent = e && e.message === 'empty' ? '아직 준비된 카드가 없어요.\n조금만 기다려 주세요!'
                : e && e.name === 'AbortError' ? '카드를 받아 오는 데 너무 오래 걸렸어요.\n잠시 후 다시 해 주세요.'
                : '카드를 받아 오지 못했어요.\n인터넷 연결을 확인하고 다시 해 주세요.';
            msg.classList.add('on');
            fq('fcActions').classList.add('on');
        }

        /* 4. 뽑은 카드를 다이어리에 붙이기 */
        function fcStick() {
            if (!fc.card || fc.card.bad) { toast('붙일 카드 그림이 없어요'); return; }
            if (typeof addImage !== 'function') return;
            closeFortuneCard();
            if (addImage(fc.card.src)) toast('📌 카드를 다이어리에 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
        }

        /* ---------- 소리 : 맑은 종소리 (파일 없이 만들어요 · 아이폰 무음 모드에서도 들리게) ---------- */
        const fcSound = () => typeof sndFx === 'function' ? sndFx() : null;      // 연출 소리가 꺼져 있으면 null (js/sound.js)
        function fcChime(freqs, vol) {
            const ac = fcSound(); if (!ac) return;
            freqs.forEach((f, i) => {
                const t = ac.currentTime + i * 0.11, g = ac.createGain();
                g.gain.setValueAtTime(0.0001, t);
                g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
                g.connect(sndOut());
                [[1, 1], [2.76, 0.18]].forEach(([m, a]) => {
                    const o = ac.createOscillator(), og = ac.createGain();
                    o.type = 'sine'; o.frequency.value = f * m; og.gain.value = a;
                    o.connect(og).connect(g); o.start(t); o.stop(t + 1.7);
                });
            });
        }

        function fcAir(dur, vol, at, f1, f2) {                         // 바람 · 카드 스치는 소리
            const ac = fcSound(); if (!ac) return;
            if (!fc.noise) { const n = ac.sampleRate, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; fc.noise = b; }
            const t = ac.currentTime + at, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
            s.buffer = fc.noise; s.loop = true; f.type = 'bandpass'; f.Q.value = .9; f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + dur);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * .4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            s.connect(f).connect(g).connect(sndOut()); s.start(t); s.stop(t + dur + .05);
        }
        function fcBell(f, at, vol, len) {                              // 하프 같은 맑은 음 하나
            const ac = fcSound(); if (!ac) return;
            const t = ac.currentTime + at, g = ac.createGain();
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
            g.connect(sndOut());
            [[1, 1], [2.01, .25], [3.9, .06]].forEach(([m, a]) => { const o = ac.createOscillator(), og = ac.createGain(); o.frequency.value = f * m; og.gain.value = a; o.connect(og).connect(g); o.start(t); o.stop(t + len + .05); });
        }
        /* 글이 떠오를 때 : 바람이 스르르 + 하프가 천천히 올라가요 */
        function fcWhisper() {
            fcAir(2.2, .05, 0, 500, 2600);
            [392, 523, 659, 784, 1047].forEach((f, i) => fcBell(f, .1 + i * .16, .06, 1.8));
        }
        /* 카드가 부채처럼 펼쳐질 때 : 한 장씩 '촤라락' + 반짝 */
        function fcFanSound() {
            for (let k = 0; k < FC_FAN; k++) { fcAir(.14, .09, k * .06, 2600, 5200); fcBell(1175 + k * 90, k * .06 + .02, .025, .3); }
            [784, 988, 1319, 1568].forEach((f, i) => fcBell(f, FC_FAN * .06 + .15 + i * .07, .06, 1.4));
        }

        document.addEventListener('keydown', e => { if (e.key === 'Escape' && fc.open) closeFortuneCard(); });

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['fortune'] = true;
