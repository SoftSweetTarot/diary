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
        const FEEDBACK_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkh25l1LBwrmop0muyxZaXnTOEaZNpuyEM7aB9N2CfhUZ6YuqfAyKMn8S0xtTN05YE/exec";

        function openFeedback() {
            openModal('feedbackModal');
            document.getElementById('feedbackInput').focus();
        }
        function closeFeedback() { closeModal('feedbackModal'); }

        document.getElementById('feedbackInput').addEventListener('input', (e) => {
            document.getElementById('feedbackCount').textContent = e.target.value.length;
        });

        async function submitFeedback() {
            const input = document.getElementById('feedbackInput');
            const btn = document.getElementById('feedbackSendBtn');
            const text = input.value.trim();

            if (!text) {
                await showMsg('내용을 입력한 뒤 전송해 주세요.');
                input.focus();
                return;
            }

            btn.disabled = true;
            try {
                await fetch(FEEDBACK_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'comment=' + encodeURIComponent(text)
                });
                input.value = '';
                document.getElementById('feedbackCount').textContent = '0';
                closeFeedback();
                showMsg('건의사항이 전송되었어요.<br>소중한 의견 감사합니다 💌');
            } catch (err) {
                console.error('건의사항 전송 오류:', err);
                showMsg('전송하지 못했어요.<br>인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
            } finally {
                btn.disabled = false;
            }
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['service'] = true;
