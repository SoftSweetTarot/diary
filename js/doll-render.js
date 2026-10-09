/* 말랑달콤 다이어리 - js/doll-render.js
   👧 인형 그리기 엔진 (인형방 · 일기 페이지에 붙인 인형 공용)
   - 인형은 이미지가 아니라 '설정값(인형 데이터)'으로 저장되고, 보여줄 때마다 이 파일이 SVG 그림으로 그려요.
       예) {"v":1,"gender":"girl","eyes":"smile","hairBack":"twin", ..., "layers":[직접 그린 조각들], "stats":{...}}
   - 쉬움 버전 : 정해진 부품을 고르고 슬라이더로 조절 (eyes, hairBack, top ... )
   - 어려움 버전 : 펜·붓으로 직접 그린 조각(layers) — 점 좌표로 저장
   - 다른 사람이 만든 인형 파일도 sanitizeDoll()로 검사한 뒤에만 그려요 (정해진 값만 통과)
   ※ 파일 불러오는 순서: … → pattern-maker → doll-render → doll-room → service */

        const DOLL_W = 300, DOLL_H = 470, DOLL_CX = 150;
        const DOLL_MAX_JSON = Infinity;        // 인형 하나 용량 제한 없음
        const DOLL_MAX_LAYERS = 400, DOLL_MAX_PTS = 800;

        /* ---------- 처음 모습 : 마네킹 (눈·코·입·머리·옷 없음) ---------- */
        const DOLL_MANNEQUIN = {
            v: 1, name: '', by: '', gender: 'girl',
            skin: '#efe4de', face: 'round', head: 1, body: 'normal', height: 0.5,
            eyes: 'none', eyeColor: '#7a4b3a', eyeSize: 1, eyeGap: 1, brows: 'none', nose: 'none', mouth: 'none',
            blushStyle: 'oval', blush: '#ff8fa3', blushA: 0, lip: '#ff5c7a', lipA: 0,
            shadow: '#c9a7ff', shadowA: 0, lashes: false, freckles: false,
            hairBack: 'none', hairFront: 'none', hairColor: '#7a4b3a',
            top: 'none', bottom: 'none', dress: 'none', shoes: 'none',
            acc: { bow: false, headband: false, crown: false, glasses: false, beret: false, flower: false, tie: false },
            accColor: '#ff6b8f', bg: 'dots', flip: false,
            cloth: {
                top:    { color: '#ffffff', pat: 'none', patColor: '#ffd1dc', patSize: 1, sleeve: 'short', len: 0.5 },
                bottom: { color: '#ff9fb6', pat: 'none', patColor: '#ffffff', patSize: 1, sleeve: 'short', len: 0.45 },
                dress:  { color: '#b9dcff', pat: 'none', patColor: '#ffffff', patSize: 1, sleeve: 'puff', len: 0.55 },
                shoes:  { color: '#ff6b8f', pat: 'none', patColor: '#ffffff', patSize: 1, sleeve: 'short', len: 0.5 }
            },
            layers: [],
            stats: { ms: 0, hard: false, created: 0 }
        };

        const DOLL_ENUMS = {
            gender: ['girl', 'boy'], face: ['round', 'oval', 'slim', 'chubby'], body: ['slim', 'normal', 'chubby'],
            eyes: ['none', 'sparkle', 'smile', 'cat', 'sleepy', 'heart'], brows: ['none', 'arc', 'flat', 'worried', 'strong'],
            nose: ['none', 'dot', 'line'], mouth: ['none', 'smile', 'open', 'cat', 'o', 'pout'], blushStyle: ['oval', 'lines', 'heart'],
            hairBack: ['none', 'long', 'bob', 'twin', 'pony', 'bun', 'short'], hairFront: ['none', 'blunt', 'wispy', 'side', 'part', 'up', 'spiky'],
            top: ['none', 'tee', 'blouse', 'shirt', 'hoodie', 'cardigan'], bottom: ['none', 'skirt', 'suspender', 'pants'],
            dress: ['none', 'aline', 'princess', 'hanbok'], shoes: ['none', 'mary', 'sneaker', 'boots'], bg: ['dots', 'sky', 'check', 'room', 'none']
        };
        const DOLL_COLORS = ['skin', 'eyeColor', 'blush', 'lip', 'shadow', 'hairColor', 'accColor'];
        const DOLL_NUMS = { head: [0.9, 1.1], height: [0, 1], eyeSize: [0.8, 1.25], eyeGap: [0.85, 1.15], blushA: [0, 1], lipA: [0, 1], shadowA: [0, 0.8] };
        const DOLL_BOOLS = ['lashes', 'freckles', 'flip'];
        const DOLL_ACCS = ['bow', 'headband', 'crown', 'glasses', 'beret', 'flower', 'tie'];
        const DOLL_PATS = ['none', 'diag', 'stripe', 'dot', 'check', 'heart', 'flower', 'star'];
        const DOLL_SLOTS = ['back', 'cloth', 'face', 'hair', 'top'];

        const dollClone = o => JSON.parse(JSON.stringify(o));
        function dollNewMannequin() { const d = dollClone(DOLL_MANNEQUIN); d.stats.created = Date.now(); return d; }

        /* ---------- 검사 : 알려진 값만 통과 (파일·다른 사람 인형도 안전하게) ---------- */
        function dollColor(v, def) { return typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : def; }
        function dollNum(v, lim, def) { const n = parseFloat(v); return isNaN(n) ? def : Math.max(lim[0], Math.min(lim[1], n)); }
        function dollText(v, max) { return String(v == null ? '' : v).replace(/[<>"'`\\&]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); }

        function sanitizeDoll(input) {
            let d = input;
            if (typeof d === 'string') {
                if (d.length > DOLL_MAX_JSON) return null;
                try { d = JSON.parse(d); } catch (e) { return null; }
            }
            if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
            const M = DOLL_MANNEQUIN, out = dollClone(M);
            out.name = dollText(d.name, 12); out.by = dollText(d.by, 12);
            Object.keys(DOLL_ENUMS).forEach(k => { out[k] = DOLL_ENUMS[k].includes(d[k]) ? d[k] : M[k]; });
            DOLL_COLORS.forEach(k => { out[k] = dollColor(d[k], M[k]); });
            Object.keys(DOLL_NUMS).forEach(k => { out[k] = dollNum(d[k], DOLL_NUMS[k], M[k]); });
            DOLL_BOOLS.forEach(k => { out[k] = !!d[k]; });
            DOLL_ACCS.forEach(k => { out.acc[k] = !!(d.acc && d.acc[k]); });
            ['top', 'bottom', 'dress', 'shoes'].forEach(p => {
                const s = (d.cloth && d.cloth[p]) || {}, o = out.cloth[p];
                o.color = dollColor(s.color, o.color); o.patColor = dollColor(s.patColor, o.patColor);
                o.pat = DOLL_PATS.includes(s.pat) ? s.pat : 'none';
                o.patSize = dollNum(s.patSize, [0.4, 2], 1); o.len = dollNum(s.len, [0, 1], o.len);
                o.sleeve = ['none', 'short', 'puff', 'long'].includes(s.sleeve) ? s.sleeve : o.sleeve;
            });
            out.layers = [];
            (Array.isArray(d.layers) ? d.layers : []).slice(0, DOLL_MAX_LAYERS).forEach(L => {
                if (!L || typeof L !== 'object' || !Array.isArray(L.pts)) return;
                const kind = ['poly', 'line', 'brush'].includes(L.kind) ? L.kind : null;
                if (!kind) return;
                const pts = [];
                L.pts.slice(0, DOLL_MAX_PTS).forEach(p => {
                    if (!Array.isArray(p) || p.length < 2) return;
                    const q = [dollNum(p[0], [-60, 360], 0), dollNum(p[1], [-60, 530], 0)].map(n => Math.round(n * 10) / 10);
                    if (p.length >= 4 && kind !== 'brush') q.push(Math.round(dollNum(p[2], [-60, 360], 0) * 10) / 10, Math.round(dollNum(p[3], [-60, 530], 0) * 10) / 10);
                    pts.push(q);
                });
                if (pts.length < (kind === 'poly' ? 3 : 1)) return;
                out.layers.push({
                    slot: DOLL_SLOTS.includes(L.slot) ? L.slot : 'cloth', kind, pts,
                    fill: dollColor(L.fill, '#ffffff'), stroke: dollColor(L.stroke, '#5a3d3d'),
                    w: dollNum(L.w, [0.5, 40], 2), op: dollNum(L.op, [0.05, 1], 1),
                    pat: DOLL_PATS.includes(L.pat) ? L.pat : 'none', patColor: dollColor(L.patColor, '#ffffff'),
                    name: dollText(L.name, 12), hidden: !!L.hidden
                });
            });
            const st = d.stats || {};
            out.stats = { ms: dollNum(st.ms, [0, 1e10], 0), hard: !!st.hard || out.layers.length > 0, created: dollNum(st.created, [0, 1e14], 0) };
            if (JSON.stringify(out).length > DOLL_MAX_JSON) return null;
            return out;
        }

        function dollCounts(d) {
            return { pieces: d.layers.length, pts: d.layers.reduce((s, L) => s + L.pts.length, 0) };
        }
        function dollTimeText(ms) {
            const m = Math.round(ms / 60000);
            if (m < 1) return '1분 미만';
            return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`;
        }

        /* =====================================================================
           ✏️ 그리기
           ===================================================================== */
        function dRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
        function dMix(a, b, t) { const A = dRgb(a), B = dRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
        const dDark = (c, t = 0.35) => dMix(c, '#4a2f35', t);
        const dLight = (c, t = 0.4) => dMix(c, '#ffffff', t);

        function dollGeo(D) {
            const boy = D.gender === 'boy';
            const R = 72 * D.head, cy = 46 + R;
            const ry = { round: R * 0.95, oval: R * 1.02, slim: R * 0.98, chubby: R * 0.9 }[D.face];
            const chin = cy + ry;
            const b = { slim: 0.88, normal: 1, chubby: 1.16 }[D.body];
            const sy = chin + 12;
            const torso = 56 + D.height * 14 + (boy ? 4 : 0);
            const wy = sy + torso, hipY = wy + 16;
            const legLen = 62 + D.height * 74 + (boy ? 4 : 0);
            const footY = hipY + legLen;
            const sw = 32 * b * (boy ? 1.12 : 1), ww = 24 * b * (boy ? 1.08 : 1), hw = 31 * b * (boy ? 0.92 : 1);
            return { R, cy, ry, chin, b, sy, torso, wy, hipY, legLen, footY, sw, ww, hw,
                legX: hw * 0.5, legW: 15 * b * (boy ? 1.06 : 1), armW: 13.5 * b * (boy ? 1.08 : 1), armLen: torso + 16 + D.height * 10 };
        }

        function dollPatternDef(id, c) {
            const s = Math.round(7 + 8 * c.patSize), h = s / 2, p = c.patColor, base = c.color || c.fill;
            let inner = `<rect width="${s}" height="${s}" fill="${base}"/>`, rot = '';
            switch (c.pat) {
                case 'diag': inner += `<rect width="${h}" height="${s}" fill="${p}"/>`; rot = ' patternTransform="rotate(45)"'; break;
                case 'stripe': inner += `<rect width="${s}" height="${h * 0.8}" fill="${p}"/>`; break;
                case 'dot': inner += [[h, h], [0, 0], [s, 0], [0, s], [s, s]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${s * 0.17}" fill="${p}"/>`).join(''); break;
                case 'check': inner += `<rect width="${h}" height="${s}" fill="${p}" opacity=".55"/><rect width="${s}" height="${h}" fill="${p}" opacity=".55"/>`; break;
                case 'heart': inner += `<path transform="translate(${h} ${h}) scale(${s / 20})" d="M0 5 C-8 -1 -6 -8 0 -4 C6 -8 8 -1 0 5Z" fill="${p}"/>`; break;
                case 'flower': inner += `<g transform="translate(${h} ${h}) scale(${s / 22})" fill="${p}"><circle cy="-4" r="3"/><circle cx="3.8" cy="-1.2" r="3"/><circle cx="2.4" cy="3.3" r="3"/><circle cx="-2.4" cy="3.3" r="3"/><circle cx="-3.8" cy="-1.2" r="3"/><circle r="2" fill="${base}"/></g>`; break;
                case 'star': inner += `<path transform="translate(${h} ${h}) scale(${s / 22})" d="M0 -6 L1.8 -1.8 L6 -1.6 L2.7 1.1 L3.8 5.4 L0 3 L-3.8 5.4 L-2.7 1.1 L-6 -1.6 L-1.8 -1.8Z" fill="${p}"/>`; break;
            }
            return `<pattern id="${id}" width="${s}" height="${s}" patternUnits="userSpaceOnUse"${rot}>${inner}</pattern>`;
        }

        /* 인형 그림 하나 만들기 : 그리는 동안만 쓰는 도우미들을 한데 묶음 */
        function dollParts(D, pfx) {
            const CX = DOLL_CX, g = dollGeo(D);
            const fillOf = part => D.cloth[part].pat === 'none' ? D.cloth[part].color : `url(#${pfx}-pat-${part})`;
            const lineOf = part => dDark(D.cloth[part].color, 0.38);
            const clothSt = part => `fill="${fillOf(part)}" stroke="${lineOf(part)}" stroke-width="2.2" stroke-linejoin="round"`;
            const armPts = s => { const ax = CX + s * (g.sw - 3), ay = g.sy + 8; return { ax, ay, hx: CX + s * (g.sw + 15), hy: ay + g.armLen }; };

            function hairBack() {
                if (D.hairBack === 'none') return '';
                const { R, cy, sy } = g, H = D.hairColor, L = dDark(H, 0.3);
                const st = `fill="${H}" stroke="${L}" stroke-width="2.2" stroke-linejoin="round"`;
                const cap = `<ellipse cx="${CX}" cy="${cy - 6}" rx="${R + 7}" ry="${R + 5}" ${st}/>`;
                const x0 = CX - R - 7, x1 = CX + R + 7;
                switch (D.hairBack) {
                    case 'long': return `<path ${st} d="M${x0} ${cy - 6} C${x0 - 8} ${cy + 60} ${x0 + 2} ${sy + 66} ${x0 + 12} ${sy + 96} Q${x0 + 26} ${sy + 106} ${x0 + 36} ${sy + 94} L${x1 - 36} ${sy + 94} Q${x1 - 26} ${sy + 106} ${x1 - 12} ${sy + 96} C${x1 - 2} ${sy + 66} ${x1 + 8} ${cy + 60} ${x1} ${cy - 6}Z"/>` + cap;
                    case 'bob': return `<path ${st} d="M${x0 - 2} ${cy - 6} C${x0 - 6} ${cy + 40} ${x0 + 2} ${cy + R * 0.86} ${x0 + 18} ${cy + R * 0.92} L${x1 - 18} ${cy + R * 0.92} C${x1 - 2} ${cy + R * 0.86} ${x1 + 6} ${cy + 40} ${x1 + 2} ${cy - 6}Z"/>` + cap;
                    case 'twin': {
                        let out = '';
                        [-1, 1].forEach(s => {
                            const tx = CX + s * (R - 2), ty = cy - 30;
                            out += `<path ${st} d="M${tx} ${ty} C${tx + s * 44} ${ty + 6} ${tx + s * 50} ${sy + 40} ${tx + s * 26} ${sy + 92} C${tx + s * 30} ${sy + 50} ${tx + s * 14} ${ty + 46} ${tx - s * 2} ${ty + 22}Z"/>`;
                            out += `<circle cx="${tx + s * 6}" cy="${ty + 6}" r="7" fill="${D.accColor}" stroke="${dDark(D.accColor)}" stroke-width="2"/>`;
                        });
                        return out + cap;
                    }
                    case 'pony': return `<path ${st} d="M${CX + R * 0.45} ${cy - R * 0.85} C${CX + R + 58} ${cy - R * 0.7} ${CX + R + 36} ${sy + 34} ${CX + R - 2} ${sy + 66} C${CX + R + 10} ${sy + 14} ${CX + R + 10} ${cy} ${CX + R * 0.25} ${cy - R * 0.55}Z"/>` + cap +
                        `<circle cx="${CX + R * 0.62}" cy="${cy - R * 0.82}" r="7" fill="${D.accColor}" stroke="${dDark(D.accColor)}" stroke-width="2"/>`;
                    case 'bun': return [-1, 1].map(s => `<circle cx="${CX + s * R * 0.62}" cy="${cy - R * 0.8}" r="${R * 0.36}" ${st}/>`).join('') + cap;
                    default: return cap;
                }
            }

            function hairFront() {
                if (D.hairFront === 'none') return '';
                const { R, cy } = g, H = D.hairColor, L = dDark(H, 0.3);
                const st = `fill="${H}" stroke="${L}" stroke-width="2.2" stroke-linejoin="round"`;
                const xl = CX - R - 7, xr = CX + R + 7;
                const top = y => `M${xl} ${y} L${xl} ${cy - 4} A${R + 7} ${R + 10} 0 0 1 ${xr} ${cy - 4} L${xr} ${y}`;
                let d;
                switch (D.hairFront) {
                    case 'blunt': d = `${top(cy + 30)} L${xr - 11} ${cy + 32} L${CX + R - 8} ${cy - 18} Q${CX} ${cy - 24} ${CX - R + 8} ${cy - 18} L${xl + 11} ${cy + 32}Z`; break;
                    case 'wispy':
                    case 'spiky': {
                        const n = D.hairFront === 'spiky' ? 6 : 7, span = (R - 8) * 2, deep = D.hairFront === 'spiky' ? 16 : 6;
                        let pts = '';
                        for (let i = 0; i <= n; i++) {
                            const x = CX + R - 8 - (span / n) * i;
                            pts += i === 0 ? `L${x} ${cy - 22}` : (D.hairFront === 'spiky'
                                ? `L${x + span / n / 2} ${cy - 22 + deep} L${x} ${cy - 22}`
                                : `Q${x + span / n / 2} ${cy - 4 - (i % 2) * 6} ${x} ${cy - 20}`);
                        }
                        d = `${top(cy + (D.hairFront === 'spiky' ? 14 : 30))} L${xr - 11} ${cy + 16} ${pts} L${xl + 11} ${cy + 16}Z`; break;
                    }
                    case 'side': d = `${top(cy + 30)} L${xr - 11} ${cy + 32} L${CX + R - 6} ${cy - 34} Q${CX + 10} ${cy - 30} ${CX - R + 14} ${cy - 2} L${xl + 11} ${cy + 32}Z`; break;
                    case 'part': d = `${top(cy + 34)} L${xr - 11} ${cy + 36} Q${CX + R - 14} ${cy - 30} ${CX + 4} ${cy - R + 12} L${CX - 4} ${cy - R + 12} Q${CX - R + 14} ${cy - 30} ${xl + 11} ${cy + 36}Z`; break;
                    default: d = `${top(cy + 8)} L${xr - 6} ${cy + 8} Q${CX} ${cy - R * 0.96} ${xl + 6} ${cy + 8}Z`;
                }
                const shine = ['part', 'up'].includes(D.hairFront) ? '' : `<path d="M${CX - R * 0.55} ${cy - R * 0.62} Q${CX} ${cy - R * 0.9} ${CX + R * 0.55} ${cy - R * 0.62}" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".28"/>`;
                return `<path ${st} d="${d}"/>${shine}`;
            }

            function facePath() {
                const { R, cy } = g;
                switch (D.face) {
                    case 'oval': return `<ellipse cx="${CX}" cy="${cy}" rx="${R * 0.93}" ry="${R * 1.02}"/>`;
                    case 'slim': return `<path d="M${CX - R} ${cy - 6} C${CX - R} ${cy - R * 1.06} ${CX + R} ${cy - R * 1.06} ${CX + R} ${cy - 6} C${CX + R} ${cy + R * 0.55} ${CX + 20} ${cy + R * 0.94} ${CX} ${cy + R * 0.98} C${CX - 20} ${cy + R * 0.94} ${CX - R} ${cy + R * 0.55} ${CX - R} ${cy - 6}Z"/>`;
                    case 'chubby': return `<ellipse cx="${CX}" cy="${cy + 2}" rx="${R * 1.05}" ry="${R * 0.9}"/>`;
                    default: return `<ellipse cx="${CX}" cy="${cy}" rx="${R}" ry="${R * 0.95}"/>`;
                }
            }

            function eye(x, y, s) {
                if (D.eyes === 'none') return '';
                const k = D.eyeSize, ec = D.eyeColor, ink = '#3a2622';
                const e = {
                    sparkle: `<ellipse rx="11" ry="14" fill="${ec}"/><ellipse cy="3" rx="7" ry="9" fill="#2a1a17" opacity=".5"/><circle cx="-4" cy="-6" r="4.2" fill="#fff"/><circle cx="4" cy="5" r="2" fill="#fff" opacity=".9"/><path d="M-13 -7 Q0 -19 13 -7" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`,
                    smile: `<path d="M-11 3 Q0 -10 11 3" stroke="${ink}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`,
                    cat: `<path d="M-13 2 Q-2 -14 14 -5 Q4 10 -13 2Z" fill="${ec}" stroke="${ink}" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="1" cy="-1" rx="3" ry="6" fill="#2a1a17" opacity=".6"/><circle cx="-4" cy="-3" r="2.4" fill="#fff"/>`,
                    sleepy: `<path d="M-11 0 A11 11 0 0 0 11 0Z" fill="${ec}"/><circle cx="-3" cy="4" r="2.2" fill="#fff"/><path d="M-13 0 L13 0" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/>`,
                    heart: `<path d="M0 9 C-14 0 -12 -12 0 -5 C12 -12 14 0 0 9Z" fill="#ff5c8a" stroke="#c2185b" stroke-width="2"/><circle cx="-5" cy="-3" r="2.2" fill="#fff"/>`
                }[D.eyes];
                const lashes = D.lashes && ['sparkle', 'cat', 'sleepy'].includes(D.eyes) ? `<path d="M11 -9 L16 -13 M13 -3 L18 -5" stroke="${ink}" stroke-width="2.2" stroke-linecap="round"/>` : '';
                const shadow = D.shadowA > 0 ? `<ellipse cy="-9" rx="16" ry="8" fill="${D.shadow}" opacity="${D.shadowA}"/>` : '';
                return `<g transform="translate(${x} ${y}) scale(${s * k} ${k})">${shadow}${e}${lashes}</g>`;
            }

            function brow(x, y, s) {
                if (D.brows === 'none') return '';
                const d = { arc: 'M-10 2 Q0 -5 10 2', flat: 'M-10 0 L10 -1', worried: 'M-10 -4 Q0 -2 10 2', strong: 'M-10 2 Q0 -2 10 -4' }[D.brows];
                return `<path transform="translate(${x} ${y}) scale(${-s} 1)" d="${d}" stroke="${dDark(D.hairColor, 0.25)}" stroke-width="3" stroke-linecap="round" fill="none"/>`;
            }

            function head() {
                const { R, cy } = g, skin = D.skin, line = dDark(skin, 0.35);
                return [-1, 1].map(s => `<ellipse cx="${CX + s * (R - 2)}" cy="${cy + 14}" rx="10" ry="14" fill="${skin}" stroke="${line}" stroke-width="2"/>`).join('')
                    + `<g fill="${skin}" stroke="${line}" stroke-width="2.2">${facePath()}</g>`;
            }

            function faceFeatures() {
                const { cy } = g, skin = D.skin, ex = 30 * D.eyeGap, ey = cy + 16;
                let out = '';
                if (D.blushA > 0) [-1, 1].forEach(s => {
                    const bx = CX + s * (ex + 16), by = cy + 38;
                    if (D.blushStyle === 'oval') out += `<ellipse cx="${bx}" cy="${by}" rx="13" ry="7" fill="${D.blush}" opacity="${D.blushA}"/>`;
                    if (D.blushStyle === 'lines') out += `<path d="M${bx - 8} ${by + 4} l4 -8 M${bx - 1} ${by + 4} l4 -8 M${bx + 6} ${by + 4} l4 -8" stroke="${D.blush}" stroke-width="2.4" stroke-linecap="round" opacity="${Math.min(1, D.blushA + 0.3)}"/>`;
                    if (D.blushStyle === 'heart') out += `<path transform="translate(${bx} ${by})" d="M0 6 C-9 0 -8 -8 0 -3 C8 -8 9 0 0 6Z" fill="${D.blush}" opacity="${D.blushA}"/>`;
                });
                if (D.freckles) [-1, 1].forEach(s => { const bx = CX + s * (ex + 6); out += `<g fill="${dDark(skin, 0.4)}" opacity=".6"><circle cx="${bx - 5}" cy="${cy + 32}" r="1.4"/><circle cx="${bx + 2}" cy="${cy + 29}" r="1.4"/><circle cx="${bx + 5}" cy="${cy + 35}" r="1.4"/></g>`; });
                out += eye(CX - ex, ey, -1) + eye(CX + ex, ey, 1);
                out += brow(CX - ex, cy - 6, -1) + brow(CX + ex, cy - 6, 1);
                if (D.nose === 'dot') out += `<ellipse cx="${CX}" cy="${cy + 32}" rx="2.6" ry="2" fill="${dDark(skin, 0.3)}"/>`;
                if (D.nose === 'line') out += `<path d="M${CX} ${cy + 27} Q${CX + 4} ${cy + 32} ${CX - 1} ${cy + 35}" stroke="${dDark(skin, 0.35)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
                if (D.mouth !== 'none') {
                    const mc = dMix('#9b4a46', D.lip, D.lipA), mf = dMix('#c2405a', D.lip, D.lipA);
                    const m = {
                        smile: `<path d="M-9 -2 Q0 7 9 -2" stroke="${mc}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
                        open: `<path d="M-10 -3 Q0 -3 10 -3 Q8 10 0 11 Q-8 10 -10 -3Z" fill="${mf}" stroke="${mc}" stroke-width="2" stroke-linejoin="round"/><path d="M-5 6 Q0 3 5 6 Q3 10 0 10 Q-3 10 -5 6Z" fill="#ff9aae"/>`,
                        cat: `<path d="M-10 -1 Q-5 5 0 0 Q5 5 10 -1" stroke="${mc}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
                        o: `<ellipse rx="4" ry="5" fill="${mf}" stroke="${mc}" stroke-width="2"/>`,
                        pout: `<path d="M-6 0 Q-3 -4 0 -1 Q3 -4 6 0 Q3 5 0 5 Q-3 5 -6 0Z" fill="${dMix('#e86a7f', D.lip, D.lipA)}" stroke="${mc}" stroke-width="1.6"/>`
                    }[D.mouth];
                    out += `<g transform="translate(${CX} ${cy + 45})">${m}</g>`;
                }
                return out;
            }

            function bodySkin() {
                const skin = D.skin, line = dDark(skin, 0.35);
                let out = '';
                [-1, 1].forEach(s => {
                    const a = armPts(s);
                    out += `<line x1="${a.ax}" y1="${a.ay}" x2="${a.hx}" y2="${a.hy}" stroke="${line}" stroke-width="${g.armW + 4}" stroke-linecap="round"/>`;
                    out += `<line x1="${a.ax}" y1="${a.ay}" x2="${a.hx}" y2="${a.hy}" stroke="${skin}" stroke-width="${g.armW}" stroke-linecap="round"/>`;
                    const lx = CX + s * g.legX;
                    out += `<rect x="${lx - g.legW / 2}" y="${g.hipY - 12}" width="${g.legW}" height="${g.footY - g.hipY + 12}" rx="${g.legW / 2}" fill="${skin}" stroke="${line}" stroke-width="2"/>`;
                });
                out += `<path d="M${CX - g.sw} ${g.sy + 6} Q${CX} ${g.sy - 6} ${CX + g.sw} ${g.sy + 6} L${CX + g.ww + 2} ${g.hipY} L${CX - g.ww - 2} ${g.hipY}Z" fill="${skin}" stroke="${line}" stroke-width="2"/>`;
                out += `<path d="M${CX - 10} ${g.chin - 14} L${CX - 10} ${g.sy + 4} Q${CX} ${g.sy + 10} ${CX + 10} ${g.sy + 4} L${CX + 10} ${g.chin - 14}Z" fill="${skin}" stroke="${line}" stroke-width="2"/>`;
                return out;
            }
            const hands = () => [-1, 1].map(s => { const a = armPts(s); return `<circle cx="${a.hx}" cy="${a.hy}" r="${8 * g.b}" fill="${D.skin}" stroke="${dDark(D.skin, 0.35)}" stroke-width="2"/>`; }).join('');

            const topShape = hem => { const { sy, sw, ww, wy } = g; return `M${CX - sw - 2} ${sy + 6} Q${CX - sw + 2} ${sy - 4} ${CX - 11} ${sy - 4} Q${CX} ${sy + 8} ${CX + 11} ${sy - 4} Q${CX + sw - 2} ${sy - 4} ${CX + sw + 2} ${sy + 6} L${CX + ww + 4} ${wy + hem} Q${CX} ${wy + hem + 6} ${CX - ww - 4} ${wy + hem}Z`; };

            function sleeves(part, kind) {
                if (kind === 'none') return '';
                const f = { short: 0.38, puff: 0.32, long: 0.86 }[kind];
                let out = '';
                [-1, 1].forEach(s => {
                    const a = armPts(s), ex = a.ax + (a.hx - a.ax) * f, ey = a.ay + (a.hy - a.ay) * f, w = g.armW + 7;
                    out += `<line x1="${a.ax}" y1="${a.ay}" x2="${ex}" y2="${ey}" stroke="${lineOf(part)}" stroke-width="${w + 4}" stroke-linecap="round"/>`;
                    out += `<line x1="${a.ax}" y1="${a.ay}" x2="${ex}" y2="${ey}" stroke="${fillOf(part)}" stroke-width="${w}" stroke-linecap="round"/>`;
                    if (kind === 'puff') out += `<circle cx="${a.ax + s * 2}" cy="${a.ay + 4}" r="${13 * g.b}" fill="${fillOf(part)}" stroke="${lineOf(part)}" stroke-width="2"/>`;
                });
                return out;
            }

            function bottomWear() {
                if (D.bottom === 'none') return { under: '', over: '' };
                const c = D.cloth.bottom, { wy, hipY, ww, hw, legX, legW, legLen } = g;
                let under = '', over = '';
                if (D.bottom === 'skirt' || D.bottom === 'suspender') {
                    const hem = wy + 30 + c.len * 62, fl = hw + 12 + c.len * 14;
                    under += `<path ${clothSt('bottom')} d="M${CX - ww - 1} ${wy - 2} L${CX + ww + 1} ${wy - 2} L${CX + fl} ${hem} Q${CX} ${hem + 10} ${CX - fl} ${hem}Z"/>`;
                    [-0.5, 0, 0.5].forEach(t => { under += `<path d="M${CX + t * ww * 1.4} ${wy + 4} L${CX + t * fl * 1.5} ${hem + 2}" stroke="${lineOf('bottom')}" stroke-width="1.6" opacity=".45"/>`; });
                    if (D.bottom === 'suspender') {
                        over += `<path ${clothSt('bottom')} d="M${CX - 16} ${wy - 26} L${CX + 16} ${wy - 26} L${CX + 18} ${wy + 2} L${CX - 18} ${wy + 2}Z"/>`;
                        [-1, 1].forEach(s => {
                            over += `<path d="M${CX + s * 14} ${wy - 24} L${CX + s * (g.sw - 8)} ${g.sy + 2}" stroke="${lineOf('bottom')}" stroke-width="8" stroke-linecap="round"/><path d="M${CX + s * 14} ${wy - 24} L${CX + s * (g.sw - 8)} ${g.sy + 2}" stroke="${fillOf('bottom')}" stroke-width="5" stroke-linecap="round"/>`;
                            over += `<circle cx="${CX + s * 13}" cy="${wy - 20}" r="2.6" fill="#fff" stroke="${lineOf('bottom')}" stroke-width="1.4"/>`;
                        });
                    }
                } else if (D.bottom === 'pants') {
                    const end = hipY + 16 + c.len * (legLen - 22), o = legW / 2 + 5;
                    under += `<path ${clothSt('bottom')} d="M${CX - ww - 1} ${wy - 2} L${CX + ww + 1} ${wy - 2} L${CX + legX + o} ${end} L${CX + legX - o} ${end} L${CX + 1} ${hipY + 10} L${CX - 1} ${hipY + 10} L${CX - legX + o} ${end} L${CX - legX - o} ${end}Z"/>`;
                }
                under += `<rect x="${CX - ww - 2}" y="${wy - 4}" width="${(ww + 2) * 2}" height="6" rx="3" fill="${dDark(c.color, 0.15)}"/>`;
                return { under, over };
            }

            function topWear() {
                if (D.top === 'none') return '';
                const p = 'top', { sy, ww, wy } = g;
                let out = '';
                if (['tee', 'blouse', 'shirt'].includes(D.top)) out += `<path ${clothSt(p)} d="${topShape(8)}"/>`;
                if (D.top === 'blouse') {
                    [-1, 1].forEach(s => { out += `<path d="M${CX} ${sy + 2} C${CX + s * 6} ${sy + 16} ${CX + s * 24} ${sy + 12} ${CX + s * 22} ${sy - 3}Z" fill="#fff" stroke="${lineOf(p)}" stroke-width="1.8"/>`; });
                    out += `<path d="M${CX - 7} ${sy + 4} L${CX} ${sy + 9} L${CX + 7} ${sy + 4} L${CX + 7} ${sy + 12} L${CX} ${sy + 9} L${CX - 7} ${sy + 12}Z" fill="${D.accColor}"/>`;
                    [20, 32, 44].forEach(dy => { if (sy + dy < wy) out += `<circle cx="${CX}" cy="${sy + dy}" r="2.2" fill="${lineOf(p)}"/>`; });
                }
                if (D.top === 'shirt') {
                    out += `<path d="M${CX} ${sy + 4} L${CX} ${wy + 10}" stroke="${lineOf(p)}" stroke-width="1.6"/>`;
                    [-1, 1].forEach(s => { out += `<path d="M${CX} ${sy + 5} L${CX + s * 15} ${sy - 4} L${CX + s * 18} ${sy + 12}Z" fill="${dLight(D.cloth.top.color, 0.5)}" stroke="${lineOf(p)}" stroke-width="1.8" stroke-linejoin="round"/>`; });
                    [22, 34, 46].forEach(dy => { if (sy + dy < wy + 4) out += `<circle cx="${CX + 3}" cy="${sy + dy}" r="1.9" fill="${lineOf(p)}"/>`; });
                }
                if (D.top === 'hoodie') {
                    out += `<path ${clothSt(p)} d="${topShape(16)}"/>`;
                    out += `<path d="M${CX - 22} ${sy - 2} Q${CX} ${sy + 16} ${CX + 22} ${sy - 2}" stroke="${lineOf(p)}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M${CX - 22} ${sy - 2} Q${CX} ${sy + 16} ${CX + 22} ${sy - 2}" stroke="${fillOf(p)}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
                    out += `<path d="M${CX - 5} ${sy + 8} L${CX - 7} ${sy + 26} M${CX + 5} ${sy + 8} L${CX + 7} ${sy + 26}" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;
                    out += `<path d="M${CX - ww + 2} ${wy - 6} L${CX + ww - 2} ${wy - 6} L${CX + ww - 6} ${wy + 10} L${CX - ww + 6} ${wy + 10}Z" fill="none" stroke="${lineOf(p)}" stroke-width="1.8"/>`;
                }
                if (D.top === 'cardigan') {
                    out += `<path d="M${CX - 11} ${sy - 3} L${CX} ${sy + 26} L${CX + 11} ${sy - 3}Z" fill="#fff"/>`;
                    out += `<path ${clothSt(p)} d="${topShape(10)}"/>`;
                    out += `<path d="M${CX - 11} ${sy - 3} L${CX - 1} ${sy + 26} L${CX - 1} ${wy + 14} M${CX + 11} ${sy - 3} L${CX + 1} ${sy + 26}" stroke="${lineOf(p)}" stroke-width="1.8" fill="none"/>`;
                    out += `<path d="M${CX - 11} ${sy - 3} L${CX} ${sy + 26} L${CX + 11} ${sy - 3}" fill="#fff" stroke="${lineOf(p)}" stroke-width="1.8"/>`;
                    [34, 46, 58].forEach(dy => { if (sy + dy < wy + 8) out += `<circle cx="${CX - 5}" cy="${sy + dy}" r="2.4" fill="#fff" stroke="${lineOf(p)}" stroke-width="1.2"/>`; });
                }
                return out;
            }

            function dressWear() {
                const p = 'dress', c = D.cloth.dress, { sy, sw, ww, hw, wy, footY } = g;
                const accent = c.patColor === '#ffffff' ? D.accColor : c.patColor;
                const bodice = `M${CX - sw - 2} ${sy + 6} Q${CX - sw + 2} ${sy - 4} ${CX - 11} ${sy - 4} Q${CX} ${sy + 8} ${CX + 11} ${sy - 4} Q${CX + sw - 2} ${sy - 4} ${CX + sw + 2} ${sy + 6}`;
                let out = '';
                if (D.dress === 'aline' || D.dress === 'princess') {
                    const hem = wy + 34 + c.len * 80;
                    if (D.dress === 'aline') {
                        const fl = hw + 16 + c.len * 18;
                        out += `<path ${clothSt(p)} d="${bodice} L${CX + ww + 2} ${wy} L${CX + fl} ${hem} Q${CX} ${hem + 10} ${CX - fl} ${hem} L${CX - ww - 2} ${wy}Z"/>`;
                    } else {
                        const fl = hw + 34 + c.len * 16, n = 7;
                        let sc = '';
                        for (let i = 0; i < n; i++) { const x0 = CX + fl - (2 * fl / n) * i, x1 = x0 - 2 * fl / n; sc += ` Q${(x0 + x1) / 2} ${hem + 14} ${x1} ${hem}`; }
                        out += `<path ${clothSt(p)} d="${bodice} L${CX + ww + 2} ${wy} C${CX + hw + 24} ${wy + 16} ${CX + fl - 4} ${hem - 26} ${CX + fl} ${hem}${sc} C${CX - fl + 4} ${hem - 26} ${CX - hw - 24} ${wy + 16} ${CX - ww - 2} ${wy}Z"/>`;
                        out += `<path d="M${CX - fl + 8} ${hem - 6} Q${CX} ${hem + 4} ${CX + fl - 8} ${hem - 6}" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-dasharray="2 5" stroke-linecap="round"/>`;
                    }
                    out += `<rect x="${CX - ww - 3}" y="${wy - 4}" width="${(ww + 3) * 2}" height="7" rx="3" fill="${accent}" stroke="${lineOf(p)}" stroke-width="1.4"/>`;
                    out += `<g transform="translate(${CX} ${wy})" fill="${accent}" stroke="${lineOf(p)}" stroke-width="1.4"><path d="M0 0 C-6 -9 -16 -6 -13 2 C-11 7 -4 4 0 0Z"/><path d="M0 0 C6 -9 16 -6 13 2 C11 7 4 4 0 0Z"/><circle r="3"/></g>`;
                }
                if (D.dress === 'hanbok') {
                    const top = sy + 22, jc = c.patColor === '#ffffff' ? '#fff3c4' : c.patColor;
                    out += `<path ${clothSt(p)} d="M${CX - sw + 2} ${top} L${CX + sw - 2} ${top} C${CX + hw + 30} ${top + 50} ${CX + hw + 40} ${footY - 30} ${CX + hw + 36} ${footY - 2} Q${CX} ${footY + 8} ${CX - hw - 36} ${footY - 2} C${CX - hw - 40} ${footY - 30} ${CX - hw - 30} ${top + 50} ${CX - sw + 2} ${top}Z"/>`;
                    out += `<path d="${bodice} L${CX + sw - 2} ${top + 4} Q${CX} ${top + 10} ${CX - sw + 2} ${top + 4}Z" fill="${jc}" stroke="${dDark(jc)}" stroke-width="2.2" stroke-linejoin="round"/>`;
                    out += `<path d="M${CX - 12} ${sy - 3} L${CX + 6} ${top + 2}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>`;
                    out += `<path d="M${CX + 4} ${top} C${CX + 2} ${top + 20} ${CX - 6} ${top + 40} ${CX - 2} ${top + 58} M${CX + 6} ${top} C${CX + 10} ${top + 18} ${CX + 16} ${top + 34} ${CX + 12} ${top + 52}" stroke="${D.accColor}" stroke-width="5" stroke-linecap="round" fill="none"/>`;
                    out += `<circle cx="${CX + 5}" cy="${top}" r="4" fill="${D.accColor}"/>`;
                }
                return out;
            }
            function hanbokSleeves() {
                const c = D.cloth.dress, jc = c.patColor === '#ffffff' ? '#fff3c4' : c.patColor;
                let out = '';
                [-1, 1].forEach(s => {
                    const a = armPts(s), ex = a.ax + (a.hx - a.ax) * 0.86, ey = a.ay + (a.hy - a.ay) * 0.86, w = g.armW + 9;
                    out += `<line x1="${a.ax}" y1="${a.ay}" x2="${ex}" y2="${ey}" stroke="${dDark(jc)}" stroke-width="${w + 4}" stroke-linecap="round"/><line x1="${a.ax}" y1="${a.ay}" x2="${ex}" y2="${ey}" stroke="${jc}" stroke-width="${w}" stroke-linecap="round"/>`;
                    const cx2 = a.ax + (a.hx - a.ax) * 0.76, cy2 = a.ay + (a.hy - a.ay) * 0.76;
                    out += `<line x1="${cx2}" y1="${cy2}" x2="${ex}" y2="${ey}" stroke="${c.color}" stroke-width="${w}" stroke-linecap="round"/>`;
                });
                return out;
            }

            function shoes() {
                const c = D.cloth.shoes.color, ln = dDark(c, 0.38), skin = D.skin;
                let out = '';
                [-1, 1].forEach(s => {
                    const x = CX + s * g.legX, y = g.footY;
                    switch (D.shoes) {
                        case 'none': out += `<ellipse cx="${x + s * 2}" cy="${y + 2}" rx="10" ry="6" fill="${skin}" stroke="${dDark(skin, 0.35)}" stroke-width="2"/>`; break;
                        case 'sneaker': out += `<path d="M${x - 10} ${y - 8} Q${x - 12} ${y + 6} ${x + s * 4} ${y + 7} Q${x + s * 16} ${y + 7} ${x + s * 14} ${y - 1} Q${x + s * 6} ${y - 4} ${x + s * 4} ${y - 10}Z" fill="${c}" stroke="${ln}" stroke-width="2" stroke-linejoin="round"/><path d="M${x - 10} ${y + 3} Q${x + s * 4} ${y + 8} ${x + s * 14} ${y + 2}" stroke="#fff" stroke-width="3" fill="none"/><circle cx="${x + s * 2}" cy="${y - 4}" r="1.6" fill="#fff"/>`; break;
                        case 'mary': out += `<ellipse cx="${x + s * 3}" cy="${y + 2}" rx="12" ry="7" fill="${c}" stroke="${ln}" stroke-width="2"/><path d="M${x - 7} ${y - 6} L${x + 7} ${y - 6}" stroke="${c}" stroke-width="3"/><circle cx="${x + s * 6}" cy="${y - 6}" r="2" fill="#fff"/>`; break;
                        case 'boots': out += `<path d="M${x - 10} ${y - 34} L${x + 10} ${y - 34} L${x + 10} ${y - 4} Q${x + s * 18} ${y - 2} ${x + s * 16} ${y + 6} L${x - s * 10} ${y + 6}Z" fill="${c}" stroke="${ln}" stroke-width="2" stroke-linejoin="round"/><path d="M${x - 10} ${y - 30} L${x + 10} ${y - 30}" stroke="${dLight(c, 0.5)}" stroke-width="4"/>`; break;
                    }
                });
                return out;
            }

            function tie() {
                if (!D.acc.tie) return '';
                const { sy } = g, a = D.accColor, ln = dDark(a);
                return `<path d="M${CX - 5} ${sy + 4} L${CX + 5} ${sy + 4} L${CX + 3} ${sy + 10} L${CX + 7} ${sy + 36} L${CX} ${sy + 44} L${CX - 7} ${sy + 36} L${CX - 3} ${sy + 10}Z" fill="${a}" stroke="${ln}" stroke-width="1.8" stroke-linejoin="round"/>`;
            }

            function accessories() {
                const { R, cy } = g, a = D.accColor, ln = dDark(a, 0.35), ex = 30 * D.eyeGap, ey = cy + 16;
                let out = '';
                if (D.acc.headband) out += `<path d="M${CX - R - 3} ${cy + 2} A${R + 3} ${R + 4} 0 0 1 ${CX + R + 3} ${cy + 2}" stroke="${ln}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M${CX - R - 3} ${cy + 2} A${R + 3} ${R + 4} 0 0 1 ${CX + R + 3} ${cy + 2}" stroke="${a}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
                if (D.acc.beret) out += `<g transform="rotate(-12 ${CX} ${cy - R})"><ellipse cx="${CX + 8}" cy="${cy - R + 6}" rx="${R * 0.86}" ry="${R * 0.3}" fill="${a}" stroke="${ln}" stroke-width="2.2"/><circle cx="${CX + 8}" cy="${cy - R - 16}" r="4" fill="${ln}"/></g>`;
                if (D.acc.crown) out += `<path d="M${CX - 22} ${cy - R + 2} L${CX - 24} ${cy - R - 22} L${CX - 11} ${cy - R - 10} L${CX} ${cy - R - 28} L${CX + 11} ${cy - R - 10} L${CX + 24} ${cy - R - 22} L${CX + 22} ${cy - R + 2}Z" fill="#ffd54f" stroke="#c9a227" stroke-width="2.2" stroke-linejoin="round"/><circle cx="${CX}" cy="${cy - R - 8}" r="3.4" fill="${a}"/>`;
                if (D.acc.bow) out += `<g transform="translate(${CX + R * 0.58} ${cy - R * 0.78}) rotate(18)" fill="${a}" stroke="${ln}" stroke-width="2.2" stroke-linejoin="round"><path d="M0 0 C-10 -16 -30 -12 -24 4 C-20 14 -8 8 0 0Z"/><path d="M0 0 C10 -16 30 -12 24 4 C20 14 8 8 0 0Z"/><path d="M-3 3 L-10 22 M3 3 L11 21" fill="none" stroke-width="5" stroke="${a}" stroke-linecap="round"/><circle r="5"/></g>`;
                if (D.acc.flower) out += `<g transform="translate(${CX - R * 0.68} ${cy - R * 0.5})"><g fill="#fff" stroke="${ln}" stroke-width="1.6"><circle cy="-7" r="6"/><circle cx="6.7" cy="-2" r="6"/><circle cx="4.1" cy="5.7" r="6"/><circle cx="-4.1" cy="5.7" r="6"/><circle cx="-6.7" cy="-2" r="6"/></g><circle r="4.4" fill="#ffd54f"/></g>`;
                if (D.acc.glasses) out += `<g fill="#ffffff" fill-opacity=".18" stroke="#5a3d3d" stroke-width="2.6"><circle cx="${CX - ex}" cy="${ey}" r="${16 * D.eyeSize}"/><circle cx="${CX + ex}" cy="${ey}" r="${16 * D.eyeSize}"/></g><path d="M${CX - ex + 16 * D.eyeSize} ${ey - 2} Q${CX} ${ey - 8} ${CX + ex - 16 * D.eyeSize} ${ey - 2}" stroke="#5a3d3d" stroke-width="2.6" fill="none"/>`;
                return out;
            }

            return { g, hairBack, hairFront, head, faceFeatures, bodySkin, hands, sleeves, bottomWear, topWear, dressWear, hanbokSleeves, shoes, tie, accessories };
        }

        /* ---------- 직접 그린 조각 (어려움 버전) ---------- */
        function dollLayerPath(pts, closed) {
            let d = `M${pts[0][0]} ${pts[0][1]}`;
            const seg = p => p.length >= 4 ? ` Q${p[2]} ${p[3]} ${p[0]} ${p[1]}` : ` L${p[0]} ${p[1]}`;
            for (let i = 1; i < pts.length; i++) d += seg(pts[i]);
            if (closed) d += (pts[0].length >= 4 ? seg(pts[0]) : '') + 'Z';
            return d;
        }
        function dollLayerSVG(L, i, pfx, defs) {
            if (L.hidden) return '';
            const op = L.op < 1 ? ` opacity="${L.op}"` : '';
            if (L.kind === 'brush') {
                const pts = L.pts.map(p => p[0] + ',' + p[1]).join(' ');
                return L.pts.length === 1
                    ? `<circle data-li="${i}" cx="${L.pts[0][0]}" cy="${L.pts[0][1]}" r="${L.w / 2}" fill="${L.stroke}"${op}/>`
                    : `<polyline data-li="${i}" points="${pts}" fill="none" stroke="${L.stroke}" stroke-width="${L.w}" stroke-linecap="round" stroke-linejoin="round"${op}/>`;
            }
            if (L.kind === 'line') return `<path data-li="${i}" d="${dollLayerPath(L.pts, false)}" fill="none" stroke="${L.stroke}" stroke-width="${L.w}" stroke-linecap="round" stroke-linejoin="round"${op}/>`;
            let fill = L.fill;
            if (L.pat !== 'none') { const id = `${pfx}-lp${i}`; defs.push(dollPatternDef(id, { color: L.fill, pat: L.pat, patColor: L.patColor, patSize: 1 })); fill = `url(#${id})`; }
            return `<path data-li="${i}" d="${dollLayerPath(L.pts, true)}" fill="${fill}" stroke="${L.stroke}" stroke-width="${L.w}" stroke-linejoin="round"${op}/>`;
        }

        const DOLL_BGS = pfx => ({
            dots: `<rect x="-200" y="-200" width="700" height="900" fill="#ffeef3"/><pattern id="${pfx}-bgp" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="3" fill="#fff"/><circle cx="19" cy="19" r="3" fill="#fff"/></pattern><rect x="-200" y="-200" width="700" height="900" fill="url(#${pfx}-bgp)"/>`,
            sky: `<linearGradient id="${pfx}-bgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe9ff"/><stop offset="1" stop-color="#fff4fb"/></linearGradient><rect x="-200" y="-200" width="700" height="900" fill="url(#${pfx}-bgg)"/><g fill="#fff" opacity=".9"><ellipse cx="60" cy="70" rx="34" ry="13"/><ellipse cx="82" cy="60" rx="20" ry="13"/><ellipse cx="240" cy="120" rx="30" ry="11"/><ellipse cx="258" cy="111" rx="16" ry="11"/></g>`,
            check: `<rect x="-200" y="-200" width="700" height="900" fill="#eef7f1"/><pattern id="${pfx}-bgp" width="32" height="32" patternUnits="userSpaceOnUse"><rect width="16" height="32" fill="#cfeedd" opacity=".7"/><rect width="32" height="16" fill="#cfeedd" opacity=".7"/></pattern><rect x="-200" y="-200" width="700" height="900" fill="url(#${pfx}-bgp)"/>`,
            room: `<rect x="-200" y="-200" width="700" height="900" fill="#fff6e8"/><pattern id="${pfx}-bgp" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="12" height="24" fill="#ffe7c7"/></pattern><rect x="-200" y="-200" width="700" height="550" fill="url(#${pfx}-bgp)"/><rect x="-200" y="350" width="700" height="400" fill="#f3d2b3"/><rect x="-200" y="346" width="700" height="8" fill="#e8b994"/>`,
            none: ''
        });

        /* ---------- 인형 전체 SVG ----------
           opts.bg    : 배경 그리기 (인형방·자랑 카드) / false면 투명 (일기에 붙일 때)
           opts.crop  : 인형 둘레만 잘라내기 (일기 스티커용)
           opts.pfx   : 무늬 id 앞머리 (한 화면에 인형이 여러 개일 때 겹치지 않게)
           opts.upto  : 다시보기용 (몇 번째 조각까지 그릴지) */
        function dollSVG(D, opts = {}) {
            const pfx = opts.pfx || 'dl', P = dollParts(D, pfx), g = P.g, defs = [];
            ['top', 'bottom', 'dress'].forEach(p => defs.push(dollPatternDef(`${pfx}-pat-${p}`, D.cloth[p])));
            const upto = opts.upto == null ? D.layers.length : opts.upto;
            const layers = slot => D.layers.map((L, i) => (i < upto && L.slot === slot) ? dollLayerSVG(L, i, pfx, defs) : '').join('');
            const usingDress = D.dress !== 'none';
            const bw = usingDress ? { under: '', over: '' } : P.bottomWear();
            let body = '';
            body += `<ellipse cx="${DOLL_CX}" cy="${g.footY + 10}" rx="62" ry="9" fill="#000" opacity=".08"/>`;
            body += `<g class="dl-slot" data-slot="back">${layers('back')}</g>`;
            body += P.hairBack() + P.bodySkin() + P.shoes();
            if (usingDress) body += P.dressWear() + (D.dress === 'hanbok' ? P.hanbokSleeves() : P.sleeves('dress', D.cloth.dress.sleeve));
            else body += bw.under + P.topWear() + P.tie() + bw.over + (D.top !== 'none' ? P.sleeves('top', D.cloth.top.sleeve) : '');
            body += `<g class="dl-slot" data-slot="cloth">${layers('cloth')}</g>`;
            body += P.hands() + P.head() + P.faceFeatures();
            body += `<g class="dl-slot" data-slot="face">${layers('face')}</g>`;
            body += P.hairFront();
            body += `<g class="dl-slot" data-slot="hair">${layers('hair')}</g>`;
            body += P.accessories();
            body += `<g class="dl-slot" data-slot="top">${layers('top')}</g>`;
            if (D.flip) body = `<g transform="translate(${DOLL_W} 0) scale(-1 1)">${body}</g>`;
            let vb = `0 0 ${DOLL_W} ${DOLL_H}`;
            if (opts.crop) {
                const top = Math.max(0, g.cy - g.R - 40), bottom = Math.min(DOLL_H, g.footY + 22);
                vb = `30 ${top} 240 ${bottom - top}`;
            }
            const bg = opts.bg === false ? '' : (DOLL_BGS(pfx)[D.bg] || '');
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${opts.attrs ? ' ' + opts.attrs : ''}><defs>${defs.join('')}</defs>${bg}${body}</svg>`;
        }

        function dollDataUrl(D, opts) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(dollSVG(D, opts)); }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['doll-render'] = true;
