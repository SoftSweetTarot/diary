/* 말랑달콤 다이어리 - js/tojeong.js
   🎍 토정비결 : 생년월일로 한 해의 운세(괘)를 짓고, 총운을 보여 줘요 (놀이터 → 🎍 토정비결)
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
        /* 중괘 : 한 해가 흘러가는 모습 */
        const TJ_JUNG = [
            { tail: '곳간이 넉넉히 차오르는 해', star: 0, t: '올해는 재물운이 따뜻하게 흐르는 편이에요. 작은 수입이 꾸준히 모이고, 아껴 둔 돈이 쓸모 있게 쓰여요.' },
            { tail: '귀한 사람이 손을 내미는 해', star: 0, t: '어려운 순간마다 도와주는 사람이 나타나요. 먼저 마음을 열고 인사를 건네면 그 인연이 오래 이어져요.' },
            { tail: '늦게 피는 꽃이 더 향기로운 해', star: -1, t: '노력한 만큼 결과가 바로 오지 않아 답답할 때가 있어요. 하지만 가을로 갈수록 하나씩 열매가 맺히니 조금만 더 힘을 내요.' },
            { tail: '새 길로 발걸음을 옮기는 해', star: 0, t: '이사, 이직, 여행처럼 자리를 옮길 일이 생기기 쉬워요. 낯선 곳에서 오히려 좋은 기회를 만나게 돼요.' },
            { tail: '말 한마디를 곱게 고르는 해', star: -1, t: '사람 사이에 오해가 생기기 쉬운 해예요. 급할 때 한 번 더 생각하고 말하면 구설은 비켜 가고 믿음은 두터워져요.' },
            { tail: '나를 아끼며 쉬어 가는 해', star: -1, t: '몸과 마음의 건강을 먼저 챙겨야 하는 해예요. 쉬는 날을 정해 두고 무리하지 않으면 오히려 일도 더 잘 풀려요.' }
        ];
        /* 하괘 : 한 해의 마무리 */
        const TJ_HA = [
            { star: 1, t: '끝이 좋은 운이에요. 연말로 갈수록 좋은 소식이 모여 웃으며 한 해를 마무리하게 돼요.' },
            { star: 0, t: '처음과 끝이 고르게 이어지는 운이에요. 큰 굴곡 없이 차분하게 한 해를 걸어가요.' },
            { star: -1, t: '마무리에 조금 더 마음을 써야 하는 운이에요. 욕심을 덜어 내고 하던 일을 정성껏 매듭지으면 들어온 복이 새지 않아요.' }
        ];
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
            return {
                code: '' + g.sang + g.jung + g.ha, symbol: S.s, title: S.head + ' ' + J.tail, stars, key: S.key,
                text: [S.t, J.t, H.t]
            };
        }


        /* ---------- 👵 토정비결 할머니 : 결과를 말해 주는 그림 (직접 그린 그림 · 파일 없음) ---------- */
        const TJ_MASTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 240">
  <defs>
    <radialGradient id="cheek"><stop offset="0" stop-color="#ff9fb0" stop-opacity=".75"/><stop offset="1" stop-color="#ff9fb0" stop-opacity="0"/></radialGradient>
    <linearGradient id="hair" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e9ef"/><stop offset="1" stop-color="#c9c9d4"/></linearGradient>
  </defs>
  <!-- 뒷머리 · 쪽머리 · 비녀 (얼굴 뒤) -->
  <ellipse cx="110" cy="90" rx="50" ry="52" fill="url(#hair)"/>
  <ellipse cx="110" cy="134" rx="34" ry="15" fill="#c4c4cf"/>
  <rect x="58" y="129" width="104" height="6" rx="3" fill="#e2b24a"/>
  <circle cx="58" cy="132" r="5.5" fill="#e2b24a"/><circle cx="162" cy="132" r="4.5" fill="#d9534f"/>
  <!-- 치마 -->
  <path d="M38 240 C44 196 64 168 110 166 C156 168 176 196 182 240 Z" fill="#46508f"/>
  <path d="M60 240 C66 204 80 182 110 180" fill="none" stroke="#5b66a8" stroke-width="3"/>
  <!-- 저고리 -->
  <path d="M46 214 C48 176 70 150 110 148 C150 150 172 176 174 214 C160 220 140 222 110 222 C80 222 60 220 46 214 Z" fill="#f7d9e3"/>
  <!-- 소매 끝동 -->
  <path d="M46 214 C47 204 50 196 54 190 L70 200 C66 206 64 212 64 218 Z" fill="#c95a7a"/>
  <path d="M174 214 C173 204 170 196 166 190 L150 200 C154 206 156 212 156 218 Z" fill="#c95a7a"/>
  <!-- 깃 · 동정 -->
  <path d="M92 150 L110 184 L128 150" fill="none" stroke="#fff" stroke-width="9" stroke-linejoin="round"/>
  <path d="M92 150 L110 184 L128 150" fill="none" stroke="#9a4a6a" stroke-width="2.5" stroke-linejoin="round" transform="translate(0 5)"/>
  <!-- 고름 -->
  <path d="M112 186 C124 190 132 198 128 214" fill="none" stroke="#c0392b" stroke-width="7" stroke-linecap="round"/>
  <path d="M112 186 C118 196 116 206 108 218" fill="none" stroke="#d9534f" stroke-width="7" stroke-linecap="round"/>
  <circle cx="112" cy="186" r="5" fill="#c0392b"/>
  <!-- 손과 책 -->
  <g transform="translate(110 206)">
    <path d="M-34 -6 L0 2 L34 -6 L34 18 L0 26 L-34 18 Z" fill="#fff8e6" stroke="#c9a46a" stroke-width="2"/>
    <line x1="0" y1="2" x2="0" y2="26" stroke="#c9a46a" stroke-width="2"/>
    <g stroke="#b9a07a" stroke-width="1.4"><line x1="-28" y1="4" x2="-6" y2="8"/><line x1="-28" y1="9" x2="-6" y2="13"/><line x1="6" y1="8" x2="28" y2="4"/><line x1="6" y1="13" x2="28" y2="9"/></g>
    <ellipse cx="-36" cy="10" rx="9" ry="7" fill="#ffd9bf"/><ellipse cx="36" cy="10" rx="9" ry="7" fill="#ffd9bf"/>
  </g>
  <!-- 목 -->
  <rect x="100" y="126" width="20" height="26" rx="8" fill="#ffd9bf"/>
  <!-- 얼굴 -->
  <ellipse cx="110" cy="92" rx="44" ry="46" fill="#ffe1c9"/>
  <!-- 머리 (가르마) -->
  <path d="M66 92 C62 54 86 38 110 38 C134 38 158 54 154 92 C150 72 136 60 110 58 C84 60 70 72 66 92 Z" fill="url(#hair)"/>
  <path d="M110 40 L110 58" stroke="#b0b0bc" stroke-width="2"/>
  <path d="M72 70 C84 60 96 58 108 58" fill="none" stroke="#d6d6de" stroke-width="2"/>
  <path d="M148 70 C136 60 124 58 112 58" fill="none" stroke="#d6d6de" stroke-width="2"/>
  <!-- 귀 -->
  <ellipse cx="66" cy="98" rx="6" ry="9" fill="#ffd4b6"/><ellipse cx="154" cy="98" rx="6" ry="9" fill="#ffd4b6"/>
  <!-- 눈썹 · 눈 (웃는 눈) -->
  <path d="M84 80 q9 -5 18 0" fill="none" stroke="#a9a9b4" stroke-width="3" stroke-linecap="round"/>
  <path d="M118 80 q9 -5 18 0" fill="none" stroke="#a9a9b4" stroke-width="3" stroke-linecap="round"/>
  <path d="M86 94 q7 -7 14 0" fill="none" stroke="#5a4036" stroke-width="3" stroke-linecap="round"/>
  <path d="M120 94 q7 -7 14 0" fill="none" stroke="#5a4036" stroke-width="3" stroke-linecap="round"/>
  <!-- 눈가 주름 -->
  <g stroke="#e8b89a" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M80 96 l-5 2"/><path d="M80 92 l-5 -1"/><path d="M140 96 l5 2"/><path d="M140 92 l5 -1"/></g>
  <!-- 둥근 안경 -->
  <g fill="none" stroke="#8a6a4a" stroke-width="2"><circle cx="93" cy="94" r="12"/><circle cx="127" cy="94" r="12"/><path d="M105 94 q5 -4 10 0"/></g>
  <!-- 볼 · 코 · 입 -->
  <circle cx="84" cy="110" r="10" fill="url(#cheek)"/><circle cx="136" cy="110" r="10" fill="url(#cheek)"/>
  <path d="M108 104 q2 4 4 0" fill="none" stroke="#e0a888" stroke-width="2" stroke-linecap="round"/>
  <path d="M100 116 q10 9 20 0" fill="#d9706a" stroke="#b9504a" stroke-width="1.5" stroke-linejoin="round"/>
  <!-- 반짝 -->
  <g fill="#ffd36b"><path d="M30 60 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3z"/><path d="M186 40 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2z"/></g>
</svg>
`;
        const tjX = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const tjSvgUrl = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        const TJ_MASTER_URL = tjSvgUrl(TJ_MASTER_SVG);
        /* 다이어리에 붙일 그림 : 할머니 + 말풍선 */
        function tjStickSvg(g, r) {
            const S = TJ_SANG[g.sang - 1], J = TJ_JUNG[g.jung - 1];
            const F = "'Nanum Myeongjo','AppleMyungjo','Batang','Noto Serif KR',serif";
            const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
            return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 360 250" width="360" height="250">
<image href="${tjX(TJ_MASTER_URL)}" xlink:href="${tjX(TJ_MASTER_URL)}" x="0" y="40" width="190" height="207" preserveAspectRatio="xMidYMax meet"/>
<path d="M150 18 h196 a12 12 0 0 1 12 12 v118 a12 12 0 0 1 -12 12 h-150 l-26 22 l6 -22 h-26 a12 12 0 0 1 -12 -12 v-118 a12 12 0 0 1 12 -12z" fill="#fffaf0" stroke="#d8c39c" stroke-width="2" transform="translate(-12 0)"/>
<text x="246" y="46" font-size="11" text-anchor="middle" fill="#8a7460" font-family="${F}">${g.year} ${tjX(g.yearName)} · ${g.ly}년생 ${tjX(g.animal)}띠</text>
<text x="246" y="80" font-size="14.5" font-weight="bold" text-anchor="middle" fill="#3b2c22" font-family="${F}">${tjX(S.head)}</text>
<text x="246" y="102" font-size="14.5" font-weight="bold" text-anchor="middle" fill="#3b2c22" font-family="${F}">${tjX(J.tail)}</text>
<text x="246" y="130" font-size="15" text-anchor="middle" fill="#d4a017" letter-spacing="2">${stars}</text>
<g transform="translate(330 166) rotate(5)"><rect x="-20" y="-20" width="40" height="40" rx="6" fill="#b8332a"/><text y="2" font-size="13" font-weight="bold" text-anchor="middle" fill="#fff3e6" font-family="${F}">${r.code}</text><text y="14" font-size="8" text-anchor="middle" fill="#fff3e6" font-family="${F}">괘</text></g>
</svg>`;
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
              <button class="tj-x tj-back" type="button" id="tjBack" onclick="tjShow('tjForm')" aria-label="생년월일 화면으로" hidden>←</button>
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
        function tjShow(id) { ['tjForm', 'tjResult'].forEach(s => { tq(s).hidden = s !== id; }); tq('tjBack').hidden = id === 'tjForm'; tq('tojeongRoom').scrollTop = 0; }

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

        function tjRender() {
            if (!tj.open || !tj.last) return;
            const { g, r } = tj.last, S = TJ_SANG[g.sang - 1], J = TJ_JUNG[g.jung - 1];
            const star = n => '★'.repeat(n) + '☆'.repeat(5 - n);
            tq('tjResult').innerHTML = `
              <div class="tj-scene">
                <div class="tj-master"><img src="${TJ_MASTER_URL}" alt="토정비결 할머니"></div>
                <div class="tj-bubble">
                  <small>어디 보자… ${g.ly}년생 ${g.animal}띠 손님이구먼.</small>
                  <b>${S.head}<br>${J.tail}</b>
                  <span class="tj-stars">${star(r.stars)}</span>
                  <span class="tj-seal2">${r.code}<i>괘</i></span>
                </div>
              </div>
              <article class="tj-paper">
                <div class="tj-who"><b>${g.year}년 ${g.yearName} 운세</b><small>음력 ${g.lm}월 ${g.ld}일생 · ${g.age}세</small></div>
                ${r.text.map(t => `<p>${t}</p>`).join('')}
                <p class="tj-key">올해의 낱말 <b>${r.key}</b></p>
              </article>
              <div class="tj-actions">
                <button class="tj-go" type="button" onclick="tjStick()">📌 다이어리에 붙이기</button>
              </div>
              <p class="tj-note">재미로 보는 신년운세예요.</p>`;
        }

        /* 📌 다이어리에 붙이기 */
        function tjStick() {
            if (!tj.last) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { closeTojeong(); showMsg('먼저 다이어리를 열어주세요!'); return; }
            closeTojeong();
            if (typeof addImage === 'function' && addImage(tjSvgUrl(tjStickSvg(tj.last.g, tj.last.r)))) {
                const box = document.querySelector('#canvasArea .element-box:last-child'); if (box) box.style.width = '230px';
                toast('📌 토정비결을 다이어리에 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
            }
        }

        document.addEventListener('keydown', e => { if (e.key === 'Escape' && tj.open) closeTojeong(); });

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['tojeong'] = true;
