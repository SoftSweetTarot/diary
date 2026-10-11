/* 말랑달콤 다이어리 - js/stk-basic.js
   🆓 기본 스티커 : 처음부터 누구나 쓰는 🧩 조각스티커 봉투 · 📄 모조지 (✨ 스티커 → 그 종류 → 기본 칸)
   - 그림은 모두 이 파일 안의 SVG (파일 없음) · 다이어리에 붙이면 그 그림(SVG)이 일기에 담겨요
   - 🧩 봉투를 누르면 지금 연출 그대로 봉투가 나와요 (js/piecebag.js openPieceBag) · 조각마다 하얀 다이컷 테두리
   - 📄 모조지를 누르면 그림들이 모조지 한 장에 인쇄돼서 나와요 (js/papermaker.js pmMakeSheet → openPaperSheet) · 열 때마다 배치가 조금씩 달라요
   - hold: true = 만들어 두고 아직 안 보여 줘요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (기본 칸만 '준비 중') */

    (function () {                          // 이름이 다른 파일과 겹치지 않게 이 안에만
        const INK = '#5b3f4a';
        const L = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
        const Lw = w => L.replace('stroke-width="3"', `stroke-width="${w}"`);   // 선 굵기만 다르게 (같은 속성을 두 번 쓰면 그림이 깨져요)
        const eyes = (x1, x2, y, r = 3.2) => `<circle cx="${x1}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x2}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x1 + 1}" cy="${y - 1.2}" r="1" fill="#fff"/><circle cx="${x2 + 1}" cy="${y - 1.2}" r="1" fill="#fff"/>`;
        const smile = (x, y, w = 6) => `<path d="M${x - w / 2} ${y} q${w / 2} ${w * .7} ${w} 0" fill="none" ${L}/>`;
        const blush = (x1, x2, y) => `<ellipse cx="${x1}" cy="${y}" rx="4.5" ry="2.6" fill="#ff9fb6" opacity=".7"/><ellipse cx="${x2}" cy="${y}" rx="4.5" ry="2.6" fill="#ff9fb6" opacity=".7"/>`;
        const face = (cx, cy, d = 14) => eyes(cx - d / 2, cx + d / 2, cy) + smile(cx, cy + 5) + blush(cx - d / 2 - 5, cx + d / 2 + 5, cy + 6);
        
        /* ---------- 그림 (100 × 100) ---------- */
        const ICON = {
            strawberry: `<path d="M50 30 C80 28 86 52 72 74 C64 86 56 92 50 92 C44 92 36 86 28 74 C14 52 20 28 50 30Z" fill="#ff6b81" ${L}/><path d="M34 30 l8 -8 8 6 8 -6 8 8 -8 6 h-16z" fill="#7cc96e" ${L}/>${[[38, 46], [56, 44], [46, 60], [64, 60], [36, 66], [54, 76]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="2.6" fill="#ffe680"/>`).join('')}`,
            cake: `<path d="M18 52 L82 40 L82 80 L18 84Z" fill="#fff6e8" ${L}/><path d="M18 52 L82 40 L82 54 L18 64Z" fill="#ffc2d1" ${L}/><path d="M18 52 L50 22 L82 40Z" fill="#fff" ${L}/><circle cx="50" cy="24" r="8" fill="#ff6b81" ${L}/><path d="M50 16 q4 -6 8 -6" fill="none" ${L}/>`,
            macaron: `<ellipse cx="50" cy="38" rx="32" ry="15" fill="#c9e9ff" ${L}/><rect x="22" y="44" width="56" height="10" rx="5" fill="#fff" ${L}/><ellipse cx="50" cy="64" rx="32" ry="15" fill="#c9e9ff" ${L}/>${face(50, 64, 12)}`,
            cupcake: `<path d="M24 54 L32 88 H68 L76 54Z" fill="#ffd9a8" ${L}/><path d="M34 56 L38 86 M50 56 V86 M66 56 L62 86" ${L}/><path d="M20 56 C14 40 30 30 38 32 C40 18 60 18 62 32 C72 28 86 40 80 56Z" fill="#ffc2d1" ${L}/><circle cx="50" cy="20" r="6" fill="#ff6b81" ${L}/>`,
            donut: `<circle cx="50" cy="52" r="34" fill="#f2c08a" ${L}/><path d="M20 46 C22 26 40 18 50 18 C66 18 82 30 80 50 C76 56 72 52 66 56 C60 60 56 54 50 58 C42 62 38 54 30 58 C24 60 20 54 20 46Z" fill="#ff9fc0" ${L}/><circle cx="50" cy="48" r="10" fill="#fff" ${L}/>${[[34, 34, 20], [62, 30, -30], [70, 44, 60], [30, 50, -60], [44, 26, 80]].map(([x, y, r]) => `<rect x="${x}" y="${y}" width="7" height="2.6" rx="1.3" fill="${['#fff', '#ffe680', '#8fd3ff'][x % 3]}" transform="rotate(${r} ${x} ${y})"/>`).join('')}`,
            milk: `<path d="M30 30 L50 14 L70 30 V86 H30Z" fill="#fff" ${L}/><path d="M30 30 H70" ${L}/><rect x="30" y="44" width="40" height="30" fill="#ffc2d1" ${L}/>${face(50, 56, 12)}`,
            sun: `<g ${L} >${[...Array(8)].map((_, i) => `<line x1="50" y1="8" x2="50" y2="18" transform="rotate(${i * 45} 50 50)"/>`).join('')}</g><circle cx="50" cy="50" r="26" fill="#ffd36b" ${L}/>${face(50, 48)}`,
            cloud: `<path d="M24 72 C10 72 10 50 26 50 C26 32 50 28 56 42 C62 30 84 36 80 54 C92 56 90 74 78 72Z" fill="#fff" ${L}/>${face(52, 58)}`,
            rainbow: `<path d="M12 74 A38 38 0 0 1 88 74" fill="none" stroke="#ff8fa8" stroke-width="9"/><path d="M21 74 A29 29 0 0 1 79 74" fill="none" stroke="#ffd36b" stroke-width="9"/><path d="M30 74 A20 20 0 0 1 70 74" fill="none" stroke="#8fd3ff" stroke-width="9"/><path d="M8 78 C4 66 20 62 24 70 C30 62 42 70 36 80Z M64 80 C58 70 70 62 76 70 C80 62 96 66 92 78Z" fill="#fff" ${L}/>`,
            drop: `<path d="M50 12 C62 32 76 46 76 62 A26 26 0 0 1 24 62 C24 46 38 32 50 12Z" fill="#8fd3ff" ${L}/>${face(50, 62, 12)}`,
            star: `<path d="M50 10 L61 36 L89 38 L67 56 L74 84 L50 69 L26 84 L33 56 L11 38 L39 36Z" fill="#ffe680" ${L}/>${face(50, 50, 12)}`,
            moon: `<path d="M62 12 A38 38 0 1 0 88 64 A30 30 0 1 1 62 12Z" fill="#fff1a8" ${L}/><circle cx="42" cy="54" r="3" fill="${INK}"/><path d="M48 64 q4 4 8 0" fill="none" ${L}/><path d="M30 46 q4 -4 8 0" fill="none" ${L}/>`,
            bunny: `<ellipse cx="36" cy="26" rx="9" ry="22" fill="#fff" ${L}/><ellipse cx="64" cy="26" rx="9" ry="22" fill="#fff" ${L}/><ellipse cx="36" cy="28" rx="4" ry="14" fill="#ffc2d1"/><ellipse cx="64" cy="28" rx="4" ry="14" fill="#ffc2d1"/><ellipse cx="50" cy="64" rx="32" ry="26" fill="#fff" ${L}/>${face(50, 62)}`,
            bear: `<circle cx="26" cy="32" r="12" fill="#d9a77a" ${L}/><circle cx="74" cy="32" r="12" fill="#d9a77a" ${L}/><circle cx="50" cy="56" r="32" fill="#d9a77a" ${L}/><ellipse cx="50" cy="66" rx="13" ry="10" fill="#f6dcc0" ${L}/><circle cx="50" cy="62" r="3" fill="${INK}"/>${eyes(38, 62, 50)}${blush(30, 70, 60)}`,
            cat: `<path d="M20 40 L24 12 L42 28Z M80 40 L76 12 L58 28Z" fill="#ffd9a8" ${L}/><ellipse cx="50" cy="56" rx="34" ry="30" fill="#ffd9a8" ${L}/><path d="M14 58 h12 M14 66 h12 M74 58 h12 M74 66 h12" ${L}/>${face(50, 56)}`,
            chick: `<circle cx="50" cy="54" r="32" fill="#ffe680" ${L}/><path d="M44 28 q6 -16 12 0" fill="#ffe680" ${L}/><path d="M44 58 L50 66 L56 58Z" fill="#ffa64f" ${L}/>${eyes(40, 60, 50)}${blush(32, 68, 60)}`,
            paw: `<ellipse cx="50" cy="64" rx="20" ry="16" fill="#ffc2d1" ${L}/>${[[26, 42], [40, 28], [60, 28], [74, 42]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="10" fill="#ffc2d1" ${L}/>`).join('')}`,
            carrot: `<path d="M30 40 L70 30 L40 88Z" fill="#ffa64f" ${L}/><path d="M40 50 l10 -2 M38 62 l8 -2 M42 74 l5 -1" ${L}/><path d="M62 30 C60 16 70 10 74 14 C78 10 90 16 82 26 C90 30 84 40 70 32Z" fill="#7cc96e" ${L}/>`,
            heart: `<path d="M50 84 C14 60 14 32 32 26 C42 22 50 30 50 36 C50 30 58 22 68 26 C86 32 86 60 50 84Z" fill="#ff6b81" ${L}/><path d="M30 38 q4 -8 12 -6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
            bow: `<path d="M50 50 L16 30 C10 40 10 62 16 70Z M50 50 L84 30 C90 40 90 62 84 70Z" fill="#ff9fc0" ${L}/><path d="M44 54 L34 88 L44 82 L50 90 L52 56Z M56 54 L66 88 L56 82" fill="#ff9fc0" ${L}/><rect x="42" y="42" width="16" height="16" rx="5" fill="#ff6b81" ${L}/>`,
            letter: `<rect x="14" y="28" width="72" height="50" rx="6" fill="#fff" ${L}/><path d="M16 30 L50 58 L84 30" fill="none" ${L}/><path d="M50 62 C42 54 44 46 50 50 C56 46 58 54 50 62Z" fill="#ff6b81" ${L}/>`,
            sparkle: `<path d="M44 10 C48 34 52 38 76 42 C52 46 48 50 44 74 C40 50 36 46 12 42 C36 38 40 34 44 10Z" fill="#ffe680" ${L}/><path d="M76 60 C78 70 80 72 90 74 C80 76 78 78 76 88 C74 78 72 76 62 74 C72 72 74 70 76 60Z" fill="#c9b6ff" ${L}/>`,
            flower: `${[0, 72, 144, 216, 288].map(a => `<ellipse cx="50" cy="28" rx="14" ry="18" fill="#ffc2d1" ${L} transform="rotate(${a} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="13" fill="#ffd36b" ${L}/>`,
            love: `<rect x="10" y="32" width="80" height="36" rx="18" fill="#fff" ${L}/><text x="50" y="58" text-anchor="middle" font-family="Jua, sans-serif" font-size="22" fill="#ff6b81">LOVE</text>`,
            /* 모조지용 (가는 선 · 인쇄 느낌) */
            pencil: `<path d="M20 80 L28 62 L70 20 L80 30 L38 72Z" fill="#ffd36b" ${L}/><path d="M70 20 L80 30 L86 24 C88 20 82 14 78 14Z" fill="#ff9fc0" ${L}/><path d="M20 80 L28 62 L38 72Z" fill="#f6dcc0" ${L}/><path d="M20 80 l4 -8 4 4z" fill="${INK}"/>`,
            eraser: `<rect x="18" y="34" width="64" height="32" rx="6" fill="#fff" ${L} transform="rotate(-12 50 50)"/><rect x="18" y="34" width="30" height="32" rx="6" fill="#8fd3ff" ${L} transform="rotate(-12 50 50)"/>`,
            clip: `<path d="M40 24 V70 A10 10 0 0 0 60 70 V18 A14 14 0 0 0 32 18 V74 A18 18 0 0 0 68 74 V30" fill="none" stroke="#c9b6ff" stroke-width="6" stroke-linecap="round"/>`,
            scissors: `<circle cx="30" cy="72" r="12" fill="none" stroke="#ff6b81" stroke-width="6"/><circle cx="70" cy="72" r="12" fill="none" stroke="#ff6b81" stroke-width="6"/><path d="M38 62 L66 14 M62 62 L34 14" ${Lw(5)}/>`,
            ruler: `<rect x="10" y="38" width="80" height="24" rx="4" fill="#bff0dc" ${L} transform="rotate(-8 50 50)"/><g transform="rotate(-8 50 50)" ${Lw(2)}>${[...Array(9)].map((_, i) => `<line x1="${18 + i * 8}" y1="38" x2="${18 + i * 8}" y2="${i % 2 ? 46 : 50}"/>`).join('')}</g>`,
            note: `<rect x="20" y="16" width="60" height="70" rx="4" fill="#fff6b0" ${L}/><path d="M30 36 h40 M30 48 h40 M30 60 h28" ${Lw(2)}/><rect x="38" y="10" width="24" height="12" fill="#ff9fc0" opacity=".8"/>`,
            tag: `<path d="M14 36 H72 L88 50 L72 64 H14Z" fill="#fff" ${L}/><circle cx="76" cy="50" r="4" fill="none" ${L}/><text x="42" y="56" text-anchor="middle" font-family="Gaegu, Jua, sans-serif" font-size="17" font-weight="bold" fill="#ff6b81">today</text>`,
            tulip: `<path d="M50 90 V52" stroke="#5aa64e" stroke-width="4"/><path d="M50 72 C36 70 30 60 30 56 C40 56 48 62 50 72Z" fill="#7cc96e" ${L}/><path d="M30 26 L40 36 L50 20 L60 36 L70 26 C74 46 64 56 50 56 C36 56 26 46 30 26Z" fill="#ff8fa8" ${L}/>`,
            daisy: `${[...Array(10)].map((_, i) => `<ellipse cx="50" cy="26" rx="7" ry="16" fill="#fff" ${L} transform="rotate(${i * 36} 50 50)"/>`).join('')}<circle cx="50" cy="50" r="12" fill="#ffd36b" ${L}/>`,
            leaf: `<path d="M18 82 C18 40 50 18 86 16 C84 52 62 82 18 82Z" fill="#9fdc8f" ${L}/><path d="M18 82 C40 60 56 44 76 26" fill="none" ${L}/>`,
            butterfly: `<path d="M50 50 C30 20 10 26 14 46 C16 58 34 56 50 50Z M50 50 C70 20 90 26 86 46 C84 58 66 56 50 50Z" fill="#c9b6ff" ${L}/><path d="M50 52 C34 60 26 80 38 82 C46 82 50 66 50 52Z M50 52 C66 60 74 80 62 82 C54 82 50 66 50 52Z" fill="#ffc2d1" ${L}/><path d="M50 34 V76 M50 34 l-6 -12 M50 34 l6 -12" ${L}/>`,
            ladybug: `<circle cx="50" cy="30" r="12" fill="${INK}"/><ellipse cx="50" cy="58" rx="30" ry="28" fill="#ff5c6c" ${L}/><path d="M50 30 V86" ${L}/>${[[36, 50], [64, 50], [38, 70], [62, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${INK}"/>`).join('')}`,
            sprout: `<path d="M50 90 V50" stroke="#5aa64e" stroke-width="4"/><path d="M50 56 C30 58 16 44 18 28 C36 26 50 38 50 56Z M50 50 C64 52 80 40 80 24 C64 22 52 32 50 50Z" fill="#9fdc8f" ${L}/><path d="M30 90 h40" ${L}/>`,
            coffee: `<path d="M22 36 H72 L66 84 H28Z" fill="#fff" ${L}/><path d="M72 46 C88 46 88 66 70 66" fill="none" ${L}/><path d="M24 44 H70" ${L}/>${face(47, 60, 12)}<path d="M38 26 q-4 -6 0 -12 M50 26 q-4 -6 0 -12 M62 26 q-4 -6 0 -12" fill="none" ${Lw(2.4)}/>`,
            croissant: `<path d="M12 64 C14 40 34 26 50 26 C66 26 86 40 88 64 C78 70 70 62 66 66 C60 72 56 64 50 66 C44 64 40 72 34 66 C30 62 22 70 12 64Z" fill="#f2c08a" ${L}/><path d="M32 36 L38 62 M50 28 V64 M68 36 L62 62" ${L}/>`,
            cookie: `<circle cx="50" cy="50" r="34" fill="#e8b98a" ${L}/>${[[38, 36], [60, 34], [64, 58], [40, 62], [52, 48]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#7a4b3a"/>`).join('')}`,
            sign: `<path d="M50 10 L50 22" ${L}/><path d="M30 22 L70 22" ${L}/><rect x="14" y="30" width="72" height="40" rx="8" fill="#7a5040" ${L}/><text x="50" y="58" text-anchor="middle" font-family="Gaegu, Jua, sans-serif" font-size="20" font-weight="bold" fill="#fff">CAFE</text><path d="M30 22 L22 30 M70 22 L78 30" ${L}/>`,
            teapot: `<path d="M24 50 C24 30 76 30 76 50 V70 C76 82 24 82 24 70Z" fill="#c9e9ff" ${L}/><path d="M76 52 C90 50 92 36 86 34" fill="none" ${L}/><path d="M24 54 C12 52 10 70 20 74" fill="none" ${L}/><path d="M40 32 C40 24 60 24 60 32" fill="#fff" ${L}/><circle cx="50" cy="22" r="4" fill="#ff9fc0" ${L}/><path d="M38 56 q12 8 24 0" fill="none" ${L}/>`,
            shell: `<path d="M50 16 C80 16 92 46 84 70 L50 84 L16 70 C8 46 20 16 50 16Z" fill="#ffd9c2" ${L}/><path d="M50 84 V18 M50 84 L30 22 M50 84 L70 22 M50 84 L18 44 M50 84 L82 44" ${Lw(2)}/>`,
            whale: `<path d="M12 56 C12 34 40 28 60 34 C74 38 80 50 84 46 C88 40 92 36 94 40 C92 50 88 58 82 60 C74 76 46 82 28 76 C18 72 12 64 12 56Z" fill="#8fc8ff" ${L}/>${eyes(34, 50, 54, 2.8)}${blush(28, 56, 62)}<path d="M40 22 q0 -10 -6 -12 M40 22 q0 -10 6 -12" fill="none" stroke="#8fd3ff" stroke-width="3" stroke-linecap="round"/>`,
            watermelon: `<path d="M12 40 A38 38 0 0 0 88 40Z" fill="#ff6b81" ${L}/><path d="M12 40 A38 38 0 0 0 88 40" fill="none" stroke="#7cc96e" stroke-width="8"/><path d="M12 40 H88" ${L}/>${[[34, 52], [50, 58], [66, 52], [42, 66], [58, 66]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="3.2" fill="${INK}"/>`).join('')}`,
            icecream: `<path d="M34 50 L50 92 L66 50Z" fill="#f2c08a" ${L}/><path d="M38 60 L60 52 M42 72 L58 64" ${Lw(2)}/><circle cx="50" cy="40" r="20" fill="#ffc2d1" ${L}/>${face(50, 40, 10)}`,
            sunglass: `<path d="M10 40 H90" ${L}/><path d="M14 40 H44 C44 56 38 62 28 62 C18 62 14 54 14 40Z M56 40 H86 C86 54 82 62 72 62 C62 62 56 56 56 40Z" fill="#5b3f4a" ${L}/><path d="M22 46 l8 -2" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
            starfish: `<path d="M50 12 C56 30 58 34 86 38 C64 52 64 56 72 84 C54 68 46 68 28 84 C36 56 36 52 14 38 C42 34 44 30 50 12Z" fill="#ffa58f" ${L}/>${face(50, 50, 10)}`
        };

        /* 그림 하나 → SVG 주소 : die = 하얀 다이컷 테두리 (조각스티커) · 아니면 인쇄 그림 (모조지) */
        function sbSvg(k, die) {
            const body = ICON[k]; if (!body) return '';
            const s = die
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="-9 -9 118 118"><style>.ol *{fill:#fff;stroke:#fff;stroke-width:13px;stroke-linejoin:round;stroke-linecap:round}</style><g class="ol">${body}</g><g>${body}</g></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="-2 -2 104 104">${body}</svg>`;
            return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
        }
        const SB_BAGS = [
            { id: 'b-berry', n: '🍓 딸기 디저트', c: '#ffd1dc', k: ['strawberry', 'cake', 'macaron', 'cupcake', 'donut', 'milk'] },
            { id: 'b-sky', n: '☁️ 맑음 흐림', c: '#cfe9ff', k: ['sun', 'cloud', 'rainbow', 'drop', 'star', 'moon'] },
            { id: 'b-animal', n: '🐰 동물 친구', c: '#ffe8c2', k: ['bunny', 'bear', 'cat', 'chick', 'paw', 'carrot'] },
            { id: 'b-love', n: '💌 러블리', c: '#ffd6e8', k: ['heart', 'bow', 'letter', 'sparkle', 'flower', 'love'] }
        ];
        const SB_SHEETS = [
            { id: 's-stationery', n: '✏️ 문구점', k: ['pencil', 'eraser', 'clip', 'scissors', 'ruler', 'note', 'tag', 'star', 'heart'] },
            { id: 's-garden', n: '🌷 꽃밭 산책', k: ['tulip', 'daisy', 'leaf', 'butterfly', 'ladybug', 'sprout', 'flower', 'sun', 'cloud'] },
            { id: 's-cafe', n: '☕ 카페 타임', k: ['coffee', 'croissant', 'cookie', 'sign', 'teapot', 'cake', 'macaron', 'donut', 'heart'] },
            { id: 's-sea', n: '🏖 여름 바다', k: ['whale', 'shell', 'starfish', 'watermelon', 'icecream', 'sunglass', 'sun', 'drop', 'cloud'] }
        ];
        const sbOn = a => a.filter(x => !x.hold);
        const sbMini = (ks, die) => ks.slice(0, 3).map(k => `<img alt="" src="${sbSvg(k, die)}">`).join('');
        /* 기본 칸 그리기 (js/stickermaker.js stkTab) : kind = 'piece' · 'paper' */
        function stkBasicHtml(kind) {
            if (kind === 'piece') return '<div class="tp-note">🧩 봉투를 누르면 뜯어서 조각을 떼어 붙여요</div>' + sbOn(SB_BAGS).map(b =>
                `<button type="button" class="sb-card sb-bag" onclick="stkBasicOpen('piece','${b.id}')"><span class="sb-top" style="--c:${b.c}">${b.n}</span><span class="sb-mini">${sbMini(b.k, true)}</span><small>조각 ${b.k.length}개</small></button>`).join('');
            if (kind === 'paper') return '<div class="tp-note">📄 모조지를 누르면 그림 둘레를 따라 오려서 붙여요</div>' + sbOn(SB_SHEETS).map(s =>
                `<button type="button" class="sb-card sb-sheet" onclick="stkBasicOpen('paper','${s.id}')"><i class="sb-tape"></i><b>${s.n}</b><span class="sb-mini">${sbMini(s.k, false)}</span><small>그림 ${s.k.length}개</small></button>`).join('');
            return '';
        }
        async function stkBasicOpen(kind, id) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            if (kind === 'piece') {
                const b = sbOn(SB_BAGS).find(x => x.id === id); if (!b || !window.openPieceBag) return;
                if (window.stkLeave) stkLeave(); else closeModal('stickerModal');
                openPieceBag(b.k.map(k => sbSvg(k, true)), { t: b.n.replace(/^\S+\s*/, ''), s: '말랑달콤 기본 조각' });
                return;
            }
            const s = sbOn(SB_SHEETS).find(x => x.id === id); if (!s || !window.openPaperSheet || !window.pmMakeSheet) return;
            let sheet = null;
            try { sheet = await pmMakeSheet(s.k.map(k => sbSvg(k, false))); } catch (e) { showMsg('모조지를 만들지 못했어요.'); return; }
            if (window.stkLeave) stkLeave(); else closeModal('stickerModal');
            openPaperSheet(sheet);
        }
        window.stkBasicHtml = stkBasicHtml; window.stkBasicOpen = stkBasicOpen;
    })();

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['stk-basic'] = true;
