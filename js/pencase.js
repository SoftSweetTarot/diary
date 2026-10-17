/* 말랑달콤 다이어리 - js/pencase.js
   👝 필통 : 가진 도구를 모두 보관하는 틴 케이스 → 연필꽂이에 꽂을 것만 골라요 (도련 · 2026-10-15 · 10-17 칼 · 자 · 세로 정렬)
   - 페이지 빈 곳을 누르면 나오는 메뉴(js/tapmenu.js)의 '필통' 을 누르면 닫힌 필통이 나와요 → 걸쇠(뚜껑)를 톡 누르거나 왼쪽으로 밀면 뚜껑이 오른쪽에서 왼쪽으로 휙 열려요 · 필통은 늘 페이지 한가운데 (pkPlace)
   - 안에는 종류별 칸(🗂 색연필 · 형광펜 · 지우개 · 칼 · 자) → 칸을 고르면 그 종류 도구가 연필꽂이처럼 세로로 서 있어요 (많으면 여러 줄 · 안에서 위아래로 밀어요)
     톡 누르면 연필꽂이에 꽂기 / 빼기 (꽂은 것은 쏙 올라오고 하트 꼬리표) · 칸 이름 옆 숫자 = 그 종류에서 꽂은 개수
   - 도구 종류는 PK_KINDS 한 곳 · 새 색 · 새 칼(js/stkcut.js KN_KINDS) · 새 자(js/ruler.js RL_KINDS)를 넣으면 필통에 저절로 나와요
   - '뚜껑 닫기' 를 누르면 저장 → 📒 수첩 모드 연필꽂이에는 고른 것만 꽂히고 · 고르는 창 모드 필기구 줄에는 고른 색만 나와요 (js/draw.js pcList · penSetTool)
   - 연필꽂이에는 1 ~ 24 개 (너무 많으면 고르기 어려워요)
   저장 : 'diary_pencase'(설정.json) · 게스트는 이 기기 'malang_pencase' · 값 = 꽂은 도구 이름 목록 ['pen:#333333', 'hi:#ffe14d', 'erase:0', 'knife:pink', 'ruler:pink', …]
   ※ 이 파일이 없어도 다이어리는 정상 동작 (기본 필기구 그대로) */

        const PK_KEY = 'diary_pencase', PK_LOCAL = 'malang_pencase', PK_MAX = 24;
        const PK_PENS = ['#333333', '#e2556f', '#ff8a3d', '#3d9be0', '#4caf7a', '#8a6be0', '#8a5a44', '#ffffff',
                         '#ff9ec1', '#ffd36b', '#a8e3a0', '#9fd3ff', '#c7a8ff', '#ff5c8a', '#2f6fb5', '#5c3a2e'];
        const PK_HIS = ['#ffe14d', '#ff9ec4', '#9be59b', '#9fd3ff', '#ffc078', '#cdb4ff', '#ffb3d9', '#b3f0ff', '#d9ff8a'];
        /* 🗂 필통 칸 (보이는 순서) · list = 그 종류 도구들 (칼 · 자는 그 파일이 정한 종류를 읽어요) */
        const PK_KINDS = [
            { k: 'pen', lb: '색연필', list: () => PK_PENS.map(c => ({ id: 'pen:' + c, tool: 'pen', color: c, size: 1 })) },
            { k: 'hi', lb: '형광펜', list: () => PK_HIS.map(c => ({ id: 'hi:' + c, tool: 'hi', color: c, size: 1 })) },
            { k: 'erase', lb: '지우개', list: () => [0, 1, 2].map(n => ({ id: 'erase:' + n, tool: 'erase', size: n, name: ['작은 지우개', '지우개', '큰 지우개'][n] })) },
            { k: 'knife', lb: '칼', list: () => (window.skKinds ? skKinds() : []).map(t => ({ id: 'knife:' + t.id, tool: 'knife', kind: t.id, name: t.name })) },
            { k: 'ruler', lb: '자', list: () => (window.rlKinds ? rlKinds() : []).map(t => ({ id: 'ruler:' + t.id, tool: 'ruler', kind: t.id, name: t.name })) }
        ];
        let pkAllC = null;
        const pkAll = () => pkAllC || (pkAllC = PK_KINDS.reduce((a, g) => a.concat(g.list()), []));   // 칼 · 자 파일을 다 읽은 뒤 처음 쓸 때 만들어요
        const PK_DEF = PK_PENS.slice(0, 8).map(c => 'pen:' + c).concat(PK_HIS.slice(0, 6).map(c => 'hi:' + c), ['erase:0', 'erase:2', 'knife:pink', 'ruler:pink']);   // 처음 연필꽂이
        const pkq = id => document.getElementById(id);
        const pkSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest && typeof store !== 'undefined';
        const pk = { on: false, pick: null, busy: false, tab: 'pen' };

        function pkRead() {
            let v = null;
            try { v = JSON.parse(pkSync() ? store.getItem(PK_KEY) : localStorage.getItem(PK_LOCAL)); } catch (e) {}
            const ok = Array.isArray(v) ? v.filter(id => pkAll().some(t => t.id === id)) : [];
            return ok.length ? ok : PK_DEF.slice();
        }
        function pkWrite(ids) {
            const t = JSON.stringify(ids);
            try { if (pkSync()) store.setItem(PK_KEY, t); } catch (e) {}
            try { localStorage.setItem(PK_LOCAL, t); } catch (e) {}
        }
        /* 연필꽂이에 꽂을 순서 : 색연필 · 형광펜 · 지우개를 번갈아 섞고 (부채꼴로 기대면 고르기 쉬워요) · 칼은 앞쪽 · 자는 맨 오른쪽 */
        function pkCupList() {
            const on = new Set(pkRead()), g = k => pkAll().filter(t => t.tool === k && on.has(t.id)).map(t => ({ tool: t.tool, color: t.color, size: t.size, kind: t.kind }));
            const pens = g('pen'), his = g('hi'), ers = g('erase'), out = [];
            while (pens.length || his.length) { if (pens.length) out.push(pens.shift()); if (pens.length) out.push(pens.shift()); if (his.length) out.push(his.shift()); }
            ers.forEach((e, i) => out.splice(Math.round((i + 1) * out.length / (ers.length + 1)) + i, 0, e));
            g('knife').forEach((k, i) => out.splice(Math.min(2 + i * 3, out.length), 0, k));
            return out.concat(g('ruler'));
        }
        function pkFirst(tool) { const on = pkRead(); const t = pkAll().find(t => t.tool === tool && on.includes(t.id)); return t ? t.kind : null; }   // 그 종류에서 처음 고른 것 (📏 구석 연필꽂이의 작은 자 머리)

        function pkColors(tool) {                                              // 고르는 창 모드 필기구 줄의 색 (그 종류를 하나도 안 골랐으면 null → 기본 색)
            const on = new Set(pkRead()), c = pkAll().filter(t => t.tool === tool && on.has(t.id)).map(t => t.color);
            return c.length ? c : null;
        }

        /* ---------- 필통 그리기 ---------- */
        function pkSvg(t) {                                                    // 연필꽂이와 같은 그림 · 세로로 서 있어요
            return t.tool === 'erase' ? penEraserSvg(t.size) : t.tool === 'hi' ? penMarkerSvg(t.color, 1) : t.tool === 'knife' ? skKnifeSvg(t.kind) : t.tool === 'ruler' ? rlCupSvg(t.kind, 150) : penPencilSvg(t.color, 1);
        }
        function pkTool(t) {
            const nm = t.name || (t.tool === 'pen' ? '색연필' : '형광펜');
            return `<button type="button" class="pk-t pk-${t.tool}" data-id="${t.id}" aria-pressed="false" aria-label="${nm}" title="${nm}"><span class="pk-ti">${pkSvg(t)}</span><i class="pk-tag">♥</i></button>`;
        }
        function pkBuild() {
            let r = pkq('pkRoom'); if (r) return r;
            r = document.createElement('div'); r.id = 'pkRoom'; r.className = 'pk-room'; r.hidden = true;
            r.setAttribute('role', 'dialog'); r.setAttribute('aria-label', '필통');
            const kinds = PK_KINDS.filter(g => g.list().length);
            r.innerHTML = `<div class="pk-case" id="pkCase">
                <div class="pk-body">
                    <div class="pk-in">
                        <p class="pk-tip" id="pkTip"></p>
                        <div class="pk-tabs" role="tablist">${kinds.map(g => `<button type="button" class="pk-tab" role="tab" data-k="${g.k}">${g.lb}<b data-n="${g.k}"></b></button>`).join('')}</div>
                        <div class="pk-tray" id="pkTray">${kinds.map(g => `<div class="pk-row" role="tabpanel" data-k="${g.k}" hidden>${pkAll().filter(t => t.tool === g.k).map(pkTool).join('')}</div>`).join('')}</div>
                    </div>
                    <button type="button" class="pk-done" id="pkDone">뚜껑 닫기 ✓</button>
                </div>
                <div class="pk-lid" id="pkLid" role="button" tabindex="0" aria-label="뚜껑 열기">
                    <div class="pk-lid-out"><span class="pk-label"><b>MALLANG</b><small>pencil case</small></span><i class="pk-clasp"></i><em class="pk-open-tip">톡 눌러 뚜껑 열기</em></div>
                    <div class="pk-lid-in"><i class="pk-band"></i><span class="pk-memo">오늘은 무엇으로 꾸밀까? ✏️</span></div>
                </div>
            </div>
            <button type="button" class="pk-x" id="pkX" aria-label="필통 닫기">✕</button>`;
            document.body.appendChild(r);
            const lid = pkq('pkLid');
            lid.onclick = () => { if (!pkq('pkCase').classList.contains('open')) pkOpenLid(); };
            lid.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lid.onclick(); } };
            let x0 = null;                                                     // 왼쪽으로 밀어도 열려요
            lid.addEventListener('pointerdown', e => { x0 = e.clientX; });
            lid.addEventListener('pointermove', e => { if (x0 != null && x0 - e.clientX > 30) { x0 = null; lid.onclick(); } });
            addEventListener('pointerup', () => { x0 = null; });
            addEventListener('resize', () => { if (pk.on) pkPlace(); });
            r.querySelectorAll('.pk-t').forEach(b => b.onclick = () => pkToggle(b));
            r.querySelectorAll('.pk-tab').forEach(b => b.onclick = () => pkTab(b.dataset.k));
            pkq('pkDone').onclick = pkClose;
            pkq('pkX').onclick = pkClose;
            r.addEventListener('keydown', e => { if (e.key === 'Escape') pkClose(); });
            return r;
        }
        /* 🗂 종류 칸 고르기 → 그 종류만 세로로 */
        function pkTab(k) {
            pk.tab = k;
            pkq('pkRoom').querySelectorAll('.pk-tab').forEach(b => { const v = b.dataset.k === k; b.classList.toggle('on', v); b.setAttribute('aria-selected', v); });
            pkq('pkRoom').querySelectorAll('.pk-row').forEach(w => { w.hidden = w.dataset.k !== k; });
            pkq('pkTray').scrollTop = 0;
        }
        function pkRender() {
            const on = pk.pick, r = pkq('pkRoom');
            r.querySelectorAll('.pk-t').forEach(b => { const v = on.has(b.dataset.id); b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); });
            r.querySelectorAll('[data-n]').forEach(n => { const c = [...on].filter(id => id.split(':')[0] === n.dataset.n).length; n.textContent = c || ''; });
            pkq('pkTip').innerHTML = `연필꽂이에 꽂을 것을 <b>톡</b> 골라요 · <b>${on.size}</b> / ${PK_MAX}개`;
        }
        function pkToggle(b) {
            const id = b.dataset.id, on = pk.pick;
            if (on.has(id)) { if (![...on].some(v => v !== id && /^(pen|hi):/.test(v)) && /^(pen|hi):/.test(id)) { pkSay('쓸 색연필 · 형광펜 하나는 꼭 꽂아 둬요 ✏️'); return; } on.delete(id); }
            else { if (on.size >= PK_MAX) { pkSay(`연필꽂이에는 ${PK_MAX}개까지 꽂을 수 있어요`); return; } on.add(id); }
            b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
            if (window.sfx) try { sfx('tick'); } catch (e) {}
            pkRender();
        }
        function pkSay(t) { const p = pkq('pkTip'); p.innerHTML = t; p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); clearTimeout(pk.tm); pk.tm = setTimeout(pkRender, 1600); }

        /* 페이지 한가운데에 맞춰요 : 닫혀 있을 땐 한가운데 · 뚜껑을 열면 젖혀질 자리(몸통 폭의 약 28%)만큼 오른쪽으로 비켜요 → 페이지 안에 들어오게 줄여요 */
        function pkPlace() {
            const c = pkq('pkCase'), pg = document.getElementById('canvasArea'); if (!c) return;
            const r = pg ? pg.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
            const W = c.offsetWidth, H = c.offsetHeight, lid = W * .28;
            const s = Math.min(1, (r.width - 12) / (W + lid), (r.height - 12) / H, (innerHeight - 16) / H);
            const x = r.left + (r.width - W * s) / 2, y = Math.max(8, r.top + (r.height - H * s) / 2);
            c.style.setProperty('--s', s.toFixed(3)); c.style.setProperty('--x', Math.round(x) + 'px'); c.style.setProperty('--y', Math.round(y) + 'px');
            c.style.setProperty('--ox', Math.round(lid * s / 2) + 'px');
        }

        /* ---------- 열고 닫기 ---------- */
        function openPencase() {
            if (pk.on || pk.busy) return;
            const r = pkBuild(); pk.on = true; pk.pick = new Set(pkRead());
            pkRender(); pkTab(pk.tab);
            const c = pkq('pkCase'); c.classList.remove('open', 'shut');
            r.hidden = false; pkPlace(); requestAnimationFrame(() => r.classList.add('show'));
            setTimeout(() => pkq('pkLid').focus({ preventScroll: true }), 50);
        }
        function pkOpenLid() {
            const c = pkq('pkCase'); c.classList.add('open');
            if (window.sfx) try { sfx('page'); } catch (e) {}
            setTimeout(() => { const b = pkq('pkRoom').querySelector('.pk-tab.on'); if (b) b.focus({ preventScroll: true }); }, 500);
        }
        function pkClose() {
            if (!pk.on || pk.busy) return;
            pk.busy = true;
            const r = pkq('pkRoom'), c = pkq('pkCase'), was = c.classList.contains('open');
            pkWrite([...pk.pick]);
            if (window.rlTopSync) rlTopSync();                                   // 📏 구석 연필꽂이의 작은 자 머리
            c.classList.remove('open'); c.classList.add('shut');                    // 뚜껑 탁 → 사라져요
            setTimeout(() => {
                r.classList.remove('show');
                setTimeout(() => {
                    r.hidden = true; pk.on = false; pk.busy = false;
                }, 220);
            }, was ? 480 : 60);
        }
        window.openPencase = openPencase; window.pkCupList = pkCupList; window.pkColors = pkColors; window.pkFirst = pkFirst;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['pencase'] = true;
