/* 말랑달콤 다이어리 - js/coloring-data.js
   🖍️ 색칠놀이 그림 : 직접 그린 선그림 (300×300)
   - class="c" = 색칠할 수 있는 칸 (뒤에 그린 칸이 앞에 보여요) · data-g = 대칭 칠하기 때 함께 칠해지는 묶음
   - class="k" = 까만 선 · 눈 같은 칠하지 않는 부분 */

        const CL_EYES = (x1, x2, y, r) => `<circle class="k" cx="${x1}" cy="${y}" r="${r}"/><circle class="k" cx="${x2}" cy="${y}" r="${r}"/><circle cx="${x1 + r * .35}" cy="${y - r * .35}" r="${r * .35}" fill="#fff" pointer-events="none"/><circle cx="${x2 + r * .35}" cy="${y - r * .35}" r="${r * .35}" fill="#fff" pointer-events="none"/>`;
        const CL_SMILE = (x, y, w) => `<path class="k" d="M${x - w} ${y} q${w / 2} ${w * .7} ${w} 0 q${w / 2} ${w * .7} ${w} 0" fill="none"/>`;
        const CL_FLOWER = (x, y, r, g) => [0, 72, 144, 216, 288].map(a => `<ellipse class="c" data-g="${g}p" cx="${x}" cy="${y - r * .62}" rx="${r * .42}" ry="${r * .62}" transform="rotate(${a} ${x} ${y})"/>`).join('') + `<circle class="c" data-g="${g}c" cx="${x}" cy="${y}" r="${r * .34}"/>`;
        function CL_MANDALA() {
            let s = '<circle class="c" data-g="m0" cx="150" cy="150" r="140"/>';
            const ring = (n, r1, r2, w, g, rot) => { for (let i = 0; i < n; i++) { const a = i * 360 / n + (rot || 0); s += `<ellipse class="c" data-g="${g}" cx="150" cy="${150 - (r1 + r2) / 2}" rx="${w}" ry="${(r2 - r1) / 2}" transform="rotate(${a} 150 150)"/>`; } };
            ring(16, 98, 136, 13, 'm1', 11.25); ring(12, 62, 110, 17, 'm2'); ring(12, 40, 78, 10, 'm3', 15);
            s += '<circle class="c" data-g="m4" cx="150" cy="150" r="42"/>'; ring(8, 14, 40, 8, 'm5'); s += '<circle class="c" data-g="m6" cx="150" cy="150" r="14"/>';
            for (let i = 0; i < 16; i++) { const a = (i * 22.5) * Math.PI / 180; s += `<circle class="c" data-g="m7" cx="${(150 + Math.sin(a) * 124).toFixed(1)}" cy="${(150 - Math.cos(a) * 124).toFixed(1)}" r="4"/>`; }
            return s;
        }
        const COLORING_PAGES = [
            { id: 'cat', name: '고양이', svg: `
<rect class="c" x="0" y="0" width="300" height="300"/>
<path class="c" d="M206 238 C 262 236 270 176 240 160 C 230 190 216 200 200 206Z"/>
<ellipse class="c" cx="150" cy="226" rx="78" ry="56"/>
<ellipse class="c" cx="150" cy="240" rx="40" ry="30"/>
<path class="c" d="M78 78 L 92 20 L 128 60Z"/><path class="c" d="M222 78 L 208 20 L 172 60Z"/>
<path class="c" d="M88 66 L 96 36 L 116 58Z"/><path class="c" d="M212 66 L 204 36 L 184 58Z"/>
<ellipse class="c" cx="150" cy="110" rx="82" ry="70"/>
<rect class="c" x="92" y="168" width="116" height="16" rx="8"/><circle class="c" cx="150" cy="190" r="12"/>
<circle class="c" cx="104" cy="128" r="12"/><circle class="c" cx="196" cy="128" r="12"/>
${CL_EYES(124, 176, 108, 8)}<path class="c" d="M143 124 h14 l-7 7z"/>${CL_SMILE(150, 134, 7)}
<path class="k" d="M66 116 h-30 M66 126 l-28 8 M234 116 h30 M234 126 l28 8" fill="none"/>
<ellipse class="c" cx="118" cy="272" rx="18" ry="11"/><ellipse class="c" cx="182" cy="272" rx="18" ry="11"/>` },
            { id: 'bunny', name: '토끼와 당근', svg: `
<rect class="c" x="0" y="0" width="300" height="300"/>
<ellipse class="c" cx="110" cy="70" rx="22" ry="58" transform="rotate(-10 110 70)"/><ellipse class="c" cx="110" cy="74" rx="10" ry="40" transform="rotate(-10 110 74)"/>
<ellipse class="c" cx="176" cy="70" rx="22" ry="58" transform="rotate(12 176 70)"/><ellipse class="c" cx="176" cy="74" rx="10" ry="40" transform="rotate(12 176 74)"/>
<ellipse class="c" cx="145" cy="238" rx="70" ry="54"/><ellipse class="c" cx="145" cy="246" rx="38" ry="32"/>
<circle class="c" cx="145" cy="150" r="62"/>
<circle class="c" cx="112" cy="168" r="11"/><circle class="c" cx="178" cy="168" r="11"/>
${CL_EYES(124, 166, 146, 7)}<ellipse class="c" cx="145" cy="164" rx="7" ry="5"/>${CL_SMILE(145, 172, 6)}
<path class="c" d="M236 196 q -14 -26 -2 -40 q 10 16 8 38z"/><path class="c" d="M240 196 q 8 -28 30 -28 q -4 20 -24 32z"/>
<path class="c" d="M222 198 C 236 188 258 196 256 212 L 212 284 Q 202 294 198 282Z"/><path class="k" d="M226 222 l 12 6 M218 244 l 10 5 M210 264 l 8 4" fill="none"/>
<ellipse class="c" cx="104" cy="284" rx="20" ry="11"/><ellipse class="c" cx="186" cy="284" rx="20" ry="11"/>` },
            { id: 'cupcake', name: '컵케이크', svg: `
<rect class="c" x="0" y="0" width="300" height="300"/>
<path class="c" d="M78 168 L 222 168 L 204 278 L 96 278Z"/>
<path class="c" d="M98 168 L 110 278 L 124 278 L 116 168Z"/><path class="c" d="M140 168 L 142 278 L 158 278 L 160 168Z"/><path class="c" d="M184 168 L 176 278 L 190 278 L 202 168Z"/>
<path class="c" d="M66 172 C 50 150 76 126 96 132 C 100 110 130 104 150 114 C 170 104 200 110 204 132 C 224 126 250 150 234 172Z"/>
<path class="c" d="M92 132 C 90 106 118 92 136 98 C 146 80 178 84 186 102 C 206 100 216 120 208 132Z"/>
<path class="c" d="M116 100 C 116 76 144 62 162 74 C 180 76 186 92 180 102Z"/>
<circle class="c" cx="150" cy="56" r="18"/><path class="k" d="M150 40 q 6 -18 22 -22" fill="none"/>
<rect class="c" x="100" y="148" width="14" height="6" rx="3" transform="rotate(30 107 151)"/><rect class="c" x="170" y="140" width="14" height="6" rx="3" transform="rotate(-25 177 143)"/>
<rect class="c" x="132" y="118" width="14" height="6" rx="3" transform="rotate(10 139 121)"/><rect class="c" x="200" y="156" width="14" height="6" rx="3" transform="rotate(60 207 159)"/>
${CL_EYES(130, 170, 210, 7)}${CL_SMILE(150, 226, 7)}` },
            { id: 'flowers', name: '꽃 화분', svg: `
<rect class="c" x="0" y="0" width="300" height="300"/>
<path class="k" d="M150 196 V 110 M150 170 C 120 150 100 120 96 96 M150 176 C 180 156 200 126 206 100" fill="none"/>
<path class="c" d="M150 166 C 128 166 114 152 116 136 C 136 138 148 150 150 166Z"/><path class="c" d="M150 152 C 172 150 186 136 184 120 C 164 122 152 134 150 152Z"/>
${CL_FLOWER(150, 86, 34, 'a')}${CL_FLOWER(92, 92, 26, 'b')}${CL_FLOWER(210, 96, 26, 'b')}
<path class="c" d="M88 196 h124 l-14 90 h-96z"/><rect class="c" x="80" y="186" width="140" height="22" rx="8"/>
<path class="c" d="M108 236 q 10 -10 20 0 q 10 -10 20 0 q 10 -10 20 0 q 10 -10 20 0 v 14 q -10 10 -20 0 q -10 10 -20 0 q -10 10 -20 0 q -10 10 -20 0z"/>` },
            { id: 'house', name: '말랑 하우스', svg: `
<rect class="c" x="0" y="0" width="300" height="300"/>
<rect class="c" x="0" y="238" width="300" height="62"/>
<circle class="c" cx="248" cy="52" r="26"/>
<path class="c" d="M40 70 C 30 70 26 54 40 50 C 42 36 62 34 68 44 C 80 38 92 48 88 60 C 98 64 94 76 84 76 L 44 76Z"/>
<rect class="c" x="180" y="76" width="22" height="46"/>
<rect class="c" x="70" y="140" width="160" height="104"/>
<path class="c" d="M56 146 L 150 70 L 244 146Z"/>
<rect class="c" x="132" y="180" width="38" height="64" rx="19"/><circle class="k" cx="160" cy="214" r="3"/>
<rect class="c" x="86" y="164" width="34" height="34"/><rect class="c" x="182" y="164" width="34" height="34"/>
<path class="k" d="M103 164 v34 M86 181 h34 M199 164 v34 M182 181 h34" fill="none"/>
<circle class="c" cx="150" cy="114" r="14"/>
${CL_FLOWER(40, 228, 14, 'f')}${CL_FLOWER(262, 228, 14, 'f')}` },
            { id: 'whale', name: '고래', svg: `
<rect class="c" x="0" y="0" width="300" height="300"/>
<path class="c" d="M0 220 q 25 -14 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 V 300 H 0Z"/>
<path class="c" d="M226 150 C 250 120 284 120 290 108 C 286 140 270 156 250 164 C 270 172 280 196 284 206 C 264 196 246 180 230 176Z"/>
<path class="c" d="M40 170 C 40 110 100 90 150 96 C 210 102 240 140 236 176 C 232 214 180 226 130 224 C 80 222 40 210 40 170Z"/>
<path class="c" d="M56 190 C 90 214 180 218 226 186 C 220 210 180 222 130 222 C 90 220 64 210 56 190Z"/>
<path class="k" d="M120 96 q -10 -30 -26 -40 M120 96 q 0 -34 10 -50 M120 96 q 10 -30 28 -38" fill="none"/>
<circle class="c" cx="92" cy="54" r="7"/><circle class="c" cx="130" cy="44" r="7"/><circle class="c" cx="150" cy="56" r="7"/>
<path class="c" d="M140 176 C 150 196 176 200 186 190 C 172 186 160 180 152 168Z"/>
${CL_EYES(84, 84, 150, 7)}<circle class="c" cx="70" cy="170" r="8"/>${CL_SMILE(98, 168, 6)}
<circle class="c" cx="252" cy="54" r="22"/>` },
            { id: 'bear', name: '곰돌이와 풍선', svg: `
<rect class="c" x="0" y="0" width="300" height="300"/>
<path class="k" d="M64 96 C 80 150 110 170 120 196 M150 80 C 150 140 140 170 136 196 M236 96 C 220 150 190 170 160 196" fill="none"/>
<ellipse class="c" cx="64" cy="64" rx="34" ry="40"/><path class="c" d="M58 104 l6 10 l6 -10z"/>
<ellipse class="c" cx="150" cy="44" rx="34" ry="40"/><path class="c" d="M144 84 l6 10 l6 -10z"/>
<ellipse class="c" cx="236" cy="64" rx="34" ry="40"/><path class="c" d="M230 104 l6 10 l6 -10z"/>
<ellipse class="c" cx="150" cy="262" rx="64" ry="44"/>
<circle class="c" cx="108" cy="168" r="20"/><circle class="c" cx="192" cy="168" r="20"/>
<circle class="c" cx="108" cy="168" r="10"/><circle class="c" cx="192" cy="168" r="10"/>
<circle class="c" cx="150" cy="210" r="52"/><ellipse class="c" cx="150" cy="228" rx="24" ry="18"/>
<ellipse class="c" cx="96" cy="250" rx="16" ry="22" transform="rotate(30 96 250)"/><ellipse class="c" cx="204" cy="250" rx="16" ry="22" transform="rotate(-30 204 250)"/>
${CL_EYES(130, 170, 204, 6)}<ellipse class="k" cx="150" cy="222" rx="6" ry="4"/>${CL_SMILE(150, 232, 5)}` },
            { id: 'icecream', name: '아이스크림', svg: `
<rect class="c" x="0" y="0" width="300" height="300"/>
<path class="c" d="M110 160 L 150 290 L 190 160Z"/>
<path class="k" d="M120 180 L 176 212 M130 210 L 168 232 M180 180 L 124 212 M170 210 L 134 236" fill="none"/>
<circle class="c" cx="150" cy="138" r="44"/><path class="c" d="M108 150 q 8 18 16 2 q 6 22 16 4 q 8 18 18 2 q 8 18 18 0 q 6 14 14 -4 C 186 170 114 170 108 150Z"/>
<circle class="c" cx="150" cy="80" r="36"/><circle class="c" cx="150" cy="34" r="12"/><path class="k" d="M150 22 q 4 -12 14 -14" fill="none"/>
${CL_EYES(134, 166, 132, 6)}${CL_SMILE(150, 148, 6)}
<path class="c" d="M50 70 C 30 56 34 36 50 44 C 66 36 70 56 50 70Z"/><path class="c" d="M250 110 C 230 96 234 76 250 84 C 266 76 270 96 250 110Z"/><path class="c" d="M60 200 C 44 190 46 172 60 178 C 74 172 76 190 60 200Z"/>
<path class="c" d="M240 210 l 6 14 l 15 1 l -11 10 l 4 15 l -14 -8 l -14 8 l 4 -15 l -11 -10 l 15 -1z"/>` },
            { id: 'mandala', name: '만다라 (대칭)', sym: true, svg: CL_MANDALA() }
        ];
