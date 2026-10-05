/* 말랑달콤 다이어리 - js/presence.js
   👥 접속 신호 : 로그인한 사람이 다이어리를 쓰는지 '말랑달콤 사람들' 서버의 '회원 목록' 탭에 🟢 on / ⚪ off 를 남겨요
   - 서버 코드 : 말랑달콤사람들_앱스크립트.gs · 배포한 웹 앱 주소를 아래 MEMBER_API_URL 에 넣어요 (비어 있으면 아무것도 안 보내요)
   - 신호는 딱 세 가지 (사람이 많아도 서버가 바쁘지 않게)
       ① 로그인해서 다이어리가 열리면 '들어왔어요' → on
       ② 창 · 탭 · 앱을 닫으면 '나가요' → off
       ③ 열어 둔 동안 3시간마다 '아직 있어요' (3시간이 넘도록 신호가 없으면 서버가 off 로 봐요)
     다른 탭 · 앱으로 잠깐 다녀오는 건 신호를 보내지 않아요
   - 보내는 건 구글 로그인 확인용 정보와 기기 종류(PC · 휴대폰 · 태블릿)뿐 (이메일 · 일기 내용은 보내지 않아요)
   - '들어왔어요' · '아직 있어요' 의 답으로 🐷 저금통 선물(🎀 · 🍬 전체 + 디자인별 끝나는 날) · 내 저금 코드를 받아요 → setGift (js/settings.js) · prCode (js/piggy.js)
   - 🖼️ 배경화면 : 로그인 신호의 답 walls 로 '내가 받은 배경화면'을 맞추고(wlSetMine) · 도착 신호 w 는 링크 창(wlGift)으로 보여 줘요 (js/wall.js)
   - 🎁 선물 도착 : 주인이 저금 확인 · 아이템 주기를 하면 서버에 도착 신호가 남아요 → 🪙 · 🎀 · 🍬 · 🎁 · 🖼️ 를 알림 창 하나로 보여 줘요 (js/arrival.js 의 arPush)
       신호는 다이어리가 '받아서 저장했어요' 하고 알릴 때까지 서버에 남아 있어요 → 다이어리를 안 쓰는 동안 받은 선물도, 접속하면 바로 떠요
       다이어리를 보고 있는 동안 1분마다 살짝 물어봐요 (로그인 확인 없이 회원번호로 · 서버가 시트를 열지 않아서 아주 가벼워요)
       다른 탭 · 앱에 가 있는 동안은 묻지 않고, 다이어리로 돌아오는 순간(창을 다시 누르거나 인터넷이 다시 연결될 때도) 바로 물어봐요
   - 처음 온 사람이면(답의 first) 🎁 캡슐 스티커 첫 선물을 받아요 → capsWelcome (js/gacha.js)
   - 게스트는 보내지 않아요
   ※ 이 파일이 없어도 다이어리는 정상 동작 */

        const MEMBER_API_URL = 'https://script.google.com/macros/s/AKfycbzuhJ24tR7VbfKfX-lGI8-BRpPDx3d_J0UwR9x94RxPd2H3mvJiea-vn7EvRRCt2IgMag/exec';   // ← '말랑달콤 사람들' 앱스크립트 웹 앱 주소
        const PR_EVERY = 3 * 60 * 60 * 1000;            // 3시간
        const PR_GIFT_EVERY = 60 * 1000;                // 🎁 선물 신호 물어보기 : 1분마다
        const pr = { last: 0, me: '', code: '', gLast: 0, gBusy: false };
        const prOk = () => MEMBER_API_URL && typeof drive !== 'undefined' && drive.ready && !drive.guest;
        function prDevice() {
            const ua = navigator.userAgent;
            if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return '태블릿';
            return /Mobi|iPhone|Android/i.test(ua) ? '휴대폰' : 'PC';
        }
        async function prHere() {
            if (!prOk()) return;
            pr.last = Date.now();
            try { await ensureToken(); } catch (e) { pr.last = Date.now() - PR_EVERY + 30000; return; }          // 못 닿으면 30초 뒤 다시 (3시간을 기다리면 선물을 늦게 받아요)
            try {
                const res = await fetch(MEMBER_API_URL, { method: 'POST', body: JSON.stringify({ action: 'here', token: drive.token, dev: prDevice() }) });
                const j = await res.json();
                if (!(j && j.ok)) pr.last = Date.now() - PR_EVERY + 30000;
                if (j && j.ok && typeof setGift === 'function') setGift(j.tape, j.pat, j.tp, j.pp);
                if (j && j.ok && typeof wlSetMine === 'function') wlSetMine(j.walls);          // 🖼️ 내가 받은 배경화면 (js/wall.js)
                if (j && j.ok && j.me) pr.me = String(j.me);
                if (j && j.ok && j.code) pr.code = String(j.code);
                if (j && j.ok && j.gift) prGift(j.gift);
                if (j && j.ok && j.first && typeof capsWelcome === 'function') capsWelcome();   // 🎁 처음 온 사람 → 캡슐 스티커 첫 선물 (js/gacha.js)
            } catch (e) { pr.last = Date.now() - PR_EVERY + 30000; }
        }

        /* 🎁 선물 도착 신호 물어보기 (가벼운 GET · 답 : { gift: { t: {…}, p: {…} } | '' }) */
        async function prGiftAsk() {
            if (!pr.me || pr.gBusy || document.hidden || !prOk()) return;
            pr.gBusy = true; pr.gLast = Date.now();
            try {
                const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 15000);         // 응답이 안 오면 포기하고 다음에 다시 (영원히 기다리지 않아요)
                const res = await fetch(MEMBER_API_URL + '?action=gift&u=' + encodeURIComponent(pr.me), { credentials: 'omit', signal: ctl.signal });
                clearTimeout(tm);
                const j = await res.json();
                if (j && j.ok && j.gift) prGift(j.gift);
            } catch (e) {}
            pr.gBusy = false;
        }
        function prGift(g) {                                  // g : { t · p · s : { all | 이름: [끝나는 날, 늘어남, 더한 일수] }, c: [더한 코인, 지금 코인], w: { 배경화면 번호: [이름, 링크] }, n: 신호 번호 } (받은 것만 들어 있어요)
            if (typeof arPush === 'function') arPush(g);                           // 저장 → 서버에 '받았어요' → 도착 창 하나 (js/arrival.js)
        }
        setInterval(() => { if (Date.now() - pr.gLast >= PR_GIFT_EVERY) prGiftAsk(); }, 10000);
        document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - pr.gLast >= 10000) prGiftAsk(); });   // 다이어리로 돌아오면 바로
        window.addEventListener('focus', () => { if (Date.now() - pr.gLast >= 10000) prGiftAsk(); });
        window.addEventListener('online', () => { if (!pr.me) prHere(); else prGiftAsk(); });                                       // 인터넷이 다시 연결되면 바로
        function prBye() {
            if (!prOk() || !pr.last || !drive.token) return;
            pr.last = 0;
            try { navigator.sendBeacon(MEMBER_API_URL, JSON.stringify({ action: 'bye', token: drive.token })); } catch (e) {}
        }
        const prFirst = setInterval(() => {                                                 // ① 로그인되면 곧바로
            if (typeof drive !== 'undefined' && drive.ready && drive.guest) { clearInterval(prFirst); if (typeof setGift === 'function') setGift('', '', {}, {}); if (typeof wlSetMine === 'function') wlSetMine([]); return; }   // 게스트는 선물 없음
            if (prOk()) { clearInterval(prFirst); if (!pr.last) prHere(); }
        }, 1000);
        setInterval(() => { if (Date.now() - pr.last >= PR_EVERY) prHere(); }, 15000);      // ③ 그 뒤로 3시간마다
        setInterval(() => { if (typeof giftRefresh === 'function') giftRefresh(); }, 60000);   // 선물 기간이 열어 둔 중에 끝나면 닫기
        window.addEventListener('pagehide', prBye);                                         // ② 닫을 때
        window.addEventListener('pageshow', e => { if (e.persisted) prHere(); });            // 닫았던 페이지가 그대로 되살아나면 다시 on
