/* 말랑달콤 다이어리 - js/doll-room.js
   👧 인형방 : 마네킹에서 시작해 단계별로 인형 만들기 (쉬움 · 어려움)
   - ① 체형 → ② 피부 → ③ 눈·코·입 → ④ 헤어 → ⑤ 화장 → ⑥ 옷 → ⑦ 소품 → ⑧ 완성
   - 쉬움 : 고르기 · 슬라이더 / 어려움 : 펜(점 찍어 잇기 → 닫으면 색 채우기)·붓·고르기 도구로 조각을 하나씩 직접 그리기
   - 내 인형들 : 인형마다 파일 1개 → 구글 드라이브 '말랑달콤 / 인형 / 인형이름.json' (js/doll-store.js, 최대 50개)
   - 만드는 중인 인형은 이 기기에 자동 임시 저장 (창을 닫아도 이어서 만들기)
   - 📷 사진으로 저장(자랑 카드 PNG) · 💾 인형 파일로 저장(.malang.txt) · 📂 인형 불러오기 · 📔 일기에 붙이기
   - 일기에 붙인 인형은 페이지 요소 {"t":"d","c":{인형 데이터}} 로 저장되고, 두 번 누르면 표정·옷을 바로 고칠 수 있어요
   ※ 파일 불러오는 순서: … → pattern-maker → doll-render → doll-store → doll-room → service */

        const DOLL_DRAFT_KEY = 'malang_doll_draft';

        /* =====================================================================
           🧸 인형방 상태
           ===================================================================== */
        const DR = {
            doll: null, editId: null, step: 0, mode: {}, dirty: false, saving: false,
            tool: 'pen', part: null, drawing: null, pressed: null, hover: null, sel: -1, drag: null,
            color: '#ff9fb6', outline: 'auto', w: 3, op: 1, pat: 'none', patColor: '#ffffff', mirror: false,
            zoom: 1, history: [], future: [], lastAct: 0, attachEl: null, replay: null, clothTarget: 'top'
        };

        const DOLL_STEPS = [
            { id: 'body',   label: '① 체형' },
            { id: 'skin',   label: '② 피부' },
            { id: 'face',   label: '③ 눈·코·입', hard: true, slot: 'face' },
            { id: 'hair',   label: '④ 헤어',     hard: true, slot: 'hair' },
            { id: 'makeup', label: '⑤ 화장',     hard: true, slot: 'face' },
            { id: 'cloth',  label: '⑥ 옷',       hard: true, slot: 'cloth' },
            { id: 'acc',    label: '⑦ 소품',     hard: true, slot: 'top' },
            { id: 'done',   label: '⑧ 완성' }
        ];
        /* 어려움 버전 부품 : [이름, 그릴 위치(slot), 추천 도구, 추천 색(함수 또는 값)] */
        const DOLL_PARTS = {
            face:   [['흰자', 'face', 'pen', '#ffffff'], ['눈동자', 'face', 'pen', d => d.eyeColor], ['동공', 'face', 'pen', '#2a1a17'], ['반짝이', 'face', 'pen', '#ffffff'],
                     ['속눈썹', 'face', 'line', '#3a2622'], ['눈썹', 'face', 'line', d => dDark(d.hairColor, 0.25)], ['코', 'face', 'line', d => dDark(d.skin, 0.3)], ['입', 'face', 'pen', '#c2405a']],
            hair:   [['뒷머리', 'back', 'pen', d => d.hairColor], ['옆머리', 'hair', 'pen', d => d.hairColor], ['앞머리', 'hair', 'pen', d => d.hairColor],
                     ['잔머리', 'hair', 'line', d => dDark(d.hairColor, 0.2)], ['하이라이트', 'hair', 'line', '#ffffff']],
            makeup: [['볼터치', 'face', 'brush', d => d.blush], ['아이섀도', 'face', 'brush', d => d.shadow], ['립', 'face', 'pen', d => d.lip], ['점·주근깨', 'face', 'brush', d => dDark(d.skin, 0.4)]],
            cloth:  [['상의', 'cloth', 'pen', '#ffd1dc'], ['소매', 'cloth', 'pen', '#ffd1dc'], ['하의', 'cloth', 'pen', '#b9dcff'], ['카라', 'cloth', 'pen', '#ffffff'],
                     ['단추', 'cloth', 'pen', '#ffffff'], ['리본', 'cloth', 'pen', '#ff6b8f'], ['신발', 'cloth', 'pen', '#ff6b8f'], ['장식선', 'cloth', 'line', '#5a3d3d']],
            acc:    [['머리 리본', 'top', 'pen', '#ff6b8f'], ['머리핀', 'top', 'pen', '#ffd54f'], ['목걸이', 'top', 'line', '#ffd54f'], ['가방', 'top', 'pen', '#c9b6ff'], ['반짝이 효과', 'top', 'brush', '#ffffff']]
        };
        const DOLL_SWATCH = ['#ffffff', '#2a1a17', '#7a4b3a', '#ffd1dc', '#ff9fb6', '#ff6b8f', '#ffe08a', '#c9f0d6', '#b9dcff', '#c9b6ff', '#3b3b55', '#efe4de'];
        const SKIN_SW = ['#efe4de', '#fff0e6', '#ffe2d2', '#f6cfb5', '#e8b48f', '#c98d66', '#9c6646'];
        const HAIR_SW = ['#2e221f', '#7a4b3a', '#c48a55', '#f2d27a', '#f5a3c0', '#a7c7ff', '#b49cff', '#e8e4f0'];
        const EYE_SW = ['#7a4b3a', '#2e221f', '#4a8bd6', '#3fa37a', '#9b6bd6', '#e0557a'];
        const CLOTH_SW = ['#ffffff', '#ffd1dc', '#ff9fb6', '#ff6b8f', '#ffe08a', '#c9f0d6', '#b9dcff', '#c9b6ff', '#3b3b55', '#f2e3c9'];
        const MAKE_SW = ['#ff8fa3', '#ff5c7a', '#ffb07a', '#e86a9a', '#c9a7ff', '#8fd3ff'];

        /* =====================================================================
           🪟 화면 만들기 (처음 한 번)
           ===================================================================== */
        function ensureDollUI() {
            if (document.getElementById('dollRoom')) return;
            const wrap = document.createElement('div');
            wrap.innerHTML = `
            <div class="modal" id="dollPicker">
              <div class="modal-content doll-picker">
                <div class="modal-title">👧 내 인형들</div>
                <div class="doll-picker-top">
                  <button class="btn btn-primary" type="button" onclick="openDollRoom(null)">✏️ 새 인형 만들기</button>
                  <button class="btn" type="button" onclick="document.getElementById('dollFile').click()">📂 인형 불러오기</button>
                  <input type="file" id="dollFile" accept=".txt,.json,text/plain,application/json" style="display:none" onchange="importDollFile(event)">
                </div>
                <p class="doll-where" id="dollWhere"></p>
                <div class="doll-draft" id="dollDraftNote" style="display:none"></div>
                <div class="doll-grid" id="dollGrid"></div>
                <button class="btn" type="button" style="width:100%;justify-content:center;margin-top:12px;" onclick="closeModal('dollPicker')">닫기</button>
              </div>
            </div>
            <div class="doll-room" id="dollRoom" style="display:none">
              <div class="dr-head">
                <b class="dr-title">👧 인형방</b>
                <span class="dr-stats" id="drStats"></span>
                <div class="dr-head-btns">
                  <button class="btn" type="button" onclick="dollSaveToList(true)">💾 저장</button>
                  <button class="btn" type="button" onclick="closeDollRoom()">✕ 닫기</button>
                </div>
              </div>
              <div class="dr-steps" id="drSteps"></div>
              <div class="dr-main">
                <div class="dr-stage-col">
                  <div class="dr-stage" id="drStage">
                    <div class="dr-stage-inner" id="drStageInner">
                      <div id="drDoll"></div>
                      <svg id="drOverlay" viewBox="0 0 300 470" xmlns="http://www.w3.org/2000/svg"></svg>
                    </div>
                  </div>
                  <div class="dr-zoom">
                    <button class="btn" type="button" onclick="dollZoom(-1)" aria-label="작게">－</button>
                    <span id="drZoomVal">100%</span>
                    <button class="btn" type="button" onclick="dollZoom(1)" aria-label="크게">＋</button>
                    <span class="dr-hint" id="drHint"></span>
                  </div>
                </div>
                <div class="dr-panel" id="drPanel"></div>
              </div>
              <div class="dr-foot">
                <button class="btn" type="button" id="drPrev" onclick="dollGoStep(-1)">◀ 이전 단계</button>
                <button class="btn btn-primary" type="button" id="drNext" onclick="dollGoStep(1)">다음 단계 ▶</button>
              </div>
            </div>
            <div class="modal" id="dollQuick">
              <div class="modal-content">
                <div class="modal-title">👧 인형 표정 바꾸기</div>
                <div id="dollQuickBody"></div>
                <div class="sub-modal-btns">
                  <button class="btn" type="button" onclick="dollQuickToRoom()">✏️ 인형방에서 자세히</button>
                  <button class="btn" type="button" onclick="closeModal('dollQuick')">닫기</button>
                </div>
              </div>
            </div>`;
            document.body.appendChild(wrap);
            setupDollStage();
            window.addEventListener('resize', () => { if (document.getElementById('dollRoom').style.display === 'flex') applyDollZoom(); });
        }

        /* =====================================================================
           👧 내 인형들 창
           ===================================================================== */
        function openDollPicker() {
            ensureDollUI();
            ['serviceModal'].forEach(id => { const m = document.getElementById(id); if (m) m.style.display = 'none'; });
            renderDollPicker();
            openModal('dollPicker');
        }

        function readDraft() { try { return JSON.parse(localStorage.getItem(DOLL_DRAFT_KEY)); } catch (e) { return null; } }
        function clearDraft() { try { localStorage.removeItem(DOLL_DRAFT_KEY); } catch (e) {} }

        async function renderDollPicker(force) {
            const grid = document.getElementById('dollGrid');
            const dr = readDraft(), note = document.getElementById('dollDraftNote');
            if (dr && dr.doll && sanitizeDoll(dr.doll)) {
                note.style.display = 'flex';
                note.innerHTML = '';
                const t = document.createElement('span');
                t.textContent = '✏️ 만들다 만 인형이 있어요. 이어서 만들까요?';
                const b = document.createElement('button'); b.className = 'btn'; b.type = 'button'; b.textContent = '이어서 만들기';
                b.onclick = () => openDollRoom(dr.editId || null, sanitizeDoll(dr.doll), dr.step);
                const x = document.createElement('button'); x.className = 'btn'; x.type = 'button'; x.textContent = '버리기';
                x.onclick = () => { clearDraft(); renderDollPicker(); };
                note.append(t, b, x);
            } else note.style.display = 'none';
            const where = document.getElementById('dollWhere');
            if (where) where.textContent = dollUseDrive() ? `☁ 내 드라이브 / ${dollFolderText()} 폴더에 인형마다 파일 1개로 저장돼요` : '🙈 로그인하지 않아서 이 기기에만 저장돼요';
            if (!dollCache.list || force) grid.innerHTML = '<div class="doll-empty">☁ 인형을 불러오는 중…</div>';
            let list;
            try { list = await listDolls(force); }
            catch (e) {
                grid.innerHTML = '';
                const box = document.createElement('div'); box.className = 'doll-empty';
                box.innerHTML = '⚠ 인형을 불러오지 못했어요.<br>인터넷 연결을 확인해 주세요.<br>';
                const r = document.createElement('button'); r.className = 'btn'; r.type = 'button'; r.textContent = '🔄 다시 불러오기'; r.style.margin = '8px auto 0';
                r.onclick = () => renderDollPicker(true);
                box.appendChild(r); grid.appendChild(box);
                return;
            }
            grid.innerHTML = '';
            if (!list.length) { grid.innerHTML = '<div class="doll-empty">아직 만든 인형이 없어요.<br>✏️ 새 인형 만들기를 눌러 마네킹부터 시작해 보세요!</div>'; return; }
            list.forEach((ent, i) => {
                const d = ent.doll;
                const card = document.createElement('div');
                card.className = 'doll-card';
                const img = document.createElement('img');
                img.alt = d.name || '인형'; img.src = dollDataUrl(d, { bg: true, pfx: 'pk' + i });
                const nm = document.createElement('div'); nm.className = 'doll-card-name';
                nm.textContent = (d.name || '이름 없는 인형') + (d.stats.hard ? ' 🔥' : '');
                nm.title = ent.name;
                const acts = document.createElement('div'); acts.className = 'doll-card-acts';
                const mk = (label, title, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label; b.title = title; b.onclick = fn; acts.appendChild(b); };
                mk('📔 붙이기', '지금 일기 페이지에 붙이기', () => { if (attachDollToPage(d)) closeModal('dollPicker'); });
                mk('✏️', '인형방에서 고치기', () => openDollRoom(ent.id));
                mk('🗑', '지우기', async () => {
                    if (!(await showMsg(`'${d.name || '이름 없는 인형'}' 인형을 지울까요?<br><span style="font-size:12px;color:#777;">드라이브에서는 휴지통으로 옮겨져요. 일기에 이미 붙인 인형은 그대로 남아요.</span>`, true))) return;
                    try { await deleteDoll(ent.id); } catch (e) { showMsg('⚠ 지우지 못했어요. 인터넷 연결을 확인해 주세요.'); }
                    renderDollPicker();
                });
                card.append(img, nm, acts);
                grid.appendChild(card);
            });
        }

        /* =====================================================================
           🧸 인형방 열기 / 닫기
           ===================================================================== */
        function openDollRoom(id, doll, step) {
            ensureDollUI();
            const ent = id ? (dollCache.list || []).find(e => e.id === id) : null;
            DR.editId = ent ? ent.id : (doll && id ? id : null);
            DR.doll = doll ? dollClone(doll) : (ent ? dollClone(ent.doll) : dollNewMannequin());
            DR.step = step != null ? Math.max(0, Math.min(7, step)) : (ent ? 7 : 0);
            DR.mode = {}; DR.history = []; DR.future = []; DR.sel = -1; DR.drawing = null; DR.dirty = !!doll;
            DR.lastAct = Date.now(); DR.zoom = 1; DR.part = null;
            closeModal('dollPicker');
            document.getElementById('dollRoom').style.display = 'flex';
            renderDollRoom();
            applyDollZoom();
        }

        async function closeDollRoom() {
            stopDollReplay();
            if (DR.dirty) {
                const yes = await showMsg('저장하지 않은 변경이 있어요.<br>내 인형들에 저장할까요?<br><span style="font-size:12px;color:#777;">취소를 누르면 이 기기에 임시로 남겨 두고 닫아요.</span>', true);
                if (yes) { if (!(await dollSaveToList(false))) return; }
            } else clearDraft();
            document.getElementById('dollRoom').style.display = 'none';
            DR.attachEl = null;
        }

        /* 내 인형들에 저장 → 드라이브 '말랑달콤 / 인형 / 인형이름.json' */
        async function dollSaveToList(showToast) {
            if (DR.saving) return false;
            const d = sanitizeDoll(DR.doll);
            if (!d) { showMsg('⚠ 인형이 너무 커서 저장할 수 없어요.<br>조각 수를 조금 줄여 주세요.'); return false; }
            if (!d.name) {
                DR.step = 7; renderDollRoom();
                await showMsg('👧 먼저 인형 이름을 지어 주세요.<br><span style="font-size:12px;color:#777;">이름이 그대로 파일 이름이 돼요. (예: 로라 → 로라.json)</span>');
                const n = document.getElementById('drName'); if (n) n.focus();
                return false;
            }
            DR.saving = true;
            try {
                const r = await saveDoll(d, DR.editId);
                if (!r) return false;
                DR.editId = r.id;
                DR.doll.name = r.doll.name;                                  // 같은 이름이 있어서 '로라 (2)'로 바뀌었을 수 있음
                const nameIn = document.getElementById('drName'); if (nameIn) nameIn.value = r.doll.name;
                DR.dirty = false; clearDraft();
                if (showToast) toast(dollUseDrive() ? `💾 '${r.doll.name}' 저장했어요 · ${dollFolderText()} / ${dollFileName(r.doll.name)}` : `💾 '${r.doll.name}' 이 기기에 저장했어요`);
                return true;
            } catch (e) {
                console.error('인형 저장 오류:', e);
                showMsg('⚠ 구글 드라이브에 저장하지 못했어요.<br>인터넷 연결을 확인한 뒤 다시 저장해 주세요.<br><span style="font-size:12px;color:#777;">만들던 인형은 이 기기에 임시로 남아 있어요.</span>');
                return false;
            } finally { DR.saving = false; }
        }

        /* 활동 시간 기록 (1분 넘게 손을 놓은 시간은 빼고 셈) */
        function dollActive() {
            const now = Date.now();
            if (DR.doll && now - DR.lastAct < 60000) DR.doll.stats.ms += now - DR.lastAct;
            DR.lastAct = now;
        }
        let draftTimer = null;
        function dollChanged() {
            DR.dirty = true;
            DR.doll.stats.hard = DR.doll.layers.length > 0;
            clearTimeout(draftTimer);
            draftTimer = setTimeout(() => {
                try { localStorage.setItem(DOLL_DRAFT_KEY, JSON.stringify({ doll: DR.doll, editId: DR.editId, step: DR.step })); } catch (e) {}
            }, 700);
        }
        function dollPush() { DR.history.push(JSON.stringify(DR.doll.layers)); if (DR.history.length > 80) DR.history.shift(); DR.future = []; }
        function dollUndo() {
            if (DR.drawing) { DR.drawing.pts.pop(); if (!DR.drawing.pts.length) DR.drawing = null; drawOverlay(); return; }
            if (!DR.history.length) return;
            DR.future.push(JSON.stringify(DR.doll.layers));
            DR.doll.layers = JSON.parse(DR.history.pop()); DR.sel = -1;
            dollChanged(); renderDollRoom();
        }
        function dollRedo() {
            if (!DR.future.length) return;
            DR.history.push(JSON.stringify(DR.doll.layers));
            DR.doll.layers = JSON.parse(DR.future.pop()); DR.sel = -1;
            dollChanged(); renderDollRoom();
        }

        /* =====================================================================
           🖼 그리기 (인형 + 도구 미리보기)
           ===================================================================== */
        function renderDollStage() {
            const host = document.getElementById('drDoll');
            host.innerHTML = dollSVG(DR.doll, { bg: true, pfx: 'rm', attrs: 'id="drSvg"' });
            const svg = document.getElementById('drSvg');
            svg.classList.toggle('pick', isHardStep() && DR.tool === 'select');
            drawOverlay();
        }

        function renderDollRoom() {
            const st = DOLL_STEPS[DR.step];
            document.getElementById('drSteps').innerHTML = DOLL_STEPS.map((s, i) => `<button type="button" class="dr-step${i === DR.step ? ' on' : ''}${i < DR.step ? ' passed' : ''}" onclick="dollGoStep(${i - DR.step})">${s.label}</button>`).join('');
            document.getElementById('drPrev').disabled = DR.step === 0;
            const next = document.getElementById('drNext');
            next.style.display = DR.step === 7 ? 'none' : '';
            next.textContent = DR.step === 6 ? '완성하기 ▶' : '다음 단계 ▶';
            const c = dollCounts(DR.doll);
            document.getElementById('drStats').textContent = `⏱ ${dollTimeText(DR.doll.stats.ms)} · 🧩 조각 ${c.pieces} · 📍 점 ${c.pts}${c.pieces ? ' · 🔥 어려움' : ''}`;
            document.getElementById('drHint').textContent = isHardStep() ? hardHint() : '';
            document.getElementById('drOverlay').style.pointerEvents = isHardStep() && DR.tool !== 'select' ? 'auto' : 'none';
            renderDollStage();
            renderDollPanel();
        }

        function dollGoStep(delta) {
            stopDollReplay();
            if (DR.drawing) finishDrawing(false);
            DR.step = Math.max(0, Math.min(7, DR.step + delta));
            DR.sel = -1; DR.part = null;
            dollChanged();
            renderDollRoom();
        }
        const isHardStep = () => { const s = DOLL_STEPS[DR.step]; return !!(s.hard && DR.mode[s.id] === 'hard'); };
        function hardHint() {
            if (DR.tool === 'pen') return DR.drawing ? '점을 이어 찍고, 첫 점을 누르면 닫혀서 색이 채워져요. 누른 채 끌면 곡선! (두 번 누르면 선으로 끝)' : '펜: 점을 찍어 시작하세요';
            if (DR.tool === 'brush') return '붓: 누른 채로 칠하세요';
            return '고르기: 조각을 눌러 고르고, 끌어서 옮기거나 점을 끌어 모양을 고쳐요';
        }

        /* ---------- 확대 ---------- */
        function dollZoom(dir) { DR.zoom = Math.max(1, Math.min(4, Math.round((DR.zoom + dir * 0.5) * 10) / 10)); applyDollZoom(); }
        function applyDollZoom() {
            const inner = document.getElementById('drStageInner'), stage = document.getElementById('drStage');
            const base = Math.max(120, Math.min(stage.clientWidth - 4, (stage.clientHeight - 4) * 300 / 470));   // 화면에 꼭 맞는 크기
            inner.style.width = Math.round(base * DR.zoom) + 'px';
            document.getElementById('drZoomVal').textContent = Math.round(DR.zoom * 100) + '%';
            requestAnimationFrame(() => { stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2; stage.scrollTop = (stage.scrollHeight - stage.clientHeight) * 0.3; });
        }

        /* ---------- 도구 미리보기 (그리는 중인 선 · 고른 조각의 점) ---------- */
        function drawOverlay() {
            const ov = document.getElementById('drOverlay');
            if (!ov) return;
            let h = '';
            const k = 1 / DR.zoom;
            const d = DR.drawing;
            if (d && d.pts.length) {
                const col = d.kind === 'brush' ? DR.color : '#ff3d7f';
                if (d.kind === 'brush') {
                    h += `<polyline points="${d.pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${DR.color}" stroke-width="${DR.w}" stroke-linecap="round" stroke-linejoin="round" opacity="${DR.op}"/>`;
                } else {
                    const path = dollLayerPath(d.pts, false);
                    if (d.pts.length >= 3) h += `<path d="${path}Z" fill="${DR.color}" opacity=".25"/>`;
                    h += `<path d="${path}" fill="none" stroke="${col}" stroke-width="${2 * k}" stroke-dasharray="${4 * k} ${3 * k}"/>`;
                    if (DR.hover) {
                        const last = d.pts[d.pts.length - 1];
                        h += `<line x1="${last[0]}" y1="${last[1]}" x2="${DR.hover[0]}" y2="${DR.hover[1]}" stroke="${col}" stroke-width="${1.6 * k}"/>`;
                    }
                    d.pts.forEach((p, i) => {
                        const closeHit = i === 0 && d.pts.length >= 3 && DR.hover && Math.hypot(DR.hover[0] - p[0], DR.hover[1] - p[1]) < 9 * k;
                        h += `<circle cx="${p[0]}" cy="${p[1]}" r="${(i === 0 ? 5 : 3.5) * k * (closeHit ? 1.6 : 1)}" fill="${i === 0 ? '#fff' : col}" stroke="${col}" stroke-width="${1.5 * k}"/>`;
                    });
                    if (DR.mirror) h += `<path d="${dollLayerPath(d.pts.map(mirrorPt), false)}" fill="none" stroke="${col}" stroke-width="${1.4 * k}" opacity=".45"/>`;
                }
            }
            if (DR.mirror && isHardStep()) h += `<line x1="150" y1="0" x2="150" y2="470" stroke="#7fb3ff" stroke-width="${1 * k}" stroke-dasharray="${5 * k} ${5 * k}" opacity=".7"/>`;
            const L = DR.sel >= 0 ? DR.doll.layers[DR.sel] : null;
            if (L && isHardStep() && DR.tool === 'select') {
                h += `<path d="${dollLayerPath(L.pts, L.kind === 'poly')}" fill="none" stroke="#3d8bff" stroke-width="${1.6 * k}" stroke-dasharray="${4 * k} ${3 * k}"/>`;
                if (L.kind !== 'brush') L.pts.forEach((p, j) => {
                    if (p.length >= 4) h += `<rect class="dr-handle" data-h="${j}" data-c="1" x="${p[2] - 3.5 * k}" y="${p[3] - 3.5 * k}" width="${7 * k}" height="${7 * k}" fill="#fff" stroke="#3d8bff" stroke-width="${1.4 * k}" transform="rotate(45 ${p[2]} ${p[3]})"/>`;
                    h += `<circle class="dr-handle" data-h="${j}" cx="${p[0]}" cy="${p[1]}" r="${4.5 * k}" fill="#3d8bff" stroke="#fff" stroke-width="${1.4 * k}"/>`;
                });
            }
            ov.innerHTML = h;
        }
        const mirrorPt = p => p.length >= 4 ? [300 - p[0], p[1], 300 - p[2], p[3]] : [300 - p[0], p[1]];

        /* =====================================================================
           ✏️ 어려움 버전 도구 (펜 · 붓 · 고르기)
           ===================================================================== */
        function svgPoint(e, el) {
            const svg = el || document.getElementById('drOverlay');
            const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
            const m = svg.getScreenCTM();
            const p = pt.matrixTransform(m.inverse());
            return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10];
        }
        function curPart() {
            const step = DOLL_STEPS[DR.step];
            const parts = DOLL_PARTS[step.id] || [];
            return parts.find(p => p[0] === DR.part) || null;
        }
        function newLayer(kind, pts) {
            const part = curPart(), step = DOLL_STEPS[DR.step];
            const auto = DR.outline === 'auto';
            return {
                slot: part ? part[1] : step.slot, kind, pts,
                fill: DR.color, stroke: kind === 'poly' ? (auto ? dDark(DR.color, 0.38) : DR.color) : DR.color,
                w: kind === 'poly' ? (auto ? 1.8 : 0.5) : DR.w, op: DR.op,
                pat: kind === 'poly' ? DR.pat : 'none', patColor: DR.patColor, name: part ? part[0] : '', hidden: false
            };
        }
        function commitLayer(L) {
            dollPush();
            DR.doll.layers.push(L);
            if (DR.mirror) {
                const M = dollClone(L); M.pts = M.pts.map(mirrorPt); M.name = (L.name ? L.name + ' ' : '') + '(대칭)';
                DR.doll.layers.push(M);
            }
            DR.sel = DR.doll.layers.length - 1;
            dollChanged(); renderDollRoom();
        }
        function finishDrawing(asLine) {
            const d = DR.drawing;
            DR.drawing = null; DR.pressed = null;
            if (!d) return;
            if (d.kind === 'brush') { if (d.pts.length) commitLayer(newLayer('brush', d.pts)); return; }
            if (asLine) { if (d.pts.length >= 2) commitLayer(newLayer('line', d.pts)); else drawOverlay(); return; }
            if (d.pts.length >= 3) commitLayer(newLayer('poly', d.pts)); else drawOverlay();
        }

        function setupDollStage() {
            const ov = document.getElementById('drOverlay');
            ov.addEventListener('pointerdown', e => {
                if (!isHardStep() || DR.replay) return;
                e.preventDefault(); dollActive();
                try { ov.setPointerCapture(e.pointerId); } catch (err) {}
                const p = svgPoint(e), k = 1 / DR.zoom;
                if (DR.tool === 'brush') { DR.drawing = { kind: 'brush', pts: [p] }; DR.pressed = { brush: true }; drawOverlay(); return; }
                if (DR.tool !== 'pen') return;
                const kindLine = curPart() && curPart()[2] === 'line';
                if (!DR.drawing) { DR.drawing = { kind: kindLine ? 'line' : 'poly', pts: [p] }; DR.pressed = { start: p, idx: 0 }; DR.lastDown = Date.now(); drawOverlay(); return; }
                /* 같은 자리를 빠르게 두 번 누르면 열린 선으로 끝내기 (마우스·터치 공통) */
                const lastP = DR.drawing.pts[DR.drawing.pts.length - 1], now = Date.now();
                if (now - (DR.lastDown || 0) < 400 && Math.hypot(p[0] - lastP[0], p[1] - lastP[1]) < 8 * k) { DR.lastDown = 0; finishDrawing(true); return; }
                DR.lastDown = now;
                const first = DR.drawing.pts[0];
                if (DR.drawing.pts.length >= 3 && Math.hypot(p[0] - first[0], p[1] - first[1]) < 9 * k) { finishDrawing(false); return; }
                DR.drawing.pts.push(p);
                DR.pressed = { start: p, idx: DR.drawing.pts.length - 1 };
                drawOverlay();
            });
            ov.addEventListener('pointermove', e => {
                if (!isHardStep() || DR.replay) return;
                const p = svgPoint(e);
                DR.hover = p;
                if (DR.drawing && DR.drawing.kind === 'brush' && DR.pressed) {
                    const last = DR.drawing.pts[DR.drawing.pts.length - 1];
                    if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 1.2 / DR.zoom && DR.drawing.pts.length < DOLL_MAX_PTS) DR.drawing.pts.push(p);
                } else if (DR.drawing && DR.pressed && DR.pressed.idx > 0) {
                    const s = DR.pressed.start;
                    if (Math.hypot(p[0] - s[0], p[1] - s[1]) > 4 / DR.zoom) {
                        const prev = DR.drawing.pts[DR.pressed.idx - 1];
                        const cx = (prev[0] + s[0]) / 2 + (p[0] - s[0]), cy = (prev[1] + s[1]) / 2 + (p[1] - s[1]);
                        DR.drawing.pts[DR.pressed.idx] = [s[0], s[1], Math.round(cx * 10) / 10, Math.round(cy * 10) / 10];
                    }
                }
                drawOverlay();
            });
            const up = () => {
                if (DR.drawing && DR.drawing.kind === 'brush' && DR.pressed) { DR.pressed = null; finishDrawing(false); return; }
                DR.pressed = null;
            };
            ov.addEventListener('pointerup', up);
            ov.addEventListener('pointercancel', up);
            ov.addEventListener('pointerleave', () => { DR.hover = null; if (!DR.pressed) drawOverlay(); });
            /* 고르기 도구 : 조각 누르기 → 고르기 · 끌어서 옮기기 / 점 끌어서 모양 고치기 */
            const host = document.getElementById('drDoll');
            host.addEventListener('pointerdown', e => {
                if (!isHardStep() || DR.tool !== 'select' || DR.replay) return;
                const t = e.target.closest('[data-li]');
                if (!t) { DR.sel = -1; renderDollRoom(); return; }
                e.preventDefault(); dollActive();
                DR.sel = +t.dataset.li;
                dollPush();
                DR.drag = { mode: 'move', start: svgPoint(e, document.getElementById('drSvg')), orig: dollClone(DR.doll.layers[DR.sel].pts), moved: false };
                renderDollRoom();
            });
            ov.addEventListener('pointerdown', e => {
                const hEl = e.target.closest('.dr-handle');
                if (!hEl || DR.tool !== 'select' || DR.sel < 0) return;
                e.preventDefault(); e.stopPropagation(); dollActive();
                dollPush();
                DR.drag = { mode: hEl.dataset.c ? 'ctrl' : 'pt', j: +hEl.dataset.h, moved: false };
            }, true);
            window.addEventListener('pointermove', e => {
                if (!DR.drag || DR.sel < 0) return;
                const L = DR.doll.layers[DR.sel];
                const p = svgPoint(e, document.getElementById('drSvg') || undefined);
                if (DR.drag.mode === 'move') {
                    const dx = p[0] - DR.drag.start[0], dy = p[1] - DR.drag.start[1];
                    L.pts = DR.drag.orig.map(q => q.length >= 4 ? [q[0] + dx, q[1] + dy, q[2] + dx, q[3] + dy] : [q[0] + dx, q[1] + dy]).map(q => q.map(n => Math.round(n * 10) / 10));
                } else if (DR.drag.mode === 'pt') {
                    const q = L.pts[DR.drag.j];
                    if (q.length >= 4) { const dx = p[0] - q[0], dy = p[1] - q[1]; L.pts[DR.drag.j] = [p[0], p[1], q[2] + dx, q[3] + dy]; }
                    else L.pts[DR.drag.j] = [p[0], p[1]];
                } else {
                    const q = L.pts[DR.drag.j]; L.pts[DR.drag.j] = [q[0], q[1], p[0], p[1]];
                }
                DR.drag.moved = true;
                if (!DR.drag.raf) DR.drag.raf = requestAnimationFrame(() => { if (DR.drag) DR.drag.raf = 0; renderDollStage(); });
            });
            window.addEventListener('pointerup', () => {
                if (!DR.drag) return;
                if (!DR.drag.moved) DR.history.pop();                   // 누르기만 했으면 되돌리기 기록 빼기
                else dollChanged();
                DR.drag = null;
                renderDollRoom();
            });
            document.addEventListener('keydown', e => {
                if (document.getElementById('dollRoom').style.display !== 'flex') return;
                if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
                if (e.key === 'Escape' && DR.drawing) { DR.drawing = null; drawOverlay(); }
                if (e.key === 'Enter' && DR.drawing) finishDrawing(DR.drawing.kind === 'line');
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); dollUndo(); }
                if (e.key === 'Delete' && DR.sel >= 0 && !DR.drawing) dollLayerAction('del');
            });
        }

        function dollLayerAction(act) {
            const i = DR.sel, Ls = DR.doll.layers;
            if (i < 0 || !Ls[i]) return;
            dollPush();
            if (act === 'del') { Ls.splice(i, 1); DR.sel = -1; }
            if (act === 'up' && i < Ls.length - 1) { [Ls[i], Ls[i + 1]] = [Ls[i + 1], Ls[i]]; DR.sel = i + 1; }
            if (act === 'down' && i > 0) { [Ls[i], Ls[i - 1]] = [Ls[i - 1], Ls[i]]; DR.sel = i - 1; }
            if (act === 'dup') { const c = dollClone(Ls[i]); c.pts = c.pts.map(q => q.map(n => n + 6)); Ls.splice(i + 1, 0, c); DR.sel = i + 1; }
            if (act === 'mirror') { const c = dollClone(Ls[i]); c.pts = c.pts.map(mirrorPt); Ls.splice(i + 1, 0, c); DR.sel = i + 1; }
            if (act === 'hide') Ls[i].hidden = !Ls[i].hidden;
            dollChanged(); renderDollRoom();
        }
        function applyToSelected(prop, v) {
            if (DR.sel < 0) return;
            const L = DR.doll.layers[DR.sel];
            dollPush();
            if (prop === 'color') { L.fill = v; L.stroke = L.kind === 'poly' ? (L.w <= 0.5 ? v : dDark(v, 0.38)) : v; }
            else L[prop] = v;
            dollChanged(); renderDollStage();
        }

        /* =====================================================================
           🎛 오른쪽 패널
           ===================================================================== */
        function dGet(path) { return path.split('.').reduce((o, k) => o[k], DR.doll); }
        function dSet(path, v) {
            const ks = path.split('.'), last = ks.pop();
            ks.reduce((o, k) => o[k], DR.doll)[last] = v;
            dollActive(); dollChanged(); renderDollStage(); renderDollPanel();
            const c = dollCounts(DR.doll);
            document.getElementById('drStats').textContent = `⏱ ${dollTimeText(DR.doll.stats.ms)} · 🧩 조각 ${c.pieces} · 📍 점 ${c.pts}${c.pieces ? ' · 🔥 어려움' : ''}`;
        }
        const grp = (title, inner, note) => `<div class="dr-group"><h4>${title}</h4>${inner}${note ? `<p class="dr-note">${note}</p>` : ''}</div>`;
        function chipsD(path, opts) { const cur = dGet(path); return `<div class="chips">${opts.map(([v, l]) => `<button type="button" class="chip${cur === v ? ' on' : ''}" data-dset="${path}" data-val="${v}">${l}</button>`).join('')}</div>`; }
        function colorsD(path, list) {
            const cur = dGet(path), id = 'dc-' + path.replace(/\./g, '-');
            return `<div class="swatches">${list.map(c => `<button type="button" class="sw${cur === c ? ' on' : ''}" style="background:${c}" data-dset="${path}" data-val="${c}" aria-label="${c}"></button>`).join('')}<input type="color" id="${id}" value="${cur}" data-dcolor="${path}" title="직접 고르기"></div>`;
        }
        function rangeD(path, min, max, step, fmt) {
            const v = dGet(path), id = 'dr-' + path.replace(/\./g, '-');
            return `<div class="range"><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}" data-drange="${path}" data-fmt="${fmt}"><span>${fmtVal(fmt, v)}</span></div>`;
        }
        function fmtVal(fmt, v) {
            v = +v;
            if (fmt === 'h') return ['아담', '아담', '보통', '키큼', '키큼'][Math.round(v * 4)];
            if (fmt === 'len') return v < 0.3 ? '짧게' : v < 0.7 ? '중간' : '길게';
            return Math.round(v * 100) + '%';
        }
        const togglesD = list => `<div class="chips">${list.map(([path, l]) => `<button type="button" class="chip${dGet(path) ? ' on' : ''}" data-dtoggle="${path}">${l}</button>`).join('')}</div>`;

        function renderDollPanel() {
            const st = DOLL_STEPS[DR.step], P = document.getElementById('drPanel');
            let h = '';
            if (st.hard) {
                const m = DR.mode[st.id] || 'easy';
                h += `<div class="dr-mode"><button type="button" class="chip${m === 'easy' ? ' on' : ''}" data-dmode="easy">😊 쉬움 (고르기)</button><button type="button" class="chip${m === 'hard' ? ' on' : ''}" data-dmode="hard">🔥 어려움 (직접 그리기)</button></div>`;
                if (m === 'hard') { P.innerHTML = h + hardPanel(st); return; }
            }
            switch (st.id) {
                case 'body':
                    h += `<p class="dr-intro">마네킹에서 시작해요. 먼저 몸의 모양을 정해 주세요.</p>`;
                    h += grp('체형', chipsD('gender', [['girl', '👧 여자 체형'], ['boy', '👦 남자 체형']]));
                    h += grp('몸매', chipsD('body', [['slim', '날씬'], ['normal', '보통'], ['chubby', '통통']]));
                    h += grp('키', rangeD('height', 0, 1, 0.05, 'h'));
                    h += grp('머리 크기', rangeD('head', 0.9, 1.1, 0.02, 'pct'));
                    h += grp('얼굴형', chipsD('face', [['round', '동글'], ['oval', '계란'], ['slim', '갸름'], ['chubby', '볼살 통통']]));
                    h += grp('배경', chipsD('bg', [['dots', '딸기우유 도트'], ['sky', '맑은 하늘'], ['check', '민트 체크'], ['room', '내 방']]));
                    break;
                case 'skin':
                    h += grp('피부색', colorsD('skin', SKIN_SW), '첫 번째 색은 마네킹 색이에요.');
                    break;
                case 'face':
                    h += grp('눈', chipsD('eyes', [['none', '없음'], ['sparkle', '반짝눈'], ['smile', '웃는눈'], ['cat', '고양이눈'], ['sleepy', '졸린눈'], ['heart', '하트눈']]));
                    h += grp('눈동자 색', colorsD('eyeColor', EYE_SW));
                    h += grp('눈 크기', rangeD('eyeSize', 0.8, 1.25, 0.05, 'pct'));
                    h += grp('눈 사이 간격', rangeD('eyeGap', 0.85, 1.15, 0.05, 'pct'));
                    h += grp('눈썹', chipsD('brows', [['none', '없음'], ['arc', '둥근'], ['flat', '일자'], ['worried', '시무룩'], ['strong', '씩씩']]));
                    h += grp('코', chipsD('nose', [['none', '없음'], ['dot', '콕'], ['line', '선']]));
                    h += grp('입', chipsD('mouth', [['none', '없음'], ['smile', '스마일'], ['open', '활짝'], ['cat', '고양이'], ['o', '오!'], ['pout', '뽀뽀']]));
                    break;
                case 'hair':
                    h += grp('머리 색', colorsD('hairColor', HAIR_SW));
                    h += grp('앞머리', chipsD('hairFront', [['none', '없음'], ['blunt', '일자 뱅'], ['wispy', '시스루'], ['spiky', '삐죽'], ['side', '옆으로'], ['part', '가르마'], ['up', '올림']]));
                    h += grp('뒷머리', chipsD('hairBack', [['none', '없음'], ['short', '짧은 머리'], ['bob', '단발'], ['long', '긴 생머리'], ['twin', '양갈래'], ['pony', '포니테일'], ['bun', '똥머리']]));
                    break;
                case 'makeup':
                    h += grp('볼터치 모양', chipsD('blushStyle', [['oval', '동글'], ['lines', '빗금'], ['heart', '하트']]));
                    h += grp('볼터치 색', colorsD('blush', MAKE_SW));
                    h += grp('볼터치 진하기', rangeD('blushA', 0, 1, 0.05, 'pct'));
                    h += grp('립 색', colorsD('lip', MAKE_SW));
                    h += grp('립 진하기', rangeD('lipA', 0, 1, 0.05, 'pct'));
                    h += grp('아이섀도 색', colorsD('shadow', MAKE_SW));
                    h += grp('아이섀도 진하기', rangeD('shadowA', 0, 0.8, 0.05, 'pct'));
                    h += grp('그 밖에', togglesD([['lashes', '속눈썹'], ['freckles', '주근깨']]));
                    break;
                case 'cloth': {
                    h += grp('원피스', chipsD('dress', [['none', '안 입기'], ['aline', 'A라인'], ['princess', '공주 드레스'], ['hanbok', '한복']]), '원피스를 고르면 상의·하의 대신 원피스를 입어요.');
                    if (DR.doll.dress === 'none') {
                        h += grp('상의', chipsD('top', [['none', '없음'], ['tee', '티셔츠'], ['blouse', '블라우스'], ['shirt', '셔츠'], ['hoodie', '후드티'], ['cardigan', '가디건']]));
                        h += grp('하의', chipsD('bottom', [['none', '없음'], ['skirt', '치마'], ['suspender', '멜빵치마'], ['pants', '바지']]));
                    }
                    h += grp('신발', chipsD('shoes', [['none', '맨발'], ['mary', '메리제인'], ['sneaker', '운동화'], ['boots', '부츠']]));
                    const t = DR.clothTarget;
                    h += `<div class="dr-group"><h4>✂️ 옷 색·무늬 만들기</h4><div class="chips">${[['top', '상의'], ['bottom', '하의'], ['dress', '원피스'], ['shoes', '신발']].map(([k, l]) => `<button type="button" class="chip${t === k ? ' on' : ''}" data-ctarget="${k}">${l}</button>`).join('')}</div></div>`;
                    h += grp('옷 색', colorsD(`cloth.${t}.color`, CLOTH_SW));
                    if (t !== 'shoes') {
                        h += grp('무늬', chipsD(`cloth.${t}.pat`, [['none', '민무늬'], ['diag', '사선'], ['stripe', '가로줄'], ['dot', '도트'], ['check', '체크'], ['heart', '하트'], ['flower', '꽃'], ['star', '별']]));
                        h += grp(t === 'dress' && DR.doll.dress === 'hanbok' ? '저고리 색 (무늬색)' : '무늬 색', colorsD(`cloth.${t}.patColor`, CLOTH_SW));
                        h += grp('무늬 크기', rangeD(`cloth.${t}.patSize`, 0.4, 2, 0.1, 'pct'));
                    }
                    if (t === 'top' || (t === 'dress' && DR.doll.dress !== 'hanbok')) h += grp('소매', chipsD(`cloth.${t}.sleeve`, [['none', '민소매'], ['short', '반팔'], ['puff', '퍼프'], ['long', '긴팔']]));
                    if (t === 'bottom' || (t === 'dress' && DR.doll.dress !== 'hanbok')) h += grp('길이', rangeD(`cloth.${t}.len`, 0, 1, 0.05, 'len'));
                    break;
                }
                case 'acc':
                    h += grp('소품 (여러 개 가능)', togglesD([['acc.bow', '🎀 리본'], ['acc.headband', '머리띠'], ['acc.crown', '👑 왕관'], ['acc.beret', '베레모'], ['acc.flower', '🌼 꽃핀'], ['acc.glasses', '👓 안경'], ['acc.tie', '👔 넥타이']]));
                    h += grp('소품 색 (리본·머리끈·넥타이·옷고름)', colorsD('accColor', CLOTH_SW.concat(['#ffd54f'])));
                    break;
                case 'done': h += donePanel(); break;
            }
            P.innerHTML = h;
            if (st.id === 'done') afterDonePanel();
        }

        /* ---------- 어려움 패널 ---------- */
        function hardPanel(st) {
            const parts = DOLL_PARTS[st.id] || [];
            let h = '';
            h += grp('그릴 부품 (누르면 추천 도구·색으로 바뀌어요)', `<div class="chips">${parts.map(p => `<button type="button" class="chip${DR.part === p[0] ? ' on' : ''}" data-dpart="${p[0]}">${p[0]}</button>`).join('')}</div>`,
                st.id === 'hair' ? '뒷머리는 몸 뒤쪽, 나머지는 얼굴 위쪽에 그려져요.' : st.id === 'face' ? '흰자 → 눈동자 → 동공 → 반짝이 순서로 겹쳐 그리면 예쁜 눈이 돼요.' : '');
            h += grp('도구', `<div class="chips">${[['pen', '✏️ 펜 (점 찍기)'], ['brush', '🖌 붓'], ['select', '👆 고르기·고치기']].map(([k, l]) => `<button type="button" class="chip${DR.tool === k ? ' on' : ''}" data-dtool="${k}">${l}</button>`).join('')}</div>`);
            h += grp('색', `<div class="swatches">${DOLL_SWATCH.map(c => `<button type="button" class="sw${DR.color === c ? ' on' : ''}" style="background:${c}" data-dcolorset="${c}" aria-label="${c}"></button>`).join('')}<input type="color" id="drColorIn" value="${DR.color}" data-dcolorpick="1"></div>`);
            h += grp('선 · 붓 굵기', `<div class="range"><input type="range" id="drW" min="0.5" max="24" step="0.5" value="${DR.w}" data-dopt="w"><span>${DR.w}</span></div>`);
            h += grp('진하기', `<div class="range"><input type="range" id="drOp" min="0.1" max="1" step="0.05" value="${DR.op}" data-dopt="op"><span>${Math.round(DR.op * 100)}%</span></div>`);
            h += grp('채운 조각 테두리 · 무늬', `<div class="chips"><button type="button" class="chip${DR.outline === 'auto' ? ' on' : ''}" data-doutline="auto">테두리 있음</button><button type="button" class="chip${DR.outline === 'none' ? ' on' : ''}" data-doutline="none">테두리 없음</button></div>
                <div class="chips" style="margin-top:6px">${DOLL_PATS.map(p => `<button type="button" class="chip${DR.pat === p ? ' on' : ''}" data-dpat="${p}">${{ none: '민무늬', diag: '사선', stripe: '가로줄', dot: '도트', check: '체크', heart: '하트', flower: '꽃', star: '별' }[p]}</button>`).join('')}</div>
                <div class="swatches" style="margin-top:6px"><span class="dr-note" style="margin:0 4px 0 0">무늬 색</span>${['#ffffff', '#ff6b8f', '#ffe08a', '#b9dcff', '#3b3b55'].map(c => `<button type="button" class="sw${DR.patColor === c ? ' on' : ''}" style="background:${c}" data-dpatcolor="${c}" aria-label="${c}"></button>`).join('')}</div>`);
            h += grp('도우미', `<div class="chips"><button type="button" class="chip${DR.mirror ? ' on' : ''}" data-dmirror="1">↔ 좌우 대칭 그리기</button>
                <button type="button" class="chip" data-daction="undo">↩ 되돌리기</button><button type="button" class="chip" data-daction="redo">↪ 다시</button>
                ${DR.drawing && DR.drawing.kind !== 'brush' ? '<button type="button" class="chip" data-daction="line">✔ 선으로 끝내기</button><button type="button" class="chip" data-daction="cancel">✖ 그리던 것 취소</button>' : ''}</div>`);
            const L = DR.sel >= 0 ? DR.doll.layers[DR.sel] : null;
            if (L) {
                h += grp(`고른 조각: ${L.name || '이름 없음'} (${{ poly: '채운 조각', line: '선', brush: '붓' }[L.kind]})`,
                    `<div class="chips"><button type="button" class="chip" data-dlayer="up">⬆ 앞으로</button><button type="button" class="chip" data-dlayer="down">⬇ 뒤로</button>
                    <button type="button" class="chip" data-dlayer="dup">📄 복제</button><button type="button" class="chip" data-dlayer="mirror">↔ 반대쪽에 복사</button>
                    <button type="button" class="chip" data-dlayer="hide">${L.hidden ? '👁 보이기' : '🙈 숨기기'}</button><button type="button" class="chip" data-dlayer="del">🗑 지우기</button></div>`,
                    '위의 색·진하기·무늬를 누르면 고른 조각에도 바로 적용돼요.');
            }
            /* 이 단계에서 그린 조각 목록 */
            const slots = st.id === 'hair' ? ['back', 'hair'] : [st.slot];
            const mine = DR.doll.layers.map((Lx, i) => [Lx, i]).filter(([Lx]) => slots.includes(Lx.slot));
            h += grp(`이 단계 조각 (${mine.length})`, mine.length
                ? `<div class="dr-layers">${mine.slice().reverse().map(([Lx, i]) => `<button type="button" class="dr-layer${i === DR.sel ? ' on' : ''}" data-dselect="${i}"><i style="background:${Lx.kind === 'poly' ? Lx.fill : Lx.stroke}"></i>${Lx.name || '조각'} <small>${Lx.pts.length}점${Lx.hidden ? ' · 숨김' : ''}</small></button>`).join('')}</div>`
                : '<p class="dr-note">아직 그린 조각이 없어요. 부품을 고르고 펜으로 점을 찍어 보세요!</p>');
            return h;
        }

        /* ---------- ⑧ 완성 ---------- */
        function donePanel() {
            const d = DR.doll, c = dollCounts(d);
            let nick = d.by;
            if (!nick) { try { nick = localStorage.getItem('malang_pattern_nick') || ''; } catch (e) {} }
            return `<p class="dr-intro">🎉 인형이 완성됐어요! 이름을 지어 주고 저장하거나 일기에 붙여 보세요.</p>
                <div class="dr-group"><h4>인형 이름 <small class="dr-note" id="drFileName"></small></h4><input type="text" id="drName" class="btn dr-text" maxlength="12" value="${dollText(d.name, 12)}" placeholder="예) 로라"></div>
                <div class="dr-group"><h4>만든 사람 (닉네임)</h4><input type="text" id="drBy" class="btn dr-text" maxlength="12" value="${dollText(nick, 12)}" placeholder="카페 닉네임"></div>
                <div class="dr-group"><h4>제작 기록</h4><p class="dr-record">${c.pieces ? '🔥 어려움' : '😊 쉬움'} · ⏱ ${dollTimeText(d.stats.ms)} · 🧩 조각 ${c.pieces}개 · 📍 점 ${c.pts.toLocaleString()}개</p></div>
                <div class="dr-done-btns">
                    <button type="button" class="btn btn-primary" data-ddone="attach">${DR.attachEl ? '📔 일기의 이 인형 바꾸기' : '📔 일기에 붙이기'}</button>
                    <button type="button" class="btn" data-ddone="save">💾 내 인형에 저장</button>
                    <button type="button" class="btn" data-ddone="photo">📷 사진으로 저장</button>
                    <button type="button" class="btn" data-ddone="file">💾 인형 파일로 저장</button>
                    <button type="button" class="btn" data-ddone="replay">▶ 만드는 과정 다시보기</button>
                </div>
                <label class="dr-check"><input type="checkbox" id="drClear"> 사진을 인형만 투명 배경으로 저장</label>
                <div class="dr-group"><h4>자랑 카드 미리보기 (카페에 올리기 좋아요)</h4><img id="drCard" class="dr-card" alt="자랑 카드 미리보기"></div>`;
        }
        function afterDonePanel() {
            const fileHint = () => {
                const nm = dollText(document.getElementById('drName').value, 12);
                document.getElementById('drFileName').textContent = nm ? `→ ${dollUseDrive() ? dollFolderText() + ' / ' : ''}${dollFileName(nm)}` : '(이름이 파일 이름이 돼요)';
            };
            const sync = () => {
                fileHint();
                DR.doll.name = dollText(document.getElementById('drName').value, 12);
                DR.doll.by = dollText(document.getElementById('drBy').value, 12);
                dollChanged();
                clearTimeout(DR.cardT); DR.cardT = setTimeout(refreshCard, 300);
            };
            document.getElementById('drName').addEventListener('input', sync);
            document.getElementById('drBy').addEventListener('input', sync);
            DR.doll.by = dollText(document.getElementById('drBy').value, 12);
            fileHint();
            refreshCard();
        }
        async function refreshCard() {
            const img = document.getElementById('drCard');
            if (!img) return;
            try { const blob = await dollCardBlob(DR.doll, false); img.src = URL.createObjectURL(blob); } catch (e) { img.alt = '미리보기를 만들지 못했어요'; }
        }

        /* =====================================================================
           📷 자랑 카드 · 💾 파일 · 📂 불러오기
           ===================================================================== */
        function loadImg(src) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; }); }
        async function dollCardBlob(D, clear) {
            if (clear) {
                const img = await loadImg(dollDataUrl(D, { bg: false, crop: true }));
                const k = 3, c = document.createElement('canvas');
                c.width = img.naturalWidth ? img.naturalWidth * k : 720; c.height = img.naturalHeight ? img.naturalHeight * k : 1100;
                c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
                return await new Promise(r => c.toBlob(r, 'image/png'));
            }
            const img = await loadImg(dollDataUrl(D, { bg: true, pfx: 'cd' }));
            const W = 600, H = 1110, c = document.createElement('canvas');
            c.width = W; c.height = H;
            const x = c.getContext('2d');
            x.fillStyle = '#fff7f9'; x.fillRect(0, 0, W, H);
            x.save(); x.beginPath(); x.roundRect ? x.roundRect(20, 20, 560, 877, 28) : x.rect(20, 20, 560, 877); x.clip();
            x.drawImage(img, 20, 20, 560, 877); x.restore();
            x.strokeStyle = '#f4cdd6'; x.lineWidth = 6; x.beginPath(); x.roundRect ? x.roundRect(20, 20, 560, 877, 28) : x.rect(20, 20, 560, 877); x.stroke();
            const font = '"Jua","Gowun Dodum","Apple SD Gothic Neo","Malgun Gothic",sans-serif';
            const c2 = dollCounts(D);
            x.textAlign = 'center';
            x.fillStyle = '#f0688a'; x.font = `40px ${font}`;
            x.fillText('🎀 ' + (D.name || '나의 인형') + (D.by ? '  ·  만든이 ' + D.by : ''), W / 2, 960);
            x.fillStyle = '#7a5a62'; x.font = `24px ${font}`;
            x.fillText(`${c2.pieces ? '🔥 어려움' : '😊 쉬움'} · 제작 ${dollTimeText(D.stats.ms)}` + (c2.pieces ? ` · 조각 ${c2.pieces}개 · 점 ${c2.pts.toLocaleString()}개` : ''), W / 2, 1006);
            x.fillStyle = '#c9a4ad'; x.font = `22px ${font}`;
            x.fillText('말랑달콤 다이어리 · 👧 인형방', W / 2, 1070);
            return await new Promise(r => c.toBlob(r, 'image/png'));
        }
        function dollStamp() { const d = new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}`; }
        function downloadBlob(blob, name) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = name;
            document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
        }
        async function dollSavePhoto() {
            try {
                const clear = document.getElementById('drClear') && document.getElementById('drClear').checked;
                downloadBlob(await dollCardBlob(DR.doll, clear), `malang_doll_${dollStamp()}.png`);
                toast('📷 사진으로 저장했어요. 카페 인형 자랑 게시판에 올려 보세요!');
            } catch (e) { showMsg('사진을 만들지 못했어요.<br>잠시 후 다시 시도해 주세요.'); }
        }
        function dollSaveFile() {
            const d = sanitizeDoll(DR.doll);
            if (!d) { showMsg('⚠ 인형이 너무 커서 파일로 저장할 수 없어요.'); return; }
            downloadBlob(new Blob([JSON.stringify({ malang_doll: 1, name: d.name, by: d.by, doll: d })], { type: 'text/plain;charset=utf-8' }), `malang_doll_${dollStamp()}.malang.txt`);
            toast('💾 인형 파일을 저장했어요. 카페에 첨부하면 다른 사람이 불러올 수 있어요!');
        }
        function importDollFile(e) {
            const f = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > DOLL_MAX_JSON + 2000) { showMsg('인형 파일이 너무 커요.'); return; }
            f.text().then(async txt => {
                const m = String(txt).match(/\{[\s\S]*\}/);
                let d = null;
                try { const o = JSON.parse(m ? m[0] : txt); d = sanitizeDoll(o && o.doll ? o.doll : o); } catch (err) { d = null; }
                if (!d) { showMsg('⚠ 인형 파일이 아니거나 깨진 파일이에요.'); return; }
                if (!d.name) d.name = '불러온 인형';
                try {
                    const r = await saveDoll(d, null);
                    if (r) { renderDollPicker(); toast(`📂 '${r.doll.name}' 인형을 불러왔어요`); }
                } catch (err) { showMsg('⚠ 인형을 저장하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
            });
        }

        /* ---------- ▶ 만드는 과정 다시보기 ---------- */
        function dollReplayFrames(D) {
            const base = dollNewMannequin();
            ['gender', 'body', 'height', 'head', 'face', 'bg'].forEach(k => { base[k] = D[k]; });
            const frames = [dollClone(base)];
            const step = keys => { const f = dollClone(frames[frames.length - 1]); keys.forEach(k => { f[k] = dollClone(D[k]); }); frames.push(f); };
            step(['skin']);
            step(['eyes', 'eyeColor', 'eyeSize', 'eyeGap', 'brows', 'nose', 'mouth']);
            step(['hairBack', 'hairFront', 'hairColor']);
            step(['blushStyle', 'blush', 'blushA', 'lip', 'lipA', 'shadow', 'shadowA', 'lashes', 'freckles']);
            step(['top', 'bottom', 'dress', 'shoes', 'cloth']);
            step(['acc', 'accColor']);
            const last = frames[frames.length - 1];
            last.layers = D.layers; last.flip = D.flip;
            return { frames, layerCount: D.layers.length };
        }
        function startDollReplay() {
            stopDollReplay();
            const { frames, layerCount } = dollReplayFrames(DR.doll);
            const host = document.getElementById('drDoll');
            const total = frames.length - 1 + layerCount;
            let i = 0;
            const per = layerCount ? Math.max(40, Math.min(160, 6000 / layerCount)) : 0;
            const tick = () => {
                if (!DR.replay) return;
                const fi = Math.min(i, frames.length - 1), up = Math.max(0, i - (frames.length - 1));
                host.innerHTML = dollSVG(frames[fi], { bg: true, pfx: 'rp', upto: fi === frames.length - 1 ? up : 0 });
                document.getElementById('drHint').textContent = `▶ 다시보기 ${Math.round((i / Math.max(1, total)) * 100)}%`;
                if (i >= total) { DR.replay = setTimeout(() => { stopDollReplay(); renderDollRoom(); }, 1200); return; }
                i++;
                DR.replay = setTimeout(tick, i < frames.length ? 550 : per);
            };
            DR.replay = 1; tick();
        }
        function stopDollReplay() { if (DR.replay) { clearTimeout(DR.replay); DR.replay = null; } }

        /* =====================================================================
           🖱 패널 이벤트 (한 곳에서)
           ===================================================================== */
        document.addEventListener('click', e => {
            const room = document.getElementById('dollRoom');
            if (!room || room.style.display !== 'flex' || !room.contains(e.target)) return;
            const b = e.target.closest('button');
            if (!b) return;
            const ds = b.dataset;
            dollActive();
            if (ds.dset) { dSet(ds.dset, ds.val); return; }
            if (ds.dtoggle) { dSet(ds.dtoggle, !dGet(ds.dtoggle)); return; }
            if (ds.ctarget) { DR.clothTarget = ds.ctarget; renderDollPanel(); return; }
            if (ds.dmode) {
                DR.mode[DOLL_STEPS[DR.step].id] = ds.dmode; DR.sel = -1; DR.drawing = null;
                if (ds.dmode === 'hard' && !DR.part) { const p = (DOLL_PARTS[DOLL_STEPS[DR.step].id] || [])[0]; if (p) pickPart(p[0]); }
                if (ds.dmode === 'hard' && DR.zoom === 1 && ['face', 'makeup'].includes(DOLL_STEPS[DR.step].id)) { DR.zoom = 2; applyDollZoom(); }
                renderDollRoom(); return;
            }
            if (ds.dpart) { pickPart(ds.dpart); renderDollRoom(); return; }
            if (ds.dtool) { if (DR.drawing) finishDrawing(false); DR.tool = ds.dtool; renderDollRoom(); return; }
            if (ds.dcolorset) { DR.color = ds.dcolorset; applyToSelected('color', DR.color); renderDollPanel(); return; }
            if (ds.doutline) { DR.outline = ds.doutline; if (DR.sel >= 0 && DR.doll.layers[DR.sel].kind === 'poly') { const L = DR.doll.layers[DR.sel]; dollPush(); L.w = ds.doutline === 'auto' ? 1.8 : 0.5; L.stroke = ds.doutline === 'auto' ? dDark(L.fill, 0.38) : L.fill; dollChanged(); renderDollStage(); } renderDollPanel(); return; }
            if (ds.dpat) { DR.pat = ds.dpat; if (DR.sel >= 0 && DR.doll.layers[DR.sel].kind === 'poly') applyToSelected('pat', DR.pat); renderDollPanel(); return; }
            if (ds.dpatcolor) { DR.patColor = ds.dpatcolor; if (DR.sel >= 0) applyToSelected('patColor', DR.patColor); renderDollPanel(); return; }
            if (ds.dmirror) { DR.mirror = !DR.mirror; renderDollRoom(); return; }
            if (ds.daction === 'undo') { dollUndo(); return; }
            if (ds.daction === 'redo') { dollRedo(); return; }
            if (ds.daction === 'line') { finishDrawing(true); return; }
            if (ds.daction === 'cancel') { DR.drawing = null; renderDollRoom(); return; }
            if (ds.dlayer) { dollLayerAction(ds.dlayer); return; }
            if (ds.dselect) { DR.sel = +ds.dselect; DR.tool = 'select'; renderDollRoom(); return; }
            if (ds.ddone === 'save') { dollSaveToList(true); return; }
            if (ds.ddone === 'photo') { dollSavePhoto(); return; }
            if (ds.ddone === 'file') { dollSaveFile(); return; }
            if (ds.ddone === 'replay') { startDollReplay(); return; }
            if (ds.ddone === 'attach') { dollAttachFromRoom(); return; }
        });
        async function dollAttachFromRoom() {
            if (!(await dollSaveToList(false))) return;
            const d = sanitizeDoll(DR.doll);
            if (DR.attachEl && document.body.contains(DR.attachEl)) { setPlacedDoll(DR.attachEl, d); toast('📔 일기의 인형을 바꿨어요'); }
            else if (!attachDollToPage(d)) return;
            document.getElementById('dollRoom').style.display = 'none';
            DR.attachEl = null;
        }
        function pickPart(name) {
            DR.part = name;
            const p = curPart();
            if (!p) return;
            DR.tool = p[2] === 'brush' ? 'brush' : 'pen';
            DR.color = typeof p[3] === 'function' ? p[3](DR.doll) : p[3];
            if (p[2] === 'line') DR.w = name === '하이라이트' ? 3 : 2.2;
            if (p[2] === 'brush') { DR.w = name === '볼터치' ? 12 : name === '점·주근깨' ? 2.5 : 8; DR.op = name === '점·주근깨' ? 0.7 : 0.45; }
            else DR.op = name === '반짝이' ? 0.95 : 1;
        }
        document.addEventListener('input', e => {
            const t = e.target, room = document.getElementById('dollRoom');
            if (!room || !room.contains(t)) return;
            dollActive();
            if (t.dataset.drange) {
                const ks = t.dataset.drange.split('.'), last = ks.pop();
                ks.reduce((o, k) => o[k], DR.doll)[last] = parseFloat(t.value);
                t.parentElement.querySelector('span').textContent = fmtVal(t.dataset.fmt, t.value);
                dollChanged(); renderDollStage();
            }
            if (t.dataset.dcolor) { const ks = t.dataset.dcolor.split('.'), last = ks.pop(); ks.reduce((o, k) => o[k], DR.doll)[last] = t.value; dollChanged(); renderDollStage(); }
            if (t.dataset.dcolorpick) { DR.color = t.value; if (DR.sel >= 0) { const L = DR.doll.layers[DR.sel]; L.fill = t.value; L.stroke = L.kind === 'poly' ? (L.w <= 0.5 ? t.value : dDark(t.value, 0.38)) : t.value; dollChanged(); renderDollStage(); } }
            if (t.dataset.dopt) {
                DR[t.dataset.dopt] = parseFloat(t.value);
                t.parentElement.querySelector('span').textContent = t.dataset.dopt === 'op' ? Math.round(t.value * 100) + '%' : t.value;
                if (DR.sel >= 0) { const L = DR.doll.layers[DR.sel]; if (t.dataset.dopt === 'op' || L.kind !== 'poly') { L[t.dataset.dopt] = parseFloat(t.value); dollChanged(); renderDollStage(); } }
            }
        });
        document.addEventListener('change', e => {
            const t = e.target, room = document.getElementById('dollRoom');
            if (!room || !room.contains(t)) return;
            if (t.dataset.dcolor) renderDollPanel();
            if (t.dataset.dcolorpick) renderDollPanel();
        });

        /* =====================================================================
           📔 일기 페이지와 연결
           ===================================================================== */
        function attachDollToPage(d) {
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">표지를 넘긴 뒤 다시 붙여 주세요. 인형은 내 인형들에 저장되어 있어요.</span>'); return false; }
            const el = createElementFromData({ type: 'doll', content: d, width: '130px', posX: 90, posY: 60, scale: 1, rotation: 0, zIndex: zIndexCounter }, true);
            document.getElementById('canvasArea').appendChild(el);
            selectElement(el);
            saveData(false);
            toast('📔 일기에 인형을 붙였어요! 두 번 누르면 표정을 바꿀 수 있어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
            return true;
        }

        function setPlacedDoll(el, d) {
            el.dataset.doll = JSON.stringify(d);
            const img = el.querySelector('img');
            if (img) img.src = dollDataUrl(d, { bg: false, crop: true });
            saveData(false);
        }

        /* 일기 페이지에 붙은 인형 만들기 (elements.js 의 createElementFromData 에서 사용) */
        function buildPlacedDoll(el, content, interactive) {
            const d = sanitizeDoll(content);
            if (!d) {
                const span = document.createElement('span');
                span.style.cssText = 'font-size:45px; display:inline-block;';
                span.textContent = '👧';
                el.appendChild(span);
                return;
            }
            el.dataset.doll = JSON.stringify(d);
            const img = document.createElement('img');
            img.alt = d.name || '인형';
            img.src = dollDataUrl(d, { bg: false, crop: true });
            el.appendChild(img);
            if (!el.style.width) el.style.width = '130px';
            if (interactive) {
                el.addEventListener('dblclick', () => openDollQuick(el));
                let lastTap = 0;
                el.addEventListener('touchend', () => { const now = Date.now(); if (now - lastTap < 320) openDollQuick(el); lastTap = now; });
            }
        }

        /* ---------- 두 번 눌러 바로 고치기 ---------- */
        let quickEl = null;
        function openDollQuick(el) {
            ensureDollUI();
            if (document.getElementById('dollQuick').style.display === 'flex') return;
            quickEl = el;
            renderDollQuick();
            openModal('dollQuick');
        }
        function quickDoll() { try { return sanitizeDoll(JSON.parse(quickEl.dataset.doll)); } catch (e) { return null; } }
        function renderDollQuick() {
            const d = quickDoll();
            if (!d) return;
            const ch = (key, opts) => `<div class="chips">${opts.map(([v, l]) => `<button type="button" class="chip${d[key] === v ? ' on' : ''}" data-qk="${key}" data-qv="${v}">${l}</button>`).join('')}</div>`;
            document.getElementById('dollQuickBody').innerHTML =
                `<img class="dq-preview" alt="인형 미리보기" src="${dollDataUrl(d, { bg: true, pfx: 'qk' })}">` +
                grp('눈', ch('eyes', [['sparkle', '반짝'], ['smile', '웃음'], ['cat', '고양이'], ['sleepy', '졸림'], ['heart', '하트']])) +
                grp('입', ch('mouth', [['smile', '스마일'], ['open', '활짝'], ['cat', '고양이'], ['o', '오!'], ['pout', '뽀뽀']])) +
                grp('눈썹', ch('brows', [['arc', '둥근'], ['flat', '일자'], ['worried', '시무룩'], ['strong', '씩씩']])) +
                grp('그 밖에', `<div class="chips"><button type="button" class="chip${d.blushA > 0 ? ' on' : ''}" data-qblush="1">볼터치</button><button type="button" class="chip${d.flip ? ' on' : ''}" data-qflip="1">↔ 좌우 반전</button></div>`) +
                (d.layers.some(L => L.slot === 'face') ? '<p class="dr-note">직접 그린 얼굴 조각은 그대로 있고, 고른 표정이 함께 보여요.</p>' : '');
        }
        document.addEventListener('click', e => {
            const q = document.getElementById('dollQuick');
            if (!q || q.style.display !== 'flex' || !q.contains(e.target) || !quickEl) return;
            const b = e.target.closest('button');
            if (!b) return;
            const d = quickDoll();
            if (!d) return;
            if (b.dataset.qk) d[b.dataset.qk] = b.dataset.qv;
            else if (b.dataset.qblush) d.blushA = d.blushA > 0 ? 0 : 0.55;
            else if (b.dataset.qflip) d.flip = !d.flip;
            else return;
            setPlacedDoll(quickEl, d);
            renderDollQuick();
        });
        function dollQuickToRoom() {
            const d = quickDoll();
            closeModal('dollQuick');
            if (!d) return;
            openDollRoom(null, d, 7);
            DR.attachEl = quickEl;
            DR.dirty = false;
            renderDollPanel();
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['doll-room'] = true;
