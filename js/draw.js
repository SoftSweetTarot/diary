/* 말랑달콤 다이어리 - js/draw.js
   🖍️ 펜 · 형광펜 : 다이어리 위에 손으로 그리고 밑줄 긋기 (툴바 → 🖍️ 펜)
   - 펜 : 또렷한 선 · 형광펜 : 반투명한 굵은 선 (글 위에 그어도 글씨가 비쳐 보여요)
   - 지우개는 문지른 부분만 지워요 (굵기 3가지) · ↶ 는 방금 한 일(그리기 · 지우기) 되돌리기
   - ✓ 완료를 누르면 이번에 그린 선들이 그림 하나가 돼요 → 다른 그림처럼 옮기기 · 돌리기 · 크기 · 삭제
   - 그림은 SVG 로 일기에 담겨요 (파일 없음) · 선을 아주 많이 그리면 그날 일기 파일이 조금 커져요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (펜 버튼만 '준비 중') */

        const DRAW_PEN_COLORS = ['#333333', '#e2556f', '#ff8a3d', '#3d9be0', '#4caf7a', '#8a6be0', '#8a5a44', '#ffffff'];
        const DRAW_HI_COLORS = ['#ffe14d', '#ff9ec4', '#9be59b', '#9fd3ff', '#ffc078', '#cdb4ff'];
        const DRAW_SIZES = { pen: [2, 4, 7], hi: [12, 18, 26], erase: [12, 24, 40] };
        const dw = { on: false, tool: 'pen', color: { pen: DRAW_PEN_COLORS[0], hi: DRAW_HI_COLORS[0] }, size: { pen: 1, hi: 1, erase: 1 }, strokes: [], hist: [], cur: null, ring: null, svg: null, k: 1 };
        const drq = id => document.getElementById(id);
        const DRAW_NS = 'http://www.w3.org/2000/svg';

        function penPathD(pts) {                       // 점들을 부드러운 곡선으로
            const f = n => Math.round(n * 10) / 10;
            if (pts.length === 1) return `M${f(pts[0][0])} ${f(pts[0][1])}l0.1 0`;
            let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
            for (let i = 1; i < pts.length - 1; i++) {
                const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
                d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
            }
            const l = pts[pts.length - 1];
            return d + `L${f(l[0])} ${f(l[1])}`;
        }
        function penAttrs(s) {
            return s.tool === 'hi'
                ? { stroke: s.color, 'stroke-width': s.w, 'stroke-opacity': .42, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round', fill: 'none' }
                : { stroke: s.color, 'stroke-width': s.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };
        }
        function penRender() {
            const g = dw.svg && dw.svg.firstChild; if (!g) return;
            g.innerHTML = '';
            dw.strokes.concat(dw.cur ? [dw.cur] : []).forEach(s => {
                const p = document.createElementNS(DRAW_NS, 'path');
                p.setAttribute('d', penPathD(s.pts));
                const a = penAttrs(s); Object.keys(a).forEach(k => p.setAttribute(k, a[k]));
                g.appendChild(p);
            });
            drq('penUndo').disabled = !dw.hist.length;
        }

        /* ---------- 그리기 모드 ---------- */
        function openDraw() {
            if (dw.on) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            if (selectedElement) { selectedElement.classList.remove('selected'); selectedElement = null; if (typeof updateTextPanel === 'function') updateTextPanel(); }
            penBuildBar();
            const canvas = drq('canvasArea');
            const svg = document.createElementNS(DRAW_NS, 'svg');
            svg.id = 'penLayer'; svg.setAttribute('class', 'draw-layer');
            svg.innerHTML = '<g></g><circle class="draw-ring" r="10" cx="-99" cy="-99"/>';
            canvas.appendChild(svg);
            dw.svg = svg; dw.ring = svg.lastChild; dw.strokes = []; dw.hist = []; dw.cur = null; dw.on = true;
            svg.addEventListener('pointerdown', penDown);
            svg.addEventListener('pointermove', penMove);
            svg.addEventListener('pointerup', penUp);
            svg.addEventListener('pointercancel', penUp);
            svg.addEventListener('pointerleave', () => penRing(null));
            document.body.classList.add('draw-on');
            drq('penBar').hidden = false;
            penSetTool(dw.tool);
            if (penNote()) { drq('penBar').hidden = true; pcOpen(); }        // 📒 수첩 모드 : 아래 창 대신 연필통
            penRender();
        }
        function penPoint(e) {
            const c = drq('canvasArea'), r = c.getBoundingClientRect();
            dw.k = r.width / (c.offsetWidth || r.width) || 1;
            return [(e.clientX - r.left) / dw.k, (e.clientY - r.top) / dw.k];
        }
        function penDown(e) {
            e.preventDefault(); e.stopPropagation();
            if (penNote() && (!pcS.held || pcS.carry)) return;                 // 📒 필기구를 뽑아야 써져요
            if (penNote()) pcHeldAt(e.clientX, e.clientY);                     // 연필심이 닿은 바로 그 자리
            try { dw.svg.setPointerCapture(e.pointerId); } catch (err) {}
            const pt = penPoint(e);
            if (dw.tool === 'erase') { dw.erasing = true; dw.hist.push(dw.strokes); dw.erased = false; penRing(pt); penEraseAt(pt); return; }
            dw.cur = { tool: dw.tool, color: dw.color[dw.tool], w: DRAW_SIZES[dw.tool][dw.size[dw.tool]], pts: [pt] };
            penRender();
        }
        function penMove(e) {
            if (penNote()) { if (!pcS.held || pcS.carry) return; if (dw.cur || dw.erasing || e.pointerType === 'mouse') pcHeldAt(e.clientX, e.clientY); }   // 📒 연필심이 따라와요
            if (dw.tool === 'erase' && !dw.erasing) penRing(penPoint(e));
            if (!dw.cur && !dw.erasing) return;
            e.preventDefault(); e.stopPropagation();
            const pt = penPoint(e);
            if (dw.erasing) penRing(pt);
            if (dw.erasing) { penEraseAt(pt); return; }
            const l = dw.cur.pts[dw.cur.pts.length - 1];
            if (Math.hypot(pt[0] - l[0], pt[1] - l[1]) < 1.5) return;
            if (dw.cur.tool === 'hi' && e.shiftKey) pt[1] = dw.cur.pts[0][1];      // PC : Shift 를 누르면 곧은 형광펜
            dw.cur.pts.push(pt);
            penRender();
        }
        function penUp(e) {
            if (e) e.stopPropagation();
            if (dw.erasing) { dw.erasing = false; if (!dw.erased) dw.hist.pop(); if (e && e.pointerType !== 'mouse') penRing(null); penRender(); }
            if (dw.cur) { dw.hist.push(dw.strokes); dw.strokes = dw.strokes.concat([dw.cur]); dw.cur = null; penRender(); }
        }
        /* 🧽 지우개 : 동그라미에 닿은 부분만 지우고, 선이 끊기면 두 개로 나눠요 */
        function penRing(pt) {
            const c = dw.ring; if (!c) return;
            c.setAttribute('r', DRAW_SIZES.erase[dw.size.erase] / 2);
            c.setAttribute('cx', pt ? pt[0] : -99); c.setAttribute('cy', pt ? pt[1] : -99);
        }
        function penDense(pts) {                       // 점 사이가 멀면 촘촘하게 (곧은 형광펜도 부분 지우기)
            const out = [pts[0]];
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
                for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
            }
            return out;
        }
        function penEraseAt(pt) {
            const r = DRAW_SIZES.erase[dw.size.erase] / 2;
            const near = (p, s) => Math.hypot(p[0] - pt[0], p[1] - pt[1]) < r + s.w * .35;
            let hit = false;
            const out = [];
            dw.strokes.forEach(s => {
                const pts = penDense(s.pts);
                if (!pts.some(p => near(p, s))) { out.push(s); return; }
                hit = true;
                let run = [];
                const keep = () => { if (run.length > (s.tool === 'hi' ? 1 : 0)) out.push({ tool: s.tool, color: s.color, w: s.w, pts: run }); run = []; };
                pts.forEach(p => { if (near(p, s)) keep(); else run.push(p); });
                keep();
            });
            if (hit) { dw.strokes = out; dw.erased = true; penRender(); }
        }
        function penUndo() { if (dw.hist.length) { dw.strokes = dw.hist.pop(); penRender(); } }
        /* ---------- ✏️ 필기구 그림 (📒 수첩 모드 연필통에서 써요 · 30 × 150 · 위가 연필심) ---------- */
        const penNote = () => typeof window.snbMode === 'function' && snbMode() === 'note';
        function penLighten(c, k) {                    // 색을 k 만큼 하얗게
            const n = parseInt(c.slice(1), 16), r = n >> 16, g = n >> 8 & 255, b = n & 255, f = v => Math.round(v + (255 - v) * k);
            return `rgb(${f(r)},${f(g)},${f(b)})`;
        }
        function penPencilSvg(c, size) {               // 색연필 한 자루 (30 × 150) · 위가 연필심
            const tip = [1.6, 2.6, 3.8][size], wood = '#f3d2a8', light = c === '#ffffff' ? '#f4f0f2' : penLighten(c, .28), dark = c === '#ffffff' ? '#ddd3d8' : penLighten(c, -0) ;
            const lead = c === '#ffffff' ? '#e9e2e5' : c;
            return `<svg viewBox="0 0 30 150" aria-hidden="true"><path d="M5 34 L15 2 L25 34 Z" fill="${wood}"/><path d="M5 34 Q8 31 10 34 Q12.5 31 15 34 Q17.5 31 20 34 Q22 31 25 34" fill="${wood}" stroke="#e2b88c" stroke-width=".8"/>`
                + `<path d="M${15 - tip} 13 L15 2 L${15 + tip} 13 Z" fill="${lead}"/>`
                + `<rect x="5" y="34" width="20" height="98" fill="${dark}"/><rect x="5" y="34" width="6.6" height="98" fill="${light}"/><rect x="18.4" y="34" width="6.6" height="98" fill="rgba(0,0,0,.12)"/>`
                + `<rect x="5" y="34" width="20" height="98" fill="none" stroke="rgba(90,60,70,.18)" stroke-width=".8"/>`
                + `<text x="15" y="90" font-size="7" fill="rgba(255,255,255,.75)" text-anchor="middle" transform="rotate(-90 15 90)" font-family="sans-serif">MALLANG</text>`
                + `<rect x="5" y="132" width="20" height="9" fill="#e5c76b"/><path d="M5 135 H25 M5 138 H25" stroke="#c9a94d" stroke-width=".8"/><rect x="5.5" y="141" width="19" height="9" rx="3" fill="#ffadc4"/></svg>`;
        }
        function penMarkerSvg(c, size) {               // 뚜껑 연 형광펜 (30 × 150) · 위가 납작한 펜촉
            const nib = [5, 7, 9][size];
            return `<svg viewBox="0 0 30 150" aria-hidden="true"><path d="M${15 - nib} 18 L${15 - nib + 2} 4 L${15 + nib} 9 L${15 + nib} 18 Z" fill="${c}" stroke="rgba(0,0,0,.12)" stroke-width=".8"/>`
                + `<path d="M4 30 Q4 18 9 18 H21 Q26 18 26 30 Z" fill="${penLighten(c, .1)}" stroke="rgba(0,0,0,.12)" stroke-width=".8"/>`
                + `<rect x="3" y="30" width="24" height="116" rx="7" fill="${penLighten(c, .45)}" stroke="rgba(0,0,0,.1)" stroke-width=".8"/>`
                + `<rect x="3" y="58" width="24" height="44" fill="#fff" opacity=".85"/><text x="15" y="80" font-size="7.5" font-weight="bold" fill="${c}" text-anchor="middle" transform="rotate(-90 15 80)" font-family="sans-serif">HIGH</text>`
                + `<rect x="8" y="34" width="4" height="108" rx="2" fill="#fff" opacity=".35"/></svg>`;
        }
        function penEraserSvg(size) {                  // 지우개 (작은 · 보통 · 큰) · 종이 띠를 두른 블록
            const w = [14, 20, 27][size], x = 15 - w / 2;
            return `<svg viewBox="0 0 30 150" aria-hidden="true"><rect x="${x}" y="36" width="${w}" height="110" rx="4" fill="#fffaf4" stroke="#e3d6cc" stroke-width="1"/>`
                + `<rect x="${x}" y="70" width="${w}" height="70" fill="#8fc8e8"/><rect x="${x}" y="80" width="${w}" height="7" fill="#fff" opacity=".7"/>`
                + `<path d="M${x + 2} 39 Q15 35 ${x + w - 2} 39" stroke="#cfc2b8" stroke-width="1" fill="none"/></svg>`;
        }
        function penSetTool(t) {
            dw.tool = t;
            document.querySelectorAll('#penBar [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
            const opt = drq('penOpts');
            drq('penLayer').classList.toggle('erasing', t === 'erase');
            if (t !== 'erase') penRing(null);
            if (t === 'erase') {
                opt.innerHTML = '<span class="draw-hint">지울 곳을 문질러요</span><span class="draw-sep"></span>'
                    + DRAW_SIZES.erase.map((w, i) => `<button type="button" class="draw-size${i === dw.size.erase ? ' on' : ''}" onclick="penSetSize(${i})" aria-label="지우개 크기"><i style="width:${w / 2 + 4}px;height:${w / 2 + 4}px;border-radius:50%;background:#fff;box-shadow:0 0 0 1.5px #c9a3b2"></i></button>`).join('');
                return;
            }
            const cols = t === 'hi' ? DRAW_HI_COLORS : DRAW_PEN_COLORS;
            opt.innerHTML = cols.map(c => `<button type="button" class="draw-col${c === dw.color[t] ? ' on' : ''}" style="--c:${c}" onclick="penSetColor('${c}')" aria-label="색"></button>`).join('')
                + '<span class="draw-sep"></span>'
                + DRAW_SIZES[t].map((w, i) => `<button type="button" class="draw-size${i === dw.size[t] ? ' on' : ''}" onclick="penSetSize(${i})" aria-label="굵기"><i style="width:${Math.min(22, w + 3)}px;height:${Math.min(t === 'hi' ? 10 : 22, w + 3)}px;border-radius:${t === 'hi' ? 2 : 50}px"></i></button>`).join('');
        }
        function penSetColor(c) { dw.color[dw.tool] = c; penSetTool(dw.tool); }
        function penSetSize(i) { dw.size[dw.tool] = i; penSetTool(dw.tool); }

        /* ✓ 완료 : 그린 선들 → 다이어리 그림 하나 */
        function penDone() {
            const strokes = dw.strokes.slice();
            penClose();
            if (!strokes.length) return;
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            strokes.forEach(s => s.pts.forEach(p => { const r = s.w / 2 + 2; x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); }));
            const bw = Math.max(10, Math.ceil(x1 - x0)), bh = Math.max(10, Math.ceil(y1 - y0));
            const paths = strokes.map(s => {
                const a = penAttrs(s);
                const d = penPathD(s.pts.map(p => [p[0] - x0, p[1] - y0]));
                return `<path d="${d}" ${Object.keys(a).map(k => `${k}="${a[k]}"`).join(' ')}/>`;
            }).join('');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${bh}" width="${bw}" height="${bh}"><!--malang-draw-->${paths}</svg>`;
            if (!addImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (!el) return;
            const img = el.querySelector('img');
            el.style.width = bw + 'px'; el.style.height = bh + 'px';
            el.dataset.posX = 0; el.dataset.posY = 0; el.dataset.scale = 1; el.dataset.rotation = 0;
            el.style.transform = 'translate(0px, 0px) scale(1) rotate(0deg)';
            // 그린 자리에 정확히 놓기 (화면 확대 · 여백까지 계산)
            const c = drq('canvasArea').getBoundingClientRect(), k = dw.k || 1, ir = img.getBoundingClientRect();
            const ew = bw + (bw - ir.width / k), eh = bh + (bh - ir.height / k);
            el.style.width = ew + 'px'; el.style.height = eh + 'px';
            const ir2 = img.getBoundingClientRect();
            const px = (c.left + x0 * k - ir2.left) / k, py = (c.top + y0 * k - ir2.top) / k;
            el.dataset.posX = px; el.dataset.posY = py;
            el.style.transform = `translate(${px}px, ${py}px) scale(1) rotate(0deg)`;
            if (selectedElement) selectedElement.classList.remove('selected');
            selectedElement = null; if (typeof updateTextPanel === 'function') updateTextPanel();
            saveData(false);
        }
        function penCancel() {
            if (dw.strokes.length) {
                showMsg('그린 선을 모두 지우고 나갈까요?', true).then(ok => { if (ok) penClose(); });
                return;
            }
            penClose();
        }
        function penClose() {
            dw.on = false; dw.cur = null; dw.strokes = []; dw.hist = []; dw.ring = null;
            const l = drq('penLayer'); if (l) l.remove();
            dw.svg = null;
            const bar = drq('penBar'); if (bar) bar.hidden = true;
            pcClose();
            document.body.classList.remove('draw-on');
        }

        function penBuildBar() {
            if (drq('penBar')) return;
            const bar = document.createElement('div');
            bar.id = 'penBar'; bar.className = 'draw-bar'; bar.hidden = true;
            bar.innerHTML = `
              <div class="draw-row">
                <button type="button" data-tool="pen" onclick="penSetTool('pen')">🖊️ 펜</button>
                <button type="button" data-tool="hi" onclick="penSetTool('hi')">🖍️ 형광펜</button>
                <button type="button" data-tool="erase" onclick="penSetTool('erase')">🧽 지우개</button>
                <button type="button" id="penUndo" onclick="penUndo()" aria-label="되돌리기">↶</button>
              </div>
              <div class="draw-row draw-opts" id="penOpts"></div>
              <div class="draw-row">
                <button type="button" class="draw-cancel" onclick="penCancel()">✕ 취소</button>
                <button type="button" class="draw-done" onclick="penDone()">✓ 완료</button>
              </div>`;
            document.body.appendChild(bar);
        }

        /* ---------- ✏️ 📒 수첩 모드 연필통 (고르는 창 모드는 지금 그대로 · 도련 · 2026-10-13)
           - 예쁜 연필통에 색연필 · 형광펜 · 지우개가 섞여 꽂혀 있어요 → 옆으로 끌면 비켜나고, 위로 쭉 끌면 쏙 뽑혀요
           - 뽑으면 연필통은 오른쪽 아래 구석의 작은 연필통이 되고, 뽑은 필기구만 손에 들려요
           - 쓰면 연필심(지우개는 바닥)이 손가락 · 마우스가 닿은 바로 그 자리를 따라가요
           - 필기구를 꾹 누르면 집어 들어 옮겨요 → 작은 연필통에 꽂으면 ✓ 완료 · 화면 밖으로 던지면 '지울까요?'
           - 작은 연필통을 톡 눌러도 꽂혀요 ---------- */
        const PC_ANG = -145;                               // 들고 있는 필기구 기울기 (연필심이 왼쪽 아래 · 몸통은 오른쪽 위)
        const pcS = { tools: [], held: null, tip: null, carry: null, press: null, drag: null, z: 10 };
        const pcSvg = o => o.tool === 'erase' ? penEraserSvg(o.size) : o.tool === 'hi' ? penMarkerSvg(o.color, 1) : penPencilSvg(o.color, 1);
        const pcTipOf = o => o.tool === 'erase' ? [15, 37] : o.tool === 'hi' ? [15, 5] : [15, 2];   // 그림 안 닿는 점
        function pcList() {                                // 👝 필통에서 고른 것만 (js/pencase.js · 없으면 기본 16자루)
            if (window.pkCupList) return pkCupList();
            const all = DRAW_PEN_COLORS.map(c => ({ tool: 'pen', color: c, size: 1 })).concat(DRAW_HI_COLORS.map(c => ({ tool: 'hi', color: c, size: 1 })), [{ tool: 'erase', size: 0 }, { tool: 'erase', size: 2 }]);
            return [0, 8, 3, 14, 1, 11, 5, 9, 15, 2, 12, 6, 10, 4, 13, 7].map(i => all[i]).filter(Boolean);   // 섞어서 꽂아요
        }
        function pcBuild() {
            let r = drq('pcRoom'); if (r) return r;
            r = document.createElement('div'); r.id = 'pcRoom'; r.className = 'pc-room'; r.hidden = true;
            r.innerHTML = `<div class="pc-cup" id="pcCup"><p class="pc-hint">필기구를 골라 <b>위로 쏙</b> 뽑아요 · 옆으로 밀면 비켜나요</p>`
                + `<button type="button" class="pc-x" aria-label="닫기">✕</button>`
                + `<button type="button" class="pc-case" id="pcCase" aria-label="필통 열기 (연필통에 꽂을 필기구 고르기)" hidden><i class="pc-case-lid"></i><i class="pc-case-box"></i><b>필통</b></button><div class="pc-back"></div><div class="pc-tools" id="pcTools"></div><div class="pc-front"><i></i><b>♡</b></div></div>`
                + `<div class="pc-held" id="pcHeld" hidden></div><p class="pc-tipnote" id="pcTipNote" hidden>다 쓰면 필기구를 꾹 집어 <b>구석 연필통</b>에 꽂아요 ✏️</p>`
                + `<button type="button" class="pc-mini" id="pcMini" hidden aria-label="연필통 (꽂으면 완료)"><span class="pc-mini-tops"><i style="--c:#e2556f"></i><i style="--c:#3d9be0"></i><i style="--c:#ffe14d"></i></span><span class="pc-mini-cup"></span></button>`;
            document.body.appendChild(r);
            r.querySelector('.pc-x').onclick = () => { if (pcS.memo) pcMemoSkip(); else penClose(); };
            drq('pcCase').onclick = () => { if (window.openPencase && !pcS.held) openPencase(); };
            drq('pcMini').onclick = () => { if (pcS.held) pcPutBack(); else if (pcS.memo) pcMemoEnd(); };
            return r;
        }
        /* 페이지 가운데 길쭉한 연필통 · 작은 연필통은 페이지 오른쪽 아래 (하단 메뉴 밖으로 안 나가게) */
        function pcLayout() {
            const pg = drq('canvasArea'), cup = drq('pcCup'), mini = drq('pcMini'), note = drq('pcTipNote'); if (!pg || !cup) return;
            const r = pg.getBoundingClientRect(), cw = cup.offsetWidth, ch = cup.offsetHeight;
            cup.style.left = Math.round(r.left + r.width / 2 - cw / 2) + 'px';
            cup.style.top = Math.round(Math.max(8, r.top + r.height / 2 - ch / 2 + 10)) + 'px';
            const vv = window.visualViewport, bot = Math.min(r.bottom, vv ? vv.offsetTop + vv.height : innerHeight);   // 📱 자판이 올라오면 그 위로
            if (mini) { mini.style.left = Math.round(r.right - 62 - 12) + 'px'; mini.style.top = Math.round(bot - 84 - 12) + 'px'; }
            if (note) { note.style.right = Math.round(innerWidth - r.right + 10) + 'px'; note.style.top = Math.round(bot - 84 - 22) + 'px'; }
        }
        addEventListener('resize', () => { const r = drq('pcRoom'); if (r && !r.hidden) pcLayout(); });
        if (window.visualViewport) visualViewport.addEventListener('resize', () => { const r = drq('pcRoom'); if (r && !r.hidden) { pcLayout(); if (pcS.memo) mfAim(); } });
        function pcPlace(o) {
            const lift = o.lift || 0, a = o.a * (1 - Math.min(1, lift / 90));
            o.el.style.transform = `translate(${o.x}px, ${o.y - lift}px) rotate(${a}deg)`;   // 연필통 바닥이 돌아가는 점
        }
        function pcOpen() {
            const r = pcBuild(); r.hidden = false;
            requestAnimationFrame(pcLayout);
            Object.assign(pcS, { held: null, tip: null, carry: null, press: null, drag: null, memo: null });
            r.querySelector('.pc-hint').innerHTML = '필기구를 골라 <b>위로 쏙</b> 뽑아요 · 옆으로 밀면 비켜나요';
            const cup = drq('pcCup'); cup.classList.remove('gone'); cup.style.transform = '';
            drq('pcHeld').hidden = true; drq('pcMini').hidden = true; drq('pcTipNote').hidden = true;
            drq('pcCase').hidden = !window.openPencase;
            pcFill();
        }
        function pcFill() {                                // 연필통에 필기구 꽂기 (👝 필통에서 바꾸면 다시 꽂아요)
            const box = drq('pcTools'); box.textContent = '';
            const L = pcList(), n = L.length;
            pcS.tools = L.map((o, i) => {
                const el = document.createElement('div'); el.className = 'pc-tool' + (o.tool === 'erase' ? ' er' : ''); el.innerHTML = pcSvg(o);
                const sv = el.querySelector('svg'); if (sv && o.tool !== 'erase') sv.setAttribute('preserveAspectRatio', 'none');   // 실제처럼 길쭉하게
                o.el = el; o.x = Math.round(-76 + i * 152 / Math.max(1, n - 1)); o.a = o.x * .17 + (i % 3 - 1) * 1.5; o.y = -((i * 7) % 3 * 14) + (o.tool === 'hi' ? 12 : 0); o.lift = 0;   // 넓은 통에 부채꼴로 기대어요 (윗부분이 넉넉히 벌어져 고르기 쉬워요)
                el.style.zIndex = o.tool === 'erase' ? 3 : i % 2 ? 2 : 1;   // 짧은 지우개는 앞쪽에
                pcPlace(o); box.appendChild(el); pcBindTool(o);
                return o;
            });
        }
        function pcBindTool(o) {
            const el = o.el;
            el.addEventListener('pointerdown', e => {
                if (pcS.held || e.button > 0) return;
                e.preventDefault(); e.stopPropagation();
                try { el.setPointerCapture(e.pointerId); } catch (er) {}
                pcS.drag = { o, id: e.pointerId, x: e.clientX, y: e.clientY, x0: o.x, a0: o.a };
                el.classList.add('grab'); el.style.zIndex = ++pcS.z;
            });
            el.addEventListener('pointermove', e => {
                const d = pcS.drag;
                if (pcS.carry && pcS.carry.id === e.pointerId) { pcCarryMove(e); return; }   // 뽑은 채 그대로 끌고 있어요
                if (!d || d.o !== o || d.id !== e.pointerId) return;
                const dx = e.clientX - d.x, dy = e.clientY - d.y;
                o.x = Math.max(-90, Math.min(90, d.x0 + dx)); o.a = Math.max(-16, Math.min(16, d.a0 + dx * .15));   // 옆으로 밀면 비켜나요
                o.lift = Math.max(0, -dy);
                pcPlace(o);
                if (o.lift > 110) pcPick(o, e);                                  // 위로 쭉 → 쏙 뽑혀요
            });
            const up = e => {
                if (pcS.carry && pcS.carry.id === e.pointerId) { pcCarryEnd(e); return; }
                const d = pcS.drag; if (!d || d.o !== o || d.id !== e.pointerId) return;
                pcS.drag = null; el.classList.remove('grab'); o.lift = 0; pcPlace(o);   // 덜 뽑으면 다시 쏙 들어가요
            };
            el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
        }
        /* 뽑기 : 연필통은 구석의 작은 연필통으로 · 뽑은 필기구만 손에 */
        function pcPick(o, e) {
            pcS.drag = null; o.el.classList.remove('grab'); o.el.style.visibility = 'hidden';
            pcS.held = o;
            if (pcS.memo) mhlApply(pcS.memo, o);                                 // 📝 메모 : 고른 필기구로 글씨 모양이 바로 바뀌어요
            else { dw.tool = o.tool; if (o.tool !== 'erase') dw.color[o.tool] = o.color; dw.size[o.tool] = o.size; penSetTool(o.tool); }
            drq('pcMini').hidden = false; pcLayout();
            const cup = drq('pcCup'), cr = cup.getBoundingClientRect(), mr = drq('pcMini').getBoundingClientRect();   // 연필통이 작은 연필통 자리로 쏙 줄어요
            cup.style.transform = `translate(${mr.left + mr.width / 2 - (cr.left + cr.width / 2)}px, ${mr.bottom - cr.bottom}px) scale(.22)`;
            cup.classList.add('gone');
            const h = drq('pcHeld'); h.innerHTML = pcSvg(o); h.hidden = false; h.classList.add('carry');
            pcS.carry = { id: e.pointerId, off: [0, 0] };                         // 뽑은 손 그대로 들고 있어요 (연필심 = 손가락)
            pcHeldAt(e.clientX, e.clientY);
            if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) {}
            const note = drq('pcTipNote'); note.hidden = false; clearTimeout(pcS.noteTm);
            note.innerHTML = pcS.memo ? '이제 글을 써요 · 다 쓰면 <b>구석 연필통</b>을 톡 ✏️' : '다 쓰면 필기구를 꾹 집어 <b>구석 연필통</b>에 꽂아요 ✏️'; pcS.noteTm = setTimeout(() => { note.hidden = true; }, 4200);
        }
        function pcHeldAt(x, y, da) {
            const h = drq('pcHeld'); if (!h || !pcS.held) return;
            const t = pcTipOf(pcS.held); pcS.tip = [x, y];
            h.style.transform = `translate(${x}px, ${y}px) rotate(${PC_ANG + (da || 0)}deg) translate(${-t[0]}px, ${-t[1]}px)`;
        }
        /* 필기구 몸통 위인지 (연필심 쪽 20px 은 빼요 → 쓰기) */
        function pcOnBody(x, y) {
            if (!pcS.held || !pcS.tip) return false;
            const a = PC_ANG * Math.PI / 180, ux = -Math.sin(a), uy = Math.cos(a), t = pcTipOf(pcS.held);
            const px = x - pcS.tip[0], py = y - pcS.tip[1], along = px * ux + py * uy, across = Math.abs(px * uy - py * ux);
            return along > 22 + (t[1] - 2) && along < 150 - t[1] && across < 18;
        }
        const pcOverMini = (x, y) => { const m = drq('pcMini'); if (!m || m.hidden) return false; const r = m.getBoundingClientRect(); return x > r.left - 16 && x < r.right + 16 && y > r.top - 24 && y < r.bottom + 16; };
        function pcCarryMove(e) {
            const c = pcS.carry; pcHeldAt(e.clientX + c.off[0], e.clientY + c.off[1]);
            drq('pcMini').classList.toggle('over', pcOverMini(e.clientX, e.clientY));
        }
        function pcCarryEnd(e) {
            const x = e.clientX, y = e.clientY;
            pcS.carry = null; drq('pcHeld').classList.remove('carry'); drq('pcMini').classList.remove('over');
            if (e.type !== 'pointercancel' && pcOverMini(x, y)) { pcPutBack(); return; }                 // 🖊️ 꽂으면 완료
            if (x < 6 || y < 6 || x > innerWidth - 6 || y > innerHeight - 6) { pcThrow(); return; }        // 화면 밖으로 휙
            if (pcS.memo) mfWrite();                                                                        // 📝 메모 : 손을 떼면 바로 써요 (자판이 올라와요)
        }
        /* 꾹 누르면 집어 들기 (그냥 쓰려고 누른 건 그대로 써져요) */
        document.addEventListener('pointerdown', e => {
            if (!(dw.on || pcS.memo) || !pcS.held || pcS.carry || !pcOnBody(e.clientX, e.clientY)) return;
            const p = pcS.press = { id: e.pointerId, x: e.clientX, y: e.clientY };
            p.tm = setTimeout(() => {
                if (pcS.press !== p) return;
                pcS.press = null;
                if (dw.cur) { dw.cur = null; penRender(); }                       // 누르는 사이 찍힌 점은 지워요
                if (dw.erasing) { dw.erasing = false; if (!dw.erased) dw.hist.pop(); penRing(null); }
                pcS.carry = { id: p.id, off: [pcS.tip[0] - p.x, pcS.tip[1] - p.y] };
                drq('pcHeld').classList.add('carry');
                if (navigator.vibrate) try { navigator.vibrate(10); } catch (er) {}
            }, 320);
        }, true);
        document.addEventListener('pointermove', e => {
            const p = pcS.press; if (p && p.id === e.pointerId && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) { clearTimeout(p.tm); pcS.press = null; }
            if (pcS.carry && pcS.carry.id === e.pointerId) { e.preventDefault(); pcCarryMove(e); }
        }, true);
        const pcDocUp = e => {
            const p = pcS.press; if (p && p.id === e.pointerId) { clearTimeout(p.tm); pcS.press = null; }
            if (pcS.carry && pcS.carry.id === e.pointerId) pcCarryEnd(e);
        };
        document.addEventListener('pointerup', pcDocUp, true); document.addEventListener('pointercancel', pcDocUp, true);
        /* 작은 연필통에 쏙 꽂고 ✓ 완료 */
        function pcPutBack() {
            const h = drq('pcHeld'), m = drq('pcMini').getBoundingClientRect();
            pcS.held = null; pcS.press = null; pcS.carry = null;
            h.classList.add('in'); h.style.transform = `translate(${m.left + m.width / 2}px, ${m.top + 6}px) rotate(-180deg) translate(-15px, -2px) scale(.35)`;
            if (navigator.vibrate) try { navigator.vibrate(8); } catch (er) {}
            setTimeout(() => { h.classList.remove('in'); if (pcS.memo) pcMemoEnd(); else penDone(); }, 280);
        }
        function pcThrow() {
            if (pcS.memo) { pcMemoEnd(); return; }                               // 📝 메모 : 쓴 글은 그대로
            if (!dw.strokes.length) { penClose(); return; }
            showMsg('쓴 것을 모두 지울까요?', true).then(ok => { if (ok) penClose(); else pcHeldAt(innerWidth / 2, innerHeight / 2); });
        }
        function pcClose() {
            const r = drq('pcRoom'); if (r) r.hidden = true;
            pcS.held = null; pcS.carry = null; pcS.press = null; pcS.drag = null;
        }
        /* ---------- ✏️ 📒 수첩 모드 : 메모에 글 쓰기 (도련 · 2026-10-13)
           - 페이지의 메모(글상자 · 떡메)를 톡 눌러 쓰려는 순간 연필통이 떠요 → 필기구를 위로 쏙 뽑아요
           - 색연필 = 그 색 · 연필 느낌 글씨 / 형광펜 = 글씨가 있는 줄마다 칠한 띠 / 지우개 = 원래 글씨로
           - 한 메모 = 마지막에 고른 필기구 하나 · 메모마다 저장돼요 (k 색 · hl 형광펜 색 · pn 연필 느낌)
           - 자판으로 쓰면 손에 든 필기구 끝이 커서를 따라가며 사각사각 움직여요
           - 다 쓰면 구석 작은 연필통을 톡 (또는 꾹 집어 꽂기 · 메모 밖을 눌러도 쏙 들어가요)
           - ✕ 를 누르면 필기구 없이 그대로 써요 · 고르는 창 모드에서는 원래대로 바로 써요 ---------- */
        const mhlOk = c => /^#[0-9a-f]{6}$/i.test(c || '');
        function mhlLook(ta, hl, pn) {                                        // 불러올 때 · 고를 때
            if (mhlOk(hl)) ta.dataset.hl = hl; else delete ta.dataset.hl;
            if (pn) ta.dataset.pn = 1; else delete ta.dataset.pn;
            ta.classList.toggle('pencil', !!pn);
            if (!ta.dataset.hl) { const l = ta.parentElement && ta.parentElement.querySelector(':scope > .mhl'); if (l) l.remove(); return; }
            mhlWatch(ta);
        }
        function mhlApply(ta, o) {
            const font = ta.dataset.font, size = ta.dataset.size;
            if (o.tool === 'pen') { styleTextarea(ta, font, o.color, size); mhlLook(ta, '', 1); }
            else if (o.tool === 'hi') { styleTextarea(ta, font, DEFAULT_TEXT_COLOR, size); mhlLook(ta, o.color, 0); }
            else { styleTextarea(ta, font, DEFAULT_TEXT_COLOR, size); mhlLook(ta, '', 0); }   // 지우개 = 원래 글씨
            if (typeof updateTextPanel === 'function') updateTextPanel();
            if (typeof saveData === 'function') saveData();
        }
        let mhlRO = null;
        function mhlWatch(ta) {                                               // 상자 크기가 바뀌거나 처음 보일 때 다시 칠해요
            if (!window.ResizeObserver) { requestAnimationFrame(() => mhlPaint(ta)); return; }
            if (!mhlRO) mhlRO = new ResizeObserver(es => es.forEach(e => { if (e.target.dataset.hl) mhlPaint(e.target); }));
            mhlRO.observe(ta);
            if (ta.isConnected) requestAnimationFrame(() => mhlPaint(ta));
        }
        let mhlMir = null;
        const MHL_COPY = ['boxSizing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'wordSpacing', 'textIndent', 'textAlign', 'tabSize'];
        function mhlMeasure(ta, upto) {                                      // 보이지 않는 복사본에 글씨를 넣고 재요 (돌리기 · 크기와 상관없는 원래 크기)
            if (!mhlMir) { mhlMir = document.createElement('div'); mhlMir.className = 'mhl-mirror'; mhlMir.setAttribute('aria-hidden', 'true'); document.body.appendChild(mhlMir); }
            const cs = getComputedStyle(ta); MHL_COPY.forEach(k => { mhlMir.style[k] = cs[k]; });
            mhlMir.style.width = ta.clientWidth + 'px'; mhlMir.style.boxSizing = 'border-box';   // 글씨가 줄 바뀌는 너비 (테두리 · 스크롤 막대 빼고)
            mhlMir.textContent = upto == null ? ta.value : ta.value.slice(0, upto);
            const lh = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) || 18) * 1.2;
            return lh;
        }
        function mhlPaint(ta) {
            const el = ta.parentElement; if (!el || !ta.isConnected) return;
            let l = el.querySelector(':scope > .mhl');
            const c = ta.dataset.hl;
            if (!c) { if (l) l.remove(); return; }
            if (!l) { l = document.createElement('div'); l.className = 'mhl'; l.setAttribute('aria-hidden', 'true'); ta.after(l); }
            l.style.cssText = `left:${ta.offsetLeft}px;top:${ta.offsetTop}px;width:${ta.offsetWidth}px;height:${ta.offsetHeight}px`;
            l.textContent = '';
            if (!ta.value.trim()) return;
            const lh = mhlMeasure(ta), node = mhlMir.firstChild; if (!node) return;
            const rg = document.createRange(); rg.selectNodeContents(mhlMir);
            const base = mhlMir.getBoundingClientRect(), st = ta.scrollTop;
            let n = 0;
            for (const r of rg.getClientRects()) {                                // 글씨가 있는 줄 조각마다 띠 하나 (살짝 삐뚤게)
                if (r.width < 4) continue;
                const i = document.createElement('i'), wob = (n++ % 3 - 1) * .6;
                i.style.cssText = `left:${r.left - base.left - 3}px;top:${r.top - base.top + lh * .3 - st}px;width:${r.width + 6}px;height:${lh * .52}px;background:${c};transform:rotate(${wob}deg)`;
                l.appendChild(i);
            }
        }
        window.mhlLook = mhlLook; window.mhlPaint = mhlPaint;

        /* 커서 자리 (화면 좌표) : 복사본으로 상자 안 자리를 재고 → 상자 안에 작은 점을 놓아 돌리기 · 크기 · 확대까지 그대로 */
        function mfCaret(ta) {
            const lh = mhlMeasure(ta, ta.selectionEnd == null ? ta.value.length : ta.selectionEnd);
            const mk = document.createElement('span'); mk.textContent = '\u200b'; mhlMir.appendChild(mk);
            const x = ta.offsetLeft + mk.offsetLeft + 1, y = ta.offsetTop + mk.offsetTop + lh * .78 - ta.scrollTop;
            const el = ta.parentElement; let pr = el.querySelector(':scope > .mf-probe');
            if (!pr) { pr = document.createElement('i'); pr.className = 'mf-probe'; el.appendChild(pr); }
            pr.style.left = x + 'px'; pr.style.top = y + 'px';
            const r = pr.getBoundingClientRect();
            return [r.left + r.width / 2, r.top + r.height / 2];
        }
        const mf = { pos: null, target: null, raf: 0, wig: 0, last: 0 };
        function mfAim() {
            const ta = pcS.memo; if (!ta || !pcS.held || pcS.carry || document.activeElement !== ta) return;
            mf.target = mfCaret(ta); if (!mf.pos) mf.pos = (pcS.tip || mf.target).slice();
            if (!mf.raf) { mf.last = performance.now(); mf.raf = requestAnimationFrame(mfFrame); }
        }
        function mfFrame(now) {
            mf.raf = 0; if (!mf.target || !pcS.held || pcS.carry || !pcS.memo) return;
            const dt = Math.min(50, now - mf.last), k = 1 - Math.pow(.001, dt / 240); mf.last = now;
            mf.pos[0] += (mf.target[0] - mf.pos[0]) * k; mf.pos[1] += (mf.target[1] - mf.pos[1]) * k; mf.wig = Math.max(0, mf.wig - dt / 320);
            const w = mf.wig, t = now / 1000;                                   // 사각사각 : 처음과 크게 한 것의 중간 (도련 · 2026-10-13)
            const dx = Math.sin(t * 42) * 4.35 * w, dy = Math.cos(t * 29) * 2.95 * w - 2 * w, da = Math.sin(t * 33) * 3 * w;   // 좌우 · 위아래 · 기울기
            pcHeldAt(mf.pos[0] + dx, mf.pos[1] + dy, da);
            if (Math.abs(mf.target[0] - mf.pos[0]) > .2 || Math.abs(mf.target[1] - mf.pos[1]) > .2 || mf.wig > 0) mf.raf = requestAnimationFrame(mfFrame);
        }
        function mfWrite() {                                                   // 손을 뗀 그 자리에서 메모로 → 커서 따라가기
            const ta = pcS.memo; if (!ta) return;
            mf.pos = pcS.tip ? pcS.tip.slice() : null;
            pcS.memoFocus = true;
            try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
            pcS.memoFocus = false;
            mfAim();
        }
        function pcOpenMemo(ta) {
            if (dw.on) return;
            pcOpen(); pcS.memo = ta; mf.pos = null;
            drq('pcRoom').classList.add('memo');
            drq('pcRoom').querySelector('.pc-hint').innerHTML = '쓸 필기구를 <b>위로 쏙</b> 뽑아요 · ✕ 는 그냥 쓰기';
        }
        function pcMemoSkip() {                                                // ✕ : 필기구 없이 그대로 써요
            const ta = pcS.memo; pcMemoEnd();
            if (ta && ta.isConnected) { pcS.memoFocus = true; try { ta.focus({ preventScroll: true }); } catch (e) {} pcS.memoFocus = false; }
        }
        function pcMemoEnd() {
            if (!pcS.memo) return;
            const ta = pcS.memo; pcS.memo = null; mf.target = null;
            const pr = ta.parentElement && ta.parentElement.querySelector(':scope > .mf-probe'); if (pr) pr.remove();
            const r = drq('pcRoom'); if (r) r.classList.remove('memo');
            pcClose();
        }
        /* 수첩 모드에서 메모를 톡 눌러 쓰려는 순간 (끌어서 옮기는 건 그대로) */
        let mfTapAt = 0, mfTapTa = null;
        document.addEventListener('pointerdown', e => {
            const ta = e.target && e.target.closest && e.target.closest('#canvasArea .element-box > textarea');
            mfTapTa = ta; mfTapAt = ta ? performance.now() : 0;
        }, true);
        document.addEventListener('focusin', e => {
            const ta = e.target;
            if (!penNote() || dw.on || pcS.memoFocus || ta.tagName !== 'TEXTAREA' || ta.readOnly || !ta.closest('#canvasArea .element-box')) return;
            if (pcS.memo === ta) { mfAim(); return; }
            if (ta !== mfTapTa || performance.now() - mfTapAt > 1500) return;     // 손으로 누른 때만
            if (pcS.memo) pcMemoEnd();
            ta.blur();                                                         // 자판은 필기구를 뽑은 뒤에 올라와요
            pcOpenMemo(ta);
        });
        document.addEventListener('focusout', e => {
            const ta = pcS.memo; if (!ta || e.target !== ta) return;
            setTimeout(() => {
                if (pcS.memo !== ta || document.activeElement === ta || pcS.carry || pcS.press || !pcS.held) return;
                pcPutBack();                                                   // 메모 밖을 누르면 필기구는 쏙 연필통으로
            }, 300);
        });
        document.addEventListener('selectionchange', () => { if (pcS.memo) mfAim(); });
        document.addEventListener('input', e => { const ta = e.target; if (ta && ta.dataset && ta.dataset.hl) mhlPaint(ta); if (pcS.memo === ta) { mf.wig = 1; mfAim(); } }, true);
        document.addEventListener('compositionupdate', e => { if (pcS.memo === e.target) { mf.wig = 1; requestAnimationFrame(() => { if (e.target.dataset.hl) mhlPaint(e.target); mfAim(); }); } }, true);
        ['keyup', 'click', 'scroll'].forEach(t => document.addEventListener(t, e => { if (pcS.memo && e.target === pcS.memo) { if (t === 'scroll' && pcS.memo.dataset.hl) mhlPaint(pcS.memo); mfAim(); } }, true));
        /* 그리는 동안에는 페이지 넘기기(끌기)를 막아요 */
        document.getElementById('diaryWrapper').addEventListener('pointerdown', e => {
            if (dw.on && !e.target.closest('#penLayer')) e.stopPropagation();
        }, true);
        window.openDraw = openDraw; window.pcFill = pcFill;
