/* 말랑달콤 다이어리 - js/month.js
   📅 한 달 모아보기 : 한 달 동안 쓴 일기를 달력 한 장으로 (다이어리 위쪽 날짜를 누르면 열려요)
   - 일기를 쓴 날에는 그날의 대표 그림이 보여요 : 사진 → 스티커 그림 → 이모지 스티커 → 인형 → 📝(글만)
   - 날짜를 누르면 그날 일기로 바로 가요
   - 드라이브 사용 : 그 달의 파일 목록 1번 + 아직 안 읽은 '가벼운' 날 파일만 읽어요 (사진이 많은 큰 날은 📷 표시만, 눌러서 볼 때 읽어요)
     한 번 읽은 날은 기억해 두어서, 그 날로 넘길 때 다시 읽지 않아요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (날짜를 눌러도 아무 일 없어요) */

        const MO_LIGHT = 80000;          // 이보다 작은 날 파일만 미리 읽어 대표 그림을 보여 줘요 (바이트)
        const mo = { built: false, y: 0, m: 0, gen: 0 };
        const moq = id => document.getElementById(id);

        function moBuild() {
            if (mo.built) return;
            mo.built = true;
            const el = document.createElement('div');
            el.id = 'monthRoom'; el.className = 'mo-room';
            el.innerHTML = `
              <div class="mo-bar"><span class="mo-sp"></span><b>📅 한 달 모아보기</b><button class="mo-x" type="button" onclick="closeMonth()" aria-label="닫기">✕</button></div>
              <div class="mo-wrap">
                <div class="mo-head"><button type="button" onclick="moMove(-1)" aria-label="지난달">‹</button><b id="moTitle"></b><button type="button" onclick="moMove(1)" aria-label="다음 달">›</button></div>
                <div class="mo-sum" id="moSum"></div>
                <div class="mo-week"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
                <div class="mo-grid" id="moGrid"></div>
                <p class="mo-note">💡 날짜를 누르면 그날 일기로 가요. 📷 는 사진이 많은 날이에요 (눌러서 보면 그림이 나와요).</p>
              </div>`;
            document.body.appendChild(el);
        }

        /* 그날의 대표 그림 */
        function moPreview(date) {
            let items = [];
            try { items = readDayData(date); } catch (e) {}
            if (!items.length) return null;
            const imgs = items.filter(i => i.type === 'image' && i.content);
            const pick = imgs.find(i => !/^data:image\/svg/i.test(i.content))                                  // 사진
                || imgs.find(i => !/malang-tape|malang-draw/.test(i.content))                                       // 스티커 그림
                || null;
            if (pick) return { img: typeof resolveSrc === 'function' ? resolveSrc(pick.content) : pick.content };
            const st = items.find(i => i.type === 'sticker' && i.content);
            if (st) return { emoji: String(st.content).slice(0, 4) };
            if (items.some(i => i.type === 'doll')) return { emoji: '👧' };
            if (imgs.length) return { emoji: '🎨' };
            return { emoji: '📝' };
        }

        async function moRender() {
            const gen = ++mo.gen, y = mo.y, m = mo.m, today = new Date();
            moq('moTitle').textContent = `${y}년 ${m + 1}월`;
            const last = new Date(y, m + 1, 0).getDate(), first = new Date(y, m, 1).getDay();
            /* 그 달의 파일 목록 (로그인했을 때) */
            let files = null;
            if (typeof drive !== 'undefined' && drive.ready && !drive.guest) {
                moq('moGrid').innerHTML = '<div class="mo-loading">📅 달력을 펼치는 중…</div>';
                try { const idx = await getMonthIndex(y, m + 1, false); files = idx ? idx.files : new Map(); } catch (e) { files = new Map(); }
                if (gen !== mo.gen) return;
            }
            const days = [];
            for (let d = 1; d <= last; d++) {
                const date = new Date(y, m, d), key = getDateKey(date);
                const loaded = !files || drive.loadedDays.has(key) || (typeof drive !== 'undefined' && drive.dirtyKeys && drive.dirtyKeys.has(key));
                const f = files && files.get(dayFileName(d));
                let has = false, big = false;
                if (loaded) has = !!store.getItem(key);
                else if (f) { has = true; big = (+f.size || 0) > MO_LIGHT; }
                days.push({ d, date, key, has, big, loaded, fut: date > today && getDateKey(date) !== getDateKey(today) });
            }
            const draw = () => {
                if (gen !== mo.gen) return;
                let h = '';
                for (let i = 0; i < first; i++) h += '<span class="mo-c mo-e"></span>';
                days.forEach(x => {
                    const pv = x.has && (x.loaded || drive.loadedDays.has(x.key)) ? moPreview(x.date) : null;
                    const inner = pv ? (pv.img ? `<img src="${pv.img.replace(/"/g, '&quot;')}" alt="" loading="lazy">` : `<em>${pv.emoji}</em>`) : x.has ? `<em class="mo-wait">${x.big ? '📷' : '·'}</em>` : '';
                    h += `<button type="button" class="mo-c${x.has ? ' mo-has' : ''}${x.key === getDateKey(today) ? ' mo-today' : ''}${x.fut ? ' mo-fut' : ''}" onclick="moGo(${x.d})"><i>${x.d}</i>${inner}</button>`;
                });
                moq('moGrid').innerHTML = h;
                const n = days.filter(x => x.has).length, pastDays = y === today.getFullYear() && m === today.getMonth() ? today.getDate() : last;
                moq('moSum').innerHTML = n ? `이번 달 일기 <b>${n}</b>일` + (n === pastDays ? ' · 하루도 안 빠졌어요! 🏆' : ` · ${pastDays}일 중`) : '이 달에는 아직 일기가 없어요';
            };
            draw();
            /* 아직 안 읽은 가벼운 날 → 조금씩 읽어서 대표 그림 채우기 (한 번에 4개씩) */
            const todo = days.filter(x => x.has && !x.loaded && !x.big);
            for (let i = 0; i < todo.length && gen === mo.gen; i += 4) {
                await Promise.all(todo.slice(i, i + 4).map(x => ensureDayLoaded(x.date).catch(() => false)));
                draw();
            }
        }
        function moMove(dir) { let m = mo.m + dir, y = mo.y; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } mo.y = y; mo.m = m; moRender(); }
        function moGo(d) {
            const date = new Date(mo.y, mo.m, d);
            closeMonth();
            if (typeof goToDate === 'function') goToDate(date);
        }
        function openMonth() {
            moBuild();
            const base = typeof isCoverOpen !== 'undefined' && isCoverOpen ? currentDate : new Date();
            mo.y = base.getFullYear(); mo.m = base.getMonth();
            if (isCoverOpen) saveData(false);                    // 지금 페이지 내용도 달력에 바로 보이도록
            moq('monthRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            moRender();
        }
        function closeMonth() {
            mo.gen++;
            const r = moq('monthRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        window.openMonth = openMonth;
