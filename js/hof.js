/* 말랑달콤 다이어리 - js/hof.js
   🏆 명예의 전당 : 오락실 · 두뇌 게임 13가지의 이번 주 순위 · 역대 순위 (카페 → 게임 → 🏆 명예의 전당)
   - 모두의 점수는 '명예의 전당 서버'(구글 앱스크립트 · 명예의전당_앱스크립트.gs)가 모아요. 배포 주소를 HOF_API_URL 에 넣어요.
   - 점수 올리기 : 오락실에서 게임이 끝나면 '🏆 명예의 전당에 올리기' (로그인한 사람만 · 올릴지는 본인이 골라요)
     게임을 시작할 때 서버에서 '시작 표'를 받아 두었다가 함께 보내요 → 게임한 시간에 비해 말이 안 되는 점수는 서버가 받지 않아요
   - 닉네임 : 처음 올릴 때 한 번 정해요 (2~10자 · 한글 · 영어 · 숫자). 이메일 · 이름은 어디에도 보이지 않아요
   - 이번 주 순위는 한국 시간 월요일 0시에 새로 시작 · 지난주 1등은 👑 지난주 챔피언으로 남아요
   ※ 이 파일이 없거나 주소가 비어 있으면 명예의 전당만 '준비 중' (오락실은 그대로)
   ※ 파일 불러오는 순서: … → arcade → hof */

        const HOF_API_URL = 'https://script.google.com/macros/s/AKfycbw09fehZsA0pzy-jHserqhjMcHmJSqdvmbFSKEoDr76jDOulXZ1-ZTO7VrcatSFebnx/exec';                       // ← 명예의 전당 앱스크립트 웹 앱 주소 (https://script.google.com/macros/s/…/exec)
        const HOF_ERR = {
            auth: '☁ 로그인 정보를 확인하지 못했어요. 다이어리를 새로고침해 주세요.',
            network: '📶 명예의 전당에 연결하지 못했어요. 잠시 후 다시 해 주세요.',
            server: '⚠ 명예의 전당 서버에 문제가 생겼어요. 잠시 후 다시 해 주세요.',
            ticket: '이 판은 시작할 때 명예의 전당에 연결되지 않아서 올릴 수 없어요. 다음 판에 올려 주세요!',
            check: '이 점수는 확인이 안 돼서 올리지 못했어요.',
            often: '조금 전에 올렸어요. 잠시 뒤에 다시 올려 주세요.',
            nick_length: '닉네임은 2~10자로 지어 주세요.',
            nick_chars: '닉네임은 한글 · 영어 · 숫자 · _ 만 쓸 수 있어요.',
            nick_bad: '그 닉네임은 쓸 수 없어요. 다른 이름으로 지어 주세요.',
            nick_taken: '이미 누가 쓰고 있는 닉네임이에요.'
        };
        const hof = { built: false, open: false, game: 'shooter', tab: 'week', tickets: {}, cache: {}, nick: null, busy: false, pending: null };
        const hq = id => document.getElementById(id);
        const hofOn = () => !!HOF_API_URL;
        const hofLogged = () => typeof drive !== 'undefined' && drive.ready && !drive.guest && !!drive.token;
        const hofEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const hofNum = n => Number(n || 0).toLocaleString('ko-KR');

        async function hofCall(action, data) {
            try {
                const body = Object.assign({ action }, data || {});
                if (hofLogged()) body.token = drive.token;
                const res = await fetch(HOF_API_URL, { method: 'POST', body: JSON.stringify(body) });
                return await res.json();
            } catch (e) { return { ok: false, error: 'network' }; }
        }
        const hofGames = () => (typeof ARCADE_GAMES !== 'undefined' ? ARCADE_GAMES : []);

        /* ---------- 오락실과 연결 ---------- */
        /* 게임 시작 : 시작 표 받아 두기 (기다리지 않음 · 실패해도 게임은 그대로) */
        function hofStart(gameId) {
            delete hof.tickets[gameId];
            if (!hofOn() || !hofLogged()) return;
            hofCall('start', { game: gameId }).then(r => { if (r && r.ok) hof.tickets[gameId] = r.ticket; });
        }
        /* 게임 끝 화면에 넣을 버튼 */
        function hofOverBtn(gameId, score) {
            if (!hofOn() || !(score > 0)) return '';
            if (!hofLogged()) return '<p class="ar-hof-note">🏆 로그인하면 명예의 전당에 점수를 올릴 수 있어요</p>';
            hof.pending = { game: gameId, score, ticket: hof.tickets[gameId] };
            return '<button type="button" class="ar-btn hof" onclick="hofSubmit()">🏆 명예의 전당에 올리기</button>';
        }
        async function hofSubmit(nickJustSet) {
            const p = hof.pending; if (!p || hof.busy) return;
            const btn = document.querySelector('#arOverlay .ar-btn.hof');
            if (!p.ticket) return;
            hof.busy = true; if (btn) { btn.disabled = true; btn.textContent = '🏆 올리는 중…'; }
            const r = await hofCall('submit', { game: p.game, score: p.score, ticket: p.ticket });
            hof.busy = false;
            if (r.ok) {
                hof.pending = null; delete hof.cache[p.game];
                const me = r.me || {}, w = me.week, a = me.all;
                const head = r.newWeek ? '🎉 이번 주 기록을 세웠어요!' : `이번 주 기록(${hofNum(r.weekBest)}점)이 더 높아서 그대로예요`;
                const ranks = [w ? `이번 주 <b>${w.rank}위</b>` : '', a ? `역대 <b>${a.rank}위</b>` : ''].filter(Boolean).join(' · ');
                if (btn) btn.outerHTML = `<div class="ar-hof-done">${head}<br>${ranks}<br><button type="button" class="ar-btn ghost" onclick="openHof('${p.game}')">🏆 순위 보기</button></div>`;
                return;
            }
            if (btn) { btn.disabled = false; btn.textContent = '🏆 명예의 전당에 올리기'; }
            if (r.error === 'nick' && !nickJustSet) { hofAskNick(() => hofSubmit(true)); return; }
        }

        /* ---------- 닉네임 ---------- */
        function hofAskNick(after) {
            hofBuild();
            const w = hq('hofNickWrap');
            hq('hofNickInput').value = hof.nick || '';
            hq('hofNickErr').textContent = '';
            w.hidden = false; w.dataset.open = '1';
            hof.afterNick = after || null;
            setTimeout(() => hq('hofNickInput').focus(), 50);
        }
        async function hofSaveNick() {
            const v = hq('hofNickInput').value.trim(), b = hq('hofNickSave');
            b.disabled = true;
            const r = await hofCall('nick', { nick: v });
            b.disabled = false;
            if (!r.ok) { hq('hofNickErr').textContent = HOF_ERR[r.error] || HOF_ERR.server; return; }
            hof.nick = r.nick; hof.cache = {};
            hq('hofNickWrap').hidden = true;
            if (hof.afterNick) { const f = hof.afterNick; hof.afterNick = null; f(); }
            if (hof.open) hofLoad();
        }
        function hofCloseNick() { hq('hofNickWrap').hidden = true; hof.afterNick = null; }

        /* ---------- 명예의 전당 화면 ---------- */
        function hofBuild() {
            if (hof.built) return;
            hof.built = true;
            const el = document.createElement('div');
            el.id = 'hofRoom'; el.className = 'hof-room';
            const chip = g => `<button type="button" data-g="${g.id}" onclick="hofPick('${g.id}')">${g.icon} ${g.name}</button>`;
            el.innerHTML = `
              <div class="hof-bar"><span class="hof-sp"></span><b>🏆 명예의 전당</b><button class="hof-x" type="button" onclick="closeHof()" aria-label="닫기">✕</button></div>
              <div class="hof-wrap">
                <div class="hof-games">
                  <small>🕹️ 오락실</small><div class="hof-chips">${hofGames().filter(g => g.group !== 'brain').map(chip).join('')}</div>
                  <small>🧠 두뇌 게임</small><div class="hof-chips">${hofGames().filter(g => g.group === 'brain').map(chip).join('')}</div>
                </div>
                <div class="hof-tabs"><button type="button" data-t="week" onclick="hofTab('week')">📅 이번 주</button><button type="button" data-t="all" onclick="hofTab('all')">👑 역대</button></div>
                <div class="hof-champ" id="hofChamp" hidden></div>
                <div class="hof-list" id="hofList"></div>
                <div class="hof-me" id="hofMe"></div>
                <p class="hof-tip">💡 오락실에서 게임이 끝나면 <b>🏆 명예의 전당에 올리기</b>로 점수를 올려요. 이번 주 순위는 매주 월요일 0시에 새로 시작해요!</p>
              </div>`;
            document.body.appendChild(el);
            const nw = document.createElement('div');                       // 닉네임 창은 오락실 위에서도 뜨도록 따로
            nw.innerHTML = `<div class="hof-nick-wrap" id="hofNickWrap" hidden>
                <div class="hof-nick">
                  <b>🏆 명예의 전당 닉네임</b>
                  <p>순위표에 보일 이름이에요. (2~10자 · 한글 · 영어 · 숫자)<br>이메일이나 진짜 이름은 보이지 않아요.</p>
                  <input id="hofNickInput" maxlength="10" placeholder="예: 말랑공주" autocomplete="off">
                  <div class="hof-nick-err" id="hofNickErr"></div>
                  <button type="button" class="hof-go" id="hofNickSave" onclick="hofSaveNick()">정하기</button>
                  <button type="button" class="hof-later" onclick="hofCloseNick()">취소</button>
                </div>
              </div>`;
            document.body.appendChild(nw.firstElementChild);
            hq('hofNickInput').addEventListener('keydown', e => { if (e.key === 'Enter') hofSaveNick(); });
        }
        function hofPick(id) { hof.game = id; hofLoad(); }
        function hofTab(t) { hof.tab = t; hofRender(); }
        async function hofLoad() {
            document.querySelectorAll('#hofRoom .hof-chips button').forEach(b => b.classList.toggle('on', b.dataset.g === hof.game));
            const c = hof.cache[hof.game];
            if (c && Date.now() - c.at < 30000) { hofRender(); return; }
            hq('hofList').innerHTML = '<div class="hof-empty">🏆 순위를 불러오는 중…</div>'; hq('hofMe').innerHTML = ''; hq('hofChamp').hidden = true;
            const g = hof.game, r = await hofCall('board', { game: g });
            if (g !== hof.game) return;
            if (!r.ok) { hq('hofList').innerHTML = `<div class="hof-empty">${HOF_ERR[r.error] || HOF_ERR.server}</div>`; return; }
            hof.cache[g] = { at: Date.now(), r };
            if (r.me && r.me.nick) hof.nick = r.me.nick;
            hofRender();
        }
        function hofRender() {
            document.querySelectorAll('#hofRoom .hof-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === hof.tab));
            const c = hof.cache[hof.game]; if (!c) return;
            const r = c.r, list = hof.tab === 'week' ? r.week : r.all, mine = r.me && r.me.nick;
            const medal = i => ['🥇', '🥈', '🥉'][i] || (i + 1);
            const ch = hq('hofChamp');
            ch.hidden = !(hof.tab === 'week' && r.champ);
            if (r.champ) ch.innerHTML = `👑 지난주 챔피언 <b>${hofEsc(r.champ.n)}</b> · ${hofNum(r.champ.s)}점`;
            hq('hofList').innerHTML = list.length
                ? list.map((x, i) => `<div class="hof-row${i < 3 ? ' top' + (i + 1) : ''}${mine && x.n === mine ? ' me' : ''}"><span class="hof-rk">${medal(i)}</span><span class="hof-nm">${hofEsc(x.n)}</span><b>${hofNum(x.s)}</b></div>`).join('')
                : `<div class="hof-empty">${hof.tab === 'week' ? '이번 주에는 아직 아무도 없어요.<br>첫 번째 주인공이 되어 보세요! 🏆' : '아직 기록이 없어요.<br>첫 번째 주인공이 되어 보세요! 🏆'}</div>`;
            const me = hq('hofMe');
            if (!hofLogged()) { me.innerHTML = '☁ 로그인하면 내 순위를 볼 수 있어요'; return; }
            const m = r.me && (hof.tab === 'week' ? r.me.week : r.me.all);
            const cnt = hof.tab === 'week' ? r.weekCount : r.allCount;
            me.innerHTML = (m ? `나 <b>${hofEsc(r.me.nick)}</b> · <b>${m.rank}위</b> / ${hofNum(cnt)}명 · ${hofNum(m.score)}점`
                : (hof.tab === 'week' ? '이번 주에는 아직 내 기록이 없어요' : '아직 내 기록이 없어요'))
                + (r.me && r.me.nick ? ` <button type="button" class="hof-nick-btn" onclick="hofAskNick()">✏️ 닉네임</button>` : '');
        }
        function openHof(gameId) {
            if (!hofOn()) { if (typeof comingSoon === 'function') comingSoon('🏆 명예의 전당'); return; }
            if (typeof closeModal === 'function') closeModal('serviceModal');
            hofBuild();
            if (gameId) hof.game = gameId;
            hof.open = true;
            hq('hofRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            hofLoad();
        }
        function closeHof() {
            hof.open = false;
            const r = hq('hofRoom'); if (r) r.classList.remove('show');
            if (!(typeof ar !== 'undefined' && ar.open)) document.body.classList.remove('fc-lock');
        }
        window.openHof = openHof;
        window.hofStart = hofStart;
        window.hofOverBtn = hofOverBtn;
