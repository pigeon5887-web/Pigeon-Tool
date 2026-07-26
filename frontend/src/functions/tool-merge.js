(function() {
    "use strict";

    const TOOL_ID = 'merge';
    const TOOL_NAME = '音视频合并';

    let videoFile = null;
    let audioFile = null;
    let isMerging = false;

    function renderUI() {
        return `
            <div class="tool-header">
                <h2>音视频合并</h2>
                <p style="color: #7a9eb3; font-size: 0.85rem; margin-left: 12px;">将视频和音频文件合并成一个新视频</p>
            </div>
            <div class="merge-demo">
                <div class="merge-layout">
                    <div class="merge-section">
                        <div class="section-title">
                            <span class="section-icon">[V]</span> 视频文件
                        </div>
                        <div class="file-upload-area" id="videoUploadArea">
                            <div class="upload-icon">[V]</div>
                            <div class="upload-text">点击选择视频文件 或 拖拽至此</div>
                            <div class="upload-hint">支持 MP4, AVI, MKV, MOV, FLV, WEBM 等格式</div>
                            <input type="file" id="videoInput" style="display: none;" accept="video/*">
                        </div>
                        <div id="videoFileCard" class="selected-file-card" style="display: none;">
                            <div class="file-icon" id="videoIcon">[V]</div>
                            <div class="file-info">
                                <div class="file-name" id="videoName">未选择文件</div>
                                <div class="file-meta">
                                    <span id="videoSize">0 KB</span>
                                </div>
                            </div>
                            <button class="remove-file" id="removeVideoBtn">[X]</button>
                        </div>
                    </div>

                    <div class="merge-arrow">
                        <div class="arrow-icon">[+]</div>
                    </div>

                    <div class="merge-section">
                        <div class="section-title">
                            <span class="section-icon">[A]</span> 音频文件
                        </div>
                        <div class="file-upload-area" id="audioUploadArea">
                            <div class="upload-icon">[A]</div>
                            <div class="upload-text">点击选择音频文件 或 拖拽至此</div>
                            <div class="upload-hint">支持 MP3, WAV, OGG, AAC, FLAC, M4A 等格式</div>
                            <input type="file" id="audioInput" style="display: none;" accept="audio/*">
                        </div>
                        <div id="audioFileCard" class="selected-file-card" style="display: none;">
                            <div class="file-icon" id="audioIcon">[A]</div>
                            <div class="file-info">
                                <div class="file-name" id="audioName">未选择文件</div>
                                <div class="file-meta">
                                    <span id="audioSize">0 KB</span>
                                </div>
                            </div>
                            <button class="remove-file" id="removeAudioBtn">[X]</button>
                        </div>
                    </div>
                </div>

                <div class="merge-options">
                    <div class="options-title">合并选项</div>
                    <div class="option-row">
                        <div class="option-item">
                            <div class="option-label">输出格式</div>
                            <select id="outputFormat" class="field">
                                <option value="mp4">MP4</option>
                                <option value="mkv">MKV</option>
                                <option value="mov">MOV</option>
                                <option value="avi">AVI</option>
                            </select>
                        </div>
                        <div class="option-item">
                            <div class="option-label">视频编码</div>
                            <select id="videoCodec" class="field">
                                <option value="libx264">H.264 (推荐)</option>
                                <option value="libx265">H.265 (更高压缩率)</option>
                                <option value="copy">复制原视频编码</option>
                            </select>
                        </div>
                        <div class="option-item">
                            <div class="option-label">音频编码</div>
                            <select id="audioCodec" class="field">
                                <option value="aac">AAC (推荐)</option>
                                <option value="libmp3lame">MP3</option>
                                <option value="copy">复制原音频编码</option>
                            </select>
                        </div>
                    </div>
                    <div class="option-row">
                        <div class="option-item">
                            <div class="option-label">输出文件名</div>
                            <input type="text" id="customFileName" class="field" placeholder="自定义文件名（可选）">
                        </div>
                        <div class="option-item">
                            <div class="option-label">自动重命名</div>
                            <label class="checkbox-label">
                                <input type="checkbox" id="autoRenameCheckbox"> 添加时间戳避免覆盖
                            </label>
                        </div>
                    </div>
                </div>

                <div class="merge-btn-group">
                    <button class="button merge-btn primary" id="startMergeBtn" disabled>开始合并</button>
                </div>

                <div class="progress-container" id="progressContainer">
                    <div class="progress-bar" id="progressBar" style="width: 0%;"></div>
                </div>

                <div class="terminal-container">
                    <div class="terminal-header">
                        <div class="title">FFmpeg 命令行输出</div>
                        <div class="badge">实时输出</div>
                    </div>
                    <div id="mergeLogArea" class="terminal-content">
                        <div class="terminal-line"><span class="text">就绪，等待合并任务...</span></div>
                    </div>
                </div>

                <div class="format-info">
                    <div class="info-title">使用说明</div>
                    <div class="format-info-grid">
                        <div class="format-info-item"><span class="format">1</span><span class="desc">选择视频文件和音频文件</span></div>
                        <div class="format-info-item"><span class="format">2</span><span class="desc">视频时长会调整为音频时长</span></div>
                        <div class="format-info-item"><span class="format">3</span><span class="desc">支持各种音视频格式组合</span></div>
                        <div class="format-info-item"><span class="format">4</span><span class="desc">输出文件保存在视频文件同目录</span></div>
                    </div>
                </div>
            </div>
        `;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function addTerminalLog(container, text, type) {
        const line = document.createElement('div');
        line.className = 'terminal-line ' + (type || 'info');
        line.innerHTML = '<span class="text">' + escapeHtml(text) + '</span>';
        container.appendChild(line);
        
        const MAX_LOG_ENTRIES = 500;
        while (container.children.length > MAX_LOG_ENTRIES) {
            container.removeChild(container.firstChild);
        }
        
        container.scrollTop = container.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function generateOutputFileName(videoName, customName, outputFormat, autoRename) {
        const originalBase = videoName.substring(0, videoName.lastIndexOf('.')) || videoName;
        let baseName = customName && customName.trim() ? customName.trim() : originalBase + '_merged';
        
        baseName = baseName.replace(/[<>:"/\\|?*]/g, '_');
        
        let fileName = baseName + '.' + outputFormat;
        
        if (autoRename) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            fileName = baseName + '_' + timestamp + '.' + outputFormat;
        }
        
        return fileName;
    }

    function bindEvents() {
        const videoUploadArea = document.getElementById('videoUploadArea');
        const audioUploadArea = document.getElementById('audioUploadArea');
        const videoInput = document.getElementById('videoInput');
        const audioInput = document.getElementById('audioInput');
        
        const videoFileCard = document.getElementById('videoFileCard');
        const audioFileCard = document.getElementById('audioFileCard');
        const videoName = document.getElementById('videoName');
        const audioName = document.getElementById('audioName');
        const videoSize = document.getElementById('videoSize');
        const audioSize = document.getElementById('audioSize');
        const videoIcon = document.getElementById('videoIcon');
        const audioIcon = document.getElementById('audioIcon');
        
        const removeVideoBtn = document.getElementById('removeVideoBtn');
        const removeAudioBtn = document.getElementById('removeAudioBtn');
        
        const outputFormat = document.getElementById('outputFormat');
        const videoCodec = document.getElementById('videoCodec');
        const audioCodec = document.getElementById('audioCodec');
        const customFileName = document.getElementById('customFileName');
        const autoRenameCheckbox = document.getElementById('autoRenameCheckbox');
        
        const startMergeBtn = document.getElementById('startMergeBtn');
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const logContainer = document.getElementById('mergeLogArea');

        if (!window.go || !window.go.main || !window.go.main.App) {
            addTerminalLog(logContainer, '错误: 非Wails环境，无法调用ffmpeg', 'error');
            return;
        }

        function updateMergeButton() {
            startMergeBtn.disabled = !(videoFile && audioFile);
        }

        // 视频文件选择
        videoUploadArea.addEventListener('click', async () => {
            try {
                const result = await window.go.main.App.SelectFile();
                if (result && result.success) {
                    const ext = result.name.split('.').pop().toLowerCase();
                    const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', '3gp', 'm4v', 'mpg', 'mpeg'];
                    if (videoExts.includes(ext)) {
                        videoFile = {
                            name: result.name,
                            size: result.size,
                            path: result.path
                        };
                        videoFileCard.style.display = 'flex';
                        videoName.textContent = result.name;
                        videoSize.textContent = formatFileSize(result.size);
                        videoIcon.textContent = '[V]';
                        addTerminalLog(logContainer, '已选择视频: ' + result.name, 'info');
                    } else {
                        addTerminalLog(logContainer, '请选择有效的视频文件', 'error');
                    }
                    updateMergeButton();
                }
            } catch (error) {
                addTerminalLog(logContainer, '选择视频失败: ' + error.message, 'error');
            }
        });

        // 音频文件选择
        audioUploadArea.addEventListener('click', async () => {
            try {
                const result = await window.go.main.App.SelectFile();
                if (result && result.success) {
                    const ext = result.name.split('.').pop().toLowerCase();
                    const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma', 'opus'];
                    if (audioExts.includes(ext)) {
                        audioFile = {
                            name: result.name,
                            size: result.size,
                            path: result.path
                        };
                        audioFileCard.style.display = 'flex';
                        audioName.textContent = result.name;
                        audioSize.textContent = formatFileSize(result.size);
                        audioIcon.textContent = '[A]';
                        addTerminalLog(logContainer, '已选择音频: ' + result.name, 'info');
                    } else {
                        addTerminalLog(logContainer, '请选择有效的音频文件', 'error');
                    }
                    updateMergeButton();
                }
            } catch (error) {
                addTerminalLog(logContainer, '选择音频失败: ' + error.message, 'error');
            }
        });

        // 拖拽上传 - 视频
        videoUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            videoUploadArea.classList.add('dragover');
        });
        videoUploadArea.addEventListener('dragleave', () => {
            videoUploadArea.classList.remove('dragover');
        });
        videoUploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            videoUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const file = files[0];
                const filePath = file.path;
                if (!filePath) {
                    addTerminalLog(logContainer, '拖拽文件无法获取完整路径，请使用点击选择', 'warning');
                    return;
                }
                const ext = file.name.split('.').pop().toLowerCase();
                const videoExts = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', '3gp'];
                if (videoExts.includes(ext)) {
                    videoFile = {
                        name: file.name,
                        size: file.size,
                        path: filePath
                    };
                    videoFileCard.style.display = 'flex';
                    videoName.textContent = file.name;
                    videoSize.textContent = formatFileSize(file.size);
                    videoIcon.textContent = '[V]';
                    addTerminalLog(logContainer, '拖拽视频: ' + file.name, 'info');
                    updateMergeButton();
                } else {
                    addTerminalLog(logContainer, '请拖拽有效的视频文件', 'error');
                }
            }
        });

        // 拖拽上传 - 音频
        audioUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            audioUploadArea.classList.add('dragover');
        });
        audioUploadArea.addEventListener('dragleave', () => {
            audioUploadArea.classList.remove('dragover');
        });
        audioUploadArea.addEventListener('drop', async (e) => {
            e.preventDefault();
            audioUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const file = files[0];
                const filePath = file.path;
                if (!filePath) {
                    addTerminalLog(logContainer, '拖拽文件无法获取完整路径，请使用点击选择', 'warning');
                    return;
                }
                const ext = file.name.split('.').pop().toLowerCase();
                const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
                if (audioExts.includes(ext)) {
                    audioFile = {
                        name: file.name,
                        size: file.size,
                        path: filePath
                    };
                    audioFileCard.style.display = 'flex';
                    audioName.textContent = file.name;
                    audioSize.textContent = formatFileSize(file.size);
                    audioIcon.textContent = '[A]';
                    addTerminalLog(logContainer, '拖拽音频: ' + file.name, 'info');
                    updateMergeButton();
                } else {
                    addTerminalLog(logContainer, '请拖拽有效的音频文件', 'error');
                }
            }
        });

        // 移除视频
        removeVideoBtn.addEventListener('click', () => {
            videoFile = null;
            videoFileCard.style.display = 'none';
            videoInput.value = '';
            updateMergeButton();
            addTerminalLog(logContainer, '已移除视频文件', 'info');
        });

        // 移除音频
        removeAudioBtn.addEventListener('click', () => {
            audioFile = null;
            audioFileCard.style.display = 'none';
            audioInput.value = '';
            updateMergeButton();
            addTerminalLog(logContainer, '已移除音频文件', 'info');
        });

        // 开始合并
        startMergeBtn.addEventListener('click', async () => {
            if (!videoFile || !audioFile) {
                addTerminalLog(logContainer, '请先选择视频和音频文件', 'warning');
                return;
            }

            if (isMerging) {
                addTerminalLog(logContainer, '合并中，请等待...', 'info');
                return;
            }

            isMerging = true;
            startMergeBtn.disabled = true;

            const autoRename = autoRenameCheckbox.checked;
            const customName = customFileName.value;
            const outFormat = outputFormat.value;
            const outputFileName = generateOutputFileName(videoFile.name, customName, outFormat, autoRename);

            const inputDir = videoFile.path.substring(0, videoFile.path.lastIndexOf('\\'));
            const outputPath = inputDir + '\\' + outputFileName;

            progressContainer.classList.add('active');
            progressBar.style.width = '0%';

            logContainer.innerHTML = '';
            addTerminalLog(logContainer, '开始合并: ' + videoFile.name + ' + ' + audioFile.name, 'info');
            addTerminalLog(logContainer, '输出文件: ' + outputFileName, 'info');
            addTerminalLog(logContainer, '输出路径: ' + outputPath, 'info');

            let progress = 0;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += 10;
                    progressBar.style.width = progress + '%';
                }
            }, 500);

            try {
                const result = await window.go.main.App.MergeVideoAudio(
                    videoFile.path,
                    audioFile.path,
                    outputPath,
                    outFormat,
                    videoCodec.value,
                    audioCodec.value
                );

                clearInterval(progressInterval);

                // 兼容大小写 Success/success
                var isSuccess = result && (result.Success === true || result.success === true);
                if (isSuccess) {
                    progressBar.style.width = '100%';
                    addTerminalLog(logContainer, '[成功] 合并成功', 'success');
                    addTerminalLog(logContainer, '[输出] ' + outputPath, 'success');
                } else {
                    progressBar.style.width = '0%';
                    var errMsg = result && (result.Error || result.error);
                    addTerminalLog(logContainer, '[失败] 合并失败: ' + (errMsg || '未知错误'), 'error');
                }
            } catch (error) {
                clearInterval(progressInterval);
                progressBar.style.width = '0%';
                addTerminalLog(logContainer, '[错误] ' + error.message, 'error');
            } finally {
                isMerging = false;
                startMergeBtn.disabled = false;
                setTimeout(() => {
                    progressContainer.classList.remove('active');
                    progressBar.style.width = '0%';
                }, 2000);
            }
        });
    }

    if (window.ToolRegistry) {
        window.ToolRegistry.register(TOOL_ID, {
            name: TOOL_NAME,
            render: renderUI,
            bind: bindEvents
        });
        console.log('音视频合并工具加载完成');
    }
})();