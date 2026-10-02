/* 말랑달콤 다이어리 - js/tojeong.js
   🎍 토정비결 : 생년월일로 한 해의 운세(괘)를 짓고, 총운과 달마다의 운세를 보여 줘요 (놀이터 → 🎍 토정비결)
   - 괘 짓기는 전해 오는 토정비결 계산법을 따라요 (모두 음력 기준)
       상괘(1~8) = (세는 나이 + 그해의 태세수) ÷ 8 의 나머지 (0 이면 8)
       중괘(1~6) = (그해 생월의 날수 29·30 + 그해 생월의 월건수) ÷ 6 의 나머지 (0 이면 6)
       하괘(1~3) = (생일 + 그해 생월 생일의 일진수) ÷ 3 의 나머지 (0 이면 3)
       태세수·월건수·일진수 = 간지의 천간수 + 지지수 (갑기9 을경8 병신7 정임6 무계5 / 자오9 축미8 인신7 묘유6 진술5 사해4)
   - 풀이 글은 옛 토정비결의 뜻을 바탕으로 말랑달콤이 새로 쓴 글이에요. (재미로 보는 신년운세)
   - 음력 계산 : js/lib/korean-lunar-calendar.min.js (MIT 라이선스 · 토정비결을 처음 열 때만 불러와요)
   - 생년월일은 이 기기에만 기억해요. (드라이브 · 서버로 보내지 않아요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (토정비결만 '준비 중') */

        const TJ_BIRTH_KEY = 'malang_tojeong_birth';
        const TJ_CG = [9, 8, 7, 6, 5, 9, 8, 7, 6, 5];               // 천간수 : 갑을병정무기경신임계
        const TJ_JJ = [9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4];         // 지지수 : 자축인묘진사오미신유술해
        const TJ_ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

        /* 상괘 : 한 해의 큰 그림 */
        const TJ_SANG = [
            { s: '☰', head: '하늘이 활짝 열리고', key: '도전', star: 4, t: '큰 뜻을 품기 좋은 해예요. 미뤄 두었던 꿈에 다시 손을 뻗으면 생각보다 높은 곳까지 오를 수 있어요.' },
            { s: '☱', head: '맑은 연못에 웃음이 번지고', key: '웃음', star: 4, t: '사람 사이에 기쁨이 넘치는 해예요. 말 한마디가 복을 부르니 고마운 마음을 자주 전해 보세요.' },
            { s: '☲', head: '등불이 환하게 밝혀지고', key: '재능', star: 4, t: '나의 재능과 노력이 드러나 이름이 빛나는 해예요. 다만 불은 뜨거운 법이니 겸손함을 함께 챙겨요.' },
            { s: '☳', head: '봄 우레가 잠든 땅을 깨우고', key: '시작', star: 4, t: '새로운 시작이 힘차게 움트는 해예요. 처음에는 낯설고 놀랄 일도 있지만 그 변화가 기회의 문을 열어 줘요.' },
            { s: '☴', head: '순한 바람이 길을 열어 주고', key: '인연', star: 4, t: '흐름을 잘 타면 막힘이 없는 해예요. 새로운 인연과 움직임이 많고, 부드럽게 다가갈수록 일이 술술 풀려요.' },
            { s: '☵', head: '깊은 물을 천천히 건너고', key: '인내', star: 3, t: '쉬운 길보다 굽은 길을 지나는 해예요. 그러나 물을 건넌 뒤에는 단단해진 내가 기다리고 있으니 서두르지 말고 한 걸음씩 가요.' },
            { s: '☶', head: '산처럼 묵직하게 자리를 지키고', key: '배움', star: 3, t: '크게 움직이기보다 안을 채우기 좋은 해예요. 배움과 저축처럼 차곡차곡 쌓는 일이 다음 해의 큰 힘이 돼요.' },
            { s: '☷', head: '너른 땅에 씨앗을 뿌리고', key: '성실', star: 3, t: '부지런히 가꾸는 만큼 거두는 해예요. 당장 열매가 보이지 않아도 뿌린 씨앗은 땅속에서 자라고 있어요.' }
        ];
        /* 중괘 : 한 해가 흘러가는 모습 · p = 달마다의 기운 (2 좋음 · 1 보통 · 0 차분히) */
        const TJ_JUNG = [
            { tail: '곳간이 넉넉히 차오르는 해', star: 0, t: '올해는 재물운이 따뜻하게 흐르는 편이에요. 작은 수입이 꾸준히 모이고, 아껴 둔 돈이 쓸모 있게 쓰여요.', p: [2, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1] },
            { tail: '귀한 사람이 손을 내미는 해', star: 0, t: '어려운 순간마다 도와주는 사람이 나타나요. 먼저 마음을 열고 인사를 건네면 그 인연이 오래 이어져요.', p: [1, 2, 2, 1, 2, 1, 1, 2, 1, 1, 2, 1] },
            { tail: '늦게 피는 꽃이 더 향기로운 해', star: -1, t: '노력한 만큼 결과가 바로 오지 않아 답답할 때가 있어요. 하지만 가을로 갈수록 하나씩 열매가 맺히니 조금만 더 힘을 내요.', p: [0, 1, 1, 1, 0, 1, 1, 2, 2, 1, 2, 2] },
            { tail: '새 길로 발걸음을 옮기는 해', star: 0, t: '이사, 이직, 여행처럼 자리를 옮길 일이 생기기 쉬워요. 낯선 곳에서 오히려 좋은 기회를 만나게 돼요.', p: [1, 1, 2, 2, 1, 1, 2, 1, 1, 1, 2, 1] },
            { tail: '말 한마디를 곱게 고르는 해', star: -1, t: '사람 사이에 오해가 생기기 쉬운 해예요. 급할 때 한 번 더 생각하고 말하면 구설은 비켜 가고 믿음은 두터워져요.', p: [1, 1, 0, 1, 2, 1, 0, 1, 2, 1, 1, 2] },
            { tail: '나를 아끼며 쉬어 가는 해', star: -1, t: '몸과 마음의 건강을 먼저 챙겨야 하는 해예요. 쉬는 날을 정해 두고 무리하지 않으면 오히려 일도 더 잘 풀려요.', p: [1, 1, 1, 0, 1, 2, 1, 1, 0, 2, 1, 2] }
        ];
        /* 하괘 : 한 해의 마무리 */
        const TJ_HA = [
            { star: 1, end: 1, t: '끝이 좋은 운이에요. 연말로 갈수록 좋은 소식이 모여 웃으며 한 해를 마무리하게 돼요.' },
            { star: 0, end: 0, t: '처음과 끝이 고르게 이어지는 운이에요. 큰 굴곡 없이 차분하게 한 해를 걸어가요.' },
            { star: -1, end: -1, t: '마무리에 조금 더 마음을 써야 하는 운이에요. 욕심을 덜어 내고 하던 일을 정성껏 매듭지으면 들어온 복이 새지 않아요.' }
        ];
        /* 달마다의 운세 글 : [기운 0 · 1 · 2][분야] */
        const TJ_DOMAINS = [
            { e: '💰', n: '재물' }, { e: '💞', n: '사람' }, { e: '📚', n: '일·공부' }, { e: '💪', n: '건강' }, { e: '🌿', n: '마음' }
        ];
        const TJ_LINES = [
            [   /* 0 : 차분히 */
                ['빌려주거나 보증을 서는 일은 이번 달엔 피해요.', '충동구매만 조심하면 손해 볼 일이 없어요.', '지갑이나 카드 같은 작은 물건을 잃어버리지 않게 챙겨요.', '솔깃한 돈 이야기는 한 번 더 확인하고 결정해요.'],
                ['작은 말이 오해로 번지기 쉬우니 말을 아껴요.', '남의 일에 너무 깊이 끼어들지 않는 게 좋아요.', '서운한 마음은 쌓아 두지 말고 부드럽게 꺼내 보세요.', '약속을 꼭 지키면 믿음이 흔들리지 않아요.'],
                ['서두르면 실수가 생기니 한 번 더 확인해요.', '일을 너무 많이 떠안지 않도록 조절해요.', '중요한 결정은 다음 달로 미뤄도 괜찮아요.', '마감과 일정을 미리미리 챙겨 두세요.'],
                ['피곤이 쌓이기 쉬우니 쉬는 날을 꼭 챙겨요.', '감기나 배탈처럼 작은 병을 조심해요.', '밤늦게까지 깨어 있는 날을 줄여 보세요.', '서두르다 넘어지지 않게 발밑을 조심해요.'],
                ['걱정이 많아지는 달이지만 지나가는 구름일 뿐이에요.', '남과 비교하는 마음이 들면 나만의 속도를 떠올려요.', '마음이 지칠 땐 믿을 만한 사람에게 털어놓아요.', '작은 실수에 너무 오래 머물지 않아도 괜찮아요.']
            ],
            [   /* 1 : 보통 */
                ['들어오는 만큼 나가는 달이니 가계부를 한 번 써 봐요.', '큰돈보다 작은 돈을 아끼는 습관이 복을 지켜요.', '돈 문제는 서두르지 않으면 무난하게 지나가요.', '꼭 필요한 곳에만 쓰면 넉넉하게 한 달을 보내요.'],
                ['가까운 사람과 차 한잔 나누면 마음이 한결 편해져요.', '오래 연락하지 못한 친구에게 먼저 안부를 물어봐요.', '많은 사람보다 몇 사람과 깊이 지내기 좋은 달이에요.', '가족과 보내는 시간이 작은 행복을 만들어 줘요.'],
                ['큰 변화보다 맡은 일을 꼼꼼히 마무리하기 좋아요.', '계획을 다시 세우고 정리하기 좋은 달이에요.', '꾸준함이 실력이 되는 달이니 매일 조금씩 해 봐요.', '도움을 청하면 일이 훨씬 수월해져요.'],
                ['규칙적인 식사와 잠이 가장 좋은 보약이에요.', '물을 자주 마시고 가볍게 몸을 풀어 줘요.', '빡빡한 일정보다 여유 있는 하루가 좋아요.', '따뜻한 차 한 잔으로 몸을 데워 주세요.'],
                ['조용히 혼자만의 시간을 가지면 생각이 정리돼요.', '일기를 쓰며 마음을 돌아보기 좋은 달이에요.', '조급한 마음을 내려놓으면 길이 보여요.', '좋아하는 노래와 함께 하루를 마무리해 보세요.']
            ],
            [   /* 2 : 좋음 */
                ['막혔던 돈길이 트여 작은 수입이 쏠쏠하게 들어와요.', '뜻밖의 용돈이나 보너스 같은 반가운 돈이 생겨요.', '아껴 둔 돈이 좋은 곳에 쓰여 두 배로 돌아와요.', '물건을 사고팔면 이익을 보기 좋은 달이에요.'],
                ['반가운 사람에게서 기다리던 연락이 와요.', '새로 만난 사람이 오래 함께할 좋은 인연이 돼요.', '주변의 칭찬과 응원이 큰 힘이 되는 달이에요.', '연애운이 피어나 설레는 일이 생길 수 있어요.'],
                ['하던 일에 좋은 결과가 나와 인정받는 달이에요.', '시험이나 면접처럼 평가받는 일에 운이 따라요.', '새로운 일을 시작하기에 딱 좋은 때예요.', '머리가 맑아 배우는 것이 쏙쏙 들어와요.'],
                ['몸이 가볍고 기운이 넘쳐 무엇이든 해낼 수 있어요.', '새로 시작한 운동이 몸에 잘 맞는 달이에요.', '잠이 달고 입맛이 돌아 컨디션이 좋아요.', '밖으로 나가 걷기만 해도 좋은 기운을 얻어요.'],
                ['마음이 맑고 즐거워 웃을 일이 많은 달이에요.', '오래 바라던 소원 하나가 이루어질 수 있어요.', '자신감이 차올라 무엇이든 도전하고 싶어져요.', '작은 일에도 감사한 마음이 행운을 불러와요.']
            ]
        ];
        const TJ_TONE = [{ e: '☁️', t: '차분히' }, { e: '⛅', t: '무난' }, { e: '🌞', t: '좋음' }];
        const TJ_SEASON = m => m <= 3 ? '🌸' : m <= 6 ? '🌿' : m <= 9 ? '🍁' : '❄️';

        const tj = { built: false, open: false, libLoad: null, last: null, timer: 0 };
        const tq = id => document.getElementById(id);

        /* 음력 계산 도구 불러오기 (처음 한 번) */
        function tjLoad() {
            if (window.KoreanLunarCalendar) return Promise.resolve();
            if (tj.libLoad) return tj.libLoad;
            const v = (((document.querySelector('script[src*="js/tojeong.js"]') || {}).src || '').match(/[?&]v=([^&]+)/) || [])[1] || '';
            tj.libLoad = new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = 'js/lib/korean-lunar-calendar.min.js' + (v ? '?v=' + v : '');
                s.onload = () => window.KoreanLunarCalendar ? res() : rej(new Error('lib'));
                s.onerror = () => { tj.libLoad = null; rej(new Error('load')); };
                document.head.appendChild(s);
            });
            return tj.libLoad;
        }

        /* ---------- 괘 짓기 ---------- */
        const tjNum = (cg, jj) => TJ_CG[cg] + TJ_JJ[jj];
        function tjCalc(b, year) {                       // b = { y, m, d, solar, leap }
            const K = window.KoreanLunarCalendar, c = new K();
            let ly, lm, ld;
            if (b.solar) {
                if (!c.setSolarDate(b.y, b.m, b.d)) throw new Error('date');
                const l = c.getLunarCalendar(); ly = l.year; lm = l.month; ld = l.day;
            } else {
                if (!c.setLunarDate(b.y, b.m, b.d, !!b.leap)) throw new Error('date');
                ly = b.y; lm = b.m; ld = b.d;
            }
            const age = year - ly + 1;
            if (age < 1) throw new Error('future');
            if (!c.setLunarDate(year, 1, 1, false)) throw new Error('range');
            const yi = c.getGapJaIndex(), yearName = c.getKoreanGapja().year;          // 그해의 간지 (태세)
            const days = c.setLunarDate(year, lm, 30, false) ? 30 : 29;                // 그해 생월의 날수
            c.setLunarDate(year, lm, 1, false);
            const mi = c.getGapJaIndex();                                                // 그해 생월의 월건
            c.setLunarDate(year, lm, Math.min(ld, days), false);
            const di = c.getGapJaIndex();                                                // 그해 생월 생일의 일진
            const sang = (age + tjNum(yi.cheongan.year, yi.ganji.year)) % 8 || 8;
            const jung = (days + tjNum(mi.cheongan.month, mi.ganji.month)) % 6 || 6;
            const ha = (ld + tjNum(di.cheongan.day, di.ganji.day)) % 3 || 3;
            const c2 = new K(); c2.setLunarDate(ly, 1, 1, false);
            const animal = TJ_ANIMAL[c2.getGapJaIndex().ganji.year];
            return { sang, jung, ha, age, year, yearName, ly, lm, ld, animal };
        }
        /* 괘 → 풀이 */
        function tjRead(g) {
            const S = TJ_SANG[g.sang - 1], J = TJ_JUNG[g.jung - 1], H = TJ_HA[g.ha - 1];
            const stars = Math.max(3, Math.min(5, S.star + J.star + H.star + 1));     // 별 3~5개 (재미로 보는 운세라 너무 낮지 않게)
            const months = J.p.map((v, i) => {
                const shift = J.p[(i + g.sang) % 12];                                    // 상괘에 따라 기운이 조금씩 다르게
                let tone = Math.round((v * 2 + shift) / 3);
                if (i >= 9) tone += H.end;
                tone = Math.max(0, Math.min(2, tone));
                const dom = (g.sang + g.jung * 2 + i) % 5;
                const pool = TJ_LINES[tone][dom];
                return { m: i + 1, tone, dom, line: pool[(g.sang * 7 + g.jung * 3 + g.ha + i * 5) % pool.length] };
            });
            return {
                code: '' + g.sang + g.jung + g.ha, symbol: S.s, title: S.head + ' ' + J.tail, stars, key: S.key,
                text: [S.t, J.t, H.t], months,
                good: months.filter(x => x.tone === 2).map(x => x.m), calm: months.filter(x => x.tone === 0).map(x => x.m)
            };
        }

        /* ---------- 화면 ---------- */
        function tjBuild() {
            if (tj.built) return;
            tj.built = true;
            const now = new Date(), thisYear = now.getFullYear();
            const years = []; for (let y = thisYear; y >= 1930; y--) years.push(y);
            const opt = (arr, sel) => arr.map(v => `<option value="${v}"${v === sel ? ' selected' : ''}>${v}</option>`).join('');
            const el = document.createElement('div');
            el.id = 'tojeongRoom'; el.className = 'tj-room';
            el.innerHTML = `
              <button class="tj-x" type="button" onclick="closeTojeong()" aria-label="닫기">✕</button>
              <div class="tj-wrap">
                <section id="tjForm" class="tj-stage">
                  <div class="tj-seal">運</div>
                  <h2 class="tj-title">토정비결</h2>
                  <p class="tj-sub">태어난 날로 한 해의 흐름을 미리 살펴보는<br>우리 옛 신년운세예요.</p>
                  <div class="tj-card">
                    <div class="tj-row tj-cal">
                      <button type="button" data-cal="solar" class="on">양력</button><button type="button" data-cal="lunar">음력</button>
                      <label class="tj-leap" id="tjLeapWrap" hidden><input type="checkbox" id="tjLeap"> 윤달</label>
                    </div>
                    <div class="tj-row tj-date">
                      <label><select id="tjY">${opt(years, 1995)}</select>년</label>
                      <label><select id="tjM">${opt(Array.from({ length: 12 }, (_, i) => i + 1), 1)}</select>월</label>
                      <label><select id="tjD">${opt(Array.from({ length: 31 }, (_, i) => i + 1), 1)}</select>일</label>
                    </div>
                    <p class="tj-label">어느 해의 운세를 볼까요?</p>
                    <div class="tj-row tj-years" id="tjYears"></div>
                    <button class="tj-go" type="button" onclick="tjShowResult()">🎍 운세 보기</button>
                    <p class="tj-note">생년월일은 이 기기에만 기억하고, 어디에도 보내지 않아요.</p>
                  </div>
                </section>
                <section id="tjResult" class="tj-stage" hidden></section>
              </div>`;
            document.body.appendChild(el);
            el.querySelectorAll('.tj-cal button').forEach(b => b.onclick = () => tjSetCal(b.dataset.cal));
            const yb = tq('tjYears');
            [thisYear, thisYear + 1].forEach(y => {
                const b = document.createElement('button'); b.type = 'button'; b.dataset.y = y; b.textContent = y + '년';
                b.onclick = () => { tj.year = y; yb.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.y === y)); };
                yb.appendChild(b);
            });
            tj.year = now.getMonth() >= 10 ? thisYear + 1 : thisYear;          // 11월부터는 다음 해 운세를 먼저
            yb.querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.y === tj.year));
            try {                                                               // 지난번에 넣은 생년월일 (이 기기에만)
                const b = JSON.parse(localStorage.getItem(TJ_BIRTH_KEY));
                if (b && b.y) { tq('tjY').value = b.y; tq('tjM').value = b.m; tq('tjD').value = b.d; tjSetCal(b.solar ? 'solar' : 'lunar'); tq('tjLeap').checked = !!b.leap; }
            } catch (e) {}
        }
        function tjSetCal(c) {
            tj.cal = c;
            document.querySelectorAll('.tj-cal button').forEach(b => b.classList.toggle('on', b.dataset.cal === c));
            tq('tjLeapWrap').hidden = c !== 'lunar';
        }
        function tjShow(id) { ['tjForm', 'tjResult'].forEach(s => { tq(s).hidden = s !== id; }); tq('tojeongRoom').scrollTop = 0; }

        function openTojeong() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            tjBuild();
            tj.open = true;
            tq('tojeongRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            tjShow('tjForm');
            tjLoad().catch(() => {});
        }
        function closeTojeong() {
            tj.open = false; clearTimeout(tj.timer);
            const r = tq('tojeongRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }

        async function tjShowResult() {
            const b = { y: +tq('tjY').value, m: +tq('tjM').value, d: +tq('tjD').value, solar: tj.cal !== 'lunar', leap: tj.cal === 'lunar' && tq('tjLeap').checked };
            try { await tjLoad(); } catch (e) { toast('🎍 운세 계산 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'); return; }
            let g;
            try { g = tjCalc(b, tj.year); }
            catch (e) {
                showMsg(e.message === 'date' ? '그런 날짜는 달력에 없어요.<br>생년월일을 다시 확인해 주세요.' + (b.leap ? '<br>(그해에는 그 달의 윤달이 없을 수 있어요)' : '')
                    : e.message === 'future' ? '운세를 볼 해보다 늦게 태어난 날짜예요.' : '이 날짜는 운세를 계산할 수 없어요.');
                return;
            }
            try { localStorage.setItem(TJ_BIRTH_KEY, JSON.stringify(b)); } catch (e) {}
            tj.last = { g, r: tjRead(g) };
            tq('tjResult').innerHTML = '<div class="tj-reading"><span>📜</span><p>한 해의 괘를 짓고 있어요…</p></div>';
            tjShow('tjResult');
            clearTimeout(tj.timer);
            tj.timer = setTimeout(tjRender, 1300);
        }

        function tjNowLunarMonth(year) {                   // 오늘이 그해 음력 몇 월인지 (아니면 0)
            try {
                const c = new window.KoreanLunarCalendar(), n = new Date();
                c.setSolarDate(n.getFullYear(), n.getMonth() + 1, n.getDate());
                const l = c.getLunarCalendar();
                return l.year === year ? l.month : 0;
            } catch (e) { return 0; }
        }
        function tjRender() {
            if (!tj.open || !tj.last) return;
            const { g, r } = tj.last, nowM = tjNowLunarMonth(g.year);
            const star = n => '★'.repeat(n) + '☆'.repeat(5 - n);
            const mlist = list => list.length ? list.map(m => m + '월').join(' · ') : '고르게 무난해요';
            tq('tjResult').innerHTML = `
              <article class="tj-paper">
                <div class="tj-top">
                  <div class="tj-gwae">${r.symbol}</div>
                  <div class="tj-who"><b>${g.year}년 ${g.yearName} 운세</b><small>${g.ly}년생 ${g.animal}띠 · 음력 ${g.lm}월 ${g.ld}일 · ${g.age}세</small></div>
                  <div class="tj-code">${r.code}<small>괘</small></div>
                </div>
                <h3 class="tj-head">${r.title}</h3>
                <div class="tj-stars" aria-label="별 ${r.stars}개">${star(r.stars)}</div>
                ${r.text.map(t => `<p>${t}</p>`).join('')}
                <div class="tj-keys">
                  <div><small>올해의 낱말</small><b>${r.key}</b></div>
                  <div><small>기운이 좋은 달</small><b>${mlist(r.good)}</b></div>
                  <div><small>차분히 보낼 달</small><b>${mlist(r.calm)}</b></div>
                </div>
              </article>
              <h4 class="tj-mh">달마다의 운세 <small>(음력)</small></h4>
              <div class="tj-months">
                ${r.months.map(x => `<div class="tj-month t${x.tone}${x.m === nowM ? ' now' : ''}">
                    <div class="tj-mm"><b>${x.m}월</b><span>${TJ_SEASON(x.m)}</span></div>
                    <div class="tj-mt"><span class="tj-tone">${TJ_TONE[x.tone].e} ${TJ_TONE[x.tone].t} · ${TJ_DOMAINS[x.dom].e} ${TJ_DOMAINS[x.dom].n}${x.m === nowM ? ' · 이번 달' : ''}</span><p>${x.line}</p></div>
                  </div>`).join('')}
              </div>
              <div class="tj-actions">
                <button class="tj-go" type="button" onclick="tjStick()">📌 다이어리에 붙이기</button>
                <button class="tj-go ghost" type="button" onclick="tjShow('tjForm')">✏️ 다시 보기</button>
              </div>
              <p class="tj-note">재미로 보는 신년운세예요. 날짜는 모두 음력 기준이에요.</p>`;
            const cur = tq('tjResult').querySelector('.tj-month.now');
            if (cur) setTimeout(() => cur.classList.add('glow'), 300);
        }

        /* 📌 다이어리에 붙이기 */
        function tjStick() {
            if (!tj.last) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { closeTojeong(); showMsg('먼저 다이어리를 열어주세요!'); return; }
            const { g, r } = tj.last, nowM = tjNowLunarMonth(g.year);
            const cur = r.months.find(x => x.m === nowM);
            const body = `🎍 ${g.year}년 ${g.yearName} 토정비결\n${r.title}\n${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}` + (cur ? `\n이번 달(음력 ${cur.m}월) : ${cur.line}` : '');
            closeTojeong();
            if (typeof addText !== 'function') return;
            addText();
            const ta = document.querySelector('#canvasArea .element-box:last-child textarea');
            if (ta) {
                ta.value = body;
                const box = ta.closest('.element-box'); box.style.width = '240px'; box.style.height = '120px';
                ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
            toast('📌 토정비결을 다이어리에 붙였어요');
        }

        document.addEventListener('keydown', e => { if (e.key === 'Escape' && tj.open) closeTojeong(); });

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['tojeong'] = true;
