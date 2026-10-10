/* 말랑달콤 다이어리 - js/doll-room.js
   👧 인형방 : 맨몸 인형에서 시작해 단계별로 인형 만들기 (쉬움 · 어려움)
   - ① 피부 → ② 눈·코·입 → ③ 헤어 → ④ 화장 → ⑤ 옷 → ⑥ 옷 꾸미기 → ⑦ 소품 → ⑧ 완성 (맨몸 인형에서 시작)
   - 쉬움 : 고르기 + 인형 위에서 직접 만지기 / 어려움 : 펜(점 찍어 잇기 → 닫으면 색 채우기)·붓·고르기 도구로 조각을 하나씩 직접 그리기
       💇 미용실(③) : 가위로 자르기 · 끌어서 기르기 · 빗질 · 염색 붓 · 끝 물들이기
       ✂️ 재단(⑤) : 인형 위 동그라미 손잡이를 끌어 기장 · 퍼짐 · 소매 길이 바꾸기
       🖌️ 옷 꾸미기(⑥) : 붓 · 도장(옷 안에만 칠해져요) · 단추 · 와펜 · 레이스 붙이기
   - 내 인형들 : 인형마다 파일 1개 → 구글 드라이브 '말랑달콤 / 인형 / 인형이름.json' (js/doll-store.js, 개수 제한 없음)
   - 만드는 중인 인형은 이 기기에 자동 임시 저장 (창을 닫아도 이어서 만들기)
   - 📷 사진으로 저장(자랑 카드 PNG) · 💾 인형 파일로 저장(.malang.txt) · 📂 인형 불러오기 · 📔 일기에 붙이기
   - 일기에 붙인 인형은 페이지 요소 {"t":"d","c":{인형 데이터}} 로 저장되고, 두 번 누르면 표정·옷을 바로 고칠 수 있어요
   ※ 파일 불러오는 순서: … → pattern-maker → doll-render → doll-store → doll-room → doll-move → service */

        const DOLL_DRAFT_KEY = 'malang_doll_draft';

        /* =====================================================================
           🧸 인형방 상태
           ===================================================================== */
        const DR = {
            doll: null, editId: null, step: 0, mode: {}, dirty: false, saving: false,
            tool: 'pen', part: null, drawing: null, pressed: null, hover: null, sel: -1, drag: null,
            color: '#ff9fb6', outline: 'auto', w: 3, op: 1, pat: 'none', patColor: '#ffffff', mirror: false,
            zoom: 1, history: [], future: [], lastAct: 0, attachEl: null, replay: null, clothTarget: 'top',
            salon: null, hcolor: '#f5a3c0', hw: 10,                                          // 💇 미용실 도구
            react: false,                                                                    // 💕 콕 누른 반응 중
            deco: 'brush', pcolor: '#ff6b8f', pw: 5, stamp: 'heart', ps: 1.2, patchKind: 'button', psel: -1,   // 🖌️ 옷 꾸미기 도구
            touch: null                                                                      // 손잡이 · 미용실 · 꾸미기 끌기 중
        };

        const DOLL_STEPS = [
            { id: 'skin',   label: '① 피부' },
            { id: 'face',   label: '② 눈·코·입', hard: true, slot: 'face' },
            { id: 'hair',   label: '③ 헤어',     hard: true, slot: 'hair' },
            { id: 'makeup', label: '④ 화장',     hard: true, slot: 'face' },
            { id: 'cloth',  label: '⑤ 옷',       hard: true, slot: 'cloth' },
            { id: 'deco',   label: '⑥ 옷 꾸미기' },
            { id: 'acc',    label: '⑦ 소품',     hard: true, slot: 'top' },
            { id: 'done',   label: '⑧ 완성' }
        ];
        const DOLL_LAST = DOLL_STEPS.length - 1;
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
        const SKIN_SW = ['#fdead9', '#fff0e6', '#ffe2d2', '#f6cfb5', '#e8b48f', '#c98d66', '#9c6646'];
        const HAIR_SW = ['#2e221f', '#7a4b3a', '#c48a55', '#f2d27a', '#f5a3c0', '#a7c7ff', '#b49cff', '#e8e4f0'];
        const EYE_SW = ['#8c564c', '#2e221f', '#4a8bd6', '#3fa37a', '#9b6bd6', '#e0557a'];
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
            setupEasyTouch();
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
            if (!list.length) { grid.innerHTML = '<div class="doll-empty">아직 만든 인형이 없어요.<br>✏️ 새 인형 만들기를 눌러 맨몸 인형부터 시작해 보세요!</div>'; return; }
            list.forEach((ent, i) => {
                const d = ent.doll;
                const card = document.createElement('div');
                card.className = 'doll-card';
                const img = document.createElement('img');
                img.alt = d.name || '인형'; img.src = dollDataUrl(d, { bg: true, pfx: 'pk' + i, live: true });
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
            DR.step = step != null ? Math.max(0, Math.min(DOLL_LAST, step)) : (ent ? DOLL_LAST : 0);
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
                DR.step = DOLL_LAST; renderDollRoom();
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
        /* 되돌리기 : 인형 전체(제작 기록 빼고)를 찍어 둬요 */
        const dollSnap = () => JSON.stringify(Object.assign({}, DR.doll, { stats: undefined }));
        function dollRestore(t) { const o = JSON.parse(t); Object.keys(o).forEach(k => { DR.doll[k] = o[k]; }); DR.sel = -1; DR.psel = -1; dollChanged(); renderDollRoom(); }
        function dollPush() { DR.history.push(dollSnap()); if (DR.history.length > 80) DR.history.shift(); DR.future = []; }
        function dollUndo() {
            if (DR.drawing) { DR.drawing.pts.pop(); if (!DR.drawing.pts.length) DR.drawing = null; drawOverlay(); return; }
            if (!DR.history.length) return;
            DR.future.push(dollSnap());
            dollRestore(DR.history.pop());
        }
        function dollRedo() {
            if (!DR.future.length) return;
            DR.history.push(dollSnap());
            dollRestore(DR.future.pop());
        }

        /* =====================================================================
           🖼 그리기 (인형 + 도구 미리보기)
           ===================================================================== */
        function renderDollStage() {
            const host = document.getElementById('drDoll');
            const still = isHardStep() || easyTouch() || !!DR.touch || !!DR.drag;          // 만지는 중엔 가만히
            const D = DR.react ? Object.assign({}, DR.doll, { eyes: 'smile', mouth: 'open' }) : DR.doll;
            host.innerHTML = dollSVG(D, { bg: true, pfx: 'rm', attrs: 'id="drSvg"', live: !still, hop: DR.react });
            const svg = document.getElementById('drSvg');
            svg.classList.toggle('pick', isHardStep() && DR.tool === 'select');
            drawOverlay();
        }

        function renderDollRoom() {
            const st = DOLL_STEPS[DR.step];
            document.getElementById('drSteps').innerHTML = DOLL_STEPS.map((s, i) => `<button type="button" class="dr-step${i === DR.step ? ' on' : ''}${i < DR.step ? ' passed' : ''}" onclick="dollGoStep(${i - DR.step})">${s.label}</button>`).join('');
            document.getElementById('drPrev').disabled = DR.step === 0;
            const next = document.getElementById('drNext');
            next.style.display = DR.step === DOLL_LAST ? 'none' : '';
            next.textContent = DR.step === DOLL_LAST - 1 ? '완성하기 ▶' : '다음 단계 ▶';
            const c = dollCounts(DR.doll);
            document.getElementById('drStats').textContent = `⏱ ${dollTimeText(DR.doll.stats.ms)} · 🧩 조각 ${c.pieces} · 📍 점 ${c.pts}${c.pieces ? ' · 🔥 어려움' : ''}`;
            document.getElementById('drHint').textContent = isHardStep() ? hardHint() : easyHint();
            document.getElementById('drOverlay').style.pointerEvents = (isHardStep() && DR.tool !== 'select') || easyTouch() ? 'auto' : 'none';
            renderDollStage();
            renderDollPanel();
        }

        function dollGoStep(delta) {
            stopDollReplay();
            if (DR.drawing) finishDrawing(false);
            DR.step = Math.max(0, Math.min(DOLL_LAST, DR.step + delta));
            DR.sel = -1; DR.part = null; DR.psel = -1; DR.salon = null;
            dollChanged();
            renderDollRoom();
        }
        const isHardStep = () => { const s = DOLL_STEPS[DR.step]; return !!(s.hard && DR.mode[s.id] === 'hard'); };
        /* 쉬움에서 인형을 직접 만지는 단계 (💇 미용실 도구를 골랐을 때 · 🖌️ 옷 꾸미기) */
        const easyTouch = () => !isHardStep() && !DR.replay && ((DOLL_STEPS[DR.step].id === 'hair' && !!DR.salon) || DOLL_STEPS[DR.step].id === 'deco');
        function easyHint() {
            const id = DOLL_STEPS[DR.step].id;
            if (id === 'cloth') return '✂️ 인형 위 동그라미를 끌면 기장 · 퍼짐 · 소매가 바뀌어요';
            if (id === 'hair') return ({ cut: '✂️ 머리 위를 가로로 쓱 그으면 거기서 싹둑!', grow: '🌱 머리 끝을 아래로 끌면 길어져요', comb: '🪮 좌우로 끌어 머리를 넘겨요', dye: '🎨 머리 위에 칠하면 그 부분만 물들어요' })[DR.salon] || '';
            if (id === 'deco') return ({ brush: '🖌️ 옷 위에 칠해요 (옷 밖은 안 칠해져요)', stamp: '🔖 옷 위를 콩 누르면 도장이 찍혀요', patch: '🧷 누르면 붙고, 붙인 걸 끌면 옮겨져요', erase: '🧽 문지르면 칠한 것 · 붙인 것이 지워져요' })[DR.deco] || '';
            return '';
        }
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
            if (!isHardStep()) h += easyOverlay(k);
            ov.innerHTML = h;
        }
        const mirrorPt = p => p.length >= 4 ? [300 - p[0], p[1], 300 - p[2], p[3]] : [300 - p[0], p[1]];

        /* =====================================================================
           ✋ 쉬움 : 인형 위에서 직접 만지기 (✂️ 재단 · 💇 미용실 · 🖌️ 옷 꾸미기)
           - 화면 점(300 × 470)과 바탕 그림 칸(853 × 1844)을 오가요 · 좌우 뒤집은 인형도 같은 자리에 들어가게
           ===================================================================== */
        const toArt = p => [(p[0] - DOLL_ART_X) / DOLL_ART_K, p[1] / DOLL_ART_K];
        const fromArt = p => [Math.round((DOLL_ART_X + p[0] * DOLL_ART_K) * 10) / 10, Math.round(p[1] * DOLL_ART_K * 10) / 10];
        const unflip = p => DR.doll.flip ? [300 - p[0], p[1]] : p;
        const dClamp = (v, a, b) => Math.max(a, Math.min(b, v));
        const SLEEVE_LEN = { short: 0.42, puff: 0.36, long: 0.78 };

        /* ✂️ 재단 손잡이 : [{ tl: len|fl|sl, part, p(바탕 그림 칸), icon }] */
        function tailorHandles() {
            const D = DR.doll, out = [];
            const sk = (part, o) => {
                const c = D.cloth[part], hem = o.base + c.len * o.range, r = dTorso(o.wy)[1] + 6;
                out.push({ tl: 'len', part, p: [426, hem], icon: '↕' }, { tl: 'fl', part, p: [r + (hem - o.wy) * o.flare * c.fl, hem], icon: '↔' });
            };
            const sl = part => { const c = D.cloth[part]; if (c.sleeve === 'none') return; const a = dArm(1, c.slen); out.push({ tl: 'sl', part, p: dOff(a.o, a.i, 14), icon: '✂' }); };
            if (D.dress !== 'none') { sk('dress', DOLL_SKIRT[D.dress]); if (D.dress !== 'hanbok') sl('dress'); return out; }
            if (D.top !== 'none') { out.push({ tl: 'len', part: 'top', p: [330, dollTopHem(D.cloth.top.len)], icon: '↕' }); sl('top'); }
            if (D.bottom === 'skirt' || D.bottom === 'suspender') sk('bottom', DOLL_SKIRT.skirt);
            if (D.bottom === 'pants') {
                const c = D.cloth.bottom, hem = dollPantsHem(c.len), lg = dLeg(1, hem);
                out.push({ tl: 'len', part: 'bottom', p: [(lg[0] + lg[1]) / 2, hem], icon: '↕' }, { tl: 'fl', part: 'bottom', p: [lg[1] + 12 + (c.fl - 1) * 90, hem], icon: '↔' });
            }
            return out;
        }
        function tailorSet(h, a) {
            const D = DR.doll, c = D.cloth[h.part], r2 = v => Math.round(v * 100) / 100;
            const o = h.part === 'dress' ? DOLL_SKIRT[D.dress] : DOLL_SKIRT.skirt;
            if (h.tl === 'len') {
                if (h.part === 'top') c.len = r2(dClamp((a[1] - 880) / 220, 0, 1));
                else if (h.part === 'bottom' && D.bottom === 'pants') c.len = r2(dClamp((a[1] - 1180) / 590, 0, 1));
                else c.len = r2(dClamp((a[1] - o.base) / o.range, 0, 1));
            } else if (h.tl === 'fl') {
                if (h.part === 'bottom' && D.bottom === 'pants') c.fl = r2(dClamp(1 + (a[0] - dLeg(1, dollPantsHem(c.len))[1] - 12) / 90, 1, 2.2));
                else { const hem = o.base + c.len * o.range; c.fl = r2(dClamp((a[0] - dTorso(o.wy)[1] - 6) / Math.max(1, hem - o.wy) / o.flare, 0.3, 2.2)); }
            } else {
                let best = c.slen, bd = Infinity;
                for (let t = 0.12; t <= 1.0001; t += 0.02) { const m = dArm(1, t), q = [(m.i[0] + m.o[0]) / 2, (m.i[1] + m.o[1]) / 2], dd = Math.hypot(q[0] - a[0], q[1] - a[1]); if (dd < bd) { bd = dd; best = t; } }
                c.slen = r2(best);
            }
        }
        function easyOverlay(k) {
            const id = DOLL_STEPS[DR.step].id, D = DR.doll;
            let h = '';
            const fl = p => unflip(p);
            if (id === 'cloth') tailorHandles().forEach(t => {
                const [x, y] = fl(fromArt(t.p));
                h += `<g class="dr-handle dr-tailor" data-tl="${t.tl}" data-part="${t.part}"><circle cx="${x}" cy="${y}" r="${8 * k}" fill="#ff6b8f" stroke="#fff" stroke-width="${2 * k}"/>` +
                    `<text x="${x}" y="${y + 3.4 * k}" font-size="${10 * k}" text-anchor="middle" fill="#fff" font-weight="bold" style="pointer-events:none">${t.icon}</text></g>`;
            });
            const T = DR.touch;
            if (T && T.pts && T.pts.length) {
                const pts = T.pts.map(fl);
                if (T.kind === 'cut') h += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="#ff3d7f" stroke-width="${2 * k}" stroke-dasharray="${5 * k} ${3 * k}"/>`;
                if (T.kind === 'paint' || T.kind === 'dye') h += `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${T.c}" stroke-width="${T.w}" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
            }
            if (id === 'deco' && DR.psel >= 0 && D.patch[DR.psel]) {
                const q = D.patch[DR.psel], [x, y] = fl([q.x, q.y]);
                h += `<circle cx="${x}" cy="${y}" r="${13 * q.s}" fill="none" stroke="#3d8bff" stroke-width="${1.4 * k}" stroke-dasharray="${4 * k} ${3 * k}"/>`;
            }
            return h;
        }
        const patchAt = p => { const P = DR.doll.patch; for (let i = P.length - 1; i >= 0; i--) if (Math.hypot(P[i].x - p[0], P[i].y - p[1]) < 11 * P[i].s) return i; return -1; };
        function eraseAt(p) {
            const D = DR.doll, near = q => q.t === 's' ? Math.hypot(q.x - p[0], q.y - p[1]) < 7 * q.s : q.pts.some(r => Math.hypot(r[0] - p[0], r[1] - p[1]) < 6 + q.w / 2);
            const n = D.paint.length + D.patch.length;
            D.paint = D.paint.filter(q => !near(q));
            const i = patchAt(p); if (i >= 0) { D.patch.splice(i, 1); DR.psel = -1; }
            return n !== D.paint.length + D.patch.length;
        }
        /* 💕 인형을 콕 누르면 방긋 웃으며 콩 뛰어요 (만지는 도구를 안 쓸 때) */
        function dollPoke() {
            if (DR.react || DR.replay) return;
            DR.react = true; renderDollStage();
            setTimeout(() => { DR.react = false; if (document.getElementById('dollRoom').style.display === 'flex') renderDollStage(); }, 1200);
        }
        function setupEasyTouch() {
            const ov = document.getElementById('drOverlay');
            document.getElementById('drDoll').addEventListener('click', () => { if (!isHardStep() && !easyTouch()) dollPoke(); });
            let raf = 0;
            const redraw = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; renderDollStage(); }); };
            /* ✂️ 재단 손잡이 */
            ov.addEventListener('pointerdown', e => {
                const g = e.target.closest('.dr-tailor');
                if (!g || isHardStep()) return;
                e.preventDefault(); e.stopPropagation(); dollActive();
                try { ov.setPointerCapture(e.pointerId); } catch (err) {}
                dollPush();
                DR.touch = { kind: 'tailor', h: { tl: g.dataset.tl, part: g.dataset.part }, moved: false };
            }, true);
            ov.addEventListener('pointerdown', e => {
                if (!easyTouch() || DR.touch) return;
                e.preventDefault(); dollActive();
                try { ov.setPointerCapture(e.pointerId); } catch (err) {}
                const p = unflip(svgPoint(e)), id = DOLL_STEPS[DR.step].id, D = DR.doll;
                if (id === 'hair') {
                    if (DR.salon === 'dye') { DR.touch = { kind: 'dye', pts: [p], c: DR.hcolor, w: DR.hw }; drawOverlay(); return; }
                    dollPush();
                    DR.touch = { kind: DR.salon, pts: [p], start: p, sway: D.hairSway, front: toArt(p)[1] < 480 };
                    return;
                }
                if (DR.deco === 'brush') { DR.touch = { kind: 'paint', pts: [p], c: DR.pcolor, w: DR.pw }; drawOverlay(); return; }
                if (DR.deco === 'stamp') { dollPush(); D.paint.push({ t: 's', k: DR.stamp, c: DR.pcolor, x: p[0], y: p[1], s: DR.ps }); DR.touch = { kind: 'tap' }; dollChanged(); renderDollStage(); return; }
                if (DR.deco === 'erase') { dollPush(); DR.touch = { kind: 'erase', hit: eraseAt(p) }; renderDollStage(); return; }
                const i = patchAt(p);
                dollPush();
                if (i < 0) { D.patch.push({ k: DR.patchKind, c: DR.pcolor, x: p[0], y: p[1], s: DR.patchKind === 'button' ? 1.1 : 1.5, r: 0 }); DR.psel = D.patch.length - 1; DR.touch = { kind: 'tap' }; dollChanged(); renderDollRoom(); return; }
                DR.psel = i;
                DR.touch = { kind: 'patch', start: p, orig: [D.patch[i].x, D.patch[i].y], moved: false };
                renderDollRoom();
            });
            ov.addEventListener('pointermove', e => {
                const T = DR.touch; if (!T) return;
                const p = unflip(svgPoint(e)), a = toArt(p), D = DR.doll;
                if (T.kind === 'tailor') { tailorSet(T.h, a); T.moved = true; redraw(); return; }
                if (T.kind === 'patch') { const q = D.patch[DR.psel]; q.x = Math.round((T.orig[0] + p[0] - T.start[0]) * 10) / 10; q.y = Math.round((T.orig[1] + p[1] - T.start[1]) * 10) / 10; T.moved = true; redraw(); return; }
                if (T.kind === 'erase') { if (eraseAt(p)) { T.hit = true; redraw(); } return; }
                if (T.pts) { const l = T.pts[T.pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 1.2 && T.pts.length < DOLL_MAX_PTS) T.pts.push([Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]); }
                if (T.kind === 'grow') {
                    if (T.front) D.bangCut = a[1] > 560 ? 1844 : Math.round(dClamp(a[1], 260, 1844));
                    else if (D.hairBack !== 'none') { D.hairCut = 1844; D.hairGrow = Math.round(dClamp((a[1] - DOLL_HAIR_TOP) / (DOLL_HAIR_END[D.hairBack] - DOLL_HAIR_TOP), 0.5, 2.5) * 100) / 100; }
                    T.moved = true; redraw(); return;
                }
                if (T.kind === 'comb') { D.hairSway = Math.round(dClamp(T.sway + (p[0] - T.start[0]) / 60, -1, 1) * 100) / 100; T.moved = true; redraw(); return; }
                drawOverlay();
            });
            const up = () => {
                const T = DR.touch; if (!T) return;
                DR.touch = null;
                const D = DR.doll;
                if (T.kind === 'paint' || T.kind === 'dye') { dollPush(); (T.kind === 'dye' ? D.hairPaint : D.paint).push({ t: 'b', c: T.c, w: T.w, op: T.kind === 'dye' ? 0.75 : 1, pts: T.pts }); dollChanged(); renderDollRoom(); return; }
                if (T.kind === 'cut') {
                    const xs = T.pts.map(q => q[0]), y = toArt([0, T.pts.reduce((s2, q) => s2 + q[1], 0) / T.pts.length])[1];
                    if (Math.max(...xs) - Math.min(...xs) < 12) { DR.history.pop(); showMsg('✂️ 가위는 머리 위를 <b>가로로 쓱</b> 그어 주세요'); drawOverlay(); return; }
                    if (y < 480 && D.hairFront !== 'none') D.bangCut = Math.round(dClamp(y, 260, 1844));
                    else if (D.hairBack !== 'none' && y < dollHairEnd(D)) D.hairCut = Math.round(dClamp(y, 480, 1844));
                    else { DR.history.pop(); drawOverlay(); return; }
                    dollChanged(); renderDollRoom(); return;
                }
                if (['tailor', 'patch', 'grow', 'comb'].includes(T.kind) && !T.moved) DR.history.pop();
                else if (T.kind === 'erase' && !T.hit) DR.history.pop();
                else if (T.kind !== 'tap') dollChanged();
                renderDollRoom();
            };
            ov.addEventListener('pointerup', up);
            ov.addEventListener('pointercancel', up);
        }

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
                if (!hEl || hEl.dataset.tl || DR.tool !== 'select' || DR.sel < 0) return;
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
            if (last === 'sleeve' && SLEEVE_LEN[v]) ks.reduce((o, k) => o[k], DR.doll).slen = SLEEVE_LEN[v];   // 소매 모양을 고르면 길이도 그 모양 기본으로
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
                case 'skin':
                    h += `<p class="dr-intro">맨몸 인형에서 시작해요. 피부색부터 골라 주세요.</p>`;
                    h += grp('피부색', colorsD('skin', SKIN_SW), '첫 번째 색이 기본 피부색이에요.');
                    h += grp('속옷 색', colorsD('inner', ['#fdbed1'].concat(CLOTH_SW)));
                    h += grp('배경', chipsD('bg', [['dots', '딸기우유 도트'], ['sky', '맑은 하늘'], ['check', '민트 체크'], ['room', '내 방'], ['none', '없음']]));
                    break;
                case 'face':
                    h += grp('눈', chipsD('eyes', [['basic', '기본'], ['sparkle', '반짝눈'], ['smile', '웃는눈'], ['wink', '윙크'], ['sleepy', '졸린눈'], ['heart', '하트눈']]));
                    h += grp('눈동자 색', colorsD('eyeColor', EYE_SW));
                    h += grp('눈썹', chipsD('brows', [['basic', '기본'], ['worried', '시무룩'], ['strong', '씩씩'], ['none', '없음']]));
                    h += grp('입', chipsD('mouth', [['cat', '고양이'], ['smile', '스마일'], ['open', '활짝'], ['o', '오!'], ['pout', '뽀뽀']]));
                    break;
                case 'hair':
                    h += grp('머리 색', colorsD('hairColor', HAIR_SW));
                    h += grp('앞머리', chipsD('hairFront', [['none', '없음'], ['blunt', '일자 뱅'], ['wispy', '시스루'], ['spiky', '삐죽'], ['side', '옆으로'], ['part', '가르마'], ['up', '올림']]));
                    h += grp('뒷머리', chipsD('hairBack', [['none', '없음'], ['short', '짧은 머리'], ['bob', '단발'], ['long', '긴 생머리'], ['twin', '양갈래'], ['pony', '포니테일'], ['bun', '똥머리']]));
                    h += salonPanel();
                    break;
                case 'makeup':
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
                    if (t === 'top' || (t === 'dress' && DR.doll.dress !== 'hanbok')) h += grp('소매 모양', chipsD(`cloth.${t}.sleeve`, [['none', '민소매'], ['short', '반팔'], ['puff', '퍼프'], ['long', '긴팔']]));
                    h += grp('✂️ 재단', `<p class="dr-note" style="margin:0">인형 위 <b style="color:#ff6b8f">●</b> 손잡이를 끌어 보세요.<br>↕ 기장 · ↔ 치마 퍼짐 · 바지 통 · ✂ 소매 길이</p>
                        <div class="chips" style="margin-top:6px"><button type="button" class="chip" data-dtailor="reset">↺ ${{ top: '상의', bottom: '하의', dress: '원피스', shoes: '신발' }[t]} 처음 모양</button>${undoChips()}</div>`);
                    break;
                }
                case 'deco': h += decoPanel(); break;
                case 'acc':
                    h += grp('소품 (여러 개 가능)', togglesD([['acc.bow', '🎀 리본'], ['acc.headband', '머리띠'], ['acc.crown', '👑 왕관'], ['acc.beret', '베레모'], ['acc.flower', '🌼 꽃핀'], ['acc.glasses', '👓 안경'], ['acc.tie', '👔 넥타이']]));
                    h += grp('소품 색 (리본·머리끈·넥타이·옷고름)', colorsD('accColor', CLOTH_SW.concat(['#ffd54f'])));
                    break;
                case 'done': h += donePanel(); break;
            }
            P.innerHTML = h;
            if (st.id === 'done') afterDonePanel();
        }

        const undoChips = () => '<button type="button" class="chip" data-daction="undo">↩ 되돌리기</button><button type="button" class="chip" data-daction="redo">↪ 다시</button>';
        const toolChips = (attr, cur, list) => `<div class="chips">${list.map(([k, l]) => `<button type="button" class="chip${cur === k ? ' on' : ''}" data-${attr}="${k}">${l}</button>`).join('')}</div>`;
        const swD = (attr, cur, list) => `<div class="swatches">${list.map(c => `<button type="button" class="sw${cur === c ? ' on' : ''}" style="background:${c}" data-${attr}="${c}" aria-label="${c}"></button>`).join('')}<input type="color" value="${cur}" data-${attr}in="1" title="직접 고르기"></div>`;
        const rangeX = (key, min, max, step, v, txt) => `<div class="range"><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-dx="${key}"><span>${txt}</span></div>`;
        const DYE_SW = ['#f5a3c0', '#ff6b8f', '#b49cff', '#a7c7ff', '#8fe0c4', '#ffe08a', '#ffffff', '#2e221f'];
        const PAINT_SW = ['#ffffff', '#ff6b8f', '#ffd1dc', '#ffe08a', '#c9f0d6', '#b9dcff', '#c9b6ff', '#3b3b55', '#f2e3c9', '#e86a5a'];

        /* ---------- 💇 미용실 (③ 헤어) ---------- */
        function salonPanel() {
            const D = DR.doll;
            let h = grp('💇 미용실 <small class="dr-note">고르고 인형 머리를 직접 만져요</small>', toolChips('dsalon', DR.salon, [['cut', '✂️ 자르기'], ['grow', '🌱 기르기'], ['comb', '🪮 빗질'], ['dye', '🎨 염색']])
                + `<div class="chips" style="margin-top:6px">${DR.salon ? '<button type="button" class="chip" data-dsalon="off">✋ 손 떼기</button>' : ''}<button type="button" class="chip" data-dsalonreset="1">↺ 처음 머리로</button>${undoChips()}</div>`,
                D.hairBack === 'none' && D.hairFront === 'none' ? '먼저 위에서 앞머리나 뒷머리를 골라 주세요.' : '');
            if (DR.salon === 'dye') {
                h += grp('염색 색', swD('dhc', DR.hcolor, DYE_SW));
                h += grp('붓 굵기', rangeX('hw', 2, 30, 1, DR.hw, DR.hw));
            }
            h += grp('끝만 물들이기 (옴브레)', colorsD('hairTip', DYE_SW) + rangeD('hairTipA', 0, 1, 0.05, 'pct'));
            return h;
        }
        /* ---------- 🖌️ 옷 꾸미기 (⑥) ---------- */
        const STAMP_NAMES = { heart: '💗 하트', star: '⭐ 별', dot: '⚪ 도트', flower: '🌸 꽃', sparkle: '✨ 반짝' };
        const PATCH_NAMES = { button: '🔘 단추', heart: '💗 하트 와펜', star: '⭐ 별 와펜', bow: '🎀 리본', lace: '🤍 레이스', pocket: '👖 주머니', flower: '🌼 꽃' };
        function decoPanel() {
            const D = DR.doll;
            let h = `<p class="dr-intro">입힌 옷 위에 직접 칠하고, 도장을 찍고, 단추나 와펜을 붙여 나만의 옷을 만들어요.</p>`;
            h += grp('도구', toolChips('ddeco', DR.deco, [['brush', '🖌️ 붓'], ['stamp', '🔖 도장'], ['patch', '🧷 붙이기'], ['erase', '🧽 지우개']]) + `<div class="chips" style="margin-top:6px">${undoChips()}</div>`);
            if (DR.deco !== 'erase') h += grp('색', swD('dpc', DR.pcolor, PAINT_SW));
            if (DR.deco === 'brush') h += grp('붓 굵기', rangeX('pw', 1, 24, 1, DR.pw, DR.pw));
            if (DR.deco === 'stamp') {
                h += grp('도장 모양', toolChips('dstamp', DR.stamp, Object.keys(STAMP_NAMES).map(k => [k, STAMP_NAMES[k]])));
                h += grp('도장 크기', rangeX('ps', 0.5, 3, 0.1, DR.ps, Math.round(DR.ps * 100) + '%'));
            }
            if (DR.deco === 'patch') h += grp('붙일 것', toolChips('dpatch', DR.patchKind, Object.keys(PATCH_NAMES).map(k => [k, PATCH_NAMES[k]])));
            const q = DR.psel >= 0 ? D.patch[DR.psel] : null;
            if (q && DR.deco === 'patch') h += grp(`고른 것: ${PATCH_NAMES[q.k]}`, `<span class="dr-note">크기</span>${rangeX('patch-s', 0.4, 3, 0.05, q.s, Math.round(q.s * 100) + '%')}<span class="dr-note">돌리기</span>${rangeX('patch-r', -180, 180, 5, q.r, q.r + '°')}
                <div class="chips" style="margin-top:6px"><button type="button" class="chip" data-dpatchact="del">🗑 떼기</button><button type="button" class="chip" data-dpatchact="dup">📄 하나 더</button></div>`, '위의 색을 누르면 고른 것 색도 바뀌어요.');
            h += grp(`꾸민 것 (칠 ${D.paint.length} · 붙임 ${D.patch.length})`, `<div class="chips"><button type="button" class="chip" data-ddecoclear="paint">🧽 칠한 것 모두 지우기</button><button type="button" class="chip" data-ddecoclear="patch">🧷 붙인 것 모두 떼기</button></div>`,
                D.top === 'none' && D.bottom === 'none' && D.dress === 'none' ? '옷을 안 입었으면 속옷 위에 칠해져요. ⑤ 옷에서 먼저 옷을 골라 보세요.' : '');
            return h;
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
            } catch (e) { showMsg('사진을 만들지 못했어요.<br>잠시 후 다시 시도해 주세요.'); }
        }
        function dollSaveFile() {
            const d = sanitizeDoll(DR.doll);
            if (!d) { showMsg('⚠ 인형이 너무 커서 파일로 저장할 수 없어요.'); return; }
            downloadBlob(new Blob([JSON.stringify({ malang_doll: 1, name: d.name, by: d.by, doll: d })], { type: 'text/plain;charset=utf-8' }), `malang_doll_${dollStamp()}.malang.txt`);
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
                    if (r) { renderDollPicker(); }
                } catch (err) { showMsg('⚠ 인형을 저장하지 못했어요. 인터넷 연결을 확인해 주세요.'); }
            });
        }

        /* ---------- ▶ 만드는 과정 다시보기 ---------- */
        function dollReplayFrames(D) {
            const base = dollNewMannequin();
            base.bg = D.bg;
            const frames = [dollClone(base)];
            const step = keys => { const f = dollClone(frames[frames.length - 1]); keys.forEach(k => { f[k] = dollClone(D[k]); }); frames.push(f); };
            step(['skin', 'inner']);
            step(['eyes', 'eyeColor', 'brows', 'mouth']);
            step(['hairBack', 'hairFront', 'hairColor']);
            step(['blush', 'blushA', 'lip', 'lipA', 'shadow', 'shadowA', 'lashes', 'freckles']);
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
            if (ds.dsalon) { DR.salon = ds.dsalon === 'off' || DR.salon === ds.dsalon ? null : ds.dsalon; renderDollRoom(); return; }
            if (ds.dsalonreset) { dollPush(); Object.assign(DR.doll, { hairCut: 1844, bangCut: 1844, hairGrow: 1, hairSway: 0, hairTipA: 0, hairPaint: [] }); dollChanged(); renderDollRoom(); return; }
            if (ds.dhc) { DR.hcolor = ds.dhc; renderDollPanel(); return; }
            if (ds.dtailor) {
                const t = DR.clothTarget, c = DR.doll.cloth[t], M = DOLL_MANNEQUIN.cloth[t];
                dollPush(); c.len = M.len; c.fl = 1; c.slen = SLEEVE_LEN[c.sleeve] || M.slen; dollChanged(); renderDollRoom(); return;
            }
            if (ds.ddeco) { DR.deco = ds.ddeco; DR.psel = -1; renderDollRoom(); return; }
            if (ds.dpc) { DR.pcolor = ds.dpc; if (DR.psel >= 0 && DR.deco === 'patch') { dollPush(); DR.doll.patch[DR.psel].c = ds.dpc; dollChanged(); renderDollStage(); } renderDollPanel(); return; }
            if (ds.dstamp) { DR.stamp = ds.dstamp; renderDollPanel(); return; }
            if (ds.dpatch) { DR.patchKind = ds.dpatch; DR.psel = -1; renderDollRoom(); return; }
            if (ds.dpatchact && DR.psel >= 0) {
                const P = DR.doll.patch; dollPush();
                if (ds.dpatchact === 'del') { P.splice(DR.psel, 1); DR.psel = -1; }
                else { const c = dollClone(P[DR.psel]); c.x += 8; c.y += 8; P.push(c); DR.psel = P.length - 1; }
                dollChanged(); renderDollRoom(); return;
            }
            if (ds.ddecoclear) { dollPush(); DR.doll[ds.ddecoclear] = []; DR.psel = -1; dollChanged(); renderDollRoom(); return; }
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
            if (DR.attachEl && document.body.contains(DR.attachEl)) { setPlacedDoll(DR.attachEl, d); }
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
            if (t.dataset.dx) {
                const k = t.dataset.dx, v = parseFloat(t.value), span = t.parentElement.querySelector('span');
                if (k.startsWith('patch-')) {
                    const q = DR.doll.patch[DR.psel]; if (!q) return;
                    q[k.slice(6)] = v; span.textContent = k === 'patch-s' ? Math.round(v * 100) + '%' : v + '°';
                    dollChanged(); renderDollStage();
                } else { DR[k] = v; span.textContent = k === 'ps' ? Math.round(v * 100) + '%' : v; }
            }
            if (t.dataset.dhcin) DR.hcolor = t.value;
            if (t.dataset.dpcin) { DR.pcolor = t.value; if (DR.psel >= 0 && DR.deco === 'patch') { DR.doll.patch[DR.psel].c = t.value; dollChanged(); renderDollStage(); } }
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
            return true;
        }

        function setPlacedDoll(el, d) {
            el.dataset.doll = JSON.stringify(d);
            const img = el.querySelector('img');
            if (img) img.src = dollDataUrl(d, { bg: false, crop: true, live: true });
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
            img.src = dollDataUrl(d, { bg: false, crop: true, live: true });
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
                `<img class="dq-preview" alt="인형 미리보기" src="${dollDataUrl(d, { bg: true, pfx: 'qk', live: true })}">` +
                grp('눈', ch('eyes', [['basic', '기본'], ['sparkle', '반짝'], ['smile', '웃음'], ['wink', '윙크'], ['sleepy', '졸림'], ['heart', '하트']])) +
                grp('입', ch('mouth', [['cat', '고양이'], ['smile', '스마일'], ['open', '활짝'], ['o', '오!'], ['pout', '뽀뽀']])) +
                grp('눈썹', ch('brows', [['basic', '기본'], ['worried', '시무룩'], ['strong', '씩씩'], ['none', '없음']])) +
                grp('움직임', `<div class="chips">${DMV_STYLES.map(([v, l]) => `<button type="button" class="chip${d.motion.s === v ? ' on' : ''}" data-qmove="${v}">${l}</button>`).join('')}${d.motion.k.length >= 2 ? `<button type="button" class="chip${d.motion.s === 'custom' ? ' on' : ''}" data-qmove="custom">✏️ 내가 만든 움직임</button>` : ''}</div>`) +
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
            else if (b.dataset.qmove) d.motion.s = b.dataset.qmove;
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
            openDollRoom(null, d, DOLL_LAST);
            DR.attachEl = quickEl;
            DR.dirty = false;
            renderDollPanel();
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['doll-room'] = true;
