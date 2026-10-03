/* 말랑달콤 다이어리 - js/presence.js
   👥 접속 신호 : 로그인한 사람이 다이어리를 쓰는지 '말랑달콤 사람들' 서버의 '회원 목록' 탭에 🟢 on / ⚪ off 를 남겨요
   - 서버 코드 : 말랑달콤사람들_앱스크립트.gs · 배포한 웹 앱 주소를 아래 MEMBER_API_URL 에 넣어요 (비어 있으면 아무것도 안 보내요)
   - 신호는 딱 세 가지 (사람이 많아도 서버가 바쁘지 않게)
       ① 로그인해서 다이어리가 열리면 '들어왔어요' → on
       ② 창 · 탭 · 앱을 닫으면 '나가요' → off
       ③ 열어 둔 동안 3시간마다 '아직 있어요' (3시간이 넘도록 신호가 없으면 서버가 off 로 봐요)
     다른 탭 · 앱으로 잠깐 다녀오는 건 신호를 보내지 않아요
   - 보내는 건 구글 로그인 확인용 정보와 기기 종류(PC · 휴대폰 · 태블릿)뿐 (이메일 · 일기 내용은 보내지 않아요)
   - '들어왔어요' · '아직 있어요' 의 답으로 🐷 저금통 선물 끝나는 날을 받아요 → setSaver (js/settings.js)
   - 게스트는 보내지 않아요
   ※ 이 파일이 없어도 다이어리는 정상 동작 */

        const MEMBER_API_URL = 'https://script.google.com/macros/s/AKfycbzuhJ24tR7VbfKfX-lGI8-BRpPDx3d_J0UwR9x94RxPd2H3mvJiea-vn7EvRRCt2IgMag/exec';   // ← '말랑달콤 사람들' 앱스크립트 웹 앱 주소
        const PR_EVERY = 3 * 60 * 60 * 1000;            // 3시간
        const pr = { last: 0 };
        const prOk = () => MEMBER_API_URL && typeof drive !== 'undefined' && drive.ready && !drive.guest;
        function prDevice() {
            const ua = navigator.userAgent;
            if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return '태블릿';
            return /Mobi|iPhone|Android/i.test(ua) ? '휴대폰' : 'PC';
        }
        async function prHere() {
            if (!prOk()) return;
            pr.last = Date.now();
            try { await ensureToken(); } catch (e) { return; }
            try {
                const res = await fetch(MEMBER_API_URL, { method: 'POST', body: JSON.stringify({ action: 'here', token: drive.token, dev: prDevice() }) });
                const j = await res.json();
                if (j && j.ok && typeof setSaver === 'function') setSaver(j.until);
            } catch (e) {}
        }
        function prBye() {
            if (!prOk() || !pr.last || !drive.token) return;
            pr.last = 0;
            try { navigator.sendBeacon(MEMBER_API_URL, JSON.stringify({ action: 'bye', token: drive.token })); } catch (e) {}
        }
        const prFirst = setInterval(() => { if (prOk()) { clearInterval(prFirst); if (!pr.last) prHere(); } }, 1000);   // ① 로그인되면 곧바로
        setInterval(() => { if (Date.now() - pr.last >= PR_EVERY) prHere(); }, 15000);      // ③ 그 뒤로 3시간마다
        setInterval(() => { if (typeof setSaver === 'function' && document.body.classList.contains('saver') && !isSaver()) setSaver(''); }, 60000);   // 선물 기간이 열어 둔 중에 끝나면 닫기
        window.addEventListener('pagehide', prBye);                                         // ② 닫을 때
        window.addEventListener('pageshow', e => { if (e.persisted) prHere(); });            // 닫았던 페이지가 그대로 되살아나면 다시 on
