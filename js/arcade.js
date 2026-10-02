/* 말랑달콤 다이어리 - js/arcade.js
   🕹️ 말랑 오락실 : 옛날 오락실 느낌의 미니 게임 + 🧠 두뇌 게임 (놀이터 → 🕹️ 오락실)
   - 옛날 게임을 그대로 옮긴 게 아니라, 누구나 쓸 수 있는 '게임 방식'으로 새로 만든 말랑달콤 게임이에요.
   - 그림은 이모지 + 직접 그린 도형, 소리는 브라우저가 만드는 8비트 소리 (파일 없음 · 트래픽 0)
   - 최고 점수는 설정(settings.json)에 함께 저장 → PC · 휴대폰 어디서나 같은 기록 (새 기록이 나올 때만 바뀌어요)
     로그인하지 않은(게스트) 때만 이 기기에 기억
   - 휴대폰 : 손가락(끌기 · 탭 · 밀기) + 화면 방향 버튼 / PC : 키보드(방향키 · 스페이스) · 마우스
   - 새 게임 추가 : 아래 ARCADE_GAMES 에 { id, name, icon, desc, how, W, H, pad, create } 를 하나 더 넣어요.
       create(host) 는 { update(dt), draw(ctx), down(x,y), move(x,y,dx,dy), up(), key(code), swipe(dir) } 를 돌려줘요. (필요한 것만)
       host : score(n) · addScore(n) · lives(n) · over() · sfx(이름) · W · H · t(놀이 시간)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (오락실만 '준비 중') */

        const ARCADE_BEST_KEY = 'malang_arcade_best';      // 게스트용 (이 기기)
        const ARCADE_BEST_SYNC = 'diary_arcade_best';      // 설정 저장소 키 (드라이브 settings.json)
        const AR_DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const AR_OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
        const arRand = (a, b) => a + Math.random() * (b - a);
        const arPick = a => a[Math.floor(Math.random() * a.length)];
        const arClamp = (v, a, b) => Math.max(a, Math.min(b, v));
        function arEmoji(ctx, ch, x, y, size) {
            ctx.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(ch, x, y);
        }
        function arRound(ctx, x, y, w, h, r) {
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
            else { ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
        }
        function arText(ctx, s, x, y, size, color, align) {
            ctx.font = 'bold ' + size + 'px "Press Start 2P", monospace';
            ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = color; ctx.fillText(s, x, y);
        }

        /* =====================================================================
           1. 🚀 별사탕 비행대 (슈팅)
           ===================================================================== */
        function arShooter(h) {
            const W = h.W, H = h.H;
            const p = { x: W / 2, y: H - 70, inv: 1.5, power: 0 };
            let shots = [], foes = [], bullets = [], items = [], sparks = [], fire = 0, spawn = 1, lives = 3, keys = {};
            const stars = Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: arRand(20, 80), r: arRand(.5, 1.6) }));
            const FOES = [{ e: '👾', hp: 1, pts: 10 }, { e: '🍭', hp: 2, pts: 25 }, { e: '🧁', hp: 3, pts: 40 }];
            h.lives(lives);
            function hit() {
                if (p.inv > 0) return;
                lives--; h.lives(lives); h.sfx('hurt'); p.inv = 2; p.power = 0;
                burst(p.x, p.y, '#ff8fb1', 18);
                if (lives <= 0) h.over();
            }
            function burst(x, y, c, n) { for (let i = 0; i < n; i++) sparks.push({ x, y, vx: arRand(-120, 120), vy: arRand(-120, 120), t: arRand(.3, .7), c }); }
            return {
                down() {}, move(x, y, dx, dy) { p.x = arClamp(p.x + dx * 1.3, 18, W - 18); p.y = arClamp(p.y + dy * 1.3, H * .45, H - 24); },
                keyDown(c) { keys[c] = true; }, keyUp(c) { keys[c] = false; },
                update(dt) {
                    const lvl = 1 + Math.floor(h.t / 25);
                    stars.forEach(s => { s.y += s.s * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } });
                    const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
                    const ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
                    p.x = arClamp(p.x + kx * 260 * dt, 18, W - 18); p.y = arClamp(p.y + ky * 260 * dt, H * .45, H - 24);
                    p.inv = Math.max(0, p.inv - dt); p.power = Math.max(0, p.power - dt);
                    if ((fire -= dt) <= 0) {                       // 자동 발사
                        fire = .2;
                        shots.push({ x: p.x, y: p.y - 18, vx: 0 });
                        if (p.power > 0) { shots.push({ x: p.x - 8, y: p.y - 12, vx: -90 }, { x: p.x + 8, y: p.y - 12, vx: 90 }); }
                        h.sfx('pew');
                    }
                    if ((spawn -= dt) <= 0) {                      // 적 무리
                        spawn = Math.max(.55, 1.6 - lvl * .12);
                        const t = FOES[Math.min(FOES.length - 1, Math.floor(Math.random() * Math.min(3, 1 + lvl / 2)))];
                        const n = Math.random() < .3 ? 3 : 1, bx = arRand(40, W - 40);
                        for (let i = 0; i < n; i++) foes.push({ x: bx, y: -20 - i * 34, base: bx, ph: Math.random() * 6, amp: arRand(10, 50), vy: arRand(55, 80) + lvl * 8, hp: t.hp, e: t.e, pts: t.pts, cd: arRand(1, 3), flash: 0 });
                    }
                    shots.forEach(s => { s.y -= 460 * dt; s.x += s.vx * dt; });
                    shots = shots.filter(s => s.y > -10 && s.x > -10 && s.x < W + 10);
                    foes.forEach(f => {
                        f.y += f.vy * dt; f.ph += dt * 2; f.x = arClamp(f.base + Math.sin(f.ph) * f.amp, 14, W - 14); f.flash = Math.max(0, f.flash - dt);
                        if ((f.cd -= dt) <= 0 && f.y > 0 && f.y < H * .7) {
                            f.cd = arRand(1.6, 3.2) - Math.min(1, lvl * .1);
                            const a = Math.atan2(p.y - f.y, p.x - f.x), sp = 120 + lvl * 10;
                            bullets.push({ x: f.x, y: f.y + 10, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp });
                        }
                    });
                    shots.forEach(s => foes.forEach(f => {
                        if (s.dead || f.hp <= 0) return;
                        if (Math.abs(s.x - f.x) < 16 && Math.abs(s.y - f.y) < 16) {
                            s.dead = true; f.hp--; f.flash = .08;
                            if (f.hp <= 0) {
                                h.addScore(f.pts); h.sfx('pop'); burst(f.x, f.y, '#ffd86b', 12);
                                if (Math.random() < .08) items.push({ x: f.x, y: f.y });
                            } else h.sfx('tick');
                        }
                    }));
                    shots = shots.filter(s => !s.dead);
                    foes = foes.filter(f => {
                        if (f.hp <= 0) return false;
                        if (f.y > H + 20) return false;
                        if (Math.hypot(f.x - p.x, f.y - p.y) < 24) { f.hp = 0; burst(f.x, f.y, '#ffd86b', 10); hit(); return false; }
                        return true;
                    });
                    bullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; if (Math.hypot(b.x - p.x, b.y - p.y) < 10) { b.dead = true; hit(); } });
                    bullets = bullets.filter(b => !b.dead && b.y < H + 10 && b.y > -10 && b.x > -10 && b.x < W + 10);
                    items.forEach(it => { it.y += 70 * dt; if (Math.hypot(it.x - p.x, it.y - p.y) < 26) { it.dead = true; p.power = 8; h.addScore(50); h.sfx('up'); } });
                    items = items.filter(it => !it.dead && it.y < H + 20);
                    sparks.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.t -= dt; });
                    sparks = sparks.filter(s => s.t > 0);
                },
                draw(c) {
                    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b1446'); g.addColorStop(1, '#4b2a72');
                    c.fillStyle = g; c.fillRect(0, 0, W, H);
                    stars.forEach(s => { c.fillStyle = 'rgba(255,255,255,' + (s.r / 2) + ')'; c.fillRect(s.x, s.y, s.r * 1.6, s.r * 1.6); });
                    c.fillStyle = '#9ff4ff'; shots.forEach(s => { arRound(c, s.x - 2.5, s.y - 8, 5, 14, 3); c.fill(); });
                    c.fillStyle = '#ff8fd1'; bullets.forEach(b => { c.beginPath(); c.arc(b.x, b.y, 5, 0, 7); c.fill(); });
                    foes.forEach(f => { c.globalAlpha = f.flash ? .4 : 1; arEmoji(c, f.e, f.x, f.y, 28); c.globalAlpha = 1; });
                    items.forEach(it => arEmoji(c, '🌟', it.x, it.y, 24));
                    sparks.forEach(s => { c.globalAlpha = Math.min(1, s.t * 2); c.fillStyle = s.c; c.fillRect(s.x, s.y, 3, 3); }); c.globalAlpha = 1;
                    if (!(p.inv > 0 && Math.floor(p.inv * 10) % 2)) {       // 말랑 비행기
                        c.save(); c.translate(p.x, p.y);
                        c.fillStyle = '#ffb3cf'; c.beginPath(); c.moveTo(0, -20); c.lineTo(16, 12); c.lineTo(0, 6); c.lineTo(-16, 12); c.closePath(); c.fill();
                        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -2, 6, 10, 0, 0, 7); c.fill();
                        c.fillStyle = '#7ad7ff'; c.beginPath(); c.arc(0, -4, 3.5, 0, 7); c.fill();
                        c.fillStyle = p.power > 0 ? '#ffe36b' : '#ff9a6b'; c.beginPath(); c.moveTo(-5, 9); c.lineTo(0, 18 + Math.random() * 6); c.lineTo(5, 9); c.fill();
                        c.restore();
                    }
                    if (p.power > 0) arText(c, 'POWER ' + Math.ceil(p.power), W - 8, H - 12, 9, '#ffe36b', 'right');
                }
            };
        }

        /* =====================================================================
           2. 🧱 젤리 벽돌깨기
           ===================================================================== */
        function arBreakout(h) {
            const W = h.W, H = h.H, COLS = 7, BW = (W - 24) / COLS, BH = 18;
            const COLORS = ['#ff9fc0', '#ffc28a', '#fff08a', '#a8eab0', '#9fd8ff', '#c9b2ff'];
            const pad = { x: W / 2, w: 74, y: H - 40 };
            let ball, bricks = [], lives = 3, level = 0, keys = {}, sparks = [];
            h.lives(lives);
            function build() {
                level++; bricks = [];
                const rows = Math.min(8, 3 + level);
                for (let r = 0; r < rows; r++) for (let i = 0; i < COLS; i++) {
                    if (level > 1 && (r + i + level) % 7 === 0) continue;
                    const hp = level >= 3 && r < 2 ? 2 : 1;
                    bricks.push({ x: 12 + i * BW, y: 56 + r * (BH + 6), hp, c: COLORS[r % COLORS.length] });
                }
                serve();
            }
            function serve() { ball = { x: pad.x, y: pad.y - 10, vx: 0, vy: 0, r: 7, stuck: true, sp: 260 + level * 25 }; }
            function launch() { if (ball.stuck) { ball.stuck = false; const a = arRand(-.5, .5); ball.vx = Math.sin(a) * ball.sp; ball.vy = -Math.cos(a) * ball.sp; h.sfx('tick'); } }
            build();
            return {
                down(x) { pad.x = arClamp(x, pad.w / 2, W - pad.w / 2); },
                move(x) { pad.x = arClamp(x, pad.w / 2, W - pad.w / 2); },
                up() { launch(); },
                keyDown(c) { keys[c] = true; if (c === 'Space' || c === 'ArrowUp') launch(); }, keyUp(c) { keys[c] = false; },
                update(dt) {
                    const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
                    pad.x = arClamp(pad.x + kx * 420 * dt, pad.w / 2, W - pad.w / 2);
                    sparks.forEach(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt; s.t -= dt; }); sparks = sparks.filter(s => s.t > 0);
                    if (ball.stuck) { ball.x = pad.x; ball.y = pad.y - 10; return; }
                    const steps = 3;
                    for (let k = 0; k < steps; k++) {
                        ball.x += ball.vx * dt / steps; ball.y += ball.vy * dt / steps;
                        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); h.sfx('tick'); }
                        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); h.sfx('tick'); }
                        if (ball.y < ball.r + 30) { ball.y = ball.r + 30; ball.vy = Math.abs(ball.vy); h.sfx('tick'); }
                        if (ball.vy > 0 && ball.y + ball.r >= pad.y - 6 && ball.y < pad.y + 8 && Math.abs(ball.x - pad.x) < pad.w / 2 + ball.r) {
                            const off = arClamp((ball.x - pad.x) / (pad.w / 2), -1, 1), a = off * 1.05;
                            ball.sp = Math.min(560, ball.sp + 4);
                            ball.vx = Math.sin(a) * ball.sp; ball.vy = -Math.cos(a) * ball.sp; ball.y = pad.y - 6 - ball.r;
                            h.sfx('boing');
                        }
                        for (const b of bricks) {
                            if (b.hp <= 0) continue;
                            const nx = arClamp(ball.x, b.x, b.x + BW - 4), ny = arClamp(ball.y, b.y, b.y + BH);
                            if (Math.hypot(ball.x - nx, ball.y - ny) < ball.r) {
                                const ox = Math.min(Math.abs(ball.x - b.x), Math.abs(ball.x - b.x - BW + 4)), oy = Math.min(Math.abs(ball.y - b.y), Math.abs(ball.y - b.y - BH));
                                if (ox < oy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
                                b.hp--;
                                if (b.hp <= 0) {
                                    h.addScore(10 * level); h.sfx('pop');
                                    for (let i = 0; i < 8; i++) sparks.push({ x: b.x + BW / 2, y: b.y + BH / 2, vx: arRand(-120, 120), vy: arRand(-160, 40), t: .6, c: b.c });
                                } else h.sfx('tick');
                                break;
                            }
                        }
                    }
                    if (ball.y > H + 20) {
                        lives--; h.lives(lives); h.sfx('hurt');
                        if (lives <= 0) h.over(); else serve();
                    }
                    if (!bricks.some(b => b.hp > 0)) { h.addScore(100 * level); h.sfx('up'); build(); }
                },
                draw(c) {
                    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a1d4f'); g.addColorStop(1, '#5a3a7a');
                    c.fillStyle = g; c.fillRect(0, 0, W, H);
                    arText(c, 'STAGE ' + level, W / 2, 18, 10, '#ffd6ea');
                    bricks.forEach(b => {
                        if (b.hp <= 0) return;
                        c.fillStyle = b.c; arRound(c, b.x, b.y, BW - 4, BH, 8); c.fill();
                        c.fillStyle = 'rgba(255,255,255,.55)'; arRound(c, b.x + 4, b.y + 3, BW - 14, 5, 3); c.fill();
                        if (b.hp > 1) { c.strokeStyle = '#fff'; c.lineWidth = 2; arRound(c, b.x + 1, b.y + 1, BW - 6, BH - 2, 7); c.stroke(); }
                    });
                    sparks.forEach(s => { c.globalAlpha = Math.min(1, s.t * 2); c.fillStyle = s.c; c.fillRect(s.x, s.y, 4, 4); }); c.globalAlpha = 1;
                    c.fillStyle = '#ffffff'; arRound(c, pad.x - pad.w / 2, pad.y - 6, pad.w, 12, 6); c.fill();
                    c.fillStyle = '#ff8fb1'; arRound(c, pad.x - pad.w / 2 + 6, pad.y - 2, pad.w - 12, 4, 2); c.fill();
                    c.fillStyle = '#fff6b0'; c.beginPath(); c.arc(ball.x, ball.y, ball.r, 0, 7); c.fill();
                    if (ball.stuck) arText(c, 'TAP!', W / 2, H / 2 + 60, 12, '#fff');
                }
            };
        }

        /* =====================================================================
           3. 🍬 사탕 미로 (미로에서 사탕 모으며 유령 피하기)
           ===================================================================== */
        const AR_MAZE = [
            '###############',
            '#......#......#',
            '#o##.##.##.##o#',
            '#.............#',
            '#.##.#####.##.#',
            '#....#...#....#',
            '####.##.##.####',
            '#....#   #....#',
            '####.##.##.####',
            '#.............#',
            '#.##.#####.##.#',
            '#o...........o#',
            '#.##.##.##.##.#',
            '#......#......#',
            '###############'
        ];
        function arMaze(h) {
            const C = AR_MAZE[0].length, R = AR_MAZE.length, S = h.W / C, OY = (h.H - R * S) / 2;
            let grid, dots, lives = 3, level = 0, scared = 0, chain = 0;
            const wall = (x, y) => x < 0 || y < 0 || x >= C || y >= R || grid[y][x] === '#';
            const pl = { x: 7, y: 11, dir: null, next: null, p: 0, from: null, sp: 4.2 };
            const GE = ['👻', '👻', '👻'];
            let ghosts = [];
            h.lives(lives);
            function reset() {
                Object.assign(pl, { x: 7, y: 11, dir: null, next: null, p: 0 });
                ghosts = GE.map((e, i) => ({ x: 7, y: 7, dir: null, p: 0, sp: 2.6 + level * .25, wait: 1 + i * 1.6, e, home: true, hue: [330, 190, 45][i] }));
                scared = 0;
            }
            function build() {
                level++;
                grid = AR_MAZE.map(r => r.split(''));
                dots = 0; grid.forEach(r => r.forEach(ch => { if (ch === '.' || ch === 'o') dots++; }));
                reset();
            }
            build();
            function pos(e) { const d = e.dir ? AR_DIRS[e.dir] : [0, 0]; return [e.x + d[0] * e.p, e.y + d[1] * e.p]; }
            function canGo(x, y, d) { const v = AR_DIRS[d]; return !wall(x + v[0], y + v[1]); }
            function stepPlayer(dt) {
                if (pl.dir && pl.next === AR_OPP[pl.dir] && pl.p > 0) {        // 반대 방향은 바로 돌아서기
                    const v = AR_DIRS[pl.dir]; pl.x += v[0]; pl.y += v[1]; pl.p = 1 - pl.p; pl.dir = pl.next;
                }
                if (pl.p === 0) {
                    if (pl.next && canGo(pl.x, pl.y, pl.next)) pl.dir = pl.next;
                    else if (pl.dir && !canGo(pl.x, pl.y, pl.dir)) pl.dir = null;
                }
                if (!pl.dir) return;
                pl.p += pl.sp * dt;
                if (pl.p >= 1) {
                    const v = AR_DIRS[pl.dir]; pl.x += v[0]; pl.y += v[1]; pl.p = 0;
                    const ch = grid[pl.y][pl.x];
                    if (ch === '.' || ch === 'o') {
                        grid[pl.y][pl.x] = ' '; dots--;
                        if (ch === 'o') { scared = 7; chain = 0; h.addScore(50); h.sfx('up'); } else { h.addScore(10); h.sfx('blip'); }
                        if (dots <= 0) { h.addScore(500); h.sfx('win'); build(); }
                    }
                }
            }
            function stepGhost(g, dt) {
                if (g.wait > 0) { g.wait -= dt; return; }
                const sp = scared > 0 ? g.sp * .55 : g.sp;
                if (g.p === 0 || !g.dir) {
                    let opts = Object.keys(AR_DIRS).filter(d => canGo(g.x, g.y, d));
                    if (opts.length > 1 && g.dir) opts = opts.filter(d => d !== AR_OPP[g.dir]);
                    const [px, py] = pos(pl);
                    if (Math.random() < .75) {
                        opts.sort((a, b) => {
                            const da = Math.hypot(g.x + AR_DIRS[a][0] - px, g.y + AR_DIRS[a][1] - py), db = Math.hypot(g.x + AR_DIRS[b][0] - px, g.y + AR_DIRS[b][1] - py);
                            return scared > 0 ? db - da : da - db;
                        });
                        g.dir = opts[0];
                    } else g.dir = arPick(opts);
                }
                g.p += sp * dt;
                if (g.p >= 1) { const v = AR_DIRS[g.dir]; g.x += v[0]; g.y += v[1]; g.p = 0; }
            }
            function setDir(d) { pl.next = d; }
            return {
                swipe: setDir, pad: setDir,
                keyDown(c) { const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' }[c]; if (m) setDir(m); },
                update(dt) {
                    scared = Math.max(0, scared - dt);
                    stepPlayer(dt);
                    ghosts.forEach(g => stepGhost(g, dt));
                    const [px, py] = pos(pl);
                    for (const g of ghosts) {
                        if (g.wait > 0) continue;
                        const [gx, gy] = pos(g);
                        if (Math.hypot(gx - px, gy - py) < .6) {
                            if (scared > 0) { chain++; h.addScore(200 * chain); h.sfx('pop'); Object.assign(g, { x: 7, y: 7, p: 0, dir: null, wait: 2 }); }
                            else {
                                lives--; h.lives(lives); h.sfx('hurt');
                                if (lives <= 0) { h.over(); return; }
                                reset(); return;
                            }
                        }
                    }
                },
                draw(c) {
                    c.fillStyle = '#1d1640'; c.fillRect(0, 0, h.W, h.H);
                    for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
                        const ch = grid[y][x], X = x * S, Y = OY + y * S;
                        if (ch === '#') { c.fillStyle = '#ff9fc8'; arRound(c, X + 2, Y + 2, S - 4, S - 4, 6); c.fill(); c.fillStyle = '#ffd0e4'; arRound(c, X + 5, Y + 4, S - 10, 3, 2); c.fill(); }
                        else if (ch === '.') { c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(X + S / 2, Y + S / 2, 2.6, 0, 7); c.fill(); }
                        else if (ch === 'o') arEmoji(c, '🍓', X + S / 2, Y + S / 2, S * .7 + Math.sin(h.t * 6) * 2);
                    }
                    ghosts.forEach(g => {
                        const [gx, gy] = pos(g);
                        if (scared > 0) { c.globalAlpha = scared < 2 && Math.floor(h.t * 8) % 2 ? .35 : .8; arEmoji(c, '🫧', gx * S + S / 2, OY + gy * S + S / 2, S * .9); c.globalAlpha = 1; }
                        else { c.save(); c.filter = 'hue-rotate(' + g.hue + 'deg)'; arEmoji(c, g.e, gx * S + S / 2, OY + gy * S + S / 2, S * .85); c.restore(); }
                    });
                    const [px, py] = pos(pl);
                    arEmoji(c, '🐰', px * S + S / 2, OY + py * S + S / 2, S * .9);
                    arText(c, 'LV ' + level, 6, OY / 2 + 2, 9, '#ffd6ea', 'left');
                }
            };
        }

        /* =====================================================================
           4. 🐹 말랑이 뿅망치 (두더지 잡기)
           ===================================================================== */
        function arMole(h) {
            const W = h.W, H = h.H, TIME = 45, holes = [];
            const cw = W / 3, top = 90, ch = (H - top - 20) / 3;
            for (let r = 0; r < 3; r++) for (let i = 0; i < 3; i++) holes.push({ x: cw * i + cw / 2, y: top + ch * r + ch * .62, kind: null, t: 0, life: 0, hit: 0 });
            let left = TIME, next = .6, hammer = null, combo = 0, pops = [];
            h.lives(-1);
            return {
                down(x, y) {
                    hammer = { x, y, t: .15 };
                    for (const o of holes) {
                        if (!o.kind || o.hit) continue;
                        if (Math.abs(x - o.x) < cw * .42 && y > o.y - ch * .62 && y < o.y + ch * .25) {
                            o.hit = .35;
                            if (o.kind === '💣') { h.addScore(-30); combo = 0; h.sfx('hurt'); pops.push({ x: o.x, y: o.y - 40, s: '-30', t: .8, c: '#ff6b6b' }); h.shake(); }
                            else { combo++; const pts = (o.kind === '🌟' ? 30 : 10) + Math.min(20, combo * 2); h.addScore(pts); h.sfx(o.kind === '🌟' ? 'up' : 'pop'); pops.push({ x: o.x, y: o.y - 40, s: '+' + pts, t: .8, c: '#fff36b' }); }
                            return;
                        }
                    }
                    combo = 0; h.sfx('tick');
                },
                update(dt) {
                    left -= dt;
                    if (left <= 0) { left = 0; h.over(); return; }
                    const pace = 1 - left / TIME;
                    if ((next -= dt) <= 0) {
                        next = arRand(.35, .8) * (1 - pace * .5);
                        const free = holes.filter(o => !o.kind);
                        if (free.length) {
                            const o = arPick(free), r = Math.random();
                            o.kind = r < .12 ? '💣' : r < .2 ? '🌟' : '🐹'; o.t = 0; o.life = arRand(.8, 1.3) * (1 - pace * .45); o.hit = 0;
                        }
                    }
                    holes.forEach(o => {
                        if (!o.kind) return;
                        o.t += dt;
                        if (o.hit) { o.hit -= dt; if (o.hit <= 0) o.kind = null; }
                        else if (o.t > o.life + .3) { if (o.kind === '🐹') combo = 0; o.kind = null; }
                    });
                    if (hammer && (hammer.t -= dt) <= 0) hammer = null;
                    pops.forEach(p => { p.y -= 40 * dt; p.t -= dt; }); pops = pops.filter(p => p.t > 0);
                },
                draw(c) {
                    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bfe9ff'); g.addColorStop(.25, '#e6f8ff'); g.addColorStop(.26, '#9fe0a0'); g.addColorStop(1, '#6cc47a');
                    c.fillStyle = g; c.fillRect(0, 0, W, H);
                    c.fillStyle = 'rgba(0,0,0,.25)'; arRound(c, 14, 18, W - 28, 14, 7); c.fill();
                    c.fillStyle = left < 10 ? '#ff6b81' : '#ffd166'; arRound(c, 14, 18, (W - 28) * left / TIME, 14, 7); c.fill();
                    arText(c, Math.ceil(left) + 's', W / 2, 52, 12, '#3b4a6b');
                    if (combo >= 3) arText(c, combo + ' COMBO', W - 14, 52, 9, '#ff6b81', 'right');
                    holes.forEach(o => {
                        c.fillStyle = '#5a3b2a'; c.beginPath(); c.ellipse(o.x, o.y, cw * .36, ch * .13, 0, 0, 7); c.fill();
                        if (o.kind) {
                            const up = o.hit ? 1 : Math.min(1, o.t / .15, Math.max(0, (o.life + .3 - o.t) / .15));
                            c.save(); c.beginPath(); c.rect(o.x - cw / 2, o.y - ch, cw, ch); c.clip();
                            const sz = Math.min(cw, ch) * .55;
                            c.globalAlpha = o.hit ? .6 : 1;
                            arEmoji(c, o.hit && o.kind !== '💣' ? '💫' : o.kind, o.x, o.y - sz * .55 * up + sz * .5 * (1 - up), sz);
                            c.restore(); c.globalAlpha = 1;
                        }
                        c.fillStyle = '#7a523a'; c.beginPath(); c.ellipse(o.x, o.y + 4, cw * .38, ch * .07, 0, 0, Math.PI); c.fill();
                    });
                    pops.forEach(p => arText(c, p.s, p.x, p.y, 12, p.c));
                    if (hammer) { c.save(); c.translate(hammer.x, hammer.y); c.rotate(-.6 + (.15 - hammer.t) * 6); arEmoji(c, '🔨', 0, -10, 40); c.restore(); }
                }
            };
        }

        /* =====================================================================
           5. 🐛 애벌레 냠냠 (꼬리 늘이기)
           ===================================================================== */
        function arSnake(h) {
            const N = 15, S = h.W / N, OY = (h.H - N * S) / 2;
            let body = [{ x: 7, y: 8 }, { x: 6, y: 8 }, { x: 5, y: 8 }], dir = 'right', queue = [], food, tick = 0, gap = .16, eaten = 0, dead = false;
            const FRUITS = ['🍓', '🍎', '🍇', '🍑', '🍒', '🍊'];
            h.lives(-1);
            function place() {
                let p; do { p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N), e: arPick(FRUITS) }; } while (body.some(b => b.x === p.x && b.y === p.y));
                food = p;
            }
            place();
            function setDir(d) {
                const last = queue.length ? queue[queue.length - 1] : dir;
                if (d !== last && d !== AR_OPP[last] && queue.length < 3) queue.push(d);
            }
            return {
                swipe: setDir, pad: setDir,
                keyDown(c) { const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' }[c]; if (m) setDir(m); },
                update(dt) {
                    if (dead) return;
                    tick += dt;
                    while (tick >= gap) {
                        tick -= gap;
                        if (queue.length) dir = queue.shift();
                        const v = AR_DIRS[dir], head = { x: body[0].x + v[0], y: body[0].y + v[1] };
                        if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || body.slice(0, -1).some(b => b.x === head.x && b.y === head.y)) {
                            dead = true; h.sfx('hurt'); h.over(); return;
                        }
                        body.unshift(head);
                        if (head.x === food.x && head.y === food.y) { eaten++; h.addScore(10 + Math.floor(eaten / 5) * 5); h.sfx('blip'); gap = Math.max(.07, .16 - eaten * .004); place(); }
                        else body.pop();
                    }
                },
                draw(c) {
                    c.fillStyle = '#e9f7d8'; c.fillRect(0, 0, h.W, h.H);
                    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { c.fillStyle = (x + y) % 2 ? '#d6efbf' : '#c9e8ae'; c.fillRect(x * S, OY + y * S, S, S); }
                    arEmoji(c, food.e, food.x * S + S / 2, OY + food.y * S + S / 2, S * .85);
                    for (let i = body.length - 1; i >= 1; i--) {
                        const b = body[i];
                        c.fillStyle = i % 2 ? '#8fd16a' : '#a6e07e';
                        c.beginPath(); c.arc(b.x * S + S / 2, OY + b.y * S + S / 2, S * .46, 0, 7); c.fill();
                    }
                    const hd = body[0], hx = hd.x * S + S / 2, hy = OY + hd.y * S + S / 2;
                    c.fillStyle = '#6fbf4a'; c.beginPath(); c.arc(hx, hy, S * .52, 0, 7); c.fill();
                    const v = AR_DIRS[dir], ex = -v[1], ey = v[0];
                    [-1, 1].forEach(s => {
                        c.fillStyle = '#fff'; c.beginPath(); c.arc(hx + v[0] * S * .15 + ex * s * S * .2, hy + v[1] * S * .15 + ey * s * S * .2, S * .13, 0, 7); c.fill();
                        c.fillStyle = '#333'; c.beginPath(); c.arc(hx + v[0] * S * .2 + ex * s * S * .2, hy + v[1] * S * .2 + ey * s * S * .2, S * .06, 0, 7); c.fill();
                    });
                    c.fillStyle = '#ff9fb8'; c.beginPath(); c.arc(hx - ex * S * .3 - v[0] * S * .05, hy - ey * S * .3, S * .07, 0, 7); c.arc(hx + ex * S * .3, hy + ey * S * .3, S * .07, 0, 7); c.fill();
                    arText(c, 'LEN ' + body.length, 6, OY / 2 + 2, 9, '#5a8a3a', 'left');
                }
            };
        }

        /* =====================================================================
           6. 🏃 토끼 점프 달리기
           ===================================================================== */
        function arRunner(h) {
            const W = h.W, H = h.H, GY = H * .72;
            const p = { x: 70, y: GY, vy: 0, jumps: 0 };
            let obs = [], candies = [], speed = 220, dist = 0, nextObs = 1, nextCandy = 2, clouds = [], dead = false;
            for (let i = 0; i < 4; i++) clouds.push({ x: Math.random() * W, y: arRand(30, GY - 120), s: arRand(.2, .5) });
            h.lives(-1);
            function jump() { if (p.jumps < 2) { p.vy = p.jumps ? -520 : -600; p.jumps++; h.sfx('jump'); } }
            return {
                down: jump, keyDown(c) { if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') jump(); },
                update(dt) {
                    if (dead) return;
                    speed = Math.min(560, 220 + h.t * 6);
                    dist += speed * dt; h.score(Math.floor(dist / 10));
                    p.vy += 1700 * dt; p.y += p.vy * dt;
                    if (p.y >= GY) { p.y = GY; p.vy = 0; p.jumps = 0; }
                    clouds.forEach(cl => { cl.x -= speed * cl.s * dt; if (cl.x < -60) { cl.x = W + 40; cl.y = arRand(30, GY - 120); } });
                    if ((nextObs -= dt) <= 0) {
                        const fly = h.t > 12 && Math.random() < .3;
                        obs.push(fly ? { x: W + 30, y: GY - arRand(70, 110), e: '🐝', r: 14, fly: true } : { x: W + 30, y: GY - 14, e: arPick(['🍄', '🪨', '🌵']), r: 15 });
                        if (!fly && h.t > 20 && Math.random() < .25) obs.push({ x: W + 62, y: GY - 14, e: '🍄', r: 15 });
                        nextObs = arRand(.9, 1.7) * 260 / speed + .35;
                    }
                    if ((nextCandy -= dt) <= 0) { candies.push({ x: W + 20, y: GY - arRand(40, 150) }); nextCandy = arRand(1.2, 2.6); }
                    obs.forEach(o => { o.x -= speed * dt * (o.fly ? 1.15 : 1); if (o.fly) o.y += Math.sin(h.t * 6) * 0.6; });
                    candies.forEach(cd => cd.x -= speed * dt);
                    obs = obs.filter(o => o.x > -40); candies = candies.filter(cd => cd.x > -30 && !cd.got);
                    for (const o of obs) if (Math.hypot(o.x - p.x, o.y - (p.y - 18)) < o.r + 13) { dead = true; h.sfx('hurt'); h.shake(); h.over(); return; }
                    candies.forEach(cd => { if (Math.hypot(cd.x - p.x, cd.y - (p.y - 18)) < 26) { cd.got = true; dist += 300; h.sfx('blip'); } });
                },
                draw(c) {
                    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffd9ec'); g.addColorStop(.7, '#fff3e0'); c.fillStyle = g; c.fillRect(0, 0, W, H);
                    clouds.forEach(cl => { c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(cl.x, cl.y, 16, 0, 7); c.arc(cl.x + 18, cl.y - 6, 20, 0, 7); c.arc(cl.x + 38, cl.y, 15, 0, 7); c.fill(); });
                    c.fillStyle = '#9bd88c'; c.fillRect(0, GY + 6, W, H - GY);
                    c.fillStyle = '#7cc46c'; for (let x = -((dist * 1) % 40); x < W; x += 40) c.fillRect(x, GY + 6, 20, 5);
                    candies.forEach(cd => arEmoji(c, '🍬', cd.x, cd.y, 22));
                    obs.forEach(o => arEmoji(c, o.e, o.x, o.y, 30));
                    c.save(); c.translate(p.x, p.y - 18);
                    if (p.y < GY) c.rotate(-.15); else c.translate(0, Math.abs(Math.sin(h.t * 14)) * -3);
                    arEmoji(c, '🐰', 0, 0, 36); c.restore();
                    arText(c, 'x' + (speed / 220).toFixed(1), W - 8, 18, 9, '#c06090', 'right');
                }
            };
        }

        /* =====================================================================
           7. 🃏 말랑 짝꿍 (카드 짝 맞추기)
           ===================================================================== */
        function arMemory(h) {
            const W = h.W, H = h.H, COLS = 4, ROWS = 4, GAP = 10;
            const cw = (W - GAP * (COLS + 1)) / COLS, chh = Math.min((H - 60 - GAP * (ROWS + 1)) / ROWS, cw * 1.3), oy = 50 + (H - 50 - (chh * ROWS + GAP * (ROWS + 1))) / 2;
            const faces = ['🍓', '🍰', '🧸', '🌷', '🍭', '🐰', '🍀', '⭐'];
            let deck = faces.concat(faces).map(e => ({ e, open: 0, target: 0, done: false })), sel = [], moves = 0, lock = 0, finished = false;
            for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
            deck.forEach((d, i) => { d.x = GAP + (i % COLS) * (cw + GAP); d.y = oy + GAP + Math.floor(i / COLS) * (chh + GAP); });
            h.lives(-1);
            return {
                down(x, y) {
                    if (lock > 0 || finished) return;
                    const d = deck.find(d => x > d.x && x < d.x + cw && y > d.y && y < d.y + chh);
                    if (!d || d.done || d.target) return;
                    d.target = 1; sel.push(d); h.sfx('tick');
                    if (sel.length === 2) {
                        moves++;
                        if (sel[0].e === sel[1].e) { sel.forEach(s => s.done = true); sel = []; h.sfx('pop'); if (deck.every(d => d.done)) { finished = true; h.score(Math.max(100, 2000 - moves * 40 - Math.floor(h.t) * 10)); h.sfx('win'); setTimeout(() => h.over(), 900); } }
                        else lock = .8;
                    }
                },
                update(dt) {
                    deck.forEach(d => { d.open += (d.target - d.open) * Math.min(1, dt * 14); });
                    if (lock > 0 && (lock -= dt) <= 0) { sel.forEach(s => s.target = 0); sel = []; }
                },
                draw(c) {
                    c.fillStyle = '#fff0f6'; c.fillRect(0, 0, W, H);
                    arText(c, 'MOVES ' + moves, 10, 24, 10, '#c06090', 'left');
                    arText(c, Math.floor(h.t) + 's', W - 10, 24, 10, '#c06090', 'right');
                    deck.forEach(d => {
                        const k = Math.abs(1 - d.open * 2), cx = d.x + cw / 2, front = d.open > .5;
                        c.save(); c.translate(cx, d.y); c.scale(Math.max(.02, k), 1);
                        c.fillStyle = front ? (d.done ? '#fff7d6' : '#ffffff') : '#ff9fc8';
                        arRound(c, -cw / 2, 0, cw, chh, 10); c.fill();
                        c.strokeStyle = front ? '#ffc2da' : '#ffffff'; c.lineWidth = 2; arRound(c, -cw / 2 + 3, 3, cw - 6, chh - 6, 8); c.stroke();
                        if (front) arEmoji(c, d.e, 0, chh / 2, Math.min(cw, chh) * .55);
                        else arEmoji(c, '🌙', 0, chh / 2, Math.min(cw, chh) * .35);
                        c.restore();
                    });
                }
            };
        }

        /* =====================================================================
           🧠 두뇌 게임 : 기억력 · 집중력 · 계산력 · 생각하는 힘
           ===================================================================== */
        let AR_KFONT = '';
        function arKText(ctx, s, x, y, size, color, align, weight) {
            if (!AR_KFONT) AR_KFONT = getComputedStyle(document.documentElement).getPropertyValue('--system-font').trim() || 'sans-serif';
            ctx.font = (weight || 'bold') + ' ' + size + 'px ' + AR_KFONT;
            ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = color; ctx.fillText(s, x, y);
        }
        const arIn = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
        function arBg(c, W, H, a, b) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, a); g.addColorStop(1, b); c.fillStyle = g; c.fillRect(0, 0, W, H); }
        function arBtn(c, r, fill, label, size, color, pressed) {
            c.fillStyle = 'rgba(0,0,0,.12)'; arRound(c, r.x, r.y + 4, r.w, r.h, 14); c.fill();
            c.fillStyle = fill; arRound(c, r.x, r.y + (pressed ? 3 : 0), r.w, r.h, 14); c.fill();
            if (label !== undefined) arKText(c, label, r.x + r.w / 2, r.y + r.h / 2 + (pressed ? 3 : 0), size || 22, color || '#3a2a4a');
        }
        function arTimeBar(c, W, left, total) {
            c.fillStyle = 'rgba(0,0,0,.12)'; arRound(c, 16, 14, W - 32, 12, 6); c.fill();
            c.fillStyle = left < 10 ? '#ff6b81' : '#7c5cff'; arRound(c, 16, 14, Math.max(0, (W - 32) * left / total), 12, 6); c.fill();
        }

        /* 1. 🎵 말랑 따라하기 : 불이 들어온 순서를 기억해서 똑같이 누르기 (순서 기억) */
        function arSimon(h) {
            const W = h.W, H = h.H, S = 150, G = 14, ox = (W - S * 2 - G) / 2, oy = 96;
            const pads = [0, 1, 2, 3].map(i => ({ x: ox + (i % 2) * (S + G), y: oy + Math.floor(i / 2) * (S + G), w: S, h: S }));
            const COL = ['#ff9fbe', '#8fd3ff', '#ffe08a', '#a8e6a1'], EMO = ['🍓', '🫐', '🍋', '🍀'], NOTE = [523, 659, 784, 1047];
            let seq = [], mode = 'wait', t = .9, idx = 0, lit = -1, litT = 0, input = 0, msg = '잘 보세요 👀';
            h.lives(-1);
            function light(i, d) { lit = i; litT = d; arTone(NOTE[i], d * .9, 'triangle', .09); }
            return {
                down(x, y) {
                    if (mode !== 'input') return;
                    const i = pads.findIndex(p => arIn(x, y, p)); if (i < 0) return;
                    light(i, .25);
                    if (seq[input] !== i) { mode = 'end'; msg = '앗! 순서가 달라요'; h.sfx('hurt'); setTimeout(() => h.over(), 700); return; }
                    input++;
                    if (input >= seq.length) { h.score(seq.length * 10); h.sfx('up'); mode = 'wait'; t = .9; msg = '좋아요! ✨'; }
                },
                keyDown(c) { const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[c]; if (k !== undefined) { const p = pads[k]; this.down(p.x + 5, p.y + 5); } },
                update(dt) {
                    if (litT > 0) { litT -= dt; if (litT <= 0) lit = -1; }
                    if (mode === 'wait' && (t -= dt) <= 0) { seq.push(Math.floor(Math.random() * 4)); mode = 'show'; idx = 0; t = .3; msg = '잘 보세요 👀'; }
                    else if (mode === 'show' && (t -= dt) <= 0) {
                        const sp = Math.max(.28, .55 - seq.length * .02);
                        if (idx < seq.length) { light(seq[idx++], sp); t = sp + .15; }
                        else { mode = 'input'; input = 0; msg = '따라 해 보세요!'; }
                    }
                },
                draw(c) {
                    arBg(c, W, H, '#fff4fa', '#efe6ff');
                    arKText(c, msg, W / 2, 36, 20, '#6b4a8a');
                    arKText(c, mode === 'input' ? `${input} / ${seq.length}` : `${seq.length}단계`, W / 2, 66, 14, '#a07ab8', 'center', 'normal');
                    pads.forEach((p, i) => {
                        c.globalAlpha = lit === i ? 1 : .55;
                        arBtn(c, p, COL[i], undefined, 0, 0, lit === i);
                        arEmoji(c, EMO[i], p.x + p.w / 2, p.y + p.h / 2 + (lit === i ? 3 : 0), lit === i ? 64 : 52);
                        c.globalAlpha = 1;
                        if (lit === i) { c.strokeStyle = '#fff'; c.lineWidth = 5; arRound(c, p.x + 3, p.y + 6, p.w - 6, p.h - 6, 12); c.stroke(); }
                    });
                    arKText(c, '키보드 1 2 3 4 로도 눌러요', W / 2, H - 22, 12, '#b9a0cc', 'center', 'normal');
                }
            };
        }

        /* 2. ✨ 반짝 위치 기억 : 잠깐 빛난 칸의 자리를 기억해서 누르기 (공간 기억) */
        function arFlash(h) {
            const W = h.W, H = h.H, AREA = 320, OX = (W - AREA) / 2, OY = 90;
            let level = 1, lives = 3, n, k, cells, targets, found, mode, t, msg;
            h.lives(lives);
            function start() {
                n = level < 3 ? 3 : level < 6 ? 4 : level < 10 ? 5 : 6;
                k = Math.min(n * n - 2, 2 + level);
                cells = Array.from({ length: n * n }, () => 0);                 // 0 · 1 맞음 · 2 틀림
                targets = new Set(); while (targets.size < k) targets.add(Math.floor(Math.random() * n * n));
                found = 0; mode = 'show'; t = .9 + k * .18; msg = '빛나는 칸을 기억하세요 👀';
            }
            start();
            const cellAt = (x, y) => { const s = AREA / n, i = Math.floor((x - OX) / s), j = Math.floor((y - OY) / s); return i >= 0 && j >= 0 && i < n && j < n ? j * n + i : -1; };
            return {
                down(x, y) {
                    if (mode !== 'input') return;
                    const i = cellAt(x, y); if (i < 0 || cells[i]) return;
                    if (targets.has(i)) {
                        cells[i] = 1; found++; h.sfx('blip');
                        if (found === k) { h.addScore(k * 10); h.sfx('up'); mode = 'next'; t = .8; msg = '정답! ✨'; level++; }
                    } else {
                        cells[i] = 2; lives--; h.lives(lives); h.sfx('hurt'); mode = 'reveal'; t = 1.2; msg = '아쉬워요! 정답은 여기';
                    }
                },
                update(dt) {
                    if (mode === 'show' && (t -= dt) <= 0) { mode = 'input'; msg = `${k}칸을 눌러 주세요`; }
                    else if ((mode === 'next' || mode === 'reveal') && (t -= dt) <= 0) { if (lives <= 0) { mode = 'end'; h.over(); } else start(); }
                },
                draw(c) {
                    arBg(c, W, H, '#f2f7ff', '#efe6ff');
                    arKText(c, msg, W / 2, 34, 18, '#4a5a8a');
                    arKText(c, `${level}단계 · ${n}×${n}`, W / 2, 62, 13, '#8a9ac0', 'center', 'normal');
                    const s = AREA / n;
                    for (let i = 0; i < n * n; i++) {
                        const r = { x: OX + (i % n) * s + 4, y: OY + Math.floor(i / n) * s + 4, w: s - 8, h: s - 8 };
                        let col = '#ffffff';
                        if (mode === 'show' && targets.has(i)) col = '#ffd84d';
                        if (cells[i] === 1) col = '#9be7a5';
                        if (cells[i] === 2) col = '#ff9a9a';
                        if (mode === 'reveal' && targets.has(i) && !cells[i]) col = '#ffe9a8';
                        c.fillStyle = 'rgba(80,90,140,.12)'; arRound(c, r.x, r.y + 3, r.w, r.h, 10); c.fill();
                        c.fillStyle = col; arRound(c, r.x, r.y, r.w, r.h, 10); c.fill();
                        if (mode === 'show' && targets.has(i)) arEmoji(c, '⭐', r.x + r.w / 2, r.y + r.h / 2, s * .4);
                    }
                }
            };
        }

        /* 3. 🔢 숫자 기억 : 하나씩 나오는 숫자를 기억했다가 그대로 입력 (작업 기억) */
        function arDigits(h) {
            const W = h.W, H = h.H;
            const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
            const keys = KEYS.map((k, i) => ({ k, x: 20 + (i % 3) * 110, y: 214 + Math.floor(i / 3) * 74, w: 100, h: 62 }));
            let len = 3, lives = 3, seq = '', typed = '', mode = 'wait', t = .8, idx = 0, cur = '', msg = '', press = null;
            h.lives(lives);
            function next() { seq = ''; for (let i = 0; i < len; i++) seq += Math.floor(Math.random() * 10); mode = 'show'; idx = 0; t = .4; cur = ''; typed = ''; msg = '숫자를 기억하세요 👀'; }
            function key(k) {
                if (mode !== 'input') return;
                h.sfx('tick');
                if (k === '⌫') typed = typed.slice(0, -1);
                else if (k === '✓') submit();
                else if (typed.length < len) { typed += k; if (typed.length === len) setTimeout(submit, 250); }
            }
            function submit() {
                if (mode !== 'input' || !typed) return;
                if (typed === seq) { h.addScore(len * 10); h.sfx('up'); msg = '정답! 한 자리 더 ✨'; len++; mode = 'wait'; t = 1; }
                else { lives--; h.lives(lives); h.sfx('hurt'); msg = '정답은 ' + seq; mode = lives > 0 ? 'wait' : 'end'; t = 1.8; if (lives <= 0) setTimeout(() => h.over(), 1500); }
            }
            return {
                down(x, y) { const b = keys.find(b => arIn(x, y, b)); if (b) { press = b; key(b.k); setTimeout(() => { if (press === b) press = null; }, 120); } },
                keyDown(c) {
                    const m = c.match(/^(?:Digit|Numpad)(\d)$/); if (m) return key(m[1]);
                    if (c === 'Backspace') key('⌫'); if (c === 'Enter' || c === 'NumpadEnter') key('✓');
                },
                update(dt) {
                    if (mode === 'wait' && (t -= dt) <= 0) next();
                    else if (mode === 'show' && (t -= dt) <= 0) {
                        if (cur) { cur = ''; t = .22; }
                        else if (idx < seq.length) { cur = seq[idx++]; t = Math.max(.55, .9 - len * .03); h.sfx('blip'); }
                        else { mode = 'input'; msg = `${len}자리를 입력하세요`; }
                    }
                },
                draw(c) {
                    arBg(c, W, H, '#fffaf0', '#ffeef5');
                    arKText(c, msg, W / 2, 34, 18, '#8a5a3a');
                    arKText(c, `${len}자리`, W / 2, 62, 13, '#c0a080', 'center', 'normal');
                    c.fillStyle = '#ffffff'; arRound(c, 30, 86, W - 60, 100, 18); c.fill();
                    if (mode === 'show') arText(c, cur || '', W / 2, 138, 44, '#ff6b9a');
                    else {
                        const shown = mode === 'input' ? typed + '_'.repeat(Math.max(0, len - typed.length)) : typed;
                        arText(c, shown.split('').join(' '), W / 2, 138, len > 8 ? 16 : 22, '#4a3a6a');
                    }
                    keys.forEach(b => arBtn(c, b, b.k === '✓' ? '#a8e6a1' : b.k === '⌫' ? '#ffd0d0' : '#ffffff', b.k, 26, '#4a3a6a', press === b));
                    if (mode !== 'input') { c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(0, 204, W, H - 204); }
                }
            };
        }

        /* 4. ➕ 빠른 셈 : 60초 동안 계산 문제를 최대한 많이 (계산력 · 집중력) */
        function arMath(h) {
            const W = h.W, H = h.H, TOTAL = 60;
            const btns = [0, 1, 2, 3].map(i => ({ x: 20 + (i % 2) * 165, y: 250 + Math.floor(i / 2) * 104, w: 155, h: 90 }));
            let left = TOTAL, q, combo = 0, right = 0, flash = 0, flashOk = true, press = -1, done = false;
            h.lives(-1);
            const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
            function make() {
                const lv = 1 + Math.floor(right / 5); let a, b, op, ans;
                const kind = lv === 1 ? 0 : lv === 2 ? arPick([0, 1]) : lv === 3 ? arPick([0, 1, 2]) : arPick([0, 1, 2, 3]);
                if (kind === 0) { a = ri(1, lv > 1 ? 49 : 9); b = ri(1, lv > 1 ? 49 : 9); op = '+'; ans = a + b; }
                else if (kind === 1) { a = ri(10, 60); b = ri(1, a); op = '−'; ans = a - b; }
                else if (kind === 2) { a = ri(2, 9); b = ri(2, lv > 3 ? 12 : 9); op = '×'; ans = a * b; }
                else { b = ri(2, 9); ans = ri(2, 12); a = b * ans; op = '÷'; }
                const ch = new Set([ans]);
                while (ch.size < 4) { const d = ans + arPick([-10, -2, -1, 1, 2, 10, -3, 3]) * (Math.random() < .5 ? 1 : ri(1, 2)); if (d >= 0) ch.add(d); }
                q = { s: `${a} ${op} ${b}`, ans, ch: Array.from(ch).sort(() => Math.random() - .5) };
            }
            make();
            function pick(i) {
                if (done) return;
                press = i; setTimeout(() => { if (press === i) press = -1; }, 120);
                if (q.ch[i] === q.ans) { combo++; right++; h.addScore(10 + Math.min(20, combo * 2)); h.sfx('blip'); flashOk = true; }
                else { combo = 0; left -= 3; h.sfx('hurt'); flashOk = false; }
                flash = .25; make();
            }
            return {
                down(x, y) { const i = btns.findIndex(b => arIn(x, y, b)); if (i >= 0) pick(i); },
                keyDown(c) { const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[c]; if (k !== undefined) pick(k); },
                update(dt) { if (done) return; left -= dt; flash = Math.max(0, flash - dt); if (left <= 0) { left = 0; done = true; h.over(); } },
                draw(c) {
                    arBg(c, W, H, '#effaff', '#f0ecff');
                    arTimeBar(c, W, left, TOTAL);
                    arText(c, Math.ceil(left) + 's', W / 2, 46, 11, '#5a6a9a');
                    if (combo >= 3) arText(c, combo + ' COMBO', W - 18, 46, 9, '#ff6b81', 'right');
                    c.fillStyle = flash ? (flashOk ? '#dff7e2' : '#ffe0e0') : '#ffffff'; arRound(c, 20, 74, W - 40, 150, 20); c.fill();
                    arKText(c, q.s + ' = ?', W / 2, 150, 40, '#3a3a6a');
                    btns.forEach((b, i) => arBtn(c, b, ['#ffd6e7', '#d6ecff', '#fff1c2', '#dcf5d6'][i], String(q.ch[i]), 30, '#3a3a6a', press === i));
                    arKText(c, '틀리면 3초가 줄어요 · 키보드 1~4', W / 2, H - 18, 12, '#9aa0c0', 'center', 'normal');
                }
            };
        }

        /* 5. 🎨 색깔 헷갈리기 : 글자의 뜻이 아니라 '글자 색'을 고르기 (집중력 · 스트룹) */
        function arStroop(h) {
            const W = h.W, H = h.H, TOTAL = 45;
            const COLS = [['빨강', '#ef4444'], ['파랑', '#3b82f6'], ['초록', '#16a34a'], ['노랑', '#eab308']];
            const btns = [0, 1, 2, 3].map(i => ({ x: 20 + (i % 2) * 165, y: 250 + Math.floor(i / 2) * 104, w: 155, h: 90 }));
            let left = TOTAL, q, combo = 0, flash = 0, flashOk = true, press = -1, done = false;
            h.lives(-1);
            function make() {
                const word = Math.floor(Math.random() * 4); let ink = Math.floor(Math.random() * 4);
                if (Math.random() < .75) while (ink === word) ink = Math.floor(Math.random() * 4);
                q = { word, ink };
            }
            make();
            function pick(i) {
                if (done) return;
                press = i; setTimeout(() => { if (press === i) press = -1; }, 120);
                if (i === q.ink) { combo++; h.addScore(10 + Math.min(20, combo * 2)); h.sfx('blip'); flashOk = true; }
                else { combo = 0; left -= 2; h.sfx('hurt'); flashOk = false; }
                flash = .25; make();
            }
            return {
                down(x, y) { const i = btns.findIndex(b => arIn(x, y, b)); if (i >= 0) pick(i); },
                keyDown(c) { const k = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[c]; if (k !== undefined) pick(k); },
                update(dt) { if (done) return; left -= dt; flash = Math.max(0, flash - dt); if (left <= 0) { left = 0; done = true; h.over(); } },
                draw(c) {
                    arBg(c, W, H, '#fbf7ff', '#fff3f6');
                    arTimeBar(c, W, left, TOTAL);
                    arText(c, Math.ceil(left) + 's', W / 2, 46, 11, '#7a5a9a');
                    if (combo >= 3) arText(c, combo + ' COMBO', W - 18, 46, 9, '#ff6b81', 'right');
                    c.fillStyle = flash ? (flashOk ? '#dff7e2' : '#ffe0e0') : '#ffffff'; arRound(c, 20, 74, W - 40, 150, 20); c.fill();
                    arKText(c, '글자의 색깔은?', W / 2, 100, 14, '#9a8ab0', 'center', 'normal');
                    arKText(c, COLS[q.word][0], W / 2, 160, 56, COLS[q.ink][1]);
                    btns.forEach((b, i) => {
                        arBtn(c, b, '#ffffff', undefined, 0, 0, press === i);
                        const y = b.y + (press === i ? 3 : 0);
                        c.fillStyle = COLS[i][1]; c.beginPath(); c.arc(b.x + 36, y + b.h / 2, 16, 0, 7); c.fill();
                        arKText(c, COLS[i][0], b.x + b.w / 2 + 16, y + b.h / 2, 24, '#3a3a4a');
                    });
                    arKText(c, '틀리면 2초가 줄어요 · 키보드 1~4', W / 2, H - 18, 12, '#b0a0c0', 'center', 'normal');
                }
            };
        }

        /* 6. 🧩 숫자 퍼즐 : 칸을 밀어서 1부터 차례대로 맞추기 (생각하는 힘 · 계획) */
        function arSlide(h) {
            const W = h.W, H = h.H, N = 3, AREA = 300, OX = (W - AREA) / 2, OY = 100, S = AREA / N;
            const COL = ['#ffb3c7', '#ffd1a3', '#fff0a3', '#c4f0b8', '#b3e2ff', '#c9c0ff', '#f5c0ff', '#ffc9b3'];
            let tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0], moves = 0, done = false, anim = {};
            const near = i => [i - N, i + N, i % N ? i - 1 : -1, i % N < N - 1 ? i + 1 : -1].filter(j => j >= 0 && j < N * N);
            let blank = 8, prev = -1;
            for (let s = 0; s < 160 || tiles.join() === '1,2,3,4,5,6,7,8,0'; s++) {   // 맞출 수 있는 배치만 (정답에서 거꾸로 섞기)
                const opts = near(blank).filter(j => j !== prev), j = arPick(opts);
                tiles[blank] = tiles[j]; tiles[j] = 0; prev = blank; blank = j;
            }
            h.lives(-1);
            function slide(i) {
                if (done) return;
                const b = tiles.indexOf(0);
                if (!near(b).includes(i)) { h.sfx('tick'); return; }
                anim[tiles[i]] = { from: i, t: 0 };
                tiles[b] = tiles[i]; tiles[i] = 0; moves++; h.sfx('blip');
                if (tiles.join() === '1,2,3,4,5,6,7,8,0') {
                    done = true; h.score(Math.max(100, 2000 - moves * 10 - Math.floor(h.t) * 5)); h.sfx('win'); setTimeout(() => h.over(), 900);
                }
            }
            return {
                down(x, y) { const i = Math.floor((x - OX) / S), j = Math.floor((y - OY) / S); if (i >= 0 && j >= 0 && i < N && j < N) slide(j * N + i); },
                keyDown(c) {
                    const b = tiles.indexOf(0), bx = b % N, by = Math.floor(b / N);
                    const m = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [1, 0], ArrowRight: [-1, 0] }[c];   // 방향키 = 빈칸 쪽으로 미는 방향
                    if (m) { const x = bx + m[0], y = by + m[1]; if (x >= 0 && y >= 0 && x < N && y < N) slide(y * N + x); }
                },
                update(dt) { Object.keys(anim).forEach(k => { anim[k].t += dt * 9; if (anim[k].t >= 1) delete anim[k]; }); },
                draw(c) {
                    arBg(c, W, H, '#f6fff4', '#eef3ff');
                    arKText(c, '1부터 8까지 차례대로 맞춰요', W / 2, 34, 17, '#4a6a5a');
                    arText(c, 'MOVES ' + moves + '   ' + Math.floor(h.t) + 's', W / 2, 66, 10, '#6a8a7a');
                    c.fillStyle = 'rgba(60,90,80,.12)'; arRound(c, OX - 8, OY - 8, AREA + 16, AREA + 16, 18); c.fill();
                    tiles.forEach((v, i) => {
                        if (!v) return;
                        let x = OX + (i % N) * S, y = OY + Math.floor(i / N) * S;
                        const a = anim[v];
                        if (a) { const fx = OX + (a.from % N) * S, fy = OY + Math.floor(a.from / N) * S, e = 1 - Math.pow(1 - a.t, 3); x = fx + (x - fx) * e; y = fy + (y - fy) * e; }
                        const ok = tiles[v - 1] === v;
                        arBtn(c, { x: x + 5, y: y + 5, w: S - 10, h: S - 10 }, COL[v - 1], String(v), 40, ok ? '#2f7a4a' : '#4a3a5a');
                    });
                    arKText(c, '빈칸 옆의 칸을 눌러 밀어요', W / 2, H - 20, 12, '#8aa09a', 'center', 'normal');
                }
            };
        }

        /* ---------- 게임 목록 ---------- */
        const ARCADE_GAMES = [
            { id: 'shooter', name: '별사탕 비행대', icon: '🚀', color: '#6c5ce7', desc: '말랑 비행기로 캔디 몬스터를 물리쳐요', how: ['손가락으로 끌어서 움직여요 · 발사는 자동', '방향키로 움직여요 · 발사는 자동'], W: 360, H: 560, create: arShooter },
            { id: 'breakout', name: '젤리 벽돌깨기', icon: '🧱', color: '#e17055', desc: '공을 튕겨 마카롱 젤리 블록을 깨요', how: ['손가락으로 받침대를 끌고, 떼면 공이 출발', '← → 로 움직이고 스페이스로 출발'], W: 360, H: 540, create: arBreakout },
            { id: 'maze', name: '사탕 미로', icon: '🍬', color: '#fd79a8', desc: '사탕을 모으며 유령을 피해요 · 🍓를 먹으면 반격!', how: ['화면을 밀거나 아래 버튼으로 방향을 바꿔요', '방향키로 움직여요'], W: 360, H: 380, pad: true, create: arMaze },
            { id: 'mole', name: '말랑이 뿅망치', icon: '🐹', color: '#00b894', desc: '45초 동안 튀어나오는 말랑이를 톡톡! 💣는 피해요', how: ['튀어나온 말랑이를 손가락으로 톡', '튀어나온 말랑이를 마우스로 클릭'], W: 360, H: 480, create: arMole },
            { id: 'snake', name: '애벌레 냠냠', icon: '🐛', color: '#55a630', desc: '과일을 먹고 길어져요 · 벽과 내 몸은 조심', how: ['화면을 밀거나 아래 버튼으로 방향을 바꿔요', '방향키로 방향을 바꿔요'], W: 360, H: 380, pad: true, create: arSnake },
            { id: 'runner', name: '토끼 점프', icon: '🐰', color: '#0984e3', desc: '장애물을 뛰어넘으며 멀리 달려요 · 🍬는 보너스', how: ['화면을 톡 하면 점프 (두 번 톡 = 2단 점프)', '스페이스로 점프 (두 번 = 2단 점프)'], W: 360, H: 420, create: arRunner },
            { id: 'memory', name: '말랑 짝꿍', icon: '🃏', color: '#e84393', group: 'brain', skill: '기억력', desc: '카드를 뒤집어 같은 그림을 찾아요 · 빠를수록 고득점', how: ['카드를 톡 해서 뒤집어요', '카드를 클릭해서 뒤집어요'], W: 360, H: 500, create: arMemory },
            /* 🧠 두뇌 게임 */
            { id: 'simon', name: '말랑 따라하기', icon: '🎵', color: '#a55eea', group: 'brain', skill: '순서 기억', desc: '빛나는 순서를 기억해서 똑같이 눌러요 · 한 단계씩 길어져요', how: ['불이 들어온 순서대로 톡톡', '순서대로 클릭하거나 키보드 1~4'], W: 360, H: 440, create: arSimon },
            { id: 'flash', name: '반짝 위치 기억', icon: '✨', color: '#3867d6', group: 'brain', skill: '공간 기억', desc: '잠깐 빛난 칸의 자리를 기억해서 눌러요', how: ['빛났던 칸을 모두 톡', '빛났던 칸을 모두 클릭'], W: 360, H: 440, create: arFlash },
            { id: 'digits', name: '숫자 기억', icon: '🔢', color: '#fa8231', group: 'brain', skill: '작업 기억', desc: '하나씩 나오는 숫자를 기억했다가 그대로 입력해요', how: ['숫자를 본 뒤 아래 버튼으로 입력', '숫자를 본 뒤 키보드로 입력하고 Enter'], W: 360, H: 520, create: arDigits },
            { id: 'math', name: '빠른 셈', icon: '➕', color: '#20bf6b', group: 'brain', skill: '계산력', desc: '60초 동안 계산 문제를 최대한 많이 풀어요', how: ['정답 버튼을 톡', '정답을 클릭하거나 키보드 1~4'], W: 360, H: 480, create: arMath },
            { id: 'stroop', name: '색깔 헷갈리기', icon: '🎨', color: '#eb3b5a', group: 'brain', skill: '집중력', desc: '글자의 뜻 말고 글자의 색깔을 골라요', how: ['글자 색과 같은 버튼을 톡', '글자 색을 클릭하거나 키보드 1~4'], W: 360, H: 480, create: arStroop },
            { id: 'slide', name: '숫자 퍼즐', icon: '🧩', color: '#0fb9b1', group: 'brain', skill: '생각하는 힘', desc: '칸을 밀어서 1부터 8까지 차례대로 맞춰요', how: ['빈칸 옆의 칸을 톡', '칸을 클릭하거나 방향키'], W: 360, H: 450, create: arSlide }
        ];

        /* ---------- 오락실 본체 ---------- */
        const ar = { built: false, open: false, game: null, inst: null, state: 'lobby', score: 0, t: 0, raf: 0, last: 0, ac: null, best: {}, ptr: null, keys: {} };
        const arSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;     // 로그인 → 드라이브 설정 / 게스트 → 이 기기
        function arReadBest() {
            try { return JSON.parse(arSync() ? store.getItem(ARCADE_BEST_SYNC) : localStorage.getItem(ARCADE_BEST_KEY)) || {}; } catch (e) { return {}; }
        }
        function arSaveBest() {
            const t = JSON.stringify(ar.best);
            try { if (arSync()) store.setItem(ARCADE_BEST_SYNC, t); else localStorage.setItem(ARCADE_BEST_KEY, t); } catch (e) {}
        }
        const aq = id => document.getElementById(id);
        const arTouch = () => matchMedia('(pointer: coarse)').matches;

        function arBuild() {
            if (ar.built) return;
            ar.built = true;
            const el = document.createElement('div');
            el.id = 'arcadeRoom'; el.className = 'ar-room';
            el.innerHTML = `
              <div class="ar-lobby" id="arLobby">
                <div class="ar-head">
                  <div class="ar-sign"><span class="ar-neon">MALANG ARCADE</span><b>🕹️ 말랑 오락실</b></div>
                  ${typeof sndFxBtn === 'function' ? sndFxBtn('ar-ibtn') : ''}
                  <button class="ar-ibtn" type="button" onclick="closeArcade()" aria-label="닫기">✕</button>
                </div>
                <p class="ar-coin">INSERT COIN <i>·</i> 게임을 골라 주세요</p>
                <h3 class="ar-group">🕹️ 오락실 게임</h3>
                <div class="ar-cabs" id="arCabs"></div>
                <h3 class="ar-group">🧠 두뇌 게임 <small>기억력 · 집중력 · 계산력</small></h3>
                <div class="ar-cabs" id="arCabsBrain"></div>
                <p class="ar-foot">최고 점수는 내 드라이브에 저장돼서 PC·휴대폰 어디서나 같아요.<br>게임이 끝나면 🏆 명예의 전당에 점수를 올려 순위를 겨뤄 보세요!</p>
              </div>
              <div class="ar-play" id="arPlay" hidden>
                <div class="ar-bar">
                  <button class="ar-ibtn" type="button" onclick="arBackToLobby()" aria-label="오락실로">←</button>
                  <div class="ar-bar-t" id="arTitle"></div>
                  <div class="ar-stat"><small>SCORE</small><b id="arScore">0</b></div>
                  <div class="ar-stat"><small>BEST</small><b id="arBest">0</b></div>
                  <div class="ar-lives" id="arLives"></div>
                  <button class="ar-ibtn" id="arPauseBtn" type="button" onclick="arTogglePause()" aria-label="잠깐 멈춤">⏸</button>
                </div>
                <div class="ar-stage" id="arStage">
                  <div class="ar-screen" id="arScreen">
                    <canvas id="arCanvas"></canvas>
                    <div class="ar-over" id="arOverlay"></div>
                  </div>
                </div>
                <div class="ar-pad" id="arPad" hidden>
                  <button type="button" data-d="up" aria-label="위">▲</button>
                  <button type="button" data-d="left" aria-label="왼쪽">◀</button>
                  <button type="button" data-d="down" aria-label="아래">▼</button>
                  <button type="button" data-d="right" aria-label="오른쪽">▶</button>
                </div>
              </div>`;
            document.body.appendChild(el);
            ARCADE_GAMES.forEach(g => {
                const cabs = aq(g.group === 'brain' ? 'arCabsBrain' : 'arCabs');
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'ar-cab'; b.style.setProperty('--c', g.color);
                b.innerHTML = `<span class="ar-cab-scr"><span class="ar-cab-ico">${g.icon}</span>${g.skill ? '<span class="ar-cab-skill"></span>' : ''}</span><b></b><small></small><span class="ar-cab-best" data-best="${g.id}"></span>`;
                b.querySelector('b').textContent = g.name; b.querySelector('small').textContent = g.desc;
                if (g.skill) b.querySelector('.ar-cab-skill').textContent = '🧠 ' + g.skill;
                b.onclick = () => arOpenGame(g);
                cabs.appendChild(b);
            });
            /* 손가락 · 마우스 */
            const cv = aq('arCanvas');
            const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * ar.game.W, (e.clientY - r.top) / r.height * ar.game.H]; };
            cv.addEventListener('pointerdown', e => {
                if (!ar.game) return;
                arSound();
                if (ar.state === 'ready') { arStart(); return; }
                if (ar.state !== 'play') return;
                e.preventDefault();
                try { cv.setPointerCapture(e.pointerId); } catch (er) {}
                const [x, y] = pt(e);
                ar.ptr = { id: e.pointerId, x, y, sx: x, sy: y, moved: false, t: performance.now() };
                ar.inst.down && ar.inst.down(x, y);
            });
            cv.addEventListener('pointermove', e => {
                if (!ar.ptr || ar.ptr.id !== e.pointerId || ar.state !== 'play') return;
                const [x, y] = pt(e), dx = x - ar.ptr.x, dy = y - ar.ptr.y;
                ar.ptr.x = x; ar.ptr.y = y;
                ar.inst.move && ar.inst.move(x, y, dx, dy);
                if (ar.inst.swipe && !ar.ptr.moved) {                    // 밀기 → 방향
                    const tx = x - ar.ptr.sx, ty = y - ar.ptr.sy;
                    if (Math.hypot(tx, ty) > 18) {
                        ar.inst.swipe(Math.abs(tx) > Math.abs(ty) ? (tx > 0 ? 'right' : 'left') : (ty > 0 ? 'down' : 'up'));
                        ar.ptr.moved = true;
                    }
                }
            });
            const endPtr = e => {
                if (!ar.ptr || ar.ptr.id !== e.pointerId) return;
                ar.ptr = null;
                if (ar.state === 'play' && ar.inst.up) ar.inst.up();
            };
            cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', endPtr);
            aq('arOverlay').addEventListener('click', e => { if (e.target.closest('button')) return; arSound(); if (ar.state === 'ready') arStart(); else if (ar.state === 'pause') arTogglePause(); });
            aq('arPad').querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', e => {
                e.preventDefault(); arSound();
                if (ar.state === 'play' && ar.inst.pad) ar.inst.pad(b.dataset.d);
            }));
            document.addEventListener('keydown', arKey, true);
            document.addEventListener('keyup', e => { if (ar.open && ar.inst && ar.inst.keyUp) ar.inst.keyUp(e.code); }, true);
            document.addEventListener('visibilitychange', () => { if (document.hidden && ar.state === 'play') arTogglePause(); });
            window.addEventListener('resize', () => { if (ar.game) arFit(); });
        }

        function arKey(e) {
            if (!ar.open) return;
            e.stopPropagation();                                         // 오락실이 열려 있는 동안 다이어리 단축키는 쉬기
            if (e.key === 'Escape') { e.preventDefault(); if (ar.game) arBackToLobby(); else closeArcade(); return; }
            if (!ar.game) return;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Backspace', 'Enter'].includes(e.code)) e.preventDefault();
            arSound();
            if (e.code === 'KeyP') { arTogglePause(); return; }
            if ((e.code === 'Space' || e.code === 'Enter') && (ar.state === 'ready' || ar.state === 'over')) { if (!e.repeat) arStart(); return; }
            if (ar.state === 'play' && ar.inst.keyDown && !e.repeat) ar.inst.keyDown(e.code);
            else if (ar.state === 'play' && ar.inst.keyDown && e.repeat && /Arrow/.test(e.code)) ar.inst.keyDown(e.code);
        }

        function openArcade() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            arBuild();
            ar.best = arReadBest();
            ar.open = true;
            aq('arcadeRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            arBackToLobby();
            arSound();
        }
        function closeArcade() {
            arStopLoop();
            ar.open = false; ar.game = null; ar.inst = null; ar.state = 'lobby';
            const r = aq('arcadeRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        function arBackToLobby() {
            arStopLoop();
            ar.game = null; ar.inst = null; ar.state = 'lobby';
            aq('arPlay').hidden = true; aq('arLobby').hidden = false;
            document.querySelectorAll('[data-best]').forEach(s => { const v = ar.best[s.dataset.best]; s.textContent = v ? 'BEST ' + v : 'NEW'; });
        }
        function arOpenGame(g) {
            arSound(); ar.game = g;
            aq('arLobby').hidden = true; aq('arPlay').hidden = false;
            aq('arTitle').textContent = g.icon + ' ' + g.name;
            aq('arPad').hidden = !g.pad;
            aq('arPlay').style.setProperty('--c', g.color);
            arFit();
            arNewInstance();
            ar.state = 'ready';
            arOverlay('ready');
            arStartLoop();
        }
        function arNewInstance() {
            const g = ar.game;
            ar.score = 0; ar.t = 0; ar.shakeT = 0;
            aq('arScore').textContent = '0'; aq('arBest').textContent = ar.best[g.id] || 0; aq('arLives').textContent = '';
            const host = {
                W: g.W, H: g.H,
                get t() { return ar.t; },
                score(n) { ar.score = Math.max(0, Math.floor(n)); aq('arScore').textContent = ar.score; },
                addScore(n) { host.score(ar.score + n); },
                lives(n) { aq('arLives').textContent = n < 0 ? '' : '♥'.repeat(Math.max(0, n)); },
                over() { if (ar.state === 'play') arGameOver(); },
                sfx: arSfx,
                shake() { ar.shakeT = .3; }
            };
            ar.inst = g.create(host);
        }
        function arStart() {
            if (ar.state === 'over') arNewInstance();
            if (typeof hofStart === 'function') hofStart(ar.game.id);          // 🏆 명예의 전당 시작 표 (js/hof.js)
            ar.state = 'play';
            aq('arOverlay').classList.remove('on');
            aq('arPauseBtn').textContent = '⏸';
            arSfx('start');
        }
        function arTogglePause() {
            if (ar.state === 'play') { ar.state = 'pause'; arOverlay('pause'); aq('arPauseBtn').textContent = '▶'; }
            else if (ar.state === 'pause') { ar.state = 'play'; aq('arOverlay').classList.remove('on'); aq('arPauseBtn').textContent = '⏸'; ar.last = performance.now(); }
        }
        function arGameOver() {
            ar.state = 'over';
            const g = ar.game, best = ar.best[g.id] || 0, isNew = ar.score > best;
            if (isNew) { ar.best[g.id] = ar.score; arSaveBest(); aq('arBest').textContent = ar.score; }
            arSfx(isNew ? 'win' : 'over');
            setTimeout(() => { if (ar.state === 'over' && ar.game === g) arOverlay('over', isNew); }, 500);
        }
        function arOverlay(kind, isNew) {
            const o = aq('arOverlay'), g = ar.game, touch = arTouch();
            if (kind === 'ready') {
                o.innerHTML = `<div class="ar-ov-ico">${g.icon}</div><div class="ar-ov-t">${g.name}</div><p></p><div class="ar-blink">${touch ? 'TAP TO START' : 'PRESS SPACE'}</div>`;
                o.querySelector('p').textContent = g.how[touch ? 0 : 1];
            } else if (kind === 'pause') {
                o.innerHTML = `<div class="ar-ov-t">PAUSE</div><div class="ar-blink">${touch ? 'TAP TO CONTINUE' : 'P 또는 클릭으로 계속'}</div>`;
            } else {
                o.innerHTML = `<div class="ar-ov-t">GAME OVER</div><div class="ar-ov-score">${ar.score}</div>${isNew ? '<div class="ar-new">🎉 NEW RECORD!</div>' : `<p>BEST ${ar.best[g.id] || 0}</p>`}
                  ${typeof hofOverBtn === 'function' ? hofOverBtn(g.id, ar.score) : ''}
                  <div class="ar-ov-btns"><button type="button" class="ar-btn" onclick="arStart()">🔁 다시 하기</button><button type="button" class="ar-btn ghost" onclick="arBackToLobby()">🕹️ 오락실로</button></div>`;
            }
            o.classList.add('on');
        }
        /* 화면 크기에 맞춰 게임 화면 늘리고 줄이기 (선명하게) */
        function arFit() {
            const g = ar.game; if (!g) return;
            const stage = aq('arStage'), cv = aq('arCanvas'), scr = aq('arScreen');
            const aw = stage.clientWidth - 8, ah = stage.clientHeight - 8;
            const k = Math.max(.3, Math.min(aw / g.W, ah / g.H, 1.6));
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            scr.style.width = Math.floor(g.W * k) + 'px'; scr.style.height = Math.floor(g.H * k) + 'px';
            cv.width = Math.floor(g.W * k * dpr); cv.height = Math.floor(g.H * k * dpr);
            ar.k = k * dpr;
        }
        function arStartLoop() { arStopLoop(); ar.last = performance.now(); ar.raf = requestAnimationFrame(arLoop); }
        function arStopLoop() { cancelAnimationFrame(ar.raf); ar.raf = 0; }
        function arLoop(now) {
            ar.raf = requestAnimationFrame(arLoop);
            const dt = Math.min(1 / 30, (now - ar.last) / 1000); ar.last = now;
            if (!ar.inst) return;
            if (ar.state === 'play') { ar.t += dt; ar.inst.update && ar.inst.update(dt); }
            const c = aq('arCanvas').getContext('2d');
            c.setTransform(ar.k, 0, 0, ar.k, 0, 0);
            if (ar.shakeT > 0) { ar.shakeT -= dt; c.translate(arRand(-4, 4), arRand(-4, 4)); }
            try { ar.inst.draw(c); } catch (e) {}
        }

        /* ---------- 8비트 소리 (파일 없이 · 아이폰 무음 모드에서도) ---------- */
        function arSound() { ar.ac = typeof sndFx === 'function' ? sndFx() : null; return ar.ac; }     // 연출 소리가 꺼져 있으면 null (js/sound.js)
        function arTone(f, d, type, vol, when, slide) {
            const ac = ar.ac; if (!ac || !sndOn()) return;
            const t = ac.currentTime + (when || 0), o = ac.createOscillator(), g = ac.createGain();
            o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
            if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
            g.gain.setValueAtTime(vol || .06, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
            o.connect(g).connect(sndOut()); o.start(t); o.stop(t + d + .02);
        }
        const AR_SFX = {
            pew: () => arTone(880, .06, 'square', .025, 0, 1400),
            pop: () => { arTone(660, .07, 'square', .05); arTone(990, .08, 'square', .04, .05); },
            tick: () => arTone(520, .04, 'square', .035),
            blip: () => arTone(1046, .05, 'square', .04),
            boing: () => arTone(330, .09, 'triangle', .09, 0, 520),
            jump: () => arTone(400, .14, 'square', .045, 0, 800),
            up: () => [523, 659, 784, 1046].forEach((f, i) => arTone(f, .08, 'square', .045, i * .06)),
            hurt: () => arTone(300, .3, 'sawtooth', .06, 0, 80),
            start: () => [392, 523, 659, 784].forEach((f, i) => arTone(f, .09, 'square', .045, i * .08)),
            over: () => [392, 330, 262, 196].forEach((f, i) => arTone(f, .16, 'square', .05, i * .14)),
            win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => arTone(f, .1, 'square', .05, i * .09))
        };
        function arSfx(n) { if (!ar.ac || !sndOn()) return; try { AR_SFX[n] && AR_SFX[n](); } catch (e) {} }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['arcade'] = true;
