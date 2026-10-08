/* 말랑달콤 다이어리 - js/peelfx.js
   🏷️ 씰스티커처럼 떼어지는 연출 (짧게 저절로) : 🍭 미니시트에서 뗄 때(js/stickerpack.js) · 페이지에 붙은 스티커를 옮길 때(js/elements.js makeTransformable)
   - 끄는 방향 뒤쪽 가장자리가 먼저 들려서 앞으로 접혀 넘어가요 (접힌 쪽은 크림색 뒷면 + 그림자)
   - pfxPeel(el, x, y, dx, dy, rotDeg, done) : 화면 좌표 (x, y)를 잡고 (dx, dy) 방향으로 떼기 · 끝나면 done() · 돌려준 함수를 부르면 바로 멈춰요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (연출 없이 바로 떠요) */

        const PFX_MS = 190, PFX_UPTO = .72;
        function pfxPeel(el, x, y, dx, dy, rotDeg, done) {
            const w = el.offsetWidth, h = el.offsetHeight, len = Math.hypot(dx, dy);
            if (!w || !h || !len) { done(); return () => {}; }
            /* 화면 → 스티커 안쪽 좌표 (회전 · 크기 되돌리기) */
            const r = el.getBoundingClientRect(), a = (rotDeg || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
            const S = r.width / (w * Math.abs(c) + h * Math.abs(s)) || 1;
            const qx = (x - (r.left + r.width / 2)) / S, qy = (y - (r.top + r.height / 2)) / S;
            const G = [w / 2 + qx * c + qy * s, h / 2 - qx * s + qy * c];
            const n = [(dx * c + dy * s) / len, (-dx * s + dy * c) / len];
            /* 잡은 곳에서 끄는 반대쪽으로 가장 먼 가장자리 = 처음 들리는 곳(C) · 그 맞은편까지 길이(span) */
            const hit = (p, d) => { let t = 1e9; if (d[0]) t = Math.min(t, ((d[0] > 0 ? w : 0) - p[0]) / d[0]); if (d[1]) t = Math.min(t, ((d[1] > 0 ? h : 0) - p[1]) / d[1]); return Math.max(0, t); };
            const P = [Math.min(w, Math.max(0, G[0])), Math.min(h, Math.max(0, G[1]))];
            const back = hit(P, [-n[0], -n[1]]), C = [P[0] - n[0] * back, P[1] - n[1] * back], span = hit(C, n);

            /* 접혀 넘어간 뒷면 : 감싸는 상자(뒤집기 + 그림자) 안에 똑같이 생긴 복사본(크림색 · 반쪽만) */
            const wrap = document.createElement('div'), cs = getComputedStyle(el);
            wrap.className = 'pfx-flap';
            Object.assign(wrap.style, { position: cs.position === 'fixed' ? 'fixed' : 'absolute', left: el.offsetLeft + 'px', top: el.offsetTop + 'px', width: w + 'px', height: h + 'px', zIndex: cs.zIndex });
            const cp = el.cloneNode(true);
            cp.querySelectorAll('.handle, .rot-zone').forEach(q => q.remove());
            cp.classList.remove('selected', 'lifting', 'drag', 'back');
            Object.assign(cp.style, { position: 'absolute', left: '0', top: '0', margin: '0', transform: 'none', width: w + 'px', height: h + 'px', boxSizing: 'border-box' });
            cp.classList.add('pfx-back');
            wrap.appendChild(cp);
            el.parentNode.insertBefore(wrap, el.nextSibling);

            const half = (M, sg) => { const p = [-n[1] * 4000, n[0] * 4000], q = [n[0] * 4000 * sg, n[1] * 4000 * sg];
                return `polygon(${M[0] + p[0]}px ${M[1] + p[1]}px, ${M[0] - p[0]}px ${M[1] - p[1]}px, ${M[0] - p[0] + q[0]}px ${M[1] - p[1] + q[1]}px, ${M[0] + p[0] + q[0]}px ${M[1] + p[1] + q[1]}px)`; };
            const base = el.style.transform, t0 = performance.now();
            let raf = 0, over = false;
            const frame = now => {
                if (over) return;
                const k = Math.min(1, (now - t0) / PFX_MS), e = 1 - Math.pow(1 - k, 2), d = Math.max(.5, span * 2 * PFX_UPTO * e);
                const M = [C[0] + n[0] * d / 2, C[1] + n[1] * d / 2], md = M[0] * n[0] + M[1] * n[1];
                el.style.clipPath = half(M, 1);                                       // 아직 붙어 있는 쪽
                cp.style.clipPath = half(M, -1);                                      // 들린 쪽 → 접는 선으로 뒤집어요
                const A = 1 - 2 * n[0] * n[0], B = -2 * n[0] * n[1], D = 1 - 2 * n[1] * n[1];
                wrap.style.transform = `${base} translate(${-w / 2}px, ${-h / 2}px) matrix(${A}, ${B}, ${B}, ${D}, ${2 * md * n[0]}, ${2 * md * n[1]}) translate(${w / 2}px, ${h / 2}px)`;
                if (k < 1) raf = requestAnimationFrame(frame); else { stop(); done(); }
            };
            const stop = () => { if (over) return; over = true; cancelAnimationFrame(raf); el.style.clipPath = ''; wrap.remove(); };
            frame(t0);
            return stop;
        }
        window.pfxPeel = pfxPeel;
