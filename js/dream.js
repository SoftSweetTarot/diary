/* 말랑달콤 다이어리 - js/dream.js
   🌙 꿈해몽 : 꿈을 적으면 꿈속 상징을 찾아 풀어 줘요 (놀이터 → 🌙 꿈해몽)
   - 상징 사전은 js/dream-data.js (꿈해몽을 처음 열 때만 불러와요 · 서버 없음 · 트래픽 거의 없음)
   - 꿈 글은 이 기기 안에서만 읽고, 어디에도 보내거나 저장하지 않아요.
   - 📌 다이어리에 붙이기 : 해몽 결과를 글상자로 오늘 페이지에 붙여요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (꿈해몽만 '준비 중') */

        const DM_MAX = 500;                              // 꿈 글 최대 글자 수
        const DM_SHOW = 6;                               // 한 번에 보여 줄 상징 수
        const DM_MOODS = [
            { id: 'happy', e: '😊', t: '기분 좋았어요', end: '꿈에서 느낀 좋은 기분이 오늘 하루에도 이어질 거예요.' },
            { id: 'scary', e: '😨', t: '무서웠어요', end: '무서운 꿈은 대부분 피로와 걱정이 모습을 바꿔 나타난 거예요. 나쁜 일이 생긴다는 뜻은 아니니 마음 편히 가져요.' },
            { id: 'sad', e: '😢', t: '슬펐어요', end: '슬픈 꿈은 마음속 감정을 씻어 내는 꿈이에요. 오늘은 나에게 다정한 말을 한마디 건네 주세요.' },
            { id: 'odd', e: '🤔', t: '이상했어요', end: '알쏭달쏭한 꿈일수록 마음이 많은 걸 정리하고 있다는 뜻이에요. 꿈속 상징을 오늘의 작은 힌트로 삼아 보세요.' }
        ];
        const DM_TONE = { good: { t: '좋은 꿈', c: 'good' }, mix: { t: '반반', c: 'mix' }, care: { t: '살펴보기', c: 'care' } };
        const DM_COLORS = ['하늘색', '연분홍', '민트', '라벤더', '노랑', '살구색', '하얀색', '연두색', '코랄', '보라색'];
        const DM_POPULAR = ['뱀', '돼지', '이가 빠지는 꿈', '똥', '물', '불', '돌아가신 분', '쫓기는 꿈', '떨어지는 꿈', '돈', '죽는 꿈', '시험', '아기', '하늘을 나는 꿈'];

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
            if (avg >= 1.5) return { e: '🌟', t: '길몽에 가까운 꿈이에요', c: 'good' };
            if (avg >= .8) return { e: '🌗', t: '좋은 기운과 살필 점이 함께 있는 꿈이에요', c: 'mix' };
            return { e: '🌧️', t: '마음을 살펴 달라는 꿈이에요', c: 'care' };
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
              <button class="fc-x" type="button" onclick="closeDream()" aria-label="닫기">✕</button>
              <div class="dm-wrap">
                <section id="drWrite" class="dm-stage">
                  <div class="dm-moon">🌙</div>
                  <h2 class="fc-title">꿈해몽</h2>
                  <p class="fc-sub">어젯밤 꿈을 적어 주세요. 꿈속 상징을 찾아 풀어 드릴게요.</p>
                  <div class="dm-box">
                    <textarea id="drText" maxlength="${DM_MAX}" rows="5" placeholder="예) 커다란 뱀이 집으로 들어와서 내 손을 물었어요. 무섭지는 않았어요."></textarea>
                    <div class="dm-count"><span id="drCount">0</span> / ${DM_MAX}</div>
                  </div>
                  <p class="dm-label">꿈에서 기분이 어땠나요?</p>
                  <div class="dm-moods" id="drMoods"></div>
                  <div class="dm-actions">
                    <button class="fc-btn" type="button" onclick="dmInterpret()">🔮 해몽 보기</button>
                    <button class="fc-btn ghost" type="button" onclick="dmShowDict()">📖 상징 사전</button>
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
            dmRenderResult();
        }

        function dmCard(h) {
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
            if (!hits.length) {
                box.innerHTML = `
                  <div class="dm-verdict mix"><span>🌫️</span><b>꿈속 상징을 찾지 못했어요</b></div>
                  <div class="dm-quote">“${dmEsc(text.length > 120 ? text.slice(0, 120) + '…' : text)}”</div>
                  <p class="dm-tip">꿈에 나온 <b>동물 · 사람 · 물건 · 장소 · 한 일</b>을 낱말로 적어 주면 더 잘 찾아요.<br>예) 바다, 돼지, 엄마, 시험, 쫓기다</p>
                  <p class="dm-label">많이 찾는 꿈</p>
                  <div class="dm-chips">${DM_POPULAR.map(n => `<button type="button" class="dm-chip" data-n="${dmEsc(n)}">${dmEsc(n)}</button>`).join('')}</div>
                  <div class="dm-actions"><button class="fc-btn" type="button" onclick="dmShow('drWrite')">✏️ 다시 적기</button><button class="fc-btn ghost" type="button" onclick="dmShowDict()">📖 상징 사전</button></div>`;
                box.querySelectorAll('.dm-chip').forEach(b => b.onclick = () => dmOpenSymbol(b.dataset.n));
                dmShow('drResult');
                return;
            }
            const v = dmVerdict(hits), lucky = dmLucky(text), shown = hits.slice(0, DM_SHOW);
            box.innerHTML = `
              <div class="dm-verdict ${v.c}"><span>${v.e}</span><b>${v.t}</b></div>
              <div class="dm-quote">“${dmEsc(text.length > 120 ? text.slice(0, 120) + '…' : text)}”</div>
              <p class="dm-found">꿈속 상징 ${hits.length}개 : ${hits.map(h => h.sym.e + ' ' + dmEsc(h.sym.n)).join(' · ')}</p>
              <div class="dm-cards">${shown.map(dmCard).join('')}</div>
              ${hits.length > DM_SHOW ? `<p class="dm-tip">상징이 많아서 먼저 나온 ${DM_SHOW}개만 풀었어요.</p>` : ''}
              <div class="dm-end"><span>${m.e}</span><p>${dmEsc(m.end)}</p></div>
              <div class="dm-lucky"><div><small>오늘의 행운 숫자</small><b>${lucky.n}</b></div><div><small>오늘의 행운 색</small><b>${lucky.c}</b></div></div>
              <div class="dm-actions">
                <button class="fc-btn" type="button" onclick="dmStick()">📌 다이어리에 붙이기</button>
                <button class="fc-btn ghost" type="button" onclick="dmNew()">✏️ 다른 꿈 풀기</button>
              </div>
              <p class="dm-note">재미로 보는 꿈해몽이에요. 옛날부터 전해 오는 해몽을 바탕으로 말랑달콤이 풀었어요.</p>`;
            dmShow('drResult');
        }
        function dmNew() { dq('drText').value = ''; dq('drCount').textContent = '0'; dmShow('drWrite'); }

        /* 📌 다이어리에 붙이기 : 결과를 글상자로 */
        function dmStick() {
            if (!dm.last || !dm.last.hits.length) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { closeDream(); showMsg('먼저 다이어리를 열어주세요!'); return; }
            const { text, hits } = dm.last, v = dmVerdict(hits);
            const short = text.length > 60 ? text.slice(0, 60) + '…' : text;
            const body = `🌙 오늘의 꿈해몽\n“${short}”\n${v.e} ${v.t}\n${hits.slice(0, 4).map(h => h.sym.e + ' ' + h.sym.n).join('  ')}`;
            closeDream();
            if (typeof addText !== 'function') return;
            addText();
            const ta = document.querySelector('#canvasArea .element-box:last-child textarea');
            if (ta) {
                ta.value = body;
                const box = ta.closest('.element-box'); box.style.width = '230px'; box.style.height = '130px';
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
            toast('📌 꿈해몽을 다이어리에 붙였어요');
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
