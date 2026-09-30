/* 말랑달콤 다이어리 - js/settings.js
   PC 백업/불러오기 · PNG 저장 · 용량 확인 · 스킨 · 자동 저장 주기 · 창 열기/닫기
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        async function exportJSON() {
            saveData(false);
            if (drive.ready && !drive.guest) {
                const st = document.getElementById('driveStatusText');
                if (st) st.textContent = '📂 드라이브의 모든 일기를 불러오는 중…';
                let failed = -1;
                try { failed = await loadAllDays(); } catch (e) {}
                updateStorageInfo();
                if (failed !== 0) { showMsg('⚠ 일부 일기를 불러오지 못해 백업을 만들지 못했어요.<br>잠시 후 다시 시도해 주세요.'); return; }
            }
            const blob = new Blob([store.toJSONString()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `MyDiary_Backup_${getDateKey(currentDate)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }

        function triggerImportJSON() { document.getElementById('jsonInput').click(); }

        function importJSON(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function(evt) {
                try {
                    const importedData = JSON.parse(evt.target.result);
                    if (!importedData || typeof importedData !== 'object' || Array.isArray(importedData)) throw new Error('format');
                    Object.keys(importedData).forEach(key => {
                        if (key.startsWith('diary_') && key !== PAGE_SIZE_KEY) {
                            store.setItem(key, JSON.stringify(importedData[key]));
                            if (isDayKey(key)) drive.loadedDays.add(key);      // 가져온 내용이 그 날짜의 최신 내용
                        }
                    });
                } catch (err) { showMsg('⚠ 올바르지 않은 JSON 파일입니다.'); return; }

                applyLoadedData();
                if (drive.ready && !drive.guest) {
                    const ok = await flushUpload({ force: true });   // 날짜별 파일로 드라이브에 저장
                    showMsg(ok
                        ? '📥 데이터 복원이 완료되었고,<br>구글 드라이브의 날짜별 파일도 갱신했어요!'
                        : '📥 복원은 되었지만 드라이브 저장에 실패했어요.<br>잠시 후 자동으로 다시 시도합니다.');
                } else {
                    showMsg('📥 데이터 복원이 완료되었어요.<br>(드라이브에 연결되지 않아 저장은 되지 않았어요)');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        }

        function roundedRectPath(ctx, x, y, w, h, radii) {
            const [tl, tr, br, bl] = radii;
            ctx.beginPath();
            ctx.moveTo(x + tl, y);
            ctx.lineTo(x + w - tr, y);
            ctx.arcTo(x + w, y, x + w, y + tr, tr);
            ctx.lineTo(x + w, y + h - br);
            ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
            ctx.lineTo(x + bl, y + h);
            ctx.arcTo(x, y + h, x, y + h - bl, bl);
            ctx.lineTo(x, y + tl);
            ctx.arcTo(x, y, x + tl, y, tl);
            ctx.closePath();
        }

        function exportToPNG() {
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어주세요!'); return; }
            if (turn) return;
            if (selectedElement) selectedElement.classList.remove('selected');

            const navButtons = document.querySelectorAll('.page-nav-btn');
            navButtons.forEach(btn => btn.style.visibility = 'hidden');

            const innerPage = document.getElementById('innerPage');
            const prevShadow = innerPage.style.boxShadow;
            innerPage.style.boxShadow = 'none';

            const restore = () => {
                innerPage.style.boxShadow = prevShadow;
                navButtons.forEach(btn => btn.style.visibility = 'visible');
                if (selectedElement) selectedElement.classList.add('selected');
            };

            html2canvas(innerPage, {
                backgroundColor: null,
                useCORS: true,
                scale: 2
            }).then(canvas => {
                const s = canvas.width / innerPage.offsetWidth;
                const out = document.createElement('canvas');
                out.width = canvas.width;
                out.height = canvas.height;
                const ctx = out.getContext('2d');
                roundedRectPath(ctx, 0, 0, out.width, out.height, [15 * s, 22 * s, 22 * s, 15 * s]);
                ctx.clip();
                ctx.drawImage(canvas, 0, 0);

                const link = document.createElement('a');
                link.download = `${getDateKey(currentDate)}.png`;
                link.href = out.toDataURL('image/png');
                link.click();
                restore();
            }).catch(() => {
                restore();
                showMsg('⚠ PNG 저장에 실패했습니다.');
            });
        }

        let storageStats = null;   // 드라이브 '말랑달콤 / 다이어리' 폴더 전체 통계 (설정창을 열 때 갱신)
        async function refreshStorageStats() {
            if (!drive.ready || drive.guest) { storageStats = null; updateStorageInfo(); return; }
            try {
                const all = await driveEnumerateAll();
                storageStats = { days: all.length, bytes: all.reduce((s, f) => s + f.size, 0) };
            } catch (e) {}
            updateStorageInfo();
        }

        function updateStorageInfo() {
            const t = document.getElementById('lsText');
            const d = document.getElementById('lsDetail');
            if (storageStats) {
                const bytes = storageStats.bytes;
                const size = bytes >= 1048576 ? (bytes / 1048576).toFixed(2) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
                if (t) t.innerText = size;
                if (d) d.innerText = `일기 ${storageStats.days}일치 · 하루에 파일 1개씩 저장`;
            } else {
                if (t) t.innerText = drive.ready ? '계산 중…' : '-';
                if (d) d.innerText = '';
            }
            const st = document.getElementById('driveStatusText');
            if (st) st.textContent = drive.guest ? '☁ 구글 드라이브에 연결되지 않음 (저장 안 됨)'
                : drive.ready ? `☁ 연결됨 · ${USE_APP_DATA_FOLDER ? '앱 전용 공간' : '내 드라이브'} / ${ROOT_PATH_TEXT} / 년도 / 월 / 일.json` : '☁ 연결 안 됨';
        }

        function applySkinPreset(skinName) {
            let skin = skinPresets[skinName] || customSkins[skinName];
            if (!skin) return;

            const root = document.documentElement;
            root.style.setProperty('--bg-color', skin.bg);
            root.style.setProperty('--cover-bg', skin.cover);
            root.style.setProperty('--page-bg', skin.page);
            root.style.setProperty('--border-color', skin.border);
            root.style.setProperty('--primary-accent', skin.accent);

            if (skinPresets[skinName]) {
                document.getElementById('customBg').value = skin.bg.startsWith('#') ? skin.bg : '#ffe6f0';
                document.getElementById('customPage').value = skin.page;
                document.getElementById('customBorder').value = skin.border;
                document.getElementById('customAccent').value = skin.accent;
            }
        }

        function previewCustomColor() {
            const root = document.documentElement;
            root.style.setProperty('--bg-color', document.getElementById('customBg').value);
            root.style.setProperty('--cover-bg', document.getElementById('customCover').value);
            root.style.setProperty('--page-bg', document.getElementById('customPage').value);
            root.style.setProperty('--border-color', document.getElementById('customBorder').value);
            root.style.setProperty('--primary-accent', document.getElementById('customAccent').value);
        }

        async function saveCustomSkin() {
            const nameInput = document.getElementById('customSkinName').value.trim();
            if (!nameInput) { showMsg('스킨 이름을 입력해주세요!'); return; }

            const newSkin = {
                bg: document.getElementById('customBg').value,
                cover: document.getElementById('customCover').value,
                page: document.getElementById('customPage').value,
                border: document.getElementById('customBorder').value,
                accent: document.getElementById('customAccent').value
            };

            customSkins[nameInput] = newSkin;
            store.setItem('diary_custom_skins', JSON.stringify(customSkins));

            addSkinToSelect(nameInput, `🎨 ${nameInput}`);
            document.getElementById('skinSelect').value = nameInput;
            document.getElementById('customSkinName').value = '';
            showMsg(`'${nameInput}' 스킨이 새로 추가되었습니다!`);
        }

        async function deleteSelectedSkin() {
            const select = document.getElementById('skinSelect');
            const selectedVal = select.value;

            if (skinPresets[selectedVal]) {
                showMsg('기본 제공 프리셋 스킨은 삭제할 수 없습니다!');
                return;
            }

            const confirmDelete = await showMsg(`'${selectedVal}' 커스텀 스킨을 정말 삭제하시겠습니까?`, true);
            if (confirmDelete) {
                delete customSkins[selectedVal];
                store.setItem('diary_custom_skins', JSON.stringify(customSkins));

                const optionToRemove = select.querySelector(`option[value="${selectedVal}"]`);
                if (optionToRemove) optionToRemove.remove();

                select.value = 'pink';
                applySkinPreset('pink');
                showMsg('스킨이 삭제되었습니다.');
            }
        }

        function loadCustomSkins() {
            const saved = store.getItem('diary_custom_skins');
            if (saved) {
                customSkins = JSON.parse(saved);
                Object.keys(customSkins).forEach(name => {
                    addSkinToSelect(name, `🎨 ${name}`);
                });
            }
            if (typeof loadBgPattern === 'function') loadBgPattern();   // 전체 배경 패턴 (js/skins.js)
        }

        function addSkinToSelect(value, text) {
            const select = document.getElementById('skinSelect');
            if (!select.querySelector(`option[value="${value}"]`)) {
                const opt = document.createElement('option');
                opt.value = value;
                opt.innerText = text;
                select.appendChild(opt);
            }
        }

        function updateAutoSaveInterval(val) { autoSaveMinutes = val; startAutoSave(); }
        function startAutoSave() {
            if (autoSaveTimer) clearInterval(autoSaveTimer);
            autoSaveTimer = setInterval(() => { if (!turn) saveData(false); }, autoSaveMinutes * 60 * 1000);
        }

        function openModal(id) {
            if (id === 'settingsModal') { saveData(false); updateStorageInfo(); refreshStorageStats(); }
            document.getElementById(id).style.display = 'flex';
        }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }


/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['settings'] = true;
