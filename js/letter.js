/* 말랑달콤 다이어리 - js/letter.js
   💌 익명 편지함 (놀이터 → 함께하기 → 💌 익명 편지함)
   - ✉️ 편지 쓰기 : 이름 없이 '어딘가의 말랑이'에게 편지를 보내요 (하루 3통 · 300자 · 편지지 5가지 · 스티커)
   - 📬 받은 편지 : 편지함을 열면 누군가의 편지가 하루 2통까지 도착해요 → 💌 답장 한 번 · 📌 다이어리에 붙이기 · 🚨 신고
   - 📤 보낸 편지 : 날아가는 중 / 도착했어요 / 답장이 왔어요
   - 편지는 '익명 편지함 서버'(구글 앱스크립트 · 익명편지함_앱스크립트.gs)가 배달해요. 배포 주소를 LB_API_URL 에 넣어요.
   - 로그인한 사람만 쓸 수 있어요 (구글 계정으로 진짜 사용자인지만 확인 · 이메일이나 이름은 보내지 않아요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (익명 편지함만 '준비 중') */

        const LB_API_URL = 'https://script.google.com/macros/s/AKfycbxjsaT_LZphZAkzx5PDTINh_uuEsSLaBb8c7KeBV_1wjV64Iv_MC99bk519sByxrjiv6A/exec';                       // ← 익명 편지함 앱스크립트 웹 앱 주소 (https://script.google.com/macros/s/…/exec)
        const LB_MAX = 300, LB_MIN = 5;
        const LB_PAPERS = [
            { id: 'pink', n: '분홍 하트', bg: '#fff0f5', line: '#ffd1e1', ac: '#ff7fa3', deco: '💗' },
            { id: 'sky', n: '하늘 구름', bg: '#eef7ff', line: '#cfe6ff', ac: '#5aa8e0', deco: '☁️' },
            { id: 'lemon', n: '레몬 별', bg: '#fffbe6', line: '#ffeaa0', ac: '#e0a800', deco: '⭐' },
            { id: 'mint', n: '민트 꽃', bg: '#ecfbf3', line: '#c4efd8', ac: '#3fae7a', deco: '🌼' },
            { id: 'lilac', n: '보라 달', bg: '#f5f0ff', line: '#e0d4ff', ac: '#8a6be0', deco: '🌙' }
        ];
        const LB_STICKERS = ['💌', '🌷', '🍀', '⭐', '🧸', '🍓', '🌙', '🎀'];
        const LB_IDEAS = [
            ['💪 응원', '오늘 하루도 정말 수고 많았어요. '],
            ['🍀 소확행', '요즘 나를 웃게 하는 작은 행복은요, '],
            ['🎧 추천', '요즘 자주 듣는 노래를 추천해 드릴게요. '],
            ['💭 고민', '요즘 이런 고민이 있는데, 당신이라면 어떻게 할까요? '],
            ['🌙 하루', '오늘 있었던 일을 들려줄게요. ']
        ];
        const LB_ERR = {
            auth: '로그인이 풀렸어요. 다이어리에 다시 로그인한 뒤 열어 주세요.',
            short: `편지를 조금만 더 적어 주세요. (${LB_MIN}자 이상)`, long: `편지는 ${LB_MAX}자까지 쓸 수 있어요.`,
            bad: '편지에 쓰면 안 되는 말이 들어 있어요. 따뜻한 말로 바꿔 주세요 🌷',
            info: '전화번호 · 아이디 · 인터넷 주소는 적을 수 없어요. 서로를 지키기 위한 약속이에요 🔒',
            limit: '오늘 보낼 수 있는 편지를 다 썼어요. 내일 또 써 주세요 💌',
            blocked: '신고가 쌓여서 지금은 편지를 쓸 수 없어요.',
            reply: '이 편지에는 답장할 수 없어요.', replied: '이미 답장을 보낸 편지예요.',
            network: '편지함 서버와 연결하지 못했어요. 잠시 후 다시 해 주세요.', server: '편지함 서버에 문제가 생겼어요. 잠시 후 다시 해 주세요.'
        };
        const lb = { built: false, tab: 'in', data: null, busy: false, paper: 'pink', sticker: '💌', replyTo: null, open: null };
        const lbq = id => document.getElementById(id);
        const lbLogged = () => typeof drive !== 'undefined' && drive.ready && !drive.guest && !!drive.token;
        const lbEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const lbPaper = id => LB_PAPERS.find(p => p.id === id) || LB_PAPERS[0];
        const lbWhen = at => { const m = /(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/.exec(at || ''); return m ? `${+m[2]}월 ${+m[3]}일 ${m[4]}:${m[5]}` : ''; };

        async function lbCall(action, data) {
            try {
                const body = Object.assign({ action, token: drive.token }, data || {});
                const res = await fetch(LB_API_URL, { method: 'POST', body: JSON.stringify(body) });
                return await res.json();
            } catch (e) { return { ok: false, error: 'network' }; }
        }
        /* 🔊 소리 (js/ritual.js 의 소리 도구를 빌려 써요) */
        function lbSfx(k) {
            if (typeof ritTone !== 'function') return;
            if (k === 'open') { ritNoise(.35, .08, 0, 2500, .8); [784, 988, 1319].forEach((f, i) => ritTone(f, 1, .09, 'sine', .25 + i * .1, RIT_BELL)); }
            if (k === 'send') { ritNoise(.6, .07, 0, 1500, .6); [523, 659, 784, 1047, 1319].forEach((f, i) => ritTone(f, .9, .1, 'triangle', .5 + i * .08)); }
            if (k === 'tap') ritTone(880, .15, .08, 'triangle');
        }

        /* ---------- 화면 ---------- */
        function lbBuild() {
            if (lb.built) return;
            lb.built = true;
            const el = document.createElement('div');
            el.id = 'lbRoom'; el.className = 'lb-room';
            el.innerHTML = `
              <div class="lb-bar"><button class="lb-x" type="button" id="lbBack" onclick="lbBackTo()" aria-label="뒤로" hidden>←</button><span class="lb-sp" id="lbSp"></span><b>💌 익명 편지함</b><button class="lb-x" type="button" onclick="closeLetterBox()" aria-label="닫기">✕</button></div>
              <div class="lb-wrap">
                <div class="lb-head"><span class="lb-post">📮</span><p>이름 없이 마음을 주고받는<br><b>말랑이들의 우체통</b></p></div>
                <div class="lb-tabs" id="lbTabs">
                  <button type="button" data-t="in" onclick="lbTab('in')">📬 받은 편지<i id="lbNew" hidden></i></button>
                  <button type="button" data-t="write" onclick="lbTab('write')">✉️ 편지 쓰기</button>
                  <button type="button" data-t="sent" onclick="lbTab('sent')">📤 보낸 편지</button>
                </div>
                <section id="lbIn" class="lb-sec"></section>
                <section id="lbWrite" class="lb-sec" hidden>
                  <div class="lb-replyto" id="lbReplyTo" hidden></div>
                  <div class="lb-sheet" id="lbSheet">
                    <span class="lb-stk" id="lbStk">💌</span>
                    <p class="lb-to" id="lbToLine">어딘가의 말랑이에게</p>
                    <textarea id="lbText" maxlength="${LB_MAX}" placeholder="이름 없이 마음을 전해 보세요.&#10;누군가에게 따뜻한 하루가 될 거예요."></textarea>
                    <p class="lb-from">— 익명의 말랑이가</p>
                  </div>
                  <div class="lb-count"><span id="lbLen">0</span> / ${LB_MAX}</div>
                  <div class="lb-ideas" id="lbIdeas">${LB_IDEAS.map(([t], i) => `<button type="button" onclick="lbIdea(${i})">${t}</button>`).join('')}</div>
                  <div class="lb-pick"><small>편지지</small><div id="lbPapers">${LB_PAPERS.map(p => `<button type="button" data-p="${p.id}" style="--bg:${p.bg};--ac:${p.ac}" onclick="lbSetPaper('${p.id}')" aria-label="${p.n}">${p.deco}</button>`).join('')}</div></div>
                  <div class="lb-pick"><small>스티커</small><div id="lbStks">${LB_STICKERS.map(s => `<button type="button" data-s="${s}" onclick="lbSetSticker('${s}')">${s}</button>`).join('')}</div></div>
                  <button class="lb-send" type="button" id="lbSendBtn" onclick="lbSend()">🕊️ 편지 보내기</button>
                  <p class="lb-rule">🔒 이름 · 전화번호 · 아이디 · 주소는 적지 마세요.<br>나쁜 말은 신고되고, 신고가 쌓이면 편지를 쓸 수 없어요.</p>
                </section>
                <section id="lbSent" class="lb-sec" hidden></section>
                <section id="lbRead" class="lb-sec" hidden></section>
              </div>`;
            document.body.appendChild(el);
            const ta = lbq('lbText');
            ta.addEventListener('input', () => { lbq('lbLen').textContent = ta.value.length; });
            lbSetPaper(lb.paper); lbSetSticker(lb.sticker);
        }
        function lbSecs(id) {
            ['lbIn', 'lbWrite', 'lbSent', 'lbRead'].forEach(s => { lbq(s).hidden = s !== id; });
            const reading = id === 'lbRead' || (id === 'lbWrite' && lb.replyTo);
            lbq('lbTabs').hidden = id === 'lbRead'; lbq('lbBack').hidden = !reading; lbq('lbSp').hidden = reading;
            lbq('lbRoom').scrollTop = 0;
        }
        function lbTab(t) {
            lb.tab = t; lb.replyTo = null;
            document.querySelectorAll('#lbTabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
            if (t === 'write') { lbq('lbReplyTo').hidden = true; lbq('lbToLine').textContent = '어딘가의 말랑이에게'; lbq('lbIdeas').hidden = false; lbq('lbSendBtn').textContent = '🕊️ 편지 보내기'; lbSecs('lbWrite'); return; }
            lbSecs(t === 'in' ? 'lbIn' : 'lbSent');
            lbRender();
        }
        function lbBackTo() { if (lb.replyTo) lbOpen(lb.replyTo); else lbTab('in'); }

        /* ---------- 편지함 불러오기 ---------- */
        async function lbLoad() {
            lbq('lbIn').innerHTML = lbq('lbSent').innerHTML = '<div class="lb-wait"><span>📮</span><p>우체통을 열어 보는 중…</p></div>';
            const r = await lbCall('box');
            if (!r || !r.ok) { lb.data = null; const m = `<div class="lb-empty">⚠️ ${LB_ERR[r && r.error] || LB_ERR.server}<br><button type="button" onclick="lbLoad()">🔄 다시 열기</button></div>`; lbq('lbIn').innerHTML = lbq('lbSent').innerHTML = m; return; }
            lb.data = r;
            lbRender();
        }
        function lbRender() {
            const d = lb.data; if (!d) return;
            const unread = d.inbox.filter(x => !x.read).length;
            lbq('lbNew').hidden = !unread; lbq('lbNew').textContent = unread;
            lbq('lbIn').innerHTML = d.inbox.length ? `<div class="lb-list">${d.inbox.map((x, i) => {
                const p = lbPaper(x.paper);
                return `<button type="button" class="lb-env${x.read ? ' read' : ''}" style="--bg:${p.bg};--ac:${p.ac};--d:${i * .06}s" onclick="lbOpen('${x.id}')">
                    <span class="lb-seal">${x.read ? x.sticker : '💗'}</span>
                    <span class="lb-env-t"><b>${x.reply ? '💌 내 편지에 온 답장' : x.read ? '어딘가의 말랑이' : '✨ 새 편지가 도착했어요'}</b><small>${lbWhen(x.at)}${x.replied ? ' · 답장 보냄' : ''}</small></span></button>`;
            }).join('')}</div>` : `<div class="lb-empty"><span>🕊️</span>아직 도착한 편지가 없어요.<br>편지는 매일 조금씩 배달돼요.<br>먼저 누군가에게 편지를 써 볼까요?<br><button type="button" onclick="lbTab('write')">✉️ 편지 쓰기</button></div>`;
            const ST = { flying: ['🕊️', '날아가는 중'], arrived: ['📬', '도착했어요'], replied: ['💌', '답장이 왔어요'] };
            lbq('lbSent').innerHTML = (d.left != null ? `<p class="lb-left">오늘 더 보낼 수 있는 편지 <b>${d.left}통</b></p>` : '') + (d.sent.length ? `<div class="lb-list">${d.sent.map(x => {
                const p = lbPaper(x.paper), s = ST[x.state] || ST.flying;
                return `<div class="lb-sent" style="--bg:${p.bg};--ac:${p.ac}"><span class="lb-sent-s">${x.sticker}</span><div><p>${lbEsc(x.text)}${x.text.length >= 60 ? '…' : ''}</p><small>${lbWhen(x.at)}</small></div><i class="st-${x.state}">${s[0]} ${s[1]}</i></div>`;
            }).join('')}</div>` : '<div class="lb-empty"><span>✉️</span>아직 보낸 편지가 없어요.</div>');
        }

        /* ---------- 편지 읽기 (봉투 열기) ---------- */
        function lbOpen(id) {
            const x = lb.data && lb.data.inbox.find(l => l.id === id); if (!x) return;
            lb.open = x; lb.replyTo = null;
            const p = lbPaper(x.paper), first = !x.read;
            lbq('lbRead').innerHTML = `
              <div class="lb-stage${first ? ' anim' : ''}">
                <div class="lb-envbig" style="--ac:${p.ac}"><i class="lb-flap"></i><span class="lb-seal2">💗</span></div>
                <article class="lb-letter" style="--bg:${p.bg};--line:${p.line};--ac:${p.ac}">
                  <span class="lb-stk">${x.sticker}</span>
                  ${x.reply ? `<p class="lb-orig">↪ 내가 보낸 편지 : “${lbEsc(x.orig)}${x.orig.length >= 60 ? '…' : ''}”</p>` : ''}
                  <p class="lb-to">${x.reply ? '편지를 보낸 말랑이에게' : '어딘가의 말랑이에게'}</p>
                  <div class="lb-body">${lbEsc(x.text).replace(/\n/g, '<br>')}</div>
                  <p class="lb-from">— 익명의 말랑이가 · ${lbWhen(x.at)}</p>
                </article>
              </div>
              <div class="lb-acts">
                ${!x.reply && !x.replied ? `<button type="button" class="lb-main" onclick="lbReply('${x.id}')">💌 답장하기</button>` : ''}
                <button type="button" onclick="lbStick()">📌 다이어리에 붙이기</button>
              </div>
              <button type="button" class="lb-report" onclick="lbReport('${x.id}')">🚨 이 편지 신고하기</button>`;
            lbSecs('lbRead');
            if (first) {
                lbSfx('open');
                x.read = true; lbCall('read', { id }); lbRender();
            }
        }
        function lbReply(id) {
            const x = lb.data.inbox.find(l => l.id === id); if (!x) return;
            lb.replyTo = id;
            document.querySelectorAll('#lbTabs button').forEach(b => b.classList.remove('on'));
            lbq('lbReplyTo').hidden = false;
            lbq('lbReplyTo').innerHTML = `↪ 받은 편지 : “${lbEsc(x.text.slice(0, 50))}${x.text.length > 50 ? '…' : ''}”`;
            lbq('lbToLine').textContent = '편지를 보내 준 말랑이에게';
            lbq('lbIdeas').hidden = true;
            lbq('lbSendBtn').textContent = '💌 답장 보내기';
            lbSecs('lbWrite');
        }
        async function lbReport(id) {
            if (!(await showMsg('이 편지를 신고할까요?<br><span style="font-size:12px;color:#777;">신고한 편지는 내 편지함에서 사라지고,<br>신고가 쌓인 사람은 편지를 쓸 수 없게 돼요.</span>', true))) return;
            const r = await lbCall('report', { id });
            if (!r || !r.ok) { showMsg('⚠️ ' + (LB_ERR[r && r.error] || LB_ERR.server)); return; }
            lb.data.inbox = lb.data.inbox.filter(l => l.id !== id);
            toast('🚨 신고했어요. 알려 줘서 고마워요');
            lbTab('in');
        }

        /* ---------- 편지 쓰기 ---------- */
        function lbIdea(i) { const ta = lbq('lbText'); if (!ta.value.trim()) { ta.value = LB_IDEAS[i][1]; lbq('lbLen').textContent = ta.value.length; } ta.focus(); }
        function lbSetPaper(id) {
            lb.paper = id; const p = lbPaper(id), s = lbq('lbSheet');
            s.style.setProperty('--bg', p.bg); s.style.setProperty('--line', p.line); s.style.setProperty('--ac', p.ac);
            document.querySelectorAll('#lbPapers button').forEach(b => b.classList.toggle('on', b.dataset.p === id));
        }
        function lbSetSticker(s) { lb.sticker = s; lbq('lbStk').textContent = s; document.querySelectorAll('#lbStks button').forEach(b => b.classList.toggle('on', b.dataset.s === s)); }
        async function lbSend() {
            if (lb.busy) return;
            const text = lbq('lbText').value.trim();
            if (text.length < LB_MIN) { toast('✉️ ' + LB_ERR.short); return; }
            lb.busy = true; const btn = lbq('lbSendBtn'), label = btn.textContent; btn.disabled = true; btn.textContent = '🕊️ 보내는 중…';
            const r = await lbCall('send', { text, paper: lb.paper, sticker: lb.sticker, replyTo: lb.replyTo || '' });
            lb.busy = false; btn.disabled = false; btn.textContent = label;
            if (!r || !r.ok) { showMsg('⚠️ ' + (LB_ERR[r && r.error] || LB_ERR.server)); return; }
            const wasReply = lb.replyTo;
            await lbFly();
            lbq('lbText').value = ''; lbq('lbLen').textContent = '0';
            toast(wasReply ? '💌 답장을 보냈어요!' : '🕊️ 편지가 어딘가의 말랑이에게 날아가요!');
            lb.replyTo = null;
            await lbLoad();
            lbTab(wasReply ? 'in' : 'sent');
        }
        /* 편지가 접혀서 봉투째 날아가는 연출 */
        function lbFly() {
            return new Promise(res => {
                const s = lbq('lbSheet'), r = s.getBoundingClientRect(), fx = document.createElement('div');
                fx.className = 'lb-fly'; fx.style.left = (r.left + r.width / 2) + 'px'; fx.style.top = (r.top + r.height / 2) + 'px';
                fx.innerHTML = '<span class="lb-fly-env">✉️</span>' + Array.from({ length: 8 }, (_, i) => `<i style="--i:${i}">${['💗', '✨', '💌', '⭐'][i % 4]}</i>`).join('');
                s.classList.add('fold'); lbSfx('send');
                setTimeout(() => { document.body.appendChild(fx); }, 450);
                setTimeout(() => { fx.remove(); s.classList.remove('fold'); res(); }, 2100);
            });
        }

        /* ---------- 📌 다이어리에 붙이기 : 편지지 그림 ---------- */
        function lbWrap(text, n, max) {
            const out = [];
            text.split('\n').forEach(par => { let line = ''; [...par].forEach(ch => { line += ch; if (line.length >= n) { out.push(line); line = ''; } }); out.push(line); });
            if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].slice(0, n - 1) + '…'; }
            return out;
        }
        function lbCardSvg(x) {
            const p = lbPaper(x.paper), F = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif", EF = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
            const lines = lbWrap(x.text, 15, 9), top = 86, gap = 24;
            const rules = Array.from({ length: 10 }, (_, i) => `<line x1="24" x2="256" y1="${top + 6 + i * gap}" y2="${top + 6 + i * gap}" stroke="${p.line}" stroke-width="1.5"/>`).join('');
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 360" width="280" height="360">
<rect x="4" y="4" width="272" height="352" rx="14" fill="${p.bg}" stroke="${p.line}" stroke-width="3"/>
<rect x="4" y="4" width="272" height="10" rx="5" fill="${p.ac}" opacity=".55"/>
${rules}
<text x="246" y="54" font-size="30" text-anchor="middle" font-family="${EF}">${x.sticker}</text>
<text x="24" y="60" font-size="14" fill="${p.ac}" font-family="${F}" font-weight="bold">${x.reply ? '편지를 보낸 말랑이에게' : '어딘가의 말랑이에게'}</text>
${lines.map((l, i) => `<text x="26" y="${top + i * gap}" font-size="15" fill="#5a3d4a" font-family="${F}">${lbEsc(l)}</text>`).join('')}
<text x="256" y="336" font-size="12" text-anchor="end" fill="#9a7a88" font-family="${F}">— 익명의 말랑이가 · ${lbEsc(lbWhen(x.at))}</text>
</svg>`;
        }
        function lbStick() {
            const x = lb.open; if (!x) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            if (!addImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lbCardSvg(x)))) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (el) el.style.width = '170px';
            closeLetterBox();
            toast('💌 편지를 다이어리에 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
        }

        function openLetterBox() {
            if (!LB_API_URL) { comingSoon('💌 익명 편지함'); return; }
            if (!lbLogged()) { showMsg('💌 익명 편지함은 구글 로그인을 해야 쓸 수 있어요.<br><span style="font-size:12px;color:#777;">편지를 주고받으려면 진짜 말랑이인지 확인이 필요해요.<br>(이메일이나 이름은 보내지 않아요)</span>'); return; }
            if (typeof closeModal === 'function') closeModal('serviceModal');
            lbBuild();
            lbq('lbRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            lbTab('in'); lbLoad();
        }
        function closeLetterBox() {
            const r = lbq('lbRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        window.openLetterBox = openLetterBox;
