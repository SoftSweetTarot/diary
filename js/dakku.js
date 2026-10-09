/* 말랑달콤 다이어리 - js/dakku.js
   🎀 다꾸 다이컷 : 모든 창(.modal)을 모눈 종이 카드 + 마스킹테이프 + 손그림 다이컷 스티커 아이콘으로 꾸며요 (모양은 css/dakku.css)
   - 창 위쪽 테이프 두 장 · 알림 창은 하트 스티커
   - 메뉴 칸(.service-btn) · 카페 분류(.svc-cat) · 저장 고르기(.save-choice) 의 이모지를 손그림 아이콘으로 (이름이 표에 없으면 이모지에 하얀 테두리만)
   - 구역 제목은 노랑 · 분홍 · 민트 마스킹테이프로 돌아가며 칠해요
   - 나중에 만들어지는 창(배경음악 · 인형 등)도 처음 열릴 때 똑같이 꾸며요
   ※ 색은 다이어리 스킨(--primary-accent · --border-color · --win-fill)을 따라가요 · 이 파일이 없어도 다이어리는 그대로 동작 */
(function () {
    /* ---------- 🎨 아이콘 (48×48 · 디자인 키트 그대로) ---------- */
    const K = 'class="k"', T = 'class="t"', S = 'class="s"', INK = '#7b5a63';
    function star(cx, cy, R, r, n = 5) {
      let d = '';
      for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / n, q = i % 2 ? r : R;
        d += (i ? 'L' : 'M') + (cx + q * Math.cos(a)).toFixed(2) + ' ' + (cy + q * Math.sin(a)).toFixed(2); }
      return d + 'Z';
    }
    function gear(cx, cy, R, r, n) {
      let d = ''; const st = Math.PI * 2 / n;
      for (let i = 0; i < n; i++) { const a = i * st;
        [[a - st * .22, R], [a + st * .22, R], [a + st * .32, r], [a + st * .68, r]].forEach(([b, q], j) =>
          d += (i || j ? 'L' : 'M') + (cx + q * Math.cos(b)).toFixed(2) + ' ' + (cy + q * Math.sin(b)).toFixed(2)); }
      return d + 'Z';
    }
    const heart = (x, y, s) => `M${x} ${y + 9 * s}c${-6 * s} ${-4 * s} ${-9 * s} ${-7.5 * s} ${-9 * s} ${-11 * s}a${4.5 * s} ${4.5 * s} 0 0 1 ${9 * s} ${-1.5 * s}a${4.5 * s} ${4.5 * s} 0 0 1 ${9 * s} ${1.5 * s}c0 ${3.5 * s} ${-3 * s} ${7 * s} ${-9 * s} ${11 * s}z`;
    const spark = (x, y, s, c) => `<path d="${star(x, y, s, s * .38, 4)}" fill="${c || '#fff'}" ${T}/>`;
    const face = (x, y, g = 5) => `<circle cx="${x - g / 2}" cy="${y}" r="1.1" fill="${INK}"/><circle cx="${x + g / 2}" cy="${y}" r="1.1" fill="${INK}"/>`;
    const calTop = c => `<rect x="8" y="10" width="32" height="30" rx="4" fill="#fff" ${K}/><path d="M8 14a4 4 0 0 1 4-4h24a4 4 0 0 1 4 4v5H8z" fill="${c}" ${K}/><path d="M16 7v6M32 7v6" ${S}/>`;
    const bubble = (txt, c, fs = 15) => `<path d="M9 9h30a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H22l-7 6v-6H9a4 4 0 0 1-4-4V13a4 4 0 0 1 4-4z" fill="${c}" ${K}/><text x="24" y="${22 + fs * .4}" text-anchor="middle" font-size="${fs}" font-weight="900" fill="${INK}" font-family="system-ui,sans-serif">${txt}</text>`;
    
    const ICON = {
      /* ✨ 스티커 */
      emoji: `<circle cx="24" cy="25" r="16" fill="#ffe08f" ${K}/><circle cx="18.5" cy="23" r="2" fill="${INK}"/><circle cx="29.5" cy="23" r="2" fill="${INK}"/><path d="M20 28.6q4 3.6 8 0" ${S}/><ellipse cx="14.6" cy="28.4" rx="2.7" ry="1.7" fill="#ff9fb5" opacity=".75"/><ellipse cx="33.4" cy="28.4" rx="2.7" ry="1.7" fill="#ff9fb5" opacity=".75"/>${spark(38, 9, 5)}`,
      caps: `<path d="M9 24a15 15 0 0 1 30 0z" fill="#ffb4c8" ${K}/><path d="M9 24a15 15 0 0 0 30 0z" fill="#fff7e6" ${K}/><rect x="7.5" y="22" width="33" height="4.4" rx="2.2" fill="#ff8fab" ${K}/><path d="M14.5 16q3-4 8-4.6" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="${heart(24, 27.5, .42)}" fill="#ff8fab"/>`,
      make: `<path d="M16.5 31.5L33.5 8.5M31.5 31.5L14.5 8.5" stroke="${INK}" stroke-width="4.4" stroke-linecap="round"/><path d="M16.5 31.5L33.5 8.5M31.5 31.5L14.5 8.5" stroke="#eef2f7" stroke-width="2" stroke-linecap="round"/><circle cx="13.5" cy="36" r="5.6" fill="#ff9fb8" ${K}/><circle cx="13.5" cy="36" r="2.2" fill="#fff"/><circle cx="34.5" cy="36" r="5.6" fill="#ff9fb8" ${K}/><circle cx="34.5" cy="36" r="2.2" fill="#fff"/><circle cx="24" cy="21" r="1.7" fill="${INK}"/>${spark(40.5, 18, 4.5, '#ffe08f')}`,
      tape: `<path d="M21 36H42L39.8 39L42 42H21Z" fill="#b9e6d3" ${K}/><circle cx="21" cy="22" r="14" fill="#b9e6d3" ${K}/><circle cx="21" cy="22" r="6" fill="#fff" ${K}/><g fill="#fff" opacity=".9"><circle cx="12.5" cy="17" r="1.5"/><circle cx="29" cy="15" r="1.5"/><circle cx="30.5" cy="28" r="1.5"/><circle cx="13" cy="29.5" r="1.5"/><circle cx="21" cy="11" r="1.3"/><circle cx="31" cy="39" r="1.3"/><circle cx="25.5" cy="39" r="1.3"/><circle cx="36.5" cy="39" r="1.3"/></g>`,
      piece: `<path d="${heart(16.5, 24, 1)}" fill="#d8c8f6" ${K}/><path d="${star(34, 14, 8.4, 3.8)}" fill="#ffe08f" ${K}/><circle cx="34.5" cy="34" r="6.2" fill="#ffc0cf" ${K}/><path d="M32 31.6a3 3 0 0 1 2.4-1.2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M11 20.5a2.6 2.6 0 0 1 2.5-2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      seal: `<rect x="8" y="7" width="31" height="35" rx="5" fill="#ffe3d3" ${K}/><circle cx="17" cy="17" r="5.4" fill="#fff" ${T}/><circle cx="17" cy="17" r="3.2" fill="#ff9fb8"/><circle cx="30" cy="17" r="5.4" fill="#fff" ${T}/><path d="${heart(30, 15.2, .36)}" fill="#ff8fab"/><circle cx="17" cy="31" r="5.4" fill="#fff" ${T}/><path d="${star(17, 31.2, 3.6, 1.6)}" fill="#ffd36b"/><path d="M24.6 31a5.4 5.4 0 0 1 10.8 0 5.4 5.4 0 0 1-3 4.8l-2.6-2.4z" fill="#fff" ${T}/><path d="M32.4 35.8L29.8 33.4 35.2 30.6Q36 35 32.4 35.8z" fill="#f3e6ee" ${T}/><circle cx="30" cy="31" r="2.6" fill="#a8dcc6"/>`,
      paper: `<path d="M11 7h20l8 8v26a2 2 0 0 1-2 2H13a2 2 0 0 1-2-2z" fill="#fffaf0" ${K}/><path d="M31 7v6a2 2 0 0 0 2 2h6" fill="#f2e6d2" ${K}/><path d="M16.5 32h14.5a4 4 0 0 0 0-8a5.5 5.5 0 0 0-10.5-1.5a4.2 4.2 0 0 0-4 9.5z" fill="#cfe5ff" ${T}/>${face(23.2, 28.6, 5.5)}`,
      leaf: `<rect x="11" y="7" width="28" height="35" rx="4" fill="#dceaff" ${K}/><path d="M18 19h15M18 25.5h15M18 32h10" stroke="#9dbbe6" stroke-width="1.6" stroke-linecap="round"/><g fill="#fff" ${T}><circle cx="15" cy="13" r="1.7"/><circle cx="15" cy="24.5" r="1.7"/><circle cx="15" cy="36" r="1.7"/></g><path d="M30 7v11l2.6-2.2 2.6 2.2V7" fill="#ff9fb8" ${T}/>`,
      tteok: `<path d="M10 17h28v21.5a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2z" fill="#fffaf0" ${K}/><path d="M10 34h28M10 37h28" stroke="#e8dccb" stroke-width="1.2"/><path d="M10 17h28v14.5H10z" fill="#fff1a6"/><path d="M14.5 23h14M14.5 27.5h10" stroke="#e8c95c" stroke-width="1.5" stroke-linecap="round"/><rect x="8.5" y="11" width="31" height="7.5" rx="2" fill="#ff9fb8" ${K}/><path d="M12 14h24" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/><path d="M27 18.5l3 3.5 2.5-2.5 2.5 3 3-3.5V9H27z" fill="#fff1a6" ${T} transform="rotate(-14 32 15)"/>`,
      memo: `<g transform="rotate(-6 24 25)"><path d="M10 11h28v22l-8 8H12a2 2 0 0 1-2-2z" fill="#fff1a6" ${K}/><path d="M38 33h-6a2 2 0 0 0-2 2v6" fill="#f3dc78" ${K}/><path d="M15.5 21.5h17M15.5 27.5h12" stroke="#e8c95c" stroke-width="1.6" stroke-linecap="round"/></g><rect x="17.5" y="5.5" width="14" height="7" rx="1" fill="#ffc2d1" opacity=".92" transform="rotate(5 24 9)"/>`,
      booth: `<rect x="14" y="4.5" width="20" height="39" rx="3.5" fill="#ffb4c8" ${K}/><g fill="#fff" ${T}><rect x="18" y="8.5" width="12" height="9" rx="1.5"/><rect x="18" y="20" width="12" height="9" rx="1.5"/><rect x="18" y="31.5" width="12" height="8" rx="1.5"/></g><path d="${heart(24, 22.4, .32)}" fill="#ff8fab"/>${face(24, 12.6, 4)}${spark(40, 12, 4.4, '#ffe08f')}${spark(8.5, 30, 3.6)}`,
      cam: `<path d="M17 15l2.4-4.4h9.2L31 15" fill="#ffd0dc" ${K}/><rect x="7" y="14.5" width="34" height="24" rx="7" fill="#ffd0dc" ${K}/><circle cx="24" cy="26.5" r="7.6" fill="#fff" ${K}/><circle cx="24" cy="26.5" r="4.2" fill="#a9d4f5"/><circle cx="22.4" cy="24.9" r="1.3" fill="#fff"/><circle cx="35" cy="20" r="1.9" fill="#ffd36b"/>`,
      pick: `<rect x="8" y="10" width="32" height="28" rx="5" fill="#fff" ${K}/><rect x="11.5" y="13.5" width="25" height="21" rx="2.5" fill="#d4ecff"/><path d="M11.5 31l7-8 5 5.5 3.5-3.5 9.5 9.5a2.5 2.5 0 0 1-2.5 2h-20a2.5 2.5 0 0 1-2.5-2.5z" fill="#9ed7c0"/><circle cx="30.5" cy="19.5" r="2.8" fill="#ffd36b"/><circle cx="38" cy="36" r="6" fill="#ff9fb8" ${T}/><path d="${heart(38, 34, .3)}" fill="#fff"/>`,
      text: `${bubble('Aa', '#e6dcff')}${spark(38, 9, 4, '#ffe08f')}`,
      tapemk: `<path d="M18 33H36L34 36L36 39H18Z" fill="#ffd8a8" ${K}/><circle cx="18" cy="21" r="12" fill="#ffd8a8" ${K}/><circle cx="18" cy="21" r="5" fill="#fff" ${K}/><g fill="#fff"><circle cx="10.5" cy="17" r="1.3"/><circle cx="25" cy="15" r="1.3"/><circle cx="26" cy="27" r="1.3"/><circle cx="11" cy="27.5" r="1.3"/></g><circle cx="37" cy="12" r="7" fill="#ff9fb8" ${T}/><path d="M37 8.5v7M33.5 12h7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
      tteokmk: `<path d="M7 18h26v20.5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" fill="#fffaf0" ${K}/><path d="M7 35h26M7 38h26" stroke="#e8dccb" stroke-width="1.2"/><path d="M7 18h26v14H7z" fill="#dff3ff"/><path d="M11.5 24h13M11.5 28.5h9" stroke="#9dc9ea" stroke-width="1.5" stroke-linecap="round"/><rect x="5.5" y="12" width="29" height="7.5" rx="2" fill="#ff9fb8" ${K}/><path d="M9 15h22" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".7"/><circle cx="37" cy="12" r="7" fill="#ffd36b" ${T}/><path d="M37 8.5v7M33.5 12h7" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`,
      leafmk: `<rect x="8" y="8" width="25" height="32" rx="4" fill="#dceaff" ${K}/><path d="M14 18h13M14 24h13M14 30h8" stroke="#9dbbe6" stroke-width="1.6" stroke-linecap="round"/><g transform="rotate(35 34 28)"><rect x="31" y="12" width="7" height="24" rx="1.5" fill="#ffd36b" ${T}/><rect x="31" y="12" width="7" height="4.5" rx="1.5" fill="#ff9fb8" ${T}/><path d="M31 36l3.5 6 3.5-6z" fill="#fde9cf" ${T}/></g>`,
      /* 🎨 페이지 */
      palette: `<path d="M24 7C13 7 6 14.5 6 23.5S13.5 41 22 41c3 0 4-1.6 4-3.4 0-2.6-2.4-3-2.4-5.2 0-2 1.7-3.4 3.8-3.4h4.6C38 29 42 25.5 42 20.5 42 12.5 34 7 24 7z" fill="#fff3e3" ${K}/><g ${T}><circle cx="14.5" cy="23" r="3.3" fill="#ff9fb8"/><circle cx="19" cy="14.5" r="3.3" fill="#ffd36b"/><circle cx="28.5" cy="13" r="3.3" fill="#9ed7c0"/><circle cx="35.5" cy="19.5" r="3.3" fill="#a9c8f5"/></g>`,
      bow: `<path d="M22 24l-6 15 4-1 2 4 3-17zM26 24l6 15-4-1-2 4-3-17z" fill="#ff9fb8" ${K}/><path d="M24 22C18 13 7 11 7 18.5S18 26 24 22z" fill="#ffb4c8" ${K}/><path d="M24 22c6-9 17-11 17-3.5S30 26 24 22z" fill="#ffb4c8" ${K}/><rect x="20.5" y="18.5" width="7" height="7" rx="2.5" fill="#ff8fab" ${K}/><path d="M11 17.5q2-2.5 5-2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      gift: `<rect x="9" y="20" width="30" height="21" rx="3" fill="#cfe5ff" ${K}/><rect x="7" y="14" width="34" height="8" rx="2.5" fill="#e3efff" ${K}/><rect x="21.5" y="14" width="5" height="27" fill="#ff9fb8" ${T}/><path d="M24 14c-3-6-11-7-10-2.5s7 3.5 10 2.5zM24 14c3-6 11-7 10-2.5s-7 3.5-10 2.5z" fill="#ffb4c8" ${K}/>`,
      candy: `<path d="M15 24L6 17v14z" fill="#ffd36b" ${K}/><path d="M33 24l9-7v14z" fill="#ffd36b" ${K}/><circle cx="24" cy="24" r="10.5" fill="#ffb4c8" ${K}/><path d="M24 24a3 3 0 1 1 3 3 6 6 0 0 1-6-6 8.5 8.5 0 0 1 10-4" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
      folder: `<path d="M7 14a3 3 0 0 1 3-3h9l4 4h15a3 3 0 0 1 3 3v19a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" fill="#ffd98a" ${K}/><path d="M7 20.5h34v16.5a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3z" fill="#ffe7a8" ${K}/><path d="${heart(24, 25.5, .55)}" fill="#ff9fb8"/>`,
      brush: `<path d="M9 39c0-4 3-6 6-6s4 2.5 4 4.5-2 4.5-6 4.5H9z" fill="#ff9fb8" ${K}/><g transform="rotate(42 26 22)"><rect x="23" y="2" width="6" height="22" rx="3" fill="#c8b5f2" ${K}/><rect x="22" y="23" width="8" height="5" fill="#e6eaf0" ${K}/><path d="M22 28h8v3c0 4-4 7-4 9-.2-2-4-5-4-9z" fill="#ff9fb8" ${K}/></g>${spark(39, 37, 4, '#ffe08f')}`,
      /* ☕ 카페 */
      sprout: `<path d="M13 29h22l-3 13H16z" fill="#ffc9a8" ${K}/><rect x="11" y="26" width="26" height="5" rx="2" fill="#ffb58f" ${K}/><path d="M24 26V16" ${S}/><path d="M24 20c-8 .5-11.5-5-10.5-9 6-1 10.5 3 10.5 9z" fill="#9ed7c0" ${K}/><path d="M24 17c.5-6 5-9.5 10.5-8.5 0 5-4.5 8.5-10.5 8.5z" fill="#b9e6d3" ${K}/>`,
      ball: `<path d="M13 40q11-7 22 0l1.5 3h-25z" fill="#ffd36b" ${K}/><circle cx="24" cy="21" r="14" fill="#d8c8f6" ${K}/><path d="M15 15a10 10 0 0 1 7-5" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>${spark(28, 22, 5)}${spark(19.5, 27, 3)}`,
      doll: `<circle cx="13.5" cy="15.5" r="5" fill="#b48262" ${K}/><circle cx="34.5" cy="15.5" r="5" fill="#b48262" ${K}/><circle cx="24" cy="26" r="13" fill="#ffe7d9" ${K}/><path d="M11 25a13 13 0 0 1 26 0c-4-3-8-6.5-13-6.5S15 22 11 25z" fill="#b48262" ${K}/>${face(24, 28, 9)}<ellipse cx="16.5" cy="31.5" rx="2.4" ry="1.5" fill="#ff9fb5" opacity=".8"/><ellipse cx="31.5" cy="31.5" rx="2.4" ry="1.5" fill="#ff9fb5" opacity=".8"/><path d="M22.5 32.5q1.5 1.3 3 0" ${S}/><path d="M30 12.5l2.5-2 1 3z" fill="#ff8fab"/>`,
      game: `<path d="M14 15h20a8 8 0 0 1 8 8l1.2 8a5 5 0 0 1-9 3.5L31 31H17l-3.2 3.5a5 5 0 0 1-9-3.5L6 23a8 8 0 0 1 8-8z" fill="#cfe5ff" ${K}/><path d="M15 20v8M11 24h8" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><circle cx="32" cy="21.5" r="2.4" fill="#ff9fb8" ${T}/><circle cx="36" cy="25.5" r="2.4" fill="#ffd36b" ${T}/>`,
      paw: `<path d="M24 25c6 0 11 6 11 10.5 0 3.5-3 5-6 5-2 0-3.3-1-5-1s-3 1-5 1c-3 0-6-1.5-6-5C13 31 18 25 24 25z" fill="#ffc9a8" ${K}/><g fill="#ffc9a8" ${K}><ellipse cx="13" cy="20" rx="3.6" ry="4.4"/><ellipse cx="20" cy="13" rx="3.6" ry="4.6"/><ellipse cx="28" cy="13" rx="3.6" ry="4.6"/><ellipse cx="35" cy="20" rx="3.6" ry="4.4"/></g>`,
      letter: `<rect x="6" y="12" width="36" height="25" rx="3.5" fill="#fff" ${K}/><path d="M7 14l17 13 17-13" fill="none" ${K}/><circle cx="24" cy="27" r="5" fill="#ff9fb8" ${T}/><path d="${heart(24, 25, .36)}" fill="#fff"/>`,
      piggy: `<path d="M13 22l-1-7 6 4" fill="#ffb4c8" ${K}/><ellipse cx="24" cy="27" rx="16" ry="12" fill="#ffc6d4" ${K}/><rect x="15" y="35" width="5" height="6" rx="2" fill="#ffc6d4" ${K}/><rect x="28" y="35" width="5" height="6" rx="2" fill="#ffc6d4" ${K}/><ellipse cx="39" cy="28" rx="4" ry="5" fill="#ff9fb8" ${K}/><circle cx="38.3" cy="26.5" r=".9" fill="${INK}"/><circle cx="38.3" cy="29.5" r=".9" fill="${INK}"/><circle cx="31" cy="23" r="1.3" fill="${INK}"/><rect x="19" y="15" width="9" height="2.6" rx="1.3" fill="${INK}"/><circle cx="23.5" cy="9" r="4" fill="#ffd36b" ${T}/>`,
      shop: `<path d="M10 17h28l-2.2 24H12.2z" fill="#ffb4c8" ${K}/><path d="M18 17v-3a6 6 0 0 1 12 0v3" fill="none" ${K}/><path d="${heart(24, 25, .65)}" fill="#fff"/><path d="M10 22h28" stroke="#fff" stroke-width="1.6" opacity=".7"/>`,
      wall: `<rect x="13" y="5" width="22" height="38" rx="5" fill="#fff" ${K}/><rect x="16" y="10" width="16" height="27" rx="2" fill="#ffd6e1"/><path d="M16 30l5-5 4 4 3-3 4 4v5a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z" fill="#9ed7c0"/><circle cx="27.5" cy="16" r="2.4" fill="#ffd36b"/>`,
      cal: `${calTop('#ff9fb8')}<circle cx="24" cy="29.5" r="6" fill="none" stroke="#ff6b88" stroke-width="2"/><path d="M21 29.5l2.2 2.2 4-4.2" fill="none" stroke="#ff6b88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
      calheart: `${calTop('#ffb4c8')}<path d="${heart(24, 25, .7)}" fill="#ff8fab"/>`,
      ask: `${bubble('?', '#cfe5ff', 20)}`,
      clover: `<path d="M24 26c3 6 4 11 2 16" ${S}/><g fill="#9ed7c0" ${K}><path d="${heart(24, 15.5, .62)}" transform="rotate(0 24 24)"/><path d="${heart(24, 15.5, .62)}" transform="rotate(90 24 24)"/><path d="${heart(24, 15.5, .62)}" transform="rotate(180 24 24)"/><path d="${heart(24, 15.5, .62)}" transform="rotate(270 24 24)"/></g><circle cx="24" cy="24" r="2" fill="#7fc6a8"/>`,
      dday: `<path d="M13 7h22M13 41h22" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><path d="M15 7h18c0 8-6 11-6 17s6 9 6 17H15c0-8 6-11 6-17s-6-9-6-17z" fill="#fff" ${K}/><path d="M18.5 14h11c-1 3-5.5 5-5.5 8-0-3-4.5-5-5.5-8zM17 40c.5-4 4-6 7-8 3 2 6.5 4 7 8z" fill="#ffd36b"/>`,
      card: `<rect x="17" y="8" width="22" height="31" rx="3" fill="#d8c8f6" ${K} transform="rotate(12 28 24)"/><rect x="9" y="9" width="22" height="31" rx="3" fill="#fff" ${K} transform="rotate(-8 20 24)"/><path d="${star(20, 24.5, 7, 3)}" fill="#ffd36b" ${T} transform="rotate(-8 20 24)"/>`,
      moon: `<path d="M27 7a17 17 0 1 0 14 25A13.5 13.5 0 1 1 27 7z" fill="#ffe08f" ${K}/>${face(18, 26, 6)}<ellipse cx="14" cy="30" rx="2.2" ry="1.4" fill="#ff9fb5" opacity=".8"/>${spark(36, 13, 4.5)}`,
      scroll: `<rect x="12" y="11" width="24" height="27" fill="#fffaf0" ${K}/><rect x="9" y="7" width="30" height="6" rx="3" fill="#e9c9a0" ${K}/><rect x="9" y="36" width="30" height="6" rx="3" fill="#e9c9a0" ${K}/><path d="M17 19h14M17 24.5h14M17 30h9" stroke="#e3b8a0" stroke-width="1.6" stroke-linecap="round"/><circle cx="31" cy="30.5" r="3" fill="#ff8fab"/>`,
      hearts: `<path d="${heart(17, 18, 1)}" fill="#ffb4c8" ${K}/><path d="${heart(31, 22, 1)}" fill="#ff8fab" ${K}/><path d="M13 16a2.6 2.6 0 0 1 2.5-2" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
      mind: `<path d="M13 31a7 7 0 0 1-1-13.5 9 9 0 0 1 16.5-5A7.5 7.5 0 0 1 37 23a6 6 0 0 1-3.5 8z" fill="#fff" ${K}/><circle cx="12" cy="37.5" r="3" fill="#fff" ${T}/><circle cx="7.5" cy="42" r="1.8" fill="#fff" ${T}/><path d="${heart(24.5, 17.5, .7)}" fill="#ff9fb8"/>`,
      mask: `<path d="M8 10q11 4 22 0v12c0 8-5 13-11 13S8 30 8 22z" fill="#fff" ${K}/><path d="M13 19q2-2 4 0M21 19q2-2 4 0M14 26q5 4 10 0" ${S}/><path d="M24 17q8 3 17 0v10c0 7-4 11-8.5 11-3 0-5.5-1.6-7-4" fill="#ffd36b" ${K}/><path d="M28.5 23q1.5 1.5 3 0M35 23q1.5 1.5 3 0M30 32q3-2.5 6 0" ${S}/>`,
      joy: `<path d="M9 33h30l2 6H7z" fill="#ffb4c8" ${K}/><rect x="7" y="38" width="34" height="4" rx="2" fill="#ff9fb8" ${K}/><path d="M24 33V18" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="14" r="6.5" fill="#ff6b88" ${K}/><path d="M21.5 11.5a3 3 0 0 1 2.5-1.5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="34" cy="35.5" r="1.6" fill="#ffd36b"/>`,
      trophy: `<path d="M15 8h18v9a9 9 0 0 1-18 0z" fill="#ffd36b" ${K}/><path d="M15 11H9.5a4.5 4.5 0 0 0 5.5 7M33 11h5.5a4.5 4.5 0 0 1-5.5 7" ${S}/><path d="M22 26h4v6h-4z" fill="#ffd36b" ${K}/><rect x="15" y="32" width="18" height="8" rx="2" fill="#e9c9a0" ${K}/><path d="${star(24, 15.5, 4.6, 2)}" fill="#fff"/>`,
      people: `<circle cx="17" cy="17" r="6.5" fill="#ffe7d9" ${K}/><circle cx="31" cy="17" r="6.5" fill="#ffe7d9" ${K}/><path d="M6 39a11 11 0 0 1 22 0z" fill="#ffb4c8" ${K}/><path d="M20 39a11 11 0 0 1 22 0z" fill="#b9e6d3" ${K}/>${face(17, 17.5, 4)}${face(31, 17.5, 4)}`,
      dollshow: `<path d="M6 10h36v4H6z" fill="#ff8fab" ${K}/><path d="M7 14c3 8 3 18 0 26h7c2-8 2-18 0-26zM41 14c-3 8-3 18 0 26h-7c-2-8-2-18 0-26z" fill="#ffb4c8" ${K}/><circle cx="24" cy="27" r="6" fill="#ffe7d9" ${K}/>${face(24, 27.5, 4.5)}`,
      /* ⚙ 설정 */
      ruler: `<g transform="rotate(-35 24 24)"><rect x="5" y="17" width="38" height="14" rx="3" fill="#ffe08f" ${K}/><path d="M11 17v5M17 17v7M23 17v5M29 17v7M35 17v5" ${S}/></g>`,
      gear: `<path d="${gear(24, 24, 17, 13.2, 8)}" fill="#dccdf5" ${K}/><circle cx="24" cy="24" r="5.5" fill="#fff" ${K}/>`,
      lock: `<path d="M16 21v-5a8 8 0 0 1 16 0v5" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M16 21v-5a8 8 0 0 1 16 0v5" fill="none" stroke="#e6eaf0" stroke-width="2" stroke-linecap="round"/><rect x="10.5" y="20" width="27" height="21" rx="5" fill="#ffd0dc" ${K}/><path d="${heart(24, 26, .6)}" fill="#ff8fab"/>`,
      music: `<path d="M19 33V13l18-4.5v20" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/><path d="M19 13l18-4.5v5L19 18z" fill="#ff9fb8" ${K}/><ellipse cx="14.5" cy="33.5" rx="5.5" ry="4.5" fill="#a9c8f5" ${K}/><ellipse cx="32.5" cy="29" rx="5.5" ry="4.5" fill="#a9c8f5" ${K}/>`,
      install: `<rect x="13" y="5" width="22" height="38" rx="5" fill="#fff" ${K}/><rect x="16" y="10" width="16" height="25" rx="2" fill="#d4ecff"/><circle cx="24" cy="39" r="1.5" fill="${INK}"/><circle cx="35" cy="31" r="7" fill="#ff9fb8" ${T}/><path d="M35 27.5v6M32.3 31l2.7 3 2.7-3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
      /* 공통 */
      cloud: `<path d="M13 36h23a7 7 0 0 0 1-14 10 10 0 0 0-19-3 8.5 8.5 0 0 0-5 17z" fill="#d4ecff" ${K}/>${face(24, 29, 7)}<ellipse cx="18" cy="32" rx="2" ry="1.3" fill="#ff9fb5" opacity=".8"/><ellipse cx="30" cy="32" rx="2" ry="1.3" fill="#ff9fb5" opacity=".8"/>`,
      heartS: `<path d="${heart(24, 30, 1.6)}" fill="#ff8fab" ${K}/><path d="M13 16q1.5-3.5 5-3.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
    };
    const svg = k => `<svg class="dk-ico" viewBox="0 0 48 48" aria-hidden="true">${ICON[k]}</svg>`;
    const ROT = [-5, 3, -2, 4, -3, 2, -4, 5, -1, 3, -3, 2];

    /* 메뉴 이름 → 아이콘 */
    const MAP = {
        '미니시트': 'emoji', '캡슐스티커': 'caps', '마스킹테이프': 'tape', '조각스티커': 'piece', '씰스티커': 'seal', '모조지': 'paper', '속지': 'leaf', '메모지': 'memo', '떡메모지': 'tteok',
        '포토부스': 'booth', '사진찍기': 'cam', '사진고르기': 'pick', '사진찍어 만들기': 'cam', '앨범골라 만들기': 'pick', '글씨 스티커': 'text', '글씨스티커 만들기': 'text', '마스킹테이프 만들기': 'tapemk', '속지 만들기': 'leafmk', '떡메모지 만들기': 'tteokmk',
        '페이지': 'leaf', '페이지 색상설정': 'palette', '페이지 꾸미기': 'bow', '배경지': 'cloud', '이미지로 배경지': 'pick', '그려서 배경지': 'brush',
        '매일': 'sprout', '운세·마음': 'ball', '만들기·꾸미기': 'doll', '게임': 'game', '펫 키우기': 'paw', '함께하기': 'letter',
        '말랑달콤 저금통': 'piggy', '말랑달콤 배경화면': 'wall', '말랑달콤 문구점': 'shop',
        '출석 도장판': 'cal', '오늘의 질문': 'ask', '오늘의 행운': 'clover', '랜덤박스': 'gift', '생리 달력': 'calheart', 'D-day': 'dday',
        '포춘카드': 'card', '꿈해몽': 'moon', '토정비결': 'scroll', '이름 궁합': 'hearts', '심리테스트': 'mind',
        '인형방': 'doll', '인형극': 'dollshow', '오락실': 'joy', '명예의 전당': 'trophy', '익명 편지함': 'letter', '말랑달콤 모임방': 'people',
        '페이지 크기': 'ruler', '설정': 'gear', '건의함': 'letter', '다이어리 잠금': 'lock', '배경음악': 'music', '앱으로 설치하기': 'install'
    };
    const own = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    function die(ic, k, i) {
        ic.classList.add('dk-die'); ic.style.setProperty('--r', ROT[i % ROT.length] + 'deg');
        if (k && ICON[k]) ic.innerHTML = svg(k);
    }

    /* 창 모서리 테이프 : 창(스크롤되는 상자) 밖 · 바깥 화면(.modal)에 붙여서 창 테두리 밖으로 삐져나와요 (안에 넣으면 잘려요)
       창 크기 · 화면 크기가 바뀌면 다시 맞춰요 */
    function dkTapes(m, box) {
        const l = document.createElement('span'), r = document.createElement('span');
        l.className = 'dk-tape l'; r.className = 'dk-tape r';
        box.after(l, r);
        /* offsetLeft · offsetTop 은 창이 톡 뜨는 애니메이션(크기 · 기울기) 중에도 바뀌지 않아서, 테이프가 처음부터 제자리에 붙어요 */
        const fit = () => {
            if (!box.offsetWidth) return;
            const x = box.offsetLeft, y = box.offsetTop;
            l.style.left = (x - 18) + 'px'; l.style.top = (y - 7) + 'px';
            r.style.left = (x + box.offsetWidth - r.offsetWidth + 18) + 'px'; r.style.top = (y - 7) + 'px';
            m.style.transformOrigin = (x + box.offsetWidth / 2) + 'px ' + (y + box.offsetHeight / 2) + 'px';   // 창과 테이프가 창 가운데를 중심으로 같이 톡 (css/style.css winPop)
        };
        if (window.ResizeObserver) new ResizeObserver(fit).observe(box);
        addEventListener('resize', fit);
        box.addEventListener('dk-move', fit);                      // 창을 끌어서 옮기면 테이프도 같이 (js/skins.js setupSkinWindows)
        fit();
    }

    function dkDecorate(m) {
        if (!m || m.dataset.dk) return; m.dataset.dk = '1';
        const box = m.querySelector('.modal-content, .alert-card'); if (!box) return;
        if (box.classList.contains('alert-card')) box.insertAdjacentHTML('afterbegin', `<span class="dk-heart">${svg('heartS')}</span>`);
        else dkTapes(m, box);
        /* 메뉴 칸 : 아이콘은 다이컷 스티커 · 이름은 점선 라벨 */
        box.querySelectorAll('.service-btn').forEach((b, i) => {
            const ic = b.querySelector('.service-icon'); if (!ic) return;
            const t = [...b.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
            const name = t.map(n => n.textContent).join('').trim();
            if (t.length) { const lb = document.createElement('span'); lb.className = 'dk-lb'; lb.textContent = name; t[0].replaceWith(lb); t.slice(1).forEach(n => n.remove()); }
            die(ic, MAP[name], i);
        });
        box.querySelectorAll('.svc-cat').forEach((c, i) => { const ic = c.querySelector('.svc-cat-icon'), b = c.querySelector('b'); if (ic && b && !ic.querySelector('svg')) die(ic, MAP[b.textContent.trim()], i + 1); else if (ic) die(ic, '', i + 1); });
        box.querySelectorAll('.save-choice').forEach((c, i) => { const ic = c.querySelector('.save-choice-icon'), b = c.querySelector('b'); if (ic && b) die(ic, /PNG/.test(b.textContent) ? 'pick' : 'cloud', i); });
        /* 구역 제목 : 마스킹테이프 (노랑 · 분홍 · 민트 돌아가며) */
        const first = box.querySelector('.modal-title');                     // 창 제목(첫 번째)은 리본 · 나머지 제목은 테이프
        box.querySelectorAll('.skin-section-title, .modal-title, .form-group > label').forEach(s => { if (s !== first) s.classList.add('dk-sec'); });
        box.querySelectorAll('.dk-sec').forEach((s, i) => { if (!/\b(pk|mt|ye)\b/.test(s.className)) s.classList.add(['pk', 'mt', 'ye'][i % 3]); });
        box.querySelectorAll('[data-dk-ico]').forEach(e => { e.innerHTML = svg(e.dataset.dkIco); });
    }
    function dkAll() { document.querySelectorAll('.modal').forEach(dkDecorate); }
    /* 나중에 붙는 창도 */
    new MutationObserver(ms => ms.forEach(r => r.addedNodes.forEach(n => { if (n.nodeType === 1 && n.classList.contains('modal')) dkDecorate(n); }))).observe(document.body, { childList: true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dkAll); else dkAll();
    window.dkIcon = svg;
})();
