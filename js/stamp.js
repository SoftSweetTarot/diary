/* 말랑달콤 다이어리 - js/stamp.js
   😊☀️ 오늘의 기분 · 날씨 도장 : 다이어리 페이지 오른쪽 위에 콕! (페이지의 '기분' · '날씨' 동그라미를 눌러요)
   - 날마다 기분 하나 · 날씨 하나 · 같은 걸 다시 누르면 지워져요
   - 그날 일기 파일에 함께 저장 (mo = 기분 · we = 날씨) · 📅 한 달 모아보기에도 기분이 보여요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (도장 칸만 안 보여요 · 저장된 도장은 그대로 남아요) */

        const PS_MOODS = [
            ['happy', '😊', '행복', '#ffd23f'], ['love', '🥰', '설렘', '#ff9fc6'], ['calm', '😌', '평온', '#7fd8b8'], ['soso', '😐', '그저 그래', '#c8c8c8'],
            ['tired', '😪', '피곤', '#b9a4ff'], ['sad', '😢', '슬픔', '#8cc8ff'], ['angry', '😠', '화남', '#ff8f7a'], ['sick', '🤒', '아픔', '#a8c46a']
        ];
        const PS_WEATHERS = [
            ['sun', '☀️', '맑음', '#ffb52e'], ['partly', '⛅', '구름 조금', '#9fc8f0'], ['cloud', '☁️', '흐림', '#a8b4c4'], ['rain', '🌧️', '비', '#5f9fe0'],
            ['snow', '❄️', '눈', '#8fb8f0'], ['wind', '🌬️', '바람', '#7fd0d8'], ['rainbow', '🌈', '무지개', '#ff8fab']
        ];
        const psFind = (list, id) => list.find(x => x[0] === id) || null;
        const psq = id => document.getElementById(id);

        function psHtml(mo, we, live) {                    // 도장 두 개 (live = 눌러서 고르기)
            const one = (kind, list, id, label) => {
                const x = psFind(list, id);
                const inner = x ? `<b>${x[1]}</b><small>${x[2]}</small>` : `<b class="ps-empty">+</b><small>${label}</small>`;
                return live ? `<button type="button" class="ps-st${x ? ' on' : ''}" style="--c:${x ? x[3] : '#ddd'}" onclick="psOpen('${kind}', event)">${inner}</button>`
                    : (x ? `<span class="ps-st on" style="--c:${x[3]}">${inner}</span>` : '');
            };
            return one('mo', PS_MOODS, mo, '기분') + one('we', PS_WEATHERS, we, '날씨');
        }
        function psRender() {
            let box = psq('pageStamps');
            const page = psq('innerPage'); if (!page) return;
            if (!box) { box = document.createElement('div'); box.id = 'pageStamps'; box.className = 'page-stamps'; page.appendChild(box); }
            box.innerHTML = psHtml(pageStamps.mo, pageStamps.we, true);
        }
        /* 페이지 넘길 때 보이는 그림 페이지에도 (js/page.js 의 buildStaticPage 에서 불러요) */
        function psStaticHtml(date) {
            let raw = null; try { raw = JSON.parse(store.getItem(getDateKey(date))); } catch (e) {}
            return raw && (raw.mo || raw.we) ? `<div class="page-stamps">${psHtml(raw.mo, raw.we, false)}</div>` : '';
        }

        /* 고르기 창 */
        function psOpen(kind, e) {
            if (e) e.stopPropagation();
            psClose();
            const list = kind === 'mo' ? PS_MOODS : PS_WEATHERS, cur = pageStamps[kind];
            const pop = document.createElement('div');
            pop.id = 'psPop'; pop.className = 'ps-pop';
            pop.innerHTML = `<div class="ps-pop-t">${kind === 'mo' ? '오늘의 기분은?' : '오늘의 날씨는?'}</div><div class="ps-pop-g">`
                + list.map(x => `<button type="button" class="${x[0] === cur ? 'on' : ''}" style="--c:${x[3]}" onclick="psSet('${kind}','${x[0]}')"><b>${x[1]}</b><small>${x[2]}</small></button>`).join('')
                + `</div>${cur ? `<button type="button" class="ps-clear" onclick="psSet('${kind}','')">도장 지우기</button>` : ''}`;
            document.body.appendChild(pop);
            const r = (e && e.currentTarget ? e.currentTarget : psq('pageStamps')).getBoundingClientRect();
            const w = pop.offsetWidth, h = pop.offsetHeight;
            pop.style.left = Math.max(6, Math.min(window.innerWidth - w - 6, r.right - w)) + 'px';
            pop.style.top = Math.max(6, Math.min(window.innerHeight - h - 6, r.bottom + 8)) + 'px';
            setTimeout(() => document.addEventListener('pointerdown', psOutside, true), 0);
        }
        function psOutside(e) { const p = psq('psPop'); if (p && !p.contains(e.target)) psClose(); }
        function psClose() { const p = psq('psPop'); if (p) p.remove(); document.removeEventListener('pointerdown', psOutside, true); }
        function psSet(kind, id) {
            pageStamps[kind] = pageStamps[kind] === id ? '' : id;
            psClose(); psRender();
            if (pageStamps[kind]) {
                const st = psq('pageStamps').querySelectorAll('.ps-st')[kind === 'mo' ? 0 : 1];
                if (st) { st.classList.remove('pop'); void st.offsetWidth; st.classList.add('pop'); }
            }
            saveData(false);
        }
        window.psRender = psRender;
        window.psStaticHtml = psStaticHtml;
        window.psOpen = psOpen;
        window.psSet = psSet;
