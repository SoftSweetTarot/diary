/* 말랑달콤 다이어리 - js/pencase.js
   👝 필통 : 필기구를 모두 보관하는 틴 케이스 → 연필통(js/draw.js 📒 수첩 모드 연필통)에 꽂을 필기구를 골라요 (도련 · 2026-10-15)
   - 연필통 왼쪽 위 '필통' 을 누르면 닫힌 필통이 나와요 → 걸쇠(뚜껑)를 톡 누르거나 위로 밀면 뚜껑이 휙 열려요
   - 안에는 색연필 16 · 형광펜 9 · 지우개 3 이 칸칸이 누워 있어요 → 톡 누르면 연필통에 꽂기 / 빼기 (꽂은 것은 하트 꼬리표)
   - '뚜껑 닫기' 를 누르면 뚜껑이 닫히고 → 연필통에 고른 필기구가 새로 꽂혀요
   - 연필통에는 1 ~ 20 자루 (너무 많으면 고르기 어려워요)
   저장 : 'diary_pencase'(설정.json) · 게스트는 이 기기 'malang_pencase' · 값 = 꽂은 필기구 이름 목록 ['pen:#333333', 'hi:#ffe14d', 'erase:0', …]
   ※ 이 파일이 없어도 다이어리는 정상 동작 (연필통에 기본 16자루 · 필통 버튼만 안 보여요) */

        const PK_KEY = 'diary_pencase', PK_LOCAL = 'malang_pencase', PK_MAX = 20;
        const PK_PENS = ['#333333', '#e2556f', '#ff8a3d', '#3d9be0', '#4caf7a', '#8a6be0', '#8a5a44', '#ffffff',
                         '#ff9ec1', '#ffd36b', '#a8e3a0', '#9fd3ff', '#c7a8ff', '#ff5c8a', '#2f6fb5', '#5c3a2e'];
        const PK_HIS = ['#ffe14d', '#ff9ec4', '#9be59b', '#9fd3ff', '#ffc078', '#cdb4ff', '#ffb3d9', '#b3f0ff', '#d9ff8a'];
        const PK_ALL = PK_PENS.map(c => ({ id: 'pen:' + c, tool: 'pen', color: c, size: 1 }))
            .concat(PK_HIS.map(c => ({ id: 'hi:' + c, tool: 'hi', color: c, size: 1 })), [0, 1, 2].map(n => ({ id: 'erase:' + n, tool: 'erase', size: n })));
        const PK_DEF = PK_PENS.slice(0, 8).map(c => 'pen:' + c).concat(PK_HIS.slice(0, 6).map(c => 'hi:' + c), ['erase:0', 'erase:2']);   // 처음 연필통 (예전과 같은 16자루)
        const pkq = id => document.getElementById(id);
        const pkSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest && typeof store !== 'undefined';
        const pk = { on: false, pick: null, busy: false };

        function pkRead() {
            let v = null;
            try { v = JSON.parse(pkSync() ? store.getItem(PK_KEY) : localStorage.getItem(PK_LOCAL)); } catch (e) {}
            const ok = Array.isArray(v) ? v.filter(id => PK_ALL.some(t => t.id === id)) : [];
            return ok.length ? ok : PK_DEF.slice();
        }
        function pkWrite(ids) {
            const t = JSON.stringify(ids);
            try { if (pkSync()) store.setItem(PK_KEY, t); } catch (e) {}
            try { localStorage.setItem(PK_LOCAL, t); } catch (e) {}
        }
        /* 연필통에 꽂을 순서 : 색연필 · 형광펜 · 지우개를 번갈아 섞어요 (부채꼴로 기대면 고르기 쉬워요) */
        function pkCupList() {
            const on = new Set(pkRead()), g = k => PK_ALL.filter(t => t.tool === k && on.has(t.id)).map(t => ({ tool: t.tool, color: t.color, size: t.size }));
            const pens = g('pen'), his = g('hi'), ers = g('erase'), out = [];
            while (pens.length || his.length) { if (pens.length) out.push(pens.shift()); if (pens.length) out.push(pens.shift()); if (his.length) out.push(his.shift()); }
            ers.forEach((e, i) => out.splice(Math.round((i + 1) * out.length / (ers.length + 1)) + i, 0, e));
            return out;
        }

        /* ---------- 필통 그리기 ---------- */
        function pkTool(t) {                                                   // 칸에 누운 필기구 (연필통과 같은 그림을 옆으로 눕혀요)
            const svg = t.tool === 'erase' ? penEraserSvg(t.size) : t.tool === 'hi' ? penMarkerSvg(t.color, 1) : penPencilSvg(t.color, 1);
            return `<button type="button" class="pk-t pk-${t.tool}" data-id="${t.id}" aria-pressed="false" aria-label="${t.tool === 'pen' ? '색연필' : t.tool === 'hi' ? '형광펜' : '지우개'}"><span class="pk-ti">${svg}</span><i class="pk-tag">♥</i></button>`;
        }
        function pkBuild() {
            let r = pkq('pkRoom'); if (r) return r;
            r = document.createElement('div'); r.id = 'pkRoom'; r.className = 'pk-room'; r.hidden = true;
            r.setAttribute('role', 'dialog'); r.setAttribute('aria-label', '필통');
            const col = k => PK_ALL.filter(t => t.tool === k).map(pkTool).join('');
            r.innerHTML = `<div class="pk-case" id="pkCase">
                <div class="pk-body">
                    <div class="pk-in">
                        <p class="pk-tip" id="pkTip"></p>
                        <div class="pk-cols">
                            <div class="pk-col"><small class="pk-lb">색연필</small>${col('pen')}</div>
                            <div class="pk-col"><small class="pk-lb">형광펜</small>${col('hi')}<small class="pk-lb">지우개</small><div class="pk-ers">${col('erase')}</div></div>
                        </div>
                    </div>
                    <button type="button" class="pk-done" id="pkDone">뚜껑 닫기 ✓</button>
                </div>
                <div class="pk-lid" id="pkLid" role="button" tabindex="0" aria-label="뚜껑 열기">
                    <div class="pk-lid-out"><span class="pk-label"><b>MALLANG</b><small>pencil case</small></span><i class="pk-clasp"></i><em class="pk-open-tip">톡 눌러 뚜껑 열기</em></div>
                    <div class="pk-lid-in"><i class="pk-band"></i><span class="pk-memo">오늘은 어떤 색으로 쓸까? ✏️</span></div>
                </div>
            </div>
            <button type="button" class="pk-x" id="pkX" aria-label="필통 닫기">✕</button>`;
            document.body.appendChild(r);
            const lid = pkq('pkLid');
            lid.onclick = () => { if (!pkq('pkCase').classList.contains('open')) pkOpenLid(); };
            lid.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lid.onclick(); } };
            let y0 = null;                                                     // 위로 밀어도 열려요
            lid.addEventListener('pointerdown', e => { y0 = e.clientY; });
            lid.addEventListener('pointermove', e => { if (y0 != null && y0 - e.clientY > 30) { y0 = null; lid.onclick(); } });
            addEventListener('pointerup', () => { y0 = null; });
            r.querySelectorAll('.pk-t').forEach(b => b.onclick = () => pkToggle(b));
            pkq('pkDone').onclick = pkClose;
            pkq('pkX').onclick = pkClose;
            r.addEventListener('keydown', e => { if (e.key === 'Escape') pkClose(); });
            return r;
        }
        function pkRender() {
            const on = pk.pick;
            pkq('pkRoom').querySelectorAll('.pk-t').forEach(b => { const v = on.has(b.dataset.id); b.classList.toggle('on', v); b.setAttribute('aria-pressed', v); });
            pkq('pkTip').innerHTML = `연필통에 꽂을 필기구를 <b>톡</b> 골라요 · <b>${on.size}</b> / ${PK_MAX}자루`;
        }
        function pkToggle(b) {
            const id = b.dataset.id, on = pk.pick;
            if (on.has(id)) { if (on.size <= 1) { pkSay('한 자루는 꼭 꽂아 둬요 ✏️'); return; } on.delete(id); }
            else { if (on.size >= PK_MAX) { pkSay(`연필통에는 ${PK_MAX}자루까지 들어가요`); return; } on.add(id); }
            b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
            if (window.sfx) try { sfx('tick'); } catch (e) {}
            pkRender();
        }
        function pkSay(t) { const p = pkq('pkTip'); p.innerHTML = t; p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); clearTimeout(pk.tm); pk.tm = setTimeout(pkRender, 1600); }

        /* ---------- 열고 닫기 ---------- */
        function openPencase() {
            if (pk.on || pk.busy) return;
            const r = pkBuild(); pk.on = true; pk.pick = new Set(pkRead());
            pkRender();
            const c = pkq('pkCase'); c.classList.remove('open', 'shut');
            r.hidden = false; requestAnimationFrame(() => r.classList.add('show'));
            const cup = pkq('pcCup'); if (cup) cup.classList.add('pk-away');           // 연필통은 잠깐 뒤로
            setTimeout(() => pkq('pkLid').focus({ preventScroll: true }), 50);
        }
        function pkOpenLid() {
            const c = pkq('pkCase'); c.classList.add('open');
            if (window.sfx) try { sfx('page'); } catch (e) {}
            setTimeout(() => { const b = pkq('pkRoom').querySelector('.pk-t'); if (b) b.focus({ preventScroll: true }); }, 500);
        }
        function pkClose() {
            if (!pk.on || pk.busy) return;
            pk.busy = true;
            const r = pkq('pkRoom'), c = pkq('pkCase'), was = c.classList.contains('open');
            pkWrite([...pk.pick]);
            c.classList.remove('open'); c.classList.add('shut');                    // 뚜껑 탁 → 사라져요
            setTimeout(() => {
                r.classList.remove('show');
                setTimeout(() => {
                    r.hidden = true; pk.on = false; pk.busy = false;
                    const cup = pkq('pcCup'); if (cup) cup.classList.remove('pk-away');
                    if (window.pcFill && pkq('pcRoom') && !pkq('pcRoom').hidden) pcFill();   // 연필통에 새로 꽂아요
                }, 220);
            }, was ? 480 : 60);
        }
        window.openPencase = openPencase; window.pkCupList = pkCupList;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['pencase'] = true;
