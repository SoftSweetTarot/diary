/* 말랑달콤 다이어리 - js/namematch.js
   💕 이름 궁합 (카페 → 운세·마음 → 💕 이름 궁합)
   - 옛날 교실에서 하던 '획수 궁합' : 두 이름을 한 글자씩 번갈아 쓰고, 글자 획수를 옆끼리 더해(일의 자리만) 두 자리가 남을 때까지
   - 누가 먼저 쓰느냐에 따라 결과가 달라져요 → '반대로 보면' 도 함께
   - 사이 : 💕 썸·연인 · 👭 친구 · 🏡 가족 → 풀이 말이 달라져요
   - 효과음 : 파일 없이 만든 소리 (글자 톡 · 숫자 또르륵 · 심장 두근 · 드럼 · 팡파레) · ✨ 연출 소리 (첫 화면 🔊 · 설정)
   - 이름은 어디에도 저장하지 않아요
   - 📌 다이어리에 붙이기 : 궁합 카드 그림 (SVG)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (이름 궁합만 '준비 중') */

        const NM_MAX = 5;
        /* 글자 획수 : 초성 · 중성 · 종성 (유니코드 순서) */
        const NM_CHO = [1, 2, 1, 2, 4, 3, 3, 4, 8, 2, 4, 1, 3, 6, 4, 2, 3, 4, 3];
        const NM_JUNG = [2, 3, 3, 4, 2, 3, 3, 4, 2, 4, 5, 3, 3, 2, 4, 5, 3, 3, 1, 2, 1];
        const NM_JONG = [0, 1, 2, 3, 1, 4, 4, 2, 3, 4, 6, 7, 5, 6, 7, 6, 3, 4, 6, 2, 4, 1, 3, 4, 2, 3, 4, 3];
        const NM_RELS = [['love', '💕 썸 · 연인'], ['friend', '👭 친구'], ['family', '🏡 가족']];
        const NM_TIERS = [
            { min: 90, e: '💞', t: '천생연분', c: '#ff4f86' },
            { min: 75, e: '💗', t: '찰떡궁합', c: '#ff6f9c' },
            { min: 55, e: '💓', t: '알콩달콩', c: '#ff8fae' },
            { min: 35, e: '🌱', t: '천천히 피는 사이', c: '#5cb88a' },
            { min: 0, e: '🌈', t: '반전 매력', c: '#8f7be0' }
        ];
        /* 풀이 말 : [사이][단계] 중에서 이름에 따라 하나 ({a} = 앞 사람 · {b} = 뒷사람) */
        const NM_TALK = {
            love: [
                ['눈빛만 봐도 마음이 통하는 사이예요. {a}의 하루가 {b} 덕분에 더 반짝일 거예요.', '서로가 서로의 쉼표가 되어 주는 사이! 함께 있으면 시간이 순식간에 지나가요.', '말하지 않아도 알아주는 사이예요. 이 인연, 꼭 붙잡아요 💕'],
                ['함께 있으면 웃음이 끊이지 않는 사이예요. 작은 약속을 하나씩 쌓아 가면 더 단단해져요.', '{b}는 {a}의 이야기를 가장 잘 들어 주는 사람이 될 거예요.', '취향이 잘 맞아서 데이트 계획 짜는 것부터 즐거운 사이예요.'],
                ['티격태격하다가도 금세 웃게 되는 사이예요. 먼저 고맙다고 말해 보면 훨씬 가까워져요.', '서로 다른 점이 오히려 설렘이 되는 사이예요. 천천히 알아 가는 재미가 있어요.', '조금만 더 솔직해지면 마음이 활짝 열릴 거예요. 오늘 안부 한 번 어때요?'],
                ['처음엔 서먹해도 시간이 갈수록 깊어지는 사이예요. 서두르지 않아도 괜찮아요.', '{a}의 다정한 말 한마디가 {b}의 마음을 크게 움직여요.', '함께하는 시간이 늘수록 숫자보다 훨씬 좋은 사이가 될 거예요.'],
                ['숫자는 장난일 뿐! 서로 너무 달라서 오히려 끌리는 반전 궁합이에요.', '예상하지 못한 곳에서 잘 맞는 사이예요. 같이 새로운 걸 해 보면 금방 가까워져요.', '이름 궁합은 낮아도 마음 궁합은 직접 만들어 가는 거예요 🌈']
            ],
            friend: [
                ['말 안 해도 통하는 소울메이트! 10년 뒤에도 함께 수다 떨고 있을 사이예요.', '{a}와 {b}는 서로의 비밀 금고 같은 친구예요.', '같이 있으면 아무것도 안 해도 재밌는 최고의 단짝이에요.'],
                ['함께 맛집 가고 사진 찍기 딱 좋은 찰떡 친구예요.', '{b}는 {a}가 힘들 때 가장 먼저 달려와 줄 친구예요.', '웃음 코드가 똑같아서 만나면 배꼽 잡는 사이예요.'],
                ['편하게 기댈 수 있는 친구예요. 가끔 먼저 연락하면 더 돈독해져요.', '서로 다른 장점이 있어서 함께하면 더 든든한 사이예요.', '소소한 이야기를 나눌수록 더 가까워지는 친구예요.'],
                ['알면 알수록 진국인 친구예요. 함께한 시간이 쌓일수록 더 좋아져요.', '처음보다 지금이, 지금보다 내일이 더 친해질 사이예요.', '조용히 곁을 지켜 주는 든든한 친구예요.'],
                ['정반대라서 더 재밌는 친구예요! 서로에게 새로운 세상을 보여 줄 거예요.', '숫자는 낮아도 함께한 추억은 숫자로 못 세요 🌈', '의외의 조합이 최고의 조합이 되는 사이예요.']
            ],
            family: [
                ['서로가 서로의 자랑인 가족이에요. 오늘 사랑한다고 말해 볼까요?', '{a}와 {b}는 같이 있으면 집 안이 환해지는 사이예요.', '마음이 꼭 닮은 가족이에요. 함께 맛있는 거 먹으러 가요!'],
                ['든든한 내 편이 되어 주는 가족이에요.', '함께 웃은 날이 많아서 더 끈끈한 사이예요.', '{b}의 응원이 {a}에게 큰 힘이 되는 사이예요.'],
                ['가끔 투닥거려도 결국 서로를 제일 아끼는 가족이에요.', '고맙다는 말 한마디가 더 가까워지는 비결이에요.', '서로의 하루를 물어보면 더 따뜻해지는 사이예요.'],
                ['말은 적어도 마음은 깊은 가족이에요.', '오늘 작은 선물이나 쪽지 하나 건네 보면 어때요?', '함께하는 시간이 곧 가장 큰 선물인 사이예요.'],
                ['숫자로는 다 알 수 없는 게 가족이에요 🌈', '성격은 달라도 서로를 가장 잘 아는 사이예요.', '다른 점이 많아서 서로 배울 게 많은 가족이에요.']
            ]
        };
        const NM_TOGETHER = {
            love: ['🍰 디저트 카페 가기', '🎡 놀이공원 데이트', '📸 커플 네컷 찍기', '🌙 밤 산책하기', '🎬 영화 보고 수다 떨기', '🍜 맛집 탐방', '🌸 꽃구경 가기', '💌 손편지 주고받기'],
            friend: ['📸 네컷 사진 찍기', '🍰 디저트 투어', '🛍️ 소품샵 구경', '🎤 노래방 가기', '☕ 카페에서 수다', '🧁 같이 베이킹', '🚌 당일치기 여행', '🎮 같이 게임하기'],
            family: ['🍲 같이 저녁 먹기', '🌳 공원 산책', '🧺 소풍 가기', '🎬 집에서 영화 보기', '📷 가족사진 찍기', '🍓 과일 따기 체험', '♨️ 온천 여행', '🎂 작은 파티 하기']
        };
        const nm = { built: false, rel: 'love', res: null, timer: [], noise: null };
        const nmq = id => document.getElementById(id);
        const nmEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

        /* ---------- 계산 ---------- */
        function nmStroke(ch) {
            const c = ch.charCodeAt(0) - 0xAC00;
            return NM_CHO[Math.floor(c / 588)] + NM_JUNG[Math.floor((c % 588) / 28)] + NM_JONG[c % 28];
        }
        function nmCalc(a, b) {                          // a 먼저 · b 나중
            const chars = [];
            for (let i = 0; i < Math.max(a.length, b.length); i++) { if (a[i]) chars.push([a[i], 0]); if (b[i]) chars.push([b[i], 1]); }
            const rows = [chars.map(([ch]) => nmStroke(ch) % 10)];
            while (rows[rows.length - 1].length > 2) { const r = rows[rows.length - 1]; rows.push(r.slice(1).map((v, i) => (r[i] + v) % 10)); }
            const last = rows[rows.length - 1], pct = last.length === 1 ? last[0] * 10 : last[0] * 10 + last[1];
            return { chars, strokes: chars.map(([ch]) => nmStroke(ch)), rows, pct: pct === 0 ? 100 : pct };
        }
        function nmSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

        /* ---------- 🔊 효과음 (파일 없이 만들어요 · 아이폰 무음 모드에서도 들리게) ---------- */
        const nmAudio = () => typeof sndFx === 'function' ? sndFx() : null;       // 연출 소리가 꺼져 있으면 null (js/sound.js)
        function nmTone(f, dur, vol, type, at, f2) {      // 맑은 음 하나 (f2 : 끝 음높이로 미끄러지기)
            const ac = nmAudio(); if (!ac) return;
            const t = ac.currentTime + (at || 0), o = ac.createOscillator(), g = ac.createGain();
            o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
            if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g).connect(sndOut()); o.start(t); o.stop(t + dur + 0.02);
        }
        function nmNoise(dur, vol, at, freq) {             // 드럼 · 바람 소리
            const ac = nmAudio(); if (!ac) return;
            if (!nm.noise) { const n = ac.sampleRate * 0.5, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; nm.noise = buf; }
            const t = ac.currentTime + (at || 0), src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
            src.buffer = nm.noise; f.type = 'bandpass'; f.frequency.value = freq || 1800; f.Q.value = 1.2;
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(f).connect(g).connect(sndOut()); src.start(t); src.stop(t + dur + 0.02);
        }
        const NM_SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
        const nmSfx = {
            pop: i => nmTone(NM_SCALE[i % NM_SCALE.length], .16, .16, 'triangle'),                 // 글자 톡
            tick: () => nmTone(1400 + Math.random() * 500, .04, .05, 'square'),                    // 숫자 굴러가는 소리
            settle: i => nmTone(660 + (i || 0) * 40, .12, .1, 'sine', 0, 990 + (i || 0) * 40),    // 숫자 멈춤 또르륵
            row: () => nmNoise(.18, .08, 0, 3200),                                                  // 줄 내려옴 슉
            beat: () => { nmTone(70, .16, .5, 'sine', 0, 45); nmTone(64, .14, .38, 'sine', .2, 42); },   // 두근(쿵·쿵)
            roll: ms => { for (let k = 0; k < ms / 45; k++) nmNoise(.05, .05 + .12 * k / (ms / 45), k * .045, 900); },   // 두구두구 (점점 크게)
            reveal: () => { nmTone(1047, .5, .22, 'triangle'); nmTone(1568, .6, .12, 'sine', .05); nmNoise(.12, .15, 0, 600); },
            fanfare: pct => {
                const up = pct >= 75 ? [523, 659, 784, 1047, 1319, 1568] : pct >= 50 ? [523, 659, 784, 1047] : [392, 523, 494, 659];
                up.forEach((f, i) => nmTone(f, .45, .16, 'triangle', i * .09));
                for (let k = 0; k < 10; k++) nmTone(2000 + Math.random() * 2000, .25, .05, 'sine', .3 + k * .05);   // 반짝반짝
            },
            count: () => nmTone(500, .9, .07, 'sine', 0, 1500)
        };

        /* ---------- 화면 ---------- */
        function nmBuild() {
            if (nm.built) return;
            nm.built = true;
            const el = document.createElement('div');
            el.id = 'nmRoom'; el.className = 'nm-room';
            el.innerHTML = `
              <i class="nm-float f1">💗</i><i class="nm-float f2">💕</i><i class="nm-float f3">✨</i><i class="nm-float f4">💞</i>
              <div class="nm-bar"><button class="nm-x" type="button" id="nmBack" onclick="nmShow(1)" aria-label="뒤로" hidden>←</button><span id="nmSp">${typeof sndFxBtn === 'function' ? sndFxBtn('nm-x') : '<span class="nm-sp"></span>'}</span><b>💕 이름 궁합</b><button class="nm-x" type="button" onclick="closeNameMatch()" aria-label="닫기">✕</button></div>
              <div class="nm-wrap">
                <section id="nmStep1" class="nm-step">
                  <div class="nm-hero"><span>💌</span></div>
                  <p class="nm-lead">두 사람의 이름을 적어 주세요</p>
                  <div class="nm-names">
                    <label class="nm-in me"><small>나</small><input id="nmA" maxlength="${NM_MAX}" placeholder="내 이름" autocomplete="off"></label>
                    <span class="nm-heart">💗</span>
                    <label class="nm-in you"><small>그 사람</small><input id="nmB" maxlength="${NM_MAX}" placeholder="상대 이름" autocomplete="off"></label>
                  </div>
                  <div class="nm-rels" id="nmRels">${NM_RELS.map(([k, t]) => `<button type="button" data-r="${k}" onclick="nmSetRel('${k}')">${t}</button>`).join('')}</div>
                  <button class="nm-go" type="button" onclick="nmStart()">💘 궁합 보기</button>
                  <p class="nm-note">두 이름을 한 글자씩 번갈아 쓰고 획수를 더해 보는<br>옛날 교실 이름 궁합이에요. 재미로만 봐 주세요!</p>
                </section>
                <section id="nmStep2" class="nm-step" hidden>
                  <div class="nm-pyr" id="nmPyr"></div>
                  <div class="nm-res" id="nmRes" hidden></div>
                </section>
              </div>`;
            document.body.appendChild(el);
            ['nmA', 'nmB'].forEach(id => nmq(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); id === 'nmA' ? nmq('nmB').focus() : nmStart(); } }));
        }
        function nmSetRel(k) { nm.rel = k; document.querySelectorAll('#nmRels button').forEach(b => b.classList.toggle('on', b.dataset.r === k)); }
        function nmShow(n) {
            nm.timer.forEach(clearTimeout); nm.timer = [];
            nmq('nmStep1').hidden = n !== 1; nmq('nmStep2').hidden = n !== 2;
            nmq('nmBack').hidden = n === 1; nmq('nmSp').hidden = n !== 1;
            nmq('nmRoom').classList.remove('nm-tense');
            nmq('nmRoom').scrollTop = 0;
        }

        function nmStart() {
            const clean = v => v.replace(/\s/g, '');
            const a = clean(nmq('nmA').value), b = clean(nmq('nmB').value);
            if (!a || !b) { toast('💕 두 사람 이름을 모두 적어 주세요'); (a ? nmq('nmB') : nmq('nmA')).focus(); return; }
            if (!/^[가-힣]+$/.test(a + b)) { toast('💕 이름은 한글로만 적어 주세요 (예: 김말랑)'); return; }
            const r1 = nmCalc(a, b), r2 = nmCalc(b, a);
            const tier = NM_TIERS.find(t => r1.pct >= t.min), ti = NM_TIERS.indexOf(tier);
            const seed = nmSeed(a + '|' + b + '|' + nm.rel);
            const talk = NM_TALK[nm.rel][ti][seed % 3].replace(/\{a\}/g, a).replace(/\{b\}/g, b);
            const tg = NM_TOGETHER[nm.rel], together = [tg[seed % tg.length], tg[(seed >>> 4) % tg.length]].filter((v, i, s) => s.indexOf(v) === i);
            nm.res = { a, b, r1, r2, tier, talk, together };
            nmShow(2); nmAnimate();
        }

        /* 피라미드 연출 (약 8초) : 이름 쓰기 → 획수 세기 → 한 줄씩 더하기 → 두근두근 → 숫자 하나씩 공개 → 하트 팡! */
        const NM_MSGS = ['➕ 옆 숫자끼리 더하는 중…', '💭 점점 가까워지고 있어요…', '💓 두근두근…', '🤞 거의 다 왔어요…', '😳 떨려요…'];
        function nmAnimate() {
            const { r1 } = nm.res, box = nmq('nmPyr'), res = nmq('nmRes');
            res.hidden = true;
            let t = 0;
            const at = (ms, fn) => { t += ms; nm.timer.push(setTimeout(fn, t)); };
            const msg = m => { const el = nmq('nmMsg'); if (el) { el.textContent = m; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); } };
            const roll = (sp, v, ms, i, big) => {         // 숫자가 슬롯처럼 굴러가다 멈춰요
                sp.classList.add('rolling');
                let n = 0;
                const iv = setInterval(() => { sp.textContent = Math.floor(Math.random() * 10); if (!big && n++ % 2 === 0) nmSfx.tick(); }, 60);
                nm.timer.push(iv);
                nm.timer.push(setTimeout(() => { clearInterval(iv); sp.textContent = v; sp.classList.remove('rolling'); sp.classList.add('done'); big ? nmSfx.reveal() : nmSfx.settle(i); }, ms));
            };
            const addRow = (vals, cls) => {
                const row = document.createElement('div');
                row.className = 'nm-row ' + (cls || '');
                row.innerHTML = vals.map(() => '<span>?</span>').join('');
                nmq('nmRows').appendChild(row);
                return [...row.children];
            };
            box.innerHTML = `<p class="nm-msg" id="nmMsg"></p>
              <div class="nm-row nm-chars">${r1.chars.map(([ch, w]) => `<span class="${w ? 'you' : 'me'}">${ch}</span>`).join('')}</div>
              <div id="nmRows" class="nm-rows"></div>`;
            const chars = [...box.querySelectorAll('.nm-chars span')], last = r1.rows.length - 1;
            msg('✍️ 두 이름을 번갈아 써 볼게요');
            chars.forEach((sp, i) => at(i ? 170 : 250, () => { sp.classList.add('in'); nmSfx.pop(i); }));
            r1.rows.forEach((vals, ri) => {
                if (ri < last) {
                    at(ri ? 520 : 500, () => {
                        msg(ri ? NM_MSGS[(ri - 1) % NM_MSGS.length] : '✏️ 한 글자씩 획수를 세는 중…');
                        const sps = addRow(vals); nmSfx.row();
                        sps.forEach((sp, i) => roll(sp, vals[i], ri ? 380 + i * 25 : 420 + i * 110, i));
                    });
                    if (!ri) t += vals.length * 110;
                    return;
                }
                /* 마지막 두 자리 */
                at(ri ? 600 : 500, () => {
                    msg('결과는…');
                    nmq('nmRoom').classList.add('nm-tense');
                    addRow(vals, 'nm-final'); nmSfx.row();
                    box.insertAdjacentHTML('beforeend', '<div class="nm-beat" id="nmBeat">💗</div>');
                    [0, 750].forEach(d => nm.timer.push(setTimeout(nmSfx.beat, d + 60)));      // 하트 박자에 맞춰 두근 · 두근
                });
                at(1500, () => { const h = nmq('nmBeat'); if (h) h.remove(); msg('두구두구두구…'); nmSfx.roll(650); roll(box.querySelector('.nm-final span'), vals[0], 650, 0, true); });
                at(1350, () => { msg('하나 더…!'); nmSfx.roll(900); roll(box.querySelectorAll('.nm-final span')[vals.length > 1 ? 1 : 0], vals[vals.length - 1], 900, 1, true); });
                at(1050, () => {
                    nmq('nmRoom').classList.remove('nm-tense');
                    msg(r1.pct >= 75 ? '꺄아! 💕' : r1.pct >= 50 ? '오오~ 💗' : '두둥! 🌈');
                    nmSfx.fanfare(r1.pct);
                    const fx = document.createElement('div'); fx.className = 'nm-burst';
                    fx.innerHTML = Array.from({ length: 16 }, (_, i) => `<i style="--a:${i * 22.5}deg;--d:${70 + (i % 3) * 30}px">${['💗', '💕', '✨', '💖'][i % 4]}</i>`).join('');
                    box.appendChild(fx);
                });
                at(750, nmReveal);
            });
        }
        function nmReveal() {
            const { a, b, r1, r2, tier, talk, together } = nm.res, res = nmq('nmRes');
            res.innerHTML = `
              <div class="nm-score" style="--tc:${tier.c}">
                <div class="nm-pair"><b class="me">${nmEsc(a)}</b><span>${tier.e}</span><b class="you">${nmEsc(b)}</b></div>
                <div class="nm-pct"><span id="nmNum">0</span><small>%</small></div>
                <div class="nm-tier">${tier.t}</div>
                <div class="nm-bar2"><i id="nmFill"></i></div>
              </div>
              <article class="nm-talk">
                <p>${nmEsc(talk)}</p>
                <p class="nm-tg">함께 하면 좋은 것 · <b>${together.map(nmEsc).join('</b> · <b>')}</b></p>
                <p class="nm-rev">🔁 ${nmEsc(b)}${nmJosa(b)} 먼저 쓰면 <b>${r2.pct}%</b> ${r2.pct > r1.pct ? '— 그 사람 쪽 마음이 조금 더 커요!' : r2.pct < r1.pct ? '— 내 쪽 마음이 조금 더 커요!' : '— 양쪽 마음이 똑같아요!'}</p>
              </article>
              <div class="nm-acts">
                <button type="button" class="nm-main" onclick="nmStick()">📌 다이어리에 붙이기</button>
                <button type="button" onclick="nmShow(1)">💌 다른 이름</button>
              </div>`;
            res.hidden = false;
            const num = nmq('nmNum'), t0 = performance.now(), dur = 900;
            nmSfx.count();
            const tick = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); num.textContent = Math.round(r1.pct * e); if (k < 1 && nm.res && !res.hidden) requestAnimationFrame(tick); };
            requestAnimationFrame(tick);
            requestAnimationFrame(() => { nmq('nmFill').style.width = r1.pct + '%'; });
            setTimeout(() => res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
        }
        const nmJosa = w => (w.charCodeAt(w.length - 1) - 0xAC00) % 28 ? '이' : '가';     // 받침 있으면 '이' · 없으면 '가'

        /* ---------- 📌 궁합 카드 ---------- */
        function nmCardSvg() {
            const { a, b, r1, tier } = nm.res;
            const F = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif", EF = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
            const d = new Date(), date = `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`;
            const hearts = [[34, 52, 18, -14], [266, 70, 22, 12], [40, 250, 16, 10], [262, 238, 18, -10], [150, 36, 14, 0]]
                .map(([x, y, s, r]) => `<path transform="translate(${x} ${y}) rotate(${r}) scale(${s / 20})" d="M0 6 C -12 -6 -6 -16 0 -9 C 6 -16 12 -6 0 6Z" fill="#fff" opacity=".75"/>`).join('');
            const rel = (NM_RELS.find(r => r[0] === nm.rel) || NM_RELS[0])[1];
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="300" height="300">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd6e4"/><stop offset="1" stop-color="#ffc2dc"/></linearGradient></defs>
<rect x="4" y="4" width="292" height="292" rx="28" fill="url(#g)"/>
<rect x="12" y="12" width="276" height="276" rx="22" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="6 5"/>
${hearts}
<text x="150" y="72" font-size="14" text-anchor="middle" fill="#c2547c" font-family="${F}" font-weight="bold">${nmEsc(rel)} 이름 궁합</text>
<rect x="34" y="88" width="96" height="40" rx="20" fill="#fff"/><rect x="170" y="88" width="96" height="40" rx="20" fill="#fff"/>
<text x="82" y="115" font-size="${a.length > 3 ? 15 : 18}" text-anchor="middle" fill="#e2557f" font-family="${F}" font-weight="bold">${nmEsc(a)}</text>
<text x="218" y="115" font-size="${b.length > 3 ? 15 : 18}" text-anchor="middle" fill="#5a7be0" font-family="${F}" font-weight="bold">${nmEsc(b)}</text>
<text x="150" y="118" font-size="26" text-anchor="middle" font-family="${EF}">${tier.e}</text>
<text x="150" y="200" font-size="64" text-anchor="middle" fill="${tier.c}" font-family="${F}" font-weight="bold" stroke="#fff" stroke-width="6" paint-order="stroke">${r1.pct}<tspan font-size="30">%</tspan></text>
<text x="150" y="234" font-size="19" text-anchor="middle" fill="#7a3d5a" font-family="${F}" font-weight="bold">${nmEsc(tier.t)}</text>
<text x="150" y="268" font-size="11.5" text-anchor="middle" fill="#b06a88" font-family="${F}">${date}</text>
</svg>`;
        }
        function nmStick() {
            if (!nm.res) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            if (!addImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(nmCardSvg()))) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (el) el.style.width = '160px';
            closeNameMatch();
            toast('💕 궁합 카드를 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
        }

        function openNameMatch() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            nmBuild(); nmSetRel(nm.rel); nmShow(1);
            nmq('nmRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            if (!/Mobi|Android|iPad/i.test(navigator.userAgent)) setTimeout(() => nmq('nmA').focus(), 60);
        }
        function closeNameMatch() {
            nm.timer.forEach(clearTimeout); nm.timer = [];
            const r = nmq('nmRoom'); if (r) r.classList.remove('nm-tense'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        window.openNameMatch = openNameMatch;
