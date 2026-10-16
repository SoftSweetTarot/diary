/* 말랑달콤 다이어리 - js/stickerpack.js
   🍭 포인트스티커 : ✨ 스티커 창 → 🍭 포인트스티커 → 위쪽 '🍭 포인트스티커' 칸 (첫 칸 · 😀 이모지는 둘째 칸)
   - 비슷한 것끼리 묶은 작은 스티커 모음 : 🔤 말랑 알파벳 A~Z · 🔢 말랑 숫자 0~9 · 💗 하트 모음
     🎵 음표 · 📅 요일 · 🗓 달 · ✅ 기호(체크 · 번호 · 화살표) · 💬 한마디 · 🌤 날씨 · ✨ 반짝이 (도련 · 2026-10-15)
     그림 파일 없이 코드로 그려요 (말랑 버블 글씨 · 젤리 모양 + 하얀 다이컷 테두리 · spkGlyph · spkShape) → 한 번 그린 건 기억해 둬요
   - 팩을 고르면 하얀 판에 스티커가 올려진 채 페이지 옆(자리가 없으면 아래쪽)에 떠 있어요
     1) 스티커를 톡 누르면 살짝 커지며 떠올라요 (말려 떼지는 연출 없이)
     2) 그대로 끌어서 페이지에 놓으면 작아지며 꾹 붙어요 → 빨간 점선이 생겨 옮기기 · 돌리기 · 크기 조절 (다른 스티커와 같아요)
        페이지 밖이나 판 위에 놓으면 제자리로 돌아가요 · 떠 있을 때 다른 곳을 누르면 제자리로
   - 판 위쪽 테이프(✋)를 끌면 판이 옮겨져요 · 오른쪽 위 끝 ✕ 로 닫아요 · 판 바깥은 그대로 페이지라 붙인 스티커를 바로 고칠 수 있어요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (포인트스티커 칸만 '준비 중') */

        const SPK_FONT = "'Fredoka', 'Jua', 'Arial Rounded MT Bold', sans-serif";
        const SPK_COLORS = [['#ff9ec1', '#e0628f'], ['#ffd36b', '#d9a12a'], ['#9fd3ff', '#4f9fd8'], ['#a8e3a0', '#5aa863'], ['#c7a8ff', '#8a63d9'], ['#ffb48a', '#e07a45'], ['#8fe0d2', '#3fae9c']];
        const SPK_PACKS = [
            { id: 'abc', g: '글자', items: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
            { id: 'num', g: '숫자', items: '0123456789!?'.split('') },
            { id: 'heart', g: '도형', items: Array.from({ length: 16 }, (_, i) => 'h' + i), draw: (it, i) => spkHeart(i) },
            { id: 'note', g: '음표', items: () => SPK_NOTES, draw: spkShape },
            { id: 'day', g: '요일', items: ['월', '화', '수', '목', '금', '토', '일', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] },
            { id: 'month', g: '달', items: Array.from({ length: 12 }, (_, i) => (i + 1) + '월') },
            { id: 'mark', g: '기호', items: () => SPK_MARKS, draw: spkShape },
            { id: 'word', g: '한마디', items: ['최고!', '수고했어', '행복', '냠냠', '두근두근', '힘내', '좋아', '고마워', '사랑해', '오늘도', '완료!', '굿밤'], draw: spkWord },
            { id: 'sky', g: '날씨', items: () => SPK_SKY, draw: spkShape },
            { id: 'twinkle', g: '반짝이', items: () => SPK_TWINKLE, draw: spkShape },
        ];
        const spkS = { cache: {}, pack: null, lift: null, mv: null, drag: null, press: null };
        const spkq = id => document.getElementById(id);
        const spkMk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

        /* ---------- 그리기 : 160 × 160 캔버스 → 빈 곳 잘라낸 PNG ---------- */
        function spkTrim(c) {
            const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data;
            let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
            for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            const o = spkMk(x1 - x0 + 3, y1 - y0 + 3); o.getContext('2d').drawImage(c, x0 - 1, y0 - 1, o.width, o.height, 0, 0, o.width, o.height);
            return o.toDataURL('image/png');
        }
        /* 글자 : 하얀 테두리 → 진한 테두리 → 파스텔 → 윗부분 반짝 */
        function spkGlyph(ch, i) {
            const c = spkMk(160, 160), x = c.getContext('2d'), [fill, line] = SPK_COLORS[i % SPK_COLORS.length];
            x.translate(80, 84); x.rotate([-.07, .05, -.03, .08, -.06, .03][i % 6]);
            x.font = `700 ${ch.length > 2 ? 54 : ch.length > 1 ? 80 : 108}px ${SPK_FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
            x.save(); x.lineWidth = 26; x.strokeStyle = '#fff'; x.strokeText(ch, 0, 0); x.restore();
            x.lineWidth = 26; x.strokeStyle = '#fff'; x.strokeText(ch, 0, 0);
            x.lineWidth = 7; x.strokeStyle = line; x.strokeText(ch, 0, 0);
            x.fillStyle = fill; x.fillText(ch, 0, 0);
            const g = spkMk(160, 160), gx = g.getContext('2d');                   // 반짝 : 글자 안에서만
            gx.translate(80, 84); gx.rotate([-.07, .05, -.03, .08, -.06, .03][i % 6]); gx.font = x.font; gx.textAlign = 'center'; gx.textBaseline = 'middle';
            gx.fillStyle = '#000'; gx.fillText(ch, 0, 0); gx.globalCompositeOperation = 'source-in';
            gx.setTransform(1, 0, 0, 1, 0, 0); gx.fillStyle = 'rgba(255,255,255,.5)'; gx.beginPath(); gx.ellipse(66, 52, 30, 14, -.4, 0, 7); gx.fill();
            x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(g, 0, 0);
            return spkTrim(c);
        }
        function spkHeartPath(x, cx, cy, s) {
            x.beginPath(); x.moveTo(cx, cy + s * .82);
            x.bezierCurveTo(cx - s * 1.25, cy + s * .02, cx - s * .92, cy - s * .98, cx, cy - s * .4);
            x.bezierCurveTo(cx + s * .92, cy - s * .98, cx + s * 1.25, cy + s * .02, cx, cy + s * .82); x.closePath();
        }
        function spkStar(x, cx, cy, r, col) { x.beginPath(); for (let i = 0; i < 10; i++) { const q = i % 2 ? r * .45 : r, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); x.fillStyle = col; x.fill(); }
        /* 하트 16가지 */
        const SPK_HEARTS = [
            { f: '#ff9ec1', l: '#e0628f' }, { f: '#ff6f8e', l: '#d23f62' }, { f: '#c7a8ff', l: '#8a63d9' }, { f: '#8fe0d2', l: '#3fae9c' },
            { f: '#ffd36b', l: '#d9a12a' }, { f: '#ffb3c8', l: '#e0628f', face: 1 }, { f: '#ff9ec1', l: '#e0628f', dots: '#fff' }, { f: '#9fd3ff', l: '#4f9fd8', stripe: '#fff' },
            { f: '#ff9ec1', l: '#e0628f', twin: '#c7a8ff' }, { f: '#fff', l: '#ff7fa3', ring: 1 }, { f: '#ffb48a', l: '#e07a45', spark: 1 }, { f: 'rainbow', l: '#c77fa0' },
            { f: '#ff8fab', l: '#d2577a', balloon: 1 }, { f: '#ffe0ec', l: '#ff8fab', wing: 1 }, { f: '#c7a8ff', l: '#8a63d9', bow: '#ff9ec1' }, { f: '#a8e3a0', l: '#5aa863', check: '#fff' },
        ];
        function spkHeart(i) {
            const h = SPK_HEARTS[i], c = spkMk(160, 160), x = c.getContext('2d'), cx = 80, cy = 82, s = h.twin ? 44 : 54;
            const body = (bx, by, bs, fill, line, rot) => {
                x.save(); x.translate(bx, by); x.rotate(rot || 0); x.translate(-bx, -by);
                x.save(); spkHeartPath(x, bx, by, bs); x.lineWidth = 22; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.stroke(); x.restore();
                spkHeartPath(x, bx, by, bs); x.lineWidth = 22; x.strokeStyle = '#fff'; x.stroke();
                if (fill === 'rainbow') { const g = x.createLinearGradient(bx - bs, by - bs, bx + bs, by + bs); ['#ff9ec1', '#ffd36b', '#a8e3a0', '#9fd3ff', '#c7a8ff'].forEach((q, k) => g.addColorStop(k / 4, q)); x.fillStyle = g; } else x.fillStyle = fill;
                x.fill(); x.save(); x.clip();
                if (h.dots && !rot) { x.fillStyle = h.dots; for (let yy = by - bs; yy < by + bs; yy += 16) for (let xx = bx - bs + ((yy / 16) % 2) * 8; xx < bx + bs; xx += 16) { x.beginPath(); x.arc(xx, yy, 3.6, 0, 7); x.fill(); } }
                if (h.stripe) { x.strokeStyle = h.stripe; x.lineWidth = 6; for (let k = -bs * 2; k < bs * 2; k += 15) { x.beginPath(); x.moveTo(bx + k, by - bs); x.lineTo(bx + k + bs, by + bs); x.stroke(); } }
                if (h.check) { x.fillStyle = h.check; x.globalAlpha = .55; for (let yy = -4; yy < 8; yy++) for (let xx = -4; xx < 8; xx++) if ((xx + yy) % 2 === 0) x.fillRect(bx - bs + xx * 14, by - bs + yy * 14, 14, 14); x.globalAlpha = 1; }
                x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(bx - bs * .45, by - bs * .38, bs * .2, bs * .11, -.6, 0, 7); x.fill();
                x.restore();
                spkHeartPath(x, bx, by, bs); x.lineWidth = h.ring ? 7 : 5; x.strokeStyle = line; x.stroke();
                x.restore();
            };
            if (h.wing) {                                                             // 날개
                for (const d of [-1, 1]) { x.save(); x.translate(cx + d * 50, cy - 10); x.scale(d, 1); x.beginPath(); x.moveTo(-6, 8); x.bezierCurveTo(10, -26, 34, -24, 30, -6); x.bezierCurveTo(40, -2, 30, 16, 14, 12); x.bezierCurveTo(16, 22, 0, 24, -6, 8); x.closePath();
                    x.lineWidth = 16; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.stroke(); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 3.5; x.strokeStyle = '#9fc4e8'; x.stroke(); x.restore(); }
            }
            if (h.balloon) { x.save(); x.lineWidth = 9; x.strokeStyle = '#fff'; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, cy + 40); x.bezierCurveTo(cx - 12, cy + 56, cx + 12, cy + 64, cx - 2, cy + 74); x.stroke(); x.lineWidth = 2.5; x.strokeStyle = h.l; x.stroke(); x.restore(); }
            if (h.twin) body(cx + 22, cy - 14, 36, h.twin, '#8a63d9', .25);
            body(h.twin ? cx - 12 : cx, h.twin ? cy + 10 : h.balloon ? cy - 10 : cy, h.balloon ? 46 : s, h.f, h.l, h.twin ? -.15 : 0);
            if (h.face) {                                                             // 웃는 얼굴
                x.fillStyle = '#5a3d4a'; for (const d of [-1, 1]) { x.beginPath(); x.arc(cx + d * 17, cy - 4, 5, 0, 7); x.fill(); }
                x.fillStyle = '#fff'; for (const d of [-1, 1]) { x.beginPath(); x.arc(cx + d * 17 + 1.6, cy - 6, 1.7, 0, 7); x.fill(); }
                x.fillStyle = 'rgba(255,111,145,.5)'; for (const d of [-1, 1]) { x.beginPath(); x.ellipse(cx + d * 28, cy + 8, 7, 4.5, 0, 0, 7); x.fill(); }
                x.strokeStyle = '#5a3d4a'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy + 4, 6, .3, Math.PI - .3); x.stroke();
            }
            if (h.spark) { spkStar(x, cx + 46, cy - 40, 13, '#fff'); spkStar(x, cx + 46, cy - 40, 9, '#ffd36b'); spkStar(x, cx - 50, cy + 26, 9, '#fff'); spkStar(x, cx - 50, cy + 26, 6, '#ffd36b'); }
            if (h.bow) {                                                              // 리본
                x.save(); x.translate(cx + 26, cy - 34); x.rotate(.3);
                for (const d of [-1, 1]) { x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(d * 22, -16, d * 26, 14, 0, 0); x.closePath(); x.lineWidth = 10; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.stroke(); x.fillStyle = h.bow; x.fill(); x.lineWidth = 2.5; x.strokeStyle = '#e0628f'; x.stroke(); }
                x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fillStyle = '#e0628f'; x.fill(); x.restore();
            }
            return spkTrim(c);
        }
        /* ---------- 🎵 ✅ 🌤 ✨ 젤리 모양 : 100 × 100 칸에 그린 모양 → 하얀 테두리 → 진한 테두리 → 파스텔 → 윗부분 반짝 ----------
           ['e', cx, cy, rx, ry, 기울기] 채운 타원 · ['o', cx, cy, rx, ry, 기울기, 굵기] 고리 · ['l', x1, y1, x2, y2, 굵기] 선
           ['p', 'SVG 길'] 채운 모양 · ['s', 'SVG 길', 굵기] 선 모양 · ['t', 글, 크기, 'in'] 글자 ('in' = 모양 안 글씨)
           맨 끝에 색 번호(SPK_COLORS)나 [바탕, 선] 을 붙이면 그 칸만 그 색 · 없으면 스티커 색 */
        const spkRR = (x, y, w, h, r) => `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
        const SPK_HEARTP = 'M50 88 C32 74 12 62 12 40 C12 26 22 18 33 18 C41 18 47 23 50 30 C53 23 59 18 67 18 C78 18 88 26 88 40 C88 62 68 74 50 88Z';
        const SPK_STARP = (cx, cy, r) => { let d = ''; for (let i = 0; i < 10; i++) { const q = i % 2 ? r * .46 : r, a = -Math.PI / 2 + i * Math.PI / 5; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * q).toFixed(1) + ' ' + (cy + Math.sin(a) * q).toFixed(1); } return d + 'Z'; };
        const SPK_SPARK = (cx, cy, r) => `M${cx} ${cy - r} C${cx + r * .1} ${cy - r * .2} ${cx + r * .2} ${cy - r * .1} ${cx + r} ${cy} C${cx + r * .2} ${cy + r * .1} ${cx + r * .1} ${cy + r * .2} ${cx} ${cy + r} C${cx - r * .1} ${cy + r * .2} ${cx - r * .2} ${cy + r * .1} ${cx - r} ${cy} C${cx - r * .2} ${cy - r * .1} ${cx - r * .1} ${cy - r * .2} ${cx} ${cy - r}Z`;
        const SPK_CLOUD = (x, y, k) => `M${x} ${y + 20 * k} C${x - 16 * k} ${y + 20 * k} ${x - 16 * k} ${y} ${x} ${y} C${x} ${y - 16 * k} ${x + 20 * k} ${y - 22 * k} ${x + 28 * k} ${y - 10 * k} C${x + 34 * k} ${y - 20 * k} ${x + 54 * k} ${y - 16 * k} ${x + 52 * k} ${y} C${x + 66 * k} ${y} ${x + 66 * k} ${y + 20 * k} ${x + 52 * k} ${y + 20 * k}Z`;
        const SPK_Q = (cx, cy) => [['e', cx, cy, 15, 11, -.35], ['l', cx + 13, cy - 4, cx + 13, cy - 64, 8]];   // ♩ 머리 + 기둥
        const SPK_FLAG = (x, y) => ['p', `M${x - 4} ${y} C${x + 2} ${y + 14} ${x + 22} ${y + 18} ${x + 20} ${y + 38} C${x + 18} ${y + 28} ${x + 10} ${y + 22} ${x - 4} ${y + 20}Z`];
        const SPK_NOTES = [
            { c: 0, ops: [...SPK_Q(38, 80), SPK_FLAG(55, 16)] },                                                    // ♪
            { c: 4, ops: [...SPK_Q(26, 82), ...SPK_Q(66, 74), ['p', 'M35 14 L83 6 L83 20 L35 28Z']] },                 // ♫
            { c: 6, ops: SPK_Q(40, 80) },                                                                           // ♩
            { c: 2, ops: [...SPK_Q(26, 82), ...SPK_Q(66, 74), ['p', 'M35 14 L83 6 L83 18 L35 26Z'], ['p', 'M35 32 L83 24 L83 34 L35 42Z']] },   // ♬
            { c: 5, ops: [['o', 38, 80, 14, 10, -.35, 7], ['l', 51, 76, 51, 16, 8]] },                               // 2분음표
            { c: 1, ops: [['o', 50, 52, 24, 16, -.3, 10]] },                                                         // 온음표
            { c: 3, ops: [...SPK_Q(38, 80), SPK_FLAG(55, 16), SPK_FLAG(55, 32)] },                                  // 16분음표
            { c: 0, ops: [['p', 'M36 92 C26 84 16 78 16 66 C16 58 22 54 28 54 C32 54 35 57 36 60 C37 57 40 54 44 54 C50 54 56 58 56 66 C56 78 46 84 36 92Z'], ['l', 53, 66, 53, 12, 8], SPK_FLAG(57, 12)] },   // 하트 음표
            { c: 1, ops: [['p', SPK_STARP(34, 76, 20)], ['l', 50, 70, 50, 12, 8], SPK_FLAG(54, 12)] },             // 별 음표
            { c: 4, ops: [['p', 'M24 90 C16 84 8 79 8 70 C8 64 13 61 17 61 C20 61 23 63 24 66 C25 63 28 61 31 61 C35 61 40 64 40 70 C40 79 32 84 24 90Z'], ['p', 'M66 82 C58 76 50 71 50 62 C50 56 55 53 59 53 C62 53 65 55 66 58 C67 55 70 53 73 53 C77 53 82 56 82 62 C82 71 74 76 66 82Z'], ['l', 38, 66, 38, 18, 7], ['l', 80, 58, 80, 10, 7], ['p', 'M34 14 L84 4 L84 18 L34 28Z']] },   // 하트 둘
            { c: 0, ops: [['s', 'M50 94 C36 96 32 82 44 79 M48 90 C62 88 60 74 55 68 L48 6 C70 10 66 30 50 42 C30 54 24 70 44 78 C62 86 76 64 60 56 C48 50 38 62 48 68', 11]] },   // 높은음자리표
            { c: 2, ops: [['l', 40, 14, 36, 88, 7], ['l', 63, 10, 59, 84, 7], ['l', 22, 40, 80, 30, 10], ['l', 20, 66, 78, 56, 10]] },   // ♯
            { c: 5, ops: [['l', 36, 10, 36, 88, 8], ['s', 'M36 86 C62 72 68 56 54 50 C46 46 38 52 36 60', 9]] },    // ♭
            { c: 1, ops: [['l', 36, 12, 36, 72, 8], ['l', 64, 30, 64, 90, 8], ['l', 36, 44, 64, 38, 10], ['l', 36, 72, 64, 66, 10]] },   // ♮
            { c: 4, ops: [['s', 'M42 10 L60 30 L44 48 L62 66 C48 60 38 70 52 90', 10]] },                            // 쉼표
            { c: 6, ops: [...SPK_Q(36, 82), SPK_FLAG(53, 18), ['p', SPK_SPARK(78, 58, 14), 1], ['p', SPK_SPARK(20, 30, 9), 0]] },   // 반짝 음표
        ];
        const SPK_MARKS = [
            { c: 3, ops: [['s', 'M20 52 L42 74 L82 26', 15]] },                                                       // ✔
            { c: 2, ops: [['s', spkRR(18, 18, 64, 64, 14), 9]] },                                                   // ☐
            { c: 0, ops: [['s', spkRR(18, 18, 64, 64, 14), 9], ['s', 'M30 50 L46 66 L76 30', 11, 3]] },              // ☑
            { c: 0, ops: [['l', 24, 24, 76, 76, 15], ['l', 76, 24, 24, 76, 15]] },                                  // ✕
            { c: 5, ops: [['l', 14, 50, 78, 50, 12], ['s', 'M56 28 L82 50 L56 72', 12]] },                          // →
            { c: 4, ops: [['s', 'M16 74 C26 34 64 24 80 42', 11], ['s', 'M66 26 L82 44 L60 52', 11]] },            // ↪
            { c: 2, ops: [['l', 50, 86, 50, 22, 12], ['s', 'M28 44 L50 18 L72 44', 12]] },                          // ↑
            { c: 1, ops: [['l', 50, 14, 50, 60, 15], ['e', 50, 82, 9, 9, 0]] },                                     // !
            { c: 6, ops: [['s', 'M30 34 C30 10 72 8 70 34 C68 50 50 50 50 64', 13], ['e', 50, 84, 9, 9, 0]] },     // ?
            ...[1, 2, 3, 4, 5].map((n, k) => ({ c: [0, 1, 2, 3, 4][k], ops: [['e', 50, 50, 38, 38, 0], ['t', String(n), 52, 'in']] })),   // ① ~ ⑤
            { c: 3, ops: [['l', 50, 18, 50, 82, 15], ['l', 18, 50, 82, 50, 15]] },                                  // +
            { c: 0, ops: [['p', spkRR(4, 30, 92, 40, 20)], ['t', 'NEW', 28, 'in']] },                                // NEW
        ];
        const SPK_SKY = [
            { c: 1, ops: [...[0, 1, 2, 3, 4, 5, 6, 7].map(k => { const a = k * Math.PI / 4; return ['l', 50 + Math.cos(a) * 34, 50 + Math.sin(a) * 34, 50 + Math.cos(a) * 44, 50 + Math.sin(a) * 44, 8]; }), ['e', 50, 50, 24, 24, 0]] },   // 해
            { c: 2, ops: [['p', SPK_CLOUD(26, 44, 1), ['#ffffff', '#8fb8e0']]] },                                   // 구름
            { c: 2, ops: [['p', SPK_CLOUD(26, 34, 1), ['#ffffff', '#8fb8e0']], ['l', 34, 70, 30, 82, 7], ['l', 52, 70, 48, 86, 7], ['l', 70, 70, 66, 82, 7]] },   // 비
            { c: 2, ops: [0, 1, 2].map(k => { const a = k * Math.PI / 3; return ['l', 50 + Math.cos(a) * 40, 50 + Math.sin(a) * 40, 50 - Math.cos(a) * 40, 50 - Math.sin(a) * 40, 8]; }).concat([['e', 50, 50, 9, 9, 0]]) },   // 눈
            { c: 0, ops: [['s', 'M12 76 C12 30 88 30 88 76', 10, 0], ['s', 'M24 76 C24 44 76 44 76 76', 10, 1], ['s', 'M36 76 C36 58 64 58 64 76', 10, 3]] },   // 무지개
            { c: 1, ops: [['p', 'M58 6 L24 54 L46 54 L36 94 L76 40 L54 40 L66 6Z']] },                               // 번개
            { c: 4, ops: [['p', 'M60 12 C36 18 26 44 36 64 C44 80 66 88 84 78 C60 78 44 60 46 40 C48 26 54 18 60 12Z'], ['p', SPK_SPARK(76, 30, 10), 1]] },   // 달
            { c: 0, ops: [['p', 'M10 52 C14 26 34 14 50 14 C66 14 86 26 90 52 C82 46 74 46 70 52 C64 46 56 46 50 52 C44 46 36 46 30 52 C26 46 18 46 10 52Z'], ['s', 'M50 52 L50 84 C50 92 38 92 38 84', 7, ['#c9a27e', '#8a6644']]] },   // 우산
            { c: 1, ops: [['e', 38, 40, 20, 20, 0], ['p', SPK_CLOUD(36, 56, .9), ['#ffffff', '#8fb8e0']]] },        // 구름 조금
            { c: 6, ops: [['s', 'M10 40 H62 C76 40 76 22 64 22', 9], ['s', 'M10 60 H74 C88 60 88 80 74 80', 9], ['s', 'M18 50 H50', 9]] },   // 바람
        ];
        const SPK_TWINKLE = [
            { c: 1, ops: [['p', SPK_SPARK(50, 50, 44)]] }, { c: 0, ops: [['p', SPK_SPARK(50, 50, 44)]] },
            { c: 4, ops: [['p', SPK_SPARK(50, 50, 44)]] }, { c: 6, ops: [['p', SPK_SPARK(50, 50, 44)]] },
            { c: 0, ops: [['p', 'M30 26 H70 L88 46 L50 90 L12 46Z'], ['s', 'M12 46 H88 M30 26 L40 46 L50 90 L60 46 L70 26 M40 46 L50 26 L60 46', 2.5, 'in']] },   // 보석
            { c: 2, ops: [['p', 'M30 26 H70 L88 46 L50 90 L12 46Z'], ['s', 'M12 46 H88 M30 26 L40 46 L50 90 L60 46 L70 26 M40 46 L50 26 L60 46', 2.5, 'in']] },
            { c: 1, ops: [['p', 'M14 76 L10 30 L32 50 L50 20 L68 50 L90 30 L86 76Z'], ['e', 50, 20, 6, 6, 0, 0], ['e', 10, 30, 5, 5, 0, 4], ['e', 90, 30, 5, 5, 0, 4]] },   // 왕관
            { c: 0, ops: [['e', 50, 50, 34, 34, 0, ['#fff4f8', '#d9a3b8']]] },                                     // 진주
            { c: 0, ops: [['p', 'M50 50 C34 30 10 28 12 46 C14 62 34 60 50 50 C66 60 86 62 88 46 C90 28 66 30 50 50Z'], ['s', 'M46 54 L34 84 M54 54 L66 84', 9], ['e', 50, 50, 9, 8, 0]] },   // 리본
            { c: 1, ops: [['p', SPK_SPARK(40, 54, 34)], ['p', SPK_SPARK(78, 22, 16), 0], ['p', SPK_SPARK(80, 76, 11), 4]] },   // 반짝 셋
            { c: 4, ops: [['l', 26, 90, 54, 46, 7, ['#ffffff', '#b79bf2']], ['p', SPK_STARP(62, 34, 28), 1]] },   // 요술봉
            { c: 3, ops: [['p', SPK_HEARTP], ['p', SPK_SPARK(80, 22, 13), 1]] },                                          // 반짝 하트
        ];
        const spkCol = (v, base) => v == null ? base : Array.isArray(v) ? v : SPK_COLORS[v % SPK_COLORS.length];
        function spkShape(it, i) {
            const c = spkMk(170, 170), x = c.getContext('2d'), K = 1.25, base = SPK_COLORS[(it.c != null ? it.c : i) % SPK_COLORS.length];
            const toPath = op => {
                const t = op[0], p = new Path2D();
                if (t === 'e') p.ellipse(op[1], op[2], op[3], op[4], op[5] || 0, 0, Math.PI * 2);
                else if (t === 'o') p.ellipse(op[1], op[2], op[3], op[4], op[5] || 0, 0, Math.PI * 2);
                else if (t === 'l') { p.moveTo(op[1], op[2]); p.lineTo(op[3], op[4]); }
                else if (t === 'p' || t === 's') p.addPath(new Path2D(op[1]));
                return p;
            };
            const W = op => op[0] === 'o' ? op[6] : op[0] === 'l' ? op[5] : op[0] === 's' ? op[2] : 0;   // 선 굵기 (0 = 채운 모양)
            const CI = { p: 2, s: 3, l: 6, e: 6, o: 7, t: 3 };                     // 색 번호 · 'in' 자리
            const colOf = op => { const v = op[CI[op[0]]]; return typeof v === 'number' || Array.isArray(v) ? spkCol(v, base) : base; };
            const inner = op => op[CI[op[0]]] === 'in';
            const ops = it.ops.map(op => ({ op, path: op[0] === 't' ? null : toPath(op), w: W(op), col: colOf(op), in: inner(op) }));
            x.translate(85 - 50 * K, 85 - 50 * K); x.scale(K, K); x.lineJoin = 'round'; x.lineCap = 'round';
            const text = (o, f) => { x.font = `700 ${o.op[2]}px ${SPK_FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; f(o.op[1], 50, 52); };
            for (const o of ops) {                                                   // 1) 하얀 다이컷 테두리
                if (o.in) continue; x.strokeStyle = '#fff'; x.fillStyle = '#fff';
                if (!o.path) { x.lineWidth = 20; text(o, (s, a, b) => x.strokeText(s, a, b)); continue; }
                x.lineWidth = (o.w || 0) + 20; x.stroke(o.path); if (!o.w) x.fill(o.path);
            }
            for (const o of ops) {                                                   // 2) 진한 테두리
                if (o.in || !o.path) continue; x.strokeStyle = o.col[1]; x.lineWidth = (o.w || 0) + 6; x.stroke(o.path); if (!o.w) { x.fillStyle = o.col[1]; x.fill(o.path); }
            }
            for (const o of ops) {                                                   // 3) 파스텔
                if (o.in) continue;
                if (!o.path) { x.fillStyle = o.col[0]; text(o, (s, a, b) => x.fillText(s, a, b)); continue; }
                if (o.w) { x.strokeStyle = o.col[0]; x.lineWidth = o.w; x.stroke(o.path); } else { x.fillStyle = o.col[0]; x.fill(o.path); }
            }
            const g = spkMk(170, 170), gx = g.getContext('2d');                       // 4) 반짝 : 모양 안에서만
            gx.setTransform(x.getTransform()); gx.lineJoin = gx.lineCap = 'round'; gx.fillStyle = gx.strokeStyle = '#000';
            ops.forEach(o => { if (o.in || !o.path) return; if (o.w) { gx.lineWidth = o.w; gx.stroke(o.path); } else gx.fill(o.path); });
            gx.setTransform(1, 0, 0, 1, 0, 0); gx.globalCompositeOperation = 'source-in'; gx.fillStyle = 'rgba(255,255,255,.55)'; gx.beginPath(); gx.ellipse(66, 52, 34, 16, -.45, 0, 7); gx.fill();
            x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(g, 0, 0); x.restore();
            for (const o of ops) {                                                   // 5) 모양 안 글씨 · 무늬
                if (!o.in) continue;
                if (!o.path) { x.fillStyle = base[1]; text(o, (s, a, b) => x.fillText(s, a, b)); continue; }
                x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = o.w || 2; x.stroke(o.path);
            }
            return spkTrim(c);
        }
        /* 💬 한마디 : 둥근 이름표 + 글씨 */
        function spkWord(w, i) {
            const c = spkMk(190, 120), x = c.getContext('2d'), [fill, line] = SPK_COLORS[i % SPK_COLORS.length], n = [...w].length;
            const fs = n <= 2 ? 44 : n === 3 ? 38 : 31;
            x.font = `700 ${fs}px ${SPK_FONT}`; const tw = Math.min(150, x.measureText(w).width), bw = tw + 36, bh = fs + 26, bx = 95 - bw / 2, by = 60 - bh / 2;
            x.translate(95, 60); x.rotate([-.05, .04, -.02, .06][i % 4]); x.translate(-95, -60);
            const P = new Path2D(spkRR(bx, by, bw, bh, bh / 2));
            x.lineJoin = 'round'; x.lineWidth = 20; x.strokeStyle = '#fff'; x.stroke(P); x.fillStyle = '#fff'; x.fill(P);
            x.lineWidth = 6; x.strokeStyle = line; x.stroke(P); x.fillStyle = fill; x.fill(P);
            x.save(); x.clip(P); x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(bx + bw * .3, by + bh * .28, bw * .26, bh * .16, -.15, 0, 7); x.fill(); x.restore();
            x.font = `700 ${fs}px ${SPK_FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
            x.lineWidth = 6; x.strokeStyle = '#fff'; x.strokeText(w, 95, 62, 150); x.fillStyle = line; x.fillText(w, 95, 62, 150);
            return spkTrim(c);
        }
        async function spkSrcs(pack) {
            if (spkS.cache[pack.id]) return spkS.cache[pack.id];
            if (pack.load) return (spkS.cache[pack.id] = await pack.load());   // 🖼️ 개발자 그림 포인트스티커 (js/stk-basic.js sbPack)
            if (document.fonts && document.fonts.load) await Promise.race([document.fonts.load(`700 100px ${SPK_FONT}`), new Promise(r => setTimeout(r, 1500))]).catch(() => {});
            const items = typeof pack.items === 'function' ? pack.items() : pack.items;
            return (spkS.cache[pack.id] = items.map((it, i) => (pack.draw || spkGlyph)(it, i)));
        }

        /* ---------- 🍭 포인트스티커 창 : 위쪽 '🍭 포인트스티커 · 😀 이모지' 두 칸 (js/stickermaker.js openStickerList) ---------- */
        function spkTabs() {
            const bar = spkq('stickerKindTabs'); if (!bar) return;
            bar.innerHTML = [['pack', '🍭 포인트스티커'], ['emoji', '😀 이모지']].map(([v, n]) => `<button type="button" class="stk-tab" data-tab="${v}" onclick="spkTab('${v}')">${n}</button>`).join('');
            bar.classList.add('two'); bar.hidden = false;
        }
        async function spkTab(tab) {
            document.querySelectorAll('#stickerKindTabs .stk-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
            const g = spkq('stickerGrid'); g.scrollTop = 0;
            if (tab === 'emoji') { const b = document.querySelector('#stickerCategories .em-cat'); if (b) b.click(); return; }
            g.innerHTML = '<div class="smk-empty">불러오는 중…</div>';
            const cards = [];
            for (const p of SPK_PACKS) { const s = await spkSrcs(p); cards.push(`<button type="button" class="spk-card" data-sbc="${p.g}" onclick="openStickerPack('${p.id}')">${window.sbThumbs ? sbThumbs(s) : ''}<small>스티커 ${s.length}개</small></button>`); }   // 이름 없이 · 카테고리 칸 (js/stk-basic.js)
            if (document.querySelector('#stickerKindTabs .stk-tab.on[data-tab="pack"]')) g.innerHTML = `<div class="spk-cards">${window.stkBasicSrv ? stkBasicSrv('mini') : ''}${cards.join('')}</div>`;   // 🖼️ 개발자 그림 시트가 맨 앞 (js/stk-basic.js)
        }

        /* ---------- 하얀 판 ---------- */
        function spkBuild() {
            if (spkq('spkRoom')) return;
            const el = document.createElement('div');
            el.id = 'spkRoom'; el.className = 'spk-room';
            el.innerHTML = `<div class="spk-board" id="spkBoard"><div class="spk-tape" id="spkTape">✋ 잡고 옮겨요</div><button type="button" class="pm-x spk-x" onclick="closeStickerPack()" aria-label="닫기">✕</button>
                <div class="spk-grid" id="spkGrid"></div></div>`;
            document.body.appendChild(el);
            spkq('spkTape').addEventListener('pointerdown', e => {
                e.preventDefault(); spkPutBack(); try { e.target.setPointerCapture(e.pointerId); } catch (er) {}
                const b = spkq('spkBoard').getBoundingClientRect(); spkS.drag = { dx: e.clientX - b.left, dy: e.clientY - b.top };
            });
            spkq('spkTape').addEventListener('pointermove', e => { if (spkS.drag) spkPlace(e.clientX - spkS.drag.dx, e.clientY - spkS.drag.dy); });
            const end = () => { spkS.drag = null; }; spkq('spkTape').addEventListener('pointerup', end); spkq('spkTape').addEventListener('pointercancel', end);
            const g = spkq('spkGrid');
            g.addEventListener('pointerdown', spkDown); g.addEventListener('pointermove', spkGridMove);
            g.addEventListener('pointerup', spkGridUp); g.addEventListener('pointercancel', spkGridUp);
            spkq('spkBoard').addEventListener('pointerdown', e => { if (!e.target.closest('.spk-it, .spk-tape, .spk-x')) spkPutBack(); });
            window.addEventListener('resize', () => { const b = spkq('spkBoard'); if (spkq('spkRoom').classList.contains('show')) { const r = b.getBoundingClientRect(); spkPlace(r.left, r.top); } });
        }
        /* 판 자리 : 화면 안으로 */
        function spkPlace(x, y) {
            const b = spkq('spkBoard'), W = window.innerWidth, H = window.innerHeight;
            x = Math.max(6, Math.min(W - b.offsetWidth - 6, x)); y = Math.max(64, Math.min(H - b.offsetHeight - 6, y));
            b.style.left = x + 'px'; b.style.top = y + 'px'; spkS.mv = [x, y];
        }
        async function openStickerPack(id) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            const p = SPK_PACKS.find(q => q.id === id) || (window.sbPack && sbPack(id)); if (!p) return;
            if (window.stkLeave) stkLeave();
            spkBuild(); spkPutBack(); spkS.pack = p;
            let srcs;
            try { srcs = await spkSrcs(p); } catch (e) { showMsg('⚠ 포인트스티커를 불러오지 못했어요.<br><span style="font-size:12px;color:#777;">인터넷 연결을 확인해 주세요.</span>'); if (window.stkReturn) stkReturn(); return; }
            spkq('spkGrid').innerHTML = srcs.map((u, i) => `<span class="spk-it" data-i="${i}"><img src="${u}" alt="" draggable="false"></span>`).join('');
            spkq('spkRoom').classList.add('show');
            const b = spkq('spkBoard'), W = window.innerWidth, H = window.innerHeight, pg = spkq('diaryBook') || spkq('diaryWrapper'), r = pg.getBoundingClientRect();
            /* 페이지 옆에 자리가 있으면 오른쪽 옆 · 없으면 아래쪽 가운데 (하단메뉴 바로 위) */
            const nav = document.querySelector('.tb-sticker'), nt = nav ? nav.parentElement.getBoundingClientRect().top : H;
            if (W - r.right >= b.offsetWidth + 12) spkPlace(r.right + 8, Math.max(80, r.top + 40));
            else spkPlace((W - b.offsetWidth) / 2, nt - b.offsetHeight - 10);
        }
        function closeStickerPack() { spkPutBack(); const r = spkq('spkRoom'); if (r) r.classList.remove('show'); if (window.stkReturn) stkReturn(); }   // ✨ 스티커 창에서 왔으면 다시 떠요

        /* ---------- 누르면 🏷️ 씰스티커처럼 떼어져서(js/peelfx.js) 떠오르기 · 끌기 → 붙이기 ---------- */
        /* 누른 채 끌면 🏷️ 씰스티커처럼 손가락을 따라 가장자리부터 떼어져요 (js/peelfx.js pfxSeal) · 톡 누르면 저절로 떼어져 떠올라요 */
        function spkDown(e) {
            const it = e.target.closest('.spk-it'); if (!it) return;
            e.preventDefault(); spkPutBack();
            spkS.press = { it, x: e.clientX, y: e.clientY, seal: null };
            try { spkq('spkGrid').setPointerCapture(e.pointerId); } catch (er) {}
        }
        function spkGridMove(e) {
            const p = spkS.press; if (!p) return;
            if (p.seal) { p.seal.move(e.clientX, e.clientY); return; }
            if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5 || !window.pfxSeal) return;
            const img = p.it.querySelector('img'), r = img.getBoundingClientRect(), it = p.it;
            it.classList.add('out');
            p.seal = pfxSeal({ src: img, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height, rot: 0, x: p.x, y: p.y,
                onDetach: () => spkAway(true),
                onCancel: () => { it.classList.remove('out'); spkAway(false); },
                onDrop: (cx, cy, rot) => {                                                  // 페이지 위면 붙이고 · 판 위나 바깥이면 제자리로
                    const pg = spkq('canvasArea'), pr = pg && pg.getBoundingClientRect(), b = spkq('spkBoard').getBoundingClientRect();
                    const onBoard = cx > b.left && cx < b.right && cy > b.top && cy < b.bottom;
                    const onB = onBoard && !spkq('spkBoard').classList.contains('away');   // 📱 비켜 준 판 자리는 페이지예요
                    if (pr && !onB && cx > pr.left && cx < pr.right && cy > pr.top && cy < pr.bottom) spkStick({ it, src: img.src, w: r.width, h: r.height, cx, cy, rot });
                    else { it.classList.remove('out'); spkAway(false); }
                } });
            p.seal.move(e.clientX, e.clientY);
        }
        function spkGridUp(e) {
            const p = spkS.press; if (!p) return; spkS.press = null;
            if (p.seal) { p.seal.up(); return; }
            spkLift(p.it, p.x, p.y, e.pointerId);
        }
        /* 톡 : 저절로 떼어져서 떠 있어요 (다시 끌거나 다른 곳을 누르면 제자리) */
        function spkLift(it, ex, ey, pid) {
            const e = { clientX: ex, clientY: ey, pointerId: pid };
            const img = it.querySelector('img'), r = img.getBoundingClientRect();
            const f = img.cloneNode(); f.className = 'spk-fly'; f.style.width = r.width + 'px'; f.style.height = r.height + 'px';
            f.style.transform = `translate(${r.left}px, ${r.top}px)`; f.classList.add('flat'); document.body.appendChild(f); void f.offsetWidth; it.classList.add('out');
            const L = spkS.lift = { f, it, src: img.src, w: r.width, h: r.height, home: [r.left + r.width / 2, r.top + r.height / 2], off: [e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)], moved: false, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY], s: 1, rot: 0 };
            L.cx = L.home[0]; L.cy = L.home[1];
            const up = () => {                                                        // 다 떼어지면 커지며 떠올라 손가락 자리로
                L.peel = null; if (spkS.lift !== L) return;
                f.classList.remove('flat', 'drag');
                const [x, y] = L.moved ? [L.last[0] - L.off[0], L.last[1] - L.off[1]] : L.home;
                spkFly(x, y, 1.3, (Math.random() - .5) * .2);
                if (L.upLater) setTimeout(() => { if (spkS.lift === L) spkDrop(L); }, 170);
            };
            if (window.pfxPeel) { L.peel = true; const stop = pfxPeel(f, e.clientX, e.clientY, .35, -1, 0, up); if (L.peel) L.peel = stop; } else up();
            f.addEventListener('pointermove', spkMove); f.addEventListener('pointerup', spkUp); f.addEventListener('pointercancel', spkUp);
            f.addEventListener('pointerdown', ev => { ev.preventDefault(); const q = spkS.lift; if (!q) return; q.off = [ev.clientX - q.cx, ev.clientY - q.cy]; q.start = [ev.clientX, ev.clientY]; q.moved = false; q.down = true; try { f.setPointerCapture(ev.pointerId); } catch (er) {} });
            L.down = false;
            if (navigator.vibrate) try { navigator.vibrate(6); } catch (er) {}
        }
        function spkFly(cx, cy, s, rot) {
            const L = spkS.lift; if (!L) return;
            L.cx = cx; L.cy = cy; if (s != null) L.s = s; if (rot != null) L.rot = rot;
            L.f.style.transform = `translate(${cx - L.w / 2}px, ${cy - L.h / 2}px) scale(${L.s}) rotate(${L.rot}rad)`;
        }
        function spkMove(e) {
            const L = spkS.lift; if (!L || !L.down) return;
            if (!L.moved && Math.hypot(e.clientX - L.start[0], e.clientY - L.start[1]) < 5) return;
            L.moved = true; L.last = [e.clientX, e.clientY]; spkAway(true);
            if (L.peel) return;                                                       // 떼어지는 동안은 제자리
            L.f.classList.add('drag'); spkFly(e.clientX - L.off[0], e.clientY - L.off[1]);
        }
        function spkUp() {
            const L = spkS.lift; if (!L || !L.down) return;
            L.down = false; L.f.classList.remove('drag');
            if (!L.moved) return;                                                     // 톡 : 떠 있는 채로 (다시 끌거나 다른 곳을 누르면 제자리)
            if (L.peel) { L.upLater = true; return; }                                 // 아직 떼어지는 중 → 다 떼어진 뒤 놓기
            spkDrop(L);
        }
        function spkDrop(L) {
            const pg = spkq('canvasArea'), r = pg && pg.getBoundingClientRect(), b = spkq('spkBoard').getBoundingClientRect();
            const onBoard = L.cx > b.left && L.cx < b.right && L.cy > b.top && L.cy < b.bottom && !spkq('spkBoard').classList.contains('away');
            if (r && !onBoard && L.cx > r.left && L.cx < r.right && L.cy > r.top && L.cy < r.bottom) spkStick(L); else spkPutBack();
        }
        /* 제자리로 */
        /* 📱 폰 (화면 폭 700 미만) : 판이 페이지를 가려서, 뗀 스티커를 붙일 동안 판이 비켜 줘요 · 💻 PC · 아이패드는 그대로 (도련 · 2026-10-10) */
        function spkAway(on) { const b = spkq('spkBoard'); if (b) b.classList.toggle('away', !!on && innerWidth < 700); }
        function spkPutBack() {
            spkAway(false);
            const L = spkS.lift; if (!L) return; spkS.lift = null;
            if (typeof L.peel === 'function') L.peel(); L.peel = null;
            L.f.classList.remove('flat'); L.f.classList.add('back'); L.s = 1; L.rot = 0; L.f.style.transform = `translate(${L.home[0] - L.w / 2}px, ${L.home[1] - L.h / 2}px) scale(1)`;
            setTimeout(() => { L.f.remove(); L.it.classList.remove('out'); }, 200);
        }
        /* 붙이기 : 작아지며 꾹 → 페이지 스티커가 돼요 (빨간 점선으로 골라 둬요) */
        function spkStick(L) {
            spkS.lift = null; setTimeout(() => spkAway(false), 200);
            if (L.f) { L.f.classList.add('back'); L.f.style.transform = `translate(${L.cx - L.w / 2}px, ${L.cy - L.h / 2}px) scale(1) rotate(${L.rot}rad)`; }
            setTimeout(() => {
                if (L.f) L.f.remove(); L.it.classList.remove('out');
                if (!addImage(L.src)) return;
                const pg = spkq('canvasArea'), r = pg.getBoundingClientRect(), k = r.width / (pg.offsetWidth || r.width) || 1, el = pg.querySelector('.element-box:last-child');
                if (el) {
                    const w = L.w / k, h = L.h / k, PADB = 14, deg = Math.round(L.rot * 180 / Math.PI * 10) / 10;
                    const put = (px, py) => { el.dataset.posX = px; el.dataset.posY = py; el.style.transform = `translate(${px}px, ${py}px) scale(1) rotate(${deg}deg)`; };
                    el.style.width = w + 'px'; el.style.height = h + 'px'; el.dataset.rotation = deg;
                    const x = Math.round((L.cx - r.left) / k - (w + PADB) / 2), y = Math.round((L.cy - r.top) / k - (h + PADB) / 2);
                    put(x, y); const bb = el.getBoundingClientRect();
                    put(Math.round(x + (L.cx - (bb.left + bb.width / 2)) / k), Math.round(y + (L.cy - (bb.top + bb.height / 2)) / k));
                    if (window.elOrig) elOrig(el);                                   // 🖼️ 판에서는 작게 보여도 붙는 순간 원본 크기로 (js/elements.js)
                    if (typeof selectElement === 'function') selectElement(el);
                }
                if (navigator.vibrate) try { navigator.vibrate(10); } catch (er) {}
                if (typeof saveData === 'function') saveData(false);
            }, 150);
        }
        document.addEventListener('pointerdown', e => { if (spkS.lift && !spkS.lift.down && !e.target.closest('.spk-fly, #spkBoard')) spkPutBack(); }, true);

        window.spkTab = spkTab; window.spkTabs = spkTabs; window.openStickerPack = openStickerPack; window.closeStickerPack = closeStickerPack;
