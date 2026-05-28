(function() {
    "use strict";

    window.ToolRegistry = {
        tools: {},
        
        register: function(toolId, config) {
            this.tools[toolId] = config;
            console.log("工具注册成功: " + toolId + " (" + config.name + ")");
        },
        
        get: function(toolId) {
            return this.tools[toolId];
        },
        
        has: function(toolId) {
            return !!this.tools[toolId];
        }
    };

    var toolItems = null;
    var dynamicUIContainer = document.getElementById('dynamicUI');

    function getToolNameById(toolId) {
        var map = {
            'convert': '格式转换',
            'merge': '音视频合并',
            'volume': '音量调节'
        };
        return map[toolId] || toolId;
    }

    function getPlaceholderTemplate(toolId) {
        var toolName = getToolNameById(toolId);
        return `
            <div class="tool-header">
                <h2>${toolName}</h2>
            </div>
            <div style="background: #ecf3fa; border-radius: 32px; padding: 40px 20px; text-align: center; color: #3e6279;">
                <h3 style="margin: 16px 0; font-weight: 500;">${toolName} 即将上线</h3>
                <p style="color: #597b93;">该工具尚未独立模块化，可扩展注册</p>
            </div>
        `;
    }

    window.switchTool = function(activeItem) {
        if (!toolItems) {
            toolItems = document.querySelectorAll('.tool-item');
        }
        
        for (var i = 0; i < toolItems.length; i++) {
            toolItems[i].classList.remove('active');
        }
        activeItem.classList.add('active');

        var toolId = activeItem.getAttribute('data-tool');
        
        if (dynamicUIContainer) {
            dynamicUIContainer.classList.add('slide-out');
            
            setTimeout(function() {
                dynamicUIContainer.innerHTML = '';
                
                if (ToolRegistry.has(toolId)) {
                    var tool = ToolRegistry.get(toolId);
                    dynamicUIContainer.innerHTML = tool.render();
                    
                    requestAnimationFrame(function() {
                        if (typeof tool.bind === 'function') {
                            tool.bind();
                        }
                    });
                } else {
                    dynamicUIContainer.innerHTML = getPlaceholderTemplate(toolId);
                }
                
                dynamicUIContainer.classList.remove('slide-out');
                dynamicUIContainer.classList.add('slide-in');
                
                setTimeout(function() {
                    dynamicUIContainer.classList.remove('slide-in');
                }, 300);
            }, 250);
        }
    };

    // ========== 初始化设置按钮 ==========
    function initSettingsButton() {
        var settingsBtn = document.createElement('button');
        settingsBtn.id = 'settingsBtn';
        settingsBtn.title = '设置';
        document.body.appendChild(settingsBtn);
        
        createSettingsModal();
        settingsBtn.onclick = showSettingsModal;
    }
    
    function createSettingsModal() {
        if (document.getElementById('settingsModal')) return;
        
        var modalOverlay = document.createElement('div');
        modalOverlay.id = 'settingsModal';
        
        modalOverlay.innerHTML = `
            <div class="settings-container">
                <button class="settings-close">&times;</button>
                
                <div class="settings-sidebar">
                    <div class="settings-sidebar-header">
                        <h3>设置</h3>
                    </div>
                    <div class="settings-menu">
                        <div class="settings-menu-item active" data-pane="author">
                            <span class="settings-menu-icon settings-menu-icon-author" aria-hidden="true"></span>
                            <span>关于作者</span>
                        </div>
                        <div class="settings-menu-item" data-pane="appearance">
                            <span class="settings-menu-icon settings-menu-icon-style" aria-hidden="true"></span>
                            <span>个性设置</span>
                        </div>
                    </div>
                </div>
                
                <div class="settings-content">
                    <div class="settings-pane active" id="pane-author">
                        <div class="pane-title">关于作者</div>
                        <div class="author-info">
                            <div class="author-avatar"></div>
                            <div class="author-name">Pigeon5887</div>
                            <div class="qq-container">
                                <span class="qq-number">cyd580413@gmail.com</span>
                                <button class="copy-qq-btn">复制</button>
                            </div>
                            <div class="contact-text">
                                您如有任何问题、建议或发现Bug<br>
                                欢迎通过gmail邮箱发私信给我<br>
                                我会尽快回复您！诚心感谢！
                            </div>
                        </div>
                    </div>
                    
                    <div class="settings-pane" id="pane-appearance">
                        <div class="pane-title">个性设置</div>
                        <div style="font-size: 0.8rem; color: #b0c7da; margin-bottom: 12px;">预设渐变背景：</div>
                        <div class="bg-presets">
                            <div class="bg-preset" data-bg="gradient1" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);"></div>
                            <div class="bg-preset" data-bg="gradient2" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);"></div>
                            <div class="bg-preset" data-bg="gradient3" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);"></div>
                            <div class="bg-preset" data-bg="gradient4" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);"></div>
                            <div class="bg-preset" data-bg="gradient5" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);"></div>
                            <div class="bg-preset" data-bg="gradient6" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);"></div>
                        </div>
                        <button class="upload-bg-btn" id="uploadBgBtn">上传自定义图片</button>
                        <button class="reset-bg-btn" id="resetBgBtn">恢复默认背景</button>

                        <div class="material-setting-card">
                            <div class="material-setting-text">
                                <div class="material-setting-title">半透明材质</div>
                                <div class="material-setting-desc">开启后主页面背景板会使用磨砂亚克力半透明效果</div>
                            </div>
                            <label class="material-switch">
                                <input type="checkbox" id="translucentMaterialSwitch">
                                <span class="material-switch-slider"></span>
                            </label>
                        </div>

                        <input type="file" id="bgFileInput" accept="image/*" style="display: none;">
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalOverlay);
        
        // 关闭按钮
        var closeBtn = modalOverlay.querySelector('.settings-close');
        closeBtn.onclick = hideSettingsModal;
        
        // 点击遮罩关闭
        modalOverlay.onclick = function(e) {
            if (e.target === modalOverlay) {
                hideSettingsModal();
            }
        };
        
        // 菜单切换：带内容过渡动画
        var menuItems = modalOverlay.querySelectorAll('.settings-menu-item');
        var settingsContent = modalOverlay.querySelector('.settings-content');
        var isPaneSwitching = false;

        function switchSettingsPane(nextPaneId, nextMenuItem) {
            if (isPaneSwitching) return;

            var currentPane = modalOverlay.querySelector('.settings-pane.active');
            var nextPane = modalOverlay.querySelector('#pane-' + nextPaneId);

            if (!nextPane || currentPane === nextPane) return;

            isPaneSwitching = true;

            for (var j = 0; j < menuItems.length; j++) {
                menuItems[j].classList.remove('active');
            }
            nextMenuItem.classList.add('active');

            if (settingsContent) {
                settingsContent.classList.add('pane-switching');
            }

            if (currentPane) {
                currentPane.classList.remove('pane-enter', 'pane-enter-active');
                currentPane.classList.add('pane-leave');

                requestAnimationFrame(function() {
                    currentPane.classList.add('pane-leave-active');
                });
            }

            setTimeout(function() {
                if (currentPane) {
                    currentPane.classList.remove('active', 'pane-leave', 'pane-leave-active');
                }

                nextPane.classList.add('active', 'pane-enter');

                requestAnimationFrame(function() {
                    nextPane.classList.add('pane-enter-active');
                });

                setTimeout(function() {
                    nextPane.classList.remove('pane-enter', 'pane-enter-active');
                    if (settingsContent) {
                        settingsContent.classList.remove('pane-switching');
                    }
                    isPaneSwitching = false;
                }, 260);
            }, 180);
        }

        for (var i = 0; i < menuItems.length; i++) {
            (function(item) {
                item.onclick = function() {
                    switchSettingsPane(this.dataset.pane, this);
                };
            })(menuItems[i]);
        }
        
        // 复制QQ
        var copyBtn = modalOverlay.querySelector('.copy-qq-btn');
        copyBtn.onclick = function() {
            var qqNumber = modalOverlay.querySelector('.qq-number').textContent;
            navigator.clipboard.writeText(qqNumber);
            copyBtn.textContent = '已复制';
            setTimeout(function() { copyBtn.textContent = '复制'; }, 2000);
        };
        
        // 背景预设
        var presets = modalOverlay.querySelectorAll('.bg-preset');
        var self = window.BackgroundManager;
        for (var i = 0; i < presets.length; i++) {
            (function(preset) {
                preset.onclick = function() {
                    var bgType = this.dataset.bg;
                    self.applyPresetBackground(bgType);
                    hideSettingsModal();
                };
            })(presets[i]);
        }
        
        // 上传图片
        var uploadBtn = modalOverlay.querySelector('#uploadBgBtn');
        var bgFileInput = modalOverlay.querySelector('#bgFileInput');
        uploadBtn.onclick = function() { bgFileInput.click(); };
        bgFileInput.onchange = function(e) {
            var file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                self.applyCustomBackground(file);
                hideSettingsModal();
            }
        };
        
        // 重置背景
        var resetBtn = modalOverlay.querySelector('#resetBgBtn');
        resetBtn.onclick = function() {
            self.resetBackground();
            hideSettingsModal();
        };

        // 半透明材质开关
        var translucentSwitch = modalOverlay.querySelector('#translucentMaterialSwitch');
        if (translucentSwitch) {
            translucentSwitch.checked = localStorage.getItem('translucentMaterialEnabled') === 'true';
            translucentSwitch.onchange = function() {
                self.setTranslucentMaterial(this.checked);
            };
        }
    }
    
    function showSettingsModal() {
        var modal = document.getElementById('settingsModal');
        if (modal) modal.classList.add('show');
    }
    
    function hideSettingsModal() {
        var modal = document.getElementById('settingsModal');
        if (modal) modal.classList.remove('show');
    }

    // ========== 背景管理器 ==========
    window.BackgroundManager = {
        init: function() {
            this.loadSavedBackground();
            this.loadSavedMaterial();
        },
        
        applyPresetBackground: function(bgType) {
            var gradients = {
                gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                gradient2: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                gradient3: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                gradient4: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                gradient5: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                gradient6: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
            };
            
            var mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.background = gradients[bgType];
                mainContent.style.backgroundSize = 'cover';
                localStorage.setItem('customBg', gradients[bgType]);
                localStorage.setItem('customBgType', 'gradient');
            }
        },
        
        applyCustomBackground: function(file) {
            var reader = new FileReader();
            reader.onload = function(e) {
                var imageUrl = e.target.result;
                var mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    mainContent.style.background = 'url(' + imageUrl + ') no-repeat center center';
                    mainContent.style.backgroundSize = 'cover';
                    localStorage.setItem('customBg', imageUrl);
                    localStorage.setItem('customBgType', 'image');
                }
            };
            reader.readAsDataURL(file);
        },
        
        resetBackground: function() {
            var mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.background = "url('./src/assets/images/bg.jpg') no-repeat center center";
                mainContent.style.backgroundSize = 'cover';
                localStorage.removeItem('customBg');
                localStorage.removeItem('customBgType');
            }
        },
        
        loadSavedBackground: function() {
            var savedBg = localStorage.getItem('customBg');
            if (savedBg) {
                var mainContent = document.querySelector('.main-content');
                if (mainContent) {
                    var bgType = localStorage.getItem('customBgType');
                    if (bgType === 'gradient') {
                        mainContent.style.background = savedBg;
                        mainContent.style.backgroundSize = 'cover';
                    } else if (bgType === 'image') {
                        mainContent.style.background = 'url(' + savedBg + ') no-repeat center center';
                        mainContent.style.backgroundSize = 'cover';
                    }
                }
            }
        },

        setTranslucentMaterial: function(enabled) {
            document.body.classList.toggle('translucent-material-enabled', enabled);
            localStorage.setItem('translucentMaterialEnabled', enabled ? 'true' : 'false');
        },

        loadSavedMaterial: function() {
            var enabled = localStorage.getItem('translucentMaterialEnabled') === 'true';
            this.setTranslucentMaterial(enabled);
        }
    };

    // ========== 初始化工具项 ==========
    function initToolItems() {
        toolItems = document.querySelectorAll('.tool-item');
        for (var i = 0; i < toolItems.length; i++) {
            toolItems[i].addEventListener('click', function(e) {
                e.stopPropagation();
                window.switchTool(this);
            });
        }
    }

    // ========== DOM加载完成 ==========
    window.addEventListener('DOMContentLoaded', function() {
        initToolItems();
        
        var defaultActive = document.querySelector('.tool-item.active');
        if (defaultActive) {
            setTimeout(function() {
                window.switchTool(defaultActive);
            }, 10);
        } else {
            var firstTool = document.querySelector('.tool-item');
            if (firstTool) {
                setTimeout(function() {
                    window.switchTool(firstTool);
                }, 10);
            }
        }
        
        if (window.BackgroundManager) {
            window.BackgroundManager.init();
        }
        
        initSettingsButton();
    });

})();