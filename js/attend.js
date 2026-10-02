/* 말랑달콤 다이어리 - js/attend.js
   📅 출석 도장판 : 하루에 한 번 도장을 꾹! (놀이터 → 매일 말랑 → 📅 출석 도장판)
   - 오늘 날짜에만 찍을 수 있어요. 지나간 날은 나중에 찍을 수 없어요.
   - 날마다 도장 그림이 달라요. (날짜로 정해져서 어느 기기에서 봐도 같은 그림)
   - 연속 7·14·21일, 한 달 개근이면 메달 도장이 생겨요.
   - 기록은 설정(settings.json)에 함께 저장 → 다른 기기에서도 같은 도장판. 로그인하지 않은(게스트) 때만 이 기기에 기억
   ※ 이 파일이 없어도 다이어리는 정상 동작 (출석 도장판만 '준비 중') */

        const AT_KEY = 'diary_attend';            // 설정 저장소 키 → { "2026-10": [1,2,5], ... }
        const AT_LOCAL = 'malang_attend';         // 게스트용 (이 기기)
        const AT_STAMPS = ['🐰', '🍓', '🌷', '⭐', '🐻', '🍑', '🌈', '🐥', '🍀', '🧁', '🐱', '🌙', '🍒', '🦊', '🌻', '🐶', '🍰', '🐳', '🎀', '🐹', '🍋', '🦄', '🌸', '🐧', '🍩', '☁️', '🐨', '🍉', '🌼', '🐼', '💖'];
        const AT_COLORS = ['#e8546e', '#f08a3c', '#e2a400', '#4caf7a', '#3d9be0', '#8a6be0', '#e06bb5'];
        const AT_MEDALS = [[7, '🥉', '7일 연속'], [14, '🥈', '14일 연속'], [21, '🥇', '21일 연속']];
        const atS = { built: false, y: 0, m: 0, d: null };
        const atq = id => document.getElementById(id);

        function atYm(y, m) { return y + '-' + String(m + 1).padStart(2, '0'); }
        function atToday() { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() }; }
        function atStamp(y, m, d) { const i = (y * 372 + m * 31 + d) * 7 % AT_STAMPS.length; return { e: AT_STAMPS[i], c: AT_COLORS[(y + m * 3 + d) % AT_COLORS.length] }; }

        /* ---------- 저장 ---------- */
        const atSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;     // 로그인 → 드라이브 설정 / 게스트 → 이 기기
        function atRead() {
            try { const o = JSON.parse(atSync() ? store.getItem(AT_KEY) : localStorage.getItem(AT_LOCAL)); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
        }
        function atWrite() {
            const t = JSON.stringify(atS.d);
            try { if (atSync()) store.setItem(AT_KEY, t); else localStorage.setItem(AT_LOCAL, t); } catch (e) {}
        }
        function atHas(y, m, d) { const a = atS.d[atYm(y, m)]; return !!a && a.includes(d); }

        /* 오늘(또는 어제)부터 거꾸로 이어진 날 수 */
        function atStreak() {
            const t = new Date(); t.setHours(12, 0, 0, 0);
            if (!atHas(t.getFullYear(), t.getMonth(), t.getDate())) t.setDate(t.getDate() - 1);   // 오늘 아직 안 찍었으면 어제부터
            let n = 0;
            while (atHas(t.getFullYear(), t.getMonth(), t.getDate())) { n++; t.setDate(t.getDate() - 1); }
            return n;
        }
        function atBest() {
            const days = [];
            Object.keys(atS.d).forEach(k => { const [y, m] = k.split('-').map(Number); atS.d[k].forEach(d => days.push(Date.UTC(y, m - 1, d) / 86400000)); });
            days.sort((a, b) => a - b);
            let best = 0, run = 0, prev = null;
            days.forEach(x => { run = prev !== null && x - prev === 1 ? run + 1 : 1; best = Math.max(best, run); prev = x; });
            return best;
        }

        /* ---------- 화면 ---------- */
        function atBuild() {
            if (atS.built) return;
            atS.built = true;
            const el = document.createElement('div');
            el.id = 'attendRoom'; el.className = 'at-room';
            el.innerHTML = `
              <div class="at-bar"><span class="at-sp"></span><b>📅 출석 도장판</b><button class="at-x" type="button" onclick="closeAttend()" aria-label="닫기">✕</button></div>
              <div class="at-wrap">
                <div class="at-board">
                  <div class="at-head">
                    <button type="button" class="at-nav" onclick="atMove(-1)" aria-label="지난달">‹</button>
                    <b id="atTitle"></b>
                    <button type="button" class="at-nav" id="atNext" onclick="atMove(1)" aria-label="다음 달">›</button>
                  </div>
                  <div class="at-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
                  <div class="at-grid" id="atGrid"></div>
                  <div class="at-count" id="atCount"></div>
                </div>
                <div class="at-stats">
                  <div><small>연속 출석</small><b id="atStreak">0</b>일</div>
                  <div><small>가장 긴 연속</small><b id="atBest">0</b>일</div>
                  <div><small>모은 도장</small><b id="atTotal">0</b>개</div>
                </div>
                <div class="at-medals" id="atMedals"></div>
                <button class="at-go" type="button" id="atGo" onclick="atPress()"></button>
                <p class="at-tip">💡 7·14·21일 연속이면 메달, 한 달 내내 오면 🏆 트로피를 받아요. 하루라도 빠지면 연속 기록은 처음부터 다시 시작돼요.<br>🌷 도장을 찍은 날 일기도 쓰면 화분에 물까지 줄 수 있어요.</p>
              </div>`;
            document.body.appendChild(el);
        }

        function atRender(pop) {
            const T = atToday(), y = atS.y, m = atS.m;
            atq('atTitle').textContent = `${y}년 ${m + 1}월`;
            atq('atNext').style.visibility = (y === T.y && m === T.m) ? 'hidden' : 'visible';
            const first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate();
            let h = '';
            for (let i = 0; i < first; i++) h += '<span class="at-cell at-empty"></span>';
            for (let d = 1; d <= last; d++) {
                const isT = y === T.y && m === T.m && d === T.d;
                const fut = y > T.y || (y === T.y && (m > T.m || (m === T.m && d > T.d)));
                const s = atStamp(y, m, d), has = atHas(y, m, d);
                h += `<span class="at-cell${isT ? ' at-today' : ''}${fut ? ' at-fut' : ''}${has ? ' at-on' : ''}${has && pop && isT ? ' at-pop' : ''}"><i>${d}</i>`
                    + (has ? `<em style="--c:${s.c}">${s.e}</em>` : '') + '</span>';
            }
            atq('atGrid').innerHTML = h;
            const cnt = (atS.d[atYm(y, m)] || []).length;
            const full = y === T.y && m === T.m ? T.d : last;                          // 이번 달은 오늘까지
            atq('atCount').innerHTML = cnt === last ? `🏆 <b>${m + 1}월 개근!</b> 한 달 내내 와 줬어요` : `${m + 1}월 도장 <b>${cnt}</b>개` + (cnt && cnt === full && y === T.y && m === T.m ? ' · 이번 달 하루도 안 빠졌어요!' : '');
            const streak = atStreak(), best = atBest();
            atq('atStreak').textContent = streak;
            atq('atBest').textContent = best;
            atq('atTotal').textContent = Object.values(atS.d).reduce((a, b) => a + b.length, 0);
            let md = AT_MEDALS.map(([n, ic, t]) => `<span class="${best >= n ? 'on' : ''}">${ic}<small>${t}</small></span>`).join('');
            const fullMonths = Object.keys(atS.d).filter(k => { const [yy, mm] = k.split('-').map(Number); return atS.d[k].length === new Date(yy, mm, 0).getDate(); }).length;
            md += `<span class="${fullMonths ? 'on' : ''}">🏆<small>한 달 개근${fullMonths > 1 ? ' ×' + fullMonths : ''}</small></span>`;
            atq('atMedals').innerHTML = md;
            const done = atHas(T.y, T.m, T.d), go = atq('atGo');
            go.disabled = done;
            go.innerHTML = done ? '오늘 도장 찍었어요 · 내일 또 만나요' : `${atStamp(T.y, T.m, T.d).e} 오늘 도장 꾹!`;
        }

        function atMove(dir) {
            const T = atToday();
            let y = atS.y, m = atS.m + dir;
            if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
            if (y > T.y || (y === T.y && m > T.m)) return;
            atS.y = y; atS.m = m; atRender();
        }

        function atPress() {
            const T = atToday();
            if (atHas(T.y, T.m, T.d)) return;
            const k = atYm(T.y, T.m);
            atS.d[k] = (atS.d[k] || []).concat(T.d).sort((a, b) => a - b);
            atWrite();
            atS.y = T.y; atS.m = T.m;
            atRender(true);
            const streak = atStreak(), medal = AT_MEDALS.find(([n]) => n === streak);
            const last = new Date(T.y, T.m + 1, 0).getDate();
            if ((atS.d[k] || []).length === last) toastAt(`🏆 ${T.m + 1}월 개근! 한 달 내내 와 줘서 고마워요`);
            else if (medal) toastAt(`${medal[1]} ${medal[2]} 출석! 메달 도장을 받았어요`);
            else if (streak > 1) toastAt(`${streak}일 연속 출석이에요!`);
            else toastAt('오늘도 와 줘서 고마워요!');
        }
        function toastAt(msg) { if (typeof toast === 'function') toast(msg); }

        function openAttend() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            atBuild();
            atS.d = atRead();
            const T = atToday(); atS.y = T.y; atS.m = T.m;
            atq('attendRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            atRender();
        }
        function closeAttend() {
            const r = atq('attendRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        function attendDone() { const T = atToday(), a = atRead()[atYm(T.y, T.m)]; return !!a && a.includes(T.d); }   // 오늘 도장 찍었나요?
        window.openAttend = openAttend;
        window.attendDone = attendDone;
