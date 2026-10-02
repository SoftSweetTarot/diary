/* 말랑달콤 다이어리 - js/cycle.js
   🩷 생리 달력 : 생리한 날을 달력에 콕콕 기록하면 다음 생리 예정일 · 가임기를 미리 알려 줘요 (놀이터 → 매일 말랑 → 🩷 생리 달력)
   - 날짜를 누르면 : 생리 중 표시 · 양(적음 · 보통 · 많음) · 몸 상태(복통 · 두통 …)
   - 예측 : 최근 6번의 주기와 기간 평균으로 계산 (기록이 없으면 28일 주기 · 5일 기간으로 시작)
     배란일 = 다음 예정일 14일 전 · 가임기 = 배란일 5일 전 ~ 1일 뒤
   - 기록은 내 드라이브 설정(settings.json)에만 저장돼요 ('diary_cycle') · 게스트는 이 기기에만
     다이어리 페이지에는 아무것도 나오지 않아요
   ※ 예측은 참고용이에요. 피임이나 임신 계획에 쓰면 안 돼요.
   ※ 이 파일이 없어도 다이어리는 정상 동작 (생리 달력만 '준비 중') */

        const CY_KEY = 'diary_cycle', CY_LOCAL = 'malang_cycle';
        const CY_SYMPTOMS = [['cramp', '😣 복통'], ['head', '🤕 두통'], ['tired', '😪 피곤'], ['mood', '😤 예민'], ['skin', '😶 피부'], ['swell', '🎈 붓기'], ['crave', '🍫 식욕'], ['back', '🧍 허리']];
        const CY_FLOW = ['', '적음', '보통', '많음'];
        const cy = { built: false, y: 0, m: 0, d: {}, sel: '' };
        const cyq = id => document.getElementById(id);
        const cySync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;

        /* ---------- 날짜 ---------- */
        const cyKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const cyDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
        const cyAdd = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
        const cyDiff = (a, b) => Math.round((cyDate(cyKey(b)) - cyDate(cyKey(a))) / 86400000);

        /* ---------- 저장 ---------- */
        function cyRead() {
            let o = null;
            try { o = JSON.parse(cySync() ? store.getItem(CY_KEY) : localStorage.getItem(CY_LOCAL)); } catch (e) {}
            return o && typeof o === 'object' && o.d && typeof o.d === 'object' ? o.d : {};
        }
        function cyWrite() {
            Object.keys(cy.d).forEach(k => { const v = cy.d[k]; if (!v.p && !(v.s && v.s.length)) delete cy.d[k]; });
            const t = JSON.stringify({ d: cy.d });
            try { if (cySync()) store.setItem(CY_KEY, t); else localStorage.setItem(CY_LOCAL, t); } catch (e) {}
        }

        /* ---------- 계산 ---------- */
        function cyPeriods() {                         // 생리한 날 → [{ start, len }] (하루 빠져도 같은 생리로)
            const days = Object.keys(cy.d).filter(k => cy.d[k].p).sort();
            const out = [];
            days.forEach(k => {
                const last = out[out.length - 1], d = cyDate(k);
                if (last && cyDiff(cyAdd(last.start, last.len - 1), d) <= 2) last.len = cyDiff(last.start, d) + 1;
                else out.push({ start: d, len: 1 });
            });
            return out;
        }
        function cyStats() {
            const ps = cyPeriods(), today = cyDate(cyKey(new Date()));
            const gaps = [];
            for (let i = 1; i < ps.length; i++) { const g = cyDiff(ps[i - 1].start, ps[i].start); if (g >= 15 && g <= 60) gaps.push(g); }
            const avg = (a, def) => a.length ? Math.round(a.slice(-6).reduce((x, y) => x + y, 0) / Math.min(6, a.length)) : def;
            const done = ps.filter(p => cyDiff(cyAdd(p.start, p.len - 1), today) >= 2);     // 아직 진행 중인 생리는 기간 평균에서 빼기
            const cycle = avg(gaps, 28), len = avg(done.map(p => p.len), 5);
            const last = ps[ps.length - 1] || null;
            let next = null, late = 0;
            if (last) {
                next = cyAdd(last.start, cycle);
                if (cyDiff(next, today) > 0) late = cyDiff(next, today);           // 예정일이 지났어요
            }
            return { ps, cycle, len, last, next, late, today, real: gaps.length };
        }
        /* 달력에 그릴 예측 : 예정 생리일 · 가임기 · 배란일 (앞으로 3번) */
        function cyPredict(st) {
            const m = {};
            if (!st.last) return m;
            let start = st.late ? null : st.next;
            for (let i = 0; i < 3 && start; i++) {
                for (let j = 0; j < st.len; j++) { const k = cyKey(cyAdd(start, j)); if (!m[k]) m[k] = 'pp'; }
                const ov = cyAdd(start, -14);
                for (let j = -5; j <= 1; j++) { const k = cyKey(cyAdd(ov, j)); if (!m[k]) m[k] = j === 0 ? 'ov' : 'fe'; }
                start = cyAdd(start, st.cycle);
            }
            /* 지난 생리 다음 주기의 가임기도 (이번 달에 보이도록) */
            const ov0 = cyAdd(st.last.start, st.cycle - 14);
            for (let j = -5; j <= 1; j++) { const k = cyKey(cyAdd(ov0, j)); if (!m[k]) m[k] = j === 0 ? 'ov' : 'fe'; }
            return m;
        }

        /* ---------- 화면 ---------- */
        function cyBuild() {
            if (cy.built) return;
            cy.built = true;
            const el = document.createElement('div');
            el.id = 'cycleRoom'; el.className = 'cy-room';
            el.innerHTML = `
              <div class="cy-bar"><span class="cy-sp"></span><b>🩷 생리 달력</b><button class="cy-x" type="button" onclick="closeCycle()" aria-label="닫기">✕</button></div>
              <div class="cy-wrap">
                <div class="cy-now" id="cyNow"></div>
                <div class="cy-cal">
                  <div class="cy-head"><button type="button" onclick="cyMove(-1)" aria-label="지난달">‹</button><b id="cyTitle"></b><button type="button" onclick="cyMove(1)" aria-label="다음 달">›</button></div>
                  <div class="cy-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
                  <div class="cy-grid" id="cyGrid"></div>
                  <div class="cy-legend"><span><i class="l-p"></i>생리</span><span><i class="l-pp"></i>예정일</span><span><i class="l-fe"></i>가임기</span><span><i class="l-ov"></i>배란 예정</span></div>
                </div>
                <div class="cy-day" id="cyDay"></div>
                <div class="cy-stats" id="cyStats"></div>
                <p class="cy-note">💡 날짜를 누르고 <b>생리 중</b>을 켜 주세요. 기록이 쌓일수록 예측이 정확해져요.<br>⚠ 예측은 참고용이에요. 피임이나 임신 계획에 쓰면 안 돼요.<br>🔒 기록은 내 구글 드라이브에만 저장되고 다이어리 페이지에는 보이지 않아요.<span id="cyLockTip"></span></p>
              </div>`;
            document.body.appendChild(el);
        }
        function cyRender() {
            const st = cyStats(), pred = cyPredict(st), y = cy.y, m = cy.m, todayK = cyKey(new Date());
            /* 오늘 상태 */
            let now;
            const todayP = cy.d[todayK] && cy.d[todayK].p;
            const cur = st.ps.find(p => cyDiff(p.start, st.today) >= 0 && cyDiff(p.start, st.today) < p.len + 1 && todayP);
            if (!st.last) now = '<b>첫 기록을 해 볼까요?</b><small>생리를 시작한 날을 눌러 생리 중을 켜 주세요</small>';
            else if (todayP && cur) now = `<b>생리 ${cyDiff(cur.start, st.today) + 1}일째예요</b><small>따뜻하게 쉬어 가요 · 평균 ${st.len}일</small>`;
            else if (st.late) now = `<b>예정일이 ${st.late}일 지났어요</b><small>시작하면 그날을 눌러 기록해 주세요</small>`;
            else {
                const dd = cyDiff(st.today, st.next), p = pred[todayK];
                now = `<b>다음 생리까지 D-${dd}</b><small>${st.next.getMonth() + 1}월 ${st.next.getDate()}일 예정${p === 'fe' ? ' · 오늘은 가임기 예상' : p === 'ov' ? ' · 오늘은 배란 예정일' : ''}</small>`;
            }
            cyq('cyNow').innerHTML = `<span>🩷</span><div>${now}</div>`;
            /* 달력 */
            cyq('cyTitle').textContent = `${y}년 ${m + 1}월`;
            const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate();
            let h = '';
            for (let i = 0; i < first; i++) h += '<span class="cy-c cy-e"></span>';
            for (let d = 1; d <= last; d++) {
                const k = cyKey(new Date(y, m, d)), v = cy.d[k] || {}, p = v.p ? 'p' : pred[k] || '';
                h += `<button type="button" class="cy-c${p ? ' cy-' + p : ''}${k === todayK ? ' cy-today' : ''}${k === cy.sel ? ' cy-sel' : ''}" onclick="cyPick('${k}')">${d}${v.s && v.s.length ? '<i></i>' : ''}</button>`;
            }
            cyq('cyGrid').innerHTML = h;
            /* 고른 날 */
            const k = cy.sel || todayK, v = cy.d[k] || {}, dt = cyDate(k), fut = k > todayK;
            cyq('cyDay').innerHTML = `
              <div class="cy-day-h"><b>${dt.getMonth() + 1}월 ${dt.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][dt.getDay()]}요일</b>${fut ? '<small>앞날은 기록할 수 없어요</small>' : ''}</div>
              <button type="button" class="cy-pbtn${v.p ? ' on' : ''}" onclick="cyToggleP('${k}')" ${fut ? 'disabled' : ''}>${v.p ? '🩸 생리 중이에요 · 끄기' : '🩸 생리 중 켜기'}</button>
              ${v.p ? `<div class="cy-row"><small>양</small>${[1, 2, 3].map(f => `<button type="button" class="${v.f === f ? 'on' : ''}" onclick="cySetFlow('${k}',${f})">${'💧'.repeat(f)} ${CY_FLOW[f]}</button>`).join('')}</div>` : ''}
              <div class="cy-row cy-sym"><small>몸 상태</small>${CY_SYMPTOMS.map(([id, t]) => `<button type="button" class="${(v.s || []).includes(id) ? 'on' : ''}" onclick="cySym('${k}','${id}')" ${fut ? 'disabled' : ''}>${t}</button>`).join('')}</div>`;
            /* 통계 */
            cyq('cyStats').innerHTML = `<div><small>평균 주기</small><b>${st.cycle}일</b></div><div><small>평균 기간</small><b>${st.len}일</b></div><div><small>기록한 생리</small><b>${st.ps.length}번</b></div>`
                + (st.real < 2 ? '<p>기록이 2번 넘게 쌓이면 내 주기로 계산해요 (지금은 28일 기준)</p>' : '');
            const lockOn = (() => { try { return !!JSON.parse(store.getItem('diary_lock') || localStorage.getItem('malang_lock')); } catch (e) { return false; } })();
            cyq('cyLockTip').innerHTML = lockOn ? '' : '<br>🔐 <b>⚙ 설정 → 🔒 다이어리 잠금</b>을 켜 두면 더 안심이에요.';
        }
        function cyPick(k) { cy.sel = k; cyRender(); }
        function cyToggleP(k) {
            if (k > cyKey(new Date())) return;
            const v = cy.d[k] = cy.d[k] || {};
            if (v.p) { delete v.p; delete v.f; } else { v.p = 1; v.f = v.f || 2; }
            cyWrite(); cyRender();
        }
        function cySetFlow(k, f) { const v = cy.d[k]; if (!v || !v.p) return; v.f = f; cyWrite(); cyRender(); }
        function cySym(k, id) {
            if (k > cyKey(new Date())) return;
            const v = cy.d[k] = cy.d[k] || {}; v.s = v.s || [];
            v.s = v.s.includes(id) ? v.s.filter(x => x !== id) : v.s.concat(id);
            if (!v.s.length) delete v.s;
            cyWrite(); cyRender();
        }
        function cyMove(dir) { let m = cy.m + dir, y = cy.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } cy.y = y; cy.m = m; cyRender(); }

        function openCycle() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            cyBuild();
            cy.d = cyRead();
            const t = new Date(); cy.y = t.getFullYear(); cy.m = t.getMonth(); cy.sel = cyKey(t);
            cyq('cycleRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            cyRender();
        }
        function closeCycle() {
            const r = cyq('cycleRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        window.openCycle = openCycle;
