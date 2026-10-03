/* 말랑달콤 다이어리 - js/piggy.js
   🐷 말랑달콤 저금통 (카페 → 🐷 말랑달콤 저금통)
   - 정해진 금액 없이, 마음이 가는 만큼 넣어 주면 한 달 동안 고마움 선물(🎀 마스킹테이프 · 🍬 달콤패턴)이 열려요
   - 100원을 넣어도 똑같이 한 달 · 사람들이 만들어 나눈 스킨 · 패턴은 언제나 누구나
   - 저금 코드 : 구글 계정 번호(permissionId)로 만든 '말랑' + 4글자 → 통장에 찍힌 코드로 누가 넣었는지 알아요
       만드는 법 : FNV-1a 32비트( 'malang-piggy:' + permissionId ) → 아래 글자표(32자)에서 4번 (h % 32, h = floor(h / 32))
       → 저금통 서버를 만들 때 같은 방법으로 맞춰 보면 돼요
   - 선물이 열렸는지는 js/settings.js 의 isSaver() · setSaver() 가 알려 줘요
   ※ 이 파일이 없으면 저금통 버튼을 눌러도 아무 일도 없어요 (다이어리는 정상) */

        /* 💳 받는 통장 (임시) */
        const PIG_BANK = { bank: '○○은행', num: '000-0000-0000-00', holder: '홍길동' };
        const PIG_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const pig = { tab: 'tape', code: '', built: false };

        function pigCode(pid) {
            let h = 0x811c9dc5;
            for (const ch of 'malang-piggy:' + pid) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; }
            let s = '';
            for (let i = 0; i < 4; i++) { s += PIG_ABC[h % 32]; h = Math.floor(h / 32); }
            return '말랑' + s;
        }

        /* ---------- 🔊 동전 소리 : 짤랑~ (연출 소리를 껐으면 조용히) ---------- */
        function pigCoin() {
            const ac = typeof sndFx === 'function' ? sndFx() : null; if (!ac) return;
            [[0, 2637, .16], [.09, 3520, .1], [.2, 2960, .07]].forEach(([at, f, v]) => {
                const t = ac.currentTime + at, g = ac.createGain();
                g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(0.0001, t + .45);
                g.connect(sndOut());
                [[1, 1], [2.41, .3], [3.9, .12]].forEach(([m, a]) => {
                    const o = ac.createOscillator(), og = ac.createGain();
                    o.frequency.value = f * m; og.gain.value = a; o.connect(og).connect(g); o.start(t); o.stop(t + .5);
                });
            });
        }

        /* ---------- 🐷 저금통 그림 ---------- */
        const PIG_SVG = `
          <svg class="pg-pig" viewBox="0 0 220 170" aria-hidden="true">
            <defs>
              <radialGradient id="pgBody" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffe3ec"/><stop offset=".6" stop-color="#ffbfd2"/><stop offset="1" stop-color="#ff9fbb"/></radialGradient>
              <radialGradient id="pgCoinG" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff6c2"/><stop offset=".55" stop-color="#ffd54f"/><stop offset="1" stop-color="#f2a900"/></radialGradient>
            </defs>
            <g class="pg-coin"><circle cx="110" cy="18" r="13" fill="url(#pgCoinG)" stroke="#e09a00" stroke-width="2"/>
              <path d="M110 25 C103 20 104 13 108 13 C109.5 13 110 14.5 110 15 C110 14.5 110.5 13 112 13 C116 13 117 20 110 25Z" fill="#ff8fab"/></g>
            <g class="pg-body">
              <path d="M178 96 q16 -4 14 -16 q-2 -9 -10 -5 q-6 4 2 9" fill="none" stroke="#ff9fbb" stroke-width="4" stroke-linecap="round"/>
              <rect x="58" y="128" width="20" height="24" rx="9" fill="#ffaac2"/><rect x="140" y="128" width="20" height="24" rx="9" fill="#ffaac2"/>
              <path d="M62 52 L56 22 L86 40Z" fill="#ffaac2"/><path d="M64 46 L61 30 L77 40Z" fill="#ffd6e2"/>
              <path d="M150 40 L176 22 L168 52Z" fill="#ffaac2"/><path d="M156 40 L170 30 L166 46Z" fill="#ffd6e2"/>
              <ellipse cx="110" cy="92" rx="76" ry="56" fill="url(#pgBody)"/>
              <ellipse cx="88" cy="62" rx="22" ry="9" fill="#fff" opacity=".45" transform="rotate(-18 88 62)"/>
              <rect x="94" y="38" width="32" height="7" rx="3.5" fill="#d9668a"/>
              <path d="M66 86 q8 -8 16 0" fill="none" stroke="#7a3d52" stroke-width="3.4" stroke-linecap="round"/>
              <path d="M138 86 q8 -8 16 0" fill="none" stroke="#7a3d52" stroke-width="3.4" stroke-linecap="round"/>
              <ellipse cx="62" cy="102" rx="10" ry="6" fill="#ff7f9f" opacity=".45"/><ellipse cx="158" cy="102" rx="10" ry="6" fill="#ff7f9f" opacity=".45"/>
              <ellipse cx="110" cy="108" rx="24" ry="17" fill="#ff9fbb" stroke="#f0839f" stroke-width="2"/>
              <ellipse cx="102" cy="108" rx="4" ry="6" fill="#c45577"/><ellipse cx="118" cy="108" rx="4" ry="6" fill="#c45577"/>
              <path d="M104 128 q6 5 12 0" fill="none" stroke="#7a3d52" stroke-width="2.6" stroke-linecap="round"/>
            </g>
            <g class="pg-spark" fill="#ffd54f"><path d="M30 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/><path d="M196 60 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2z"/><path d="M186 140 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#ff8fab"/></g>
          </svg>`;

        /* ---------- 화면 만들기 ---------- */
        function pigBuild() {
            const box = document.getElementById('pigBody'); if (!box) return;
            const tapes = typeof TAPES !== 'undefined' ? TAPES : [];
            const sweet = typeof BG_PATTERNS !== 'undefined' ? BG_PATTERNS.filter(p => p.tier === 'paid') : [];
            box.innerHTML = `
              <div class="pg-hero">${PIG_SVG}
                <div class="pg-hero-t">말랑달콤 저금통</div>
                <div class="pg-hero-s">작은 마음을 넣어 주면, 달콤한 선물로 보답할게요 💝</div>
              </div>
              <div class="pg-thanks" id="pigThanks" hidden></div>

              <div class="pg-letter">
                <p>안녕하세요, <b>말랑달콤</b>이에요 🌷</p>
                <p>말랑달콤 다이어리는 한 사람이 하나하나 정성껏 만들고 있어요.<br>일기 쓰기와 카페의 모든 놀이는 <b>앞으로도 쭉 무료</b>예요.</p>
                <p>다이어리가 마음에 드셨다면, 저금통에 작은 마음을 살짝 넣어 주세요 🍬</p>
                <p class="pg-sign">넣어 주신 마음은 더 예쁜 다이어리를 만드는 데 소중히 쓸게요.<br>— 말랑달콤 드림 💌</p>
              </div>

              <div class="pg-sec">
                <div class="pg-sec-t">🎁 고마움 선물 <span>한 달 동안 활짝 열려요</span></div>
                <div class="pg-tabs">
                  <button type="button" class="pg-tab" data-t="tape" onclick="pigTab('tape')">🎀 마스킹테이프 <small>${tapes.length}가지</small></button>
                  <button type="button" class="pg-tab" data-t="pat" onclick="pigTab('pat')">🍬 달콤패턴 <small>${sweet.length}가지</small></button>
                </div>
                <div class="pg-gift" data-t="tape">
                  <p class="pg-gift-d">사진 모서리나 글 위에 붙이는 다꾸 테이프예요. 붙인 뒤 길이도 마음대로!</p>
                  <div class="pg-tapes">${tapes.map((t, i) => `<div class="pg-tp"><span style="background-image:url(&quot;${tapeUrl(t)}&quot;);--r:${(i % 3 - 1) * 3}deg"></span><small>${t.name}</small></div>`).join('')}</div>
                </div>
                <div class="pg-gift" data-t="pat">
                  <p class="pg-gift-d">다이어리 뒤 배경에 까는 그림 패턴이에요. 보기만 해도 기분이 몽글몽글해져요.</p>
                  <div class="pg-pats">${sweet.map((p, i) => `<div class="pg-pt"><div class="pg-pt-sw"><i data-i="${i}"></i></div><small>${p.name}</small></div>`).join('')}</div>
                </div>
                <ul class="pg-promise">
                  <li>💗 얼마를 넣어도 똑같이 <b>한 달 동안 모두</b> 쓸 수 있어요</li>
                  <li>🌷 한 달이 지나도 이미 붙인 테이프 · 깔아 둔 패턴은 <b>그대로 남아요</b></li>
                </ul>
              </div>

              <div class="pg-sec">
                <div class="pg-sec-t">🐷 마음 넣는 방법</div>
                <ol class="pg-steps">
                  <li><b>내 저금 코드를 확인해요</b>
                    <div class="pg-code-row"><span class="pg-code" id="pigCode">확인하는 중…</span><button type="button" class="btn pg-mini" id="pigCodeCopy" onclick="pigCopy(pig.code, '저금 코드')" disabled>📋 복사</button></div>
                  </li>
                  <li><b>아래 통장으로 마음을 넣어요</b><br><span>보낼 때 <b>받는 분 통장 표시</b>를 저금 코드로 바꿔 주세요. 그래야 누가 넣어 줬는지 알 수 있어요!</span></li>
                  <li><b>확인되면 선물이 열려요</b><br><span>하나하나 직접 확인하고 열어 드려요. 조금만 기다려 주세요 💕</span></li>
                </ol>
                <div class="pg-book">
                  <div class="pg-book-top">💳 말랑달콤 저금통장</div>
                  <div class="pg-book-row"><span>은행</span><b>${PIG_BANK.bank}</b></div>
                  <div class="pg-book-row"><span>계좌번호</span><b>${PIG_BANK.num}</b></div>
                  <div class="pg-book-row"><span>받는 사람</span><b>${PIG_BANK.holder}</b></div>
                  <button type="button" class="btn btn-primary pg-copy" onclick="pigCopy(PIG_BANK.num, '계좌번호')">📋 계좌번호 복사하기</button>
                </div>
              </div>

              <div class="pg-foot">마음을 넣어 주신 모든 분들, 정말 정말 고마워요 💕<br><small>궁금한 점은 ⚙ 설정 → 💌 건의함으로 편하게 물어봐 주세요</small></div>`;
            box.querySelectorAll('.pg-pt-sw i').forEach(el => paintPatternInto(el, sweet[+el.dataset.i]));
            pig.built = true;
            pigTab(pig.tab);
        }

        function pigTab(t) {
            pig.tab = t;
            document.querySelectorAll('#pigBody .pg-tab').forEach(b => b.classList.toggle('on', b.dataset.t === t));
            document.querySelectorAll('#pigBody .pg-gift').forEach(g => { g.hidden = g.dataset.t !== t; });
        }

        /* 선물이 열려 있으면 고마움 띠 */
        function pigThanks() {
            const el = document.getElementById('pigThanks'); if (!el) return;
            const on = typeof isSaver === 'function' && isSaver();
            el.hidden = !on;
            if (!on) return;
            const left = typeof saverDaysLeft === 'function' ? saverDaysLeft() : 0;
            el.innerHTML = `💝 마음을 넣어 주셔서 고마워요! 선물이 활짝 열려 있어요${left ? ` <b>D-${left}</b>` : ''}`;
        }

        /* 내 저금 코드 (구글 로그인했을 때만) */
        async function pigLoadCode() {
            const el = document.getElementById('pigCode'), btn = document.getElementById('pigCodeCopy');
            if (!el) return;
            const show = (txt, ok) => { el.textContent = txt; el.classList.toggle('none', !ok); btn.disabled = !ok; };
            if (pig.code) return show(pig.code, true);
            if (typeof drive === 'undefined' || !drive.ready || drive.guest) return show('구글로 로그인하면 코드가 생겨요', false);
            try {
                const res = await gfetch('https://www.googleapis.com/drive/v3/about?fields=user(permissionId)');
                const pid = ((await res.json()).user || {}).permissionId;
                if (!pid) throw 0;
                pig.code = pigCode(pid);
                show(pig.code, true);
            } catch (e) { show('잠시 후 다시 열어 주세요', false); }
        }

        async function pigCopy(text, what) {
            if (!text) return;
            try { await navigator.clipboard.writeText(text); }
            catch (e) {
                const ta = document.createElement('textarea');
                ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); } catch (er) {}
                ta.remove();
            }
            if (typeof sndChime === 'function') sndChime();
            toast(`📋 ${what}를 복사했어요: ${text}`);
        }

        function openPiggy() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            if (!pig.built) pigBuild();
            pigThanks();
            openModal('piggyModal');
            const sc = document.querySelector('#piggyModal .modal-content'); if (sc) sc.scrollTop = 0;
            const art = document.querySelector('#pigBody .pg-hero');
            if (art) { art.classList.remove('play'); void art.offsetWidth; art.classList.add('play'); }
            setTimeout(pigCoin, 760);                       // 동전이 쏙 들어가는 순간
            pigLoadCode();
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['piggy'] = true;
