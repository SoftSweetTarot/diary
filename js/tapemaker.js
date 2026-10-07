/* 말랑달콤 다이어리 - js/tapemaker.js
   🎀 마스킹테이프 만들기 : 내가 직접 그린 그림, 또는 내 사진으로 나만의 마스킹테이프를 만들어요 (하단메뉴 ✨ 공방 → 🎀 마스킹테이프)
   - ✏️ 그리기 : 네모 한 칸에 펜 · 지우개로 직접 그리면 테이프에 쭉 이어 붙어요 (🔁 이어지게 그리기 · 되돌리기 · 바탕색 · 크기)
   - 🖼️ 내 사진으로 : 사진 가운데를 네모로 잘라 테이프에 이어 붙여요 (사진은 이 기기에서만 줄여서, 완성된 테이프만 저장돼요)
   - 📌 바로 붙이거나 💾 내 마스킹테이프에 저장 → ✏️ 스티커 창 → 🎀 내 마스킹테이프 칸에서 언제든 다시 붙여요 (최대 30개 · 선물 받은 🎀 마스킹테이프와는 다른 칸)
     저장 위치 : 내 드라이브 말랑달콤 / 다이어리 / 내마스킹테이프.json (게스트는 이 기기에만)
   - 테이프 그림은 js/tape.js 의 tapeSvg 를 그대로 써요 (끝 톱니 · 반투명 · 길이 늘이기 손잡이가 같아요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (마스킹테이프 만들기 · 내 마스킹테이프만 '준비 중') */

        const TPM_FILE = '내마스킹테이프.json', TPM_LOCAL = 'malang_my_tapes', TPM_MAX = 30, TPM_PHOTO_PX = 96;
        const TPM_PAD = 240, TPM_OUT = 120;                              // 그리는 칸(안쪽 해상도) · 저장되는 그림 크기
        const TPM_BRUSH = [['가늘게', 3], ['보통', 7], ['굵게', 14]];
        const TPM_COLORS = ['#ffc9d9', '#ffd9c2', '#fff3a6', '#bff0dc', '#bfe3ff', '#e9e1ff', '#ffffff', '#ff8fab', '#f2a12a', '#4caf7a', '#3d9be0', '#8a6be0', '#5a3d4a', '#4b5aa8'];
        const TPM_SIZE = { d: [16, 60, 30], i: [16, 60, 30] };            // 크기 막대 : [가장 작게, 가장 크게, 처음 값] (그리기 · 사진)
        const tpmS = { built: false, m: 'd', bg: '#ffc9d9', pen: '#ffffff', br: 7, er: false, wrap: true, sd: 30, si: 30, dimg: '', img: '', undo: [], list: null, fileId: null, loading: null };
        const tpmq = id => document.getElementById(id);
        const tpmSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        const tpmR = n => Math.round(n * 100) / 100;

        /* 저장해 둔 모양(o) → tape.js 의 tapeSvg 가 읽는 모양 (그림 · 사진 모두 '한 칸 그림'을 이어 붙여요) */
        function tpmDef(o) {
            return { id: 'my-' + o.id, name: '내 마스킹테이프', bg: o.bg, w: o.s, h: o.s, p: o.img ? `<image href="${o.img}" width="${o.s}" height="${o.s}" preserveAspectRatio="xMidYMid slice"/>` : '' };
        }
        const tpmUrl = o => tapeUrl(tpmDef(o));
        /* 드라이브 · 기기에서 읽은 것은 정해진 모양만 통과 (그림 안에 들어가는 글자라서 꼼꼼히 확인) */
        function tpmClean(o) {
            if (!o || typeof o !== 'object') return null;
            const col = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v), s = +o.s;
            if (!/^[\w-]{1,20}$/.test(o.id || '') || !col(o.bg) || !(s >= 8 && s <= 60)) return null;
            const re = o.m === 'd' ? /^data:image\/png;base64,[A-Za-z0-9+/=]+$/ : o.m === 'i' ? /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/ : null;
            return re && re.test(o.img || '') ? { id: o.id, m: o.m, bg: o.bg, s, img: o.img } : null;
        }

        /* ---------- 내 마스킹테이프 목록 (드라이브) ---------- */
        async function tpmLoad() {
            if (tpmS.list) return tpmS.list;
            if (tpmS.loading) return tpmS.loading;
            tpmS.loading = (async () => {
                let arr = [];
                try {
                    if (tpmSync()) {
                        const rootId = await getFolder(ROOT_PATH, false);
                        if (rootId) { const f = (await driveList(`name='${TPM_FILE}' and '${rootId}' in parents and trashed=false`, 'id,name'))[0]; if (f) { tpmS.fileId = f.id; const o = JSON.parse(await readFileText(f.id) || '{}'); arr = Array.isArray(o.t) ? o.t : []; } }
                    } else { const o = JSON.parse(localStorage.getItem(TPM_LOCAL) || '{}'); arr = Array.isArray(o.t) ? o.t : []; }
                } catch (e) {}
                tpmS.list = arr.map(tpmClean).filter(Boolean);
                tpmS.loading = null;
                return tpmS.list;
            })();
            return tpmS.loading;
        }
        async function tpmSave() {
            const body = JSON.stringify({ v: 1, t: tpmS.list });
            if (tpmSync()) {
                const rootId = await getFolder(ROOT_PATH, true);
                try { const r = await driveUpsert(rootId, TPM_FILE, tpmS.fileId, body); tpmS.fileId = r.id; }
                catch (e) { if (e && e.code === 'gone') { tpmS.fileId = null; const r = await driveUpsert(rootId, TPM_FILE, null, body); tpmS.fileId = r.id; } else throw e; }
            } else localStorage.setItem(TPM_LOCAL, body);
        }

        /* ---------- 화면 (스티커 만들기 화면의 모양을 같이 써요 : css .smk-*) ---------- */
        function tpmBuild() {
            if (tpmS.built) return;
            tpmS.built = true;
            const sw = (key, list) => list.map(c => `<button type="button" data-c="${c}" style="--c:${c}" onclick="tpmSetColor('${key}','${c}')" aria-label="색"></button>`).join('') + `<input type="color" id="tpmPick-${key}" value="${tpmS[key]}" oninput="tpmSetColor('${key}',this.value)" aria-label="직접 고르기">`;
            const el = document.createElement('div');
            el.id = 'tpmRoom'; el.className = 'smk-room';
            el.innerHTML = `
              <div class="smk-bar"><span class="smk-x"></span><b>🎀 마스킹테이프 만들기</b><button class="smk-x" type="button" onclick="closeTapeMaker()" aria-label="닫기">✕</button></div>
              <div class="smk-wrap">
                <input type="file" id="tpmFile" accept="image/*" hidden onchange="tpmPickFile(this)">
                <section class="smk-step">
                  <div class="tpm-top"><div class="tpm-stage"><span class="tpm-tape" id="tpmTape"></span></div>
                  <label class="smk-zoom tpm-zoom">🔍 <small>크기</small> <input type="range" id="tpmSize" oninput="tpmSetSize(+this.value)"></label>
                  </div>
                  <div class="smk-chips" id="tpmTabs"><button type="button" data-m="d" onclick="tpmSetMode('d')">✏️ 그리기</button><button type="button" data-m="i" onclick="tpmSetMode('i')">🖼️ 내 사진으로</button></div>
                  <div id="tpmDrawOpts" class="smk-step">
                    <p class="tpm-lead">✏️ 네모 한 칸에 그려 보세요 · 위 테이프에 쭉 이어져요</p>
                    <canvas id="tpmPad" class="tpm-pad" width="${TPM_PAD}" height="${TPM_PAD}"></canvas>
                    <div class="smk-chips" id="tpmTools"><button type="button" data-t="pen" onclick="tpmSetEraser(false)">✏️ 펜</button><button type="button" data-t="er" onclick="tpmSetEraser(true)">🧽 지우개</button><button type="button" onclick="tpmUndo()">↩️ 되돌리기</button><button type="button" onclick="tpmClear()">🗑️ 비우기</button></div>
                    <div class="smk-chips" id="tpmBrush">${TPM_BRUSH.map(x => `<button type="button" data-b="${x[1]}" onclick="tpmSetBrush(${x[1]})">${x[0]}</button>`).join('')}</div>
                    <label class="tpm-wrap"><input type="checkbox" id="tpmWrap" checked onchange="tpmS.wrap = this.checked"> 🔁 이어지게 그리기 <small>가장자리를 넘기면 반대쪽에서 이어져요</small></label>
                    <p class="tpm-lead">펜 색</p>
                    <div class="smk-colors tpm-colors" id="tpmPen">${sw('pen', TPM_COLORS)}</div>
                    <p class="tpm-lead">바탕색</p>
                    <div class="smk-colors tpm-colors" id="tpmBg">${sw('bg', TPM_COLORS)}</div>
                  </div>
                  <div id="tpmPhotoOpts" class="smk-step" hidden>
                    <button type="button" class="smk-go smk-sub" onclick="tpmq('tpmFile').click()">🖼️ 사진 고르기</button>
                    <p class="smk-hint">사진 가운데를 네모로 잘라서 테이프에 쭉 이어 붙여요</p>
                  </div>
                  <button type="button" class="smk-go" onclick="tpmFinish(true)">📌 다이어리에 붙이기</button>
                  <button type="button" class="smk-go smk-sub" onclick="tpmFinish(false)">💾 내 마스킹테이프에 저장만</button>
                </section>
              </div>`;
            document.body.appendChild(el);
            tpmBindPad();
        }
        function tpmCur() {                                            // 지금 만들고 있는 테이프 (저장 모양)
            const o = { id: Date.now().toString(36), m: tpmS.m, bg: tpmS.bg };
            if (tpmS.m === 'i') { o.s = tpmS.si; o.img = tpmS.img; } else { o.s = tpmS.sd; o.img = tpmS.dimg; }
            return o;
        }
        function tpmDraw() {
            const t = tpmq('tpmTape'); if (!t) return;
            t.style.backgroundImage = tpmS.m === 'i' && !tpmS.img ? 'none' : `url("${tpmUrl(tpmCur())}")`;
            document.querySelectorAll('#tpmTabs button').forEach(b => b.classList.toggle('on', b.dataset.m === tpmS.m));
            document.querySelectorAll('#tpmTools button[data-t]').forEach(b => b.classList.toggle('on', (b.dataset.t === 'er') === tpmS.er));
            document.querySelectorAll('#tpmBrush button').forEach(b => b.classList.toggle('on', +b.dataset.b === tpmS.br));
            [['bg', 'Bg'], ['pen', 'Pen']].forEach(([k, id]) => {
                document.querySelectorAll(`#tpm${id} button`).forEach(b => b.classList.toggle('on', b.dataset.c.toLowerCase() === tpmS[k].toLowerCase()));
                const p = tpmq('tpmPick-' + k); if (p) p.value = tpmS[k];
            });
            tpmq('tpmPad').style.background = tpmS.bg;
            tpmq('tpmDrawOpts').hidden = tpmS.m !== 'd'; tpmq('tpmPhotoOpts').hidden = tpmS.m !== 'i';
            const z = tpmq('tpmSize'), r = TPM_SIZE[tpmS.m];
            z.min = r[0]; z.max = r[1]; z.step = 1; z.value = tpmS.m === 'i' ? tpmS.si : tpmS.sd;
        }
        function tpmSetMode(m) { tpmS.m = m; tpmDraw(); if (m === 'i' && !tpmS.img) tpmq('tpmFile').click(); }
        function tpmSetColor(key, c) { tpmS[key] = c; if (key === 'pen') tpmS.er = false; tpmDraw(); }
        function tpmSetSize(v) { if (tpmS.m === 'i') tpmS.si = v; else tpmS.sd = v; tpmDraw(); }
        function tpmSetEraser(on) { tpmS.er = on; tpmDraw(); }
        function tpmSetBrush(n) { tpmS.br = n; tpmDraw(); }

        /* ---------- ✏️ 그리기 ---------- */
        const tpmCtx = () => tpmq('tpmPad').getContext('2d');
        function tpmSeg(x0, y0, x1, y1) {                              // 선 하나 (이어지게 그리기가 켜져 있으면 반대쪽 가장자리에도 같이 그려요)
            const c = tpmCtx(), N = TPM_PAD, offs = tpmS.wrap ? [-N, 0, N] : [0];
            c.save();
            c.globalCompositeOperation = tpmS.er ? 'destination-out' : 'source-over';
            c.strokeStyle = c.fillStyle = tpmS.pen; c.lineWidth = tpmS.br; c.lineCap = c.lineJoin = 'round';
            offs.forEach(dx => offs.forEach(dy => {
                c.beginPath(); c.moveTo(x0 + dx, y0 + dy); c.lineTo(x1 + dx, y1 + dy); c.stroke();
                c.beginPath(); c.arc(x1 + dx, y1 + dy, tpmS.br / 2, 0, 6.2832); c.fill();
            }));
            c.restore();
        }
        function tpmExport() {                                         // 그린 것 → 작은 투명 PNG (비었으면 '')
            const src = tpmq('tpmPad'), N = TPM_PAD, d = tpmCtx().getImageData(0, 0, N, N).data;
            let any = false; for (let i = 3; i < d.length; i += 4) if (d[i]) { any = true; break; }
            if (!any) tpmS.dimg = '';
            else { const c = document.createElement('canvas'); c.width = c.height = TPM_OUT; c.getContext('2d').drawImage(src, 0, 0, TPM_OUT, TPM_OUT); tpmS.dimg = c.toDataURL('image/png'); }
            tpmDraw();
        }
        function tpmUndo() {
            const u = tpmS.undo.pop(); if (!u) return;
            tpmCtx().putImageData(u, 0, 0); tpmExport();
        }
        function tpmClear() {
            tpmS.undo.push(tpmCtx().getImageData(0, 0, TPM_PAD, TPM_PAD)); if (tpmS.undo.length > 20) tpmS.undo.shift();
            tpmCtx().clearRect(0, 0, TPM_PAD, TPM_PAD); tpmExport();
        }
        function tpmBindPad() {
            const pad = tpmq('tpmPad'); let last = null;
            const pt = e => { const r = pad.getBoundingClientRect(); return [(e.clientX - r.left - pad.clientLeft) * TPM_PAD / pad.clientWidth, (e.clientY - r.top - pad.clientTop) * TPM_PAD / pad.clientHeight]; };   // 점선 테두리 안쪽 기준
            pad.addEventListener('pointerdown', e => {
                e.preventDefault(); pad.setPointerCapture(e.pointerId);
                tpmS.undo.push(tpmCtx().getImageData(0, 0, TPM_PAD, TPM_PAD)); if (tpmS.undo.length > 20) tpmS.undo.shift();
                last = pt(e); tpmSeg(last[0], last[1], last[0], last[1]);
            });
            pad.addEventListener('pointermove', e => { if (!last) return; const p = pt(e); tpmSeg(last[0], last[1], p[0], p[1]); last = p; });
            const end = () => { if (!last) return; last = null; tpmExport(); };
            pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
        }

        /* ---------- 사진 ---------- */
        function tpmPickFile(inp) {
            const f = inp.files && inp.files[0]; inp.value = '';
            if (!f || !/^image\//.test(f.type)) return;
            const im = new Image();
            im.onload = () => {
                const c = document.createElement('canvas'), n = TPM_PHOTO_PX, k = Math.max(n / im.width, n / im.height);
                c.width = c.height = n;
                c.getContext('2d').drawImage(im, (n - im.width * k) / 2, (n - im.height * k) / 2, im.width * k, im.height * k);
                URL.revokeObjectURL(im.src);
                tpmS.img = c.toDataURL('image/jpeg', .82); tpmS.m = 'i'; tpmDraw();
            };
            im.onerror = () => showMsg('사진을 열지 못했어요. 다른 사진을 골라 주세요.');
            im.src = URL.createObjectURL(f);
        }

        /* ---------- 완성 ---------- */
        async function tpmFinish(stick) {
            if (tpmS.m === 'i' && !tpmS.img) { showMsg('🖼️ 사진을 먼저 골라 주세요.'); return; }
            if (tpmS.m === 'd') { tpmExport(); if (!tpmS.dimg) { showMsg('✏️ 먼저 네모 칸에 그려 주세요.'); return; } }
            const o = tpmCur();
            try {
                await tpmLoad();
                if (tpmS.list.length >= TPM_MAX) { if (!stick) { showMsg(`내 마스킹테이프는 ${TPM_MAX}개까지 저장돼요.<br>안 쓰는 테이프를 지워 주세요.`); return; } }
                else { tpmS.list.unshift(o); await tpmSave(); }
            } catch (e) { if (!stick) { showMsg('⚠ 내 마스킹테이프를 저장하지 못했어요. 잠시 후 다시 해 주세요.'); return; } }
            if (stick) { tpmStick(o); return; }
            closeTapeMaker();
            showMsg('🎀 내 마스킹테이프에 저장했어요!<br><span style="font-size:12px;color:#777;">빈 곳을 눌러 🎨 스티커 → 🎀 내 마스킹테이프에서 붙일 수 있어요.</span>');
        }
        function tpmStick(o) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">테이프는 🎀 내 마스킹테이프에 저장돼 있어요.</span>'); return; }
            if (placeTape(tpmUrl(o))) closeTapeMaker();
        }

        /* ---------- ✏️ 스티커 창 → 🎀 내 마스킹테이프 ---------- */
        function tpmGrid() {
            const L = tpmS.list || [];
            if (!L.length) return '<div class="cs-empty">🎀 아직 만든 마스킹테이프가 없어요.<br>하단메뉴 ✨ 공방 → 🎀 마스킹테이프에서 만들어 보세요!</div>';
            return '<div class="tp-note">🎀 사진 모서리나 글 위에 붙여 보세요 · 붙인 뒤 ↔ 손잡이로 길이 조절</div>'
                + L.map((o, i) => `<div class="tpm-it"><button type="button" class="tp-item" onclick="tpmUse(${i})"><span style="background-image:url(&quot;${tpmUrl(o)}&quot;)"></span></button><i onclick="tpmDel(${i})" title="지우기">✕</i></div>`).join('');
        }
        async function loadMyTapes(btn) {
            if (btn) { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
            const g = tpmq('stickerGrid'); g.dataset.mytape = '1';
            g.innerHTML = '<div class="cs-empty">불러오는 중…</div>';
            await tpmLoad();
            if (g.dataset.mytape) g.innerHTML = tpmGrid();
        }
        function tpmUse(i) { const o = tpmS.list && tpmS.list[i]; if (o) tpmStick(o); }
        async function tpmDel(i) {
            if (!(await showMsg('이 테이프를 내 마스킹테이프에서 지울까요?<br><span style="font-size:12px;color:#777;">이미 일기에 붙인 테이프는 그대로 남아요.</span>', true))) return;
            tpmS.list.splice(i, 1);
            try { await tpmSave(); } catch (e) {}
            const g = tpmq('stickerGrid'); if (g && g.dataset.mytape) g.innerHTML = tpmGrid();
        }

        function openTapeMaker() {
            tpmBuild();
            if (!tpmS.img && tpmS.m === 'i') tpmS.m = 'd';
            tpmDraw();
            tpmq('tpmRoom').classList.add('show'); tpmq('tpmRoom').scrollTop = 0;
            document.body.classList.add('fc-lock');
        }
        function closeTapeMaker() {
            const r = tpmq('tpmRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        /* 스티커 창의 다른 칸을 누르면 '내 마스킹테이프' 표시 지우기 */
        document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.cat-btn'); if (b && !b.classList.contains('mtp-cat')) { const g = tpmq('stickerGrid'); if (g) delete g.dataset.mytape; } }, true);
        window.openTapeMaker = openTapeMaker;
        window.loadMyTapes = loadMyTapes;
