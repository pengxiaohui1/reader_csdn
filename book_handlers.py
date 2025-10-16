import os
import ebooklib
from ebooklib import epub
import os
from PyPDF2 import PdfFileReader
import re
from bs4 import BeautifulSoup

def get_supported_formats():
    """返回支持的电子书格式列表"""
    return ['.epub', '.pdf', '.txt']

def get_book_content(file_path, file_format, position=0):
    """根据文件格式获取书籍内容"""
    if not os.path.exists(file_path):
        return {"error": "文件不存在"}
    
    file_format = file_format.lower()
    
    try:
        if file_format == '.epub':
            return get_epub_content(file_path, position)
        elif file_format == '.pdf':
            return get_pdf_content(file_path, position)
        elif file_format == '.txt':
            return get_txt_content(file_path, position)
        else:
            return {"error": "不支持的文件格式"}
    except Exception as e:
        return {"error": f"读取文件出错: {str(e)}"}

def get_book_toc(file_path, file_format):
    """获取书籍目录"""
    if not os.path.exists(file_path):
        return []
    
    file_format = file_format.lower()
    
    try:
        if file_format == '.epub':
            return get_epub_toc(file_path)
        elif file_format == '.pdf':
            return get_pdf_toc(file_path)
        elif file_format == '.txt':
            return []  # TXT文件没有目录结构
        else:
            return []
    except Exception as e:
        print(f"获取目录出错: {str(e)}")
        return []

def get_book_toc_positions(file_path, file_format):
    """将目录项映射到内容位置（position），用于侧边栏跳转"""
    file_format = file_format.lower()
    try:
        if file_format == '.epub':
            return _get_epub_toc_positions(file_path)
        elif file_format == '.pdf':
            toc = get_pdf_toc(file_path)
            positions = []
            for item in toc:
                # PDF页码通常从1开始，这里转为0基索引
                page = int(item.get('page', 1))
                position = max(0, page - 1)
                positions.append({
                    'title': item.get('title', f'Page {page}') ,
                    'position': position
                })
            return positions
        elif file_format == '.txt':
            # TXT没有目录，返回空列表
            return []
        else:
            return []
    except Exception as e:
        print(f"生成目录位置映射出错: {str(e)}")
        return []

def get_epub_content(file_path, position=0):
    """获取EPUB格式电子书内容"""
    book = epub.read_epub(file_path)
    
    # 获取所有文档
    documents = []
    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            documents.append(item)
    
    # 按照position获取当前文档
    if position >= len(documents):
        position = 0
    
    current_doc = documents[position]
    content = current_doc.get_content().decode('utf-8')
    
    # 使用BeautifulSoup解析HTML
    soup = BeautifulSoup(content, 'html.parser')
    
    # 提取文本内容
    text_content = soup.get_text()
    
    # 清理文本
    text_content = re.sub(r'\n+', '\n', text_content)
    
    return {
        "content": text_content,
        "position": position,
        "total_positions": len(documents),
        "title": current_doc.get_name()
    }

def get_epub_toc(file_path):
    """获取EPUB格式电子书目录"""
    book = epub.read_epub(file_path)
    toc = []
    
    # 获取目录
    for item in book.toc:
        try:
            if isinstance(item, tuple) and len(item) == 2:
                section, children = item
                if hasattr(section, 'title') and hasattr(section, 'href'):
                    toc_item = {
                        "title": section.title,
                        "href": section.href,
                        "children": []
                    }
                    
                    # 处理子目录
                    for child in children:
                        if hasattr(child, 'title') and hasattr(child, 'href'):
                            toc_item["children"].append({
                                "title": child.title,
                                "href": child.href
                            })
                    
                    toc.append(toc_item)
            elif hasattr(item, 'title') and hasattr(item, 'href'):
                toc.append({
                    "title": item.title,
                    "href": item.href
                })
        except Exception as e:
            print(f"处理目录项时出错: {str(e)}")
            continue
    
    return toc

def _get_epub_toc_positions(file_path):
    """为EPUB生成平铺的目录 -> position 映射"""
    book = epub.read_epub(file_path)
    # 构建文档文件名列表（按阅读顺序）
    doc_items = []
    for item in book.get_items():
        try:
            if item.get_type() == epub.ITEM_DOCUMENT:
                # 尝试获取更稳定的文件名/路径
                name = getattr(item, 'file_name', None)
                if not name:
                    # 有些版本使用get_name作为文件名
                    name = item.get_name()
                doc_items.append(str(name))
        except Exception:
            continue

    # 获取原始目录
    raw_toc = get_epub_toc(file_path)

    def match_position_by_href(href: str) -> int:
        # 仅取文件名进行匹配
        base = os.path.basename(href or '')
        if not base:
            return 0
        # 直接匹配或后缀匹配
        for idx, dn in enumerate(doc_items):
            dn_base = os.path.basename(dn)
            if dn_base == base or dn.endswith(base) or base in dn_base:
                return idx
        # 未匹配时回退到0
        return 0

    positions = []
    for item in raw_toc:
        try:
            if 'href' in item and 'title' in item:
                positions.append({
                    'title': item['title'],
                    'position': match_position_by_href(item['href'])
                })
            # 展平子目录
            for child in item.get('children', []) or []:
                if 'href' in child and 'title' in child:
                    positions.append({
                        'title': child['title'],
                        'position': match_position_by_href(child['href'])
                    })
        except Exception:
            continue
    return positions

def get_pdf_content(file_path, position=0):
    """获取PDF格式电子书内容"""
    with open(file_path, 'rb') as f:
        pdf = PdfFileReader(f)
        num_pages = pdf.getNumPages()
        
        if position >= num_pages:
            position = 0
        
        page = pdf.getPage(position)
        text = page.extractText()
        
        return {
            "content": text,
            "position": position,
            "total_positions": num_pages,
            "title": f"Page {position + 1}"
        }

def get_pdf_toc(file_path):
    """获取PDF格式电子书目录"""
    with open(file_path, 'rb') as f:
        pdf = PdfFileReader(f)
        toc = []
        
        # 尝试获取PDF的目录
        if pdf.getOutlines():
            for outline in pdf.getOutlines():
                if isinstance(outline, dict) and '/Title' in outline:
                    toc.append({
                        "title": outline['/Title'],
                        "page": outline['/Page'] if '/Page' in outline else 0
                    })
        
        return toc

def get_txt_content(file_path, position=0):
    """获取TXT格式电子书内容"""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        # 每页显示的行数
        lines_per_page = 50
        
        # 读取所有行
        all_lines = f.readlines()
        total_pages = (len(all_lines) + lines_per_page - 1) // lines_per_page
        
        if position >= total_pages:
            position = 0
        
        # 获取当前页的内容
        start_line = position * lines_per_page
        end_line = min(start_line + lines_per_page, len(all_lines))
        content = ''.join(all_lines[start_line:end_line])
        
        return {
            "content": content,
            "position": position,
            "total_positions": total_pages,
            "title": f"Page {position + 1}"
        }