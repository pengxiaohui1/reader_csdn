// 阅读模式选择功能
let currentBookId = null;
const modal = document.getElementById('readingModeModal');
const closeBtn = document.querySelector('.close-modal');
const csdnMode = document.getElementById('csdn-mode');
const pdfMode = document.getElementById('pdf-mode');

// 显示模式选择弹窗
function showReadingModeModal(bookId) {
    currentBookId = bookId;
    modal.style.display = 'block';
}

// 关闭弹窗
if (closeBtn) {
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
}

// 点击弹窗外部关闭
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// 选择CSDN模式
if (csdnMode) {
    csdnMode.onclick = function() {
        if (currentBookId) {
            window.location.href = `/read/${currentBookId}?mode=csdn`;
        }
        modal.style.display = 'none';
    }
}

// 选择PDF模式
if (pdfMode) {
    pdfMode.onclick = function() {
        if (currentBookId) {
            window.location.href = `/read/${currentBookId}?mode=pdf`;
        }
        modal.style.display = 'none';
    }
}