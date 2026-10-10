/* 말랑달콤 다이어리 - js/piggy.js
   💗 말랑달콤 저금통 (카페 → 💗 말랑달콤 저금통)
   - 정해진 금액 없이, 마음이 가는 만큼 넣어 주면 한 달 동안 고마움 선물(🎀 마스킹테이프)이 열려요
   - 얼마를 넣어도 똑같이 30일 · 사람들이 만들어 나눈 페이지 · 배경지는 언제나 누구나
   - 주인은 '말랑달콤 사람들' 시트에서 저금 코드를 찾아 '저금 확인 ☑' 을 체크하면 끝 (말랑달콤사람들_앱스크립트.gs · 📱 piggy-check 앱도 돼요)
   - 마음은 카카오페이 오픈채팅 송금으로 받아요 (서로 실명이 안 보여요) : 말랑달콤 1:1 오픈채팅방에 저금 코드를 붙여 넣고 송금
       휴대폰 : 버튼 하나로 저금 코드 복사 + 채팅방 열기 · PC · 태블릿 : QR 코드 (카카오페이 송금은 휴대폰 카카오톡에서만 돼요)
   - 저금 코드 : '말랑' + 4글자 · 처음 접속할 때 서버가 겹치지 않게 정해 줘요 (접속 신호의 답 · js/presence.js 의 pr.code)
       → 채팅에 적힌 코드로 누가 넣었는지 알아요
   - 선물이 열렸는지는 js/settings.js 의 tapeOn() 이 알려 줘요 (🎀 끝나는 날은 접속 신호의 답으로 받아요 : js/presence.js)
   - 🎁 선물 도착 창 : 🪙 · 🎀 · 🎁 · 🖼️ 를 한 창으로 보여 줘요 (js/arrival.js · 닫기를 눌러야 닫혀요) · 신호는 js/presence.js 가 받아 와요
   ※ 이 파일이 없으면 저금통 버튼을 눌러도 아무 일도 없어요 (다이어리는 정상) */

        /* 💬 말랑달콤 1:1 오픈채팅방 주소 : 다이어리 맨 위 폴더의 an.txt 에 적어요 (오픈채팅=https://open.kakao.com/o/…) */
        const PIG_CHAT_FILE = 'an.txt';
        const PIG_QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
        const pig = { code: '', built: false, chat: '', phone: false };

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
                <div class="pg-gift">
                  <p class="pg-gift-d">🎀 마스킹테이프 <b>${tapes.length}가지</b></p>
                  <p class="pg-gift-d">사진 모서리나 글 위에 붙이는 다꾸 테이프예요. 붙인 뒤 길이도 마음대로!</p>
                  <p class="pg-where">📍 선물이 열리면 다이어리 아래 <b>✨ 스티커</b> → <b>🎀 마스킹테이프</b> 칸에 생겨요</p>
                  <div class="pg-tapes">${tapes.map((t, i) => `<div class="pg-tp"><span style="background-image:url(&quot;${tapeUrl(t)}&quot;);--r:${(i % 3 - 1) * 3}deg"></span><small>${t.name}</small></div>`).join('')}</div>
                </div>
                <ul class="pg-promise">
                  <li>💗 얼마를 넣어도 똑같이 <b>한 달 동안 모두</b> 쓸 수 있어요</li>
                  <li>🌷 한 달이 지나도 이미 붙인 테이프는 <b>그대로 남아요</b></li>
                </ul>
              </div>

              <div class="pg-sec">
                <div class="pg-sec-t">💗 마음 넣는 방법</div>
                <ol class="pg-steps">
                  <li><b>내 저금 코드를 확인해요</b>
                    <div class="pg-code-row"><span class="pg-code" id="pigCode">확인하는 중…</span><button type="button" class="btn pg-mini" id="pigCodeCopy" onclick="pigCopy(pig.code, '저금 코드')" disabled>📋 복사</button></div>
                  </li>
                  <li><b>말랑달콤 채팅방에서 마음을 보내요</b><br><span id="pigHow"></span></li>
                  <li><b>확인되면 선물이 열려요</b><br><span>하나하나 직접 확인하고 열어 드려요. 조금만 기다려 주세요 💕</span></li>
                </ol>
                <div class="pg-send">
                  <div class="pg-send-top">💬 말랑달콤 1:1 채팅방 <small>카카오페이 송금</small></div>
                  <div class="pg-send-body" id="pigSend"></div>
                  <p class="pg-send-note">🔒 카카오페이 오픈채팅 송금은 서로 실명이 보이지 않아요</p>
                </div>
              </div>

              <div class="pg-foot">마음을 넣어 주신 모든 분들, 정말 정말 고마워요 💕</div>`;
            pig.built = true;
        }

        /* 선물이 열려 있으면 고마움 띠 (전체면 남은 날, 디자인별이면 몇 가지) */
        function pigThanks() {
            const el = document.getElementById('pigThanks'); if (!el) return;
            const t = typeof tapeOn === 'function' && tapeOn();
            el.hidden = !t;
            if (!t) return;
            el.innerHTML = '💝 마음을 넣어 주셔서 고마워요! 선물이 열려 있어요<br>'
                + (giftOk(giftBox.ta) ? `🎀 마스킹테이프 전체 <b>${dLabel(giftLeft(giftBox.ta))}</b>` : `🎀 마스킹테이프 <b>${giftCount(giftBox.tp)}가지</b>`)
                + '<br><small>디자인마다 남은 날은 ✨ 스티커 → 🎀 마스킹테이프 → 이벤트 칸에서 볼 수 있어요</small>';
        }

        /* 내 저금 코드 (구글 로그인했을 때만) */
        async function pigLoadCode() {
            const el = document.getElementById('pigCode'), btn = document.getElementById('pigCodeCopy');
            if (!el) return;
            const show = (txt, ok) => { el.textContent = txt; el.classList.toggle('none', !ok); btn.disabled = !ok; };
            if (pig.code) return show(pig.code, true);
            if (typeof drive === 'undefined' || !drive.ready || drive.guest) return show('구글로 로그인하면 코드가 생겨요', false);
            for (let i = 0; i < 40 && !(typeof pr !== 'undefined' && pr.code); i++) {          // 접속 신호의 답을 기다려요 (최대 20초)
                if (i === 6 && typeof prHere === 'function') prHere();
                await new Promise(r => setTimeout(r, 500));
            }
            if (typeof pr === 'undefined' || !pr.code) return show('잠시 후 다시 열어 주세요', false);
            pig.code = pr.code;
            show(pig.code, true);
            pigSendUI();
        }

        /* 💬 채팅방 주소 읽기 (an.txt · 고치면 바로 반영되게 매번 새로 읽어요) */
        async function pigLoadChat() {
            try {
                const res = await fetch(PIG_CHAT_FILE + '?t=' + Date.now(), { cache: 'no-store' });
                if (!res.ok) throw 0;
                const m = /^\s*오픈채팅\s*=\s*(https:\/\/open\.kakao\.com\/\S+)\s*$/m.exec(await res.text());
                pig.chat = m ? m[1] : '';
            } catch (e) {}
            pigSendUI();
        }

        /* 보내는 칸 : 휴대폰은 버튼 하나 · PC · 태블릿은 휴대폰으로 찍는 QR 코드 */
        function pigSendUI() {
            const box = document.getElementById('pigSend'), how = document.getElementById('pigHow');
            if (!box) return;
            how.innerHTML = pig.phone
                ? '아래 버튼을 누르면 저금 코드가 복사되고 채팅방이 열려요. 채팅에 <b>저금 코드를 붙여 넣고</b> 카카오페이로 송금해 주세요. 따로 말은 안 걸어도 괜찮아요 😊'
                : '카카오페이 송금은 <b>휴대폰 카카오톡</b>에서만 돼요. 아래 QR 코드를 휴대폰 카메라로 찍으면 채팅방이 열려요. 채팅에 <b>저금 코드를 적고</b> 송금해 주세요.';
            if (!pig.chat) { box.innerHTML = '<p class="pg-send-wait">채팅방 주소를 불러오지 못했어요.<br>잠시 후 다시 열어 주세요</p>'; return; }
            if (pig.phone) {
                box.innerHTML = `<button type="button" class="btn btn-primary pg-copy pg-go" onclick="pigGo()" ${pig.code ? '' : 'disabled'}>💌 말랑달콤에게 마음 보내기</button>`
                    + (pig.code ? '' : '<p class="pg-send-wait">구글로 로그인하면 보낼 수 있어요</p>');
                return;
            }
            box.innerHTML = `<div class="pg-qr" id="pigQr"><span>QR 코드를 만드는 중…</span></div>
                <div class="pg-qr-code">채팅에 적을 저금 코드 <b>${pig.code || '로그인하면 생겨요'}</b></div>`;
            pigQr(pig.chat);
        }
        function pigQr(url, id = 'pigQr') {                // 🖼️ 배경화면(js/wall.js)도 같이 써요
            const draw = () => {
                const el = document.getElementById(id); if (!el) return;
                try { const q = qrcode(0, 'M'); q.addData(url); q.make(); el.innerHTML = q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); }
                catch (e) { el.innerHTML = '<span>QR 코드를 만들지 못했어요</span>'; }
            };
            if (typeof qrcode === 'function') return draw();
            const sc = document.createElement('script');
            sc.src = PIG_QR_LIB; sc.onload = draw;
            sc.onerror = () => { const el = document.getElementById(id); if (el) el.innerHTML = '<span>QR 코드를 불러오지 못했어요</span>'; };
            document.head.appendChild(sc);
        }
        /* 휴대폰 : 저금 코드 복사 + 채팅방 열기 (누른 순간 바로 열어야 막히지 않아요) */
        function pigGo() {
            if (!pig.chat || !pig.code) return;
            try { navigator.clipboard.writeText(pig.code).catch(() => {}); } catch (e) {}
            window.open(pig.chat, '_blank');
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
            pig.phone = (typeof prDevice === 'function' ? prDevice() : '') === '휴대폰';
            pigLoadCode();
            pigLoadChat();
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['piggy'] = true;
