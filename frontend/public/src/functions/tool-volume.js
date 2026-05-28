(function() {
    "use strict";

    var TOOL_ID = 'volume';
    var TOOL_NAME = '音量调节';

    var currentFiles = [];
    var currentVolume = 100;
    var isProcessing = false;
    var currentIndex = 0;
    var totalFiles = 0;
    var wavesurfer = null;
    var previewFileObject = null;

    var AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'];

    function renderUI() {
        return `
            <div class="tool-header">
                <h2>音量调节</h2>
                <p>调整音频文件的音量大小，支持批量处理与波形预览</p>
            </div>
            <div class="volume-demo">
                <input type="file" id="volumeNativeFileInput" accept="audio/*" multiple style="display: none;">

                <div class="volume-layout">
                    <div class="volume-left-panel">
                        <div class="batch-bar">
                            <button class="button batch-btn" id="selectFilesBtn">选择文件</button>
                            <button class="button batch-btn" id="selectFolderBtn">选择文件夹</button>
                            <button class="button batch-btn secondary" id="clearAllBtn">清空列表</button>
                        </div>

                        <div class="waveform-panel">
                            <div class="waveform-header">
                                <div>
                                    <div class="waveform-title">音频波形预览</div>
                                    <div class="waveform-subtitle" id="waveformStatus">请选择音频文件，波形会在这里显示</div>
                                </div>
                                <button class="button small" id="playPauseWaveBtn" disabled>播放/暂停</button>
                            </div>
                            <div id="waveform" class="waveform-box">
                                <div class="waveform-empty">等待音频载入...</div>
                            </div>
                            <div class="waveform-timebar">
                                <span id="waveCurrentTime">00:00</span>
                                <span id="waveDuration">00:00</span>
                            </div>
                            <div class="volume-envelope-wrap">
                                <div class="volume-envelope-label">整体音量线</div>
                                <div class="volume-envelope-track">
                                    <div class="volume-envelope-line" id="volumeEnvelopeLine"></div>
                                    <div class="volume-envelope-dot" id="volumeEnvelopeDot"></div>
                                </div>
                            </div>
                        </div>

                        <div class="file-list-container" id="fileListContainer" style="display: none;">
                            <div class="file-list-header">
                                <span>已选择文件 (<span id="fileCount">0</span>)</span>
                                <span class="file-list-total-size" id="totalSize">0 KB</span>
                            </div>
                            <div class="file-list" id="fileList"></div>
                        </div>

                        <div class="volume-slider-section">
                            <div class="volume-value">
                                <span id="volumePercent">100</span><span>%</span>
                            </div>
                            <input type="range" id="volumeSlider" class="volume-slider" min="0" max="200" value="100" step="1">
                            <div class="volume-presets">
                                <button class="volume-preset-btn" data-volume="25">25%</button>
                                <button class="volume-preset-btn" data-volume="50">50%</button>
                                <button class="volume-preset-btn" data-volume="100">100%</button>
                                <button class="volume-preset-btn" data-volume="150">150%</button>
                                <button class="volume-preset-btn" data-volume="200">200%</button>
                            </div>
                        </div>

                        <div class="output-options">
                            <div class="option-row">
                                <div class="option-item">
                                    <div class="option-label">输出格式</div>
                                    <select id="outputFormat" class="field">
                                        <option value="same">保持原格式</option>
                                        <option value="mp3">MP3</option>
                                        <option value="wav">WAV</option>
                                        <option value="ogg">OGG</option>
                                        <option value="flac">FLAC</option>
                                        <option value="aac">AAC</option>
                                        <option value="m4a">M4A</option>
                                    </select>
                                </div>
                                <div class="option-item">
                                    <div class="option-label">输出目录</div>
                                    <div class="output-dir-select">
                                        <input type="text" id="outputDir" class="field" placeholder="建议选择输出目录" readonly>
                                        <button class="button small" id="selectOutputDirBtn">选择</button>
                                    </div>
                                </div>
                            </div>
                            <div class="option-row">
                                <div class="option-item">
                                    <label class="checkbox-label" style="display: flex; align-items: center; gap: 8px; color: #b0c7da;">
                                        <input type="checkbox" id="autoRenameCheckbox" checked> 自动添加时间戳避免覆盖
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="volume-right-panel">
                        <div class="volume-btn-group">
                            <button class="button volume-btn primary" id="startVolumeBtn" disabled>开始批量调节</button>
                        </div>

                        <div class="progress-container" id="progressContainer">
                            <div class="progress-bar" id="progressBar" style="width: 0%;"></div>
                        </div>
                        <div class="progress-info" id="progressInfo" style="display: none;">
                            <span id="currentFileProgress">0</span> / <span id="totalFileProgress">0</span>
                        </div>

                        <div class="terminal-container">
                            <div class="terminal-header">
                                <div class="title">FFmpeg 命令行输出</div>
                                <div class="badge">实时输出</div>
                            </div>
                            <div id="volumeLogArea" class="terminal-content">
                                <div class="terminal-line"><span class="text">就绪，等待音量调节任务...</span></div>
                            </div>
                        </div>

                        <div class="format-info">
                            <div class="info-title">使用说明</div>
                            <div class="format-info-grid">
                                <div class="format-info-item"><span class="format">波形</span><span class="desc">成功</span></div>
                                <div class="format-info-item"><span class="format">导出</span><span class="desc">文件会先保存到临时目录，再交给 FFmpeg</span></div>
                                <div class="format-info-item"><span class="format">建议</span><span class="desc">批量处理时手动选择输出目录</span></div>
                                <div class="format-info-item"><span class="format">音量</span><span class="desc">当前版本为整体音量调整</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        var k = 1024;
        var sizes = ['B', 'KB', 'MB', 'GB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatTime(seconds) {
        if (!isFinite(seconds) || seconds < 0) return '00:00';
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    function addTerminalLog(container, text, type) {
        if (!container) return;
        var line = document.createElement('div');
        line.className = 'terminal-line ' + (type || 'info');
        line.innerHTML = '<span class="text">' + escapeHtml(text) + '</span>';
        container.appendChild(line);
        while (container.children.length > 500) container.removeChild(container.firstChild);
        container.scrollTop = container.scrollHeight;
    }

    function escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function getExt(name) {
        return (name.split('.').pop() || '').toLowerCase();
    }

    function isAudioName(name) {
        return AUDIO_EXTS.indexOf(getExt(name)) !== -1;
    }

    function updateEnvelopeLine() {
        var line = document.getElementById('volumeEnvelopeLine');
        var dot = document.getElementById('volumeEnvelopeDot');
        if (!line || !dot) return;
        var percent = Math.max(0, Math.min(100, currentVolume / 200 * 100));
        var y = 100 - percent;
        line.style.top = y + '%';
        dot.style.top = y + '%';
        dot.title = currentVolume + '%';
    }

    function initWaveSurfer(logContainer) {
        var waveformBox = document.getElementById('waveform');
        if (!waveformBox) return null;

        if (wavesurfer) {
            try { wavesurfer.destroy(); } catch (e) {}
            wavesurfer = null;
        }

        waveformBox.innerHTML = '';

        if (typeof WaveSurfer === 'undefined') {
            waveformBox.innerHTML = '<div class="waveform-empty">未检测到 WaveSurfer，请检查 index.html 引入顺序</div>';
            addTerminalLog(logContainer, '未检测到 WaveSurfer，请先在 index.html 中引入 wavesurfer.min.js', 'error');
            return null;
        }

        wavesurfer = WaveSurfer.create({
            container: '#waveform',
            waveColor: '#7ac7c7',
            progressColor: '#3ea6ff',
            cursorColor: '#ffffff',
            cursorWidth: 2,
            height: 120,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            normalize: true
        });

        var playBtn = document.getElementById('playPauseWaveBtn');
        var status = document.getElementById('waveformStatus');
        var currentTimeEl = document.getElementById('waveCurrentTime');
        var durationEl = document.getElementById('waveDuration');

        wavesurfer.on('ready', function() {
            if (playBtn) playBtn.disabled = false;
            if (durationEl) durationEl.textContent = formatTime(wavesurfer.getDuration());
            if (status && previewFileObject) status.textContent = '已加载波形：' + previewFileObject.name;
            addTerminalLog(logContainer, '波形加载完成', 'success');
        });

        wavesurfer.on('timeupdate', function(time) {
            if (currentTimeEl) currentTimeEl.textContent = formatTime(time);
        });

        wavesurfer.on('error', function(err) {
            addTerminalLog(logContainer, '波形加载失败: ' + err, 'error');
            if (status) status.textContent = '波形加载失败';
        });

        return wavesurfer;
    }

    async function saveFrontendFileToTemp(file, logContainer) {
        if (!window.go || !window.go.main || !window.go.main.App || !window.go.main.App.SaveTempFile) {
            throw new Error('Wails SaveTempFile 不可用');
        }
        var buffer = await file.arrayBuffer();
        var bytes = Array.from(new Uint8Array(buffer));
        return await window.go.main.App.SaveTempFile(file.name, bytes);
    }

    async function loadPreviewBlob(file, logContainer) {
        previewFileObject = file;
        var status = document.getElementById('waveformStatus');
        var playBtn = document.getElementById('playPauseWaveBtn');
        if (playBtn) playBtn.disabled = true;
        if (status) status.textContent = '正在解析波形：' + file.name;

        var ws = wavesurfer || initWaveSurfer(logContainer);
        if (!ws) return;

        try {
            await ws.loadBlob(file);
        } catch (error) {
            addTerminalLog(logContainer, '波形加载失败: ' + error.message, 'error');
            if (status) status.textContent = '波形加载失败';
        }
    }

    function generateOutputFileName(originalName, outputFormat, autoRename, index) {
        var dot = originalName.lastIndexOf('.');
        var originalBase = dot > 0 ? originalName.substring(0, dot) : originalName;
        var ext = outputFormat === 'same' ? getExt(originalName) : outputFormat;
        if (!ext) ext = 'mp3';
        var fileName = originalBase + '_volume_' + currentVolume + '.' + ext;
        if (autoRename) {
            var timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            fileName = originalBase + '_volume_' + currentVolume + '_' + timestamp + '_' + index + '.' + ext;
        }
        return fileName;
    }

    function updateFileList() {
        var fileListContainer = document.getElementById('fileListContainer');
        var fileList = document.getElementById('fileList');
        var fileCountSpan = document.getElementById('fileCount');
        var totalSizeSpan = document.getElementById('totalSize');
        var startBtn = document.getElementById('startVolumeBtn');

        if (!fileListContainer || !fileList) return;

        if (currentFiles.length === 0) {
            fileListContainer.style.display = 'none';
            if (startBtn) startBtn.disabled = true;
            return;
        }

        fileListContainer.style.display = 'block';
        if (fileCountSpan) fileCountSpan.textContent = currentFiles.length;

        var totalSize = currentFiles.reduce(function(sum, f) { return sum + (f.size || 0); }, 0);
        if (totalSizeSpan) totalSizeSpan.textContent = formatFileSize(totalSize);

        fileList.innerHTML = currentFiles.map(function(file, i) {
            return `
                <div class="file-list-item" data-index="${i}">
                    <span class="file-list-icon">[A]</span>
                    <div class="file-list-info">
                        <div class="file-list-name">${escapeHtml(file.name)}</div>
                        <div class="file-list-size">${formatFileSize(file.size || 0)}</div>
                    </div>
                    <button class="file-list-remove" data-index="${i}">[X]</button>
                </div>
            `;
        }).join('');

        fileList.querySelectorAll('.file-list-item').forEach(function(item) {
            item.addEventListener('click', function(e) {
                if (e.target.classList.contains('file-list-remove')) return;
                var idx = parseInt(this.dataset.index, 10);
                var itemData = currentFiles[idx];
                if (itemData && itemData.blobFile) {
                    loadPreviewBlob(itemData.blobFile, document.getElementById('volumeLogArea'));
                }
            });
        });

        fileList.querySelectorAll('.file-list-remove').forEach(function(btn) {
            btn.onclick = function(e) {
                e.stopPropagation();
                var idx = parseInt(this.dataset.index, 10);
                currentFiles.splice(idx, 1);
                updateFileList();
            };
        });

        if (startBtn) startBtn.disabled = false;
    }

    function bindEvents() {
        var selectFilesBtn = document.getElementById('selectFilesBtn');
        var selectFolderBtn = document.getElementById('selectFolderBtn');
        var clearAllBtn = document.getElementById('clearAllBtn');
        var nativeFileInput = document.getElementById('volumeNativeFileInput');
        var selectOutputDirBtn = document.getElementById('selectOutputDirBtn');
        var outputDirInput = document.getElementById('outputDir');
        var volumeSlider = document.getElementById('volumeSlider');
        var volumePercent = document.getElementById('volumePercent');
        var volumePresetBtns = document.querySelectorAll('.volume-preset-btn');
        var outputFormat = document.getElementById('outputFormat');
        var autoRenameCheckbox = document.getElementById('autoRenameCheckbox');
        var startVolumeBtn = document.getElementById('startVolumeBtn');
        var progressContainer = document.getElementById('progressContainer');
        var progressBar = document.getElementById('progressBar');
        var progressInfo = document.getElementById('progressInfo');
        var currentFileProgressSpan = document.getElementById('currentFileProgress');
        var totalFileProgressSpan = document.getElementById('totalFileProgress');
        var logContainer = document.getElementById('volumeLogArea');
        var playPauseWaveBtn = document.getElementById('playPauseWaveBtn');

        if (!selectFilesBtn) {
            console.error('DOM元素未找到');
            return;
        }

        addTerminalLog(logContainer, '工具已加载，等待选择文件', 'info');
        initWaveSurfer(logContainer);
        updateEnvelopeLine();

        volumeSlider.addEventListener('input', function(e) {
            currentVolume = parseInt(e.target.value, 10);
            volumePercent.textContent = currentVolume;
            updateEnvelopeLine();
        });

        volumePresetBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var vol = parseInt(this.dataset.volume, 10);
                volumeSlider.value = vol;
                currentVolume = vol;
                volumePercent.textContent = vol;
                updateEnvelopeLine();
            });
        });

        if (playPauseWaveBtn) {
            playPauseWaveBtn.addEventListener('click', function() {
                if (wavesurfer) wavesurfer.playPause();
            });
        }

        selectFilesBtn.addEventListener('click', function() {
            if (nativeFileInput) nativeFileInput.click();
        });

        nativeFileInput.addEventListener('change', async function(e) {
            var files = Array.from(e.target.files || []);
            if (files.length === 0) return;

            var addedCount = 0;
            addTerminalLog(logContainer, '正在导入 ' + files.length + ' 个文件...', 'info');

            for (var i = 0; i < files.length; i++) {
                var f = files[i];
                if (!isAudioName(f.name) && !String(f.type || '').startsWith('audio/')) {
                    addTerminalLog(logContainer, '跳过非音频文件: ' + f.name, 'warning');
                    continue;
                }

                try {
                    var saved = await saveFrontendFileToTemp(f, logContainer);
                    if (saved && saved.success) {
                        currentFiles.push({
                            name: saved.name || f.name,
                            path: saved.path,
                            size: saved.size || f.size,
                            blobFile: f,
                            fromTemp: true
                        });
                        addedCount++;
                        if (addedCount === 1) await loadPreviewBlob(f, logContainer);
                    } else {
                        addTerminalLog(logContainer, '保存临时文件失败: ' + (saved && saved.error ? saved.error : f.name), 'error');
                    }
                } catch (error) {
                    addTerminalLog(logContainer, '导入失败: ' + f.name + '，' + error.message, 'error');
                }
            }

            updateFileList();
            addTerminalLog(logContainer, '已添加 ' + addedCount + ' 个文件', addedCount > 0 ? 'success' : 'warning');
            nativeFileInput.value = '';
        });

        selectFolderBtn.addEventListener('click', async function() {
            try {
                if (!window.go || !window.go.main || !window.go.main.App) {
                    addTerminalLog(logContainer, '错误: Wails环境未就绪', 'error');
                    return;
                }

                var result = await window.go.main.App.SelectFolder();
                if (result && result.success && result.files) {
                    var addedCount = 0;
                    for (var i = 0; i < result.files.length; i++) {
                        var file = result.files[i];
                        if (isAudioName(file.name)) {
                            currentFiles.push(file);
                            addedCount++;
                        }
                    }
                    updateFileList();
                    addTerminalLog(logContainer, '从文件夹中添加了 ' + addedCount + ' 个音频文件', 'info');
                    addTerminalLog(logContainer, '提示：文件夹导入只有路径，不能直接生成波形；要看波形请用“选择文件”', 'warning');
                }
            } catch (error) {
                addTerminalLog(logContainer, '选择文件夹失败: ' + error.message, 'error');
            }
        });

        clearAllBtn.addEventListener('click', function() {
            currentFiles = [];
            previewFileObject = null;
            updateFileList();
            initWaveSurfer(logContainer);
            document.getElementById('waveformStatus').textContent = '请选择音频文件，波形会在这里显示';
            addTerminalLog(logContainer, '已清空文件列表', 'info');
        });

        selectOutputDirBtn.addEventListener('click', async function() {
            try {
                var result = await window.go.main.App.SelectOutputDir();
                if (result && result.success) {
                    outputDirInput.value = result.path;
                    addTerminalLog(logContainer, '输出目录: ' + result.path, 'info');
                }
            } catch (error) {
                addTerminalLog(logContainer, '选择目录失败: ' + error.message, 'error');
            }
        });

        startVolumeBtn.addEventListener('click', async function() {
            if (currentFiles.length === 0) {
                addTerminalLog(logContainer, '请先选择音频文件', 'warning');
                return;
            }
            if (isProcessing) {
                addTerminalLog(logContainer, '处理中，请等待...', 'info');
                return;
            }
            if (!window.go || !window.go.main || !window.go.main.App) {
                addTerminalLog(logContainer, '错误: Wails环境未就绪', 'error');
                return;
            }

            isProcessing = true;
            startVolumeBtn.disabled = true;
            progressContainer.classList.add('active');
            progressInfo.style.display = 'block';

            var autoRename = autoRenameCheckbox ? autoRenameCheckbox.checked : false;
            var outFormat = outputFormat ? outputFormat.value : 'same';
            var customOutputDir = outputDirInput ? outputDirInput.value : '';

            totalFiles = currentFiles.length;
            var successCount = 0;
            var failCount = 0;

            addTerminalLog(logContainer, '========== 开始批量处理 ==========', 'info');
            addTerminalLog(logContainer, '总文件数: ' + totalFiles, 'info');
            addTerminalLog(logContainer, '音量: ' + currentVolume + '%', 'info');
            addTerminalLog(logContainer, '输出格式: ' + (outFormat === 'same' ? '保持原格式' : outFormat.toUpperCase()), 'info');

            for (var i = 0; i < totalFiles; i++) {
                currentIndex = i + 1;
                currentFileProgressSpan.textContent = currentIndex;
                totalFileProgressSpan.textContent = totalFiles;
                progressBar.style.width = ((i / totalFiles) * 100) + '%';

                var file = currentFiles[i];
                addTerminalLog(logContainer, '', 'info');
                addTerminalLog(logContainer, '[' + currentIndex + '/' + totalFiles + '] 处理: ' + file.name, 'info');

                var outputFileName = generateOutputFileName(file.name, outFormat, autoRename, i);
                var outputPath;
                if (customOutputDir) {
                    outputPath = customOutputDir + '\\' + outputFileName;
                } else {
                    var sepIndex = Math.max(file.path.lastIndexOf('\\'), file.path.lastIndexOf('/'));
                    var inputDir = sepIndex >= 0 ? file.path.substring(0, sepIndex) : '';
                    outputPath = inputDir ? inputDir + '\\' + outputFileName : outputFileName;
                    if (file.fromTemp) {
                        addTerminalLog(logContainer, '提示：此文件来自前端选择，未选输出目录时会输出到临时目录', 'warning');
                    }
                }

                try {
                    var result = await window.go.main.App.AdjustVolume(file.path, outputPath, currentVolume, outFormat);
                    if (result && result.success) {
                        successCount++;
                        addTerminalLog(logContainer, '  [成功] ' + outputPath, 'success');
                    } else {
                        failCount++;
                        addTerminalLog(logContainer, '  [失败] ' + (result && result.error ? result.error : '未知错误'), 'error');
                    }
                } catch (error) {
                    failCount++;
                    addTerminalLog(logContainer, '  [错误] ' + error.message, 'error');
                }
            }

            progressBar.style.width = '100%';
            addTerminalLog(logContainer, '', 'info');
            addTerminalLog(logContainer, '========== 批量处理完成 ==========', 'success');
            addTerminalLog(logContainer, '成功: ' + successCount + ' 个', 'success');
            addTerminalLog(logContainer, '失败: ' + failCount + ' 个', failCount > 0 ? 'error' : 'info');

            isProcessing = false;
            startVolumeBtn.disabled = false;
            setTimeout(function() {
                progressContainer.classList.remove('active');
                progressInfo.style.display = 'none';
                progressBar.style.width = '0%';
            }, 3000);
        });
    }

    if (window.ToolRegistry) {
        window.ToolRegistry.register(TOOL_ID, {
            name: TOOL_NAME,
            render: renderUI,
            bind: bindEvents
        });
        console.log('音量调节工具加载完成');
    } else {
        console.error('ToolRegistry 未找到');
    }
})();
