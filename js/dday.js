/* 말랑달콤 다이어리 - js/dday.js
   ⏳ D-day : 기다리는 날 · 함께한 날 · 해마다 오는 날을 세어 줘요 (카페 → 매일 → ⏳ D-day)
   - 종류 : 다가오는 날 (D-12 · D-DAY · D+3) / 시작한 날부터 (128일째 · 다음 200일까지 D-72) / 해마다 (생일 · 기념일, 다음 그날까지 D-n)
   - 📌 페이지에 보이기 : 다이어리 페이지 왼쪽 위에 그 페이지 날짜 기준으로 보여요 (지난 페이지를 보면 그날 기준 D-n)
   - 📔 붙이기 : 오늘 기준 카드를 다이어리에 붙여요
   - 목록은 설정(settings.json)에 저장 ('diary_dday') · 게스트는 이 기기에만
   - 페이지 표시를 끄고 싶으면 ⚙ 설정 → 👀 페이지에 보이는 것 (js/show.js)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (D-day 만 '준비 중') */

        const DD_KEY = 'diary_dday', DD_LOCAL = 'malang_dday', DD_MAX = 30, DD_PIN_MAX = 2;
        const DD_ICONS = ['⭐', '🎂', '💕', '✈️', '📚', '🎄', '🎓', '💍', '🏃', '🎁', '🌸', '🐶'];
        const DD_KINDS = { until: '다가오는 날', since: '시작한 날부터', yearly: '해마다 (생일 · 기념일)' };
        const dd = { built: false, list: [], edit: null };
        const ddq = id => document.getElementById(id);
        const ddSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        const ddEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

        function ddRead() {
            let a = null; try { a = JSON.parse(ddSync() ? store.getItem(DD_KEY) : localStorage.getItem(DD_LOCAL)); } catch (e) {}
            return Array.isArray(a) ? a.filter(x => x && x.n && /^\d{4}-\d{2}-\d{2}$/.test(x.d)) : [];
        }
        function ddWrite() {
            const t = JSON.stringify(dd.list);
            try { if (ddSync()) store.setItem(DD_KEY, t); else localStorage.setItem(DD_LOCAL, t); } catch (e) {}
            ddRender();
        }
        const ddDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
        const ddDays = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
        const ddStr = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

        /* 기준 날짜(base)에서 본 D-day → { big: 'D-12', sub: '…' } */
        function ddCount(x, base) {
            const t = ddDate(x.d);
            if (x.k === 'since') {
                const n = ddDays(t, base) + 1;
                if (n < 1) return { big: `D-${1 - n}`, sub: '시작하기 전이에요' };
                const next = (Math.floor(n / 100) + 1) * 100;
                return { big: `${n.toLocaleString()}일째`, sub: `${next}일까지 D-${next - n}` };
            }
            if (x.k === 'yearly') {
                let nx = new Date(base.getFullYear(), t.getMonth(), t.getDate());
                if (ddDays(base, nx) < 0) nx = new Date(base.getFullYear() + 1, t.getMonth(), t.getDate());
                const n = ddDays(base, nx), age = nx.getFullYear() - t.getFullYear();
                return { big: n === 0 ? 'D-DAY' : `D-${n}`, sub: n === 0 ? '오늘이에요! 🎉' : `${nx.getMonth() + 1}월 ${nx.getDate()}일${age > 0 ? ` · ${age}번째` : ''}` };
            }
            const n = ddDays(base, t);
            return { big: n > 0 ? `D-${n}` : n === 0 ? 'D-DAY' : `D+${-n}`, sub: `${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일${n < 0 ? ' 지남' : ''}` };
        }

        /* ---------- 다이어리 페이지 왼쪽 위 표시 ---------- */
        function ddBadgeHtml(base) {
            const pins = dd.list.filter(x => x.pin).slice(0, DD_PIN_MAX);
            return pins.map(x => { const c = ddCount(x, base); return `<span class="dd-badge${c.big === 'D-DAY' ? ' today' : ''}">${x.e || '⭐'} ${ddEsc(x.n)} <b>${c.big}</b></span>`; }).join('');
        }
        function ddRender() {
            const page = ddq('innerPage'); if (!page) return;
            let box = ddq('pageDday');
            if (!box) { box = document.createElement('div'); box.id = 'pageDday'; box.className = 'page-dday'; box.onclick = () => openDday(); page.appendChild(box); }
            box.innerHTML = typeof currentDate !== 'undefined' ? ddBadgeHtml(currentDate) : '';
        }
        function ddStaticHtml(date) { const h = ddBadgeHtml(date); return h ? `<div class="page-dday">${h}</div>` : ''; }

        /* ---------- D-day 화면 ---------- */
        function ddBuild() {
            if (dd.built) return;
            dd.built = true;
            const el = document.createElement('div');
            el.id = 'ddayRoom'; el.className = 'dd-room';
            el.innerHTML = `
              <div class="dd-bar"><span class="dd-sp"></span><b>⏳ D-day</b><button class="dd-x" type="button" onclick="closeDday()" aria-label="닫기">✕</button></div>
              <div class="dd-wrap">
                <div class="dd-list" id="ddList"></div>
                <button type="button" class="dd-add" id="ddAddBtn" onclick="ddForm()">＋ D-day 만들기</button>
                <div class="dd-form" id="ddFormBox" hidden>
                  <b id="ddFormTitle">새 D-day</b>
                  <input id="ddName" maxlength="14" placeholder="이름 (예: 제주도 여행, 우리 만난 날)">
                  <div class="dd-kinds" id="ddKinds">${Object.keys(DD_KINDS).map(k => `<button type="button" data-k="${k}" onclick="ddKind('${k}')">${DD_KINDS[k]}</button>`).join('')}</div>
                  <label class="dd-dl"><span id="ddDateLabel">날짜</span><input type="date" id="ddDate"></label>
                  <div class="dd-icons" id="ddIcons">${DD_ICONS.map(e => `<button type="button" data-e="${e}" onclick="ddIcon('${e}')">${e}</button>`).join('')}</div>
                  <label class="dd-pin"><input type="checkbox" id="ddPin"> 📌 다이어리 페이지에 보이기 (최대 ${DD_PIN_MAX}개)</label>
                  <div class="dd-form-btns"><button type="button" class="dd-cancel" onclick="ddFormClose()">취소</button><button type="button" class="dd-save" onclick="ddSave()">저장</button></div>
                </div>
                <p class="dd-note">💡 📌 를 켠 D-day 는 다이어리 페이지 왼쪽 위에 보여요. 지난 페이지를 넘겨 보면 그날 기준으로 세어 줘요.<br>페이지에 안 보이게 하려면 ⚙ 설정 → 👀 페이지에 보이는 것</p>
              </div>`;
            document.body.appendChild(el);
        }
        function ddRenderList() {
            const box = ddq('ddList'), today = new Date();
            if (!dd.list.length) { box.innerHTML = '<div class="dd-empty">⏳ 기다리는 날이 있나요?<br>여행, 시험, 생일, 우리가 만난 날 …</div>'; return; }
            box.innerHTML = dd.list.map((x, i) => {
                const c = ddCount(x, today);
                return `<div class="dd-card${c.big === 'D-DAY' ? ' today' : ''}">
                    <span class="dd-ico">${x.e || '⭐'}</span>
                    <div class="dd-mid"><b>${ddEsc(x.n)}</b><small>${c.sub}</small></div>
                    <div class="dd-big">${c.big}</div>
                    <div class="dd-acts">
                      <button type="button" class="${x.pin ? 'on' : ''}" onclick="ddPinToggle(${i})" title="페이지에 보이기">📌</button>
                      <button type="button" onclick="ddStick(${i})" title="오늘 일기에 붙이기">📔</button>
                      <button type="button" onclick="ddForm(${i})" title="고치기">✏️</button>
                      <button type="button" onclick="ddDel(${i})" title="지우기">🗑️</button>
                    </div>
                  </div>`;
            }).join('');
        }
        function ddForm(i) {
            const x = i === undefined ? { n: '', d: ddStr(new Date()), k: 'until', e: '⭐', pin: dd.list.filter(q => q.pin).length < DD_PIN_MAX } : dd.list[i];
            if (i === undefined && dd.list.length >= DD_MAX) { showMsg(`D-day 는 ${DD_MAX}개까지 만들 수 있어요.`); return; }
            dd.edit = { i, k: x.k || 'until', e: x.e || '⭐' };
            ddq('ddFormTitle').textContent = i === undefined ? '새 D-day' : 'D-day 고치기';
            ddq('ddName').value = x.n; ddq('ddDate').value = x.d; ddq('ddPin').checked = !!x.pin;
            ddKind(dd.edit.k); ddIcon(dd.edit.e);
            ddq("ddFormBox").hidden = false; ddq('ddAddBtn').hidden = true;
            setTimeout(() => ddq('ddName').focus(), 50);
        }
        function ddFormClose() { ddq("ddFormBox").hidden = true; ddq('ddAddBtn').hidden = false; dd.edit = null; }
        function ddKind(k) {
            dd.edit.k = k;
            document.querySelectorAll('#ddKinds button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
            ddq('ddDateLabel').textContent = k === 'since' ? '시작한 날 (1일째)' : k === 'yearly' ? '그날 (태어난 날 · 처음 날)' : '그날';
        }
        function ddIcon(e) { dd.edit.e = e; document.querySelectorAll('#ddIcons button').forEach(b => b.classList.toggle('on', b.dataset.e === e)); }
        function ddSave() {
            const n = ddq('ddName').value.trim(), d = ddq('ddDate').value;
            if (!n) { ddq('ddName').focus(); return; }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { showMsg('날짜를 골라 주세요.'); return; }
            let pin = ddq('ddPin').checked;
            const others = dd.list.filter((q, j) => q.pin && j !== dd.edit.i).length;
            if (pin && others >= DD_PIN_MAX) { pin = false; if (typeof toast === 'function') toast(`📌 페이지에는 ${DD_PIN_MAX}개까지 보여요`); }
            const x = { n, d, k: dd.edit.k, e: dd.edit.e, pin };
            if (dd.edit.i === undefined) dd.list.push(x); else dd.list[dd.edit.i] = x;
            ddWrite(); ddFormClose(); ddRenderList();
        }
        function ddPinToggle(i) {
            const x = dd.list[i];
            if (!x.pin && dd.list.filter(q => q.pin).length >= DD_PIN_MAX) { if (typeof toast === 'function') toast(`📌 페이지에는 ${DD_PIN_MAX}개까지 보여요`); return; }
            x.pin = !x.pin; ddWrite(); ddRenderList();
        }
        async function ddDel(i) {
            if (!(await showMsg(`'${ddEsc(dd.list[i].n)}' D-day 를 지울까요?`, true))) return;
            dd.list.splice(i, 1); ddWrite(); ddRenderList();
        }
        /* 📔 오늘 기준 카드를 다이어리에 붙이기 */
        function ddStick(i) {
            const x = dd.list[i], c = ddCount(x, new Date()), F = "'Jua','Gowun Dodum','Noto Sans KR',sans-serif";
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 110" width="220" height="110"><rect x="3" y="3" width="214" height="104" rx="20" fill="#fff" stroke="#ff9ab3" stroke-width="3"/>`
                + `<rect x="12" y="12" width="196" height="86" rx="14" fill="#fff4f7"/><text x="30" y="52" font-size="30">${x.e || '⭐'}</text>`
                + `<text x="72" y="44" font-size="15" fill="#8a5a6a" font-family="${F}">${ddEsc(x.n)}</text>`
                + `<text x="72" y="78" font-size="28" font-weight="bold" fill="#ff6b81" font-family="${F}">${c.big}</text></svg>`;
            if (typeof addImage !== 'function' || !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            if (!addImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (el) el.style.width = '170px';
            closeDday();
            if (typeof toast === 'function') toast('📔 D-day 카드를 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
        }

        function openDday() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            ddBuild(); dd.list = ddRead(); ddFormClose(); ddRenderList();
            ddq('ddayRoom').classList.add('show');
            document.body.classList.add('fc-lock');
        }
        function closeDday() {
            const r = ddq('ddayRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        /* 설정을 불러온 뒤 · 페이지를 바꿀 때 (js/elements.js 의 loadData 에서 불러요) */
        function ddRefresh() { dd.list = ddRead(); ddRender(); }
        window.openDday = openDday;
        window.ddRefresh = ddRefresh;
        window.ddStaticHtml = ddStaticHtml;
