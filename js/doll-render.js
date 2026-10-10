/* 말랑달콤 다이어리 - js/doll-render.js
   👧 인형 그리기 엔진 (인형방 · 일기 페이지에 붙인 인형 공용)
   - 인형은 이미지가 아니라 '설정값(인형 데이터)'으로 저장되고, 보여줄 때마다 이 파일이 SVG 그림으로 그려요.
       예) {"v":2,"skin":"#fdead9","eyes":"basic","hairBack":"long", ..., "layers":[직접 그린 조각들], "stats":{...}}
   - 바탕 몸은 js/doll-art.js 의 그림(853 × 1844 칸)을 부위별로 색만 바꿔 그리고,
     머리·옷·신발·소품은 DOLL_FIT 기준선에 맞춰 이 파일이 그려요.
   - 어려움 버전 : 펜·붓으로 직접 그린 조각(layers) — 300 × 470 칸 점 좌표로 저장
   - 다른 사람이 만든 인형 파일도 sanitizeDoll()로 검사한 뒤에만 그려요 (정해진 값만 통과)
   ※ 파일 불러오는 순서: … → pattern-maker → doll-art → doll-render → doll-store → doll-room → service */

        const DOLL_W = 300, DOLL_H = 470, DOLL_CX = 150;
        const DOLL_MAX_JSON = Infinity;        // 인형 하나 용량 제한 없음
        const DOLL_MAX_LAYERS = 400, DOLL_MAX_PTS = 800;
        const DOLL_ART_K = DOLL_H / 1844, DOLL_ART_X = (DOLL_W - 853 * DOLL_ART_K) / 2;   // 바탕 그림 → 300 × 470 칸

        /* ---------- 처음 모습 : 맨몸 인형 (머리·옷 없음) ---------- */
        const DOLL_MANNEQUIN = {
            v: 2, name: '', by: '',
            skin: '#fdead9', eyes: 'basic', eyeColor: '#8c564c', brows: 'basic', mouth: 'cat',
            blush: '#ff8fa3', blushA: 0, lip: '#ff5c7a', lipA: 0, shadow: '#c9a7ff', shadowA: 0, lashes: false, freckles: false,
            hairBack: 'none', hairFront: 'none', hairColor: '#7a4b3a', inner: '#fdbed1',
            hairCut: 1844, bangCut: 1844, hairGrow: 1, hairSway: 0, hairTip: '#f5a3c0', hairTipA: 0,      // 💇 미용실 : 자른 높이(바탕 그림 칸) · 기른 정도 · 빗질 · 끝 물들이기
            top: 'none', bottom: 'none', dress: 'none', shoes: 'none',
            acc: { bow: false, headband: false, crown: false, glasses: false, beret: false, flower: false, tie: false },
            accColor: '#ff6b8f', bg: 'dots', flip: false,
            cloth: {
                top:    { color: '#ffffff', pat: 'none', patColor: '#ffd1dc', patSize: 1, sleeve: 'short', len: 0.5, slen: 0.42, fl: 1 },
                bottom: { color: '#ff9fb6', pat: 'none', patColor: '#ffffff', patSize: 1, sleeve: 'short', len: 0.45, slen: 0.42, fl: 1 },
                dress:  { color: '#b9dcff', pat: 'none', patColor: '#ffffff', patSize: 1, sleeve: 'puff', len: 0.55, slen: 0.36, fl: 1 },
                shoes:  { color: '#ff6b8f', pat: 'none', patColor: '#ffffff', patSize: 1, sleeve: 'short', len: 0.5, slen: 0.42, fl: 1 }
            },                                                                  // ✂️ 재단 : len 기장 · slen 소매 길이 · fl 퍼짐(1 = 기본)
            paint: [],        // 🖌️ 옷에 칠한 것 (옷 안에만 보여요) { t:'b' 붓 [c, w, op, pts] | t:'s' 도장 [k, c, x, y, s] }
            patch: [],        // 🧷 옷에 붙인 것 { k, c, x, y, s, r }
            hairPaint: [],    // 🎨 머리 염색 붓 (머리 안에만 보여요)
            layers: [],
            stats: { ms: 0, hard: false, created: 0 }
        };

        const DOLL_ENUMS = {
            eyes: ['basic', 'sparkle', 'smile', 'wink', 'sleepy', 'heart'], brows: ['basic', 'worried', 'strong', 'none'],
            mouth: ['cat', 'smile', 'open', 'o', 'pout'],
            hairBack: ['none', 'long', 'bob', 'twin', 'pony', 'bun', 'short'], hairFront: ['none', 'blunt', 'wispy', 'side', 'part', 'up', 'spiky'],
            top: ['none', 'tee', 'blouse', 'shirt', 'hoodie', 'cardigan'], bottom: ['none', 'skirt', 'suspender', 'pants'],
            dress: ['none', 'aline', 'princess', 'hanbok'], shoes: ['none', 'mary', 'sneaker', 'boots'], bg: ['dots', 'sky', 'check', 'room', 'none']
        };
        const DOLL_COLORS = ['skin', 'eyeColor', 'blush', 'lip', 'shadow', 'hairColor', 'accColor', 'inner', 'hairTip'];
        const DOLL_NUMS = { blushA: [0, 1], lipA: [0, 1], shadowA: [0, 0.8], hairCut: [200, 1844], bangCut: [200, 1844], hairGrow: [0.5, 2.5], hairSway: [-1, 1], hairTipA: [0, 1] };
        const DOLL_STAMPS = ['heart', 'star', 'dot', 'flower', 'sparkle'];
        const DOLL_PATCHES = ['button', 'heart', 'star', 'bow', 'lace', 'pocket', 'flower'];
        const DOLL_MAX_PAINT = 400;
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
                o.slen = dollNum(s.slen, [0.1, 1], o.slen); o.fl = dollNum(s.fl, [0.3, 2.2], 1);
            });
            const xy = (v, lim) => Math.round(dollNum(v, lim, 0) * 10) / 10;
            const strokes = a => (Array.isArray(a) ? a : []).slice(0, DOLL_MAX_PAINT).map(q => {
                if (!q || typeof q !== 'object') return null;
                if (q.t === 's') return DOLL_STAMPS.includes(q.k) ? { t: 's', k: q.k, c: dollColor(q.c, '#ffffff'), x: xy(q.x, [-60, 360]), y: xy(q.y, [-60, 530]), s: dollNum(q.s, [0.3, 4], 1) } : null;
                const pts = (Array.isArray(q.pts) ? q.pts : []).slice(0, DOLL_MAX_PTS).filter(p => Array.isArray(p) && p.length >= 2).map(p => [xy(p[0], [-60, 360]), xy(p[1], [-60, 530])]);
                return pts.length ? { t: 'b', c: dollColor(q.c, '#ffffff'), w: dollNum(q.w, [0.5, 40], 4), op: dollNum(q.op, [0.05, 1], 1), pts } : null;
            }).filter(Boolean);
            out.paint = strokes(d.paint); out.hairPaint = strokes(d.hairPaint);
            out.patch = (Array.isArray(d.patch) ? d.patch : []).slice(0, 120).filter(q => q && DOLL_PATCHES.includes(q.k))
                .map(q => ({ k: q.k, c: dollColor(q.c, '#ffffff'), x: xy(q.x, [-60, 360]), y: xy(q.y, [-60, 530]), s: dollNum(q.s, [0.3, 4], 1), r: Math.round(dollNum(q.r, [-180, 180], 0)) }));
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
            return { pieces: d.layers.length, pts: d.layers.reduce((s, L) => s + L.pts.length, 0), paint: d.paint.length + d.hairPaint.length + d.patch.length };
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
        function dHsl(hex) {
            const [r, g, b] = dRgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            let h = 0, s = 0; const l = (mx + mn) / 2;
            if (mx !== mn) {
                const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
                h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
            }
            return [h, s, l];
        }
        function dHex([h, s, l]) {
            const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
            return '#' + f(0) + f(8) + f(4);
        }
        /* 바탕 그림 색 바꾸기 : base 색이 to 색이 되도록 색상·채도·밝기를 같이 옮김 */
        function dRecolor(c, base, to) {
            if (base === to) return c;
            const [h, s, l] = dHsl(c), [hb, sb, lb] = dHsl(base), [ht, st, lt] = dHsl(to);
            const nl = lt >= lb ? l + (1 - l) * (lt - lb) / Math.max(0.01, 1 - lb) : l * lt / Math.max(0.01, lb);
            if (s < 0.08) return dHex([h, s, Math.max(0, Math.min(1, nl))]);
            return dHex([(h + ht - hb + 1) % 1, Math.max(0, Math.min(1, s * st / Math.max(0.05, sb))), Math.max(0, Math.min(1, nl))]);
        }
        /* 피부색 : 채널마다 같은 비율로 (선·그림자까지 자연스럽게 따라옴) */
        function dTone(c, to) {
            if (to === DOLL_MANNEQUIN.skin) return c;
            const A = dRgb(c), B = dRgb(DOLL_MANNEQUIN.skin), T = dRgb(to);
            return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v * T[i] / B[i]))).toString(16).padStart(2, '0')).join('');
        }

        /* 기준선 읽기 (DOLL_FIT) */
        function dFitRow(rows, y) {
            if (y <= rows[0][0]) return [rows[0][1], rows[0][2]];
            for (let i = 1; i < rows.length; i++) if (rows[i][0] >= y) {
                const a = rows[i - 1], b = rows[i], t = (y - a[0]) / (b[0] - a[0]);
                return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
            }
            const z = rows[rows.length - 1]; return [z[1], z[2]];
        }
        const dTorso = y => dFitRow(DOLL_FIT.torso, y);
        const dLeg = (s, y) => dFitRow(s < 0 ? DOLL_FIT.legL : DOLL_FIT.legR, y);       // [왼쪽 끝, 오른쪽 끝]
        function dArm(s, t) {
            const rows = (s < 0 ? DOLL_FIT.armL : DOLL_FIT.armR).rows;
            let a = rows[0], b = rows[rows.length - 1];
            for (let i = 1; i < rows.length; i++) if (rows[i][0] >= t) { a = rows[i - 1]; b = rows[i]; break; }
            const k = b[0] === a[0] ? 0 : Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
            const P = j => a[j] + (b[j] - a[j]) * k, p = [P(1), P(2)], q = [P(3), P(4)];
            return Math.abs(p[0] - 426) < Math.abs(q[0] - 426) ? { i: p, o: q } : { i: q, o: p };
        }
        const dN = v => Math.round(v * 10) / 10;
        const dPt = p => `${dN(p[0])} ${dN(p[1])}`;
        const dMx = p => [852 - p[0], p[1]];
        /* 점들을 부드럽게 잇는 곡선 (지금 위치가 pts[0]) */
        function dCurveTo(pts) {
            let d = '';
            for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
                d += ` C${dPt([p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6])} ${dPt([p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6])} ${dPt(p2)}`;
            }
            return d;
        }
        const dLine = pts => pts.map(p => ' L' + dPt(p)).join('');
        function dOff(p, from, e) { const dx = p[0] - from[0], dy = p[1] - from[1], n = Math.hypot(dx, dy) || 1; return [p[0] + dx / n * e, p[1] + dy / n * e]; }

        function dollPatternDef(id, c, k = 1) {
            const s = Math.round((7 + 8 * c.patSize) * k), h = s / 2, p = c.patColor, base = c.color || c.fill;
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

        /* 인형 그림 하나 만들기 : 그리는 동안만 쓰는 도우미들을 한데 묶음 (좌표는 바탕 그림 853 × 1844 칸) */
        /* ---------- ✂️ 재단 기준 (그리기 · 인형방 손잡이 공용 · 바탕 그림 칸) ---------- */
        const DOLL_SKIRT = {
            skirt:    { wy: 975, base: 1060, range: 360, flare: 0.42 },
            aline:    { wy: 962, base: 1100, range: 420, flare: 0.5 },
            princess: { wy: 962, base: 1150, range: 380, flare: 0.85, petticoat: true },
            hanbok:   { wy: 850, base: 1500, range: 260, flare: 0.5 }
        };
        const dollTopHem = len => Math.round(880 + len * 220);
        const dollPantsHem = len => Math.min(1770, 1180 + len * 590);
        const DOLL_HAIR_END = { long: 1060, bob: 690, twin: 952, pony: 842, bun: 640, short: 640 };   // 뒷머리 원래 끝
        const DOLL_HAIR_TOP = 470;                                                                   // 이 아래부터 기르기 · 빗질
        const dollHairEnd = D => D.hairBack === 'none' ? 600 : Math.min(D.hairCut, DOLL_HAIR_TOP + (DOLL_HAIR_END[D.hairBack] - DOLL_HAIR_TOP) * D.hairGrow);

        /* ---------- 🖌️ 칠한 것 · 🧷 붙인 것 (300 × 470 칸) ---------- */
        function dollStampPath(k) {
            switch (k) {
                case 'heart': return 'M0 4 C-7 -1 -5.5 -7 0 -3.5 C5.5 -7 7 -1 0 4Z';
                case 'star': return 'M0 -6 L1.8 -1.9 L6 -1.9 L2.6 0.8 L3.8 5 L0 2.5 L-3.8 5 L-2.6 0.8 L-6 -1.9 L-1.8 -1.9Z';
                case 'flower': return 'M0 -2.2 C-1.6 -7 1.6 -7 0 -2.2Z M2.1 -0.7 C6.8 -2.3 7.8 0.8 2.1 -0.7Z M1.3 1.8 C4.2 5.9 1.6 7.8 1.3 1.8Z M-1.3 1.8 C-1.6 7.8 -4.2 5.9 -1.3 1.8Z M-2.1 -0.7 C-7.8 0.8 -6.8 -2.3 -2.1 -0.7Z M0 -1.6 A1.6 1.6 0 1 0 0.01 -1.6Z';
                case 'sparkle': return 'M0 -6 Q0.8 -0.8 6 0 Q0.8 0.8 0 6 Q-0.8 0.8 -6 0 Q-0.8 -0.8 0 -6Z';
                default: return 'M0 -3 A3 3 0 1 0 0.01 -3Z';
            }
        }
        function dollPaintSVG(list) {
            return list.map(q => q.t === 's'
                ? `<path transform="translate(${q.x} ${q.y}) scale(${q.s})" d="${dollStampPath(q.k)}" fill="${q.c}"/>`
                : q.pts.length === 1 ? `<circle cx="${q.pts[0][0]}" cy="${q.pts[0][1]}" r="${q.w / 2}" fill="${q.c}" opacity="${q.op}"/>`
                : `<polyline points="${q.pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${q.c}" stroke-width="${q.w}" stroke-linecap="round" stroke-linejoin="round" opacity="${q.op}"/>`).join('');
        }
        function dollPatchSVG(q, i) {
            const c = q.c, ln = dDark(c, 0.45), lt = dLight(c, 0.5), w = 'stroke-width="0.9" stroke-linejoin="round"';
            let g = '';
            switch (q.k) {
                case 'button': g = `<circle r="4" fill="${c}" stroke="${ln}" ${w}/><circle r="2.6" fill="none" stroke="${ln}" stroke-width=".5" opacity=".6"/>` + [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, y]) => `<circle cx="${x * 0.9}" cy="${y * 0.9}" r=".45" fill="${ln}"/>`).join(''); break;
                case 'heart': g = `<path d="M0 6 C-10 -1 -8 -10 0 -5 C8 -10 10 -1 0 6Z" fill="${c}" stroke="${ln}" ${w}/><path d="M0 4.6 C-8 -1 -6.6 -8.2 0 -3.9 C6.6 -8.2 8 -1 0 4.6Z" fill="none" stroke="${lt}" stroke-width=".6" stroke-dasharray="1.2 1"/>`; break;
                case 'star': g = `<path d="M0 -8 L2.4 -2.6 L8 -2.5 L3.5 1.1 L5 7 L0 3.6 L-5 7 L-3.5 1.1 L-8 -2.5 L-2.4 -2.6Z" fill="${c}" stroke="${ln}" ${w}/><circle cx="-1.6" cy="-1.6" r="1.1" fill="#fff" opacity=".6"/>`; break;
                case 'bow': g = `<path d="M0 0 C-4 -5 -10 -5 -9 0 C-10 5 -4 5 0 0Z M0 0 C4 -5 10 -5 9 0 C10 5 4 5 0 0Z M-1 0 L-4 8 L-1.5 7.4 L0 1 L1.5 7.4 L4 8 L1 0Z" fill="${c}" stroke="${ln}" ${w}/><circle r="2" fill="${lt}" stroke="${ln}" ${w}/>`; break;
                case 'lace': g = `<path d="M-14 -2 L14 -2 L14 1${[...Array(7)].map((_, j) => ` Q${12 - j * 4} 5 ${10 - j * 4} 1`).join('')} L-14 1Z" fill="${c}" stroke="${ln}" stroke-width=".6"/>` + [...Array(7)].map((_, j) => `<circle cx="${12 - j * 4}" cy="1.6" r=".7" fill="${ln}" opacity=".45"/>`).join(''); break;
                case 'pocket': g = `<path d="M-6 -5 L6 -5 L6 3 Q6 6 3 6 L-3 6 Q-6 6 -6 3Z" fill="${c}" stroke="${ln}" ${w}/><path d="M-6 -2.4 L6 -2.4" stroke="${ln}" stroke-width=".6"/><path d="M-4.8 -1.2 L4.8 -1.2 L4.8 3 Q4.8 4.8 3 4.8 L-3 4.8 Q-4.8 4.8 -4.8 3Z" fill="none" stroke="${lt}" stroke-width=".5" stroke-dasharray="1 .8"/>`; break;
                case 'flower': g = [0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-3.6" rx="2.6" ry="3.6" transform="rotate(${a})" fill="${c}" stroke="${ln}" stroke-width=".6"/>`).join('') + `<circle r="2.2" fill="#ffe08a" stroke="#d9a832" stroke-width=".6"/>`; break;
            }
            return `<g class="dl-patch" data-pi="${i}" transform="translate(${q.x} ${q.y}) rotate(${q.r}) scale(${q.s})">${g}</g>`;
        }

        function dollParts(D, pfx, defs) {
            const C = 426;
            const cl = part => D.cloth[part];
            const fillOf = part => cl(part).pat === 'none' ? cl(part).color : `url(#${pfx}-pat-${part})`;
            const lineOf = c => dDark(c, 0.45);
            const piece = (d, fill, color, extra = '') => `<path d="${d}" fill="${fill}" stroke="${lineOf(color)}" stroke-width="5" stroke-linejoin="round"${extra}/><path d="${d}" fill="url(#${pfx}-shade)"/>`;
            const clothPiece = (d, part) => piece(d, fillOf(part), cl(part).color);
            const both = f => f(-1) + f(1);

            /* ---------- 바탕 몸 (doll-art.js) ---------- */
            function art(name, map, clip) {
                const L = DOLL_ART[name];
                if (!L) return '';
                const cid = `${pfx}-c-${name}`;
                defs.push(`<clipPath id="${cid}"><path d="${L[0][1]}"/></clipPath>`);
                const out = L.map(([c, d, f]) => {
                    const col = map('#' + c);
                    if (f === 2) return `<path d="${d}" fill="${col}" fill-rule="evenodd"/>`;
                    if (f === 1) return `<path d="${d}" fill="${col}" fill-rule="evenodd" filter="url(#${pfx}-soft)" clip-path="url(#${cid})"/>`;
                    return `<path d="${d}" fill="${col}" stroke="${col}" stroke-width="1" stroke-linejoin="round" fill-rule="evenodd"/>`;
                }).join('');
                return clip ? `<g clip-path="url(#${clip})">${out}</g>` : out;
            }
            const skin = c => dTone(c, D.skin);
            const skinArt = name => art(name, skin);
            const inner = name => art(name, c => dRecolor(c, DOLL_MANNEQUIN.inner, D.inner));
            function innerWear() {
                const ln = dDark(D.inner, 0.3);
                return inner('bottom') + inner('top') +
                    `<path d="M300 990 Q426 1000 552 990" fill="none" stroke="${ln}" stroke-width="3" opacity=".7"/>` +
                    `<path d="M426 764 C410 750 396 754 398 766 C400 778 414 776 426 768 C438 776 452 778 454 766 C456 754 442 750 426 764Z" fill="${dLight(D.inner, 0.2)}" stroke="${ln}" stroke-width="2.5"/>` +
                    `<path d="M426 768 Q420 780 414 792 M426 768 Q432 780 438 792" fill="none" stroke="${ln}" stroke-width="3" stroke-linecap="round"/>` +
                    `<path d="M420 930 Q426 946 432 930" fill="none" stroke="${dTone('#d9a593', D.skin)}" stroke-width="3" stroke-linecap="round"/>`;
            }

            /* ---------- 얼굴 ---------- */
            const EYE_INK = '#3d1911';
            const EYE_SKIN = ['#f6c7b2', '#d08a81', '#fde1ce', '#fdead9'];
            const eyeArt = clip => art('eyes', c => EYE_SKIN.includes(c) ? dTone(c, D.skin) : dRecolor(c, DOLL_MANNEQUIN.eyeColor, D.eyeColor), clip);
            const clipRect = (id, x, y, w, h) => { defs.push(`<clipPath id="${pfx}-${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>`); return `${pfx}-${id}`; };
            const arcEye = s => { const P = p => s < 0 ? p : dMx(p); return `<path d="M${dPt(P([262, 488]))} Q${dPt(P([314, 430]))} ${dPt(P([370, 482]))}" fill="none" stroke="${EYE_INK}" stroke-width="10" stroke-linecap="round"/><path d="M${dPt(P([264, 486]))} l${s * 18} -8" stroke="${EYE_INK}" stroke-width="7" stroke-linecap="round"/>`; };
            function eyes() {
                const star = (x, y, r) => `<path d="M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z" fill="#fff"/>`;
                const heart = (x, y, k) => `<path transform="translate(${x} ${y}) scale(${k})" d="M0 8 C-14 -2 -11 -14 0 -7 C11 -14 14 -2 0 8Z" fill="#ff5c8a" stroke="#fff" stroke-width=".6"/>`;
                switch (D.eyes) {
                    case 'sparkle': return eyeArt() + star(302, 452, 20) + star(526, 452, 20) + `<circle cx="340" cy="500" r="6" fill="#fff"/><circle cx="564" cy="500" r="6" fill="#fff"/>`;
                    case 'heart': return eyeArt() + heart(322, 482, 2.4) + heart(530, 482, 2.4);
                    case 'smile': return arcEye(-1) + arcEye(1);
                    case 'wink': return eyeArt(clipRect('wk', 426, 380, 300, 200)) + arcEye(-1);
                    case 'sleepy': return eyeArt(clipRect('sl', 200, 462, 460, 120)) +
                        both(s => { const P = p => s < 0 ? p : dMx(p); return `<path d="M${dPt(P([254, 466]))} Q${dPt(P([314, 452]))} ${dPt(P([376, 464]))}" fill="none" stroke="${EYE_INK}" stroke-width="10" stroke-linecap="round"/>`; });
                    default: return eyeArt();
                }
            }
            function brows() {
                const col = D.hairFront !== 'none' || D.hairBack !== 'none' ? dDark(D.hairColor, 0.25) : '#6e3f36';
                const br = (d, w) => both(s => `<path d="${s < 0 ? d : d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${852 - x} ${y}`)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`);
                switch (D.brows) {
                    case 'none': return '';
                    case 'worried': return br('M288 370 Q322 360 354 342', 9);
                    case 'strong': return br('M284 350 Q322 348 358 370', 12);
                    default: return art('brows', c => dRecolor(c, '#6e3f36', col));
                }
            }
            function mouth() {
                const lipMix = c => D.lipA > 0 ? dMix(c, D.lip, D.lipA * 0.8) : c;
                switch (D.mouth) {
                    case 'smile': return `<path d="M404 546 Q426 572 448 546" fill="none" stroke="${lipMix('#9c4a48')}" stroke-width="6" stroke-linecap="round"/>`;
                    case 'open': return `<path d="M400 543 Q426 550 452 543 Q448 584 426 586 Q404 584 400 543Z" fill="${lipMix('#c84b5c')}" stroke="#9c4a48" stroke-width="4" stroke-linejoin="round"/><path d="M410 570 Q426 560 442 570 Q436 583 426 584 Q416 583 410 570Z" fill="#ff9aae"/>`;
                    case 'o': return `<ellipse cx="426" cy="558" rx="11" ry="14" fill="${lipMix('#c84b5c')}" stroke="#9c4a48" stroke-width="4"/>`;
                    case 'pout': return `<path d="M410 553 Q418 541 426 550 Q434 541 442 553 Q426 568 410 553Z" fill="${lipMix('#e8667e')}" stroke="#b44a5c" stroke-width="3" stroke-linejoin="round"/>`;
                    default: return (D.lipA > 0 ? `<ellipse cx="426" cy="555" rx="15" ry="6" fill="${D.lip}" opacity="${dN(D.lipA * 0.7)}" filter="url(#${pfx}-soft)"/>` : '') + art('mouth', c => dTone(dMix(c, '#9c4a48', 0.35), D.skin));
                }
            }
            function makeup() {
                let o = '';
                if (D.shadowA > 0) o += both(s => { const P = p => s < 0 ? p : dMx(p); return `<path d="M${dPt(P([256, 470]))} Q${dPt(P([314, 386]))} ${dPt(P([378, 462]))} Q${dPt(P([316, 418]))} ${dPt(P([256, 470]))}Z" fill="${D.shadow}" opacity="${dN(D.shadowA)}" filter="url(#${pfx}-soft)"/>`; });
                if (D.blushA > 0) o += `<g fill="${D.blush}" opacity="${dN(D.blushA * 0.75)}" filter="url(#${pfx}-blush)"><ellipse cx="304" cy="548" rx="50" ry="25"/><ellipse cx="548" cy="548" rx="50" ry="25"/></g>`;
                if (D.freckles) o += `<g fill="${dTone('#c98d72', D.skin)}" opacity=".7">${both(s => [[286, 520], [306, 532], [324, 520], [298, 546]].map(p => { const q = s < 0 ? p : dMx(p); return `<circle cx="${q[0]}" cy="${q[1]}" r="4"/>`; }).join(''))}</g>`;
                if (D.lashes && !['smile'].includes(D.eyes)) o += both(s => { if (D.eyes === 'wink' && s < 0) return ''; const P = p => s < 0 ? p : dMx(p); return `<path d="M${dPt(P([262, 452]))} l${s * 22} -16 M${dPt(P([258, 468]))} l${s * 24} -5 M${dPt(P([270, 440]))} l${s * 14} -20" fill="none" stroke="${EYE_INK}" stroke-width="6" stroke-linecap="round"/>`; });
                return o;
            }

            /* ---------- 머리카락 ---------- */
            const HC = D.hairColor, HL = dDark(HC, 0.5), HD = dDark(HC, 0.22);
            defs.push(`<linearGradient id="${pfx}-hgF" gradientUnits="userSpaceOnUse" x1="0" y1="100" x2="0" y2="440"><stop offset="0" stop-color="${dLight(HC, 0.22)}"/><stop offset=".55" stop-color="${HC}"/><stop offset="1" stop-color="${HD}"/></linearGradient>`);
            defs.push(`<linearGradient id="${pfx}-hgB" gradientUnits="userSpaceOnUse" x1="0" y1="150" x2="0" y2="1060"><stop offset="0" stop-color="${HC}"/><stop offset="1" stop-color="${HD}"/></linearGradient>`);
            const hairSt = g => `fill="url(#${pfx}-${g})" stroke="${HL}" stroke-width="5" stroke-linejoin="round"`;
            const BANGS = {
                blunt: [[632, 382], [606, 350], [572, 338], [548, 346], [516, 336], [484, 344], [452, 334], [426, 342], [400, 334], [368, 344], [336, 336], [304, 346], [280, 338], [246, 350], [220, 382]],
                wispy: [[632, 382], [612, 330], [590, 362], [560, 272], [530, 356], [494, 266], [456, 352], [426, 256], [396, 352], [358, 266], [322, 356], [292, 272], [262, 362], [240, 330], [220, 382]],
                side: [[632, 384], [614, 376], [590, 372], [560, 330], [530, 350], [490, 300], [452, 318], [410, 268], [372, 286], [330, 240], [296, 262], [262, 226], [240, 300], [220, 382]],
                part: [[632, 384], [616, 356], [588, 318], [548, 262], [500, 216], [446, 194], [426, 208], [406, 194], [352, 216], [304, 262], [264, 318], [236, 356], [220, 384]],
                up: [[632, 384], [620, 320], [586, 254], [526, 208], [460, 192], [426, 194], [392, 192], [326, 208], [266, 254], [232, 320], [220, 384]],
                spiky: [[632, 382], [606, 330], [584, 372], [554, 300], [520, 368], [486, 290], [456, 372], [426, 286], [396, 372], [366, 290], [332, 368], [298, 300], [268, 372], [246, 330], [220, 382]]
            };
            function hairFront() {
                if (D.hairFront === 'none') return '';
                const edge = BANGS[D.hairFront], up = D.hairFront === 'up';
                const lockLen = up ? 470 : 600;
                const lockR = [[662, 400], [660, 470], [648, lockLen - 60], [622, lockLen]], lockRi = [[622, lockLen], [630, lockLen - 70], [634, 450], [636, 392]];
                const lockLi = [[216, 392], [218, 450], [222, lockLen - 70], [230, lockLen]], lockL = [[230, lockLen], [204, lockLen - 60], [192, 470], [190, 400]];
                let d = `M${dPt(lockL[0])}${dCurveTo(lockL)} C186 200 290 102 426 102 C562 102 666 200 662 400${dCurveTo(lockR)}${dCurveTo(lockRi)} L${dPt(edge[0])}`;
                d += D.hairFront === 'spiky' ? dLine(edge.slice(1)) : dCurveTo(edge);
                d += ` L${dPt(lockLi[0])}${dCurveTo(lockLi)}Z`;
                defs.push(`<clipPath id="${pfx}-hcF"><path d="${d}"/></clipPath>`);
                const tips = edge.filter((p, i) => i > 0 && i < edge.length - 1 && p[1] > edge[i - 1][1] && p[1] > edge[i + 1][1]);
                const strands = tips.map(p => `M${dPt([C + (p[0] - C) * 0.55, 170])} Q${dPt([C + (p[0] - C) * 0.9, (p[1] + 170) / 2])} ${dPt([p[0], p[1] - 14])}`).join(' ');
                return `<path d="${d}" ${hairSt('hgF')}/>` +
                    `<g clip-path="url(#${pfx}-hcF)"><path d="${strands} M214 420 Q206 500 226 ${lockLen - 20} M638 420 Q646 500 626 ${lockLen - 20}" fill="none" stroke="${HD}" stroke-width="4" stroke-linecap="round" opacity=".55"/>` +
                    `<path d="M262 236 Q426 150 590 236" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-dasharray="46 22" opacity=".28"/></g>`;
            }
            function hairBack() {
                if (D.hairBack === 'none') return '';
                const st = hairSt('hgB');
                const SHORT = 'M196 470 C188 330 260 112 426 110 C592 112 664 330 656 470 C652 560 624 606 586 618 C520 640 332 640 266 618 C228 606 200 560 196 470Z';
                const tie = (x, y) => `<circle cx="${x}" cy="${y}" r="22" fill="${D.accColor}" stroke="${dDark(D.accColor, 0.4)}" stroke-width="4"/><circle cx="${x - 6}" cy="${y - 7}" r="6" fill="#fff" opacity=".6"/>`;
                const strand = d => `<path d="${d}" fill="none" stroke="${HD}" stroke-width="4" stroke-linecap="round" opacity=".55"/>`;
                switch (D.hairBack) {
                    case 'long': return `<path ${st} d="M184 430 C180 290 252 102 426 100 C600 102 672 290 668 430 C676 560 700 660 704 780 C708 880 728 950 700 1010 C680 1050 640 1030 620 1050 C600 1070 560 1050 540 1060 L312 1060 C292 1050 252 1070 232 1050 C212 1030 172 1050 152 1010 C124 950 144 880 148 780 C152 660 176 560 184 430Z"/>` +
                        strand('M180 620 C170 760 180 880 160 980 M672 620 C682 760 672 880 692 980 M200 700 C200 820 220 920 210 1030 M652 700 C652 820 632 920 642 1030');
                    case 'bob': return `<path ${st} d="M184 440 C180 300 252 104 426 102 C600 104 672 300 668 440 C672 540 690 610 662 660 C640 696 590 688 560 664 C500 676 352 676 292 664 C262 688 212 696 190 660 C162 610 180 540 184 440Z"/>` +
                        strand('M196 520 C192 590 200 640 214 670 M656 520 C660 590 652 640 638 670');
                    case 'twin': return both(s => {
                        const P = d => s < 0 ? d : d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${852 - x} ${y}`);
                        return `<path ${st} d="${P('M214 300 C140 320 116 420 136 520 C152 600 116 680 128 760 C138 840 108 900 150 952 C150 900 192 860 188 790 C184 720 216 650 208 570 C200 480 238 400 252 330Z')}"/>` +
                            strand(P('M188 380 C150 470 168 560 150 660 C140 760 150 840 140 900'));
                    }) + `<path ${st} d="${SHORT}"/>` + tie(222, 318) + tie(630, 318);
                    case 'pony': return `<path ${st} d="M560 160 C660 150 760 230 742 360 C730 450 770 540 744 640 C726 720 760 790 720 842 C716 780 690 740 694 680 C700 600 662 520 676 440 C690 340 640 250 560 220Z"/>` +
                        strand('M640 220 C710 300 700 420 712 520 C722 620 716 700 724 790') + `<path ${st} d="${SHORT}"/>` + tie(584, 196);
                    case 'bun': return `<circle cx="426" cy="96" r="84" ${st}/>` + strand('M372 84 Q426 30 478 88 Q456 136 410 116') + `<path ${st} d="${SHORT}"/>`;
                    default: return `<path ${st} d="${SHORT}"/>`;
                }
            }

            /* ---------- 옷 ---------- */
            const sleeveT = { short: 0.42, puff: 0.36, long: 0.78 };
            function sleeve(s, kind, fill, color, len) {
                if (!sleeveT[kind]) return '';
                const t1 = len || sleeveT[kind], N = 12, outer = [], inn = [];
                for (let k = 0; k <= N; k++) {
                    const t = t1 * k / N, a = dArm(s, t), e = kind === 'puff' ? 10 + 30 * Math.sin(Math.PI * Math.min(1, k / N * 1.05)) : 9;
                    outer.push(dOff(a.o, a.i, e));
                    if (t >= Math.min(0.3, t1 * 0.7)) inn.unshift(dOff(a.i, a.o, kind === 'puff' ? e * 0.6 : e));
                }
                const pit = [s < 0 ? 300 : 552, 872], top = [s < 0 ? 318 : 534, 700], cap = [s < 0 ? 318 : 534, 660], cc = [s < 0 ? 272 : 580, 652];
                const d = `M${dPt(cap)} Q${dPt(cc)} ${dPt(outer[0])}${dCurveTo(outer)} L${dPt(inn[0])}${dCurveTo(inn)} L${dPt(pit)} L${dPt(top)}Z`;
                const c1 = dArm(s, t1 - 0.035);
                const cuff = kind === 'puff'
                    ? `<path d="M${dPt(dOff(c1.o, c1.i, 12))} L${dPt(dOff(c1.i, c1.o, 8))}" stroke="${lineOf(color)}" stroke-width="4" fill="none"/>` +
                      [0.3, 0.5, 0.7].map(f => { const a = dArm(s, t1 * 0.84), b = dArm(s, t1 * 0.97); const p = [a.o[0] + (a.i[0] - a.o[0]) * f, a.o[1] + (a.i[1] - a.o[1]) * f], q = [b.o[0] + (b.i[0] - b.o[0]) * f, b.o[1] + (b.i[1] - b.o[1]) * f]; return `<path d="M${dPt(p)} L${dPt(q)}" stroke="${lineOf(color)}" stroke-width="3" opacity=".5"/>`; }).join('')
                    : `<path d="M${dPt(dOff(c1.o, c1.i, 9))} L${dPt(dOff(c1.i, c1.o, 9))}" stroke="${lineOf(color)}" stroke-width="4" fill="none"/>`;
                return piece(d, fill, color) + cuff;
            }
            /* 몸판 : 목 → 어깨 → 옆구리 → 밑단 */
            function bodice(hem, sleeveless, neck) {
                const L = [];
                for (let y = 900; y < hem; y += 25) L.push([dTorso(y)[0] - 8, y]);
                L.push([dTorso(hem)[0] - 8, hem]);
                const sh = sleeveless ? [[330, 672], [318, 700], [306, 790], [300, 880]] : [[296, 690], [290, 730], [296, 810], [300, 880]];
                const left = sh.concat(L), right = left.map(dMx).reverse();
                const nL = [386, 644], nR = [466, 644];
                const nk = neck === 'v' ? ` L426 760 L${dPt(nL)}` : neck === 'square' ? ` L460 700 L392 700 L${dPt(nL)}` : ` Q426 ${neck === 'deep' ? 730 : 704} ${dPt(nL)}`;
                return `M${dPt(nL)} Q${dPt([336, 644])} ${dPt(left[0])}${dCurveTo(left)} Q426 ${hem + 16} ${dPt(right[0])}${dCurveTo(right)} Q${dPt([516, 644])} ${dPt(nR)}${nk}Z`;
            }
            function skirt(part, len, o) {
                const wy = o.wy || 975, hem = (o.base || 1060) + len * (o.range || 360), fl = (o.flare || 0.42) * cl(part).fl;
                const [wl, wr] = dTorso(wy), l = wl - 6, r = wr + 6, hl = l - (hem - wy) * fl, hr = r + (hem - wy) * fl;
                const n = 9, step = (hr - hl) / n;
                let wave = '';
                for (let i = 1; i <= n; i++) wave += ` Q${dN(hr - step * (i - 0.5))} ${dN(hem + 16)} ${dN(hr - step * i)} ${dN(hem)}`;
                const d = `M${dN(l)} ${wy} L${dN(r)} ${wy} Q${dN(r + (hr - r) * 0.3 + 12)} ${dN((wy + hem) / 2)} ${dN(hr)} ${dN(hem)}${wave} Q${dN(l + (hl - l) * 0.3 - 12)} ${dN((wy + hem) / 2)} ${dN(l)} ${wy}Z`;
                const fill = o.fill || fillOf(part), color = o.color || cl(part).color;
                let out = '';
                if (o.petticoat) {
                    const ph = hem + 26, pl = l - (ph - wy) * fl, pr = r + (ph - wy) * fl, ps = (pr - pl) / 12;
                    let pw = ''; for (let i = 1; i <= 12; i++) pw += ` Q${dN(pr - ps * (i - 0.5))} ${dN(ph + 18)} ${dN(pr - ps * i)} ${dN(ph)}`;
                    out += piece(`M${dN(l)} ${wy + 40} L${dN(r)} ${wy + 40} L${dN(pr)} ${dN(ph)}${pw} L${dN(l)} ${wy + 40}Z`, '#ffffff', '#f3d6de');
                }
                out += piece(d, fill, color);
                const pleat = [1, 2, 3, 4].map(k => `M${dN(l + (r - l) * k / 5)} ${wy + 30} Q${dN(l + (r - l) * k / 5 + (hl + (hr - hl) * k / 5 - l - (r - l) * k / 5) * 0.4)} ${dN((wy + hem) / 2)} ${dN(hl + (hr - hl) * k / 5)} ${dN(hem + 6)}`).join(' ');
                out += `<path d="${pleat}" fill="none" stroke="${lineOf(color)}" stroke-width="4" opacity=".35"/>`;
                return { svg: out, hem, wy, l, r };
            }
            function waistband(y, part) {
                const [wl, wr] = dTorso(y);
                return clothPiece(`M${dN(wl - 7)} ${y} L${dN(wr + 7)} ${y} L${dN(wr + 8)} ${y + 28} L${dN(wl - 8)} ${y + 28}Z`, part);
            }
            function pants() {
                const len = cl('bottom').len, hem = dollPantsHem(len), wy = 975;
                const wide = y => Math.max(0, (cl('bottom').fl - 1) * 90 * (y - 1040) / Math.max(1, hem - 1040));   // ✂️ 통 넓히기
                const oL = [[dTorso(wy)[0] - 6, wy]], iL = [], oR = [], iR = [];
                for (let y = 1040; y < hem; y += 30) oL.push([dLeg(-1, y)[0] - 10 - wide(y), y]);
                oL.push([dLeg(-1, hem)[0] - 12 - wide(hem), hem]);
                for (let y = hem; y > 1150; y -= 30) iL.push([dLeg(-1, y)[1] + 6, y]);
                iL.push([dLeg(-1, 1150)[1] + 4, 1150]);
                for (let y = 1150; y < hem; y += 30) iR.push([dLeg(1, y)[0] - 6, y]);
                iR.push([dLeg(1, hem)[0] - 6, hem]);
                for (let y = hem; y > 1040; y -= 30) oR.push([dLeg(1, y)[1] + (y === hem ? 12 : 10) + wide(y), y]);
                oR.push([dTorso(wy)[1] + 6, wy]);
                const d = `M${dPt(oL[0])}${dCurveTo(oL)} L${dPt(iL[0])}${dCurveTo(iL)} L426 1128 L${dPt(iR[0])}${dCurveTo(iR)} L${dPt(oR[0])}${dCurveTo(oR)}Z`;
                const ln = lineOf(cl('bottom').color);
                return clothPiece(d, 'bottom') + waistband(wy, 'bottom') +
                    `<path d="M436 1003 Q438 1060 428 1110 M300 1010 Q330 1040 342 1004 M552 1010 Q522 1040 510 1004" fill="none" stroke="${ln}" stroke-width="4" opacity=".6"/>` +
                    (hem > 1300 ? `<path d="M${dPt(dOff([dLeg(-1, hem)[0] - 12, hem - 24], [dLeg(-1, hem)[1], hem - 24], 0))} L${dPt([dLeg(-1, hem)[1] + 6, hem - 24])} M${dPt([dLeg(1, hem)[0] - 6, hem - 24])} L${dPt([dLeg(1, hem)[1] + 12, hem - 24])}" stroke="${ln}" stroke-width="4" opacity=".6"/>` : '');
            }
            const btn = (x, y, c, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" stroke="${lineOf(c)}" stroke-width="3"/>`;
            function topWear() {
                const t = D.top, color = cl('top').color, ln = lineOf(color), white = color === '#ffffff' ? '#ffeef3' : '#ffffff';
                const hem = dollTopHem(cl('top').len);
                let o = clothPiece(bodice(hem, cl('top').sleeve === 'none', t === 'cardigan' ? 'v' : 'round'), 'top');
                switch (t) {
                    case 'tee': o += `<path d="M396 664 Q426 690 456 664" fill="none" stroke="${ln}" stroke-width="4" opacity=".6"/>`; break;
                    case 'blouse':
                        o += both(s => { const P = p => s < 0 ? p : dMx(p); return piece(`M${dPt(P([426, 690]))} Q${dPt(P([390, 652]))} ${dPt(P([372, 656]))} Q${dPt(P([344, 700]))} ${dPt(P([372, 728]))} Q${dPt(P([406, 736]))} ${dPt(P([426, 690]))}Z`, white, white); });
                        o += `<path d="M426 696 C402 670 384 688 398 702 C408 712 420 704 426 698 C432 704 444 712 454 702 C468 688 450 670 426 696Z" fill="${D.accColor}" stroke="${dDark(D.accColor, 0.4)}" stroke-width="3"/>`;
                        break;
                    case 'shirt':
                        o += `<path d="M426 700 L426 ${hem}" stroke="${ln}" stroke-width="4"/>` + [760, 830, 900, 970].filter(y => y < hem - 20).map(y => btn(440, y, white, 7)).join('');
                        o += both(s => { const P = p => s < 0 ? p : dMx(p); return piece(`M${dPt(P([426, 698]))} L${dPt(P([384, 650]))} L${dPt(P([360, 662]))} L${dPt(P([376, 722]))}Z`, white, white); });
                        break;
                    case 'hoodie':
                        o += `<path d="M406 690 L398 800 M446 690 L454 800" stroke="${white}" stroke-width="6" stroke-linecap="round"/>` + btn(398, 804, white, 6) + btn(454, 804, white, 6);
                        o += clothPiece(`M340 ${hem - 150} L512 ${hem - 150} L548 ${hem - 40} L304 ${hem - 40}Z`, 'top') + `<path d="M296 ${hem - 26} Q426 ${hem - 12} 556 ${hem - 26}" fill="none" stroke="${ln}" stroke-width="4" opacity=".6"/>`;
                        break;
                    case 'cardigan':
                        o += piece(`M392 652 L460 652 L438 760 L438 ${hem} L414 ${hem} L414 760Z`, white, white);
                        o += [790, 860, 930].filter(y => y < hem - 20).map(y => btn(448, y, dLight(color, 0.5), 8)).join('') + `<path d="M298 ${hem - 24} Q426 ${hem - 10} 554 ${hem - 24}" fill="none" stroke="${ln}" stroke-width="4" opacity=".6"/>`;
                        break;
                }
                return o;
            }
            function cuffBand(s, t0, t1, color) {
                const a = dArm(s, t0), b = dArm(s, t1);
                return piece(`M${dPt(dOff(a.o, a.i, 9))} L${dPt(dOff(b.o, b.i, 9))} L${dPt(dOff(b.i, b.o, 9))} L${dPt(dOff(a.i, a.o, 9))}Z`, color, color);
            }
            const sleeves = (kind, fill, color, len) => sleeve(-1, kind, fill, color, len) + sleeve(1, kind, fill, color, len);
            function hood() {
                if (D.dress !== 'none' || D.top !== 'hoodie') return '';
                return clothPiece('M296 676 C292 596 352 572 426 572 C500 572 560 596 556 676 C540 708 500 712 426 712 C352 712 312 708 296 676Z', 'top');
            }
            function bottomWear() {
                const b = D.bottom, c = cl('bottom');
                if (b === 'pants') return pants();
                if (b === 'skirt' || b === 'suspender') { const sk = skirt('bottom', c.len, DOLL_SKIRT.skirt); return sk.svg + waistband(975, 'bottom'); }
                return '';
            }
            function straps() {
                if (D.dress !== 'none' || D.bottom !== 'suspender') return '';
                const c = cl('bottom').color;
                return [[-1, 370], [1, 482]].map(([s, x]) => piece(`M${x - 13} 980 L${x + 13} 980 L${x + 13 - s * 8} 662 L${x - 13 - s * 8} 662Z`, fillOf('bottom'), c) + btn(x, 962, '#ffe08a', 9)).join('');
            }
            function dressWear(stage) {
                const dr = D.dress, c = cl('dress');
                if (dr === 'hanbok') {
                    const jeo = c.patColor, ln = lineOf(jeo);
                    if (stage === 'skirt') {
                        const sk = skirt('dress', c.len, DOLL_SKIRT.hanbok);
                        return sk.svg + piece(`M${dN(sk.l)} 850 L${dN(sk.r)} 850 L${dN(sk.r + 2)} 880 L${dN(sk.l - 2)} 880Z`, '#ffffff', '#ffffff');
                    }
                    return piece(bodice(870, false, 'v'), jeo, jeo) + sleeves('long', jeo, jeo) + both(s => cuffBand(s, 0.68, 0.78, c.color)) +
                        `<path d="M462 652 L404 790" stroke="#ffffff" stroke-width="18" stroke-linecap="round"/><path d="M462 652 L404 790" stroke="${ln}" stroke-width="3" opacity=".5"/>` +
                        `<path d="M444 800 C420 770 396 790 410 806 C420 816 436 808 444 802 C452 808 470 816 480 806 C494 790 468 770 444 800Z M440 806 Q430 900 418 990 L436 992 Q446 900 448 806 M448 806 Q462 900 470 960 L488 956 Q472 880 456 806" fill="${D.accColor}" stroke="${dDark(D.accColor, 0.4)}" stroke-width="3" stroke-linejoin="round"/>`;
                }
                const princess = dr === 'princess';
                if (stage === 'skirt') return skirt('dress', c.len, DOLL_SKIRT[dr]).svg;
                let o = clothPiece(bodice(975, c.sleeve === 'none', princess ? 'deep' : 'round'), 'dress') + sleeves(c.sleeve, fillOf('dress'), c.color, c.slen);
                if (princess) o += `<path d="M426 972 C384 930 350 954 368 984 C380 1004 412 994 426 980 C440 994 472 1004 484 984 C502 954 468 930 426 972Z M418 984 L396 1050 L414 1046 L426 990 L438 1046 L456 1050 L434 984" fill="${D.accColor}" stroke="${dDark(D.accColor, 0.4)}" stroke-width="3" stroke-linejoin="round"/>`;
                else o += `<path d="M${dN(dTorso(950)[0] - 8)} 950 Q426 962 ${dN(dTorso(950)[1] + 8)} 950" fill="none" stroke="${lineOf(c.color)}" stroke-width="4" opacity=".6"/>`;
                return o;
            }
            function shoes() {
                const k = D.shoes, c = cl('shoes').color, ln = lineOf(c);
                if (k === 'none') return '';
                return both(s => {
                    const out = y => s < 0 ? dLeg(s, y)[0] - 7 : dLeg(s, y)[1] + 7, inn = y => s < 0 ? dLeg(s, y)[1] + 6 : dLeg(s, y)[0] - 6;
                    const top = k === 'boots' ? 1540 : k === 'sneaker' ? 1688 : 1714;
                    const side = []; for (let y = top; y <= 1770; y += 20) side.push([out(y), y]);
                    const iside = []; for (let y = 1770; y >= top; y -= 20) iside.push([inn(y), y]);
                    const bx0 = side[side.length - 1][0], bx1 = iside[0][0];
                    let d = `M${dPt(side[0])}${dCurveTo(side)} Q${dN(bx0 - s * 2)} 1806 ${dN((bx0 + bx1) / 2)} 1808 Q${dN(bx1 + s * 4)} 1806 ${dPt(iside[0])}${dCurveTo(iside)}Z`;
                    let o = piece(d, c, c);
                    if (k === 'mary') o += piece(`M${dN(out(1694) + s * 2)} 1694 L${dN(inn(1694) - s * 2)} 1694 L${dN(inn(1708))} 1710 L${dN(out(1708))} 1710Z`, c, c) + btn(dN(out(1702) - s * 6), 1702, '#ffe08a', 7);
                    if (k === 'sneaker') o += piece(`M${dN(bx0 - s * 2)} 1784 L${dN(bx1 + s * 2)} 1784 L${dN(bx1 + s * 4)} 1806 Q${dN((bx0 + bx1) / 2)} 1814 ${dN(bx0 - s * 4)} 1806Z`, '#ffffff', '#eeeeee') +
                        `<path d="M${dN(out(1712) - s * 18)} 1716 L${dN(inn(1730) + s * 18)} 1730 M${dN(out(1735) - s * 18)} 1740 L${dN(inn(1752) + s * 18)} 1752" stroke="#ffffff" stroke-width="6" stroke-linecap="round"/>`;
                    if (k === 'boots') o += piece(`M${dN(out(1540) - s * 4)} 1534 L${dN(inn(1540) + s * 4)} 1534 L${dN(inn(1580) + s * 2)} 1580 L${dN(out(1580) - s * 2)} 1580Z`, dLight(c, 0.35), c);
                    o += `<ellipse cx="${dN((bx0 + bx1) / 2 - s * 10)}" cy="1780" rx="14" ry="7" fill="#fff" opacity=".45"/>`;
                    return o;
                });
            }

            /* ---------- 소품 ---------- */
            function accessories() {
                const a = D.acc, c = D.accColor, ln = dDark(c, 0.4);
                let o = '';
                if (a.headband) o += `<path d="M206 330 A232 258 0 0 1 646 330" fill="none" stroke="${ln}" stroke-width="34" stroke-linecap="round"/><path d="M206 330 A232 258 0 0 1 646 330" fill="none" stroke="${c}" stroke-width="26" stroke-linecap="round"/><path d="M250 250 A220 246 0 0 1 400 136" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".5"/>`;
                if (a.beret) o += `<g transform="rotate(-8 440 150)"><ellipse cx="440" cy="150" rx="214" ry="70" fill="${c}" stroke="${ln}" stroke-width="5"/><path d="M440 82 q-6 -26 10 -30" fill="none" stroke="${ln}" stroke-width="10" stroke-linecap="round"/><ellipse cx="380" cy="128" rx="90" ry="20" fill="#fff" opacity=".2"/></g>`;
                if (a.crown) o += `<path d="M356 132 L344 56 L390 92 L426 40 L462 92 L508 56 L496 132Z" fill="#ffd54f" stroke="#c99a2e" stroke-width="5" stroke-linejoin="round"/><circle cx="426" cy="104" r="12" fill="${c}"/><circle cx="380" cy="112" r="8" fill="#b9dcff"/><circle cx="472" cy="112" r="8" fill="#b9dcff"/>`;
                if (a.bow) o += `<g transform="translate(600 182) rotate(18)"><path d="M0 0 C-30 -60 -96 -44 -84 6 C-74 44 -24 24 0 0Z M0 0 C30 -60 96 -44 84 6 C74 44 24 24 0 0Z" fill="${c}" stroke="${ln}" stroke-width="5" stroke-linejoin="round"/><path d="M-6 6 L-30 70 L-10 64 L0 12 L10 64 L30 70 L6 6" fill="${c}" stroke="${ln}" stroke-width="5" stroke-linejoin="round"/><ellipse rx="18" ry="16" fill="${dLight(c, 0.15)}" stroke="${ln}" stroke-width="5"/></g>`;
                if (a.flower) o += `<g transform="translate(262 262)">${[0, 72, 144, 216, 288].map(r => `<circle cx="0" cy="-26" r="22" transform="rotate(${r})" fill="${dLight(c, 0.3)}" stroke="${ln}" stroke-width="4"/>`).join('')}<circle r="15" fill="#ffd54f" stroke="#c99a2e" stroke-width="4"/></g>`;
                return o;
            }
            const glasses = () => D.acc.glasses ? `<g fill="#fff" fill-opacity=".14" stroke="#5a3d3d" stroke-width="7"><circle cx="316" cy="474" r="70"/><circle cx="536" cy="474" r="70"/></g><path d="M386 466 Q426 448 466 466 M246 462 L206 448 M606 462 L646 448" fill="none" stroke="#5a3d3d" stroke-width="7" stroke-linecap="round"/>` : '';
            function tie() {
                if (!D.acc.tie) return '';
                const c = D.accColor, ln = dDark(c, 0.4);
                return `<path d="M410 664 L442 664 L436 690 L416 690Z" fill="${c}" stroke="${ln}" stroke-width="4" stroke-linejoin="round"/><path d="M416 690 L436 690 L452 810 L426 840 L400 810Z" fill="${c}" stroke="${ln}" stroke-width="4" stroke-linejoin="round"/>`;
            }

            return { skinArt, innerWear, eyes, brows, mouth, makeup, hairFront, hairBack, hood, topWear, sleeves, bottomWear, straps, dressWear, shoes, accessories, glasses, tie, fillOf };
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
           opts.upto  : 다시보기용 (몇 번째 조각까지 그릴지)
           opts.hop   : 💕 콩 한 번 뛰기 (인형방에서 콕 눌렀을 때 · live 와 같이)
           opts.live  : ✨ 살아 움직이기 (숨쉬기 · 눈 깜빡 · 고개 살랑 · 머리카락 살랑 · SVG 안의 SMIL 이라 <img> 로 붙여도 움직여요)
                        '움직임 줄이기'를 켠 기기에서는 가만히 있어요 */
        function dollSVG(D, opts = {}) {
            const pfx = opts.pfx || 'dl', defs = [], P = dollParts(D, pfx, defs);
            const PK = 1 / DOLL_ART_K;
            ['top', 'bottom', 'dress'].forEach(p => defs.push(dollPatternDef(`${pfx}-pat-${p}`, D.cloth[p], PK)));
            defs.push(`<filter id="${pfx}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>`,
                `<filter id="${pfx}-blush" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12"/></filter>`,
                `<linearGradient id="${pfx}-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a3040" stop-opacity=".16"/><stop offset=".22" stop-color="#5a3040" stop-opacity="0"/><stop offset=".78" stop-color="#5a3040" stop-opacity="0"/><stop offset="1" stop-color="#5a3040" stop-opacity=".16"/></linearGradient>`);
            const upto = opts.upto == null ? D.layers.length : opts.upto;
            const layers = slot => `<g class="dl-slot" data-slot="${slot}">${D.layers.map((L, i) => (i < upto && L.slot === slot) ? dollLayerSVG(L, i, pfx, defs) : '').join('')}</g>`;
            const A = s => s ? `<g transform="translate(${DOLL_ART_X.toFixed(2)} 0) scale(${DOLL_ART_K.toFixed(5)})">${s}</g>` : '';
            const dress = D.dress !== 'none', tucked = !['hoodie', 'cardigan'].includes(D.top);
            const top = !dress && D.top !== 'none' ? P.topWear() : '';
            const topSleeves = !dress && D.top !== 'none' ? P.sleeves(D.cloth.top.sleeve, P.fillOf('top'), D.cloth.top.color, D.cloth.top.slen) : '';
            /* 칠한 것을 그 모양 안에만 보이게 : 모양을 흰색(보임) · 검은색(가림)으로 바꾼 가리개 */
            defs.push(`<filter id="${pfx}-wh"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>`,
                `<filter id="${pfx}-bk"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>`);
            const mask = (id, inner) => { defs.push(`<mask id="${pfx}-${id}" maskUnits="userSpaceOnUse" x="-100" y="-100" width="500" height="700">${A(inner)}</mask>`); return `mask="url(#${pfx}-${id})"`; };
            const wh = s => `<g filter="url(#${pfx}-wh)">${s}</g>`, bk = s => `<g filter="url(#${pfx}-bk)">${s}</g>`;
            /* 💇 머리 : 기르기 · 빗질은 귀 아래(DOLL_HAIR_TOP)부터 · 자르기는 그 높이 아래를 잘라내요 */
            const cutClip = (id, y) => { defs.push(`<clipPath id="${pfx}-${id}"><rect x="-400" y="-400" width="1700" height="${y + 400}"/></clipPath>`); return `clip-path="url(#${pfx}-${id})"`; };
            const HT = DOLL_HAIR_TOP;
            /* ✨ 움직임 : 겉 g 에 animateTransform 만 (같은 시간이라 나눠 그린 조각끼리 맞춰 움직여요) */
            const live = !!opts.live && !(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
            const ease = n => `calcMode="spline" keyTimes="${[...Array(n)].map((_, i) => dN(i / (n - 1))).join(';')}" keySplines="${Array(n - 1).fill('.45 0 .55 1').join(';')}"`;
            const anim = (type, values, dur, extra = ease(values.split(';').length)) => `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}s" repeatCount="indefinite" ${extra}/>`;
            const around = (x, y, a, s) => live ? `<g transform="translate(${x} ${y})"><g>${a}<g transform="translate(${-x} ${-y})">${s}</g></g></g>` : s;
            const NX = dN(DOLL_ART_X + 426 * DOLL_ART_K), NY = dN(650 * DOLL_ART_K);
            const nod = s => s && live ? `<g>${anim('rotate', `0 ${NX} ${NY};1.6 ${NX} ${NY};0 ${NX} ${NY};-1.6 ${NX} ${NY};0 ${NX} ${NY}`, 7)}${s}</g>` : s;   // 고개 살랑 (목이 축)
            const blink = s => ['basic', 'sparkle', 'heart'].includes(D.eyes) ? around(0, 476, anim('scale', '1 1;1 1;1 .08;1 1;1 1', 4.6, 'keyTimes="0;.9;.93;.96;1"'), s) : s;   // 눈 깜빡
            let hb = P.hairBack();
            if (hb) {
                if (D.hairGrow !== 1 || D.hairSway || live) {
                    defs.push(`<clipPath id="${pfx}-hUp"><rect x="-400" y="-400" width="1700" height="${HT + 402}"/></clipPath><clipPath id="${pfx}-hDn"><rect x="-400" y="${HT - 1}" width="1700" height="3000"/></clipPath>`);
                    hb = `<g clip-path="url(#${pfx}-hUp)">${hb}</g><g clip-path="url(#${pfx}-hDn)">${around(426, HT, anim('skewX', '0;2.2;0;-2.2;0', 5.2), `<g transform="translate(426 ${HT}) skewX(${dN(-D.hairSway * 16)}) scale(1 ${D.hairGrow}) translate(-426 -${HT})">${hb}</g>`)}</g>`;   // 귀 아래만 살랑
                }
                if (D.hairCut < 1844) hb = `<g ${cutClip('hCut', D.hairCut)}>${hb}</g>`;
            }
            let hf = P.hairFront();
            if (hf && Math.min(D.bangCut, D.hairCut) < 1844) hf = `<g ${cutClip('fCut', Math.min(D.bangCut, D.hairCut))}>${hf}</g>`;
            let tip = '';
            if (D.hairTipA > 0 && (hb || hf)) {
                const y0 = HT * DOLL_ART_K, y1 = dollHairEnd(D) * DOLL_ART_K;
                defs.push(`<linearGradient id="${pfx}-hTip" gradientUnits="userSpaceOnUse" x1="0" y1="${dN(y0 - 30)}" x2="0" y2="${dN(Math.max(y0 + 10, y1))}"><stop offset=".25" stop-color="${D.hairTip}" stop-opacity="0"/><stop offset="1" stop-color="${D.hairTip}" stop-opacity="${D.hairTipA}"/></linearGradient>`);
                tip = `<rect x="-60" y="-60" width="420" height="600" fill="url(#${pfx}-hTip)"/>`;
            }
            const dye = (s, id) => s && (tip || D.hairPaint.length) ? `<g ${mask(id, wh(s))}>${tip}${dollPaintSVG(D.hairPaint)}</g>` : '';
            /* 👗 옷 (팔 앞 · 뒤) */
            const clothBack = P.innerWear() + P.shoes() + (dress ? P.dressWear('skirt') : (tucked ? top : '') + P.bottomWear());
            const clothFront = (dress ? P.dressWear('top') : (tucked ? '' : top) + topSleeves + P.straps()) + P.tie();
            let body = A('<ellipse cx="426" cy="1802" rx="240" ry="30" fill="#000" opacity=".08"/>');
            body += layers('back');
            body += nod(A(hb) + dye(hb, 'mHB'));
            body += A(P.hood() + P.skinArt('ears') + P.skinArt('body') + P.skinArt('legs') + clothBack + P.skinArt('arms') + clothFront);
            if (D.paint.length) body += `<g ${mask('mCl', wh(clothBack) + bk(P.skinArt('arms')) + wh(clothFront))}>${dollPaintSVG(D.paint)}</g>`;
            if (D.patch.length) body += `<g class="dl-patches">${D.patch.map(dollPatchSVG).join('')}</g>`;
            body += layers('cloth');
            body += nod(A(P.skinArt('head') + blink(P.eyes()) + P.mouth() + P.makeup()) + layers('face') +
                A(P.glasses() + hf) + dye(hf, 'mHF') + A(P.brows()) + layers('hair') + A(P.accessories()));
            body += layers('top');
            if (live) body = around(150, 462, anim('scale', '1 1;1.004 1.012;1 1', 3.6), body);   // 숨쉬기 (발이 축)
            if (live && opts.hop) body = `<g>${anim('translate', '0 0;0 -16;0 0;0 -5;0 0', 0.7, 'keyTimes="0;.3;.6;.8;1" repeatCount="1"').replace('repeatCount="indefinite" ', '')}${body}</g>`;   // 💕 콩 뛰기 (한 번)
            if (D.flip) body = `<g transform="translate(${DOLL_W} 0) scale(-1 1)">${body}</g>`;
            const vb = opts.crop ? '46 0 208 470' : `0 0 ${DOLL_W} ${DOLL_H}`;
            const bg = opts.bg === false ? '' : (DOLL_BGS(pfx)[D.bg] || '');
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${opts.attrs ? ' ' + opts.attrs : ''}><defs>${defs.join('')}</defs>${bg}${body}</svg>`;
        }

        function dollDataUrl(D, opts) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(dollSVG(D, opts)); }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['doll-render'] = true;
