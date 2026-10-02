/* 말랑달콤 다이어리 - js/draw.js
   🖍️ 펜 · 형광펜 : 다이어리 위에 손으로 그리고 밑줄 긋기 (툴바 → 🖍️ 펜)
   - 펜 : 또렷한 선 · 형광펜 : 반투명한 굵은 선 (글 위에 그어도 글씨가 비쳐 보여요)
   - 지우개는 '선 하나'를 통째로 지워요 · ↶ 는 마지막 선 지우기
   - ✓ 완료를 누르면 이번에 그린 선들이 그림 하나가 돼요 → 다른 그림처럼 옮기기 · 돌리기 · 크기 · 삭제
   - 그림은 SVG 로 일기에 담겨요 (파일 없음) · 선을 아주 많이 그리면 그날 일기 파일이 조금 커져요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (펜 버튼만 '준비 중') */

        const DRAW_PEN_COLORS = ['#333333', '#e2556f', '#ff8a3d', '#3d9be0', '#4caf7a', '#8a6be0', '#8a5a44', '#ffffff'];
        const DRAW_HI_COLORS = ['#ffe14d', '#ff9ec4', '#9be59b', '#9fd3ff', '#ffc078', '#cdb4ff'];
        const DRAW_SIZES = { pen: [2, 4, 7], hi: [12, 18, 26] };
        const dw = { on: false, tool: 'pen', color: { pen: DRAW_PEN_COLORS[0], hi: DRAW_HI_COLORS[0] }, size: { pen: 1, hi: 1 }, strokes: [], cur: null, svg: null, k: 1 };
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
            const g = dw.svg; if (!g) return;
            g.innerHTML = '';
            dw.strokes.concat(dw.cur ? [dw.cur] : []).forEach(s => {
                const p = document.createElementNS(DRAW_NS, 'path');
                p.setAttribute('d', penPathD(s.pts));
                const a = penAttrs(s); Object.keys(a).forEach(k => p.setAttribute(k, a[k]));
                g.appendChild(p);
            });
            drq('penUndo').disabled = !dw.strokes.length;
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
            canvas.appendChild(svg);
            dw.svg = svg; dw.strokes = []; dw.cur = null; dw.on = true;
            svg.addEventListener('pointerdown', penDown);
            svg.addEventListener('pointermove', penMove);
            svg.addEventListener('pointerup', penUp);
            svg.addEventListener('pointercancel', penUp);
            document.body.classList.add('draw-on');
            drq('penBar').hidden = false;
            penSetTool(dw.tool);
            penRender();
        }
        function penPoint(e) {
            const c = drq('canvasArea'), r = c.getBoundingClientRect();
            dw.k = r.width / (c.offsetWidth || r.width) || 1;
            return [(e.clientX - r.left) / dw.k, (e.clientY - r.top) / dw.k];
        }
        function penDown(e) {
            e.preventDefault(); e.stopPropagation();
            try { dw.svg.setPointerCapture(e.pointerId); } catch (err) {}
            const pt = penPoint(e);
            if (dw.tool === 'erase') { dw.erasing = true; penEraseAt(pt); return; }
            dw.cur = { tool: dw.tool, color: dw.color[dw.tool], w: DRAW_SIZES[dw.tool][dw.size[dw.tool]], pts: [pt] };
            penRender();
        }
        function penMove(e) {
            if (!dw.cur && !dw.erasing) return;
            e.preventDefault(); e.stopPropagation();
            const pt = penPoint(e);
            if (dw.erasing) { penEraseAt(pt); return; }
            const l = dw.cur.pts[dw.cur.pts.length - 1];
            if (Math.hypot(pt[0] - l[0], pt[1] - l[1]) < 1.5) return;
            if (dw.cur.tool === 'hi' && e.shiftKey) pt[1] = dw.cur.pts[0][1];      // PC : Shift 를 누르면 곧은 형광펜
            dw.cur.pts.push(pt);
            penRender();
        }
        function penUp(e) {
            if (e) e.stopPropagation();
            dw.erasing = false;
            if (dw.cur) { dw.strokes.push(dw.cur); dw.cur = null; penRender(); }
        }
        function penEraseAt(pt) {
            const n = dw.strokes.length;
            dw.strokes = dw.strokes.filter(s => !s.pts.some(p => Math.hypot(p[0] - pt[0], p[1] - pt[1]) < s.w / 2 + 8));
            if (dw.strokes.length !== n) penRender();
        }
        function penUndo() { dw.strokes.pop(); penRender(); }
        function penSetTool(t) {
            dw.tool = t;
            document.querySelectorAll('#penBar [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
            const opt = drq('penOpts');
            if (t === 'erase') { opt.innerHTML = '<span class="draw-hint">지우고 싶은 선을 문질러요</span>'; return; }
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
            if (typeof toast === 'function') toast('🖍️ 그림이 됐어요! 눌러서 옮기거나 크기를 바꿀 수 있어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
        }
        function penCancel() {
            if (dw.strokes.length) {
                showMsg('그린 선을 모두 지우고 나갈까요?', true).then(ok => { if (ok) penClose(); });
                return;
            }
            penClose();
        }
        function penClose() {
            dw.on = false; dw.cur = null; dw.strokes = [];
            const l = drq('penLayer'); if (l) l.remove();
            dw.svg = null;
            const bar = drq('penBar'); if (bar) bar.hidden = true;
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
        /* 그리는 동안에는 페이지 넘기기(끌기)를 막아요 */
        document.getElementById('diaryWrapper').addEventListener('pointerdown', e => {
            if (dw.on && !e.target.closest('#penLayer')) e.stopPropagation();
        }, true);
        window.openDraw = openDraw;
