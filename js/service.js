/* 말랑달콤 다이어리 - js/service.js
   겉표지 공지 · 카페 창 · 건의함
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        /* =====================================================================
           📢 겉표지 공지
           - 평소 : 겉표지에 말랑달콤 환영 카드 (NOTICE_IMAGE_SRC 에 그림을 넣으면 그 그림)
           - 새 공지 : 사이트 맨 위의 notice.json 에 공지를 쓰고 id 숫자를 하나 올리면
               → 아직 안 본 사람은 카드 속 편지가 딸랑딸랑 흔들려요 → 누르면 공지 창 → 닫으면 '봤어요'
               → 본 공지는 다시 흔들리지 않아요 (카드를 누르면 다시 볼 수는 있어요)
               → 다음 공지(id 가 더 큰 수)가 올라오면 모두에게 다시 흔들려요 (못 본 지난 공지는 건너뛰고 새 공지만)
           - '봤어요' 기록 : 로그인 → 내 구글 드라이브 설정(설정.json 의 diary_notice_seen · 다른 기기도 같이) · 게스트 → 이 기기
             (개발자 서버는 쓰지 않아요)
           - notice.json 모양 (id 가 0 이거나 파일이 없으면 공지 없음)
               { "id": 1, "title": "📢 말랑달콤 소식", "date": "2026-10-11",
                 "image": "notice/1.png",            ← 넣고 싶을 때만 (그림 주소)
                 "html": "<p>안녕하세요, 다꾸러 여러분!</p>" }   ← 공지 내용 (html 그대로 보여요)
           - jpg · png · webp · 움직이는 gif 모두 표시됩니다.
           ===================================================================== */
        const NOTICE_IMAGE_SRC = '';                          // 겉표지 카드 그림 (비우면 기본 환영 카드)
        const NOTICE_FILE = 'notice.json';                    // 공지 내용 파일 (사이트 맨 위)
        const NOTICE_SEEN_KEY = 'diary_notice_seen';          // 드라이브 설정에 남는 '본 공지 번호'
        const NOTICE_LOCAL_KEY = 'malang_notice_seen';        // 이 기기에도 같이 (게스트 · 로그인 전)
        const NOTICE_RECHECK_MS = 10 * 60 * 1000;             // 앱으로 돌아왔을 때 10분 넘게 지났으면 공지를 다시 확인
        function noticeCardSvg(ring) {
            const F = "font-family=\"'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif\"";
            let t = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200" viewBox="0 0 360 200">' +
                '<defs>' +
                '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3f8"/><stop offset=".55" stop-color="#ffe4ef"/><stop offset="1" stop-color="#efe6ff"/></linearGradient>' +
                '<linearGradient id="rb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9fbd"/><stop offset="1" stop-color="#ff7aa2"/></linearGradient>' +
                '<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
                '<style>' +
                '.tw{animation:tw 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}' +
                '.tw.b{animation-delay:-.8s}.tw.c{animation-delay:-1.6s}' +
                '@keyframes tw{0%,100%{opacity:.25;transform:scale(.6)}50%{opacity:1;transform:scale(1.15)}}' +
                '.fl{animation:fl 3.2s ease-in-out infinite}.fl.b{animation-delay:-1.6s}' +
                '@keyframes fl{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
                '.env{animation:env 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}' +
                '@keyframes env{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg) translateY(-3px)}}' +
                '</style>' +
                '</defs>' +
                '<rect x="3" y="3" width="354" height="194" rx="22" fill="url(#bg)" stroke="#ffc2d6" stroke-opacity=".45" stroke-width="3"/>' +
                '<rect x="11" y="11" width="338" height="178" rx="16" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="7 6"/>' +
                '<g fill="#fff" opacity=".85"><circle cx="318" cy="182" r="10"/><circle cx="334" cy="176" r="13"/><circle cx="348" cy="186" r="9"/><circle cx="14" cy="186" r="9"/><circle cx="28" cy="178" r="12"/><circle cx="44" cy="186" r="9"/></g>' +
                '<g class="fl"><path d="M38 52 C 30 44 34 34 42 38 C 50 34 54 44 46 52 L 42 56Z" fill="#ffb3c8"/></g>' +
                '<g class="fl b"><path d="M318 46 C 312 40 315 32 321 35 C 327 32 330 40 324 46 L 321 49Z" fill="#c9b5ff"/></g>' +
                '<path class="tw" d="M70 92 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" fill="#ffd36b"/>' +
                '<path class="tw b" d="M292 96 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" fill="#ffb3c8"/>' +
                '<path class="tw c" d="M318 98 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#a8d8ff"/>' +
                '<path class="tw" d="M40 100 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#c9b5ff"/>' +
                '<circle class="tw b" cx="122" cy="112" r="3" fill="#ffd36b"/><circle class="tw c" cx="238" cy="80" r="3" fill="#ff9fbd"/>' +
                '<path d="M106 32 h-28 l9 11 -9 11 h28z" fill="#ff86a9"/><path d="M254 32 h28 l-9 11 9 11 h-28z" fill="#ff86a9"/>' +
                '<path d="M106 54 l8 6 v-6z M254 54 l-8 6 v-6z" fill="#e0628a"/>' +
                '<rect x="106" y="26" width="148" height="28" rx="3" fill="url(#rb)"/>' +
                '<text x="180" y="45" text-anchor="middle" font-family="\'Apple SD Gothic Neo\',\'Malgun Gothic\',\'Noto Sans KR\',sans-serif" font-size="15" font-weight="bold" fill="#fff" letter-spacing="1">말랑달콤 다이어리</text>' +
                '<circle cx="180" cy="102" r="34" fill="url(#glow)"/>' +
                '<g class="env">' +
                '<rect x="156" y="88" width="48" height="34" rx="6" fill="#fff" stroke="#ff9fbd" stroke-width="2.5"/>' +
                '<path d="M158 91 L180 108 L202 91" fill="none" stroke="#ff9fbd" stroke-width="2.5" stroke-linejoin="round"/>' +
                '<path d="M180 104 C 175 99 176 94 180 96.5 C 184 94 185 99 180 104Z" fill="#ff6f9c"/>' +
                '</g>' +
                '<text x="180" y="146" text-anchor="middle" font-family="\'Apple SD Gothic Neo\',\'Malgun Gothic\',\'Noto Sans KR\',sans-serif" font-size="15" font-weight="bold" fill="#7a4a62">오늘 하루도 말랑하게, 달콤하게 💕</text>' +
                '<text x="180" y="167" text-anchor="middle" font-family="\'Apple SD Gothic Neo\',\'Malgun Gothic\',\'Noto Sans KR\',sans-serif" font-size="12" fill="#a07890">표지를 넘겨 오늘의 이야기를 남겨 보세요</text>' +
                '</svg>';
            if (ring) {                                                  // 🔔 새 공지 : 편지가 딸랑딸랑 · 아래 글도 바꿔요
                t = t.replace('.env{animation:env 3s ease-in-out infinite;', '.env{animation:ring 1.4s ease-in-out infinite;')
                    .replace('</style>', '@keyframes ring{0%,48%,100%{transform:rotate(0)}4%{transform:rotate(-16deg) translateY(-3px)}10%{transform:rotate(15deg) translateY(-3px)}16%{transform:rotate(-13deg) translateY(-2px)}22%{transform:rotate(11deg) translateY(-2px)}28%{transform:rotate(-8deg)}34%{transform:rotate(6deg)}40%{transform:rotate(-3deg)}}' +
                        '.wv{animation:wv 1.4s ease-out infinite;opacity:0}@keyframes wv{0%,6%{opacity:0}12%,34%{opacity:1}48%,100%{opacity:0}}' +
                        '.nw{animation:nw 1.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes nw{0%,100%{transform:scale(1)}10%{transform:scale(1.18)}}</style>')
                    .replace('</g><text x="180" y="146"', '<g class="nw"><rect x="196" y="76" width="34" height="17" rx="8.5" fill="#ff4f7e" stroke="#fff" stroke-width="2"/><text x="213" y="88.5" text-anchor="middle" ' + F + ' font-size="10" font-weight="bold" fill="#fff">NEW</text></g></g>' +
                        '<g class="wv" stroke="#ff9fbd" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M146 92 q-6 13 0 26"/><path d="M139 87 q-9 18 0 36"/><path d="M214 108 q6 8 0 16"/></g><text x="180" y="146"')
                    .replace('>오늘 하루도 말랑하게, 달콤하게 💕<', '>📢 새 소식이 도착했어요!<')
                    .replace('>표지를 넘겨 오늘의 이야기를 남겨 보세요<', '>편지를 눌러서 확인해 보세요<');
            }
            return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(t);
        }
        const NOTICE_PLACEHOLDER = noticeCardSvg(false);
        const NT = { cur: null, at: 0, busy: false, built: false };

        function noticeSeen() {
            let a = 0, b = 0;
            try { a = parseInt(JSON.parse(store.getItem(NOTICE_SEEN_KEY)), 10) || 0; } catch (e) {}
            try { b = parseInt(localStorage.getItem(NOTICE_LOCAL_KEY), 10) || 0; } catch (e) {}
            return Math.max(a, b);
        }
        function noticeMarkSeen(id) {
            if (!id) return;
            const n = Math.max(id, noticeSeen());
            try { localStorage.setItem(NOTICE_LOCAL_KEY, String(n)); } catch (e) {}
            try { if (typeof drive === 'undefined' || !drive.guest) { const v = parseInt(JSON.parse(store.getItem(NOTICE_SEEN_KEY)), 10) || 0; if (v < n) store.setItem(NOTICE_SEEN_KEY, JSON.stringify(n)); } } catch (e) {}
        }
        /* notice.json 읽기 (늘 새로 · 실패하면 공지 없음으로) */
        async function noticeFetch() {
            try {
                const res = await fetch(NOTICE_FILE + '?t=' + Date.now(), { cache: 'no-store' });
                if (!res.ok) return null;
                const o = await res.json();
                const id = parseInt(o && o.id, 10);
                if (!id || id < 1) return null;
                return { id, title: String(o.title || '📢 말랑달콤 소식').slice(0, 60), date: String(o.date || '').slice(0, 20),
                    image: typeof o.image === 'string' ? o.image : '', html: typeof o.html === 'string' ? o.html : '' };
            } catch (e) { return null; }
        }

        function loadCoverNotice() {
            const box = document.getElementById('coverNotice');
            const img = document.getElementById('coverNoticeImg');
            if (!box || !img) return;
            img.onerror = () => {
                if (img.src !== NOTICE_PLACEHOLDER) img.src = NOTICE_PLACEHOLDER;   // 공지 이미지를 못 찾으면 기본 그림으로
                else box.classList.add('empty');
            };
            img.onload = () => box.classList.remove('empty');
            noticePaint();
            noticeCheck(true);
            document.addEventListener('visibilitychange', () => { if (!document.hidden) noticeCheck(false); });
            if (typeof COLL !== 'undefined') COLL.loginHooks.push(() => { noticeLoginCarry(); noticePaint(); });   // 로그인해서 드라이브 설정을 읽은 뒤 (다른 기기에서 본 공지)
        }
        async function noticeCheck(force) {
            if (NT.busy || (!force && Date.now() - NT.at < NOTICE_RECHECK_MS)) return;
            NT.busy = true;
            try { NT.cur = await noticeFetch(); NT.at = Date.now(); } finally { NT.busy = false; }
            noticePaint();
        }
        /* 로그인 전에 이 기기에서 본 공지 → 드라이브 기록에도 */
        function noticeLoginCarry() {
            try {
                if (typeof drive === 'undefined' || drive.guest || !drive.ready) return;
                const l = parseInt(localStorage.getItem(NOTICE_LOCAL_KEY), 10) || 0, v = parseInt(JSON.parse(store.getItem(NOTICE_SEEN_KEY)), 10) || 0;
                if (l > v) store.setItem(NOTICE_SEEN_KEY, JSON.stringify(l));
            } catch (e) {}
        }
        /* 겉표지 카드 그리기 : 안 본 공지 → 딸랑딸랑 · 공지가 있으면 눌러서 보기 */
        function noticePaint() {
            const box = document.getElementById('coverNotice'), img = document.getElementById('coverNoticeImg');
            if (!box || !img) return;
            const n = NT.cur, ring = !!n && n.id > noticeSeen();
            const src = NOTICE_IMAGE_SRC ? resolveSrc(NOTICE_IMAGE_SRC) : noticeCardSvg(ring);
            if (img.getAttribute('src') !== src) img.src = src;
            box.classList.toggle('ring', ring);
            box.classList.toggle('img', !!NOTICE_IMAGE_SRC);
            let hit = box.querySelector('.cn-hit');
            if (n && !hit) {                                               // 버튼이라서 눌러도 표지가 넘어가지 않아요 (js/page.js 는 button 위 누르기를 넘기지 않아요)
                hit = document.createElement('button');
                hit.type = 'button'; hit.className = 'cn-hit';
                hit.onclick = e => { e.stopPropagation(); openNotice(); };
                box.appendChild(hit);
            } else if (!n && hit) hit.remove();
            if (hit) hit.setAttribute('aria-label', ring ? '새 공지 보기' : '공지 다시 보기');
        }
        window.noticeRefresh = noticePaint;

        /* 📢 공지 창 : 닫으면 (닫기 · ✕ · 어떤 방법이든) 본 걸로 */
        function noticeBuild() {
            if (NT.built) return;
            NT.built = true;
            const w = document.createElement('div');
            w.innerHTML = `
            <div class="modal" id="noticeModal">
              <div class="modal-content nt-box">
                <div class="modal-title" id="ntTitle">📢 공지</div>
                <div class="nt-date" id="ntDate"></div>
                <div class="nt-body" id="ntBody"></div>
                <button class="btn nt-close" type="button" onclick="closeModal('noticeModal')">닫기</button>
              </div>
            </div>`;
            const m = w.firstElementChild;
            document.body.appendChild(m);
            new MutationObserver(() => { if (m.style.display === 'none' && NT.open) { NT.open = 0; noticeMarkSeen(NT.openId); noticePaint(); } })
                .observe(m, { attributes: true, attributeFilter: ['style', 'class'] });
        }
        function openNotice() {
            const n = NT.cur; if (!n) return;
            noticeBuild();
            document.getElementById('ntTitle').textContent = n.title;
            document.getElementById('ntDate').textContent = n.date;
            const body = document.getElementById('ntBody');
            body.innerHTML = (n.image ? `<img class="nt-img" alt="" src="${resolveSrc(n.image).replace(/"/g, '&quot;')}">` : '') + n.html;   // notice.json 은 개발자가 올리는 파일이라 html 그대로
            body.scrollTop = 0;
            openModal('noticeModal');
            NT.open = 1; NT.openId = n.id;
        }
        window.openNotice = openNotice;

        /* =====================================================================
           ☕ 카페 창 : 카테고리 6개(매일 · 운세·마음 · 인형 꾸미기 · 게임 · 보고·듣기 · 함께하기) → 그 안의 놀이
           - 아직 안 만든 기능은 버튼에 '(준비중)'이 붙어 있고, 누르면 안내 메시지만 떠요.
             기능을 만들면 index.html 버튼의 class 에서 'soon' 과 <small>(준비중)</small> 을 빼고 아래 함수 내용을 바꾸면 돼요.
           ===================================================================== */
        const CAFE_URL = 'https://cafe.naver.com/softsweetdiary';   // 👭 말랑달콤 모임방 (네이버 카페)

        /* ☕ 카페 : 1단계 카테고리 → 2단계 놀이 (카페를 열 때마다 카테고리부터 · js/settings.js openModal) */
        function svcShowCats() {
            const cats = document.getElementById('svcCats'); if (!cats) return;
            cats.hidden = false;
            document.querySelectorAll('#serviceModal .svc-panel').forEach(p => { p.hidden = true; });
            document.getElementById('svcTitle').textContent = '☕ 카페';
            document.getElementById('svcBack').classList.add('mt-none');      // 맨 처음 화면에서는 ← 숨김
            svcDailyBadges();
        }
        /* 🌱 매일 : 오늘 새로 생긴 것을 알려 주는 작은 표시 (출석 도장 · 화분 물 주기 · 오늘의 행운 · 오늘의 질문)
           - 길잡이일 뿐이에요 : 그 버튼을 눌렀을 때 **그 버튼의 표시만** 사라져요 (아직 안 누른 버튼의 표시는 그대로 · 안 해도 눌렀으면 그날은 다시 안 붙음)
           - 다음 날이 되면 새것이니까 다시 알려 줘요 · 이미 한 것은 처음부터 안 붙어요 */
        const SVC_SEEN = 'malang_daily_seen';                      // 오늘 이미 알려 준 것 { d: '2026-10-06', ids: [버튼 id…] }
        const svcDay = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
        function svcSeenGet() {
            try { const o = JSON.parse(localStorage.getItem(SVC_SEEN)); if (o && o.d === svcDay() && Array.isArray(o.ids)) return o.ids; } catch (e) {}
            return [];
        }
        function svcSeenAdd(ids) {
            const a = svcSeenGet(); ids.forEach(i => { if (!a.includes(i)) a.push(i); });
            try { localStorage.setItem(SVC_SEEN, JSON.stringify({ d: svcDay(), ids: a })); } catch (e) {}
        }
        async function svcDailyBadges() {
            const mark = (id, txt) => {
                const b = document.getElementById(id); if (!b) return;
                let e = b.querySelector('.svc-badge');
                if (!txt) { if (e) e.remove(); return; }
                if (!e) { e = document.createElement('em'); e.className = 'svc-badge'; b.appendChild(e); }
                e.textContent = txt;
            };
            const seen = svcSeenGet(), fresh = id => !seen.includes(id);
            const stamp = typeof attendDone === 'function' && !attendDone() && fresh('svcBtnAttend');
            const luck = typeof luckDone === 'function' && !luckDone() && fresh('svcBtnLuck');
            const ques = typeof questionDone === 'function' && !questionDone() && fresh('svcBtnQuestion');
            let water = false;
            if (typeof plantStatus === 'function' && fresh('svcBtnPlant')) { try { const p = await plantStatus(); water = !p.watered && p.wrote; } catch (e) {} }
            mark('svcBtnAttend', stamp ? '오늘 아직!' : '');
            mark('svcBtnLuck', luck ? '🍀 NEW' : '');
            mark('svcBtnQuestion', ques ? '💬 NEW' : '');
            mark('svcBtnPlant', water ? '💧 물 주기' : '');
            mark('svcCatDaily', (stamp ? 1 : 0) + (water ? 1 : 0) + (luck ? 1 : 0) + (ques ? 1 : 0) || '');
        }
        /* 🌱 매일 칸의 버튼을 누르면 그 버튼만 '알려 줌' 처리 (다른 버튼의 표시는 건드리지 않아요) */
        document.addEventListener('click', e => {
            const b = e.target.closest && e.target.closest('#svcPanel-daily .service-btn[id]');
            if (!b || !b.querySelector('.svc-badge')) return;
            svcSeenAdd([b.id]);
            setTimeout(svcDailyBadges, 0);
        }, true);
        const SVC_CAT_NAMES = { daily: '🌱 매일', fortune: '🔮 운세·마음', make: '🧸 인형 꾸미기', game: '🕹️ 게임', watch: '🎧 보고·듣기', together: '💌 함께하기' };
        function svcOpenCat(id) {
            const panel = document.getElementById('svcPanel-' + id); if (!panel) return;
            document.getElementById('svcCats').hidden = true;
            document.querySelectorAll('#serviceModal .svc-panel').forEach(p => { p.hidden = p !== panel; });
            document.getElementById('svcTitle').textContent = SVC_CAT_NAMES[id] || '☕ 카페';
            document.getElementById('svcBack').classList.remove('mt-none');
        }
        function goCafe() {
            window.open(CAFE_URL, '_blank', 'noopener');
        }
        function comingSoon(name) { showMsg(name + ' 기능은 준비 중이에요.<br>조금만 기다려 주세요!'); }
        function openShop(at) { window.open('shop/' + (at || ''), '_blank'); }      // at : 문구점 안의 칸 (예 '#/c/스티커')
        function openPet() { comingSoon('🐾 펫 키우기'); }
        if (typeof window.openPuppetShow !== 'function') window.openPuppetShow = () => comingSoon('🎭 인형극');   // js/puppet.js 가 없을 때만
        function openSweetVideo() { comingSoon('🎬 달콤영상'); }
        function openFortune() { if (typeof openFortuneCard === 'function') openFortuneCard(); else comingSoon('🔮 포춘카드'); }   // js/fortune.js
        function openComics() { comingSoon('📚 만화방'); }
        function openPodcast() { comingSoon('🎙️ 팟캐스트'); }
        function openAudiobook() { comingSoon('📖 오디오북'); }
        function openMusic() { comingSoon('🎧 음악듣기'); }      // AI로 만든 음악 목록 (툴바 🎵 배경음악과는 다른 기능)
        function openRandomBox() { if (typeof openGacha === 'function') openGacha(); else comingSoon('🎁 랜덤박스'); }   // js/gacha.js

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
        const FEEDBACK_TIMEOUT_MS = 5000;                      // 5초 안에 '저장했어요' 답이 없으면 끊고 다시 시도하게
        /* 확인 번호 : 같은 글을 다시 보내면 같은 번호를 붙여요.
           5초에 끊겨도 서버는 뒤에서 저장을 끝낼 수 있는데, 그때 다시 눌러도 서버가 번호를 보고 두 번 쓰지 않아요. */
        let feedbackMsgId = '', feedbackMsgText = '';
        function feedbackIdFor(text) {
            if (text !== feedbackMsgText || !feedbackMsgId) {
                feedbackMsgText = text;
                feedbackMsgId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
            }
            return feedbackMsgId;
        }
        let feedbackSending = false;

        /* 전송 중에 창(탭)을 닫으려 하면 브라우저가 한 번 물어봐요 */
        window.addEventListener('beforeunload', e => { if (feedbackSending) { e.preventDefault(); e.returnValue = ''; } });

        /* '전송 중…' 창을 실패 안내로 바꿔서 보여 주기 : 다 읽고 [닫기]를 누를 때까지 그대로 있어요 */
        function showFeedbackFail(msg) {
            const pop = document.getElementById('feedbackSending'), card = pop.querySelector('.sending-card');
            const close = document.getElementById('feedbackFailClose');
            document.getElementById('feedbackSendingSpin').hidden = true;
            document.getElementById('feedbackSendingSec').hidden = true;
            document.getElementById('feedbackSendingTitle').textContent = '⚠ 전송하지 못했어요';
            document.getElementById('feedbackSendingMsg').innerHTML = msg;
            card.classList.add('fail');
            close.hidden = false;
            pop.hidden = false;
            close.onclick = () => {
                pop.hidden = true; close.hidden = true; close.onclick = null;
                document.getElementById('feedbackInput').focus();
            };
            close.focus();
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
            document.getElementById('feedbackFailClose').hidden = true;
            btn.disabled = true; input.disabled = true; closeBtn.disabled = true;   // 전송 중엔 닫기도 막기
            btn.textContent = '📨 보내는 중…';
            /* '전송 중…' 창 : 걸린 시간을 보여 주고, 3초가 넘으면 늦는 이유를 안내 */
            pop.querySelector('.sending-card').classList.remove('fail');
            document.getElementById('feedbackSendingSpin').hidden = false;
            document.getElementById('feedbackSendingTitle').textContent = '💌 전송 중…';
            popSec.hidden = true;
            popMsg.textContent = '잠시만 기다려 주세요.';
            pop.hidden = false;
            const msgId = feedbackIdFor(text);
            const ctl = new AbortController();
            const timer = setTimeout(() => ctl.abort(), FEEDBACK_TIMEOUT_MS);
            let ok = false, reason = '';
            try {
                const res = await fetch(FEEDBACK_SCRIPT_URL, {
                    method: 'POST', credentials: 'omit', signal: ctl.signal,
                    body: new URLSearchParams({ comment: text, id: msgId, me: (typeof pr !== 'undefined' && pr.me) || '' })   // comment=내용 & id=확인 번호 & me=회원번호 (로그인했을 때만)
                });
                const data = await res.json().catch(() => null);
                ok = !!(data && data.ok);
                if (!ok) reason = 'server';
            } catch (err) {
                reason = err && err.name === 'AbortError' ? 'timeout' : 'network';
                console.error('건의사항 전송 오류:', err);
            } finally {
                clearTimeout(timer);
                feedbackSending = false;
                btn.disabled = false; input.disabled = false; closeBtn.disabled = false;
                btn.textContent = '📨 전송';
                pop.hidden = true;
            }

            if (ok) {
                feedbackMsgId = ''; feedbackMsgText = '';
                input.value = '';
                document.getElementById('feedbackCount').textContent = '0';
                closeFeedback();
                showMsg('건의사항이 전송되었어요.<br>소중한 의견 감사합니다 💌');
            } else {
                showFeedbackFail({
                    timeout: '연결이 잠깐 늦어지고 있어요.<br>전송 버튼을 한 번 더 눌러 주세요.',
                    network: '인터넷 연결을 확인하고<br>다시 시도해 주세요.',
                    server: '서버에서 저장하지 못했어요.<br>잠시 후 다시 시도해 주세요.'
                }[reason] + '<br><span style="font-size:12px;color:#999;">적은 내용은 그대로 남아 있어요.</span>');
            }
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['service'] = true;
