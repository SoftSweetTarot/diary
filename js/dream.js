/* 말랑달콤 다이어리 - js/dream.js
   🌙 꿈해몽 : 꿈을 적으면 꿈속 상징을 찾아 풀어 줘요 (놀이터 → 🌙 꿈해몽)
   - 상징 사전은 js/dream-data.js (꿈해몽을 처음 열 때만 불러와요 · 서버 없음 · 트래픽 거의 없음)
   - 꿈 글은 이 기기 안에서만 읽고, 어디에도 보내거나 저장하지 않아요.
   - 📌 다이어리에 붙이기 : 해몽 결과를 글상자로 오늘 페이지에 붙여요
   - 사용자는 '내 꿈 이야기를 읽고 풀어 주는' 느낌만 받도록 : 꿈에 쓴 내용만 풀이하고, 쓰지 않은 경우(크기·다른 상황 등)는 말하지 않아요.
   - 📖 상징 사전 화면은 지금은 숨겨 두었어요. 다시 보이게 하려면 아래 DM_SHOW_DICT 를 true 로 바꾸면 돼요.
   ※ 이 파일이 없어도 다이어리는 정상 동작 (꿈해몽만 '준비 중') */

        const DM_SHOW_DICT = false;                       // 📖 상징 사전 버튼 (false = 숨김 · 기능은 그대로 남아 있어요)
        const DM_READ_MS = 1400;                          // '꿈 이야기를 읽고 있어요' 잠깐 보여 주기
        const DM_MAX = 500;                              // 꿈 글 최대 글자 수
        const DM_SHOW = 6;                               // 한 번에 보여 줄 상징 수
        const DM_MOODS = [
            { id: 'happy', e: '😊', t: '기분 좋았어요', open: '기분 좋은 꿈이었다니 저도 덩달아 기뻐요.', end: '꿈에서 느낀 좋은 기분이 오늘 하루에도 이어질 거예요.' },
            { id: 'scary', e: '😨', t: '무서웠어요', open: '무서운 꿈을 꾸셨군요. 많이 놀라셨죠?', end: '무서운 꿈은 대부분 피로와 걱정이 모습을 바꿔 나타난 거예요. 나쁜 일이 생긴다는 뜻은 아니니 마음 편히 가져요.' },
            { id: 'sad', e: '😢', t: '슬펐어요', open: '마음이 먹먹한 꿈이었군요.', end: '슬픈 꿈은 마음속 감정을 씻어 내는 꿈이에요. 오늘은 나에게 다정한 말을 한마디 건네 주세요.' },
            { id: 'odd', e: '🤔', t: '이상했어요', open: '알쏭달쏭한 꿈이었네요.', end: '알쏭달쏭한 꿈일수록 마음이 많은 걸 정리하고 있다는 뜻이에요. 꿈속 상징을 오늘의 작은 힌트로 삼아 보세요.' }
        ];
        const DM_TONE = { good: { t: '좋은 꿈', c: 'good' }, mix: { t: '반반', c: 'mix' }, care: { t: '살펴보기', c: 'care' } };
        const DM_COLORS = ['하늘색', '연분홍', '민트', '라벤더', '노랑', '살구색', '하얀색', '연두색', '코랄', '보라색'];

        const dm = { built: false, open: false, mood: 'happy', loaded: null, last: null, cat: '전체', from: 'write' };
        const dq = id => document.getElementById(id);
        const dmEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

        /* 상징 사전 불러오기 (처음 한 번) */
        function dmLoad() {
            if (typeof DREAM_SYMBOLS !== 'undefined') return Promise.resolve();
            if (dm.loaded) return dm.loaded;
            const ver = (document.querySelector('script[src*="js/dream.js"]') || {}).src || '';
            const v = (ver.match(/[?&]v=([^&]+)/) || [])[1] || '';
            dm.loaded = new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = 'js/dream-data.js' + (v ? '?v=' + v : '');
                s.onload = () => typeof DREAM_SYMBOLS !== 'undefined' ? res() : rej(new Error('data'));
                s.onerror = () => { dm.loaded = null; rej(new Error('load')); };
                document.head.appendChild(s);
            });
            return dm.loaded;
        }

        /* ---------- 꿈 글에서 상징 찾기 ---------- */
        function dmFind(text) {
            const all = text.replace(/\s+/g, '');
            const hits = [];
            DREAM_SYMBOLS.forEach(sym => {
                let t = all;
                (sym.x || []).forEach(x => { t = t.split(x).join('□'); });
                let pos = -1;
                sym.k.forEach(k => { const i = t.indexOf(k); if (i >= 0 && (pos < 0 || i < pos)) pos = i; });
                if (pos < 0) return;
                const cases = (sym.s || []).filter(([ks]) => ks.some(k => all.includes(k))).slice(0, 2).map(c => c[1]);
                hits.push({ sym, pos, cases });
            });
            hits.sort((a, b) => a.pos - b.pos);
            return hits;
        }
        function dmVerdict(hits) {
            const w = { good: 2, mix: 1, care: 0 };
            const avg = hits.reduce((s, h) => s + w[h.sym.t], 0) / hits.length;
            if (avg >= 1.5) return { e: '🌟', t: '길몽에 가까운 꿈이에요', c: 'good', sum: '전체적으로 좋은 기운이 가득한 꿈이에요. 요즘 애쓴 일에 기분 좋은 소식이 따라올 것 같아요.' };
            if (avg >= .8) return { e: '🌗', t: '좋은 기운과 살필 점이 함께 있는 꿈이에요', c: 'mix', sum: '좋은 기운과 함께, 나를 조금 더 챙겨 달라는 마음이 담긴 꿈이에요.' };
            return { e: '🌧️', t: '마음을 살펴 달라는 꿈이에요', c: 'care', sum: '요즘 마음이 조금 지쳐 있다고 알려 주는 꿈이에요. 나쁜 일이 생긴다는 뜻은 아니니 걱정하지 마세요.' };
        }
        function dmLucky(text) {                          // 같은 날 같은 꿈이면 같은 행운 숫자
            const d = new Date(), key = text + d.getFullYear() + d.getMonth() + d.getDate();
            let h = 7; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
            return { n: h % 45 + 1, c: DM_COLORS[(h >>> 8) % DM_COLORS.length] };
        }

        /* ---------- 화면 ---------- */
        function dmBuild() {
            if (dm.built) return;
            dm.built = true;
            const el = document.createElement('div');
            el.id = 'dreamRoom';
            el.className = 'fc-room dm-room';
            el.innerHTML = `
              <div class="fc-sky" aria-hidden="true"><i class="fc-aurora a1"></i><i class="fc-aurora a2"></i><i class="fc-stars"></i><i class="fc-stars s2"></i></div>
              <button class="fc-x fc-back" type="button" id="drBack" onclick="dmShow('drWrite')" aria-label="꿈 적는 화면으로" hidden>←</button>
              <button class="fc-x" type="button" onclick="closeDream()" aria-label="닫기">✕</button>
              <div class="dm-wrap">
                <section id="drWrite" class="dm-stage">
                  <div class="dm-moon">🌙</div>
                  <h2 class="fc-title">꿈해몽</h2>
                  <p class="fc-sub">어젯밤 꾼 꿈 이야기를 들려주세요.</p>
                  <div class="dm-box">
                    <textarea id="drText" maxlength="${DM_MAX}" rows="5" placeholder="예) 커다란 뱀이 집으로 들어와서 내 손을 물었어요. 무섭지는 않았어요."></textarea>
                    <div class="dm-count"><span id="drCount">0</span> / ${DM_MAX}</div>
                  </div>
                  <p class="dm-label">꿈에서 기분이 어땠나요?</p>
                  <div class="dm-moods" id="drMoods"></div>
                  <div class="dm-actions">
                    <button class="fc-btn" type="button" onclick="dmInterpret()">🔮 해몽 보기</button>
                    <button class="fc-btn ghost" type="button" onclick="dmShowDict()" ${DM_SHOW_DICT ? '' : 'hidden'}>📖 상징 사전</button>
                  </div>
                  <p class="dm-note">꿈 내용은 이 기기 안에서만 읽고 어디에도 저장하거나 보내지 않아요.</p>
                </section>
                <section id="drResult" class="dm-stage" hidden></section>
                <section id="drDict" class="dm-stage" hidden>
                  <h2 class="fc-title dm-small">📖 꿈 상징 사전</h2>
                  <input id="drSearch" class="dm-search" type="search" placeholder="찾고 싶은 상징 (예: 뱀, 이빨, 물)" oninput="dmRenderDict()">
                  <div class="dm-cats" id="drCats"></div>
                  <div class="dm-grid" id="drGrid"></div>
                  <button class="fc-btn ghost dm-back" type="button" onclick="dmShow('drWrite')">✏️ 꿈 적으러 가기</button>
                </section>
              </div>`;
            document.body.appendChild(el);
            const ta = dq('drText');
            ta.addEventListener('input', () => { dq('drCount').textContent = ta.value.length; });
            ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) dmInterpret(); });
            const moods = dq('drMoods');
            DM_MOODS.forEach(m => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'dm-mood'; b.dataset.m = m.id;
                b.innerHTML = `<span>${m.e}</span>${m.t}`;
                b.onclick = () => { dm.mood = m.id; dmRenderMoods(); };
                moods.appendChild(b);
            });
            dmRenderMoods();
        }
        function dmRenderMoods() { document.querySelectorAll('.dm-mood').forEach(b => b.classList.toggle('on', b.dataset.m === dm.mood)); }
        function dmShow(id) {
            ['drWrite', 'drResult', 'drDict'].forEach(s => { dq(s).hidden = s !== id; });
            dq('drBack').hidden = id === 'drWrite';                // ← 는 꿈 적는 화면이 아닐 때만
            dq('dreamRoom').scrollTop = 0;
            if (id === 'drWrite') setTimeout(() => { if (!/Mobi|Android/i.test(navigator.userAgent)) dq('drText').focus(); }, 50);
        }

        function openDream() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            dmBuild();
            dm.open = true;
            dq('dreamRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            dmShow('drWrite');
            dmLoad().catch(() => {});                   // 꿈을 적는 동안 상징 사전을 미리 받아 둬요
        }
        function closeDream() {
            dm.open = false;
            const r = dq('dreamRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }

        /* 해몽 보기 */
        async function dmInterpret() {
            const text = dq('drText').value.trim();
            if (text.length < 2) { toast('🌙 꿈 내용을 조금만 적어 주세요'); dq('drText').focus(); return; }
            try { await dmLoad(); } catch (e) { toast('🌙 꿈 사전을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'); return; }
            const hits = dmFind(text);
            dm.last = { text, hits, mood: dm.mood };
            dm.from = 'write';
            const box = dq('drResult');                   // 꿈 이야기를 읽는 시간 (잠깐)
            box.innerHTML = '<div class="dm-reading"><span>✍️</span><p>꿈 이야기를 읽고 있어요…</p></div>';
            dmShow('drResult');
            setTimeout(() => { if (dm.open && dm.last && dm.last.text === text) dmRenderResult(); }, DM_READ_MS);
        }


        /* ---------- 🖼 꿈 카드 그림 (직접 그린 그림 · 파일 없음) ---------- */
        const dmX = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        function dmSeed(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; }
        function dmCardSvg(text, hits, v) {
            const rnd = dmSeed(text);
            const SKY = { good: ['#2b2a6b', '#b0629e', '#ffc48f'], mix: ['#1e2457', '#5a4a9a', '#c4a0dc'], care: ['#121a3a', '#2c3f74', '#6f8fc4'] }[v.c];
            const d = new Date(), date = `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
            let stars = '';
            for (let i = 0; i < 34; i++) { const x = 18 + rnd() * 264, y = 18 + rnd() * 250, r = .6 + rnd() * 1.6; stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${(.35 + rnd() * .6).toFixed(2)}"/>`; }
            const emo = hits.slice(0, 3).map(h => h.sym.e);
            const side = [[78, 268, -10], [226, 258, 12]];
            const F = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
            const EF = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420" width="300" height="420">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY[0]}"/><stop offset=".62" stop-color="${SKY[1]}"/><stop offset="1" stop-color="${SKY[2]}"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".55" stop-color="#ffe9f6" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="moon"><rect width="300" height="420" fill="#fff"/><circle cx="244" cy="58" r="22" fill="#000"/></mask>
<clipPath id="card"><rect x="0" y="0" width="300" height="420" rx="22"/></clipPath>
</defs>
<g clip-path="url(#card)">
<rect width="300" height="420" fill="url(#sky)"/>
${stars}
<circle cx="232" cy="66" r="26" fill="#fff3c4" mask="url(#moon)"/>
<circle cx="150" cy="188" r="104" fill="url(#glow)"/>
<text x="150" y="222" font-size="96" text-anchor="middle" font-family="${EF}">${emo[0]}</text>
${emo.slice(1).map((e, i) => `<text x="${side[i][0]}" y="${side[i][1]}" font-size="40" text-anchor="middle" font-family="${EF}" transform="rotate(${side[i][2]} ${side[i][0]} ${side[i][1]})" opacity=".95">${e}</text>`).join('')}
<g fill="#fff" opacity=".9"><ellipse cx="40" cy="330" rx="70" ry="26"/><ellipse cx="120" cy="342" rx="80" ry="28"/><ellipse cx="220" cy="334" rx="90" ry="30"/><ellipse cx="290" cy="346" rx="60" ry="24"/></g>
<rect x="0" y="340" width="300" height="80" fill="#fff" opacity=".9"/>
<text x="150" y="372" font-size="16" font-weight="bold" text-anchor="middle" fill="#5a3d8a" font-family="${F}">${dmX(v.e + ' ' + v.t)}</text>
<text x="150" y="398" font-size="12" text-anchor="middle" fill="#9a8ab8" font-family="${F}">${date} 의 꿈</text>
</g>
<rect x="9" y="9" width="282" height="402" rx="16" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2"/>
<rect x="15" y="15" width="270" height="390" rx="12" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/>
</svg>`;
        }
        const dmSvgUrl = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

        /* 기본 풀이에서 꿈에 쓰지 않은 조건 이야기(…할수록 · …면 ~해요)는 빼고, 꿈에 쓴 상황 풀이만 덧붙여요 */
        function dmText(h) {
            const sents = h.sym.m.split(/(?<=[.!?])\s+/).filter(x => x && !/수록|^하지만|^특히|^무서웠다면/.test(x));
            if (h.cases && h.cases.length) return [sents[0]].concat(h.cases).join(' ');
            return sents.join(' ');
        }
        function dmCard(h) {                              // (상징 사전 화면용)
            const s = h.sym, tone = DM_TONE[s.t];
            return `<article class="dm-card">
                <div class="dm-card-h"><span class="dm-card-e">${s.e}</span><b>${dmEsc(s.n)}</b><span class="dm-tone ${tone.c}">${tone.t}</span></div>
                <p>${dmEsc(s.m)}</p>
                ${(h.cases || []).map(c => `<p class="dm-case">✦ ${dmEsc(c)}</p>`).join('')}
              </article>`;
        }

        function dmRenderResult() {
            const { text, hits, mood } = dm.last, box = dq('drResult');
            const m = DM_MOODS.find(x => x.id === mood) || DM_MOODS[0];
            const quote = dmEsc(text.length > 140 ? text.slice(0, 140) + '…' : text);
            if (!hits.length) {
                box.innerHTML = `
                  <article class="dm-letter">
                    <div class="dm-letter-h">🌙 꿈 이야기를 읽어 봤어요</div>
                    <div class="dm-quote">“${quote}”</div>
                    <p>${dmEsc(m.open)} 그런데 이 이야기만으로는 꿈이 전하려는 뜻을 풀기가 조금 어려워요.</p>
                    <p>꿈에서 <b>본 것</b>(사람, 동물, 물건, 장소)이나 <b>한 일</b>을 조금 더 자세히 들려주시면 다시 풀어 드릴게요.</p>
                  </article>
                  <div class="dm-actions"><button class="fc-btn" type="button" onclick="dmShow('drWrite')">✏️ 이어서 적기</button></div>`;
                dmShow('drResult');
                return;
            }
            const v = dmVerdict(hits), lucky = dmLucky(text), shown = hits.slice(0, DM_SHOW);
            dm.cardUrl = dmSvgUrl(dmCardSvg(text, hits, v));
            box.innerHTML = `
              <div class="dm-pic"><img src="${dm.cardUrl}" alt="꿈 그림 카드"></div>
              <article class="dm-letter">
                <div class="dm-letter-h">🌙 꿈 이야기를 읽어 봤어요</div>
                <div class="dm-quote">“${quote}”</div>
                <p>${dmEsc(m.open)}</p>
                ${shown.map(h => `<div class="dm-part"><b>${h.sym.e} ${dmEsc(h.sym.n)}</b><p>${dmEsc(dmText(h))}</p></div>`).join('')}
                <div class="dm-sum ${v.c}"><span>${v.e}</span><p>${dmEsc(v.sum)}</p></div>
                <p>${dmEsc(m.end)}</p>
                <p class="dm-luck">오늘의 행운 숫자 <b>${lucky.n}</b> · 행운의 색 <b>${lucky.c}</b></p>
              </article>
              <div class="dm-actions">
                <button class="fc-btn" type="button" onclick="dmStick()">📌 다이어리에 붙이기</button>
                <button class="fc-btn ghost" type="button" onclick="dmNew()">✏️ 다른 꿈 풀기</button>
              </div>
              <p class="dm-note">재미로 보는 꿈해몽이에요.</p>`;
            dmShow('drResult');
        }
        function dmNew() { dq('drText').value = ''; dq('drCount').textContent = '0'; dmShow('drWrite'); }

        /* 📌 다이어리에 붙이기 : 결과를 글상자로 */
        function dmStick() {
            if (!dm.last || !dm.last.hits.length || !dm.cardUrl) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { closeDream(); showMsg('먼저 다이어리를 열어주세요!'); return; }
            closeDream();
            if (typeof addImage === 'function' && addImage(dm.cardUrl)) {
                const box = document.querySelector('#canvasArea .element-box:last-child'); if (box) box.style.width = '170px';
                toast('📌 꿈 카드를 다이어리에 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
            }
        }

        /* ---------- 📖 상징 사전 ---------- */
        async function dmShowDict() {
            try { await dmLoad(); } catch (e) { toast('🌙 꿈 사전을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'); return; }
            const cats = dq('drCats');
            if (!cats.childElementCount) {
                ['전체'].concat(DREAM_CATS).forEach(c => {
                    const b = document.createElement('button');
                    b.type = 'button'; b.className = 'dm-cat'; b.dataset.c = c; b.textContent = c;
                    b.onclick = () => { dm.cat = c; dmRenderDict(); };
                    cats.appendChild(b);
                });
            }
            dmRenderDict();
            dmShow('drDict');
        }
        function dmRenderDict() {
            const q = (dq('drSearch').value || '').replace(/\s+/g, '');
            document.querySelectorAll('.dm-cat').forEach(b => b.classList.toggle('on', b.dataset.c === dm.cat));
            const list = DREAM_SYMBOLS.filter(s => (dm.cat === '전체' || s.c === dm.cat) && (!q || s.n.replace(/\s+/g, '').includes(q) || s.k.some(k => k.includes(q) || q.includes(k))));
            const grid = dq('drGrid');
            grid.innerHTML = list.length ? list.map(s => `<button type="button" class="dm-sym" data-n="${dmEsc(s.n)}"><span>${s.e}</span>${dmEsc(s.n)}</button>`).join('')
                : '<p class="dm-tip">찾는 상징이 없어요. 다른 낱말로 찾아보세요.</p>';
            grid.querySelectorAll('.dm-sym').forEach(b => b.onclick = () => dmOpenSymbol(b.dataset.n));
        }
        async function dmOpenSymbol(name) {
            try { await dmLoad(); } catch (e) { return; }
            const sym = DREAM_SYMBOLS.find(s => s.n === name); if (!sym) return;
            const box = dq('drResult');
            box.innerHTML = `
              <div class="dm-cards">${dmCard({ sym, cases: (sym.s || []).map(c => c[1]) })}</div>
              <div class="dm-actions">
                <button class="fc-btn ghost" type="button" onclick="dmShowDict()">📖 사전으로</button>
                <button class="fc-btn" type="button" onclick="dmShow('drWrite')">✏️ 내 꿈 적기</button>
              </div>`;
            dmShow('drResult');
        }

        document.addEventListener('keydown', e => { if (e.key === 'Escape' && dm.open) closeDream(); });

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['dream'] = true;
