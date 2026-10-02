/* 말랑달콤 다이어리 - js/ritual.js
   ✨ 결과 보기 연출 (꿈해몽 · 토정비결 · 심리테스트 공용)
   - 빛나는 구슬 + 별가루 → 글이 스르르 바뀌며 진행 → 3 · 2 · 1 → 결과 (포춘카드와 비슷한 7초 정도)
   - 효과음은 파일 없이 만들어요 (✨ 연출 소리 · js/sound.js 의 설정을 따라요)
       night : 하프처럼 맑은 소리 (꿈해몽) · paper : 징 · 딱따기 (토정비결) · pink : 몽글몽글 방울 소리 (심리테스트)
   - ritual(상자, { theme, icon, msgs, alive }) → Promise (연출이 끝나면 true · 도중에 창을 닫으면 false)
   - ritualStop() : 진행 중인 연출 멈추기 (창을 닫을 때)
   ※ 이 파일이 없으면 각 기능이 연출 없이 바로 결과를 보여 줘요 */

        const RIT_MSG_MS = 1500, RIT_COUNT_MS = 900;
        const rit = { noise: null, timers: [], run: 0 };

        /* ---------- 🔊 소리 ---------- */
        const ritAudio = () => typeof sndFx === 'function' ? sndFx() : null;      // 연출 소리가 꺼져 있으면 null (js/sound.js)
        function ritTone(f, dur, vol, type, at, partials) {
            const ac = ritAudio(); if (!ac) return;
            const t = ac.currentTime + (at || 0), g = ac.createGain();
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            g.connect(sndOut());
            (partials || [[1, 1]]).forEach(([m, a]) => {
                const o = ac.createOscillator(), og = ac.createGain();
                o.type = type || 'sine'; o.frequency.value = f * m; og.gain.value = a;
                o.connect(og).connect(g); o.start(t); o.stop(t + dur + 0.05);
            });
        }
        function ritNoise(dur, vol, at, freq, q) {
            const ac = ritAudio(); if (!ac) return;
            if (!rit.noise) { const n = ac.sampleRate * 0.6, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; rit.noise = b; }
            const t = ac.currentTime + (at || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
            s.buffer = rit.noise; f.type = 'bandpass'; f.frequency.value = freq || 2000; f.Q.value = q || 1;
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            s.connect(f).connect(g).connect(sndOut()); s.start(t); s.stop(t + dur + 0.05);
        }
        const RIT_BELL = [[1, 1], [2.76, .2], [5.4, .06]];
        const RIT_GONG = [[1, 1], [1.48, .45], [2.1, .25], [2.9, .12]];
        const RIT_SFX = {
            night: {
                start: () => [523, 659, 784, 988, 1175, 1319].forEach((f, i) => ritTone(f, 1.4, .07, 'sine', i * .07, RIT_BELL)),
                step: i => [0, 1, 2].forEach(k => ritTone([659, 784, 988][(i + k) % 3] * (k ? 1.5 : 1), 1.2, .06, 'sine', k * .12, RIT_BELL)),
                count: n => ritTone([784, 880, 988][3 - n] || 784, 1, .1, 'sine', 0, RIT_BELL),
                reveal: () => { [784, 988, 1175, 1568, 1976].forEach((f, i) => ritTone(f, 1.8, .12, 'sine', i * .08, RIT_BELL)); ritNoise(.8, .04, .2, 6000, .7); }
            },
            paper: {
                start: () => { ritTone(98, 3.2, .3, 'sine', 0, RIT_GONG); ritNoise(.25, .06, 0, 400, .8); },
                step: () => { ritTone(1100, .09, .16, 'triangle'); ritTone(1250, .08, .12, 'triangle', .14); },
                count: () => { ritTone(880, .12, .2, 'square', 0, [[1, .35], [2.3, .1]]); ritNoise(.06, .1, 0, 2600, 3); },
                reveal: () => { ritTone(131, 3.5, .32, 'sine', 0, RIT_GONG); [523, 587, 784, 880, 1047].forEach((f, i) => ritTone(f, 1.2, .08, 'triangle', .35 + i * .1)); }
            },
            pink: {
                start: () => [0, 1, 2, 3].forEach(i => ritTone(500 + i * 120, .25, .1, 'sine', i * .09, [[1, 1], [2, .15]])),
                step: i => [0, 1, 2].forEach(k => ritTone(700 + ((i * 3 + k) % 5) * 90, .18, .08, 'triangle', k * .08)),
                count: n => ritTone([659, 784, 988][3 - n] || 659, .35, .14, 'triangle', 0, [[1, 1], [2, .2]]),
                reveal: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => ritTone(f, .6, .13, 'triangle', i * .08)); for (let k = 0; k < 8; k++) ritTone(1800 + Math.random() * 1800, .3, .04, 'sine', .4 + k * .06); }
            }
        };
        function ritSfx(theme, name, arg) { try { const s = RIT_SFX[theme] || RIT_SFX.pink; if (s[name]) s[name](arg); } catch (e) {} }

        /* ---------- ✨ 연출 ---------- */
        function ritLater(ms) { return new Promise(r => rit.timers.push(setTimeout(r, ms))); }
        function ritualStop() { rit.run++; rit.timers.forEach(clearTimeout); rit.timers = []; }
        async function ritual(box, o) {
            ritualStop();
            const my = rit.run, theme = o.theme || 'pink', ok = () => my === rit.run && (!o.alive || o.alive());
            box.innerHTML = `
              <div class="rit rit-${theme}">
                <div class="rit-orb"><i class="rit-ring"></i><i class="rit-ring r2"></i><span class="rit-ico">${o.icon || '✨'}</span>
                  ${Array.from({ length: 10 }, (_, i) => `<b class="rit-dust" style="--a:${i * 36}deg;--d:${(i % 3) * .4}s"></b>`).join('')}</div>
                <p class="rit-msg"></p>
                <div class="rit-count"></div>
              </div>`;
            const msg = box.querySelector('.rit-msg'), cnt = box.querySelector('.rit-count'), wrap = box.querySelector('.rit');
            const say = t => { msg.classList.remove('on'); void msg.offsetWidth; msg.textContent = t; msg.classList.add('on'); };
            ritSfx(theme, 'start');
            for (let i = 0; i < o.msgs.length; i++) {
                say(o.msgs[i]); if (i) ritSfx(theme, 'step', i);
                await ritLater(RIT_MSG_MS); if (!ok()) return false;
            }
            msg.classList.remove('on'); wrap.classList.add('charge');
            for (let n = 3; n >= 1; n--) {
                cnt.textContent = n; cnt.classList.remove('pop'); void cnt.offsetWidth; cnt.classList.add('pop');
                ritSfx(theme, 'count', n);
                await ritLater(RIT_COUNT_MS); if (!ok()) return false;
            }
            cnt.textContent = ''; wrap.classList.add('burst');
            ritSfx(theme, 'reveal');
            await ritLater(450);
            return ok();
        }
        /* 결과 화면 : 덩어리들이 하나씩 차례로 떠올라요 */
        function ritStagger(box, sel) {
            [...box.querySelectorAll(sel || ':scope > *')].forEach((el, i) => { el.classList.add('rit-up'); el.style.animationDelay = (i * .22) + 's'; });
        }
