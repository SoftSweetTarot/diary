/* 말랑달콤 다이어리 - js/presence.js
   👥 접속 신호 : 로그인한 사람이 다이어리를 쓰는 동안 '말랑달콤 사람들' 서버의 '회원 목록' 탭에 🟢 on / ⚪ off 를 남겨요
   - 서버 코드 : 말랑달콤사람들_앱스크립트.gs · 배포한 웹 앱 주소를 아래 MEMBER_API_URL 에 넣어요 (비어 있으면 아무것도 안 보내요)
   - 처음 접속하면 회원 목록에 한 줄이 생기고, 화면을 보고 있는 동안 5분마다 '아직 있어요' 신호
   - 창을 닫거나 다른 앱 · 탭으로 가면 '나감' 신호 → 다시 돌아오면 바로 on
   - 보내는 건 구글 로그인 확인용 정보와 기기 종류(PC · 휴대폰 · 태블릿)뿐 (이메일 · 일기 내용은 보내지 않아요)
   - 게스트 · 로그인이 만료된 동안은 보내지 않아요 (로그인 창을 띄우지 않아요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 */

        const MEMBER_API_URL = 'https://script.google.com/macros/s/AKfycbzuhJ24tR7VbfKfX-lGI8-BRpPDx3d_J0UwR9x94RxPd2H3mvJiea-vn7EvRRCt2IgMag/exec';                    // ← '말랑달콤 사람들' 앱스크립트 웹 앱 주소 (https://script.google.com/macros/s/…/exec)
        const PR_EVERY = 5 * 60 * 1000;
        const pr = { last: 0 };
        const prOk = () => MEMBER_API_URL && typeof drive !== 'undefined'
            && drive.ready && !drive.guest && drive.token && Date.now() < drive.expiresAt;
        function prDevice() {
            const ua = navigator.userAgent;
            if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return '태블릿';
            return /Mobi|iPhone|Android/i.test(ua) ? '휴대폰' : 'PC';
        }
        function prHere() {
            if (!prOk() || document.visibilityState !== 'visible') return;
            pr.last = Date.now();
            fetch(MEMBER_API_URL, { method: 'POST', body: JSON.stringify({ action: 'here', token: drive.token, dev: prDevice() }) }).catch(() => {});
        }
        function prBye() {
            if (!prOk() || !pr.last) return;
            pr.last = 0;
            try { navigator.sendBeacon(MEMBER_API_URL, JSON.stringify({ action: 'bye', token: drive.token })); } catch (e) {}
        }
        setInterval(() => { if (Date.now() - pr.last >= PR_EVERY) prHere(); }, 15000);      // 로그인되면 곧바로 · 그 뒤로 5분마다
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (Date.now() - pr.last > 60000) prHere(); } else prBye(); });
        window.addEventListener('pagehide', prBye);
