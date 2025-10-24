// PDF阅读页面字体大小调节功能
document.addEventListener('DOMContentLoaded', function() {
    const fontSizeDecrease = document.getElementById('font-size-decrease');
    const fontSizeIncrease = document.getElementById('font-size-increase');
    const docContent = document.getElementById('reader-content');
    
    // 默认字体大小（px）
    let currentFontSize = parseInt(localStorage.getItem('pdf-font-size')) || 16;
    
    // 初始化字体大小
    updateFontSize();
    
    // 减小字体按钮点击事件
    if (fontSizeDecrease) {
        fontSizeDecrease.addEventListener('click', function() {
            if (currentFontSize > 12) {
                currentFontSize -= 2;
                updateFontSize();
            }
        });
    }
    
    // 增大字体按钮点击事件
    if (fontSizeIncrease) {
        fontSizeIncrease.addEventListener('click', function() {
            if (currentFontSize < 24) {
                currentFontSize += 2;
                updateFontSize();
            }
        });
    }
    
    // 更新字体大小
    function updateFontSize() {
        document.documentElement.style.setProperty('--pdf-font-size', currentFontSize + 'px');
        localStorage.setItem('pdf-font-size', currentFontSize);
    }
});