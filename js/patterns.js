/* 말랑달콤 다이어리 - js/patterns.js
   🎨 전체 배경에 까는 패턴 목록 (☁️ 말랑패턴 · 🍬 달콤패턴)
   - tier : 'free' = 말랑패턴(심플한 줄무늬·도트 · 누구나) / 'paid' = 달콤패턴(그림이 들어간 패턴 · 저금해 준 사람만)
   - css  : 배경에 그대로 들어가는 CSS 값 (이미지 파일 없이 동작)
   - 새 패턴 추가 : 아래 목록에 { id, tier, name, css } 한 줄 추가. id는 저장에 쓰이므로 한 번 정하면 바꾸지 마세요.
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → patterns → skins → service (index.html 참고) */
const BG_PATTERNS = (() => {
    const svg = s => `url("data:image/svg+xml,${encodeURIComponent(s.replace(/\s{2,}/g, ' ').trim())}")`;

    /* 손그림 느낌 : 가장자리를 살짝 흔드는 필터 */
    const wobble = (id, scale = 3, seed = 4) =>
      `<filter id="${id}" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="${scale}"/></filter>`;

    /* ---------- 1. 블루 플라워 깅엄 ---------- */
    const gingFlowers = svg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
    <defs>${wobble('w', 2)}
    <g id="f"><g fill="#7f9be0"><circle cx="0" cy="-4.6" r="3.9"/><circle cx="4.4" cy="-1.4" r="3.9"/><circle cx="2.7" cy="3.8" r="3.9"/><circle cx="-2.7" cy="3.8" r="3.9"/><circle cx="-4.4" cy="-1.4" r="3.9"/></g>
    <g fill="#b3c5f2"><circle cx="0" cy="-5.4" r="1.6"/><circle cx="5" cy="-1.8" r="1.4"/></g><circle r="2" fill="#fff7cf"/><circle r=".9" fill="#e7b64a"/></g>
    <path id="l" d="M0 0 q5 -5 10 0 q-5 5 -10 0z" fill="#79a383"/>
    <g id="sp"><path d="M0 14 q2 -8 -1 -16" stroke="#79a383" stroke-width="1.2" fill="none"/><use href="#l" transform="translate(0 8) rotate(-150)"/><use href="#l" transform="translate(0 5) rotate(-30) scale(.8)"/><use href="#f" transform="translate(-1 -3) scale(.9)"/><use href="#f" transform="translate(8 -9) scale(.55)"/></g>
    </defs>
    <g filter="url(#w)">
    <use href="#sp" transform="translate(30 36) rotate(-18)"/>
    <use href="#sp" transform="translate(94 94) rotate(24) scale(.85)"/>
    <use href="#f" transform="translate(98 28) scale(.6)"/>
    <use href="#f" transform="translate(26 100) scale(.7) rotate(20)"/>
    <use href="#l" transform="translate(64 64) rotate(40) scale(.8)"/>
    </g></svg>`);

    /* ---------- 2. 토마토 피크닉 ---------- */
    const tomato = svg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <defs>${wobble('w', 3.5, 7)}
    <pattern id="ck" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#fff"/><rect width="4" height="8" fill="#e45a4d" opacity=".55"/><rect width="8" height="4" fill="#e45a4d" opacity=".55"/></pattern>
    <path id="cx" d="M0 -27 l4 6 8 -2 -5 6 7 4 -9 1 -5 6 -4 -6 -9 0 6 -5 -5 -6 8 2z" fill="#5d9e57"/>
    <g id="t"><ellipse rx="26" ry="23" fill="#ec5745"/><ellipse cx="4" cy="6" rx="20" ry="15" fill="#d9483a" opacity=".35"/><ellipse cx="-11" cy="-8" rx="7" ry="3.6" fill="#fff" opacity=".6" transform="rotate(-30 -11 -8)"/><use href="#cx"/></g>
    <g id="s"><circle r="24" fill="#ec5a47"/><circle r="19.5" fill="#f37b64"/>
    <g fill="#fbb49e"><ellipse cx="0" cy="-10" rx="6" ry="7.5"/><ellipse cx="9" cy="6" rx="6" ry="7.5" transform="rotate(120 9 6)"/><ellipse cx="-9" cy="6" rx="6" ry="7.5" transform="rotate(240 -9 6)"/></g>
    <g fill="#fff6cf"><ellipse cx="-1.5" cy="-11" rx="1.3" ry="2"/><ellipse cx="2" cy="-8" rx="1.3" ry="2"/><ellipse cx="9" cy="4" rx="1.3" ry="2"/><ellipse cx="7" cy="8" rx="1.3" ry="2"/><ellipse cx="-9" cy="4" rx="1.3" ry="2"/><ellipse cx="-7" cy="8.5" rx="1.3" ry="2"/></g>
    <circle r="3.5" fill="#f37b64"/><use href="#cx" transform="translate(0 2) scale(.8)"/></g>
    <g id="g"><ellipse rx="25" ry="22" fill="url(#ck)" stroke="#e45a4d" stroke-width="2"/><use href="#cx"/></g>
    <g id="b" stroke="#6b93d4" stroke-width="2" stroke-linejoin="round" fill="#c4d6f3"><path d="M0 0 C-8 -12 -21 -8 -16 2 C-12 9 -5 4 0 0z"/><path d="M0 0 C8 -12 21 -8 16 2 C12 9 5 4 0 0z"/><path d="M-1 1 l-7 14 M1 1 l8 13" fill="none"/><circle r="3" fill="#8fb0e3"/></g>
    </defs>
    <g stroke="#f5de8a" stroke-width="13" stroke-linecap="round" fill="none" opacity=".9">
    <path d="M-10 30 q30 -9 60 0 t60 0 t60 0 t60 0 t60 0"/><path d="M-10 90 q30 -9 60 0 t60 0 t60 0 t60 0 t60 0"/>
    <path d="M-10 150 q30 -9 60 0 t60 0 t60 0 t60 0 t60 0"/><path d="M-10 210 q30 -9 60 0 t60 0 t60 0 t60 0 t60 0"/></g>
    <g filter="url(#w)">
    <use href="#t" transform="translate(56 64)"/><use href="#b" transform="translate(70 44) rotate(12) scale(.8)"/>
    <use href="#s" transform="translate(178 50) rotate(14)"/>
    <use href="#g" transform="translate(118 132) rotate(-6)"/>
    <use href="#t" transform="translate(196 180) rotate(-10) scale(.9)"/><use href="#b" transform="translate(210 162) rotate(-8) scale(.7)"/>
    <use href="#s" transform="translate(52 190) rotate(-24) scale(.9)"/>
    </g></svg>`);

    /* ---------- 4. 찻잔 퀼트 ---------- */
    function quiltTile() {
      const pinks = [[80,80,'fl'],[240,80,'bw'],[80,240,'bw'],[240,240,'fl']];
      const mint = [[160,160,'tc'],[0,0,'tc'],[320,0,'tc'],[0,320,'tc'],[320,320,'tc'],[160,0,'pf'],[160,320,'pf'],[0,160,'pf'],[320,160,'pf']];
      const dia = (x, y, r) => `${x},${y-r} ${x+r},${y} ${x},${y+r} ${x-r},${y}`;
      return svg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
    <defs>${wobble('w', 2.5, 11)}
    <radialGradient id="pg" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#fde7eb"/><stop offset="1" stop-color="#f3bfca"/></radialGradient>
    <radialGradient id="mg"><stop offset="0" stop-color="#ffffff" stop-opacity=".45"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <g id="fl"><path d="M0 18 q-2 -10 0 -18" stroke="#7fae8a" stroke-width="2" fill="none"/><path d="M0 12 q-9 -2 -11 -9 q8 0 11 9z M0 9 q9 -3 10 -9 q-8 1 -10 9z" fill="#8fbf97"/>
    <g fill="#e58aa0"><circle cx="0" cy="-6" r="5"/><circle cx="5.5" cy="-2" r="5"/><circle cx="3.5" cy="4" r="5"/><circle cx="-3.5" cy="4" r="5"/><circle cx="-5.5" cy="-2" r="5"/></g><circle r="3" fill="#fff3d6"/></g>
    <g id="pf" transform="scale(.8)"><g fill="#f4a9ba"><circle cx="0" cy="-6" r="5"/><circle cx="5.5" cy="-2" r="5"/><circle cx="3.5" cy="4" r="5"/><circle cx="-3.5" cy="4" r="5"/><circle cx="-5.5" cy="-2" r="5"/></g><circle r="3" fill="#fff"/><path d="M8 8 q7 1 10 -5 q-7 0 -10 5z M-8 8 q-7 1 -10 -5 q7 0 10 5z" fill="#86b893"/></g>
    <g id="bw" stroke="#ffffff" stroke-width="2.4" fill="none" stroke-linejoin="round" stroke-linecap="round"><path d="M0 0 C-9 -13 -24 -9 -18 2 C-13 10 -5 4 0 0z"/><path d="M0 0 C9 -13 24 -9 18 2 C13 10 5 4 0 0z"/><path d="M-1 2 q-5 9 -10 16 M1 2 q5 9 11 15"/><circle r="3" fill="#ffffff"/></g>
    <g id="tc"><ellipse cx="0" cy="12" rx="20" ry="4.5" fill="#fff" stroke="#e38ea2" stroke-width="1.6"/><path d="M-14 -6 h28 q0 18 -14 18 q-14 0 -14 -18z" fill="#fff" stroke="#e38ea2" stroke-width="1.6"/><path d="M14 -2 q8 -1 7 6 q-1 5 -9 4" fill="none" stroke="#e38ea2" stroke-width="1.6"/><path d="M0 3 c-3 -4 -7 -1 -4 2 l4 3 l4 -3 c3 -3 -1 -6 -4 -2z" fill="#f0a3b4"/><path d="M-4 -12 q-3 -4 0 -7 M3 -11 q-3 -4 0 -7" stroke="#b9d8c3" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>
    </defs>
    <rect width="320" height="320" fill="#c7e3d0"/>
    ${mint.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="62" fill="url(#mg)"/>`).join('')}
    ${pinks.map(([x,y]) => `<polygon points="${dia(x,y,80)}" fill="url(#pg)"/>`).join('')}
    <g fill="none" stroke="#ffffff" stroke-width="1.7" stroke-dasharray="5 4" opacity=".9">
    ${pinks.map(([x,y]) => `<polygon points="${dia(x,y,71)}"/><polygon points="${dia(x,y,89)}"/>`).join('')}</g>
    <g filter="url(#w)">
    ${pinks.concat(mint).map(([x,y,k]) => `<use href="#${k}" transform="translate(${x} ${y})"/>`).join('')}
    </g></svg>`);
    }

    /* ---------- 5. 물망초 들판 ---------- */
    const meadow = svg(`
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
    <defs>${wobble('w', 2.5, 2)}
    <g id="f"><g fill="#86a5e4"><circle cx="0" cy="-5.5" r="4.8"/><circle cx="5.2" cy="-1.7" r="4.8"/><circle cx="3.2" cy="4.5" r="4.8"/><circle cx="-3.2" cy="4.5" r="4.8"/><circle cx="-5.2" cy="-1.7" r="4.8"/></g><circle r="2.6" fill="#fff9d8"/><circle r="1.1" fill="#e2b04a"/></g>
    <g id="f2"><g fill="#b0c5f1"><circle cx="0" cy="-5.5" r="4.8"/><circle cx="5.2" cy="-1.7" r="4.8"/><circle cx="3.2" cy="4.5" r="4.8"/><circle cx="-3.2" cy="4.5" r="4.8"/><circle cx="-5.2" cy="-1.7" r="4.8"/></g><circle r="2.6" fill="#fff9d8"/></g>
    <g id="lf"><path d="M0 0 q-2 -12 0 -22" stroke="#8cb15f" stroke-width="1.6" fill="none"/><path d="M0 -6 q-10 -3 -12 -11 q9 1 12 11z M0 -12 q9 -2 11 -10 q-9 1 -11 10z M0 -20 q-5 -6 0 -10 q5 4 0 10z" fill="#9dbf6a"/></g>
    </defs>
    <g filter="url(#w)">
    <use href="#f" transform="translate(40 40)"/><use href="#f2" transform="translate(56 50) scale(.7)"/><use href="#lf" transform="translate(30 62) rotate(-30)"/>
    <use href="#f" transform="translate(150 30) scale(.9) rotate(20)"/><use href="#lf" transform="translate(170 40) rotate(40) scale(.8)"/>
    <use href="#f2" transform="translate(110 100) scale(1.05)"/><use href="#f" transform="translate(96 114) scale(.65)"/>
    <use href="#lf" transform="translate(186 118) rotate(10)"/>
    <use href="#f" transform="translate(172 166) rotate(-15)"/><use href="#f2" transform="translate(190 178) scale(.6)"/>
    <use href="#f" transform="translate(54 172) scale(.85)"/><use href="#lf" transform="translate(76 190) rotate(-50) scale(.9)"/>
    <use href="#f2" transform="translate(118 196) scale(.55)"/>
    </g></svg>`);

    /* 종이 질감 노이즈 */

    const plaid = (deg) => `repeating-linear-gradient(${deg}, rgba(232,86,75,.75) 0 4px, transparent 4px 18px, rgba(84,138,214,.7) 18px 21px, transparent 21px 34px, rgba(242,192,48,.8) 34px 38px, transparent 38px 52px, rgba(92,176,104,.7) 52px 55px, transparent 55px 70px, rgba(242,138,58,.7) 70px 73px, transparent 73px 84px, rgba(232,86,75,.45) 84px 86px, transparent 86px 96px)`;

    return [
        /* ---------------- ☁️ 말랑패턴 : 심플한 줄무늬 · 도트 · 체크 ---------------- */
        { id: 'candy', tier: 'free', name: '사탕 스트라이프',
          css: { backgroundColor: '#fdf0f4',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 13px, rgba(255,255,255,.9) 13px 15px, transparent 15px 28px), repeating-linear-gradient(45deg, #fdf0f4 0 14px, #f7c3d1 14px 28px)' } },
        { id: 'dots', tier: 'free', name: '딸기우유 도트',
          css: { backgroundColor: '#ffe7ee',
            backgroundImage: 'radial-gradient(circle, #ffffff 0 5px, transparent 5.5px), radial-gradient(circle, #ffffff 0 5px, transparent 5.5px)',
            backgroundSize: '30px 30px, 30px 30px', backgroundPosition: '0 0, 15px 15px' } },
        { id: 'pink-stripe', tier: 'free', name: '핑크 세로줄',
          css: { backgroundColor: '#fff5f8',
            backgroundImage: 'repeating-linear-gradient(90deg, #ffd6e2 0 18px, #fff5f8 18px 36px)' } },
        { id: 'mint-stripe', tier: 'free', name: '민트 가로줄',
          css: { backgroundColor: '#f1fbf6',
            backgroundImage: 'repeating-linear-gradient(0deg, #cdeedd 0 14px, #f1fbf6 14px 28px, #e2f6ec 28px 30px, #f1fbf6 30px 44px)' } },
        { id: 'blue-gingham', tier: 'free', name: '블루 깅엄',
          css: { backgroundColor: '#eef4fc',
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(133,166,220,.36) 0 16px, transparent 16px 32px), repeating-linear-gradient(0deg, rgba(133,166,220,.36) 0 16px, transparent 16px 32px)' } },
        { id: 'lavender-check', tier: 'free', name: '라벤더 체크',
          css: { backgroundColor: '#f6f1fc',
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(186,160,226,.45) 0 3px, transparent 3px 26px), repeating-linear-gradient(0deg, rgba(186,160,226,.45) 0 3px, transparent 3px 26px)' } },
        { id: 'scallop', tier: 'free', name: '구름 스캘럽',
          css: { backgroundColor: '#d6ebf6',
            backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 11px, #ffffff 11.5px 13px, transparent 13.5px), radial-gradient(circle at 50% 0, #eaf5fb 0 13px, transparent 13.5px)',
            backgroundSize: '26px 20px', backgroundPosition: '0 0, 13px 10px' } },
        { id: 'lemon-grid', tier: 'free', name: '레몬 격자',
          css: { backgroundColor: '#fff8d6',
            backgroundImage: 'radial-gradient(circle, #f2c94c 0 3px, transparent 3.5px), linear-gradient(90deg, rgba(242,201,76,.35) 0 2px, transparent 2px), linear-gradient(0deg, rgba(242,201,76,.35) 0 2px, transparent 2px)',
            backgroundSize: '36px 36px', backgroundPosition: '-17px -17px, 0 0, 0 0' } },
        { id: 'grid-paper', tier: 'free', name: '모눈종이',
          css: { backgroundColor: '#fffdf7',
            backgroundImage: 'linear-gradient(90deg, rgba(120,170,210,.35) 0 1px, transparent 1px), linear-gradient(0deg, rgba(120,170,210,.35) 0 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,210,.15) 0 1px, transparent 1px), linear-gradient(0deg, rgba(120,170,210,.15) 0 1px, transparent 1px)',
            backgroundSize: '80px 80px, 80px 80px, 16px 16px, 16px 16px' } },
        { id: 'plaid', tier: 'free', name: '무지개 체크',
          css: { backgroundColor: '#fcf6df', backgroundImage: `${plaid('90deg')}, ${plaid('0deg')}` } },

        /* ---------------- 🍬 달콤패턴 : 그림이 들어간 패턴 (저금해 준 사람만) ---------------- */
        { id: 'flower-gingham', tier: 'paid', name: '블루 플라워 깅엄',
          css: { backgroundColor: '#eef4fc',
            backgroundImage: `${gingFlowers}, repeating-linear-gradient(90deg, rgba(133,166,220,.36) 0 16px, transparent 16px 32px), repeating-linear-gradient(0deg, rgba(133,166,220,.36) 0 16px, transparent 16px 32px)`,
            backgroundSize: '128px 128px, auto, auto' } },
        { id: 'tomato', tier: 'paid', name: '토마토 피크닉',
          css: { backgroundColor: '#fffaf0', backgroundImage: tomato, backgroundSize: '240px 240px' } },
        { id: 'tea-quilt', tier: 'paid', name: '찻잔 퀼트',
          css: { backgroundColor: '#c7e3d0', backgroundImage: quiltTile(), backgroundSize: '240px 240px' } },
        { id: 'meadow', tier: 'paid', name: '물망초 들판',
          css: { backgroundColor: '#f8f5e4', backgroundImage: meadow, backgroundSize: '220px 220px' } },
    ];
})();

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['patterns'] = true;
