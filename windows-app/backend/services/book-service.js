const fs = require('fs').promises;
const path = require('path');
const { parse } = require('node-html-parser');
const JSZip = require('jszip');
const iconv = require('iconv-lite');
const crypto = require('crypto-js');

class BookService {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.booksPath = path.join(dataPath, 'books');
    this.cachePath = path.join(dataPath, 'cache');
    this.books = new Map();
    this.loadBooks();
  }

  async loadBooks() {
    try {
      const booksFile = path.join(this.dataPath, 'books.json');
      const data = await fs.readFile(booksFile, 'utf-8');
      const books = JSON.parse(data);
      books.forEach(book => this.books.set(book.bookUrl, book));
    } catch (error) {
      console.log('No existing books file, starting fresh');
    }
  }

  async saveBooks() {
    try {
      const booksFile = path.join(this.dataPath, 'books.json');
      const books = Array.from(this.books.values());
      await fs.writeFile(booksFile, JSON.stringify(books, null, 2));
    } catch (error) {
      console.error('Error saving books:', error);
    }
  }

  async getAllBooks() {
    return Array.from(this.books.values());
  }

  async saveBook(book) {
    // Generate unique ID if not present
    if (!book.bookUrl) {
      book.bookUrl = this.generateBookId(book.name, book.author);
    }
    
    // Set default values
    book.lastCheckTime = Date.now();
    book.lastCheckCount = 0;
    book.totalChapterNum = book.totalChapterNum || 0;
    book.durChapterIndex = book.durChapterIndex || 0;
    book.durChapterPos = book.durChapterPos || 0;
    book.readConfig = book.readConfig || {};
    
    this.books.set(book.bookUrl, book);
    await this.saveBooks();
    return book;
  }

  async deleteBook(bookUrl) {
    if (this.books.has(bookUrl)) {
      this.books.delete(bookUrl);
      await this.saveBooks();
      
      // Also delete cached content
      try {
        const bookCachePath = path.join(this.cachePath, this.sanitizeFilename(bookUrl));
        await fs.rmdir(bookCachePath, { recursive: true });
      } catch (error) {
        console.log('No cache to delete for book:', bookUrl);
      }
    }
  }

  async importLocalBook(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath, ext);
    
    let book;
    switch (ext) {
      case '.epub':
        book = await this.parseEpubBook(filePath);
        break;
      case '.txt':
        book = await this.parseTxtBook(filePath);
        break;
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
    
    // Copy file to books directory
    const targetPath = path.join(this.booksPath, `${book.bookUrl}${ext}`);
    await fs.copyFile(filePath, targetPath);
    book.localPath = targetPath;
    
    return await this.saveBook(book);
  }

  async parseEpubBook(filePath) {
    const data = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(data);
    
    // Parse container.xml to find OPF file
    const container = await zip.file('META-INF/container.xml').async('text');
    const containerDoc = parse(container);
    const opfPath = containerDoc.querySelector('rootfile').getAttribute('full-path');
    
    // Parse OPF file
    const opfContent = await zip.file(opfPath).async('text');
    const opfDoc = parse(opfContent);
    
    // Extract metadata
    const title = this.getTextContent(opfDoc.querySelector('metadata title'));
    const author = this.getTextContent(opfDoc.querySelector('metadata creator'));
    const description = this.getTextContent(opfDoc.querySelector('metadata description'));
    
    // Extract chapter information
    const spine = opfDoc.querySelectorAll('spine itemref');
    const manifest = opfDoc.querySelectorAll('manifest item');
    
    const manifestMap = new Map();
    manifest.forEach(item => {
      manifestMap.set(item.getAttribute('id'), {
        href: item.getAttribute('href'),
        mediaType: item.getAttribute('media-type')
      });
    });
    
    const chapters = [];
    for (let i = 0; i < spine.length; i++) {
      const itemref = spine[i];
      const idref = itemref.getAttribute('idref');
      const manifestItem = manifestMap.get(idref);
      
      if (manifestItem && manifestItem.mediaType === 'application/xhtml+xml') {
        const chapterPath = path.join(path.dirname(opfPath), manifestItem.href);
        const chapterContent = await zip.file(chapterPath).async('text');
        const chapterDoc = parse(chapterContent);
        
        const chapterTitle = this.getTextContent(chapterDoc.querySelector('title')) || 
                           this.getTextContent(chapterDoc.querySelector('h1')) || 
                           `Chapter ${i + 1}`;
        
        chapters.push({
          index: i,
          title: chapterTitle,
          url: chapterPath,
          content: chapterContent
        });
      }
    }
    
    const book = {
      name: title || path.basename(filePath, '.epub'),
      author: author || 'Unknown',
      intro: description || '',
      kind: 'epub',
      bookUrl: this.generateBookId(title, author),
      tocUrl: '',
      originName: path.basename(filePath),
      type: 0, // Local book
      totalChapterNum: chapters.length,
      chapters: chapters,
      wordCount: this.calculateWordCount(chapters)
    };
    
    return book;
  }

  async parseTxtBook(filePath) {
    const data = await fs.readFile(filePath);
    
    // Try to detect encoding
    let content;
    if (this.isUtf8(data)) {
      content = data.toString('utf-8');
    } else {
      // Try GBK encoding for Chinese texts
      content = iconv.decode(data, 'gbk');
    }
    
    const fileName = path.basename(filePath, '.txt');
    
    // Split into chapters using common patterns
    const chapterRegex = /^(第[一二三四五六七八九十\d]+[章节回部]|Chapter\s*\d+|\d+\.|序章|楔子|前言|后记)/gmi;
    const lines = content.split('\n');
    const chapters = [];
    let currentChapter = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (chapterRegex.test(line)) {
        // Save previous chapter
        if (currentChapter) {
          chapters.push(currentChapter);
        }
        
        // Start new chapter
        currentChapter = {
          index: chapters.length,
          title: line,
          url: `chapter-${chapters.length}`,
          content: ''
        };
      } else if (currentChapter && line) {
        currentChapter.content += line + '\n';
      } else if (!currentChapter && line) {
        // Content before first chapter
        if (chapters.length === 0) {
          currentChapter = {
            index: 0,
            title: '开始',
            url: 'chapter-0',
            content: ''
          };
        }
        if (currentChapter) {
          currentChapter.content += line + '\n';
        }
      }
    }
    
    // Add last chapter
    if (currentChapter) {
      chapters.push(currentChapter);
    }
    
    // If no chapters found, treat entire file as one chapter
    if (chapters.length === 0) {
      chapters.push({
        index: 0,
        title: fileName,
        url: 'chapter-0',
        content: content
      });
    }
    
    const book = {
      name: fileName,
      author: 'Unknown',
      intro: '',
      kind: 'txt',
      bookUrl: this.generateBookId(fileName, 'Unknown'),
      tocUrl: '',
      originName: path.basename(filePath),
      type: 0, // Local book
      totalChapterNum: chapters.length,
      chapters: chapters,
      wordCount: content.length
    };
    
    return book;
  }

  async getBookInfo(bookUrl, sourceUrl) {
    const book = this.books.get(bookUrl);
    if (!book) {
      throw new Error('Book not found');
    }
    return book;
  }

  async getChapterList(bookUrl, sourceUrl) {
    const book = this.books.get(bookUrl);
    if (!book) {
      throw new Error('Book not found');
    }
    
    if (book.chapters) {
      return book.chapters.map(chapter => ({
        index: chapter.index,
        title: chapter.title,
        url: chapter.url,
        bookUrl: bookUrl
      }));
    }
    
    return [];
  }

  async getBookContent(chapterUrl, bookUrl) {
    const book = this.books.get(bookUrl);
    if (!book) {
      throw new Error('Book not found');
    }
    
    const chapter = book.chapters?.find(ch => ch.url === chapterUrl);
    if (!chapter) {
      throw new Error('Chapter not found');
    }
    
    return chapter.content || '';
  }

  async search(keyword, source) {
    // For local books, search in book names and content
    const results = [];
    const searchLower = keyword.toLowerCase();
    
    for (const book of this.books.values()) {
      if (book.name.toLowerCase().includes(searchLower) ||
          book.author.toLowerCase().includes(searchLower) ||
          book.intro.toLowerCase().includes(searchLower)) {
        results.push({
          name: book.name,
          author: book.author,
          kind: book.kind,
          intro: book.intro,
          bookUrl: book.bookUrl,
          coverUrl: book.coverUrl || '',
          wordCount: book.wordCount || 0
        });
      }
    }
    
    return results;
  }

  // Helper methods
  generateBookId(name, author) {
    const input = `${name}-${author}-${Date.now()}`;
    return crypto.MD5(input).toString();
  }

  sanitizeFilename(filename) {
    return filename.replace(/[<>:"/\\|?*]/g, '_');
  }

  getTextContent(element) {
    return element ? element.text.trim() : '';
  }

  isUtf8(buffer) {
    try {
      const str = buffer.toString('utf-8');
      return Buffer.from(str, 'utf-8').equals(buffer);
    } catch (e) {
      return false;
    }
  }

  calculateWordCount(chapters) {
    return chapters.reduce((total, chapter) => {
      return total + (chapter.content ? chapter.content.length : 0);
    }, 0);
  }
}

module.exports = BookService;