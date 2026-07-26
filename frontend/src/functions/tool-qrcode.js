// frontend/src/functions/tool-qrcode.js
(function() {
    "use strict";

    const TOOL_ID = 'qrcode';
    const TOOL_NAME = '二维码生成';

    let currentLogoDataUrl = null;
    let isGenerating = false;

    function renderUI() {
        return `
            <div class="tool-header">
                <h2>二维码生成</h2>
                <p>输入文本或链接，一键生成二维码，支持嵌入图片 Logo</p>
            </div>
            <div class="qrcode-demo">
                <div class="qrcode-layout">
                    <div class="qrcode-left-panel">
                        <div class="input-group">
                            <label class="input-label">内容 / 链接</label>
                            <textarea id="qrTextInput" class="field" rows="3" placeholder="请输入文本、网址或任何你想编码的内容..."></textarea>
                        </div>

                        <div class="options-grid">
                            <div class="option-item">
                                <label class="input-label">尺寸</label>
                                <select id="qrSizeSelect" class="field">
                                    <option value="200">200 x 200</option>
                                    <option value="300" selected>300 x 300</option>
                                    <option value="400">400 x 400</option>
                                    <option value="600">600 x 600</option>
                                </select>
                            </div>
                            <div class="option-item">
                                <label class="input-label">纠错等级</label>
                                <select id="qrLevelSelect" class="field">
                                    <option value="L">L (7%)</option>
                                    <option value="M">M (15%)</option>
                                    <option value="Q">Q (25%)</option>
                                    <option value="H" selected>H (30%)</option>
                                </select>
                            </div>
                        </div>

                        <div class="options-grid">
                            <div class="option-item">
                                <label class="input-label">前景色</label>
                                <input type="color" id="qrFgColor" class="field color-picker" value="#000000">
                            </div>
                            <div class="option-item">
                                <label class="input-label">背景色</label>
                                <input type="color" id="qrBgColor" class="field color-picker" value="#ffffff">
                            </div>
                        </div>

                        <div class="options-grid">
                            <div class="option-item">
                                <label class="input-label">嵌入模式</label>
                                <select id="qrEmbedMode" class="field">
                                    <option value="logo">Logo 居中</option>
                                    <option value="background">图片背景</option>
                                    <option value="blend">混合融合</option>
                                </select>
                            </div>
                            <div class="option-item">
                                <label class="input-label">边框</label>
                                <select id="qrBorderWidth" class="field">
                                    <option value="2">窄边框</option>
                                    <option value="4" selected>标准边框 (推荐)</option>
                                    <option value="6">宽边框</option>
                                    <option value="8">加宽边框</option>
                                </select>
                            </div>
                        </div>

                        <div class="logo-upload-section">
                            <label class="input-label">嵌入图片</label>
                            <div class="logo-upload-area" id="logoUploadArea">
                                <div class="logo-upload-icon">🖼️</div>
                                <div class="logo-upload-text">点击上传图片</div>
                                <div class="logo-upload-hint">支持 PNG、JPG、WebP</div>
                                <input type="file" id="logoFileInput" accept="image/*" style="display:none;">
                            </div>
                            <div id="logoPreviewContainer" style="display:none;" class="logo-preview-container">
                                <img id="logoPreview" class="logo-preview" alt="图片预览">
                                <button class="logo-remove-btn" id="removeLogoBtn">✕ 移除</button>
                            </div>
                        </div>

                        <div class="qrcode-btn-group">
                            <button class="button primary" id="generateBtn">生成二维码</button>
                            <button class="button secondary" id="downloadBtn" disabled>下载 PNG</button>
                        </div>
                    </div>

                    <div class="qrcode-right-panel">
                        <div class="preview-container">
                            <div class="preview-title">预览</div>
                            <div class="qr-preview-box" id="qrPreviewBox">
                                <div id="qrPlaceholder" class="qr-placeholder">
                                    <div class="qr-placeholder-icon">⊞</div>
                                    <div class="qr-placeholder-text">输入内容后点击生成</div>
                                </div>
                                <div id="qrCodeContainer" style="display:none;">
                                    <img id="qrResultImage" style="max-width:100%;max-height:100%;border-radius:8px;">
                                </div>
                            </div>
                            <div class="preview-actions">
                                <button class="button small secondary" id="copyTextBtn">复制内容</button>
                                <button class="button small secondary" id="clearBtn">清空</button>
                            </div>
                        </div>

                        <div class="format-info">
                            <div class="info-title">使用说明</div>
                            <div class="format-info-grid">
                                <div class="format-info-item"><span class="format">1</span><span class="desc">输入需要编码的文字或链接</span></div>
                                <div class="format-info-item"><span class="format">2</span><span class="desc">选择颜色、尺寸和嵌入模式</span></div>
                                <div class="format-info-item"><span class="format">3</span><span class="desc">可选上传图片嵌入二维码</span></div>
                                <div class="format-info-item"><span class="format">4</span><span class="desc">点击生成预览，下载 PNG 保存</span></div>
                            </div>
                            <div id="qrLogArea" class="terminal-content" style="margin-top:12px;padding:8px 12px;background:#0f1a24;border-radius:8px;max-height:100px;overflow-y:auto;font-size:0.8rem;color:#b0c7da;min-height:40px;">
                                <div class="terminal-line"><span class="text">就绪，等待生成...</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function addLog(text, type) {
        const container = document.getElementById('qrLogArea');
        if (!container) return;
        const line = document.createElement('div');
        line.className = 'terminal-line ' + (type || 'info');
        line.innerHTML = '<span class="text">' + escapeHtml(text) + '</span>';
        container.appendChild(line);
        while (container.children.length > 50) container.removeChild(container.firstChild);
        container.scrollTop = container.scrollHeight;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function generateQRCode() {
        if (isGenerating) return;

        const textInput = document.getElementById('qrTextInput');
        const text = textInput ? textInput.value.trim() : '';
        
        if (!text) {
            const placeholder = document.getElementById('qrPlaceholder');
            if (placeholder) {
                placeholder.style.display = 'flex';
                const textEl = placeholder.querySelector('.qr-placeholder-text');
                if (textEl) textEl.textContent = '⚠️ 请先输入内容';
                setTimeout(() => {
                    if (textEl) textEl.textContent = '输入内容后点击生成';
                }, 2000);
            }
            return;
        }

        if (!window.go || !window.go.main || !window.go.main.App) {
            addLog('❌ Wails 环境未就绪，请重启应用', 'error');
            return;
        }

        isGenerating = true;
        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = true;
        generateBtn.textContent = '生成中...';

        try {
            const size = parseInt(document.getElementById('qrSizeSelect').value, 10);
            const fgColor = document.getElementById('qrFgColor').value;
            const bgColor = document.getElementById('qrBgColor').value;
            const embedMode = document.getElementById('qrEmbedMode').value;
            const errorCorrection = document.getElementById('qrLevelSelect').value;
            const border = parseInt(document.getElementById('qrBorderWidth').value, 10);

            let embedImage = '';
            if (currentLogoDataUrl) {
                embedImage = currentLogoDataUrl;
            }

            addLog('⏳ 正在生成二维码...', 'info');

            const result = await window.go.main.App.GenerateQRCode(
                text,
                size,
                fgColor,
                bgColor,
                embedImage,
                embedMode,
                errorCorrection,
                border
            );

            console.log('生成结果:', result);

            const isSuccess = result?.Success === true;
            const outputData = result?.output || '';
            const errorMsg = result?.Error || result?.error || '';

            if (isSuccess && outputData) {
                const container = document.getElementById('qrCodeContainer');
                const placeholder = document.getElementById('qrPlaceholder');
                const img = document.getElementById('qrResultImage');
                
                if (container) container.style.display = 'block';
                if (placeholder) placeholder.style.display = 'none';
                
                img.src = 'data:image/png;base64,' + outputData;
                img.style.display = 'block';
                
                img.dataset.base64 = outputData;
                
                const downloadBtn = document.getElementById('downloadBtn');
                if (downloadBtn) downloadBtn.disabled = false;
                
                addLog('✅ 二维码生成成功！', 'success');
            } else {
                addLog('❌ 生成失败: ' + (errorMsg || '未知错误'), 'error');
                console.error('生成失败:', result);
            }
        } catch (error) {
            addLog('❌ 错误: ' + error.message, 'error');
            console.error('生成错误:', error);
        } finally {
            isGenerating = false;
            generateBtn.disabled = false;
            generateBtn.textContent = '生成二维码';
        }
    }

    function downloadQRCode() {
        const img = document.getElementById('qrResultImage');
        if (!img || !img.src || img.src === '') {
            addLog('❌ 没有可下载的二维码', 'error');
            return;
        }
        
        let dataUrl = img.dataset.base64;
        if (dataUrl) {
            dataUrl = 'data:image/png;base64,' + dataUrl;
        } else {
            dataUrl = img.src;
        }
        
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog('✅ 下载成功！', 'success');
    }

    function bindEvents() {
        const generateBtn = document.getElementById('generateBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const copyTextBtn = document.getElementById('copyTextBtn');
        const clearBtn = document.getElementById('clearBtn');
        const textInput = document.getElementById('qrTextInput');

        const logoUploadArea = document.getElementById('logoUploadArea');
        const logoFileInput = document.getElementById('logoFileInput');
        const logoPreviewContainer = document.getElementById('logoPreviewContainer');
        const logoPreview = document.getElementById('logoPreview');
        const removeLogoBtn = document.getElementById('removeLogoBtn');

        generateBtn.addEventListener('click', generateQRCode);

        textInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && e.ctrlKey) {
                generateBtn.click();
            }
        });

        downloadBtn.addEventListener('click', downloadQRCode);

        copyTextBtn.addEventListener('click', function() {
            const text = textInput ? textInput.value.trim() : '';
            if (text) {
                navigator.clipboard.writeText(text).then(() => {
                    copyTextBtn.textContent = '✅ 已复制';
                    setTimeout(() => { copyTextBtn.textContent = '复制内容'; }, 2000);
                }).catch(() => {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    copyTextBtn.textContent = '✅ 已复制';
                    setTimeout(() => { copyTextBtn.textContent = '复制内容'; }, 2000);
                });
            }
        });

        clearBtn.addEventListener('click', function() {
            if (textInput) textInput.value = '';
            const container = document.getElementById('qrCodeContainer');
            const placeholder = document.getElementById('qrPlaceholder');
            const img = document.getElementById('qrResultImage');
            
            if (container) container.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
            if (img) {
                img.src = '';
                img.dataset.base64 = '';
            }
            
            if (downloadBtn) downloadBtn.disabled = true;
            
            const logContainer = document.getElementById('qrLogArea');
            if (logContainer) {
                logContainer.innerHTML = '<div class="terminal-line"><span class="text">就绪，等待生成...</span></div>';
            }
        });

        logoUploadArea.addEventListener('click', function() {
            logoFileInput.click();
        });

        logoFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    currentLogoDataUrl = ev.target.result;
                    logoPreview.src = currentLogoDataUrl;
                    logoPreviewContainer.style.display = 'flex';
                    logoUploadArea.style.display = 'none';
                    addLog('✅ 图片已上传，点击生成二维码', 'success');
                };
                reader.readAsDataURL(file);
            }
            logoFileInput.value = '';
        });

        removeLogoBtn.addEventListener('click', function() {
            currentLogoDataUrl = null;
            logoPreview.src = '';
            logoPreviewContainer.style.display = 'none';
            logoUploadArea.style.display = 'block';
            addLog('已移除图片', 'info');
        });

        logoUploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            logoUploadArea.classList.add('dragover');
        });

        logoUploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            logoUploadArea.classList.remove('dragover');
        });

        logoUploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            logoUploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    currentLogoDataUrl = ev.target.result;
                    logoPreview.src = currentLogoDataUrl;
                    logoPreviewContainer.style.display = 'flex';
                    logoUploadArea.style.display = 'none';
                    addLog('✅ 图片已上传（拖拽），点击生成二维码', 'success');
                };
                reader.readAsDataURL(file);
            }
        });

        ['qrSizeSelect', 'qrLevelSelect', 'qrFgColor', 'qrBgColor', 'qrEmbedMode', 'qrBorderWidth'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', function() {
                    const text = textInput ? textInput.value.trim() : '';
                    if (text) {
                        generateBtn.click();
                    }
                });
            }
        });
    }

    if (window.ToolRegistry) {
        ToolRegistry.register(TOOL_ID, {
            name: TOOL_NAME,
            render: renderUI,
            bind: bindEvents
        });
        console.log('二维码生成工具加载完成（Python 后端版）');
    } else {
        console.error('ToolRegistry 未找到');
    }

})();