// PDF阅读页面背景色切换功能
document.addEventListener('DOMContentLoaded', function() {
    const themeTogglePdf = document.getElementById('theme-toggle-pdf');
    const themes = ['default', 'cream', 'green', 'dark'];
    let currentThemeIndex = 0;
    
    // 初始化主题
    const savedTheme = localStorage.getItem('pdf-theme');
    if (savedTheme && themes.includes(savedTheme)) {
        document.documentElement.setAttribute('data-pdf-theme', savedTheme);
        currentThemeIndex = themes.indexOf(savedTheme);
    }
    
    if (themeTogglePdf) {
        themeTogglePdf.addEventListener('click', function() {
            // 循环切换主题
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            const newTheme = themes[currentThemeIndex];
            
            // 移除默认主题的属性
            if (newTheme === 'default') {
                document.documentElement.removeAttribute('data-pdf-theme');
            } else {
                document.documentElement.setAttribute('data-pdf-theme', newTheme);
            }
            
            // 保存到本地存储
            localStorage.setItem('pdf-theme', newTheme);
            
            // 更新按钮提示
            updateThemeButtonTitle(newTheme);
        });
        
        // 初始化按钮提示
        updateThemeButtonTitle(savedTheme || 'default');
    }
    
    function updateThemeButtonTitle(theme) {
        const titles = {
            'default': '切换背景色 (当前: 默认白色)',
            'cream': '切换背景色 (当前: 浅黄色)',
            'green': '切换背景色 (当前: 护眼绿)',
            'dark': '切换背景色 (当前: 暗色)'
        };
        
        themeTogglePdf.setAttribute('title', titles[theme]);
    }
});