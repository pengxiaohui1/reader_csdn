// 阅读器功能和隐蔽模式实现

// 当文档加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化变量
    const readerContent = document.getElementById('reader-content');
    const fontSizeIncrease = document.getElementById('font-size-increase');
    const fontSizeDecrease = document.getElementById('font-size-decrease');
    const toggleSidebar = document.getElementById('toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const content = document.querySelector('.content');
    const bookmarkBtn = document.getElementById('add-bookmark');
    const bookId = document.getElementById('book-id')?.value;
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    const pageIndicator = document.getElementById('page-indicator');
    const workModeBtn = document.getElementById('work-mode');
    const portableModeBtn = document.getElementById('portable-mode');
    const stealthModeBtn = document.getElementById('stealth-mode');
    const themeToggleReaderBtn = document.getElementById('theme-toggle-reader'); // 阅读器主题切换按钮
    const emergencyTip = document.getElementById('emergency-tip');
    const header = document.querySelector('header'); // 修改为header标签
    const readerContainer = document.querySelector('.reader-container'); // 便携模式容器
    const contentLayout = document.querySelector('.content-layout'); // 三栏布局容器
    let currentFontSize = 16; // 默认字体大小
    let isWorkMode = false; // 工作模式状态
    let isPortableMode = false; // 便携模式状态
    let isStealthMode = false; // 隐蔽模式状态
    let currentLineIndex = 0; // 当前显示的文字行索引
    let textLines = []; // 存储文字行数组
    let currentPosition = parseInt(document.getElementById('current-position')?.value || 0);
    // 翻页按键节流，保证响应灵敏且避免过度触发
    let lastPageKeyTime = 0;
    const PAGE_KEY_THROTTLE_MS = 150;
    
    // 初始化字体大小
    if (localStorage.getItem('fontSize')) {
        currentFontSize = parseInt(localStorage.getItem('fontSize'));
        readerContent.style.fontSize = currentFontSize + 'px';
    }
    
    // 增加字体大小
    if (fontSizeIncrease) {
        fontSizeIncrease.addEventListener('click', function() {
            if (currentFontSize < 24) {
                currentFontSize += 2;
                readerContent.style.fontSize = currentFontSize + 'px';
                localStorage.setItem('fontSize', currentFontSize);
            }
        });
    }
    
    // 减小字体大小
    if (fontSizeDecrease) {
        fontSizeDecrease.addEventListener('click', function() {
            if (currentFontSize > 12) {
                currentFontSize -= 2;
                readerContent.style.fontSize = currentFontSize + 'px';
                localStorage.setItem('fontSize', currentFontSize);
            }
        });
    }
    
    // 切换侧边栏 - CSDN风格
    if (toggleSidebar) {
        toggleSidebar.addEventListener('click', function() {
            sidebar.classList.toggle('sidebar-hidden');
            content.classList.toggle('content-full');
            
            // 保存侧边栏状态到本地存储
            const isSidebarHidden = sidebar.classList.contains('sidebar-hidden');
            localStorage.setItem('sidebarHidden', isSidebarHidden);
            
            // 更新图标
            const icon = toggleSidebar.querySelector('i') || toggleSidebar;
            if (isSidebarHidden) {
                icon.textContent = '显示侧边栏';
                toggleSidebar.setAttribute('title', '显示侧边栏');
            } else {
                icon.textContent = '隐藏侧边栏';
                toggleSidebar.setAttribute('title', '隐藏侧边栏');
            }
        });
        
        // 页面加载时恢复侧边栏状态
        const savedSidebarState = localStorage.getItem('sidebarHidden');
        if (savedSidebarState === 'true') {
            sidebar.classList.add('sidebar-hidden');
            content.classList.add('content-full');
            const icon = toggleSidebar.querySelector('i') || toggleSidebar;
            icon.textContent = '显示侧边栏';
            toggleSidebar.setAttribute('title', '显示侧边栏');
        }
    }
    
    // 工作模式切换 - CSDN风格
    if (workModeBtn) {
        workModeBtn.addEventListener('click', function() {
            isWorkMode = !isWorkMode;
            
            // 保存工作模式状态
            localStorage.setItem('workMode', isWorkMode);
            
            // 更新UI
            if (isWorkMode) {
                // 隐藏标题和非必要元素
                if (header) header.classList.add('hidden');
                document.body.classList.add('work-mode');
                workModeBtn.innerHTML = '<i class="fas fa-briefcase"></i>退出工作模式';
                workModeBtn.classList.add('active');
            } else {
                // 恢复正常显示
                if (header) header.classList.remove('hidden');
                document.body.classList.remove('work-mode');
                workModeBtn.innerHTML = '<i class="fas fa-briefcase"></i>工作模式';
                workModeBtn.classList.remove('active');
            }
        });
        
        // 页面加载时恢复工作模式状态
        const savedWorkMode = localStorage.getItem('workMode');
        if (savedWorkMode === 'true') {
            isWorkMode = true;
            if (header) header.classList.add('hidden');
            document.body.classList.add('work-mode');
            workModeBtn.innerHTML = '<i class="fas fa-briefcase"></i>退出工作模式';
            workModeBtn.classList.add('active');
        }
    }
    
    // 主题切换功能
    if (themeToggleReaderBtn) {
        // 初始化主题图标
        const savedTheme = localStorage.getItem('theme') || 'light';
        const themeIcon = themeToggleReaderBtn.querySelector('i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
        
        // 添加点击事件
        themeToggleReaderBtn.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            // 更新HTML属性
            document.documentElement.setAttribute('data-theme', newTheme);
            
            // 保存到本地存储
            localStorage.setItem('theme', newTheme);
            
            // 更新图标
            const themeIcon = themeToggleReaderBtn.querySelector('i');
            if (themeIcon) {
                themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        });
    }
    
    // 便携模式功能
    const portableToggle = document.createElement('div');
    portableToggle.className = 'portable-toggle';
    portableToggle.innerHTML = '<i class="fas fa-window-restore"></i>';
    portableToggle.title = '切换便携模式 (Ctrl+P)';
    document.body.appendChild(portableToggle);
    
    // 退出隐蔽模式按钮
    const stealthExitToggle = document.createElement('div');
    stealthExitToggle.className = 'stealth-exit-toggle';
    stealthExitToggle.innerHTML = '<i class="fas fa-eye"></i>';
    stealthExitToggle.title = '退出隐蔽模式 (ESC)';
    document.body.appendChild(stealthExitToggle);
    
    // 初始化便携模式状态
    if (localStorage.getItem('portableMode') === 'true') {
        isPortableMode = true;
    }
    
    portableToggle.addEventListener('click', function() {
        isPortableMode = !isPortableMode;
        if (!contentLayout) {
            localStorage.setItem('portableMode', isPortableMode);
            return;
        }
        
        if (isPortableMode) {
            contentLayout.classList.add('portable-mode');
            portableToggle.innerHTML = '<i class="fas fa-times"></i>';
            portableToggle.title = '退出便携模式 (Ctrl+P)';
        } else {
            contentLayout.classList.remove('portable-mode');
            portableToggle.innerHTML = '<i class="fas fa-window-restore"></i>';
            portableToggle.title = '切换便携模式 (Ctrl+P)';
        }
        
        localStorage.setItem('portableMode', isPortableMode);
    });
    
    // 初始化便携模式
    if (isPortableMode && contentLayout) {
        contentLayout.classList.add('portable-mode');
        portableToggle.innerHTML = '<i class="fas fa-times"></i>';
        portableToggle.title = '退出便携模式 (Ctrl+P)';
    }
    
    // 快速隐藏提示
    const quickHideTip = document.createElement('div');
    quickHideTip.className = 'quick-hide-tip';
    quickHideTip.innerHTML = 'ESC 快速隐藏';
    quickHideTip.title = '点击快速隐藏阅读内容';
    document.body.appendChild(quickHideTip);

    // 激活隐蔽模式函数
function activateStealthMode() {
    isStealthMode = !isStealthMode;
    
    if (isStealthMode) {
        // 保存当前页面状态
        localStorage.setItem('stealthMode', 'true');
        
        // 隐藏阅读内容，显示伪装内容
        document.body.classList.add('stealth-mode');
        stealthExitToggle.style.display = 'flex';
        
        // 隐藏快速隐藏提示
        if (quickHideTip) {
            quickHideTip.style.display = 'none';
        }
        
    } else {
        // 恢复阅读模式
        localStorage.removeItem('stealthMode');
        document.body.classList.remove('stealth-mode');
        stealthExitToggle.style.display = 'none';
        
        // 显示快速隐藏提示
        if (quickHideTip) {
            quickHideTip.style.display = 'block';
            // 重新设置淡出计时器
            setTimeout(() => {
                quickHideTip.style.opacity = '0';
                quickHideTip.style.pointerEvents = 'none';
            }, 6000);
        }
    }
}

// 添加退出隐蔽模式的函数（供伪装页面中的按钮调用）
function exitStealthMode() {
    if (isStealthMode) {
        activateStealthMode();
    }
}
    
    quickHideTip.addEventListener('click', function() {
        if (!isStealthMode) {
            activateStealthMode();
        }
    });
    
    // 视觉反馈：翻页时闪烁方向与页码
    function flashPage(direction) {
        if (!readerContent) return;
        const cls = direction === 'right' ? 'page-flash-right' : 'page-flash-left';
        readerContent.classList.add(cls);
        setTimeout(() => readerContent.classList.remove(cls), 220);
    }

    function pulseIndicator() {
        if (!pageIndicator) return;
        pageIndicator.classList.add('flash');
        setTimeout(() => pageIndicator.classList.remove('flash'), 260);
    }

    function goNextPage() {
        flashPage('right');
        pulseIndicator();
        if (typeof changePage === 'function') {
            changePage(currentPosition + 1);
        } else if (nextPageBtn && !nextPageBtn.disabled) {
            nextPageBtn.click();
        }
    }

    function goPrevPage() {
        flashPage('left');
        pulseIndicator();
        if (typeof changePage === 'function') {
            changePage(Math.max(currentPosition - 1, 0));
        } else if (prevPageBtn && !prevPageBtn.disabled) {
            prevPageBtn.click();
        }
    }

    // 全局快捷键
    document.addEventListener('keydown', function(e) {
        // 在输入框、文本域或可编辑区域中不触发翻页
        const targetTag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
        const isEditable = e.target && (e.target.isContentEditable || ['input','textarea','select'].includes(targetTag));
        // 方向键与PageUp/PageDown进行节流
        const navigationalKey = ['ArrowLeft','ArrowRight','PageUp','PageDown'].includes(e.key);
        if (navigationalKey) {
            const now = Date.now();
            if (now - lastPageKeyTime < PAGE_KEY_THROTTLE_MS) return;
            lastPageKeyTime = now;
        }
        // ESC键 - 快速隐藏
        if (e.key === 'Escape') {
            activateStealthMode();
            e.preventDefault();
        }
        
        // Tab键 - 便携模式切换
        if (e.key === 'Tab') {
            togglePortableMode();
            e.preventDefault();
        }
        
        // 全局翻页快捷键：方向键与 PageUp / PageDown
        if (!isEditable) {
            if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                goNextPage();
                e.preventDefault();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                goPrevPage();
                e.preventDefault();
            }
        }
        
        // Ctrl+P - 便携模式
        if (e.ctrlKey && e.key === 'p') {
            portableToggle.click();
            e.preventDefault();
        }
        
        // Ctrl+W - 工作模式
        if (e.ctrlKey && e.key === 'w') {
            workModeBtn.click();
            e.preventDefault();
        }
        
        // Ctrl+T - 主题切换
        if (e.ctrlKey && e.key === 't') {
            themeToggleReaderBtn.click();
            e.preventDefault();
        }
    });
    
    // 隐蔽模式功能 - 紧急隐藏
    if (stealthModeBtn) {
        // 显示提示
        if (emergencyTip) {
            setTimeout(() => {
                emergencyTip.classList.add('show');
                setTimeout(() => {
                    emergencyTip.classList.remove('show');
                }, 5000);
            }, 2000);
        }
        
        // 点击隐藏按钮激活隐蔽模式
        stealthModeBtn.addEventListener('click', function() {
            activateStealthMode();
        });
        // ESC键处理已在全局快捷键中实现，此处不再重复添加事件监听器
    }
    
    // 激活隐蔽模式函数
    function activateStealthMode() {
        isStealthMode = !isStealthMode;
        
        if (isStealthMode) {
            // 保存当前页面状态
            localStorage.setItem('stealthMode', 'true');
            
            // 隐藏阅读内容，显示伪装内容
            document.body.classList.add('stealth-mode');
            stealthExitToggle.style.display = 'flex';
            
            // 创建或显示伪装内容（优先使用模板中存在的元素）
            let stealthContent = document.querySelector('.stealth-content');
            if (!stealthContent) {
                stealthContent = document.createElement('div');
                stealthContent.className = 'stealth-content';
                stealthContent.innerHTML = `
                    <div class="reader-container">
                        <div class="article-header">
                            <h1 class="article-title">JavaScript高级编程技巧与最佳实践</h1>
                            <div class="article-info">
                                <span><i class="fas fa-user"></i> CSDN官方</span>
                                <span><i class="fas fa-calendar-alt"></i> ${new Date().toLocaleDateString()}</span>
                                <span><i class="fas fa-eye"></i> 1024次阅读</span>
                            </div>
                            <div class="article-tags">
                                <span class="tag">JavaScript</span>
                                <span class="tag">前端开发</span>
                                <span class="tag">编程技巧</span>
                            </div>
                        </div>
                        <div class="article-content">
                            <p>在现代Web开发中，JavaScript已经成为不可或缺的编程语言。本文将探讨JavaScript的高级编程技巧与最佳实践，帮助开发者编写更高效、更可维护的代码。</p>
                            
                            <h2>1. 使用现代ES6+特性</h2>
                            <p>ES6及更高版本引入了许多强大的特性，如箭头函数、解构赋值、模板字符串等，这些特性可以使代码更简洁、更易读。</p>
                            <pre><code>// 箭头函数
const sum = (a, b) =&gt; a + b;

// 解构赋值
const person = { name: 'CSDN', age: 20 };
const { name, age } = person;

// 模板字符串
const greeting = \`Hello, \${name}!\`;</code></pre>
                            
                            <h2>2. 异步编程最佳实践</h2>
                            <p>使用Promise和async/await处理异步操作，避免回调地狱，使代码更清晰。</p>
                            <pre><code>// 使用async/await
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}</code></pre>
                        </div>
                    </div>
                `;
                document.body.appendChild(stealthContent);
            } else {
                stealthContent.style.display = 'block';
            }
            
            // 通过CSS类淡出主内容区域，避免闪断
            // 由 .stealth-mode .content-layout 控制视觉隐藏
            
        } else {
            // 恢复阅读模式
            localStorage.removeItem('stealthMode');
            document.body.classList.remove('stealth-mode');
            stealthExitToggle.style.display = 'none';
            
            // 隐藏伪装内容
            const stealthContent = document.querySelector('.stealth-content');
            if (stealthContent) {
                stealthContent.style.display = 'none';
            }
            
            // 主内容区由CSS类恢复，无需直接修改display
        }
    }
    
    // 点击退出隐蔽模式
    stealthExitToggle.addEventListener('click', function() {
        if (isStealthMode) {
            activateStealthMode();
        }
    });
    
    // 页面加载时检查是否处于隐蔽模式
    const savedStealthMode = localStorage.getItem('stealthMode');
    if (savedStealthMode === 'true') {
        // 延迟一点激活隐蔽模式，确保页面元素都已加载
        setTimeout(() => {
            activateStealthMode();
        }, 100);
    }
    
    // 添加书签功能
    if (bookmarkBtn && bookId) {
        bookmarkBtn.addEventListener('click', function() {
            const title = prompt('请输入书签标题:');
            if (title) {
                const formData = new FormData();
                formData.append('book_id', bookId);
                formData.append('position', currentPosition);
                formData.append('title', title);
                
                fetch('/add_bookmark', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('书签添加成功!');
                        // 刷新书签列表
                        loadBookmarks();
                    } else {
                        alert('添加书签失败: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('添加书签时出错');
                });
            }
        });
    }
    
    // 加载书签
    function loadBookmarks() {
        if (!bookId) return;
        
        fetch(`/bookmarks/${bookId}`)
        .then(response => response.json())
        .then(bookmarks => {
            const bookmarkList = document.getElementById('bookmark-list');
            if (!bookmarkList) return;
            
            bookmarkList.innerHTML = '';
            
            if (bookmarks.length === 0) {
                bookmarkList.innerHTML = '<li class="bookmark-item">没有书签</li>';
                return;
            }
            
            bookmarks.forEach(bookmark => {
                const li = document.createElement('li');
                li.className = 'bookmark-item';
                li.innerHTML = `
                    <div class="bookmark-title">${bookmark.title}</div>
                    <div class="bookmark-position">位置: ${bookmark.position + 1}</div>
                `;
                li.addEventListener('click', function() {
                    // 跳转到书签位置
                    window.location.href = `/read/${bookId}?position=${bookmark.position}`;
                });
                bookmarkList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    
    // 初始加载书签
    loadBookmarks();
    
    // 保存阅读进度
    function saveProgress() {
        if (!bookId) return;
        
        const formData = new FormData();
        formData.append('book_id', bookId);
        formData.append('position', currentPosition);
        
        fetch('/save_progress', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log('Progress saved:', data);
        })
        .catch(error => {
            console.error('Error saving progress:', error);
        });
    }
    
    // 每30秒保存一次阅读进度
    setInterval(saveProgress, 30000);
    
    // 页面关闭前保存进度
    window.addEventListener('beforeunload', saveProgress);
    
    // 翻页功能
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            const position = parseInt(this.getAttribute('data-position'));
            if (!isNaN(position)) {
                changePage(position);
            } else {
                console.error('无效的页面位置');
            }
        });
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            const position = parseInt(this.getAttribute('data-position'));
            if (!isNaN(position)) {
                changePage(position);
            } else {
                console.error('无效的页面位置');
            }
        });
    }
    
    // 页面切换函数
    function changePage(position) {
        if (!bookId) return;
        
        fetch(`/read/${bookId}/${position}`, {
            method: 'GET',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('网络响应错误');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 更新内容
                if (readerContent) {
                    readerContent.innerHTML = data.content;
                }
                
                // 更新当前位置
                currentPosition = data.position;
                
                // 更新页码指示器
                if (pageIndicator) {
                    pageIndicator.textContent = `${data.position + 1} / ${data.total_positions}`;
                }
                
                // 更新按钮状态和位置
                if (prevPageBtn) {
                    if (data.position > 0) {
                        prevPageBtn.disabled = false;
                        prevPageBtn.setAttribute('data-position', data.position - 1);
                    } else {
                        prevPageBtn.disabled = true;
                    }
                }
                
                if (nextPageBtn) {
                    if (data.position < data.total_positions - 1) {
                        nextPageBtn.disabled = false;
                        nextPageBtn.setAttribute('data-position', data.position + 1);
                    } else {
                        nextPageBtn.disabled = true;
                    }
                }
                
                // 保存阅读进度
                saveProgress();
                
                // 更新URL，但不刷新页面
                window.history.pushState({}, '', `/read/${bookId}/${data.position}`);
            } else if (data.error) {
                console.error('加载页面时出错:', data.error);
                alert('加载页面时出错: ' + data.error);
            } else {
                console.error('加载页面失败');
                alert('加载页面失败: ' + (data.message || '未知错误'));
            }
        })
        .catch(error => {
            console.error('翻页请求失败:', error);
            alert('翻页请求失败，请稍后再试');
        });
    }
    
    // 便携模式功能
    if (portableModeBtn) {
        portableModeBtn.addEventListener('click', function() {
            togglePortableMode();
        });
    }
    
    // 切换便携模式函数
    function togglePortableMode() {
        isPortableMode = !isPortableMode;
        
        if (isPortableMode) {
            // 激活便携模式，仅显示正文并简化界面
            if (contentLayout) contentLayout.classList.add('portable-mode');
            if (portableModeBtn) portableModeBtn.classList.add('active');
            localStorage.setItem('portableMode', 'true');
        } else {
            // 退出便携模式，恢复完整界面
            if (contentLayout) contentLayout.classList.remove('portable-mode');
            if (portableModeBtn) portableModeBtn.classList.remove('active');
            localStorage.setItem('portableMode', 'false');
        }
    }
    
    // 初始化文字行数组
    function initializeTextLines() {
        const content = readerContent.textContent || readerContent.innerText;
        // 按句号、问号、感叹号分割文本，保留标点符号
        textLines = content.split(/(?<=[。！？])\s*/).filter(line => line.trim().length > 0);
        currentLineIndex = 0;
    }
    
    // 显示当前行
    function displayCurrentLine() {
        if (textLines.length > 0 && currentLineIndex >= 0 && currentLineIndex < textLines.length) {
            readerContent.textContent = textLines[currentLineIndex];
        }
    }
    
    // 恢复原始内容
    function restoreOriginalContent() {
        // 重新加载页面内容或恢复原始HTML
        location.reload();
    }
    
    // 下一行
    function nextLine() {
        if (currentLineIndex < textLines.length - 1) {
            currentLineIndex++;
            displayCurrentLine();
        }
    }
    
    // 上一行
    function prevLine() {
        if (currentLineIndex > 0) {
            currentLineIndex--;
            displayCurrentLine();
        }
    }
    
    // 隐蔽模式快捷键 (Ctrl+H)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'h') {
            e.preventDefault();
            activateStealthMode();
        }
    });
    
    // 主题切换
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            
            // 更新图标
            const icon = themeToggle.querySelector('i') || themeToggle;
            if (newTheme === 'dark') {
                icon.textContent = '☀️';
                themeToggle.setAttribute('title', '切换到浅色模式');
            } else {
                icon.textContent = '🌙';
                themeToggle.setAttribute('title', '切换到深色模式');
            }
            
            // 发送到服务器
            const formData = new FormData();
            formData.append('theme', newTheme);
            
            fetch('/toggle_theme', {
                method: 'POST',
                body: formData
            });
        });
        
        // 初始化主题图标
        const savedTheme = localStorage.getItem('theme') || 'light';
        const icon = themeToggle.querySelector('i') || themeToggle;
        if (savedTheme === 'dark') {
            icon.textContent = '☀️';
            themeToggle.setAttribute('title', '切换到浅色模式');
        } else {
            icon.textContent = '🌙';
            themeToggle.setAttribute('title', '切换到深色模式');
        }
    }
    
    // 初始化主题
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
});
    // 自动淡出提示，避免干扰阅读
    setTimeout(() => {
        quickHideTip.style.opacity = '0';
        quickHideTip.style.pointerEvents = 'none';
    }, 6000);

