/* 말랑달콤 다이어리 - js/wall.js
   🖼️ 말랑달콤 배경화면 (카페 → 🖼️ 말랑달콤 배경화면)
   - 움직이는 배경화면(휴대폰 · PC)을 보여 주고, 말랑달콤 1:1 오픈채팅방에서 팔아요
       사용자 : 채팅방에 "배경화면 3번" 을 보내고 카카오페이로 송금 → 주인 : 확인 후 채팅방으로 원본 영상 보내기
   - 목록 : '말랑달콤 사람들' 시트의 '배경화면' 탭 (말랑달콤사람들_앱스크립트.gs · 주소?action=walls · 로그인 없이 누구나)
       그림 · 미리보기 영상은 주인의 구글 드라이브에 있어요 (깃허브에는 올리지 않아요)
       목록 카드 : 드라이브 그림(jpg) · 누르면 크게 보기 · 움직이는 모습은 네이버 카페(말랑달콤 모임방)에서 홍보해요
   - 📖 설정 방법 : wallguide.html (사기 전에 내 기기에서 되는지 확인 · 채팅방에서 파일 보낼 때 이 주소도 함께)
   - 채팅방 주소 · QR 코드는 💗 저금통과 같아요 (an.txt · js/piggy.js 의 pigLoadChat · pigQr)
   - 휴대폰 : 버튼 하나로 '배경화면 N번' 복사 + 채팅방 열기 · PC · 태블릿 : 휴대폰으로 찍는 QR 코드
   ※ 이 파일이 없으면 배경화면 버튼을 눌러도 아무 일도 없어요 (다이어리는 정상) */

        const wl = { items: [], tab: '', pick: null };
        const wlWon = n => n.toLocaleString('ko-KR') + '원';
        const wlEsc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
        const wlImg = (id, w) => `https://lh3.googleusercontent.com/d/${id}=w${w}`;
        const wlImg2 = (id, w) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`;     // 첫 주소가 안 될 때

        async function wlLoad() {
            try {
                const res = await fetch(MEMBER_API_URL + '?action=walls', { credentials: 'omit' });
                const j = await res.json();
                if (!j || !j.ok || !Array.isArray(j.items)) throw 0;
                wl.items = j.items;
            } catch (e) { wl.items = null; }
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
                    <button type="button" class="wl-pre" onclick="wlView(${w.no})" aria-label="${wlEsc(w.name)} 크게 보기">
                      <img src="${wlImg(w.img, size)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="if(!this.dataset.b){this.dataset.b=1;this.src='${wlImg2(w.img, size)}'}">
                      <span class="wl-no">${w.no}번</span>
                    </button>
                    <div class="wl-name">${wlEsc(w.name)}</div>
                    <div class="wl-buy"><b>${wlWon(w.price)}</b><button type="button" class="btn wl-get" onclick="wlPick(${w.no})">💬 받기</button></div>
                  </div>`).join('')}</div>`}
              <div class="wl-note">🎁 영상 파일은 말랑달콤 채팅방으로 보내 드려요 · 한 번 받으면 계속 쓸 수 있어요<br>사기 전에 <a href="#" class="wl-link" onclick="wlGuide(); return false;">📖 설정 방법</a>으로 내 기기에서 되는지 확인해 주세요 😊</div>
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
                <div class="wl-view-frame"><img src="${wlImg(w.img, 1080)}" alt="" referrerpolicy="no-referrer" onerror="if(!this.dataset.b){this.dataset.b=1;this.src='${wlImg2(w.img, 1080)}'}"></div>
                <div class="wl-view-t">${wlEsc(w.name)} <b>${wlWon(w.price)}</b></div>
                <div class="wl-view-btns">
                  <button type="button" class="btn" onclick="wlUnview()">닫기</button>
                  <button type="button" class="btn btn-primary pg-copy" onclick="wlUnview(); wlPick(${w.no})">💬 받기</button>
                </div>
              </div>`;
            v.hidden = false;
        }
        function wlUnview() { const v = document.getElementById('wlView'); if (v) { v.hidden = true; v.innerHTML = ''; } }

        /* 💬 받기 : 받는 방법 안내 (휴대폰은 버튼 · PC · 태블릿은 QR) */
        async function wlPick(no) {
            const w = (wl.items || []).find(x => x.no === no), sh = document.getElementById('wlSheet');
            if (!w || !sh) return;
            wl.pick = w;
            const phone = (typeof prDevice === 'function' ? prDevice() : '') === '휴대폰';
            const msg = `배경화면 ${w.no}번`;
            sh.innerHTML = `
              <div class="wl-sheet-box">
                <div class="wl-sheet-t">${wlEsc(w.name)} <b>${wlWon(w.price)}</b></div>
                <ol class="pg-steps">
                  <li><b>채팅방에 "${msg}"을 보내요</b></li>
                  <li><b>카카오페이로 ${wlWon(w.price)}을 송금해요</b><br><span>🔒 오픈채팅 송금은 서로 실명이 보이지 않아요</span></li>
                  <li><b>확인되면 채팅으로 영상 파일을 보내 드려요</b></li>
                </ol>
                <div id="wlSend">${phone ? '' : '<div class="pg-qr" id="wlQr"><span>QR 코드를 만드는 중…</span></div>'}</div>
                ${phone ? '' : `<p class="wl-pc">카카오페이 송금은 <b>휴대폰 카카오톡</b>에서만 돼요.<br>QR 코드를 휴대폰 카메라로 찍으면 채팅방이 열려요.</p>`}
                <button type="button" class="btn wl-close" onclick="wlUnpick()">다른 배경화면 보기</button>
              </div>`;
            sh.hidden = false;
            sh.querySelector('.wl-sheet-box').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            if (typeof pig !== 'undefined' && !pig.chat && typeof pigLoadChat === 'function') await pigLoadChat();
            const chat = typeof pig !== 'undefined' ? pig.chat : '';
            if (wl.pick !== w) return;
            const send = document.getElementById('wlSend');
            if (!chat) { send.innerHTML = '<p class="pg-send-wait">채팅방 주소를 불러오지 못했어요.<br>잠시 후 다시 열어 주세요</p>'; return; }
            if (phone) send.innerHTML = `<button type="button" class="btn btn-primary pg-copy pg-go" onclick="wlGo()">💌 채팅방 열기 <small>("${msg}" 복사)</small></button>`;
            else pigQr(chat, 'wlQr');
        }
        function wlUnpick() { wl.pick = null; const sh = document.getElementById('wlSheet'); if (sh) sh.hidden = true; }
        function wlGo() {
            const w = wl.pick, chat = typeof pig !== 'undefined' ? pig.chat : '';
            if (!w || !chat) return;
            const msg = `배경화면 ${w.no}번`;
            try { navigator.clipboard.writeText(msg).catch(() => {}); } catch (e) {}
            window.open(chat, '_blank');
            toast(`📋 "${msg}"을 복사했어요. 채팅에 붙여 넣어 주세요 💕`);
        }

        async function openWall() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            if (!wl.tab) wl.tab = (typeof prDevice === 'function' ? prDevice() : 'PC') === 'PC' ? 'pc' : 'phone';
            wl.pick = null;
            const box = document.getElementById('wlBody');
            if (box && !(wl.items && wl.items.length)) box.innerHTML = '<p class="wl-empty">🖼️ 배경화면을 불러오는 중…</p>';
            openModal('wallModal');
            await wlLoad();
            wlRender();
        }
        function closeWall() { wlUnview(); closeModal('wallModal'); }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['wall'] = true;
