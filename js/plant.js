/* 말랑달콤 다이어리 - js/plant.js
   🌷 화분 키우기 : 일기를 쓴 날마다 물을 한 번 줄 수 있어요. (카페 → 매일 → 🌷 화분 키우기)
   - 물을 준 횟수만큼 자라요 : 씨앗 → 새싹 → 잎 → 꽃봉오리 → 꽃 → 열매
   - 열매를 따면 🧺 열매 도감(4가지)에 모이고, 새 씨앗을 심어요. (어떤 씨앗인지는 꽃이 필 때까지 비밀)
   - '이렇게 키워요' 안내 : 일기 쓰기 → 물 주기 → 물 10번 꽃 → 물 14번 열매 (처음엔 맨 위 · 물을 한 번 주면 아래로)
   - 사흘 넘게 물을 못 주면 시들시들해지지만 죽지는 않아요. 물을 주면 다시 기운을 차려요.
   - '오늘 일기를 썼는지' = 오늘 날짜 페이지에 글·스티커·그림이 하나라도 있는지
   - 화분 상태는 설정(설정.json)에 암호로 저장돼요 (🔐 js/drive.js 암호 보관) → 다른 기기에서도 같은 화분. (하루 한 번 물 줄 때만 바뀌어요)
     로그인하지 않은(게스트) 때만 이 기기에 기억해요.
   ※ 이 파일이 없어도 다이어리는 정상 동작 (화분 키우기만 '준비 중') */

        const PL_OPEN = false;                        // 🙈 지금은 숨겨 둬요 (나중에 펫 · 농장과 함께 공개) → true 로 바꾸고 카페 버튼의 hidden 을 지우면 다시 보여요
        const PL_KEY = VAULT_KEYS[1];                 // 🔐 암호 보관 (js/drive.js)
        const PL_STEPS = [0, 1, 3, 6, 10, 14];        // 이 횟수만큼 물을 주면 다음 단계
        const PL_STAGE = ['씨앗', '새싹', '잎', '꽃봉오리', '꽃', '열매'];
        const PL_THIRSTY_DAYS = 3;
        const PL_KINDS = {
            straw: { name: '딸기', icon: '🍓', petal: '#ffffff', core: '#f6c94c', fruit: '#e8384f', shape: 'heart' },
            tomato: { name: '방울토마토', icon: '🍅', petal: '#ffd84a', core: '#f0a020', fruit: '#ef4b36', shape: 'round' },
            berry: { name: '블루베리', icon: '🫐', petal: '#ffe3ee', core: '#f3a9c2', fruit: '#4a5aa8', shape: 'small' },
            lemon: { name: '레몬', icon: '🍋', petal: '#fffdf4', core: '#f4dd6a', fruit: '#f7d23a', shape: 'oval' }
        };
        const pl = { built: false, busy: false, s: null };
        const pq = id => document.getElementById(id);

        /* ---------- 날짜 ---------- */
        function plDay(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
        function plGap(a, b) {                       // a → b 까지 며칠
            if (!a || !b) return 0;
            const p = x => { const [y, m, d] = x.split('-').map(Number); return Date.UTC(y, m - 1, d); };
            return Math.round((p(b) - p(a)) / 86400000);
        }

        /* ---------- 저장 ---------- */
        function plNew(prev) {
            const ks = Object.keys(PL_KINDS);
            let kind = ks[Math.floor(Math.random() * ks.length)];
            if (prev && prev.kind === kind) kind = ks[(ks.indexOf(kind) + 1) % ks.length];   // 같은 씨앗이 연달아 나오지 않게
            return { kind: kind, w: 0, last: prev ? prev.last : '', start: plDay(), basket: prev ? prev.basket : {}, total: prev ? prev.total : 0 };
        }
        const plSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;     // 로그인 → 드라이브 설정 / 게스트 → 이 기기
        function plRead() {
            const x = vaultGet(PL_KEY, plSync());
            return x && PL_KINDS[x.kind] && typeof x.w === 'number' ? x : plNew(null);
        }
        function plWrite() {
            vaultPut(PL_KEY, pl.s, plSync());
        }
        function plStage(w) { let s = 0; PL_STEPS.forEach((n, i) => { if (w >= n) s = i; }); return s; }

        /* ---------- 오늘 일기를 썼나요? ---------- */
        async function plWroteToday() {
            const today = new Date();
            try {
                if (typeof isCoverOpen !== 'undefined' && isCoverOpen && typeof currentDate !== 'undefined' && plDay(currentDate) === plDay(today)) {
                    const c = pq('canvasArea');
                    if (c && c.children.length) return true;
                }
                if (typeof ensureDayLoaded === 'function' && typeof drive !== 'undefined' && drive.ready) await ensureDayLoaded(today);
                if (typeof readDayData === 'function') return readDayData(today).length > 0;
            } catch (e) {}
            return false;
        }

        /* ---------- 그림 (SVG) ---------- */
        function plLeaf(x, y, ang, len, col) {
            return `<path d="M0 0 C ${len * .35} ${-len * .38}, ${len * .8} ${-len * .3}, ${len} 0 C ${len * .8} ${len * .26}, ${len * .35} ${len * .3}, 0 0 Z" fill="${col}" stroke="#3f7d3a" stroke-width="1.2" transform="translate(${x} ${y}) rotate(${ang})"/>`
                + `<path d="M2 0 L ${len * .85} 0" stroke="#3f7d3a" stroke-width=".9" opacity=".6" transform="translate(${x} ${y}) rotate(${ang})"/>`;
        }
        function plFlower(x, y, r, k) {
            let p = '';
            for (let i = 0; i < 5; i++) p += `<ellipse cx="${x}" cy="${y - r * .62}" rx="${r * .46}" ry="${r * .62}" fill="${k.petal}" stroke="#d9b9a6" stroke-width="1" transform="rotate(${i * 72} ${x} ${y})"/>`;
            return p + `<circle cx="${x}" cy="${y}" r="${r * .38}" fill="${k.core}"/>`;
        }
        function plFruit(x, y, k) {
            if (k.shape === 'heart') return `<path d="M${x} ${y + 14} C ${x - 13} ${y + 4}, ${x - 11} ${y - 8}, ${x} ${y - 5} C ${x + 11} ${y - 8}, ${x + 13} ${y + 4}, ${x} ${y + 14} Z" fill="${k.fruit}" stroke="#a91e33" stroke-width="1"/>`
                + `<path d="M${x - 6} ${y - 6} L${x} ${y - 2} L${x + 6} ${y - 6} L${x} ${y - 9} Z" fill="#4f9a45"/>`
                + [[-4, 2], [3, 1], [0, 7], [-3, 9], [4, 7]].map(([a, b]) => `<ellipse cx="${x + a}" cy="${y + b}" rx=".9" ry="1.3" fill="#ffe08a"/>`).join('');
            if (k.shape === 'oval') return `<ellipse cx="${x}" cy="${y + 4}" rx="9" ry="12" fill="${k.fruit}" stroke="#c9a316" stroke-width="1"/><circle cx="${x}" cy="${y + 16}" r="1.6" fill="#c9a316"/><ellipse cx="${x - 3}" cy="${y}" rx="2.4" ry="4" fill="#fff" opacity=".45"/>`;
            if (k.shape === 'small') return [[-6, 2], [5, 0], [0, 9]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r="6" fill="${k.fruit}" stroke="#2e3a7a" stroke-width="1"/><path d="M${x + a - 2} ${y + b - 5} l2 1.6 l2 -1.6" stroke="#2e3a7a" fill="none" stroke-width="1"/>`).join('');
            return [[-5, 2], [6, 6]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r="8" fill="${k.fruit}" stroke="#b22a1c" stroke-width="1"/><ellipse cx="${x + a - 3}" cy="${y + b - 3}" rx="2" ry="3" fill="#fff" opacity=".45"/><path d="M${x + a - 4} ${y + b - 8} l4 2 l4 -2" stroke="#3f8a38" stroke-width="1.6" fill="none"/>`).join('');
        }
        function plSvg(s, opt) {
            opt = opt || {};
            const k = PL_KINDS[s.kind], st = plStage(s.w), dry = !!opt.dry;
            const green = dry ? '#a9b96a' : '#7cc46f', stemC = dry ? '#8a9a52' : '#4f9a45';
            const H = [0, 26, 56, 84, 96, 100][st];                     // 줄기 높이
            const top = 164 - H;
            const bend = dry ? 14 : 4;
            let g = '';
            if (st === 0) {
                g += `<path d="M84 165 Q100 154 116 165 Z" fill="#6b4529"/><ellipse cx="100" cy="158" rx="5" ry="3.6" fill="#c99a63" stroke="#7a5233" stroke-width="1" transform="rotate(-20 100 158)"/>`;
            } else {
                g += `<path d="M100 164 C ${100 - bend} ${164 - H * .4}, ${100 + bend} ${164 - H * .7}, ${100 + (dry ? bend * 1.4 : 0)} ${top}" stroke="${stemC}" stroke-width="${st > 2 ? 4 : 3}" fill="none" stroke-linecap="round"/>`;
                const droop = dry ? 22 : 0;
                if (st === 1) g += plLeaf(100, top + 2, -150 + droop, 16, green) + plLeaf(100, top + 2, -30 + droop, 16, green);
                else {
                    const pairs = st === 2 ? [.55, .2] : [.78, .5, .24];
                    pairs.forEach((f, i) => {
                        const y = 164 - H * f, len = 30 - i * 3;
                        g += plLeaf(100, y, -160 + droop + i * 6, len, green) + plLeaf(100, y, -20 - droop - i * 6 + 2 * droop, len, green);
                    });
                    if (st === 2) g += plLeaf(100, top + 3, -110 + droop, 14, green) + plLeaf(100, top + 3, -70 + droop, 14, green);
                }
                const tx = 100 + (dry ? bend * 1.4 : 0);
                if (st === 3) g += `<path d="M${tx} ${top - 14} C ${tx - 9} ${top - 6}, ${tx - 7} ${top + 3}, ${tx} ${top + 3} C ${tx + 7} ${top + 3}, ${tx + 9} ${top - 6}, ${tx} ${top - 14} Z" fill="${k.petal === '#ffffff' || k.petal === '#fffdf4' ? '#f4f1e2' : k.petal}" stroke="#b9a68e" stroke-width="1"/><path d="M${tx - 7} ${top} Q ${tx} ${top + 6} ${tx + 7} ${top}" fill="#5aa64e"/>`;
                if (st === 4) g += plFlower(tx, top - 8, 18, k) + plFlower(72, 164 - H * .5 - 6, 10, k);
                if (st === 5) g += plFlower(tx, top - 8, 14, k) + plFruit(70, 164 - H * .48, k) + plFruit(132, 164 - H * .72, k) + plFruit(128, 164 - H * .26, k);
            }
            return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" class="pl-svg${dry ? ' pl-dry' : ''}">
                <ellipse cx="100" cy="232" rx="62" ry="6" fill="rgba(90,60,40,.16)"/>
                <path d="M52 170 L148 170 L138 230 Q100 236 62 230 Z" fill="#e58f6c" stroke="#b8603f" stroke-width="2"/>
                <rect x="46" y="160" width="108" height="16" rx="6" fill="#ef9f7c" stroke="#b8603f" stroke-width="2"/>
                <path d="M60 196 q8 -6 16 0 t16 0" stroke="#fff3e6" stroke-width="2.4" fill="none" opacity=".75"/>
                <circle cx="124" cy="200" r="3" fill="#fff3e6" opacity=".75"/><circle cx="134" cy="194" r="2" fill="#fff3e6" opacity=".75"/>
                <ellipse cx="100" cy="165" rx="48" ry="5.5" fill="#7a5233"/>
                <g class="pl-grow">${g}</g>
            </svg>`;
        }

        /* ---------- 화면 ---------- */
        function plBuild() {
            if (pl.built) return;
            pl.built = true;
            const el = document.createElement('div');
            el.id = 'plantRoom'; el.className = 'pl-room';
            el.innerHTML = `
              <div class="pl-bar"><span class="pl-sp"></span><b>🌷 화분 키우기</b><button class="pl-x" type="button" onclick="closePlant()" aria-label="닫기">✕</button></div>
              <div class="pl-wrap">
                <div class="pl-window">
                  <div class="pl-sun" id="plSun"></div>
                  <div class="pl-talk" id="plTalk"></div>
                  <div class="pl-pot" id="plPot"></div>
                  <div class="pl-can" id="plCan">🚿</div>
                  <div class="pl-sill"></div>
                </div>
                <div class="pl-info">
                  <div class="pl-name" id="plName"></div>
                  <div class="pl-bar2"><i id="plFill"></i></div>
                  <div class="pl-sub" id="plSub"></div>
                </div>
                <div class="pl-acts" id="plActs"></div>
                <p class="pl-tip" id="plTip"></p>
                <div class="pl-how">
                  <div class="pl-how-t">🌱 이렇게 키워요</div>
                  <div class="pl-how-steps">
                    <div><span>✏️</span><b>일기 쓰기</b><small>글 · 스티커 · 그림<br>하나라도 OK</small></div><i>→</i>
                    <div><span>💧</span><b>물 주기</b><small>일기 쓴 날<br>하루 한 번</small></div><i>→</i>
                    <div><span>🌸</span><b>물 10번</b><small>꽃이 피면<br>씨앗 정체 공개!</small></div><i>→</i>
                    <div><span>🧺</span><b>물 14번</b><small>열매를 따서<br>도감에 모아요</small></div>
                  </div>
                  <p class="pl-how-n">💡 사흘 넘게 물을 못 받으면 시들시들해지지만 죽지는 않아요</p>
                </div>
                <div class="pl-book" id="plBasket"></div>
              </div>`;
            document.body.appendChild(el);
        }

        function plTalk(s, wateredToday, dry) {
            const st = plStage(s.w);
            const pick = a => a[Math.floor(Math.random() * a.length)];
            if (dry) return pick(['목이 조금 말라요…', '오늘 이야기 들려줄래요?', '기다리고 있었어요…']);
            if (wateredToday) return pick(['꿀꺽꿀꺽, 고마워요!', '오늘 이야기 잘 들었어요', '쑥쑥 자라는 중이에요', '내일 또 만나요!']);
            return [['흙 속에서 꿈꾸는 중…', '언제 싹이 날까요?'], ['안녕! 나 여기 있어요', '햇살이 좋아요'], ['잎이 하나 더 났어요', '바람이 간지러워요'],
                ['무슨 꽃이 필까요?', '곧 꽃이 필 것 같아요'], ['꽃이 피었어요!', '향기 맡아 볼래요?'], ['열매가 익었어요!', '따 가도 돼요']][st][Math.floor(Math.random() * 2)];
        }

        async function plRender(note) {
            const s = pl.s, k = PL_KINDS[s.kind], st = plStage(s.w), today = plDay();
            const watered = s.last === today;
            const dry = !watered && st > 0 && s.last && plGap(s.last, today) >= PL_THIRSTY_DAYS;
            const h = new Date().getHours();
            pq('plantRoom').dataset.time = h < 6 || h >= 19 ? 'night' : h < 17 ? 'day' : 'eve';
            pq('plantRoom').classList.toggle('pl-new', !s.total);          // 아직 한 번도 물을 안 줬으면 '이렇게 키워요' 를 맨 위에
            pq('plPot').innerHTML = plSvg(s, { dry: dry });
            pq('plTalk').textContent = note || plTalk(s, watered, dry);
            const known = st >= 4;
            pq('plName').innerHTML = `${known ? k.icon + ' ' + k.name : '🌱 비밀 씨앗'} · <b>${PL_STAGE[st]}</b>`;
            const next = PL_STEPS[st + 1];
            pq('plFill').style.width = (next ? Math.round((s.w - PL_STEPS[st]) / (next - PL_STEPS[st]) * 100) : 100) + '%';
            pq('plSub').textContent = (next ? `다음 단계까지 물 ${next - s.w}번` : '다 자랐어요!') + ` · 함께한 지 ${Math.max(1, plGap(s.start, today) + 1)}일`;
            const acts = pq('plActs');
            if (st === 5) acts.innerHTML = `<button class="pl-btn pl-main" type="button" onclick="plHarvest()">🧺 열매 따기</button>`;
            else if (watered) acts.innerHTML = `<button class="pl-btn" type="button" disabled>💧 오늘은 물을 줬어요 · 내일 또 만나요</button>`;
            else acts.innerHTML = `<button class="pl-btn pl-main" type="button" id="plWaterBtn" onclick="plWater()">💧 물 주기</button>`;
            pq('plTip').textContent = st === 5 ? '💡 열매를 따면 🧺 열매 도감에 모이고, 이번엔 어떤 씨앗일지 새로 심어요.'
                : watered ? (typeof attendDone === 'function' && !attendDone() ? '💡 📅 출석 도장도 찍었나요? 숨은 코인이 나올지도 몰라요.' : '💡 내일도 일기를 쓰면 또 물을 줄 수 있어요. 물 14번이면 열매가 열려요!')
                : dry ? '💡 오늘 일기를 쓰고 물을 주면 다시 기운을 차려요.' : '';
            /* 🧺 열매 도감 : 비밀 씨앗 4가지 · 모은 건 색깔로, 아직이면 흐릿하게 */
            const b = s.basket || {}, ks = Object.keys(PL_KINDS), got = ks.filter(x => b[x] > 0).length;
            pq('plBasket').innerHTML = `<div class="pl-book-t">🧺 열매 도감 <b>${got} / ${ks.length}</b></div>
                <div class="pl-book-row">${ks.map(x => b[x] > 0
                    ? `<div class="pl-fr on"><span>${PL_KINDS[x].icon}</span><b>${PL_KINDS[x].name}</b><small>×${b[x]}</small></div>`
                    : `<div class="pl-fr"><span>${PL_KINDS[x].icon}</span><b>???</b><small>아직</small></div>`).join('')}</div>
                <p class="pl-book-n">${got === ks.length ? '🎉 모든 열매를 모았어요! 계속 키워서 더 모아 봐요' : `비밀 씨앗은 ${ks.length}가지! 어떤 씨앗이 심어질지는 꽃이 필 때까지 비밀이에요`}</p>`;
        }

        async function plWater() {
            if (pl.busy) return;
            pl.busy = true;
            const btn = pq('plWaterBtn'); if (btn) { btn.disabled = true; btn.textContent = '💧 오늘 일기를 확인하는 중…'; }
            const wrote = await plWroteToday();
            pl.busy = false;
            if (!wrote) {
                pq('plActs').innerHTML = `<p class="pl-msg">오늘 일기를 쓰면 물을 줄 수 있어요.<br><small>글이나 스티커, 그림을 하나라도 남기면 돼요.</small></p>
                    <button class="pl-btn pl-main" type="button" onclick="plGoWrite()">✏️ 오늘 일기 쓰러 가기</button>`;
                return;
            }
            const s = pl.s, before = plStage(s.w), today = plDay();
            if (s.last === today) { plRender(); return; }
            s.w += 1; s.total = (s.total || 0) + 1; s.last = today;
            plWrite();
            const room = pq('plantRoom');
            room.classList.remove('pl-pour'); void room.offsetWidth; room.classList.add('pl-pour');
            setTimeout(() => {
                room.classList.remove('pl-pour');
                const after = plStage(s.w);
                const msg = after > before ? ({ 1: '싹이 텄어요!', 2: '잎이 났어요!', 3: '꽃봉오리가 맺혔어요!', 4: PL_KINDS[s.kind].name + ' 꽃이 피었어요!', 5: '열매가 열렸어요!' })[after] : null;
                plRender(msg);
                if (after > before) { const p = room.querySelector('.pl-grow'); if (p) p.classList.add('pl-pop'); }
            }, 1300);
        }

        function plHarvest() {
            const s = pl.s;
            if (plStage(s.w) !== 5) return;
            s.basket = s.basket || {};
            s.basket[s.kind] = (s.basket[s.kind] || 0) + 1;
            const got = PL_KINDS[s.kind];
            pl.s = plNew(s);
            plWrite();
            plRender(`${got.icon} ${got.name}를 🧺 열매 도감에 담았어요. 새 비밀 씨앗을 심었어요!`);
        }

        function plGoWrite() {
            closePlant();
            if (typeof goToToday === 'function') goToToday();
        }

        function openPlant() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            plBuild();
            pl.s = plRead();
            pq('plantRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            plRender();
        }
        function closePlant() {
            const r = pq('plantRoom'); if (r) r.classList.remove('show', 'pl-pour');
            document.body.classList.remove('fc-lock');
        }
        /* ☕ 카페 · 다른 놀이에서 쓰는 안내 */
        async function plantStatus() {                      // { watered: 오늘 물 줌, wrote: 오늘 일기 씀 }
            if (!PL_OPEN) return { watered: true, wrote: false };
            const s = plRead(), watered = s.last === plDay();
            return { watered, wrote: watered || await plWroteToday() };
        }
        window.openPlant = openPlant;
        window.plantStatus = plantStatus;
