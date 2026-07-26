(function() {
    "use strict";

    const TOOL_ID = 'convert';
    const TOOL_NAME = '格式转换';

    const FORMATS = {
        image: [
            { name: 'JPG', ext: 'jpg', desc: 'JPEG 图片' },
            { name: 'PNG', ext: 'png', desc: 'PNG 图片' },
            { name: 'WEBP', ext: 'webp', desc: 'WebP 图片' },
            { name: 'JPEG', ext: 'jpeg', desc: 'JPEG 图片' },
            { name: 'ICO', ext: 'ico', desc: '图标文件' },
            { name: 'BMP', ext: 'bmp', desc: 'BMP 位图' },
            { name: 'TIFF', ext: 'tiff', desc: 'TIFF 图片' }
        ],
        audio: [
            { name: 'MP3', ext: 'mp3', desc: 'MP3 音频' },
            { name: 'OGG', ext: 'ogg', desc: 'OGG 音频' },
            { name: 'WAV', ext: 'wav', desc: 'WAV 音频' },
            { name: 'AAC', ext: 'aac', desc: 'AAC 音频' },
            { name: 'FLAC', ext: 'flac', desc: 'FLAC 无损' },
            { name: 'M4A', ext: 'm4a', desc: 'M4A 音频' }
        ],
        video: [
            { name: 'MP4', ext: 'mp4', desc: 'MP4 视频' },
            { name: 'AVI', ext: 'avi', desc: 'AVI 视频' },
            { name: 'MKV', ext: 'mkv', desc: 'MKV 视频' },
            { name: 'MOV', ext: 'mov', desc: 'MOV 视频' },
            { name: 'WEBM', ext: 'webm', desc: 'WebM 视频' }
        ]
    };

    const CATEGORIES = [
        { id: 'image', name: '图片', formats: FORMATS.image },
        { id: 'audio', name: '音频', formats: FORMATS.audio },
        { id: 'video', name: '视频', formats: FORMATS.video }
    ];

    const ALLOWED_EXTS = [
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'tiff', 'tif',
        'mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus',
        'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', '3gp', 'm4v', 'mpg', 'mpeg'
    ];

    let selectedFiles = [];
    let currentCategory = 'image';
    let targetFormat = null;
    let isConverting = false;
    let outputDir = '';
    let tempFilePaths = [];

    let globalLogContainer = null;
    let globalFormatGrid = null;
    let globalStartConvertBtn = null;

    function renderUI() {
        const categoryTabs = CATEGORIES.map(cat => `
            <button class="format-tab ${cat.id === currentCategory ? 'active' : ''}" data-category="${cat.id}">${cat.name}</button>
        `).join('');

        const formatGrid = FORMATS[currentCategory].map(f => `
            <div class="format-item" data-format="${f.ext}">
                <div class="format-name">${f.name}</div>
                <div class="format-type">${f.desc}</div>
                <span class="format-badge">[√]</span>
            </div>
        `).join('');

        return `
            <div class="tool-header">
                <h2>格式转换</h2>
                <p>支持单文件与批量转换</p>
            </div>
            <div class="convert-demo">
                <div class="convert-layout">
                    <div class="convert-left-panel">
                        <div class="file-upload-area" id="fileUploadArea">
                            <div class="upload-icon">[+]</div>
                            <div class="upload-text">点击选择文件 或 拖拽至此</div>
                            <div class="upload-hint">支持多选，图片、音频、视频都可以丢进来</div>
                            <input type="file" id="fileInput" style="display:none;" accept="*/*" multiple>
                        </div>

                        <div class="file-list-container" id="convertFileListContainer" style="display:none;">
                            <div class="file-list-header">
                                <span>待转换文件</span>
                                <span id="convertFileCount">0 个文件</span>
                            </div>
                            <div class="file-list" id="convertFileList"></div>
                        </div>

                        <div class="convert-btn-group batch-bar">
                            <button class="button batch-btn" id="addMoreFilesBtn">继续添加</button>
                            <button class="button batch-btn secondary" id="clearFilesBtn">清空列表</button>
                        </div>

                        <div class="format-panel">
                            <div class="format-section-title">选择目标格式</div>
                            <div class="format-tabs" id="categoryTabs">${categoryTabs}</div>
                            <div class="format-grid" id="formatGrid">${formatGrid}</div>
                        </div>

                        <div class="convert-options">
                            <div class="format-section-title">转换选项</div>
                            <div class="option-row">
                                <div class="option-item">
                                    <div class="option-label">质量</div>
                                    <select id="qualitySelect" class="field">
                                        <option value="best">最佳质量</option>
                                        <option value="high" selected>高质量</option>
                                        <option value="medium">中等质量</option>
                                        <option value="low">低质量</option>
                                    </select>
                                </div>
                                <div class="option-item">
                                    <div class="option-label">尺寸</div>
                                    <select id="sizeSelect" class="field">
                                        <option value="original" selected>原始尺寸</option>
                                        <option value="1920x1080">1920x1080</option>
                                        <option value="1280x720">1280x720</option>
                                        <option value="854x480">854x480</option>
                                    </select>
                                </div>
                            </div>
                            <div class="option-row">
                                <div class="option-item" style="flex:2;">
                                    <div class="option-label">输出目录</div>
                                    <div class="output-dir-select">
                                        <input type="text" id="outputDirInput" class="field" placeholder="默认输出到原文件目录" readonly>
                                        <button class="button small" id="selectOutputDirBtn">选择</button>
                                    </div>
                                </div>
                            </div>
                            <div class="option-row">
                                <div class="option-item" style="flex:2;">
                                    <div class="option-label">输出文件名</div>
                                    <div class="rename-control">
                                        <input type="text" id="customFileName" class="field" placeholder="单文件可自定义；批量时作为前缀（可选）">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="autoRenameCheckbox" checked> 自动重命名（避免覆盖）
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="convert-right-panel">
                        <div class="convert-btn-group">
                            <button class="button convert-btn primary" id="startConvertBtn" disabled>开始转换</button>
                        </div>

                        <div class="progress-container" id="progressContainer">
                            <div class="progress-bar" id="progressBar" style="width:0%;"></div>
                        </div>
                        <div class="progress-info" id="progressInfo"></div>

                        <div class="terminal-container">
                            <div class="terminal-header">
                                <div class="title">FFmpeg 命令行输出</div>
                                <div class="badge">批量任务</div>
                            </div>
                            <div id="convertLogArea" class="terminal-content">
                                <div class="terminal-line"><span class="text">就绪，等待转换任务...</span></div>
                            </div>
                        </div>

                        <div class="format-info">
                            <div class="info-title">批量说明</div>
                            <div class="format-info-grid">
                                <div class="format-info-item"><span class="format">同类</span><span class="desc">图片转图片、音频转音频、视频转视频</span></div>
                                <div class="format-info-item"><span class="format">视频</span><span class="desc">可额外转图片或提取音频</span></div>
                                <div class="format-info-item"><span class="format">输出</span><span class="desc">默认在原目录，也可指定目录</span></div>
                                <div class="format-info-item"><span class="format">跳过</span><span class="desc">不支持的组合会自动跳过</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function getFileCategory(filename) {
        if (!filename) return null;
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'tiff', 'tif'].includes(ext)) return 'image';
        if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'opus'].includes(ext)) return 'audio';
        if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', '3gp', 'm4v', 'mpg', 'mpeg'].includes(ext)) return 'video';
        return null;
    }

    function getFormatCategory(format) {
        for (const cat of CATEGORIES) {
            if (cat.formats.some(f => f.ext === format)) return cat.id;
        }
        return null;
    }

    function isConversionPossible(inputName, format) {
        const inputCategory = getFileCategory(inputName);
        const targetCategory = getFormatCategory(format);
        if (!inputCategory || !targetCategory) return false;
        if (inputCategory === targetCategory) return true;
        return inputCategory === 'video' && (targetCategory === 'image' || targetCategory === 'audio');
    }

    function formatFileSize(bytes) {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getFileIcon(filename) {
        const cat = getFileCategory(filename);
        if (cat === 'image') return '[I]';
        if (cat === 'audio') return '[A]';
        if (cat === 'video') return '[V]';
        return '[F]';
    }

    function getFileTypeDisplay(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const map = {
            jpg: 'JPEG 图片', jpeg: 'JPEG 图片', png: 'PNG 图片', gif: 'GIF 动图', bmp: 'BMP 位图', webp: 'WebP 图片', ico: '图标文件', tiff: 'TIFF 图片', tif: 'TIFF 图片',
            mp3: 'MP3 音频', wav: 'WAV 音频', ogg: 'OGG 音频', flac: 'FLAC 无损', aac: 'AAC 音频', m4a: 'M4A 音频', wma: 'WMA 音频', opus: 'Opus 音频',
            mp4: 'MP4 视频', avi: 'AVI 视频', mkv: 'MKV 视频', mov: 'MOV 视频', wmv: 'WMV 视频', flv: 'FLV 视频', webm: 'WebM 视频', '3gp': '3GP 视频', m4v: 'M4V 视频', mpg: 'MPEG 视频', mpeg: 'MPEG 视频'
        };
        return map[ext] || ext.toUpperCase() + ' 文件';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function addTerminalLog(container, text, type) {
        if (!container) return;
        const line = document.createElement('div');
        line.className = 'terminal-line ' + (type || 'info');
        line.innerHTML = '<span class="text">' + escapeHtml(text) + '</span>';
        container.appendChild(line);
        while (container.children.length > 500) container.removeChild(container.firstChild);
        container.scrollTop = container.scrollHeight;
    }

    function getDirFromPath(path) {
        if (!path) return '';
        const slash = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
        return slash >= 0 ? path.substring(0, slash) : '';
    }

    function joinPath(dir, fileName) {
        if (!dir) return fileName;
        const sep = dir.includes('\\') ? '\\' : '/';
        return dir.endsWith('\\') || dir.endsWith('/') ? dir + fileName : dir + sep + fileName;
    }

    function stripExtension(name) {
        const dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    function safeName(name) {
        return String(name || '').trim().replace(/[\\/:*?"<>|]/g, '_');
    }

    function generateOutputFileName(file, index, total, customName, format, autoRename) {
        const base = safeName(stripExtension(file.name));
        const custom = safeName(customName);
        let name;
        if (total === 1 && custom) {
            name = custom;
        } else if (custom) {
            name = custom + '_' + base;
        } else {
            name = base;
        }
        if (autoRename) {
            const stamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            name += '_' + stamp;
            if (total > 1) name += '_' + String(index + 1).padStart(2, '0');
        } else if (total > 1) {
            name += '_' + String(index + 1).padStart(2, '0');
        }
        return name + '.' + format;
    }

    function updateStartButton() {
        if (globalStartConvertBtn) globalStartConvertBtn.disabled = isConverting || selectedFiles.length === 0 || !targetFormat;
    }

    function renderFileList() {
        const container = document.getElementById('convertFileListContainer');
        const list = document.getElementById('convertFileList');
        const count = document.getElementById('convertFileCount');
        if (!container || !list || !count) return;

        container.style.display = selectedFiles.length ? 'block' : 'none';
        count.textContent = selectedFiles.length + ' 个文件';
        list.innerHTML = selectedFiles.map((file, index) => `
            <div class="file-list-item" data-index="${index}">
                <div class="file-list-icon">${getFileIcon(file.name)}</div>
                <div class="file-list-info">
                    <div class="file-list-name">${escapeHtml(file.name)}</div>
                    <div class="file-list-size">${formatFileSize(file.size)} · ${getFileTypeDisplay(file.name)}</div>
                </div>
                <button class="file-list-remove" data-index="${index}">[X]</button>
            </div>
        `).join('');

        list.querySelectorAll('.file-list-remove').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const index = Number(e.currentTarget.dataset.index);
                const [removed] = selectedFiles.splice(index, 1);
                if (removed && removed.isTemp) await deleteTempFile(removed.path);
                renderFileList();
                updateStartButton();
                addTerminalLog(globalLogContainer, '已移除: ' + (removed ? removed.name : ''), 'info');
            });
        });

        updateStartButton();
    }

    function switchCategory(categoryId) {
        currentCategory = categoryId;
        document.querySelectorAll('.format-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === categoryId);
        });
        const category = CATEGORIES.find(c => c.id === categoryId);
        if (!category || !globalFormatGrid) return;
        globalFormatGrid.innerHTML = category.formats.map(f => `
            <div class="format-item" data-format="${f.ext}">
                <div class="format-name">${f.name}</div>
                <div class="format-type">${f.desc}</div>
                <span class="format-badge">[√]</span>
            </div>
        `).join('');
        bindFormatItems();
    }

    function bindFormatItems() {
        document.querySelectorAll('.format-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.format-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                targetFormat = item.dataset.format;
                addTerminalLog(globalLogContainer, '目标格式: ' + targetFormat.toUpperCase(), 'info');
                updateStartButton();
            });
        });
    }

    async function deleteTempFile(path) {
        if (!path || !window.go || !window.go.main || !window.go.main.App || !window.go.main.App.DeleteTempFile) return;
        try { await window.go.main.App.DeleteTempFile(path); } catch (_) {}
    }

    async function cleanupTempFiles() {
        const paths = tempFilePaths.slice();
        tempFilePaths = [];
        for (const path of paths) await deleteTempFile(path);
    }

    function addFiles(fileInfos, markTemp) {
        let added = 0;
        for (const info of fileInfos) {
            if (!info || !info.path || !info.name) continue;
            const ext = info.name.split('.').pop().toLowerCase();
            if (!ALLOWED_EXTS.includes(ext)) {
                addTerminalLog(globalLogContainer, '跳过不支持的文件: ' + info.name, 'warning');
                continue;
            }
            const exists = selectedFiles.some(f => f.path === info.path);
            if (exists) continue;
            selectedFiles.push({ name: info.name, size: info.size || 0, path: info.path, isTemp: !!markTemp });
            if (markTemp) tempFilePaths.push(info.path);
            added++;
        }
        if (added > 0) {
            renderFileList();
            const firstCategory = getFileCategory(selectedFiles[0].name);
            if (firstCategory) switchCategory(firstCategory);
            addTerminalLog(globalLogContainer, '已添加 ' + added + ' 个文件', 'info');
        }
    }

    function readFileAsBytes(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = evt => resolve(Array.from(new Uint8Array(evt.target.result)));
            reader.onerror = () => reject(new Error('读取文件失败: ' + file.name));
            reader.readAsArrayBuffer(file);
        });
    }

    async function addBrowserFiles(fileList) {
        if (!fileList || fileList.length === 0) return;
        if (!window.go || !window.go.main || !window.go.main.App) {
            addTerminalLog(globalLogContainer, '错误: Wails环境未就绪，请重启应用', 'error');
            return;
        }
        const added = [];
        for (const file of Array.from(fileList)) {
            try {
                const ext = file.name.split('.').pop().toLowerCase();
                if (!ALLOWED_EXTS.includes(ext)) {
                    addTerminalLog(globalLogContainer, '跳过不支持的文件: ' + file.name, 'warning');
                    continue;
                }
                addTerminalLog(globalLogContainer, '正在缓存: ' + file.name, 'info');
                const bytes = await readFileAsBytes(file);
                const temp = await window.go.main.App.SaveTempFile(file.name, bytes);
                if (temp && temp.success) added.push(temp);
                else addTerminalLog(globalLogContainer, '缓存失败: ' + file.name + ' ' + (temp?.error || ''), 'error');
            } catch (err) {
                addTerminalLog(globalLogContainer, err.message, 'error');
            }
        }
        addFiles(added, true);
    }

    function bindEvents() {
        const uploadArea = document.getElementById('fileUploadArea');
        const fileInput = document.getElementById('fileInput');
        const addMoreFilesBtn = document.getElementById('addMoreFilesBtn');
        const clearFilesBtn = document.getElementById('clearFilesBtn');
        const selectOutputDirBtn = document.getElementById('selectOutputDirBtn');
        const outputDirInput = document.getElementById('outputDirInput');
        const qualitySelect = document.getElementById('qualitySelect');
        const sizeSelect = document.getElementById('sizeSelect');
        const customFileName = document.getElementById('customFileName');
        const autoRenameCheckbox = document.getElementById('autoRenameCheckbox');
        const startConvertBtn = document.getElementById('startConvertBtn');
        const progressContainer = document.getElementById('progressContainer');
        const progressBar = document.getElementById('progressBar');
        const progressInfo = document.getElementById('progressInfo');
        const logContainer = document.getElementById('convertLogArea');

        globalLogContainer = logContainer;
        globalFormatGrid = document.getElementById('formatGrid');
        globalStartConvertBtn = startConvertBtn;

        addTerminalLog(logContainer, '工具已加载，等待选择文件', 'info');
        document.querySelectorAll('.format-tab').forEach(tab => tab.addEventListener('click', () => switchCategory(tab.dataset.category)));
        bindFormatItems();

        async function openMultiSelect() {
            if (!window.go || !window.go.main || !window.go.main.App) {
                fileInput.click();
                return;
            }
            try {
                const result = await window.go.main.App.SelectFiles();
                if (result && result.success && result.files) {
                    addFiles(result.files, false);
                } else if (result && result.error && result.error !== '未选择文件') {
                    addTerminalLog(logContainer, '选择文件失败: ' + result.error, 'error');
                }
            } catch (err) {
                addTerminalLog(logContainer, '系统选择器失败，改用备用选择器: ' + err.message, 'warning');
                fileInput.click();
            }
        }

        uploadArea.addEventListener('click', openMultiSelect);
        addMoreFilesBtn.addEventListener('click', openMultiSelect);

        fileInput.addEventListener('change', async (e) => {
            await addBrowserFiles(e.target.files);
            fileInput.value = '';
        });

        uploadArea.addEventListener('dragover', e => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', async e => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            await addBrowserFiles(e.dataTransfer.files);
        });

        clearFilesBtn.addEventListener('click', async () => {
            selectedFiles = [];
            targetFormat = null;
            document.querySelectorAll('.format-item').forEach(el => el.classList.remove('selected'));
            await cleanupTempFiles();
            renderFileList();
            addTerminalLog(logContainer, '已清空文件列表', 'info');
        });

        selectOutputDirBtn.addEventListener('click', async () => {
            if (!window.go || !window.go.main || !window.go.main.App) {
                addTerminalLog(logContainer, '错误: Wails环境未就绪，请重启应用', 'error');
                return;
            }
            const result = await window.go.main.App.SelectOutputDir();
            if (result && result.success) {
                outputDir = result.path;
                outputDirInput.value = outputDir;
                addTerminalLog(logContainer, '输出目录: ' + outputDir, 'info');
            } else if (result && result.error && result.error !== '未选择目录') {
                addTerminalLog(logContainer, '选择输出目录失败: ' + result.error, 'error');
            }
        });

        startConvertBtn.addEventListener('click', async () => {
            if (isConverting) return;
            if (selectedFiles.length === 0 || !targetFormat) {
                addTerminalLog(logContainer, '请先选择文件和目标格式', 'warning');
                return;
            }
            if (!window.go || !window.go.main || !window.go.main.App) {
                addTerminalLog(logContainer, '错误: Wails环境未就绪，请重启应用', 'error');
                return;
            }

            isConverting = true;
            updateStartButton();
            if (progressContainer) progressContainer.classList.add('active');
            if (progressBar) progressBar.style.width = '0%';
            if (progressInfo) progressInfo.textContent = '';
            logContainer.innerHTML = '';

            const quality = qualitySelect ? qualitySelect.value : 'high';
            const size = sizeSelect ? sizeSelect.value : 'original';
            const autoRename = autoRenameCheckbox ? autoRenameCheckbox.checked : true;
            const customName = customFileName ? customFileName.value : '';
            let successCount = 0;
            let failCount = 0;
            let skipCount = 0;

            addTerminalLog(logContainer, '开始批量转换，共 ' + selectedFiles.length + ' 个文件', 'info');
            addTerminalLog(logContainer, '目标格式: ' + targetFormat.toUpperCase(), 'info');

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                const percent = Math.round((i / selectedFiles.length) * 100);
                if (progressBar) progressBar.style.width = percent + '%';
                if (progressInfo) progressInfo.textContent = `正在处理 ${i + 1}/${selectedFiles.length}: ${file.name}`;

                if (!isConversionPossible(file.name, targetFormat)) {
                    skipCount++;
                    addTerminalLog(logContainer, '[跳过] ' + file.name + ' 不能转换为 ' + targetFormat.toUpperCase(), 'warning');
                    continue;
                }

                const outDir = outputDir || getDirFromPath(file.path);
                const outName = generateOutputFileName(file, i, selectedFiles.length, customName, targetFormat, autoRename);
                const outPath = joinPath(outDir, outName);

                addTerminalLog(logContainer, '[任务] ' + file.name + ' -> ' + outName, 'info');
                try {
                    const result = await window.go.main.App.ConvertVideo(file.path, outPath, targetFormat, quality, size);
                    // 兼容大小写 Success/success
                    var isSuccess = result && (result.Success === true || result.success === true);
                    if (isSuccess) {
                        successCount++;
                        addTerminalLog(logContainer, '[成功] ' + outPath, 'success');
                    } else {
                        failCount++;
                        var errMsg = result && (result.Error || result.error);
                        addTerminalLog(logContainer, '[失败] ' + file.name + ': ' + (errMsg || '未知错误'), 'error');
                    }
                } catch (err) {
                    failCount++;
                    addTerminalLog(logContainer, '[错误] ' + file.name + ': ' + err.message, 'error');
                }
            }

            if (progressBar) progressBar.style.width = '100%';
            if (progressInfo) progressInfo.textContent = `完成：成功 ${successCount}，失败 ${failCount}，跳过 ${skipCount}`;
            addTerminalLog(logContainer, `批量转换完成：成功 ${successCount}，失败 ${failCount}，跳过 ${skipCount}`, successCount > 0 ? 'success' : 'warning');

            isConverting = false;
            updateStartButton();
            setTimeout(() => {
                if (progressContainer) progressContainer.classList.remove('active');
                if (progressBar) progressBar.style.width = '0%';
            }, 2500);
        });
    }

    if (window.ToolRegistry) {
        window.ToolRegistry.register(TOOL_ID, {
            name: TOOL_NAME,
            render: renderUI,
            bind: bindEvents
        });
        console.log('格式转换工具加载完成（批量版）');
    } else {
        console.error('ToolRegistry 未找到');
    }
})();