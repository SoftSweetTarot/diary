/* 말랑달콤 다이어리 - js/leafmaker.js
   📃 속지 만들기 (✂️ 스티커만들기 → 📃 속지 만들기)
   - 🖼️ 사진 불러오기 : 사진을 페이지 비율로 맞춰 깔아요 (손가락으로 옮기기 · 확대 · 연하게 해서 글씨가 잘 보이게)
   - ✏️ 직접 그리기 : 종이 색 · 밑줄(무지 · 줄 · 모눈 · 도트) 위에 펜으로 그려요 (사진 위에 그려도 돼요)
   - 다 만들면 오늘 페이지 속지로 끼워지고 📃 속지 → 내가만든 칸에 모여요 (최대 LM_MAX 장)
   - 페이지에는 그림(JPG)째로 그날 파일에 lfi 로 저장돼요 (주소 아님 · 인수인계 12번)
   - 내가만든 목록 : 로그인하면 내 드라이브 말랑달콤 / 다이어리 / 스티커 / 내속지.json · 둘러보기면 이 기기 (js/stickermaker.js 내 스티커와 같은 방식)
   ※ 링 구멍은 미리보기 · 페이지 모두 그 위에 그대로 보여요 (css/style.css --lf-holes) */

        const LM_FILE = '내속지.json', LM_LOCAL = 'malang_my_leafs', LM_MAX = 12, LM_W = 900;
        const LM_PAPERS = [['page', '스킨 색'], ['#ffffff', '하양'], ['#fffaf0', '미색'], ['#fff0f5', '분홍'], ['#eefaf4', '민트'], ['#eef5ff', '하늘'], ['#f6f0ff', '보라'], ['#e9d5b3', '크라프트']];
        const LM_GUIDES = [['plain', '무지'], ['line', '줄'], ['grid', '모눈'], ['dot', '도트']];
        const LM_PENS = ['#5a3d4a', '#ff6b8b', '#ff9f43', '#ffd23f', '#4caf7a', '#3d9be0', '#8a6be0', '#ffffff'];
        const LM_SIZES = [['3', '가늘게'], ['7', '보통'], ['16', '굵게']];
        const lm = { built: false, tab: 'photo', w: LM_W, h: 1400, img: null, zoom: 1, ox: 0, oy: 0, wash: 0, paper: 'page', guide: 'plain',
            pen: LM_PENS[0], size: 7, erase: false, ink: null, undo: [], drag: null, list: null, fileId: null, loading: null };
        const lmq = id => document.getElementById(id);
        const lmSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        const lmOk = u => /^data:image\/(jpeg|png|webp)/.test(u || '');

        /* ---------- 내가만든 속지 목록 ---------- */
        async function lmLoad() {
            if (lm.list) return lm.list;
            if (lm.loading) return lm.loading;
            lm.loading = (async () => {
                let arr = [];
                try {
                    if (lmSync()) {
                        const rootId = await getFolder(STICKER_PATH, false);
                        if (rootId) { const f = (await driveList(`name='${LM_FILE}' and '${rootId}' in parents and trashed=false`, 'id,name'))[0]; if (f) { lm.fileId = f.id; const o = JSON.parse(await readFileText(f.id) || '{}'); arr = Array.isArray(o.l) ? o.l : []; } }
                    } else { const o = JSON.parse(localStorage.getItem(LM_LOCAL) || '{}'); arr = Array.isArray(o.l) ? o.l : []; }
                } catch (e) {}
                lm.list = arr.filter(x => x && lmOk(x.src));
                lm.loading = null;
                return lm.list;
            })();
            return lm.loading;
        }
        async function lmSave() {
            const body = JSON.stringify({ v: 1, l: lm.list });
            if (lmSync()) {
                const rootId = await getFolder(STICKER_PATH, true);
                try { const r = await driveUpsert(rootId, LM_FILE, lm.fileId, body); lm.fileId = r.id; }
                catch (e) { if (e && e.code === 'gone') { lm.fileId = null; const r = await driveUpsert(rootId, LM_FILE, null, body); lm.fileId = r.id; } else throw e; }
            } else localStorage.setItem(LM_LOCAL, body);
        }
        /* 📃 속지 창 → 내가만든 칸 */
        async function lmMine(box) {
            box.innerHTML = '<div class="cs-empty">📃 불러오는 중…</div>';
            const list = await lmLoad();
            const cur = typeof pageLeafImg !== 'undefined' ? pageLeafImg : '';
            box.innerHTML = `${list.length && window.shxBar ? shxBar('leaf') : ''}<div class="lf-picks">${list.map((l, i) => `<div class="lm-it" data-shx="${i}"><button type="button" class="lf-pick${l.src === cur ? ' on' : ''}" onclick="lmUse(${i})"><i class="lf-sw lf-my" style="--lf-img:url('${l.src}')"></i>내 속지 ${list.length - i}</button><i onclick="lmDel(${i})" title="지우기">✕</i></div>`).join('')}
                <button type="button" class="lf-pick lm-new" onclick="closeModal('leafModal'); openLeafMaker()"><i class="lf-sw"><b>＋</b></i>속지 만들기</button></div>
                ${list.length ? '' : '<p class="svc-tip">아직 만든 속지가 없어요. <b>＋ 속지 만들기</b>로 사진을 깔거나 직접 그려 보세요!</p>'}`;
        }
        async function lmUse(i) { const l = (await lmLoad())[i]; if (l && window.pickLeaf) pickLeaf('my', l.src); }
        async function lmDel(i) {
            const list = await lmLoad(); if (!list[i]) return;
            if (!(await showMsg('이 속지를 내가만든 칸에서 지울까요?<br><span style="font-size:12px;color:#777;">이미 끼운 페이지의 속지는 그대로 남아요.</span>', true))) return;
            list.splice(i, 1);
            lmMine(lmq('leafOther'));
            lmSave().catch(() => showMsg('⚠ 지운 것을 드라이브에 저장하지 못했어요.<br><span style="font-size:12px;color:#777;">인터넷 연결을 확인한 뒤 다시 지워 주세요.</span>'));
        }

        /* ---------- 만들기 창 ---------- */
        function lmBuild() {
            if (lm.built) return; lm.built = true;
            const chips = (id, arr, on, fn) => { const b = lmq(id); b.innerHTML = arr.map(([v, n]) => `<button type="button" data-v="${v}" class="${v === on ? 'on' : ''}">${n}</button>`).join(''); b.onclick = e => { const t = e.target.closest('button'); if (!t) return; b.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === t)); fn(t.dataset.v); }; };
            chips('lmPaper', LM_PAPERS, lm.paper, v => { lm.paper = v; lmDraw(); });
            lmq('lmPaper').querySelectorAll('button').forEach(b => { const c = b.dataset.v === 'page' ? 'var(--page-bg)' : b.dataset.v; b.insertAdjacentHTML('afterbegin', `<i style="background:${c}"></i>`); });
            chips('lmGuide', LM_GUIDES, lm.guide, v => { lm.guide = v; lmDraw(); });
            chips('lmSize', LM_SIZES, String(lm.size), v => { lm.size = +v; });
            const pens = lmq('lmPens');
            pens.innerHTML = LM_PENS.map(c => `<button type="button" data-c="${c}" style="background:${c}" class="${c === lm.pen ? 'on' : ''}" aria-label="펜 색"></button>`).join('') + '<button type="button" data-c="erase" class="lm-eraser" aria-label="지우개">🧽</button>';
            pens.onclick = e => { const t = e.target.closest('button'); if (!t) return; pens.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === t)); lm.erase = t.dataset.c === 'erase'; if (!lm.erase) lm.pen = t.dataset.c; };
            lmq('lmZoom').oninput = e => { lm.zoom = +e.target.value; lmClamp(); lmDraw(); };
            lmq('lmWash').oninput = e => { lm.wash = +e.target.value; lmDraw(); };
            lmq('lmFile').onchange = e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) lmPhoto(f); };
            const cv = lmq('lmCv');
            cv.addEventListener('pointerdown', lmDown); cv.addEventListener('pointermove', lmMove);
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => cv.addEventListener(t, lmUp));
        }
        function openLeafMaker() {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            lmBuild();
            const ca = lmq('canvasArea'), r = ca && ca.getBoundingClientRect();
            lm.w = LM_W; lm.h = Math.round(LM_W * (r && r.width ? r.height / r.width : 1.55));
            const cv = lmq('lmCv'); cv.width = lm.w; cv.height = lm.h;
            lm.ink = document.createElement('canvas'); lm.ink.width = lm.w; lm.ink.height = lm.h;
            lm.img = null; lm.zoom = 1; lm.ox = lm.oy = 0; lm.wash = 0; lm.undo = [];
            lmq('lmZoom').value = 1; lmq('lmWash').value = 0;
            lmq('lmBox').style.aspectRatio = `${lm.w} / ${lm.h}`; lmq('lmBox').style.setProperty('--lm-r', (lm.w / lm.h).toFixed(3));
            lmTab('photo'); lmDraw();
            openModal('leafMakeModal');
        }
        function lmTab(t) {
            lm.tab = t;
            document.querySelectorAll('#lmTabs .stk-tab').forEach(b => b.classList.toggle('on', b.dataset.t === t));
            lmq('lmPhotoBox').hidden = t !== 'photo'; lmq('lmDrawBox').hidden = t !== 'draw';
            lmq('lmPhotoTools').hidden = t !== 'photo' || !lm.img;
            lmq('lmBox').classList.toggle('drawing', t === 'draw');
        }
        function lmPhoto(file) {
            const u = URL.createObjectURL(file), im = new Image();
            im.onload = () => { lm.img = im; lm.zoom = 1; lm.ox = lm.oy = 0; lmq('lmZoom').value = 1; if (!lm.wash) { lm.wash = .25; lmq('lmWash').value = .25; } lmTab('photo'); lmDraw(); };
            im.onerror = () => { URL.revokeObjectURL(u); showMsg('⚠ 사진을 열지 못했어요.'); };
            im.src = u;
        }
        /* 사진은 페이지를 꽉 채워요 (cover) · 확대한 만큼 손가락으로 옮길 수 있어요 */
        const lmCover = () => { const im = lm.img, k = Math.max(lm.w / im.width, lm.h / im.height) * lm.zoom; return { k, w: im.width * k, h: im.height * k }; };
        function lmClamp() { if (!lm.img) return; const c = lmCover(), mx = (c.w - lm.w) / 2, my = (c.h - lm.h) / 2; lm.ox = Math.max(-mx, Math.min(mx, lm.ox)); lm.oy = Math.max(-my, Math.min(my, lm.oy)); }
        function lmPaperColor() { return lm.paper === 'page' ? (getComputedStyle(document.documentElement).getPropertyValue('--page-bg').trim() || '#fff0f5') : lm.paper; }
        function lmAccent() { return getComputedStyle(document.documentElement).getPropertyValue('--primary-accent').trim() || '#ff6b81'; }
        /* 종이 → 사진 → 연하게(하얀 막) → 밑줄 → 그림 */
        function lmCompose(x) {
            const W = lm.w, H = lm.h, u = W / 100;
            x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
            x.fillStyle = lmPaperColor(); x.fillRect(0, 0, W, H);
            if (lm.paper === '#e9d5b3') { for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(120,85,45,${Math.random() * .09})`; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); } }
            if (lm.img) { const c = lmCover(); x.drawImage(lm.img, (W - c.w) / 2 + lm.ox, (H - c.h) / 2 + lm.oy, c.w, c.h); }
            if (lm.img && lm.wash) { x.fillStyle = `rgba(255,255,255,${lm.wash})`; x.fillRect(0, 0, W, H); }
            const acc = lmAccent();
            x.save(); x.strokeStyle = acc; x.fillStyle = acc;
            if (lm.guide === 'line') {
                x.globalAlpha = .28; x.lineWidth = 2; const g = 7 * u;
                for (let y = 2 * u + g; y < H; y += g) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
                x.globalAlpha = .45; x.beginPath(); x.moveTo(10.7 * u, 0); x.lineTo(10.7 * u, H); x.stroke();
            } else if (lm.guide === 'grid') {
                x.globalAlpha = .18; x.lineWidth = 1.6; const g = 5 * u;
                for (let y = g; y < H; y += g) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
                for (let v = g; v < W; v += g) { x.beginPath(); x.moveTo(v, 0); x.lineTo(v, H); x.stroke(); }
            } else if (lm.guide === 'dot') {
                x.globalAlpha = .38; const g = 4.6 * u;
                for (let y = g / 2; y < H; y += g) for (let v = g / 2; v < W; v += g) { x.beginPath(); x.arc(v, y, .4 * u, 0, 7); x.fill(); }
            }
            x.restore();
            x.drawImage(lm.ink, 0, 0);
        }
        function lmDraw() { const cv = lmq('lmCv'); if (cv) lmCompose(cv.getContext('2d')); }

        /* ---------- 손가락 · 펜 ---------- */
        function lmPt(e) { const r = lmq('lmCv').getBoundingClientRect(); return [(e.clientX - r.left) * lm.w / r.width, (e.clientY - r.top) * lm.h / r.height, lm.w / r.width]; }
        function lmDown(e) {
            e.preventDefault();
            if (lm.drag) return;
            const [x, y, s] = lmPt(e);
            try { e.target.setPointerCapture(e.pointerId); } catch (er) {}
            if (lm.tab === 'photo') { if (lm.img) lm.drag = { id: e.pointerId, x, y, ox: lm.ox, oy: lm.oy }; return; }
            lm.undo.push(lm.ink.getContext('2d').getImageData(0, 0, lm.w, lm.h)); if (lm.undo.length > 15) lm.undo.shift();
            lm.drag = { id: e.pointerId, x, y, s };
            lmLine(x, y, x + .01, y);
        }
        function lmMove(e) {
            const d = lm.drag; if (!d || d.id !== e.pointerId) return;
            e.preventDefault();
            const [x, y] = lmPt(e);
            if (lm.tab === 'photo') { lm.ox = d.ox + x - d.x; lm.oy = d.oy + y - d.y; lmClamp(); lmDraw(); return; }
            if (Math.abs(x - d.x) + Math.abs(y - d.y) < .5) return;
            lmLine(d.x, d.y, x, y); d.x = x; d.y = y;
        }
        function lmUp(e) { if (lm.drag && lm.drag.id === e.pointerId) lm.drag = null; }
        function lmLine(x0, y0, x1, y1) {
            const x = lm.ink.getContext('2d');
            x.globalCompositeOperation = lm.erase ? 'destination-out' : 'source-over';
            x.strokeStyle = lm.pen; x.lineCap = x.lineJoin = 'round'; x.lineWidth = lm.size * (lm.erase ? 3 : 1) * (lm.drag ? lm.drag.s : 1) * 1.4;
            x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
            lmDraw();
        }
        function lmUndo() { const s = lm.undo.pop(); if (!s) return; lm.ink.getContext('2d').putImageData(s, 0, 0); lmDraw(); }
        function lmClear() { lm.undo.push(lm.ink.getContext('2d').getImageData(0, 0, lm.w, lm.h)); lm.ink.getContext('2d').clearRect(0, 0, lm.w, lm.h); lmDraw(); }

        /* ---------- 다 만들었어요 : 오늘 페이지에 끼우고 내가만든 칸에 넣어요 ---------- */
        async function lmDone(btn, keep) {                              // keep : 💾 내가만든 칸에 저장만 (오늘 페이지는 그대로)
            if (btn && btn.disabled) return;
            const c = document.createElement('canvas'); c.width = lm.w; c.height = lm.h; lmCompose(c.getContext('2d'));
            const src = c.toDataURL('image/jpeg', .86);
            if (btn) btn.disabled = true;
            let saved = true;
            try {
                const list = await lmLoad();
                list.unshift({ id: Date.now().toString(36), src });
                if (list.length > LM_MAX) list.length = LM_MAX;
                await lmSave();
            } catch (e) { saved = false; }
            if (btn) btn.disabled = false;
            if (keep) {
                if (!saved) { showMsg('⚠ 내가만든 칸에 저장하지 못했어요.<br><span style="font-size:12px;color:#777;">잠시 뒤 다시 눌러 주세요.</span>'); return; }
                closeModal('leafMakeModal');
                showMsg(`💾 내가만든 칸에 저장했어요!<br><span style="font-size:12px;color:#777;">✨ 스티커 → 📃 속지 → 내가만든 칸에서 끼울 수 있어요. (최대 ${LM_MAX}장)</span>`);
                return;
            }
            closeModal('leafMakeModal');
            if (window.pickLeaf) pickLeaf('my', src);
            showMsg(saved ? `📃 오늘 페이지 속지로 끼웠어요!<br><span style="font-size:12px;color:#777;">✨ 스티커 → 📃 속지 → 내가만든 칸에서 다른 날에도 쓸 수 있어요. (최대 ${LM_MAX}장)</span>`
                : '📃 오늘 페이지 속지로 끼웠어요!<br><span style="font-size:12px;color:#777;">⚠ 내가만든 칸에는 저장하지 못했어요.</span>');
        }

        window.openLeafMaker = openLeafMaker; window.lmTab = lmTab; window.lmUndo = lmUndo; window.lmClear = lmClear; window.lmDone = lmDone;
        window.lmMine = lmMine; window.lmUse = lmUse; window.lmDel = lmDel;
