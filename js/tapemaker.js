/* 말랑달콤 다이어리 - js/tapemaker.js
   🎀 마스킹테이프 만들기 : 내가 고른 무늬 · 색, 또는 내 사진으로 나만의 마스킹테이프를 만들어요 (하단메뉴 ✨ 스티커 → 🎀 마스킹테이프)
   - 🎨 무늬로 : 무늬(단색 · 도트 · 세로줄 · 가로줄 · 사선 · 깅엄 · 하트 · 별 · 물결) + 바탕색 · 무늬색 + 크기
   - 🖼️ 내 사진으로 : 사진 가운데를 네모로 잘라 테이프에 이어 붙여요 (사진은 이 기기에서만 줄여서, 완성된 테이프만 저장돼요)
   - 📌 바로 붙이거나 💾 내 마스킹테이프에 저장 → ✏️ 스티커 창 → 🎀 내 마스킹테이프 칸에서 언제든 다시 붙여요 (최대 30개 · 선물 받은 🎀 마스킹테이프와는 다른 칸)
     저장 위치 : 내 드라이브 말랑달콤 / 다이어리 / 내마스킹테이프.json (게스트는 이 기기에만)
   - 테이프 그림은 js/tape.js 의 tapeSvg 를 그대로 써요 (끝 톱니 · 반투명 · 길이 늘이기 손잡이가 같아요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (마스킹테이프 만들기 · 내 마스킹테이프만 '준비 중') */

        const TPM_FILE = '내마스킹테이프.json', TPM_LOCAL = 'malang_my_tapes', TPM_MAX = 30, TPM_PHOTO_PX = 96;
        const TPM_KINDS = [['solid', '단색'], ['dot', '도트'], ['vline', '세로줄'], ['hline', '가로줄'], ['diag', '사선'], ['check', '깅엄'], ['heart', '하트'], ['star', '별'], ['wave', '물결']];
        const TPM_COLORS = ['#ffc9d9', '#ffd9c2', '#fff3a6', '#bff0dc', '#bfe3ff', '#e9e1ff', '#ffffff', '#ff8fab', '#f2a12a', '#4caf7a', '#3d9be0', '#8a6be0', '#5a3d4a', '#4b5aa8'];
        const TPM_SIZE = { p: [8, 40, 16], i: [16, 60, 30] };            // 크기 막대 : [가장 작게, 가장 크게, 처음 값] (무늬 · 사진)
        const tpmS = { built: false, m: 'p', k: 'dot', bg: '#ffc9d9', fg: '#ffffff', sp: 16, si: 30, img: '', list: null, fileId: null, loading: null };
        const tpmq = id => document.getElementById(id);
        const tpmSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        const tpmR = n => Math.round(n * 100) / 100;

        /* ---------- 무늬 한 칸 그림 ---------- */
        function tpmPat(k, c, s) {
            const r = tpmR;
            if (k === 'dot') return { w: s, h: s, p: `<circle cx="${r(s * .28)}" cy="${r(s * .28)}" r="${r(s * .17)}" fill="${c}"/><circle cx="${r(s * .78)}" cy="${r(s * .78)}" r="${r(s * .17)}" fill="${c}"/>` };
            if (k === 'vline') return { w: s, h: s, p: `<rect width="${r(s / 2)}" height="${s}" fill="${c}"/>` };
            if (k === 'hline') return { w: s, h: s, p: `<rect width="${s}" height="${r(s / 2)}" fill="${c}"/>` };
            if (k === 'diag') return { w: s, h: s, p: `<path d="M${r(-s * .25)} ${r(s * .25)}L${r(s * .25)} ${r(-s * .25)}M0 ${s}L${s} 0M${r(s * .75)} ${r(s * 1.25)}L${r(s * 1.25)} ${r(s * .75)}" stroke="${c}" stroke-width="${r(s * .28)}"/>` };
            if (k === 'check') return { w: s, h: s, p: `<rect width="${r(s / 2)}" height="${s}" fill="${c}" opacity=".55"/><rect width="${s}" height="${r(s / 2)}" fill="${c}" opacity=".55"/>` };
            if (k === 'heart') return { w: r(s * 1.1), h: s, p: `<path transform="scale(${r(s / 20)})" d="M11 15 C3 10 4 4 8 4 C10 4 11 6 11 7 C11 6 12 4 14 4 C18 4 19 10 11 15Z" fill="${c}"/>` };
            if (k === 'star') {
                const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? .22 : .46; return `${r(s * (.5 + Math.cos(a) * rr))},${r(s * (.5 + Math.sin(a) * rr))}`; }).join(' ');
                return { w: s, h: s, p: `<polygon points="${pts}" fill="${c}"/>` };
            }
            if (k === 'wave') return { w: r(s * 1.6), h: r(s * .9), p: `<path d="M0 ${r(s * .45)} q${r(s * .4)} ${r(-s * .4)} ${r(s * .8)} 0 t${r(s * .8)} 0" stroke="${c}" stroke-width="${r(s * .17)}" fill="none"/>` };
            return { w: 10, h: 10, p: '' };                                // 단색
        }
        /* 저장해 둔 모양(o) → tape.js 의 tapeSvg 가 읽는 모양 */
        function tpmDef(o) {
            const t = { id: 'my-' + o.id, name: '내 마스킹테이프', bg: o.bg };
            if (o.m === 'i') { t.w = o.s; t.h = o.s; t.p = `<image href="${o.img}" width="${o.s}" height="${o.s}" preserveAspectRatio="xMidYMid slice"/>`; }
            else Object.assign(t, tpmPat(o.k, o.fg, o.s));
            return t;
        }
        const tpmUrl = o => tapeUrl(tpmDef(o));
        /* 드라이브 · 기기에서 읽은 것은 정해진 모양만 통과 (그림 안에 들어가는 글자라서 꼼꼼히 확인) */
        function tpmClean(o) {
            if (!o || typeof o !== 'object') return null;
            const col = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v), s = +o.s;
            if (!/^[\w-]{1,20}$/.test(o.id || '') || !col(o.bg) || !(s >= 8 && s <= 60)) return null;
            if (o.m === 'i') return /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(o.img || '') ? { id: o.id, m: 'i', bg: o.bg, s, img: o.img } : null;
            return TPM_KINDS.some(x => x[0] === o.k) && col(o.fg) ? { id: o.id, m: 'p', k: o.k, bg: o.bg, fg: o.fg, s } : null;
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
                  <div class="tpm-stage"><span class="tpm-tape" id="tpmTape"></span></div>
                  <div class="smk-chips" id="tpmTabs"><button type="button" data-m="p" onclick="tpmSetMode('p')">🎨 무늬로</button><button type="button" data-m="i" onclick="tpmSetMode('i')">🖼️ 내 사진으로</button></div>
                  <div id="tpmPatOpts" class="smk-step">
                    <p class="tpm-lead">무늬</p>
                    <div class="smk-chips" id="tpmKinds">${TPM_KINDS.map(x => `<button type="button" data-k="${x[0]}" onclick="tpmSetKind('${x[0]}')">${x[1]}</button>`).join('')}</div>
                    <p class="tpm-lead">바탕색</p>
                    <div class="smk-colors tpm-colors" id="tpmBg">${sw('bg', TPM_COLORS)}</div>
                    <div id="tpmFgBox" class="smk-step"><p class="tpm-lead">무늬색</p>
                    <div class="smk-colors tpm-colors" id="tpmFg">${sw('fg', TPM_COLORS)}</div></div>
                  </div>
                  <div id="tpmPhotoOpts" class="smk-step" hidden>
                    <button type="button" class="smk-go smk-sub" onclick="tpmq('tpmFile').click()">🖼️ 사진 고르기</button>
                    <p class="smk-hint">사진 가운데를 네모로 잘라서 테이프에 쭉 이어 붙여요</p>
                  </div>
                  <label class="smk-zoom">🔍 <input type="range" id="tpmSize" oninput="tpmSetSize(+this.value)"></label>
                  <button type="button" class="smk-go" onclick="tpmFinish(true)">📌 다이어리에 붙이기</button>
                  <button type="button" class="smk-go smk-sub" onclick="tpmFinish(false)">💾 내 마스킹테이프에 저장만</button>
                </section>
              </div>`;
            document.body.appendChild(el);
        }
        function tpmCur() {                                            // 지금 만들고 있는 테이프 (저장 모양)
            const o = { id: Date.now().toString(36), m: tpmS.m, bg: tpmS.bg };
            if (tpmS.m === 'i') { o.s = tpmS.si; o.img = tpmS.img; } else { o.s = tpmS.sp; o.k = tpmS.k; o.fg = tpmS.fg; }
            return o;
        }
        function tpmDraw() {
            const t = tpmq('tpmTape'); if (!t) return;
            t.style.backgroundImage = tpmS.m === 'i' && !tpmS.img ? 'none' : `url("${tpmUrl(tpmCur())}")`;
            document.querySelectorAll('#tpmTabs button').forEach(b => b.classList.toggle('on', b.dataset.m === tpmS.m));
            document.querySelectorAll('#tpmKinds button').forEach(b => b.classList.toggle('on', b.dataset.k === tpmS.k));
            ['bg', 'fg'].forEach(k => {
                document.querySelectorAll(`#tpm${k === 'bg' ? 'Bg' : 'Fg'} button`).forEach(b => b.classList.toggle('on', b.dataset.c.toLowerCase() === tpmS[k].toLowerCase()));
                const p = tpmq('tpmPick-' + k); if (p) p.value = tpmS[k];
            });
            tpmq('tpmPatOpts').hidden = tpmS.m !== 'p'; tpmq('tpmPhotoOpts').hidden = tpmS.m !== 'i';
            tpmq('tpmFgBox').hidden = tpmS.k === 'solid';
            const z = tpmq('tpmSize'), r = TPM_SIZE[tpmS.m];
            z.min = r[0]; z.max = r[1]; z.step = 1; z.value = tpmS.m === 'i' ? tpmS.si : tpmS.sp;
        }
        function tpmSetMode(m) { tpmS.m = m; tpmDraw(); if (m === 'i' && !tpmS.img) tpmq('tpmFile').click(); }
        function tpmSetKind(k) { tpmS.k = k; tpmDraw(); }
        function tpmSetColor(key, c) { tpmS[key] = c; tpmDraw(); }
        function tpmSetSize(v) { if (tpmS.m === 'i') tpmS.si = v; else tpmS.sp = v; tpmDraw(); }

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
            if (!L.length) return '<div class="cs-empty">🎀 아직 만든 마스킹테이프가 없어요.<br>하단메뉴 ✨ 스티커 → 🎀 마스킹테이프에서 만들어 보세요!</div>';
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
            if (!tpmS.img && tpmS.m === 'i') tpmS.m = 'p';
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
