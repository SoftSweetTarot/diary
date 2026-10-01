/* 말랑달콤 다이어리 - js/service.js
   겉표지 공지 · 놀이터 창 · 후원하기 · 건의함
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        /* =====================================================================
           📢 겉표지 공지 이미지
           - NOTICE_IMAGE_SRC 에 파일 경로(예: 'images/notice.gif') 또는 인터넷 주소(https://…)를 넣으세요.
           - jpg · png · webp · 움직이는 gif 모두 표시됩니다.
           - 비워 두거나 이미지를 못 찾으면 아래의 임시 공지 이미지가 대신 보입니다.
           ===================================================================== */
        const NOTICE_IMAGE_SRC = '';
        const NOTICE_PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200" viewBox="0 0 360 200">' +
            '<rect x="4" y="4" width="352" height="192" rx="18" fill="#ffffff" fill-opacity="0.92" stroke="#ffb6c1" stroke-width="4" stroke-dasharray="10 6"/>' +
            '<text x="180" y="52" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="bold" fill="#ff6b81">📢 공지사항</text>' +
            '<text x="180" y="96" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#555">말랑달콤 다이어리에 오신 것을 환영해요!</text>' +
            '<text x="180" y="124" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#555">업데이트 소식과 공지가 이곳에 표시됩니다.</text>' +
            '<text x="180" y="166" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#999">(임시 공지 이미지)</text>' +
            '</svg>');

        function loadCoverNotice() {
            const box = document.getElementById('coverNotice');
            const img = document.getElementById('coverNoticeImg');
            if (!box || !img) return;
            img.onerror = () => {
                if (img.src !== NOTICE_PLACEHOLDER) img.src = NOTICE_PLACEHOLDER;   // 공지 이미지를 못 찾으면 임시 공지로
                else box.classList.add('empty');
            };
            img.onload = () => box.classList.remove('empty');
            img.src = NOTICE_IMAGE_SRC ? resolveSrc(NOTICE_IMAGE_SRC) : NOTICE_PLACEHOLDER;
        }

        /* =====================================================================
           🎠 놀이터 창 : 인형방 · 인형극 · 달콤영상 · 포춘카드 · 꿈해몽 · 오락실 · 만화방 · 음악듣기 · 랜덤박스 · 말랑상점 · 카페이동 · 도움말
           - 아직 안 만든 기능은 버튼에 '(준비중)'이 붙어 있고, 누르면 안내 메시지만 떠요.
             기능을 만들면 index.html 버튼의 class 에서 'soon' 과 <small>(준비중)</small> 을 빼고 아래 함수 내용을 바꾸면 돼요.
           ===================================================================== */
        const CAFE_URL = 'https://cafe.naver.com/sarangloveis';   // ☕ 말랑달콤 카페
        const FORTUNE_URL = 'https://softsweettarot.github.io/Message/';   // 🔮 포춘카드

        function openHelpFromService() {
            closeModal('serviceModal');
            openModal('helpModal');
        }
        function goCafe() {
            window.open(CAFE_URL, '_blank', 'noopener');
        }
        function comingSoon(name) { showMsg(name + ' 기능은 준비 중이에요.<br>조금만 기다려 주세요!'); }
        function openPuppetShow() { comingSoon('🎭 인형극'); }
        function openSweetVideo() { comingSoon('🎬 달콤영상'); }
        function openFortune() { window.open(FORTUNE_URL, '_blank', 'noopener'); }
        function openDream() { comingSoon('🌙 꿈해몽'); }
        function openArcade() { comingSoon('🕹️ 오락실'); }
        function openComics() { comingSoon('📚 만화방'); }
        function openMusic() { comingSoon('🎵 음악듣기'); }
        function openRandomBox() { if (typeof openGacha === 'function') openGacha(); else comingSoon('🎁 랜덤박스'); }   // js/gacha.js
        function openShop() { showMsg('🛍️ 말랑상점은 준비 중이에요.<br>예쁜 패턴과 꾸미기 이미지를 곧 만나보세요!'); }

        /* =====================================================================
           💝 후원하기 : 계좌번호 복사
           ===================================================================== */
        async function copyDonateAccount() {
            const text = document.getElementById('donateAccount').textContent.trim();
            try {
                await navigator.clipboard.writeText(text);
            } catch (e) {
                const ta = document.createElement('textarea');
                ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); } catch (er) {}
                ta.remove();
            }
            toast('📋 계좌번호를 복사했어요: ' + text);
        }

        /* =====================================================================
           💌 건의함 : 작성한 내용을 구글 시트(Apps Script)로 전송
           ===================================================================== */
        const FEEDBACK_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwEDrtkCkcmmbxIL30fgzmGXTb4r5BoO7RP59M930O66duHgvy-xkYEDK3PDZWUcd1l/exec";

        /* ☕ 서버 미리 깨우기 : 앱스크립트는 쉬다가 처음 요청을 받으면 깨어나는 데 몇 초~십몇 초 걸려요.
           창을 여는 순간 '일어나' 신호(doGet · 시트에는 아무것도 안 씀)를 미리 보내 두면,
           사용자가 글을 쓰거나 고르는 동안 깨어나서 실제 요청은 금방 끝나요. (같은 서버는 4분에 한 번만) */
        const warmedAt = {};
        function warmServer(url) {
            if (!url || Date.now() - (warmedAt[url] || 0) < 4 * 60000) return;
            warmedAt[url] = Date.now();
            fetch(url, { credentials: 'omit' }).catch(() => {});
        }

        function openFeedback() {
            warmServer(FEEDBACK_SCRIPT_URL);
            openModal('feedbackModal');
            document.getElementById('feedbackInput').focus();
        }
        function closeFeedback() {
            if (feedbackSending) return;                      // 전송 중에는 닫을 수 없어요 (저장이 끝날 때까지)
            closeModal('feedbackModal');
        }

        document.getElementById('feedbackInput').addEventListener('input', (e) => {
            document.getElementById('feedbackCount').textContent = e.target.value.length;
        });

        /* 💌 보내기 : 서버(앱스크립트)가 시트에 저장한 뒤 돌려주는 {"ok":true} 를 받았을 때만 '전송되었어요'
           - 앱스크립트는 한동안 쉬다가 깨어나면 몇 초~십몇 초 걸려요 → 그동안 '보내는 중'을 보여 줘요
           - 구글 로그인 정보는 보내지 않아요 (credentials: 'omit') : 구글 계정이 여러 개 로그인된 브라우저에서도 동작 */
        const FEEDBACK_TIMEOUT_MS = 45000;
        const FEEDBACK_FAIL_SHOW_MS = 2600;                    // 실패 안내가 떠 있는 시간
        let feedbackSending = false;
        let feedbackFailTimer = null;

        /* 전송 중에 창(탭)을 닫으려 하면 브라우저가 한 번 물어봐요 */
        window.addEventListener('beforeunload', e => { if (feedbackSending) { e.preventDefault(); e.returnValue = ''; } });

        /* '전송 중…' 창을 실패 안내로 바꿔 잠깐 보여 주고 저절로 닫기 (눌러도 바로 닫혀요) */
        function showFeedbackFail(msg) {
            const pop = document.getElementById('feedbackSending'), card = pop.querySelector('.sending-card');
            document.getElementById('feedbackSendingSpin').hidden = true;
            document.getElementById('feedbackSendingSec').hidden = true;
            document.getElementById('feedbackSendingTitle').textContent = '⚠ 전송하지 못했어요';
            document.getElementById('feedbackSendingMsg').innerHTML = msg;
            card.classList.add('fail');
            pop.hidden = false;
            const done = () => {
                clearTimeout(feedbackFailTimer); feedbackFailTimer = null;
                pop.hidden = true; pop.onclick = null;
                document.getElementById('feedbackInput').focus();
            };
            pop.onclick = done;
            clearTimeout(feedbackFailTimer);
            feedbackFailTimer = setTimeout(done, FEEDBACK_FAIL_SHOW_MS);
        }

        async function submitFeedback() {
            if (feedbackSending) return;
            const input = document.getElementById('feedbackInput');
            const btn = document.getElementById('feedbackSendBtn');
            const pop = document.getElementById('feedbackSending');
            const closeBtn = document.getElementById('feedbackCloseBtn');
            const popSec = document.getElementById('feedbackSendingSec');
            const popMsg = document.getElementById('feedbackSendingMsg');
            const text = input.value.trim();

            if (!text) {
                await showMsg('내용을 입력한 뒤 전송해 주세요.');
                input.focus();
                return;
            }

            feedbackSending = true;
            clearTimeout(feedbackFailTimer); pop.onclick = null;
            btn.disabled = true; input.disabled = true; closeBtn.disabled = true;   // 전송 중엔 닫기도 막기
            btn.textContent = '📨 보내는 중…';
            /* '전송 중…' 창 : 걸린 시간을 보여 주고, 3초가 넘으면 늦는 이유를 안내 */
            const started = Date.now();
            pop.querySelector('.sending-card').classList.remove('fail');
            document.getElementById('feedbackSendingSpin').hidden = false;
            document.getElementById('feedbackSendingTitle').textContent = '💌 전송 중…';
            popSec.hidden = false;
            popSec.textContent = '0초';
            popMsg.textContent = '잠시만 기다려 주세요.';
            pop.hidden = false;
            const tick = setInterval(() => {
                const sec = Math.floor((Date.now() - started) / 1000);
                popSec.textContent = sec + '초';
                if (sec >= 3) popMsg.textContent = '건의함 서버를 깨우는 중이에요. 처음 보낼 땐 10초 넘게 걸릴 수 있어요. 창을 닫지 말고 잠시만 기다려 주세요.';
            }, 250);
            const ctl = new AbortController();
            const timer = setTimeout(() => ctl.abort(), FEEDBACK_TIMEOUT_MS);
            let ok = false, reason = '';
            try {
                const res = await fetch(FEEDBACK_SCRIPT_URL, {
                    method: 'POST', credentials: 'omit', signal: ctl.signal,
                    body: new URLSearchParams({ comment: text })     // comment=내용 (예전과 같은 형식)
                });
                const data = await res.json().catch(() => null);
                ok = !!(data && data.ok);
                if (!ok) reason = 'server';
            } catch (err) {
                reason = err && err.name === 'AbortError' ? 'timeout' : 'network';
                console.error('건의사항 전송 오류:', err);
            } finally {
                clearInterval(tick); clearTimeout(timer);
                feedbackSending = false;
                btn.disabled = false; input.disabled = false; closeBtn.disabled = false;
                btn.textContent = '📨 전송';
                pop.hidden = true;
            }

            if (ok) {
                input.value = '';
                document.getElementById('feedbackCount').textContent = '0';
                closeFeedback();
                showMsg('건의사항이 전송되었어요.<br>소중한 의견 감사합니다 💌');
            } else {
                showFeedbackFail({
                    timeout: '서버 응답이 너무 늦어요.<br>잠시 후 다시 시도해 주세요.',
                    network: '인터넷 연결을 확인하고<br>다시 시도해 주세요.',
                    server: '서버에서 저장하지 못했어요.<br>잠시 후 다시 시도해 주세요.'
                }[reason] + '<br><span style="font-size:12px;color:#999;">적은 내용은 그대로 남아 있어요.</span>');
            }
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['service'] = true;
