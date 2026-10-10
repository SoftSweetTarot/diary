/* 말랑달콤 다이어리 - js/day-history.js
   🕘 이 날 이전 버전 : 구글 드라이브는 일기 파일마다 옛 버전을 30일 동안 보관해요 → 골라서 되돌려요
   - 💾 저장 창 → 🕘 이 날 이전 버전 (지금 펼친 날짜)
   - 지운 날(파일이 휴지통에 있음)도 휴지통 파일의 버전에서 찾아요
   - 되돌리기 = 그 버전 내용으로 지금 페이지를 바꾸고 평소처럼 저장 → 지금 내용도 새 버전으로 남아서 다시 되돌릴 수 있어요
   - 버전 목록 · 내용은 드라이브에서 바로 읽어요 (요청 : 목록 1번 + 고른 버전 1번)
   ※ 파일 불러오는 순서: drive → … → elements → day-history → settings */

        const DH = { built: false, date: null, file: null, busy: false };

        function dhBuild() {
            if (DH.built) return;
            DH.built = true;
            const w = document.createElement('div');
            w.innerHTML = `
            <div class="modal" id="dayHistory">
              <div class="modal-content dh-box">
                <div class="modal-title">🕘 이 날 이전 버전</div>
                <p class="dh-tip" id="dhTip"></p>
                <div class="dh-list" id="dhList"></div>
                <p class="dh-note">구글 드라이브는 옛 버전을 보통 <b>30일 · 최근 100개</b>까지 남겨요.<br>📌 표시는 그날을 처음 고치기 직전 모습이라 지워지지 않게 따로 보관해요.<br>되돌려도 지금 내용은 새 버전으로 남아서, 다시 되돌릴 수 있어요.</p>
                <button class="btn dh-close" type="button" onclick="closeModal('dayHistory')">닫기</button>
              </div>
            </div>`;
            document.body.appendChild(w.firstElementChild);
            document.getElementById('dhList').addEventListener('click', e => {
                const b = e.target.closest('[data-dhr]'); if (b) dhRestore(b.dataset.dhr, b.dataset.dht);
            });
        }
        const dhTime = t => new Date(t).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
        const dhSize = n => { n = +n || 0; return n >= 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(n / 1024)) + 'KB'; };

        /* 그날 파일 (없으면 휴지통에 있는 파일) + 버전들 (새것부터) */
        async function dhLoad(date) {
            const y = date.getFullYear(), m = date.getMonth() + 1, name = dayFileName(date.getDate());
            const idx = await getMonthIndex(y, m, false);
            let file = idx && idx.files.get(name), trashed = false;
            if (!file && idx) {
                const t = await driveList(`name='${qName(name)}' and '${idx.folderId}' in parents and mimeType!='${FOLDER_MIME}' and trashed=true`, 'id,name,modifiedTime');
                file = t[t.length - 1] || null; trashed = !!file;
            }
            if (!file) return { file: null, trashed, revs: [] };
            const res = await gfetch(`${DRIVE_API}/${file.id}/revisions?pageSize=200&fields=${encodeURIComponent('revisions(id,modifiedTime,size,keepForever)')}`);
            if (!res.ok) throw await driveFail(res, 'revisions');
            const revs = ((await res.json()).revisions || []).slice().sort((a, b) => Date.parse(b.modifiedTime) - Date.parse(a.modifiedTime));
            return { file, trashed, revs };
        }

        async function openDayHistory() {
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어주세요!'); return; }
            if (!drive.ready || drive.guest) { showMsg('이전 버전은 구글 드라이브에 로그인했을 때만 볼 수 있어요.'); return; }
            dhBuild();
            try { saveData(false); } catch (e) {}
            DH.date = new Date(currentDate);
            const list = document.getElementById('dhList');
            document.getElementById('dhTip').innerHTML = `<b>${DH.date.getMonth() + 1}월 ${DH.date.getDate()}일</b> 일기의 저장 기록이에요.`;
            list.innerHTML = '<div class="dh-empty">☁ 드라이브에서 불러오는 중…</div>';
            openModal('dayHistory');
            let r;
            try { r = await dhLoad(DH.date); }
            catch (e) { console.warn('이전 버전 불러오기 실패:', e); list.innerHTML = '<div class="dh-empty">⚠ 불러오지 못했어요.<br>인터넷 연결을 확인해 주세요.</div>'; return; }
            DH.file = r.file;
            if (!r.file || !r.revs.length) { list.innerHTML = '<div class="dh-empty">이 날은 아직 드라이브에 저장된 기록이 없어요.</div>'; return; }
            list.innerHTML = (r.trashed ? '<div class="dh-empty dh-warn">🗑 이 날 일기는 지워져서 휴지통에 있어요.<br>아래 버전으로 되살릴 수 있어요.</div>' : '') +
                r.revs.map((v, i) => {
                    const now = i === 0 && !r.trashed;
                    return `<div class="dh-row${now ? ' dh-now' : ''}"><div class="dh-when"><b>${v.keepForever ? '📌 ' : ''}${dhTime(v.modifiedTime)}</b><small>${dhSize(v.size)}${now ? ' · 지금 내용' : v.keepForever ? ' · 오래 보관' : ''}</small></div>` +
                        (now ? '<span class="dh-tag">지금</span>' : `<button type="button" class="btn dh-btn" data-dhr="${v.id}" data-dht="${v.modifiedTime}">↩ 되돌리기</button>`) + '</div>';
                }).join('');
        }

        async function dhRestore(revId, when) {
            if (DH.busy || !DH.file || !DH.date) return;
            if (getDateKey(currentDate) !== getDateKey(DH.date)) { showMsg('다른 날짜로 넘어갔어요.<br>그 날로 돌아가서 다시 열어 주세요.'); return; }
            DH.busy = true;
            try {
                /* 구글은 '오래 보관' 표시가 된 버전만 내용을 받을 수 있어요 → 먼저 표시 (이미 돼 있으면 그대로) */
                const pin = await gfetch(`${DRIVE_API}/${DH.file.id}/revisions/${revId}?fields=id,keepForever`, { method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify({ keepForever: true }) });
                if (!pin.ok) {
                    const why = await driveReason(pin);
                    showMsg(/limit|max/i.test(why) ? '⚠ 이 날은 보관한 버전이 너무 많아서 더 꺼낼 수 없어요.<br><span style="font-size:12px;color:#777;">드라이브 웹 → 파일 → 버전 관리에서 오래된 버전을 지운 뒤 다시 해 주세요.</span>' : '⚠ 이 버전을 꺼내지 못했어요.<br>인터넷 연결을 확인해 주세요.');
                    return;
                }
                const res = await gfetch(`${DRIVE_API}/${DH.file.id}/revisions/${revId}?alt=media`);
                if (!res.ok) throw await driveFail(res, 'revision');
                const key = getDateKey(DH.date);
                const obj = parseJsonObject(await res.text(), key);
                if (!obj || !Array.isArray(obj.i)) { showMsg('⚠ 이 버전은 읽을 수 없어요.'); return; }
                const n = { t: 0, i: 0, d: 0, s: 0 }; obj.i.forEach(x => { if (x && n[x.t] != null) n[x.t]++; });
                const what = [n.t && `글 ${n.t}`, n.i && `그림 ${n.i}`, n.d && `인형 ${n.d}`, n.s && `스티커 ${n.s}`].filter(Boolean).join(' · ') || '빈 페이지';
                if (!(await showMsg(`<b>${dhTime(when)}</b> 버전으로 되돌릴까요?<br><span style="font-size:12px;color:#777;">${what}<br>지금 내용은 새 버전으로 남아서 다시 되돌릴 수 있어요.</span>`, true))) return;
                if (getDateKey(currentDate) !== key) return;
                store.setItem(key, JSON.stringify(obj));                        // 평소 저장과 똑같이 (다른 기기 확인도 그대로)
                loadData();
                closeModal('dayHistory');
                const ok = await flushUpload({ force: true });
                showMsg(ok ? `↩ ${dhTime(when)} 버전으로 되돌렸어요!` : '↩ 되돌렸지만 드라이브 저장에 실패했어요.<br>잠시 후 자동으로 다시 시도해요.');
            } catch (e) {
                console.warn('되돌리기 실패:', e);
                showMsg('⚠ 되돌리지 못했어요.<br>인터넷 연결을 확인해 주세요.');
            } finally { DH.busy = false; }
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['day-history'] = true;
