/* 말랑달콤 다이어리 - js/wall.js
   🖼️ 말랑달콤 배경화면 (카페 → 🖼️ 말랑달콤 배경화면)
   - 움직이는 배경화면(휴대폰 · PC)을 보여 주고, 말랑달콤 1:1 오픈채팅방에서 팔아요
       사용자 : 채팅방에 "배경화면 3번 말랑XXXX"(번호 + 내 저금 코드)를 보내고 카카오페이로 송금
       주인   : 📱 저금 확인 앱 → 코드로 찾기 → 🎁 아이템 주기 → 🖼️ 배경화면 번호 선택 → 보내기 (자동)
       → 서버가 드라이브 '배경화면N' 폴더 링크를 전해요 → 다이어리에 '배경화면이 도착했어요' 창(링크 포함) + 이 창의 '받기' 버튼에도 링크 (wlGift · wlLinkPop)
       받은 배경화면은 이 기기에 `malang_mywalls` 로 남겨 두고, 로그인할 때마다 서버 답(walls)으로 새로 맞춰요 (wlSetMine)
   - 목록 : '말랑달콤 사람들' 시트의 '배경화면' 탭 (말랑달콤사람들_앱스크립트.gs · 주소?action=walls · 로그인 없이 누구나)
       그림 · 미리보기 영상은 주인의 구글 드라이브에 있어요 (깃허브에는 올리지 않아요)
       목록 카드 : 드라이브 그림(jpg)을 기기 안에 (📱 휴대폰 탭 = 휴대폰 · 💻 PC 탭 = 아이패드) · 누르면 크게 보기 · 움직이는 모습은 네이버 카페(말랑달콤 모임방)에서 홍보해요
   - 다이어리를 열고 3초 뒤 · ☕ 카페를 열 때 목록을 미리 받아 둬요 (wlPrefetch) · 지난번 목록은 이 기기에 남겨 두고 열자마자 보여 줘요
   - 📖 설정 방법 : wallguide.html (사기 전에 내 기기에서 되는지 확인 · 채팅방에서 파일 보낼 때 이 주소도 함께)
   - 채팅방 주소 · QR 코드는 💗 저금통과 같아요 (an.txt · js/piggy.js 의 pigLoadChat · pigQr)
   - 휴대폰 : 버튼 하나로 '배경화면 N번' 복사 + 채팅방 열기 · PC · 태블릿 : 휴대폰으로 찍는 QR 코드
   ※ 이 파일이 없으면 배경화면 버튼을 눌러도 아무 일도 없어요 (다이어리는 정상) */

        const wl = { items: [], tab: '', pick: null, at: 0, loading: null };
        const WL_FRESH = 60000;
        const WL_MINE = 'malang_mywalls';                 // 내가 받은 배경화면 { 번호: { n: 이름, u: 드라이브 폴더 링크 } }
        const wlLinkOk = u => typeof u === 'string' && /^https:\/\/drive\.google\.com\/[\w\-\/?=&.%]+$/.test(u);
        let wlMine = {};
        try { const m = JSON.parse(localStorage.getItem(WL_MINE)); if (m && typeof m === 'object') Object.keys(m).forEach(k => { if (+k > 0 && m[k] && wlLinkOk(m[k].u)) wlMine[k] = { n: String(m[k].n || '').slice(0, 30), u: m[k].u }; }); } catch (e) {}
        const wlMineSave = () => { try { localStorage.setItem(WL_MINE, JSON.stringify(wlMine)); } catch (e) {} };
        const WL_LOCAL = 'malang_walls';                 // 지난번 목록 (열자마자 바로 보여 주고, 뒤에서 새 목록으로 바꿔요)
        try { const c = JSON.parse(localStorage.getItem(WL_LOCAL)); if (Array.isArray(c)) wl.items = c; } catch (e) {}
        /* 불러오는 중 그림 : 카페 버튼과 같은 움직이는 폰 */
        const WL_PHONE = `<svg class="wl-ico wl-wait-ico" viewBox="7 1 26 38" aria-hidden="true">
            <defs><linearGradient id="wlWaitG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffc2d6"/><stop offset=".5" stop-color="#d9c8ff"/><stop offset="1" stop-color="#bfe6ff"/></linearGradient>
            <clipPath id="wlWaitC"><rect x="10.5" y="5.5" width="19" height="29" rx="3.5"/></clipPath></defs>
            <rect x="8.5" y="2.5" width="23" height="35" rx="6" fill="#fff" stroke="#ff8fb1" stroke-width="2.2"/>
            <g clip-path="url(#wlWaitC)"><rect class="wl-ico-sky" x="0" y="0" width="60" height="60" fill="url(#wlWaitG)"/>
            <g class="wl-ico-cloud" fill="#fff"><circle cx="15" cy="27" r="3"/><circle cx="19" cy="25.5" r="3.6"/><circle cx="23" cy="27" r="3"/><rect x="15" y="27" width="8" height="3"/></g></g>
            <path class="wl-ico-heart" d="M20 19.5 C15.5 16.5 16 12.5 18.3 12.5 C19.3 12.5 20 13.4 20 14 C20 13.4 20.7 12.5 21.7 12.5 C24 12.5 24.5 16.5 20 19.5Z" fill="#ff6b93"/>
            <rect x="17" y="3.6" width="6" height="1.6" rx=".8" fill="#ffc2d6"/></svg>`;
        const wlWon = n => n.toLocaleString('ko-KR') + '원';
        const wlEsc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
        const wlImg = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w}`;
        const wlImg2 = (id, w) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;     // 첫 주소가 안 될 때

        async function wlLoad() {
            try {
                const res = await fetch(MEMBER_API_URL + '?action=walls', { credentials: 'omit' });
                const j = await res.json();
                if (!j || !j.ok || !Array.isArray(j.items)) throw 0;
                wl.items = j.items; wl.at = Date.now();
                try { localStorage.setItem(WL_LOCAL, JSON.stringify(j.items)); } catch (e) {}
            } catch (e) { if (!(wl.items && wl.items.length)) wl.items = null; wl.at = 0; }   // 못 받으면 지난번 목록은 그대로
        }
        /* 카페를 열 때 · 배경화면을 열 때 : 받아 둔 지 1분이 넘었으면 새로 받기 (받는 중이면 그걸 기다려요) */
        function wlPrefetch() {
            if (wl.loading) return wl.loading;
            if (wl.items && wl.at && Date.now() - wl.at < WL_FRESH) return Promise.resolve();
            wl.loading = wlLoad().finally(() => { wl.loading = null; });
            return wl.loading;
        }

        function wlRender() {
            const box = document.getElementById('wlBody'); if (!box) return;
            const list = wl.items || [], items = list.filter(w => w.kind === wl.tab);
            const count = k => list.filter(w => w.kind === k).length;
            const size = wl.tab === 'pc' ? 640 : 360;
            box.innerHTML = `
              <div class="wl-hero">
                <div class="wl-hero-t">✨ 매일 보는 화면을 말랑달콤하게</div>
                <div class="wl-hero-s">움직이는 모습은 <a href="#" class="wl-link" onclick="goCafe(); return false;">👭 말랑달콤 모임방</a>에서 볼 수 있어요</div>
                <button type="button" class="btn wl-guide" onclick="wlGuide()">📖 내 기기에 설정하는 방법</button>
              </div>
              <div class="pg-tabs">
                <button type="button" class="pg-tab${wl.tab === 'phone' ? ' on' : ''}" onclick="wlTab('phone')">📱 휴대폰 <small>${count('phone')}가지</small></button>
                <button type="button" class="pg-tab${wl.tab === 'pc' ? ' on' : ''}" onclick="wlTab('pc')">💻 PC <small>${count('pc')}가지</small></button>
              </div>
              ${wl.items === null ? '<p class="wl-empty">목록을 불러오지 못했어요.<br>잠시 후 다시 열어 주세요</p>'
                : !items.length ? '<p class="wl-empty">🌸 곧 예쁜 배경화면이 찾아와요!<br>조금만 기다려 주세요</p>'
                : `<div class="wl-grid ${wl.tab}">${items.map(w => `
                  <div class="wl-card">
                    <button type="button" class="wl-pre wl-dev ${wl.tab}" onclick="wlView(${w.no})" aria-label="${wlEsc(w.name)} 크게 보기"><span class="wl-scr">
                      <img src="${wlImg(w.img, size)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="if(!this.dataset.b){this.dataset.b=1;this.src='${wlImg2(w.img, size)}'}"></span>
                    </button>
                    <div class="wl-name">${wlEsc(w.name)}</div>
                    ${wlMine[w.no] ? `<div class="wl-buy own"><b>✅ 내 배경화면</b><button type="button" class="btn wl-get own" onclick="wlLinkPop(${w.no})">🎁 받기</button></div>`
                    : `<div class="wl-buy"><b>${wlWon(w.price)}</b><button type="button" class="btn wl-get" onclick="wlPick(${w.no})">💬 구입</button></div>`}
                  </div>`).join('')}</div>`}
              <div class="wl-note">🎁 결제가 확인되면 <b>다운로드 링크</b>가 도착해요 · 받으면 계속 쓸 수 있어요<br>사기 전에 <a href="#" class="wl-link" onclick="wlGuide(); return false;">📖 설정 방법</a>으로 내 기기에서 되는지 확인해 주세요 😊</div>
              <div class="wl-sheet" id="wlSheet" hidden></div>
              <div class="wl-view" id="wlView" hidden onclick="if(event.target===this)wlUnview()"></div>`;
        }

        function wlTab(t) { wl.tab = t; wlRender(); }
        function wlGuide() {
            const d = typeof prDevice === 'function' ? prDevice() : 'PC', ios = /iPhone|iPad/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
            window.open('wallguide.html#' + (d === 'PC' ? 'pc' : ios ? 'iphone' : 'galaxy'), '_blank');
        }

        /* 🔍 크게 보기 */
        function wlView(no) {
            const w = (wl.items || []).find(x => x.no === no), v = document.getElementById('wlView');
            if (!w || !v) return;
            v.innerHTML = `
              <div class="wl-view-box ${w.kind}">
                <div class="wl-view-frame wl-dev ${w.kind}"><span class="wl-scr"><img src="${wlImg(w.img, 1080)}" alt="" referrerpolicy="no-referrer" onerror="if(!this.dataset.b){this.dataset.b=1;this.src='${wlImg2(w.img, 1080)}'}"></span></div>
                <div class="wl-view-t">${wlEsc(w.name)} <b>${wlMine[w.no] ? '✅ 내 배경화면' : wlWon(w.price)}</b></div>
                <div class="wl-view-s">움직이는 모습은 <a href="#" class="wl-link" onclick="goCafe(); return false;">👭 말랑달콤 모임방</a>에서 볼 수 있어요</div>
                <div class="wl-view-btns">
                  <button type="button" class="btn" onclick="wlUnview()">닫기</button>
                  <button type="button" class="btn btn-primary pg-copy" onclick="wlUnview(); ${wlMine[w.no] ? 'wlLinkPop' : 'wlPick'}(${w.no})">${wlMine[w.no] ? '🎁 받기' : '💬 구입'}</button>
                </div>
              </div>`;
            v.hidden = false;
        }
        function wlUnview() { const v = document.getElementById('wlView'); if (v) { v.hidden = true; v.innerHTML = ''; } }

        /* 💬 구입 (아직 안 산 배경화면) : 사는 방법 안내 (휴대폰은 버튼 · PC · 태블릿은 QR) — 채팅에는 번호와 내 저금 코드를 함께 보내요 (주인이 코드로 찾아서 링크를 보내 줘요) */
        async function wlCode() {                         // 내 저금 코드 (로그인했을 때만 · 접속 신호의 답을 기다려요, 최대 20초)
            if (typeof pr !== 'undefined' && pr.code) return pr.code;
            if (typeof drive === 'undefined' || !drive.ready || drive.guest) return '';
            for (let i = 0; i < 40 && !(typeof pr !== 'undefined' && pr.code); i++) {
                if (i === 6 && typeof prHere === 'function') prHere();
                await new Promise(r => setTimeout(r, 500));
            }
            return typeof pr !== 'undefined' ? pr.code || '' : '';
        }
        async function wlPick(no) {
            const w = (wl.items || []).find(x => x.no === no), sh = document.getElementById('wlSheet');
            if (!w || !sh) return;
            wl.pick = w;
            const phone = (typeof prDevice === 'function' ? prDevice() : '') === '휴대폰';
            const head = `<div class=\"wl-sheet-t\">${wlEsc(w.name)} <b>${wlWon(w.price)}</b></div>`;
            const close = '<button type=\"button\" class=\"btn wl-close\" onclick=\"wlUnpick()\">다른 배경화면 보기</button>';
            sh.innerHTML = `<div class=\"wl-sheet-box\">${head}<p class=\"pg-send-wait\">내 저금 코드를 확인하는 중…</p>${close}</div>`;
            sh.hidden = false;
            sh.querySelector('.wl-sheet-box').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            const code = await wlCode();
            if (wl.pick !== w) return;
            if (!code) { sh.innerHTML = `<div class=\"wl-sheet-box\">${head}<p class=\"pg-send-wait\">🔑 구글로 로그인하면 배경화면 링크를 <b>자동으로</b> 받을 수 있어요.<br>로그인한 뒤에 다시 눌러 주세요 😊</p>${close}</div>`; return; }
            w.msg = `배경화면 ${w.no}번 ${code}`;
            sh.innerHTML = `
              <div class=\"wl-sheet-box\">${head}
                <ol class=\"pg-steps\">
                  <li><b>채팅방에 \"${w.msg}\"을 보내요</b><br><span>내 저금 코드가 함께 가야 누구에게 보낼지 알 수 있어요</span></li>
                  <li><b>카카오페이로 ${wlWon(w.price)}을 송금해요</b><br><span>🔒 오픈채팅 송금은 서로 실명이 보이지 않아요</span></li>
                  <li><b>확인되면 이 다이어리에 링크가 도착해요</b><br><span>🎁 선물 창이 뜨고 · 이 창의 <b>받기</b> 버튼에서도 볼 수 있어요</span></li>
                </ol>
                <div id=\"wlSend\">${phone ? '' : '<div class=\"pg-qr\" id=\"wlQr\"><span>QR 코드를 만드는 중…</span></div>'}</div>
                ${phone ? '' : `<p class=\"wl-pc\">카카오페이 송금은 <b>휴대폰 카카오톡</b>에서만 돼요.<br>QR 코드를 휴대폰 카메라로 찍으면 채팅방이 열려요.<br>채팅에는 <b>${w.msg}</b> 라고 적어 주세요.</p>`}
                ${close}
              </div>`;
            if (typeof pig !== 'undefined' && !pig.chat && typeof pigLoadChat === 'function') await pigLoadChat();
            const chat = typeof pig !== 'undefined' ? pig.chat : '';
            if (wl.pick !== w) return;
            const send = document.getElementById('wlSend');
            if (!chat) { send.innerHTML = '<p class=\"pg-send-wait\">채팅방 주소를 불러오지 못했어요.<br>잠시 후 다시 열어 주세요</p>'; return; }
            if (phone) send.innerHTML = `<button type=\"button\" class=\"btn btn-primary pg-copy pg-go\" onclick=\"wlGo()\">💌 채팅방 열기 <small>(\"${w.msg}\" 복사)</small></button>`;
            else pigQr(chat, 'wlQr');
        }
        function wlUnpick() { wl.pick = null; const sh = document.getElementById('wlSheet'); if (sh) sh.hidden = true; }
        function wlGo() {
            const w = wl.pick, chat = typeof pig !== 'undefined' ? pig.chat : '';
            if (!w || !chat) return;
            const msg = w.msg || `배경화면 ${w.no}번`;
            try { navigator.clipboard.writeText(msg).catch(() => {}); } catch (e) {}
            window.open(chat, '_blank');
            toast(`📋 "${msg}"을 복사했어요. 채팅에 붙여 넣어 주세요 💕`);
        }

        /* ---------- 🎁 내가 받은 배경화면 : 서버가 알려 준 목록으로 맞추기 · 도착 신호 · 링크 창 ---------- */
        const wlOpen = () => { const m = document.getElementById('wallModal'); return !!m && m.style.display === 'flex'; };
        function wlRefresh() {                                // 창이 열려 있으면 받은 표시를 바로 반영 (사는 방법 · 크게 보기를 보는 중이면 건드리지 않아요)
            const v = document.getElementById('wlView');
            if (wlOpen() && !wl.pick && (!v || v.hidden)) wlRender();
        }
        function wlSetMine(list) {                            // 로그인 신호의 답 : 서버 목록이 기준 [{ no, n, u }]
            const m = {};
            (Array.isArray(list) ? list : []).forEach(x => { const no = parseInt(x && x.no, 10); if (no > 0 && x && wlLinkOk(x.u)) m[no] = { n: String(x.n || '').slice(0, 30), u: x.u }; });
            if (JSON.stringify(m) === JSON.stringify(wlMine)) return;
            wlMine = m; wlMineSave(); wlRefresh();
        }
        function wlGift(g) {                                  // 🎁 도착 신호 g.w = { 번호: [이름, 링크] } → 목록에 더하고 · 도착 창
            if (!g || typeof g !== 'object') return;
            const got = [];
            Object.keys(g).forEach(k => { const v = g[k], no = parseInt(k, 10); if (no > 0 && Array.isArray(v) && wlLinkOk(v[1])) { wlMine[no] = { n: String(v[0] || '').slice(0, 30), u: v[1] }; got.push(no); } });
            if (!got.length) return;
            wlMineSave(); wlRefresh();
            wlLinkPop(got, true);
        }
        function wlLinkPop(nos, arrived) {                    // 이쁜 링크 창 (arrived : 선물이 막 도착했을 때 · 아니면 '받기' 버튼에서)
            nos = (Array.isArray(nos) ? nos : [nos]).filter(n => wlMine[n]);
            if (!nos.length) return;
            const old = document.getElementById('wlLinkPop'); if (old) old.remove();
            const hearts = Array.from({ length: 12 }, (_, i) => `<i style=\"--x:${Math.round(Math.cos(i / 12 * 6.283) * (60 + i % 3 * 18))}px;--y:${Math.round(-70 - Math.abs(Math.sin(i / 12 * 6.283)) * 60 - i % 4 * 10)}px;--d:${(i % 4) * .08}s\">${['💗', '✨', '💕', '⭐'][i % 4]}</i>`).join('');
            const short = u => u.replace(/^https:\/\//, '').replace(/\?.*$/, '');
            const el = document.createElement('div');
            el.id = 'wlLinkPop'; el.className = 'gp-wrap wl-lp' + (arrived ? '' : ' calm');
            el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
            el.innerHTML = `
              <div class=\"gp-card\">
                <div class=\"gp-ribbon\">${arrived ? 'SPECIAL GIFT' : 'MY WALLPAPER'}</div>
                ${arrived ? `<div class=\"gp-box\"><div class=\"gp-burst\">${hearts}</div>
                  <svg viewBox=\"0 0 120 110\" aria-hidden=\"true\">
                    <rect x=\"16\" y=\"50\" width=\"88\" height=\"56\" rx=\"8\" fill=\"#ff9fbb\"/><rect x=\"16\" y=\"50\" width=\"88\" height=\"12\" fill=\"#ff86a8\"/>
                    <rect x=\"52\" y=\"50\" width=\"16\" height=\"56\" fill=\"#ffe08a\"/>
                    <g class=\"gp-lid\"><rect x=\"8\" y=\"34\" width=\"104\" height=\"20\" rx=\"7\" fill=\"#ffb3c8\"/><rect x=\"52\" y=\"34\" width=\"16\" height=\"20\" fill=\"#ffe08a\"/>
                      <path d=\"M60 34 C44 14 30 22 40 32 C46 37 56 35 60 34Z M60 34 C76 14 90 22 80 32 C74 37 64 35 60 34Z\" fill=\"#ffd54f\" stroke=\"#f2b400\" stroke-width=\"2\"/><circle cx=\"60\" cy=\"33\" r=\"5\" fill=\"#f2b400\"/></g>
                  </svg></div>` : '<div class=\"wl-lp-ic\">📱</div>'}
                <div class=\"gp-t\">${arrived ? '🖼️ 배경화면이 도착했어요!' : '🖼️ 내 배경화면 링크'}</div>
                <p class=\"gp-s\">${arrived ? '구입해 주셔서 정말 정말 고마워요' : '아래 링크를 눌러 파일을 받아 주세요'}<br>링크를 누르면 <b>구글 드라이브</b>가 열려요</p>
                <ul class=\"gp-list\">
                  ${nos.map(n => { const m = wlMine[n]; return `<li><span>🖼️</span><div><b>${wlEsc(m.n || '배경화면 ' + n + '번')}</b>
                    <a class=\"wl-lp-url\" href=\"${wlEsc(m.u)}\" target=\"_blank\" rel=\"noopener\">${wlEsc(short(m.u))}</a>
                    <div class=\"wl-lp-btns\"><button type=\"button\" class=\"btn wl-lp-open\" data-n=\"${n}\">🔗 링크 열기</button><button type=\"button\" class=\"btn wl-lp-copy\" data-n=\"${n}\">📋 복사</button></div></div></li>`; }).join('')}
                </ul>
                <div class=\"gp-until\">💡 이 링크는 <b>📱 말랑달콤 배경화면</b> 창에서 구입한 배경화면의 <b>받기</b> 버튼을 눌러도 언제든 다시 볼 수 있어요</div>
                <button type=\"button\" class=\"btn btn-primary gp-close\">닫기</button>
              </div>`;
            const shut = () => { el.classList.add('out'); setTimeout(() => el.remove(), 260); };
            el.querySelector('.gp-close').onclick = shut;
            el.querySelectorAll('.wl-lp-open').forEach(b => { b.onclick = () => window.open(wlMine[b.dataset.n].u, '_blank', 'noopener'); });
            el.querySelectorAll('.wl-lp-copy').forEach(b => { b.onclick = async () => {
                const u = wlMine[b.dataset.n].u;
                if (typeof pigCopy === 'function') await pigCopy(u, '링크'); else { try { await navigator.clipboard.writeText(u); } catch (e) {} toast('📋 링크를 복사했어요'); }
                b.textContent = '✅ 복사했어요'; setTimeout(() => { b.textContent = '📋 복사'; }, 1800);
            }; });
            document.body.appendChild(el);
            requestAnimationFrame(() => el.classList.add('on'));
            if (arrived) { setTimeout(() => { if (typeof sndChime === 'function') sndChime(); }, 900); setTimeout(() => { if (typeof pigCoin === 'function') pigCoin(); }, 1100); }
        }

        async function openWall() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            if (!wl.tab) wl.tab = (typeof prDevice === 'function' ? prDevice() : 'PC') === 'PC' ? 'pc' : 'phone';
            wl.pick = null;
            const box = document.getElementById('wlBody');
            const have = !!(wl.items && wl.items.length), fresh = have && wl.at && Date.now() - wl.at < WL_FRESH;
            if (box) box.innerHTML = '';
            if (have) wlRender(); else if (box) box.innerHTML = `<div class="wl-wait">${WL_PHONE}<p>배경화면을 불러오는 중…</p></div>`;
            openModal('wallModal');
            if (fresh) return;
            const before = JSON.stringify(wl.items);
            await wlPrefetch();
            /* 새 목록이 달라졌으면 다시 그리기 (받기 · 크게 보기 중이면 방해하지 않아요) */
            const v = document.getElementById('wlView');
            if (!have || (JSON.stringify(wl.items) !== before && !wl.pick && (!v || v.hidden))) wlRender();
        }
        function closeWall() { wlUnview(); closeModal('wallModal'); }
        window.addEventListener('load', () => setTimeout(wlPrefetch, 3000));     // 그림모음처럼 다이어리를 열고 잠시 뒤 미리 받아 둬요

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['wall'] = true;
