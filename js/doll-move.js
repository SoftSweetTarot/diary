/* 말랑달콤 다이어리 - js/doll-move.js
   💃 인형 움직이기 : 내 인형들 중 하나를 골라 움직임 스타일 · 속도 · 세기를 정해요 (카페 → 🧸 인형 꾸미기 → 💃 인형 움직이기)
   - 고른 값은 인형 데이터의 motion { s 스타일, v 속도, a 세기 } 한 칸에만 저장돼요 (인형 파일 그대로 · 용량 거의 그대로)
   - 움직임 그리기는 js/doll-render.js 의 dollSVG(live) 가 해요 → 일기에 붙인 인형도 같은 움직임으로 살아 움직여요
   - 스타일 표(DOLL_MOVES)에 한 줄을 더하면 여기 칩도 같이 늘어요 (DMV_STYLES 에 이름표만 추가)
   ※ 파일 불러오는 순서: … → doll-render → doll-store → doll-room → doll-move → service */

        const DMV_STYLES = [
            ['idle', '🌿 기본'], ['bounce', '🐰 통통'], ['sway', '🌊 살랑'], ['shy', '🙈 수줍'], ['dance', '💃 춤추기'], ['sleepy', '😴 졸려요']
        ];
        const DMV = { id: null, doll: null, dirty: false, react: false, saving: false, built: false };

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
                  <div class="dmv-main">
                    <div class="dmv-stage" id="dmvStage"></div>
                    <div class="dmv-ctl">
                      <div class="dmv-grp"><h4>움직임</h4><div class="dmv-chips" id="dmvStyles"></div></div>
                      <div class="dmv-grp"><h4>속도</h4><div class="dmv-range"><small>느리게</small><input type="range" id="dmvSpeed" min="0.5" max="2" step="0.1"><small>빠르게</small></div></div>
                      <div class="dmv-grp"><h4>세기</h4><div class="dmv-range"><small>살짝</small><input type="range" id="dmvAmp" min="0.4" max="1.8" step="0.1"><small>크게</small></div></div>
                      <p class="dmv-note">👆 인형을 톡 누르면 반응해요!</p>
                    </div>
                  </div>
                  <div class="dmv-btns">
                    <button class="btn btn-primary" type="button" id="dmvAttach">📔 일기에 붙이기</button>
                    <button class="btn" type="button" id="dmvSave">💾 저장</button>
                    <button class="btn" type="button" id="dmvBack">◀ 다른 인형</button>
                  </div>
                </div>
                <button class="btn dmv-close" type="button" onclick="closeDollMove()">닫기</button>
              </div>
            </div>`;
            document.body.appendChild(wrap.firstElementChild);
            document.getElementById('dmvStyles').innerHTML = DMV_STYLES.map(([v, l]) => `<button type="button" class="dmv-chip" data-dmvs="${v}">${l}</button>`).join('');
            document.getElementById('dmvStyles').addEventListener('click', e => {
                const b = e.target.closest('[data-dmvs]'); if (!b || !DMV.doll) return;
                DMV.doll.motion.s = b.dataset.dmvs; dmvChanged();
            });
            document.getElementById('dmvSpeed').addEventListener('input', e => { DMV.doll.motion.v = parseFloat(e.target.value); dmvChanged(true); });
            document.getElementById('dmvAmp').addEventListener('input', e => { DMV.doll.motion.a = parseFloat(e.target.value); dmvChanged(true); });
            document.getElementById('dmvStage').addEventListener('pointerdown', dmvPoke);
            document.getElementById('dmvSave').onclick = () => dmvSave(true);
            document.getElementById('dmvAttach').onclick = dmvAttach;
            document.getElementById('dmvBack').onclick = dmvBack;
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
            DMV.doll = null; DMV.dirty = false;
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
            DMV.id = ent.id; DMV.doll = dollClone(ent.doll); DMV.dirty = false; DMV.react = false;
            document.getElementById('dmvPick').style.display = 'none';
            document.getElementById('dmvEdit').style.display = '';
            document.getElementById('dmvSpeed').value = DMV.doll.motion.v;
            document.getElementById('dmvAmp').value = DMV.doll.motion.a;
            dmvRender();
        }

        function dmvRender() {
            if (!DMV.doll) return;
            const D = DMV.react ? Object.assign({}, DMV.doll, { eyes: 'smile', mouth: 'open' }) : DMV.doll;
            document.getElementById('dmvStage').innerHTML = dollSVG(D, { bg: true, pfx: 'mv', live: true, hop: DMV.react });
            document.querySelectorAll('#dmvStyles [data-dmvs]').forEach(b => b.classList.toggle('on', b.dataset.dmvs === DMV.doll.motion.s));
        }
        function dmvChanged(slider) {
            DMV.dirty = true;
            if (slider) { clearTimeout(DMV.rt); DMV.rt = setTimeout(dmvRender, 60); } else dmvRender();
        }
        function dmvPoke() {
            if (DMV.react || !DMV.doll) return;
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
                if (msg) showMsg('💾 움직임을 저장했어요!<br><span style="font-size:12px;color:#777;">일기에 붙인 인형은 📔 일기에 붙이기로 다시 붙이거나, 인형을 두 번 눌러 움직임을 바꿔요.</span>');
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
            DMV.doll = null; DMV.dirty = false;
            closeModal('dollMove');
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['doll-move'] = true;
