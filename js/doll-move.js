/* 말랑달콤 다이어리 - js/doll-move.js
   💃 인형 움직이기 : 내 인형들 중 하나를 골라 움직임을 정해요 (카페 → 🧸 인형 꾸미기 → 💃 인형 움직이기)
   - ✨ 고르기      : 정해진 움직임 스타일(통통 · 살랑 · 춤…) 중에서 고르고 속도 · 세기를 맞춰요
   - ✏️ 직접 만들기 : 부위(뼈대 19개)마다 돌리기 · 옮기기 · 크기를 정한 '포즈'를 여러 장 만들면, 포즈에서 포즈로 부드럽게 이어서 움직여요
   - 고른 값은 인형 데이터의 motion { s 스타일('custom' = 직접 만든 것) · v 속도 · a 세기 · T 길이 · i 기본 숨쉬기 · k 포즈들 } 한 칸에만 저장돼요 (인형 파일 그대로)
   - 움직임 그리기는 js/doll-render.js 의 dollSVG(live) 가 해요 → 일기에 붙인 인형도 같은 움직임으로 살아 움직여요
   - 스타일 표(DOLL_MOVES)에 한 줄을 더하면 여기 칩도 같이 늘어요 (DMV_STYLES 에 이름표만 추가) · 부위 표는 doll-render.js 의 DOLL_BONES
   ※ 파일 불러오는 순서: … → doll-render → doll-store → doll-room → doll-move → service */

        const DMV_STYLES = [
            ['idle', '🌿 기본'], ['bounce', '🐰 통통'], ['sway', '🌊 살랑'], ['shy', '🙈 수줍'], ['dance', '💃 춤추기'], ['sleepy', '😴 졸려요']
        ];
        const DMV = { id: null, doll: null, dirty: false, react: false, saving: false, built: false, mode: 'basic', basicS: 'idle', sel: 'head', pk: 0, play: false };
        const DMV_SLIDERS = [
            ['0', '↻ 돌리기', 1, '°'], ['1', '↔ 옆으로', 0.5, ''], ['2', '↕ 위아래', 0.5, ''], ['3', '↔ 가로 크기', 0.05, '×'], ['4', '↕ 세로 크기', 0.05, '×']
        ];
        /* 눌러서 고르는 점이 겹치는 부위는 조금씩 비껴 놓아요 (300 × 470 칸) */
        const DMV_DOT_OFF = { upper: [0, -13], hip: [-17, 8], skirt: [17, 8], hairF: [-17, 0], hairB: [17, 0], acc: [0, -15], brow: [0, -6] };
        const DMV_PAIR = { armL: 'armR', armR: 'armL', foreL: 'foreR', foreR: 'foreL', legL: 'legR', legR: 'legL', shinL: 'shinR', shinR: 'shinL' };
        /* 예시로 시작 : [시각 0~1, {부위: [돌리기, 옆, 위아래, 가로배율, 세로배율]}] — 고쳐서 내 것으로 만들어요 */
        const DMV_SAMPLES = [
            { n: '👋 손 흔들기', T: 1.6, k: [
                [0, { armR: [105, 0, 0, 1, 1], foreR: [25, 0, 0, 1, 1], head: [5, 0, 0, 1, 1] }],
                [0.25, { armR: [105, 0, 0, 1, 1], foreR: [-25, 0, 0, 1, 1], head: [5, 0, 0, 1, 1] }],
                [0.5, { armR: [105, 0, 0, 1, 1], foreR: [25, 0, 0, 1, 1], head: [5, 0, 0, 1, 1] }],
                [0.75, { armR: [105, 0, 0, 1, 1], foreR: [-25, 0, 0, 1, 1], head: [5, 0, 0, 1, 1] }]] },
            { n: '🕺 좌우 흔들기', T: 1.8, k: [
                [0, { root: [0, -5, 0, 1, 1], upper: [5, 0, 0, 1, 1], head: [-7, 0, 0, 1, 1], hip: [-4, 0, 0, 1, 1], skirt: [-6, 0, 0, 1, 1], armL: [45, 0, 0, 1, 1], foreL: [20, 0, 0, 1, 1], armR: [-8, 0, 0, 1, 1], legL: [-5, 0, 0, 1, 1], legR: [8, 0, 0, 1, 1] }],
                [0.5, { root: [0, 5, -4, 1, 1], upper: [-5, 0, 0, 1, 1], head: [7, 0, 0, 1, 1], hip: [4, 0, 0, 1, 1], skirt: [6, 0, 0, 1, 1], armL: [-8, 0, 0, 1, 1], armR: [45, 0, 0, 1, 1], foreR: [20, 0, 0, 1, 1], legL: [8, 0, 0, 1, 1], legR: [-5, 0, 0, 1, 1] }]] },
            { n: '🙇 인사하기', T: 2.6, k: [
                [0, {}],
                [0.28, { upper: [0, 0, 12, 1.03, 0.9], head: [0, 0, 8, 1, 0.92], armL: [8, 0, 0, 1, 1], armR: [8, 0, 0, 1, 1], hairF: [0, 0, 4, 1, 1] }],
                [0.6, { upper: [0, 0, 12, 1.03, 0.9], head: [0, 0, 8, 1, 0.92], armL: [8, 0, 0, 1, 1], armR: [8, 0, 0, 1, 1], hairF: [0, 0, 4, 1, 1] }]] },
            { n: '🦘 콩콩 뛰기', T: 1, k: [
                [0, { upper: [0, 0, 3, 1.02, 0.96], legL: [-4, 0, 0, 1, 1], legR: [-4, 0, 0, 1, 1], shinL: [10, 0, 0, 1, 1], shinR: [10, 0, 0, 1, 1] }],
                [0.5, { root: [0, 0, -20, 1, 1], armL: [35, 0, 0, 1, 1], armR: [35, 0, 0, 1, 1], legL: [8, 0, 0, 1, 1], legR: [8, 0, 0, 1, 1], shinL: [-22, 0, 0, 1, 1], shinR: [-22, 0, 0, 1, 1], head: [0, 0, -3, 1, 1] }]] }
        ];

        function dmvBuild() {
            if (DMV.built) return;
            DMV.built = true;
            const wrap = document.createElement('div');
            wrap.innerHTML = `
            <div class="modal" id="dollMove">
              <div class="modal-content dmv-box">
                <div class="modal-title">💃 인형 움직이기</div>
                <div id="dmvPick">
                  <p class="dmv-tip">움직임을 줄 인형을 골라 주세요.</p>
                  <div class="doll-grid" id="dmvGrid"></div>
                </div>
                <div id="dmvEdit" style="display:none">
                  <div class="dmv-tabs" id="dmvTabs">
                    <button type="button" class="dmv-tab" data-dmvm="basic">✨ 고르기</button>
                    <button type="button" class="dmv-tab" data-dmvm="custom">✏️ 직접 만들기</button>
                  </div>
                  <div class="dmv-main">
                    <div class="dmv-stagewrap" id="dmvStageWrap">
                      <div class="dmv-stage" id="dmvStage"></div>
                      <div class="dmv-dots" id="dmvDots"></div>
                    </div>
                    <div class="dmv-ctl">
                      <div id="dmvBasic">
                        <div class="dmv-grp"><h4>움직임</h4><div class="dmv-chips" id="dmvStyles"></div></div>
                        <div class="dmv-grp"><h4>속도</h4><div class="dmv-range"><small>느리게</small><input type="range" id="dmvSpeed" min="0.5" max="2" step="0.1"><small>빠르게</small></div></div>
                        <div class="dmv-grp"><h4>세기</h4><div class="dmv-range"><small>살짝</small><input type="range" id="dmvAmp" min="0.4" max="1.8" step="0.1"><small>크게</small></div></div>
                        <p class="dmv-note">👆 인형을 톡 누르면 반응해요!</p>
                      </div>
                      <div id="dmvCustom" style="display:none">
                        <p class="dmv-note dmv-how">① 포즈를 고르고 ② 고칠 부위(인형 위 동그라미도 눌러져요)를 눌러 ③ 슬라이더로 자세를 만들어요. ➕ 새 포즈로 다음 장면을 만들면 포즈에서 포즈로 이어져서 움직여요.</p>
                        <div class="dmv-grp"><h4>포즈 <small id="dmvPoseInfo"></small></h4>
                          <div class="dmv-chips" id="dmvPoses"></div>
                          <div class="dmv-row2">
                            <button type="button" class="dmv-chip" id="dmvPoseAdd">➕ 새 포즈</button>
                            <button type="button" class="dmv-chip" id="dmvPoseDel">🗑 이 포즈 지우기</button>
                            <button type="button" class="dmv-chip" id="dmvPoseClear">↺ 이 포즈 비우기</button>
                          </div>
                          <div class="dmv-range dmv-timeRow" id="dmvTimeRow"><small>이 포즈가 나오는 때</small><input type="range" id="dmvTime" min="5" max="95" step="1"><output id="dmvTimeOut"></output></div>
                        </div>
                        <div class="dmv-grp"><h4>고칠 부위 <small id="dmvBoneName"></small></h4><div class="dmv-chips" id="dmvBones"></div></div>
                        <div class="dmv-grp" id="dmvSliders"></div>
                        <div class="dmv-row2"><button type="button" class="dmv-chip" id="dmvBoneReset">↺ 이 부위 원래대로</button><button type="button" class="dmv-chip" id="dmvBoneMirror">🪞 반대쪽도 똑같이</button></div>
                        <div class="dmv-grp"><h4>속도</h4><div class="dmv-range"><small>느리게</small><input type="range" id="dmvSpeed2" min="0.5" max="2" step="0.1"><small>빠르게</small></div></div>
                        <div class="dmv-grp"><h4>세기</h4><div class="dmv-range"><small>살짝</small><input type="range" id="dmvAmp2" min="0.4" max="1.8" step="0.1"><small>크게</small></div></div>
                        <label class="dmv-check"><input type="checkbox" id="dmvIdle"> 숨쉬기 · 눈 깜빡임 · 머리카락 살랑도 같이</label>
                        <div class="dmv-grp"><h4>예시로 시작하기</h4><div class="dmv-chips" id="dmvSamples"></div></div>
                      </div>
                    </div>
                  </div>
                  <div class="dmv-btns">
                    <button class="btn btn-primary" type="button" id="dmvAttach">📔 일기에 붙이기</button>
                    <button class="btn" type="button" id="dmvPlay" style="display:none">▶ 움직여 보기</button>
                    <button class="btn" type="button" id="dmvSave">💾 저장</button>
                    <button class="btn" type="button" id="dmvBack">◀ 다른 인형</button>
                  </div>
                </div>
                <button class="btn dmv-close" type="button" onclick="closeDollMove()">닫기</button>
              </div>
            </div>`;
            document.body.appendChild(wrap.firstElementChild);
            const $ = id => document.getElementById(id);
            $('dmvStyles').innerHTML = DMV_STYLES.map(([v, l]) => `<button type="button" class="dmv-chip" data-dmvs="${v}">${l}</button>`).join('');
            $('dmvStyles').addEventListener('click', e => {
                const b = e.target.closest('[data-dmvs]'); if (!b || !DMV.doll) return;
                DMV.doll.motion.s = b.dataset.dmvs; DMV.basicS = b.dataset.dmvs; dmvChanged();
            });
            const speed = e => { DMV.doll.motion.v = parseFloat(e.target.value); dmvSyncCommon(); dmvChanged(true); };
            const amp = e => { DMV.doll.motion.a = parseFloat(e.target.value); dmvSyncCommon(); dmvChanged(true); };
            ['dmvSpeed', 'dmvSpeed2'].forEach(id => $(id).addEventListener('input', speed));
            ['dmvAmp', 'dmvAmp2'].forEach(id => $(id).addEventListener('input', amp));
            $('dmvStage').addEventListener('pointerdown', dmvPoke);
            $('dmvTabs').addEventListener('click', e => { const b = e.target.closest('[data-dmvm]'); if (b) dmvSetMode(b.dataset.dmvm); });
            $('dmvSave').onclick = () => dmvSave(true);
            $('dmvAttach').onclick = dmvAttach;
            $('dmvBack').onclick = dmvBack;
            $('dmvPlay').onclick = () => { DMV.play = !DMV.play; dmvRender(); };
            /* ✏️ 직접 만들기 */
            $('dmvBones').innerHTML = DOLL_BONES.map(b => `<button type="button" class="dmv-chip dmv-bone" data-dmvb="${b.id}">${b.name}</button>`).join('');
            $('dmvBones').addEventListener('click', e => { const b = e.target.closest('[data-dmvb]'); if (b) dmvSelBone(b.dataset.dmvb); });
            $('dmvDots').addEventListener('click', e => { const b = e.target.closest('[data-dmvb]'); if (b) dmvSelBone(b.dataset.dmvb); });
            $('dmvSliders').innerHTML = DMV_SLIDERS.map(([i, l, st, u]) => `<div class="dmv-sl"><label>${l}</label><input type="range" data-dmvk="${i}" min="${DOLL_POSE_LIM[i][0]}" max="${DOLL_POSE_LIM[i][1]}" step="${st}"><output data-dmvo="${i}"></output></div>`).join('');
            $('dmvSliders').addEventListener('input', e => {
                const r = e.target.closest('[data-dmvk]'); if (!r) return;
                DMV.play = false;
                dmvSet(DMV.sel, +r.dataset.dmvk, parseFloat(r.value));
                dmvChanged(true);
            });
            $('dmvPoses').addEventListener('click', e => { const b = e.target.closest('[data-dmvp]'); if (!b) return; DMV.pk = +b.dataset.dmvp; DMV.play = false; dmvRender(); });
            $('dmvPoseAdd').onclick = dmvPoseAdd;
            $('dmvPoseDel').onclick = dmvPoseDel;
            $('dmvPoseClear').onclick = () => { dmvPose().p = {}; DMV.play = false; dmvChanged(); };
            $('dmvTime').addEventListener('input', e => {
                const M = DMV.doll.motion, k = M.k, i = DMV.pk; if (i < 1) return;
                const lo = k[i - 1].t + 0.05, hi = i + 1 < k.length ? k[i + 1].t - 0.05 : M.T - 0.05;
                k[i].t = Math.round(Math.max(lo, Math.min(hi, M.T * parseFloat(e.target.value) / 100)) * 100) / 100;
                DMV.play = false; dmvChanged(true);
            });
            $('dmvBoneReset').onclick = () => { delete dmvPose().p[DMV.sel]; DMV.play = false; dmvChanged(); };
            $('dmvBoneMirror').onclick = () => {
                const o = DMV_PAIR[DMV.sel]; if (!o) { showMsg('이 부위는 짝이 없어요.<br><span style="font-size:12px;color:#777;">팔 · 아래팔 · 다리 · 종아리에서 쓸 수 있어요.</span>'); return; }
                const v = dmvPose().p[DMV.sel];
                if (v) dmvPose().p[o] = v.slice(); else delete dmvPose().p[o];
                DMV.play = false; dmvChanged();
            };
            $('dmvIdle').addEventListener('change', e => { DMV.doll.motion.i = e.target.checked ? 1 : 0; dmvChanged(); });
            $('dmvSamples').innerHTML = DMV_SAMPLES.map((s, i) => `<button type="button" class="dmv-chip" data-dmvx="${i}">${s.n}</button>`).join('');
            $('dmvSamples').addEventListener('click', e => { const b = e.target.closest('[data-dmvx]'); if (b) dmvSample(+b.dataset.dmvx); });
        }

        async function openDollMove() {
            dmvBuild();
            ['serviceModal'].forEach(id => { const m = document.getElementById(id); if (m) m.style.display = 'none'; });
            openModal('dollMove');
            await dmvShowPick();
        }

        async function dmvShowPick(force) {
            document.getElementById('dmvPick').style.display = '';
            document.getElementById('dmvEdit').style.display = 'none';
            DMV.doll = null; DMV.dirty = false; DMV.play = false;
            const grid = document.getElementById('dmvGrid');
            grid.innerHTML = '<div class="doll-empty">☁ 인형을 불러오는 중…</div>';
            let list;
            try { list = await listDolls(force); }
            catch (e) { grid.innerHTML = '<div class="doll-empty">⚠ 인형을 불러오지 못했어요.<br>인터넷 연결을 확인해 주세요.</div>'; return; }
            grid.innerHTML = '';
            if (!list.length) {
                grid.innerHTML = '<div class="doll-empty">아직 만든 인형이 없어요.<br>먼저 👧 인형방에서 인형을 만들어 주세요!</div>';
                const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = '👧 인형방으로 가기';
                b.style.cssText = 'grid-column:1/-1;justify-self:center;';
                b.onclick = () => { closeModal('dollMove'); openDollPicker(); };
                grid.appendChild(b);
                return;
            }
            list.forEach((ent, i) => {
                const d = ent.doll;
                const card = document.createElement('button');
                card.type = 'button'; card.className = 'doll-card dmv-card';
                const img = document.createElement('img');
                img.alt = d.name || '인형'; img.src = dollDataUrl(d, { bg: true, pfx: 'mp' + i, live: true });
                const nm = document.createElement('div'); nm.className = 'doll-card-name'; nm.textContent = d.name || '이름 없는 인형';
                card.append(img, nm);
                card.onclick = () => dmvOpenEdit(ent);
                grid.appendChild(card);
            });
        }

        function dmvOpenEdit(ent) {
            DMV.id = ent.id; DMV.doll = dollClone(ent.doll); DMV.dirty = false; DMV.react = false; DMV.play = false;
            const M = DMV.doll.motion;
            DMV.basicS = M.s === 'custom' ? 'idle' : M.s;
            DMV.mode = M.s === 'custom' ? 'custom' : 'basic';
            DMV.pk = 0; DMV.sel = 'head';
            document.getElementById('dmvPick').style.display = 'none';
            document.getElementById('dmvEdit').style.display = '';
            dmvSyncCommon();
            document.getElementById('dmvIdle').checked = M.i !== 0;
            dmvRender();
        }
        function dmvSyncCommon() {
            const M = DMV.doll.motion;
            ['dmvSpeed', 'dmvSpeed2'].forEach(id => { document.getElementById(id).value = M.v; });
            ['dmvAmp', 'dmvAmp2'].forEach(id => { document.getElementById(id).value = M.a; });
        }

        /* ---------- ✏️ 직접 만들기 : 포즈 다루기 ---------- */
        function dmvSetMode(m) {
            if (!DMV.doll || DMV.mode === m) return;
            const M = DMV.doll.motion;
            DMV.mode = m; DMV.play = false; DMV.react = false;
            if (m === 'custom') {
                if (!M.k.length) { M.k = [{ t: 0, p: {} }, { t: Math.round(M.T / 2 * 100) / 100, p: {} }]; }
                else if (M.k.length < 2) M.k.push({ t: Math.round(M.T / 2 * 100) / 100, p: {} });
                M.s = 'custom'; DMV.pk = Math.min(DMV.pk, M.k.length - 1);
            } else M.s = DMV.basicS;
            DMV.dirty = true;
            dmvRender();
        }
        const dmvPose = () => DMV.doll.motion.k[DMV.pk];
        function dmvSet(id, i, v) {
            const p = dmvPose().p, a = (p[id] || DOLL_POSE_DEF).slice();
            a[i] = Math.round(v * 100) / 100;
            if (a.every((x, j) => x === DOLL_POSE_DEF[j])) delete p[id]; else p[id] = a;
        }
        function dmvRetime() {                       // 포즈 사이를 고르게
            const M = DMV.doll.motion, n = M.k.length;
            M.k.forEach((q, i) => { q.t = Math.round(i * M.T / n * 100) / 100; });
        }
        function dmvPoseAdd() {
            const M = DMV.doll.motion;
            if (M.k.length >= DOLL_MAX_POSES) { showMsg(`포즈는 ${DOLL_MAX_POSES}장까지 만들 수 있어요.`); return; }
            const cur = dmvPose();
            M.k.splice(DMV.pk + 1, 0, { t: 0, p: dollClone(cur.p) });
            DMV.pk++; dmvRetime(); DMV.play = false; dmvChanged();
        }
        async function dmvPoseDel() {
            const M = DMV.doll.motion;
            if (M.k.length <= 2) { showMsg('움직이려면 포즈가 2장은 있어야 해요.'); return; }
            if (!(await showMsg(`${DMV.pk + 1}번 포즈를 지울까요?`, true))) return;
            M.k.splice(DMV.pk, 1);
            DMV.pk = Math.min(DMV.pk, M.k.length - 1); dmvRetime(); DMV.play = false; dmvChanged();
        }
        async function dmvSample(i) {
            const S = DMV_SAMPLES[i], M = DMV.doll.motion;
            if (M.k.some(q => Object.keys(q.p).length) && !(await showMsg('지금 만든 포즈가 사라지고 예시로 바뀌어요.<br>계속할까요?', true))) return;
            M.T = S.T;
            M.k = S.k.map(([f, p]) => ({ t: Math.round(f * S.T * 100) / 100, p: dollClone(p) }));
            DMV.pk = 0; DMV.sel = Object.keys(S.k[0][1])[0] || 'head'; DMV.play = true; dmvChanged();
        }
        function dmvSelBone(id) {
            DMV.sel = id; DMV.play = false; dmvRender();
        }

        /* ---------- 그리기 ---------- */
        function dmvRender() {
            if (!DMV.doll) return;
            const $ = id => document.getElementById(id), M = DMV.doll.motion, custom = DMV.mode === 'custom';
            if (custom) { DMV.pk = Math.max(0, Math.min(DMV.pk, M.k.length - 1)); if (!DOLL_BONE[DMV.sel]) DMV.sel = 'head'; }
            let svg;
            if (custom && !DMV.play) svg = dollSVG(DMV.doll, { bg: true, pfx: 'mv', pose: dmvPose().p });
            else {
                const D = DMV.react && !custom ? Object.assign({}, DMV.doll, { eyes: 'smile', mouth: 'open' }) : DMV.doll;
                svg = dollSVG(D, { bg: true, pfx: 'mv', live: true, hop: DMV.react && !custom });
            }
            $('dmvStage').innerHTML = svg;
            document.querySelectorAll('#dmvTabs [data-dmvm]').forEach(b => b.classList.toggle('on', b.dataset.dmvm === DMV.mode));
            $('dmvBasic').style.display = custom ? 'none' : '';
            $('dmvCustom').style.display = custom ? '' : 'none';
            $('dmvPlay').style.display = custom ? '' : 'none';
            $('dmvStageWrap').classList.toggle('dmv-edit', custom && !DMV.play);
            document.querySelectorAll('#dmvStyles [data-dmvs]').forEach(b => b.classList.toggle('on', b.dataset.dmvs === M.s));
            if (custom) dmvRenderCustom();
            else $('dmvDots').innerHTML = '';
        }
        function dmvRenderCustom() {
            const $ = id => document.getElementById(id), M = DMV.doll.motion, k = M.k, cur = dmvPose(), b = DOLL_BONE[DMV.sel];
            $('dmvPlay').textContent = DMV.play ? '⏸ 멈추고 고치기' : '▶ 움직여 보기';
            $('dmvPoses').innerHTML = k.map((q, i) => `<button type="button" class="dmv-chip dmv-pose${i === DMV.pk ? ' on' : ''}" data-dmvp="${i}">${i + 1}${Object.keys(q.p).length ? ' ●' : ''}</button>`).join('');
            $('dmvPoseInfo').textContent = `${DMV.pk + 1} / ${k.length} 번째 포즈 (최대 ${DOLL_MAX_POSES}장)`;
            $('dmvPoseDel').disabled = k.length <= 2;
            $('dmvTimeRow').style.display = DMV.pk > 0 ? '' : 'none';
            $('dmvTime').value = Math.round(cur.t / M.T * 100);
            $('dmvTimeOut').textContent = Math.round(cur.t / M.T * 100) + '%';
            document.querySelectorAll('#dmvBones [data-dmvb]').forEach(c => {
                c.classList.toggle('on', c.dataset.dmvb === DMV.sel);
                c.classList.toggle('used', !!cur.p[c.dataset.dmvb]);
            });
            $('dmvBoneName').textContent = '— ' + b.name;
            const v = cur.p[DMV.sel] || DOLL_POSE_DEF;
            $('dmvSliders').querySelectorAll('[data-dmvk]').forEach(r => {
                const i = +r.dataset.dmvk;
                r.value = v[i];
                $('dmvSliders').querySelector(`[data-dmvo="${i}"]`).textContent = (i < 3 ? v[i] : v[i].toFixed(2)) + DMV_SLIDERS[i][3];
            });
            $('dmvBoneMirror').style.display = DMV_PAIR[DMV.sel] ? '' : 'none';
            $('dmvIdle').checked = M.i !== 0;
            /* 인형 위 동그라미 (뼈대 축 위치) */
            const flip = DMV.doll.flip, dots = DMV.play ? '' : DOLL_BONES.map(bn => {
                const o = DMV_DOT_OFF[bn.id] || [0, 0], x = bn.pv[0] + o[0], y = bn.pv[1] + o[1];
                return `<button type="button" class="dmv-dot${bn.id === DMV.sel ? ' on' : ''}${cur.p[bn.id] ? ' used' : ''}" data-dmvb="${bn.id}" title="${bn.name}" style="left:${((flip ? DOLL_W - x : x) / DOLL_W * 100).toFixed(2)}%;top:${(y / DOLL_H * 100).toFixed(2)}%"></button>`;
            }).join('');
            $('dmvDots').innerHTML = dots;
        }
        function dmvChanged(slider) {
            DMV.dirty = true;
            if (slider) { clearTimeout(DMV.rt); DMV.rt = setTimeout(dmvRender, 50); } else dmvRender();
        }
        function dmvPoke() {
            if (DMV.react || !DMV.doll || DMV.mode !== 'basic') return;
            DMV.react = true; dmvRender();
            setTimeout(() => { DMV.react = false; dmvRender(); }, 1200);
        }

        async function dmvSave(msg) {
            if (DMV.saving || !DMV.doll) return null;
            DMV.saving = true;
            try {
                const r = await saveDoll(DMV.doll, DMV.id, { ask: false });
                if (!r) return null;
                DMV.id = r.id; DMV.doll = dollClone(r.doll); DMV.dirty = false;
                if (DMV.mode === 'custom' && DMV.doll.motion.s !== 'custom') DMV.mode = 'basic';
                if (msg) showMsg('💾 움직임을 저장했어요!<br><span style="font-size:12px;color:#777;">일기에 붙인 인형은 📔 일기에 붙이기로 다시 붙이거나, 인형을 두 번 눌러 움직임을 바꿔요.</span>');
                dmvRender();
                return r;
            } catch (e) {
                console.error('인형 움직임 저장 오류:', e);
                showMsg('⚠ 저장하지 못했어요.<br>인터넷 연결을 확인한 뒤 다시 저장해 주세요.');
                return null;
            } finally { DMV.saving = false; }
        }
        async function dmvAttach() {
            const r = await dmvSave(false);
            if (r && attachDollToPage(r.doll)) closeModal('dollMove');
        }
        async function dmvBack() {
            if (DMV.dirty && (await showMsg('움직임을 바꾼 게 저장되지 않았어요.<br>저장할까요?', true))) { if (!(await dmvSave(false))) return; }
            dmvShowPick();
        }
        async function closeDollMove() {
            if (DMV.dirty && DMV.doll) {
                if (await showMsg('움직임을 바꾼 게 저장되지 않았어요.<br>저장할까요?', true)) { if (!(await dmvSave(false))) return; }
            }
            DMV.doll = null; DMV.dirty = false; DMV.play = false;
            closeModal('dollMove');
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['doll-move'] = true;
