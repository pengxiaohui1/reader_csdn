from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
import os
import datetime
from dotenv import load_dotenv
from models import db, User, Book, Bookmark, ReadingProgress
from book_handlers import get_book_content, get_book_toc, get_book_toc_positions, get_supported_formats
import json
import random
from werkzeug.utils import secure_filename

# 加载环境变量
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_key_for_reader')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI', 'sqlite:///reader.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB 文件上传限制

# 确保上传目录存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# 初始化数据库
db.init_app(app)

# 初始化登录管理器
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# 路由：首页
@app.route('/')
def index():
    return render_template('index.html')

# 路由：登录页面
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('library'))
        else:
            flash('用户名或密码错误')
    
    return render_template('login.html')

# 路由：注册页面
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if User.query.filter_by(username=username).first():
            flash('用户名已存在')
            return render_template('register.html')
        
        new_user = User(username=username)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        flash('注册成功，请登录')
        return redirect(url_for('login'))
    
    return render_template('register.html')

# 路由：退出登录
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# 路由：图书库
@app.route('/library')
@login_required
def library():
    books = Book.query.filter_by(user_id=current_user.id).all()
    return render_template('library.html', books=books)

# 路由：上传书籍
@app.route('/upload', methods=['GET', 'POST'])
@login_required
def upload_book():
    if request.method == 'POST':
        if 'book' not in request.files:
            flash('没有文件')
            return redirect(request.url)
        
        file = request.files['book']
        if file.filename == '':
            flash('没有选择文件')
            return redirect(request.url)
        
        # 检查文件格式
        supported_formats = get_supported_formats()
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        if file_ext not in supported_formats:
            flash(f'不支持的文件格式，支持的格式有: {", ".join(supported_formats)}')
            return redirect(request.url)
        
        # 保存文件
        filename = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filename)
        
        # 添加到数据库
        new_book = Book(
            title=os.path.splitext(file.filename)[0],
            file_path=filename,
            file_format=file_ext,
            user_id=current_user.id
        )
        db.session.add(new_book)
        db.session.commit()
        
        flash('书籍上传成功')
        return redirect(url_for('library'))
    
    return render_template('upload.html')

# 路由：阅读书籍
@app.route('/read/<int:book_id>')
@app.route('/read/<int:book_id>/<int:position>')
@login_required
def read_book(book_id, position=None):
    book = Book.query.get_or_404(book_id)
    
    # 检查权限
    if book.user_id != current_user.id:
        flash('没有权限访问此书籍')
        return redirect(url_for('library'))
    
    # 获取阅读进度
    progress = ReadingProgress.query.filter_by(
        user_id=current_user.id, book_id=book_id
    ).first()
    
    # 如果没有指定位置，使用保存的进度
    if position is None:
        position = 0
        if progress:
            position = progress.position
    
    # 获取书籍内容
    content = get_book_content(book.file_path, book.file_format, position)
    toc = get_book_toc(book.file_path, book.file_format)
    toc_positions = get_book_toc_positions(book.file_path, book.file_format)
    
    # 处理AJAX请求
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        try:
            return jsonify({
                'success': True,
                'content': content['content'] if isinstance(content, dict) else content,
                'position': content['position'] if isinstance(content, dict) and 'position' in content else position,
                'total_positions': content['total_positions'] if isinstance(content, dict) and 'total_positions' in content else 1
            })
        except Exception as e:
            app.logger.error(f"AJAX处理错误: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    # 确保content是字典类型并提取必要的变量
    if isinstance(content, dict):
        if 'error' in content:
            flash(content['error'])
            return redirect(url_for('library'))
        
        content_html = content.get('content', '')
        current_position = content.get('position', position)
        total_positions = content.get('total_positions', 1)
    else:
        content_html = content
        current_position = position
        total_positions = 1
    
    return render_template('reader.html', 
                          book=book, 
                          content=content_html, 
                          toc=toc, 
                          toc_positions=toc_positions,
                          position=current_position,
                          total_positions=total_positions,
                          now=datetime.datetime.now())

# 路由：保存阅读进度
@app.route('/save_progress', methods=['POST'])
@login_required
def save_progress():
    book_id = request.form.get('book_id', type=int)
    position = request.form.get('position', type=int)
    
    if not book_id or position is None:
        return jsonify({'success': False, 'message': '参数错误'})
    
    # 检查书籍是否存在且属于当前用户
    book = Book.query.get_or_404(book_id)
    if book.user_id != current_user.id:
        return jsonify({'success': False, 'message': '没有权限'})
    
    # 更新或创建阅读进度
    progress = ReadingProgress.query.filter_by(
        user_id=current_user.id, book_id=book_id
    ).first()
    
    if progress:
        progress.position = position
    else:
        progress = ReadingProgress(
            user_id=current_user.id,
            book_id=book_id,
            position=position
        )
        db.session.add(progress)
    
    db.session.commit()
    return jsonify({'success': True})

# 路由：添加书签
@app.route('/add_bookmark', methods=['POST'])
@login_required
def add_bookmark():
    book_id = request.form.get('book_id', type=int)
    position = request.form.get('position', type=int)
    title = request.form.get('title', '')
    
    if not book_id or position is None:
        return jsonify({'success': False, 'message': '参数错误'})
    
    # 检查书籍是否存在且属于当前用户
    book = Book.query.get_or_404(book_id)
    if book.user_id != current_user.id:
        return jsonify({'success': False, 'message': '没有权限'})
    
    # 创建书签
    bookmark = Bookmark(
        user_id=current_user.id,
        book_id=book_id,
        position=position,
        title=title
    )
    db.session.add(bookmark)
    db.session.commit()
    
    return jsonify({'success': True, 'id': bookmark.id})

# 路由：获取书签
@app.route('/bookmarks/<int:book_id>')
@login_required
def get_bookmarks(book_id):
    bookmarks = Bookmark.query.filter_by(
        user_id=current_user.id, book_id=book_id
    ).all()
    
    result = []
    for bookmark in bookmarks:
        result.append({
            'id': bookmark.id,
            'title': bookmark.title,
            'position': bookmark.position,
            'created_at': bookmark.created_at.strftime('%Y-%m-%d %H:%M:%S')
        })
    
    return jsonify(result)

# 路由：删除书签
@app.route('/delete_bookmark/<int:bookmark_id>', methods=['POST'])
@login_required
def delete_bookmark(bookmark_id):
    bookmark = Bookmark.query.get_or_404(bookmark_id)
    
    # 检查权限
    if bookmark.user_id != current_user.id:
        return jsonify({'success': False, 'message': '没有权限'})
    
    db.session.delete(bookmark)
    db.session.commit()
    
    return jsonify({'success': True})

# 路由：切换主题
@app.route('/toggle_theme', methods=['POST'])
def toggle_theme():
    theme = request.form.get('theme')
    if theme in ['light', 'dark']:
        session['theme'] = theme
        return jsonify({'success': True})
    return jsonify({'success': False})

@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html')

# 获取阅读统计
@app.route('/reading_stats')
@login_required
def reading_stats():
    # 计算总阅读时间、阅读书籍数量等
    total_books = Book.query.filter_by(user_id=current_user.id).count()
    total_progress = ReadingProgress.query.filter_by(user_id=current_user.id).count()
    
    return jsonify({
        'total_books': total_books,
        'reading_sessions': total_progress,
        'total_time': '15h 30m'  # 这里可以实际计算
    })

# 删除书籍
@app.route('/delete_book/<int:book_id>', methods=['POST'])
@login_required
def delete_book(book_id):
    book = Book.query.get_or_404(book_id)
    
    if book.user_id != current_user.id:
        return jsonify({'success': False, 'message': '没有权限'})
    
    # 删除相关的书签和进度
    Bookmark.query.filter_by(book_id=book_id).delete()
    ReadingProgress.query.filter_by(book_id=book_id).delete()
    
    # 删除文件
    try:
        if os.path.exists(book.file_path):
            os.remove(book.file_path)
    except:
        pass
    
    db.session.delete(book)
    db.session.commit()
    
    return jsonify({'success': True})

# 创建数据库表
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(debug=True)