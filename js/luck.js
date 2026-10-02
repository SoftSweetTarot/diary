/* 말랑달콤 다이어리 - js/luck.js
   🍀 오늘의 행운 : 클로버 밭에서 네잎클로버를 찾으면 오늘의 행운이 열려요 (놀이터 → 매일 말랑 → 🍀 오늘의 행운)
   - 행운 지수 · 행운의 색 · 숫자 · 물건 · 시간 · 오늘의 한마디 · 행운 미션
   - 하루 동안은 같은 결과 (날짜 + 사람마다 다른 행운 번호로 정해져요) → 다음 날 다시 열면 새 행운
     행운 번호는 처음 한 번 만들어 설정(settings.json)에 저장 · 게스트는 이 기기에 저장
   - 📌 다이어리에 붙이기 : 행운 카드를 오늘 페이지에 붙여요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (오늘의 행운만 '준비 중') */

        const LK_KEY = 'diary_luck_seed';            // 설정 저장소 키 (사람마다 다른 행운 번호)
        const LK_LOCAL = 'malang_luck_seed';         // 게스트용 (이 기기)
        const LK_FOUND = 'malang_luck_found';        // 오늘 네잎클로버를 찾았는지 (이 기기 · 다시 열면 바로 결과)
        const LK_COLORS = [
            ['연분홍', '#ffc2d4'], ['하늘색', '#9fd3ff'], ['민트', '#9ee6cf'], ['라벤더', '#c9b6ff'], ['레몬', '#fff08a'], ['복숭아', '#ffcfae'],
            ['코랄', '#ff8f7a'], ['크림', '#fff4d6'], ['올리브', '#b5c46a'], ['네이비', '#3d4f8f'], ['와인', '#9e3a5a'], ['하양', '#ffffff'],
            ['살구', '#ffb98a'], ['바다색', '#4fb3c8'], ['보라', '#9a6bd6'], ['초록', '#6cc46c'], ['노랑', '#ffd23f'], ['체리', '#e8384f']
        ];
        const LK_ITEMS = ['손거울', '립밤', '머리끈', '손수건', '이어폰', '텀블러', '좋아하는 볼펜', '포스트잇', '향수', '반지', '줄무늬 양말', '모자',
            '작은 우산', '사탕 한 알', '핸드크림', '책갈피', '동전 한 닢', '열쇠고리', '머리핀', '귀여운 스티커', '초콜릿', '꽃 한 송이', '따뜻한 차', '손목시계'];
        const LK_TIMES = ['아침 7~9시', '오전 10시 무렵', '점심 먹을 즈음', '오후 2~3시', '오후 4시 무렵', '해 질 녘', '저녁 먹은 뒤', '밤 9시 무렵', '잠들기 전'];
        const LK_OPEN = [
            ['반짝반짝 빛나는 날이에요.', '기분 좋은 일이 연달아 찾아오는 날이에요.', '행운의 바람이 내 쪽으로 부는 날이에요.'],
            ['포근하고 다정한 기운이 감도는 날이에요.', '작은 기쁨이 여기저기 숨어 있는 날이에요.', '마음먹은 일이 술술 풀리는 날이에요.'],
            ['천천히 가도 괜찮은 날이에요.', '차분하게 나를 돌보기 좋은 날이에요.', '쉬어 가면 더 멀리 가는 날이에요.']
        ];
        const LK_MID = ['뜻밖의 연락이 반가운 소식을 데려와요.', '오래 미뤄 둔 일을 끝내면 마음이 가벼워져요.', '가까운 사람의 한마디가 큰 힘이 돼요.',
            '평소와 다른 길로 가 보면 재미있는 걸 발견해요.', '먼저 건넨 인사가 좋은 인연으로 이어져요.', '맛있는 걸 먹으면 운이 한 칸 더 올라가요.',
            '작은 친절이 두 배가 되어 돌아와요.', '좋아하는 노래가 하루의 분위기를 바꿔 줘요.', '정리 정돈을 하면 잃어버린 물건을 찾을 수도 있어요.',
            '궁금했던 걸 물어보면 생각보다 쉽게 답을 얻어요.', '새로 배우는 것이 머리에 쏙쏙 들어와요.', '웃는 얼굴이 행운을 끌어당겨요.'];
        const LK_END = ['오늘의 나를 많이 칭찬해 주세요.', '하루 끝에 일기로 오늘을 남겨 보세요.', '물 한 잔 마시고 크게 기지개를 켜 봐요.',
            '서두르지 말고 내 속도로 가요.', '고마운 마음은 미루지 말고 전해요.', '좋은 일은 꼭 기록해 두세요.'];
        const LK_MISSIONS = ['📔 오늘 일기에 고마웠던 사람 한 명 적기', '☁️ 하늘 사진 한 장 찍어 보기', '🎵 좋아하는 노래 한 곡 끝까지 듣기',
            '💧 물 여섯 잔 마시기', '😊 거울 보고 한 번 웃어 주기', '🚶 10분만 산책하기', '💌 오랜만인 친구에게 안부 보내기',
            '📔 오늘 가장 맛있었던 것 일기에 적기', '🧹 책상 위 하나만 정리하기', '🌙 오늘은 30분 일찍 자기', '🙆 어깨 쭉 펴고 스트레칭하기',
            '📔 오늘의 기분을 색깔로 일기에 남기기', '🍀 누군가에게 칭찬 한마디 건네기', '📚 책 한 쪽이라도 읽기', '🌷 화분에 물 주기 (일기 쓰고!)'];

        const lk = { built: false, open: false, res: null };
        const lkq = id => document.getElementById(id);
        const lkSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        function lkDay(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
        function lkSeed() {
            let v = null;
            try { v = +(lkSync() ? store.getItem(LK_KEY) : localStorage.getItem(LK_LOCAL)); } catch (e) {}
            if (!(v > 0)) {
                v = 1 + Math.floor(Math.random() * 999999);
                try { if (lkSync()) store.setItem(LK_KEY, String(v)); else localStorage.setItem(LK_LOCAL, String(v)); } catch (e) {}
            }
            return v;
        }
        function lkRand(seed) {                                  // 날마다 같은 순서로 나오는 작은 난수
            let s = seed >>> 0 || 1;
            return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
        }
        function lkMake() {
            const day = lkDay(), n = day.split('-').map(Number);
            const r = lkRand(lkSeed() * 31 + n[0] * 372 + n[1] * 31 + n[2]);
            for (let i = 0; i < 5; i++) r();
            const pick = a => a[Math.floor(r() * a.length)];
            const score = 62 + Math.floor(r() * 39);              // 62~100 (나쁜 날은 없어요)
            const tier = score >= 88 ? 0 : score >= 74 ? 1 : 2;
            const color = pick(LK_COLORS);
            return { day, score, stars: score >= 88 ? 5 : score >= 74 ? 4 : 3, color, num: 1 + Math.floor(r() * 45), item: pick(LK_ITEMS), time: pick(LK_TIMES),
                msg: [pick(LK_OPEN[tier]), pick(LK_MID), pick(LK_END)], mission: pick(LK_MISSIONS) };
        }

        /* ---------- 화면 ---------- */
        function lkBuild() {
            if (lk.built) return;
            lk.built = true;
            const el = document.createElement('div');
            el.id = 'luckRoom'; el.className = 'lk-room';
            el.innerHTML = `
              <div class="lk-bar"><span class="lk-sp"></span><b>🍀 오늘의 행운</b><button class="lk-x" type="button" onclick="closeLuck()" aria-label="닫기">✕</button></div>
              <div class="lk-wrap">
                <section id="lkFind">
                  <p class="lk-lead">클로버 밭 어딘가에 <b>네잎클로버</b>가 숨어 있어요.<br>찾아서 톡! 누르면 오늘의 행운이 열려요.</p>
                  <div class="lk-field" id="lkField"></div>
                  <p class="lk-hint" id="lkHint"></p>
                </section>
                <section id="lkResult" hidden></section>
              </div>`;
            document.body.appendChild(el);
        }
        function lkClover(four, size) {
            const leaf = a => `<path d="M0 0 C -14 -6 -16 -22 -8 -26 C -3 -28 0 -24 0 -20 C 0 -24 3 -28 8 -26 C 16 -22 14 -6 0 0Z" transform="rotate(${a})"/>`;
            const ang = four ? [0, 90, 180, 270] : [0, 120, 240];
            return `<svg viewBox="-34 -34 68 84" width="${size}" height="${size * 84 / 68}"><path d="M0 4 C 2 20 6 34 12 46" stroke="#4f9a45" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                <g fill="${four ? '#5fc46a' : '#7ccf7f'}" stroke="#3f8a3a" stroke-width="2">${ang.map(leaf).join('')}</g><circle r="3" fill="#3f8a3a"/></svg>`;
        }
        function lkField() {
            const f = lkq('lkField'), N = 20, hit = Math.floor(Math.random() * N);
            f.innerHTML = '';
            for (let i = 0; i < N; i++) {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'lk-cl';
                b.style.setProperty('--r', (Math.random() * 50 - 25).toFixed(0) + 'deg');
                b.style.setProperty('--d', (Math.random() * 2).toFixed(2) + 's');
                b.innerHTML = lkClover(i === hit, 44 + Math.floor(Math.random() * 12));
                b.setAttribute('aria-label', i === hit ? '네잎클로버' : '세잎클로버');
                if (i === hit) { b.classList.add('four'); b.onclick = () => lkFound(b); }
                else b.onclick = () => {                     // 세잎클로버 : 흔들리고 흐려져요 (같은 걸 또 누르지 않게 · 언젠가는 꼭 찾아요)
                    if (b.classList.contains('seen')) return;
                    b.classList.add('no', 'seen');
                    const left = f.querySelectorAll('.lk-cl:not(.seen)').length;
                    lkq('lkHint').textContent = left <= 4 ? `🍀 거의 다 왔어요! 남은 클로버 ${left}개` : '🍀 세잎클로버예요. 꽃말은 "행복"! 네잎을 찾아봐요';
                };
                f.appendChild(b);
            }
            lkq('lkHint').textContent = '';
        }
        function lkFound(b) {
            b.classList.add('got');
            try { localStorage.setItem(LK_FOUND, lkDay()); } catch (e) {}
            setTimeout(() => { if (lk.open) lkShowResult(true); }, 700);
        }
        function lkShowResult(fresh) {
            const R = lk.res = lkMake(), d = new Date();
            lkq('lkFind').hidden = true;
            const box = lkq('lkResult'); box.hidden = false;
            box.className = fresh ? 'lk-in' : '';
            box.innerHTML = `
              <div class="lk-card">
                <div class="lk-top"><span class="lk-four">${lkClover(true, 46)}</span><div><small>${d.getMonth() + 1}월 ${d.getDate()}일</small><b>오늘의 행운</b></div></div>
                <div class="lk-score"><div class="lk-gauge"><i style="width:${R.score}%"></i></div><b>${R.score}<small>점</small></b></div>
                <p class="lk-msg">${R.msg.join(' ')}</p>
                <div class="lk-grid">
                  <div><small>행운의 색</small><b><span class="lk-sw" style="background:${R.color[1]}"></span>${R.color[0]}</b></div>
                  <div><small>행운의 숫자</small><b>${R.num}</b></div>
                  <div><small>행운의 물건</small><b>${R.item}</b></div>
                  <div><small>행운의 시간</small><b>${R.time}</b></div>
                </div>
                <div class="lk-mission"><small>🎯 오늘의 행운 미션</small><b>${R.mission}</b></div>
              </div>
              <button class="lk-go" type="button" onclick="lkStick()">📌 다이어리에 붙이기</button>
              <p class="lk-tip">💡 오늘의 행운은 하루 동안 그대로예요. 내일 다시 오면 새 행운이 기다려요.<br>📌 오늘 페이지에 붙이면 일기를 쓴 걸로 쳐서 🌷 화분에 물도 줄 수 있어요.</p>`;
        }

        /* 다이어리에 붙일 행운 카드 (그림) */
        function lkCardSvg(R) {
            const x = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
            const [, m, d] = R.day.split('-').map(Number), F = "'Jua','Gowun Dodum','Noto Sans KR',sans-serif";
            const stars = '★'.repeat(R.stars) + '☆'.repeat(5 - R.stars);
            const leaf = a => `<path d="M0 0 C -14 -6 -16 -22 -8 -26 C -3 -28 0 -24 0 -20 C 0 -24 3 -28 8 -26 C 16 -22 14 -6 0 0Z" transform="rotate(${a})"/>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
<rect x="4" y="4" width="292" height="192" rx="22" fill="#f1fbef" stroke="#8fd08a" stroke-width="3"/>
<rect x="14" y="14" width="272" height="172" rx="16" fill="none" stroke="#bfe8b8" stroke-width="2" stroke-dasharray="6 5"/>
<g transform="translate(46 50) scale(.9)" fill="#5fc46a" stroke="#3f8a3a" stroke-width="2">${[0, 90, 180, 270].map(leaf).join('')}<circle r="3" fill="#3f8a3a"/></g>
<text x="78" y="44" font-size="13" fill="#6a9a62" font-family="${F}">${m}월 ${d}일</text>
<text x="78" y="66" font-size="20" font-weight="bold" fill="#3f7a3a" font-family="${F}">오늘의 행운 ${R.score}점</text>
<text x="272" y="44" font-size="15" text-anchor="end" fill="#f2b630" font-family="${F}">${stars}</text>
<rect x="28" y="88" width="20" height="20" rx="6" fill="${R.color[1]}" stroke="#c9c9c9"/>
<text x="56" y="103" font-size="14" fill="#4a5a46" font-family="${F}">행운의 색 ${x(R.color[0])} · 숫자 ${R.num}</text>
<text x="28" y="130" font-size="14" fill="#4a5a46" font-family="${F}">🎁 ${x(R.item)} · ⏰ ${x(R.time)}</text>
<text x="28" y="160" font-size="13.5" fill="#3f7a3a" font-family="${F}">🎯 ${x(R.mission.replace(/^\S+\s/, ''))}</text>
</svg>`;
        }
        function lkStick() {
            if (!lk.res || typeof addImage !== 'function') return;
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            if (addImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(lkCardSvg(lk.res)))) {
                const box = document.querySelector('#canvasArea .element-box:last-child'); if (box) box.style.width = '220px';
                closeLuck();
                if (typeof toast === 'function') toast('📌 행운 카드를 다이어리에 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
            }
        }

        function openLuck() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            lkBuild();
            lk.open = true;
            lkq('luckRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            let found = false;
            try { found = localStorage.getItem(LK_FOUND) === lkDay(); } catch (e) {}
            if (found) lkShowResult(false);
            else { lkq('lkFind').hidden = false; lkq('lkResult').hidden = true; lkField(); }
            lkq('luckRoom').scrollTop = 0;
        }
        function closeLuck() {
            lk.open = false;
            const r = lkq('luckRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        function luckDone() { try { return localStorage.getItem(LK_FOUND) === lkDay(); } catch (e) { return true; } }   // 오늘 행운을 열어 봤나요? (이 기기)
        window.openLuck = openLuck;
        window.luckDone = luckDone;
