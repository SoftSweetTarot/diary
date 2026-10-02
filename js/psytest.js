/* 말랑달콤 다이어리 - js/psytest.js
   🧠 심리테스트 (놀이터 → 운세·마음 → 🧠 심리테스트)
   - 테스트 고르기 → 한 문제씩 → 결과 (풀이 · 키워드 · 잘 맞는 유형 · 한마디)
   - 보기 순서는 할 때마다 섞여요 · ← 로 이전 문제
   - 마지막 결과는 설정에 기억 (드라이브 settings.json 'diary_psy' · 게스트는 이 기기에만) → 목록에 '내 결과' 표시
   - 📌 다이어리에 붙이기 : 결과 카드 그림 (SVG)
   ※ 문제는 js/psytest-data.js · 이 파일이 없어도 다이어리는 정상 동작 (심리테스트만 '준비 중') */

        const PSY_KEY = 'diary_psy', PSY_LOCAL = 'malang_psy', PSY_THINK_MS = 900;
        const psy = { built: false, test: null, qi: 0, ans: [], order: [], res: null, timer: 0 };
        const pyq = id => document.getElementById(id);
        const psySync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        const psyEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

        function psyMine() { try { return JSON.parse((psySync() ? store.getItem(PSY_KEY) : localStorage.getItem(PSY_LOCAL)) || '{}') || {}; } catch (e) { return {}; } }
        function psyKeep(id, i) {
            const o = psyMine(); if (o[id] === i) return;
            o[id] = i; const t = JSON.stringify(o);
            try { if (psySync()) store.setItem(PSY_KEY, t); else localStorage.setItem(PSY_LOCAL, t); } catch (e) {}
        }

        /* ---------- 화면 ---------- */
        function psyBuild() {
            if (psy.built) return;
            psy.built = true;
            const el = document.createElement('div');
            el.id = 'psyRoom'; el.className = 'psy-room';
            el.innerHTML = `
              <div class="psy-bar"><button class="psy-x" type="button" id="psyBack" onclick="psyBack()" aria-label="뒤로" hidden>←</button><span class="psy-sp" id="psySp"></span><b id="psyTitle">🧠 심리테스트</b><button class="psy-x" type="button" onclick="closePsyTest()" aria-label="닫기">✕</button></div>
              <div class="psy-wrap">
                <section id="psyList" class="psy-step"></section>
                <section id="psyQ" class="psy-step" hidden></section>
                <section id="psyRes" class="psy-step" hidden></section>
              </div>`;
            document.body.appendChild(el);
        }
        function psyShow(id) {
            clearTimeout(psy.timer); psy.timer = 0;
            ['psyList', 'psyQ', 'psyRes'].forEach(s => { pyq(s).hidden = s !== id; });
            pyq('psyBack').hidden = id === 'psyList'; pyq('psySp').hidden = id !== 'psyList';
            pyq('psyTitle').textContent = id === 'psyList' || !psy.test ? '🧠 심리테스트' : psy.test.e + ' ' + psy.test.t;
            pyq('psyRoom').scrollTop = 0;
        }
        function psyList() {
            const mine = psyMine();
            pyq('psyList').innerHTML = `<p class="psy-lead">궁금한 테스트를 골라 보세요</p>
              <div class="psy-tests">${PSY_TESTS.map((t, i) => {
                  const r = mine[t.id] != null && t.r[mine[t.id]];
                  return `<button type="button" class="psy-card" style="--a:${t.c[0]};--b:${t.c[1]}" onclick="psyStart(${i})">
                    <span class="psy-card-e">${t.e}</span><b>${t.t}</b><small>${t.sub}</small>
                    ${r ? `<i>내 결과 ${r.e} ${psyEsc(r.n)}</i>` : `<i class="new">${t.q.length}문제 · 1분</i>`}</button>`;
              }).join('')}</div>
              <p class="psy-note">재미로 보는 심리테스트예요. 정답은 없으니 마음 가는 대로 골라 주세요!</p>`;
            psyShow('psyList');
        }

        function psyStart(i) {
            psy.test = PSY_TESTS[i]; psy.qi = 0; psy.ans = [];
            psy.order = psy.test.q.map(q => q[1].map((_, k) => k).sort(() => Math.random() - .5));
            psyQuestion();
        }
        function psyQuestion() {
            const t = psy.test, [q, opts] = t.q[psy.qi], n = t.q.length;
            pyq('psyQ').innerHTML = `
              <div class="psy-prog"><i style="width:${psy.qi / n * 100}%"></i></div>
              <div class="psy-qn">Q${psy.qi + 1} <small>/ ${n}</small></div>
              <div class="psy-qcard" style="--a:${t.c[0]};--b:${t.c[1]}"><p>${psyEsc(q)}</p></div>
              <div class="psy-opts">${psy.order[psy.qi].map(k => `<button type="button" class="${psy.ans[psy.qi] === k ? 'on' : ''}" onclick="psyAnswer(${k}, this)">${psyEsc(opts[k][0])}</button>`).join('')}</div>`;
            psyShow('psyQ');
        }
        function psyAnswer(k, btn) {
            if (psy.timer) return;
            psy.ans[psy.qi] = k;
            btn.classList.add('on');
            psy.timer = setTimeout(() => {
                psy.timer = 0;
                if (psy.qi < psy.test.q.length - 1) { psy.qi++; psyQuestion(); }
                else psyThink();
            }, 260);
        }
        function psyBack() {
            if (!pyq('psyQ').hidden && psy.qi > 0) { psy.qi--; psyQuestion(); return; }
            psyList();
        }
        function psyThink() {
            const t = psy.test, sc = t.r.map(() => 0);
            let last = 0;
            psy.ans.forEach((k, i) => { const r = t.q[i][1][k][1]; sc[r]++; last = r; });
            const max = Math.max(...sc);
            const idx = sc[last] === max ? last : sc.indexOf(max);       // 동점이면 마지막에 고른 쪽
            psy.res = idx; psyKeep(t.id, idx);
            pyq('psyRes').innerHTML = `<div class="psy-think"><span>${t.e}</span><p>마음을 들여다보는 중…</p><div class="psy-dots"><i></i><i></i><i></i></div></div>`;
            psyShow('psyRes');
            psy.timer = setTimeout(() => { psy.timer = 0; psyResult(); }, PSY_THINK_MS);
        }
        function psyResult() {
            const t = psy.test, r = t.r[psy.res], m = t.r[r.m];
            pyq('psyRes').innerHTML = `
              <div class="psy-hero" style="--a:${t.c[0]};--b:${t.c[1]}">
                <small>${psyEsc(t.t)}</small>
                <span class="psy-big">${r.e}</span>
                <h3>${psyEsc(r.n)}</h3>
                <p>${psyEsc(r.s)}</p>
                <div class="psy-tags">${r.k.map(x => `<span>#${psyEsc(x)}</span>`).join('')}</div>
              </div>
              <article class="psy-talk">
                <p>${psyEsc(r.d)}</p>
                <div class="psy-match"><span>${m.e}</span><div><small>잘 맞는 유형</small><b>${psyEsc(m.n)}</b></div></div>
                <p class="psy-tip">💌 ${psyEsc(r.tip)}</p>
              </article>
              <div class="psy-acts">
                <button type="button" class="psy-main" onclick="psyStick()">📌 다이어리에 붙이기</button>
                <button type="button" onclick="psyStart(${PSY_TESTS.indexOf(t)})">🔁 다시 하기</button>
              </div>
              <button type="button" class="psy-other" onclick="psyList()">🧠 다른 테스트 하기</button>`;
            psyShow('psyRes');
        }

        /* ---------- 📌 결과 카드 ---------- */
        function psyCardSvg() {
            const t = psy.test, r = t.r[psy.res];
            const F = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif", EF = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
            const d = new Date(), date = `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
            const dots = [[30, 40], [270, 54], [26, 230], [274, 250], [60, 280], [246, 26]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${4 + i % 3 * 2}" fill="#fff" opacity=".7"/>`).join('');
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c[0]}"/><stop offset="1" stop-color="${t.c[1]}"/></linearGradient></defs>
<rect x="4" y="4" width="292" height="292" rx="28" fill="url(#g)"/>
<rect x="12" y="12" width="276" height="276" rx="22" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 5"/>
${dots}
<text x="150" y="52" font-size="13" text-anchor="middle" fill="#8a5a72" font-family="${F}" font-weight="bold">${psyEsc(t.e + ' ' + t.t)}</text>
<circle cx="150" cy="122" r="50" fill="#fff" opacity=".85"/>
<text x="150" y="146" font-size="62" text-anchor="middle" font-family="${EF}">${r.e}</text>
<text x="150" y="206" font-size="${r.n.length > 9 ? 19 : 22}" text-anchor="middle" fill="#5a3d4a" font-family="${F}" font-weight="bold">${psyEsc(r.n)}</text>
<text x="150" y="232" font-size="${r.s.length > 20 ? 11 : 12.5}" text-anchor="middle" fill="#7a5a68" font-family="${F}">${psyEsc(r.s)}</text>
<text x="150" y="268" font-size="11" text-anchor="middle" fill="#9a7a88" font-family="${F}">${date}</text>
</svg>`;
        }
        function psyStick() {
            if (psy.res == null) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            if (!addImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(psyCardSvg()))) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (el) el.style.width = '160px';
            closePsyTest();
            toast('🧠 테스트 결과를 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
        }

        function openPsyTest() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            psyBuild(); psyList();
            pyq('psyRoom').classList.add('show');
            document.body.classList.add('fc-lock');
        }
        function closePsyTest() {
            clearTimeout(psy.timer); psy.timer = 0;
            const r = pyq('psyRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        window.openPsyTest = openPsyTest;
