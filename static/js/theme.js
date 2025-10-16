// 主题切换功能
document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            // 更新HTML属性
            document.documentElement.setAttribute('data-theme', newTheme);
            
            // 保存到本地存储
            localStorage.setItem('theme', newTheme);
            
            // 更新图标
            const themeIcon = themeToggle.querySelector('i');
            if (themeIcon) {
                themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }

            // 更新可访问属性与提示
            const isDark = newTheme === 'dark';
            themeToggle.setAttribute('aria-pressed', isDark ? 'true' : 'false');
            themeToggle.setAttribute('title', isDark ? '切换为浅色模式' : '切换为深色模式');
            
            // 发送到服务器
            const formData = new FormData();
            formData.append('theme', newTheme);
            
            fetch('/toggle_theme', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                console.log('Theme preference saved:', data);
            })
            .catch(error => {
                console.error('Error saving theme preference:', error);
            });
        });
    }
    
    // 初始化主题
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // 更新图标
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        // 初始化可访问属性与提示
        const themeToggleInit = document.getElementById('theme-toggle');
        if (themeToggleInit) {
            const isDarkInit = savedTheme === 'dark';
            themeToggleInit.setAttribute('aria-pressed', isDarkInit ? 'true' : 'false');
            themeToggleInit.setAttribute('title', isDarkInit ? '切换为浅色模式' : '切换为深色模式');
        }
    }
});