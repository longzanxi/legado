// Legado Windows Application Frontend
class LegadoApp {
    constructor() {
        this.apiBase = '';
        this.books = [];
        this.sources = [];
        this.config = {};
        this.currentModalCallback = null;
        
        // Initialize the app
        this.init();
    }

    async init() {
        console.log('Initializing Legado Windows App...');
        
        // Load initial data
        await this.loadBooks();
        await this.loadSources();
        await this.loadSettings();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('App initialized successfully');
    }

    setupEventListeners() {
        // Settings sliders
        const fontSize = document.getElementById('fontSize');
        const lineSpacing = document.getElementById('lineSpacing');
        const pageMargin = document.getElementById('pageMargin');
        
        fontSize.addEventListener('input', (e) => {
            document.getElementById('fontSizeValue').textContent = e.target.value + 'px';
        });
        
        lineSpacing.addEventListener('input', (e) => {
            document.getElementById('lineSpacingValue').textContent = e.target.value + 'px';
        });
        
        pageMargin.addEventListener('input', (e) => {
            document.getElementById('pageMarginValue').textContent = e.target.value + 'px';
        });

        // Close modal when clicking outside
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                this.closeModal();
            }
        });

        // Electron API listeners
        if (window.electronAPI) {
            window.electronAPI.onBooksImported((event, count) => {
                this.showToast(`成功导入 ${count} 本书籍`, 'success');
                this.loadBooks();
            });

            window.electronAPI.onSourcesImported((event, count) => {
                this.showToast(`成功导入 ${count} 个书源`, 'success');
                this.loadSources();
            });
        }
    }

    // API Methods
    async apiCall(endpoint, options = {}) {
        try {
            const url = this.apiBase + endpoint;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!data.isSuccess) {
                throw new Error(data.errorMsg || 'API call failed');
            }
            
            return data.data;
        } catch (error) {
            console.error('API call failed:', error);
            this.showToast(error.message, 'error');
            throw error;
        }
    }

    // Books Management
    async loadBooks() {
        try {
            this.showBooksLoading(true);
            this.books = await this.apiCall('/api/books');
            this.renderBooks();
        } catch (error) {
            console.error('Failed to load books:', error);
        } finally {
            this.showBooksLoading(false);
        }
    }

    renderBooks() {
        const grid = document.getElementById('book-grid');
        const empty = document.getElementById('books-empty');
        
        if (this.books.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        
        empty.style.display = 'none';
        
        grid.innerHTML = this.books.map(book => `
            <div class="book-card" onclick="app.openBook('${book.bookUrl}')">
                <div class="book-cover">📖</div>
                <div class="book-title" title="${book.name}">${book.name}</div>
                <div class="book-author" title="${book.author}">${book.author}</div>
            </div>
        `).join('');
    }

    showBooksLoading(show) {
        document.getElementById('books-loading').style.display = show ? 'block' : 'none';
    }

    async importBooks() {
        if (window.electronAPI) {
            const result = await window.electronAPI.selectBookFile();
            if (!result.canceled && result.filePaths.length > 0) {
                // Files will be processed by the main process
                this.showToast('正在导入书籍...', 'info');
            }
        } else {
            this.showToast('请使用桌面版本导入书籍', 'error');
        }
    }

    async refreshBooks() {
        await this.loadBooks();
        this.showToast('书架已刷新', 'success');
    }

    // Sources Management
    async loadSources() {
        try {
            this.showSourcesLoading(true);
            this.sources = await this.apiCall('/api/getSources');
            this.renderSources();
        } catch (error) {
            console.error('Failed to load sources:', error);
        } finally {
            this.showSourcesLoading(false);
        }
    }

    renderSources() {
        const list = document.getElementById('source-list');
        const empty = document.getElementById('sources-empty');
        
        if (this.sources.length === 0) {
            list.innerHTML = '';
            empty.style.display = 'block';
            return;
        }
        
        empty.style.display = 'none';
        
        list.innerHTML = this.sources.map(source => `
            <div class="source-item">
                <div class="source-info">
                    <div class="source-name">${source.bookSourceName}</div>
                    <div class="source-url">${source.bookSourceUrl}</div>
                </div>
                <div class="source-status">
                    <div class="status-indicator ${source.enabled ? '' : 'disabled'}"></div>
                    <button class="btn secondary" onclick="app.editSource('${source.bookSourceUrl}')">编辑</button>
                    <button class="btn secondary" onclick="app.deleteSource('${source.bookSourceUrl}')">删除</button>
                </div>
            </div>
        `).join('');
    }

    showSourcesLoading(show) {
        document.getElementById('sources-loading').style.display = show ? 'block' : 'none';
    }

    async addSource() {
        this.showModal('添加书源', `
            <div class="form-group">
                <label>书源名称</label>
                <input type="text" id="sourceName" placeholder="输入书源名称">
            </div>
            <div class="form-group">
                <label>书源URL</label>
                <input type="text" id="sourceUrl" placeholder="输入书源URL">
            </div>
            <div class="form-group">
                <label>搜索地址</label>
                <input type="text" id="searchUrl" placeholder="输入搜索地址">
            </div>
            <div class="form-group">
                <label>书源分组</label>
                <input type="text" id="sourceGroup" placeholder="输入书源分组">
            </div>
        `, async () => {
            const name = document.getElementById('sourceName').value;
            const url = document.getElementById('sourceUrl').value;
            const searchUrl = document.getElementById('searchUrl').value;
            const group = document.getElementById('sourceGroup').value;
            
            if (!name || !url) {
                this.showToast('请填写必需的字段', 'error');
                return false;
            }
            
            try {
                const source = {
                    bookSourceName: name,
                    bookSourceUrl: url,
                    searchUrl: searchUrl,
                    bookSourceGroup: group,
                    enabled: true,
                    ruleSearch: {},
                    ruleBookInfo: {},
                    ruleToc: {},
                    ruleContent: {}
                };
                
                await this.apiCall('/api/saveSource', {
                    method: 'POST',
                    body: JSON.stringify(source)
                });
                
                this.showToast('书源添加成功', 'success');
                await this.loadSources();
                return true;
            } catch (error) {
                this.showToast('添加书源失败', 'error');
                return false;
            }
        });
    }

    async editSource(sourceUrl) {
        const source = this.sources.find(s => s.bookSourceUrl === sourceUrl);
        if (!source) return;
        
        this.showModal('编辑书源', `
            <div class="form-group">
                <label>书源名称</label>
                <input type="text" id="sourceName" value="${source.bookSourceName}">
            </div>
            <div class="form-group">
                <label>书源URL</label>
                <input type="text" id="sourceUrl" value="${source.bookSourceUrl}" readonly>
            </div>
            <div class="form-group">
                <label>搜索地址</label>
                <input type="text" id="searchUrl" value="${source.searchUrl || ''}">
            </div>
            <div class="form-group">
                <label>书源分组</label>
                <input type="text" id="sourceGroup" value="${source.bookSourceGroup || ''}">
            </div>
            <div class="form-group">
                <label>
                    <input type="checkbox" id="sourceEnabled" ${source.enabled ? 'checked' : ''}> 启用书源
                </label>
            </div>
        `, async () => {
            try {
                const updatedSource = {
                    ...source,
                    bookSourceName: document.getElementById('sourceName').value,
                    searchUrl: document.getElementById('searchUrl').value,
                    bookSourceGroup: document.getElementById('sourceGroup').value,
                    enabled: document.getElementById('sourceEnabled').checked
                };
                
                await this.apiCall('/api/saveSource', {
                    method: 'POST',
                    body: JSON.stringify(updatedSource)
                });
                
                this.showToast('书源更新成功', 'success');
                await this.loadSources();
                return true;
            } catch (error) {
                this.showToast('更新书源失败', 'error');
                return false;
            }
        });
    }

    async deleteSource(sourceUrl) {
        if (!confirm('确定要删除这个书源吗？')) return;
        
        try {
            await this.apiCall(`/api/deleteSource/${encodeURIComponent(sourceUrl)}`, {
                method: 'DELETE'
            });
            
            this.showToast('书源删除成功', 'success');
            await this.loadSources();
        } catch (error) {
            this.showToast('删除书源失败', 'error');
        }
    }

    async importSources() {
        if (window.electronAPI) {
            const result = await window.electronAPI.selectSourceFile();
            if (!result.canceled && result.filePaths.length > 0) {
                this.showToast('正在导入书源...', 'info');
            }
        } else {
            this.showToast('请使用桌面版本导入书源', 'error');
        }
    }

    async refreshSources() {
        await this.loadSources();
        this.showToast('书源列表已刷新', 'success');
    }

    // Settings Management
    async loadSettings() {
        try {
            const configData = await this.apiCall('/api/getReadConfig');
            this.config = JSON.parse(configData);
            this.applySettings();
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.config = this.getDefaultConfig();
        }
    }

    applySettings() {
        const config = this.config;
        
        document.getElementById('fontSize').value = config.textSize || 18;
        document.getElementById('fontSizeValue').textContent = (config.textSize || 18) + 'px';
        
        document.getElementById('lineSpacing').value = config.lineSpacingExtra || 8;
        document.getElementById('lineSpacingValue').textContent = (config.lineSpacingExtra || 8) + 'px';
        
        document.getElementById('pageMargin').value = config.pageMargin || 24;
        document.getElementById('pageMarginValue').textContent = (config.pageMargin || 24) + 'px';
        
        document.getElementById('nightMode').checked = config.isNightMode || false;
        document.getElementById('autoBackup').checked = config.autoBackup || false;
    }

    async saveSettings() {
        try {
            const config = {
                ...this.config,
                textSize: parseInt(document.getElementById('fontSize').value),
                lineSpacingExtra: parseInt(document.getElementById('lineSpacing').value),
                pageMargin: parseInt(document.getElementById('pageMargin').value),
                isNightMode: document.getElementById('nightMode').checked,
                autoBackup: document.getElementById('autoBackup').checked
            };
            
            await this.apiCall('/api/saveReadConfig', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            
            this.config = config;
            this.showToast('设置保存成功', 'success');
        } catch (error) {
            this.showToast('保存设置失败', 'error');
        }
    }

    async resetSettings() {
        if (!confirm('确定要重置所有设置吗？')) return;
        
        this.config = this.getDefaultConfig();
        this.applySettings();
        await this.saveSettings();
        this.showToast('设置已重置', 'success');
    }

    getDefaultConfig() {
        return {
            textSize: 18,
            lineSpacingExtra: 8,
            pageMargin: 24,
            isNightMode: false,
            autoBackup: true
        };
    }

    // UI Methods
    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName).classList.add('active');
        document.getElementById(tabName + '-btn').classList.add('active');
        
        // Load data if needed
        if (tabName === 'bookshelf' && this.books.length === 0) {
            this.loadBooks();
        } else if (tabName === 'sources' && this.sources.length === 0) {
            this.loadSources();
        }
    }

    showModal(title, content, callback = null) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal').classList.add('active');
        this.currentModalCallback = callback;
    }

    closeModal() {
        document.getElementById('modal').classList.remove('active');
        this.currentModalCallback = null;
    }

    async confirmModal() {
        if (this.currentModalCallback) {
            const result = await this.currentModalCallback();
            if (result !== false) {
                this.closeModal();
            }
        } else {
            this.closeModal();
        }
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Reading Interface Methods
    showReaderInterface() {
        // Hide main interface
        document.querySelector('.header').style.display = 'none';
        document.querySelector('.main').style.display = 'none';
        
        // Show reading interface
        const readerInterface = document.getElementById('reading-interface');
        readerInterface.style.display = 'flex';
        
        // Set book title
        document.getElementById('reading-book-title').textContent = this.currentBook.name;
        
        // Render chapter list
        this.renderChapterList();
        
        // Setup reading event listeners
        this.setupReadingEventListeners();
        
        // Apply reading settings
        this.applyReadingSettings();
    }

    closeReader() {
        // Hide reading interface
        document.getElementById('reading-interface').style.display = 'none';
        
        // Show main interface
        document.querySelector('.header').style.display = 'flex';
        document.querySelector('.main').style.display = 'block';
        
        // Clear reading data
        this.currentBook = null;
        this.currentChapters = [];
        this.currentChapterIndex = 0;
    }

    renderChapterList() {
        const chapterList = document.getElementById('chapter-list');
        chapterList.innerHTML = '';
        
        this.currentChapters.forEach((chapter, index) => {
            const chapterItem = document.createElement('div');
            chapterItem.className = 'chapter-item';
            chapterItem.textContent = chapter.title;
            chapterItem.onclick = () => this.loadChapter(index);
            
            if (index === this.currentChapterIndex) {
                chapterItem.classList.add('active');
            }
            
            chapterList.appendChild(chapterItem);
        });
        
        // Update progress display
        document.getElementById('current-chapter').textContent = this.currentChapterIndex + 1;
        document.getElementById('total-chapters').textContent = this.currentChapters.length;
    }

    async loadChapter(chapterIndex) {
        if (chapterIndex < 0 || chapterIndex >= this.currentChapters.length) {
            return;
        }
        
        try {
            this.currentChapterIndex = chapterIndex;
            const chapter = this.currentChapters[chapterIndex];
            
            // Update chapter title
            document.getElementById('chapter-title').textContent = chapter.title;
            
            // Load chapter content
            const content = await this.apiCall(`/api/getBookContent?url=${encodeURIComponent(chapter.url)}&sourceUrl=${encodeURIComponent(this.currentBook.bookUrl)}`);
            
            // Process and display content
            const processedContent = this.processChapterContent(content);
            document.getElementById('chapter-content').innerHTML = processedContent;
            
            // Update chapter list active state
            this.renderChapterList();
            
            // Scroll to top
            document.getElementById('reading-area').scrollTop = 0;
            
            // Update navigation buttons
            document.getElementById('prev-chapter').disabled = chapterIndex === 0;
            document.getElementById('next-chapter').disabled = chapterIndex === this.currentChapters.length - 1;
            
            // Save reading progress
            await this.saveReadingProgress();
            
        } catch (error) {
            console.error('Failed to load chapter:', error);
            this.showToast('加载章节失败: ' + error.message, 'error');
        }
    }

    processChapterContent(content) {
        if (!content) return '<p>暂无内容</p>';
        
        // Remove HTML tags if present and split into paragraphs
        const textContent = content.replace(/<[^>]*>/g, '');
        const paragraphs = textContent.split('\n')
            .map(p => p.trim())
            .filter(p => p.length > 0)
            .map(p => `<p>${p}</p>`)
            .join('');
        
        return paragraphs || '<p>暂无内容</p>';
    }

    prevChapter() {
        if (this.currentChapterIndex > 0) {
            this.loadChapter(this.currentChapterIndex - 1);
        }
    }

    nextChapter() {
        if (this.currentChapterIndex < this.currentChapters.length - 1) {
            this.loadChapter(this.currentChapterIndex + 1);
        }
    }

    toggleReaderMenu() {
        const menu = document.getElementById('reading-menu');
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }

    setupReadingEventListeners() {
        // Reading settings
        const fontSizeSlider = document.getElementById('reader-font-size');
        const lineSpacingSlider = document.getElementById('reader-line-spacing');
        const marginSlider = document.getElementById('reader-margin');
        const nightModeCheckbox = document.getElementById('reader-night-mode');
        
        fontSizeSlider.addEventListener('input', (e) => {
            document.getElementById('reader-font-size-value').textContent = e.target.value + 'px';
            this.applyReadingSettings();
        });
        
        lineSpacingSlider.addEventListener('input', (e) => {
            document.getElementById('reader-line-spacing-value').textContent = e.target.value;
            this.applyReadingSettings();
        });
        
        marginSlider.addEventListener('input', (e) => {
            document.getElementById('reader-margin-value').textContent = e.target.value + 'px';
            this.applyReadingSettings();
        });
        
        nightModeCheckbox.addEventListener('change', () => {
            this.applyReadingSettings();
        });
        
        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleKeyDown(event) {
        if (document.getElementById('reading-interface').style.display !== 'flex') {
            return;
        }
        
        switch(event.key) {
            case 'ArrowLeft':
                event.preventDefault();
                this.prevChapter();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.nextChapter();
                break;
            case 'Escape':
                event.preventDefault();
                this.closeReader();
                break;
        }
    }

    applyReadingSettings() {
        const readingArea = document.getElementById('reading-area');
        const readingInterface = document.getElementById('reading-interface');
        
        const fontSize = document.getElementById('reader-font-size')?.value || 16;
        const lineSpacing = document.getElementById('reader-line-spacing')?.value || 1.6;
        const margin = document.getElementById('reader-margin')?.value || 20;
        const nightMode = document.getElementById('reader-night-mode')?.checked || false;
        
        if (readingArea) {
            readingArea.style.fontSize = fontSize + 'px';
            readingArea.style.lineHeight = lineSpacing;
            readingArea.style.padding = `${margin}px`;
        }
        
        if (nightMode) {
            readingInterface.classList.add('night-mode');
        } else {
            readingInterface.classList.remove('night-mode');
        }
    }

    // Progress and Bookmark Management
    async saveReadingProgress() {
        if (!this.currentBook || this.currentChapterIndex < 0) return;
        
        try {
            const progress = {
                bookUrl: this.currentBook.bookUrl,
                chapterIndex: this.currentChapterIndex,
                chapterPos: 0, // Could be enhanced to track position within chapter
                readTime: Date.now(),
                totalChapters: this.currentChapters.length
            };
            
            // Save to local storage as fallback
            localStorage.setItem(`reading-progress-${this.currentBook.bookUrl}`, JSON.stringify(progress));
            
            // TODO: Save to backend if API exists
            console.log('Progress saved:', progress);
            
        } catch (error) {
            console.error('Failed to save progress:', error);
        }
    }

    async loadReadingProgress() {
        if (!this.currentBook) return 0;
        
        try {
            const progressData = localStorage.getItem(`reading-progress-${this.currentBook.bookUrl}`);
            if (progressData) {
                const progress = JSON.parse(progressData);
                return progress.chapterIndex || 0;
            }
        } catch (error) {
            console.error('Failed to load progress:', error);
        }
        
        return 0;
    }

    // Search functionality
    async searchInBook(keyword) {
        if (!this.currentBook || !keyword.trim()) return [];
        
        const results = [];
        const searchKeyword = keyword.toLowerCase();
        
        try {
            for (let i = 0; i < this.currentChapters.length; i++) {
                const chapter = this.currentChapters[i];
                const content = await this.apiCall(`/api/getBookContent?url=${encodeURIComponent(chapter.url)}&sourceUrl=${encodeURIComponent(this.currentBook.bookUrl)}`);
                
                if (content && content.toLowerCase().includes(searchKeyword)) {
                    // Find all occurrences in this chapter
                    const lines = content.split('\n');
                    lines.forEach((line, lineIndex) => {
                        if (line.toLowerCase().includes(searchKeyword)) {
                            results.push({
                                chapterIndex: i,
                                chapterTitle: chapter.title,
                                lineIndex: lineIndex,
                                content: line.trim(),
                                preview: this.getSearchPreview(line, keyword)
                            });
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Search error:', error);
        }
        
        return results;
    }

    getSearchPreview(line, keyword) {
        const index = line.toLowerCase().indexOf(keyword.toLowerCase());
        if (index === -1) return line;
        
        const start = Math.max(0, index - 20);
        const end = Math.min(line.length, index + keyword.length + 20);
        let preview = line.substring(start, end);
        
        if (start > 0) preview = '...' + preview;
        if (end < line.length) preview = preview + '...';
        
        // Highlight the keyword
        const regex = new RegExp(`(${keyword})`, 'gi');
        preview = preview.replace(regex, '<mark>$1</mark>');
        
        return preview;
    }

    // Enhanced navigation with progress restoration
    async openBook(bookUrl) {
        try {
            const book = this.books.find(b => b.bookUrl === bookUrl);
            if (!book) return;
            
            // Load chapters first
            const chapters = await this.apiCall(`/api/getChapterList?url=${encodeURIComponent(bookUrl)}`);
            
            if (!chapters || chapters.length === 0) {
                this.showToast('该书籍暂无章节内容', 'error');
                return;
            }
            
            // Initialize reading interface
            this.currentBook = book;
            this.currentChapters = chapters;
            
            // Load saved progress
            const savedChapterIndex = await this.loadReadingProgress();
            this.currentChapterIndex = Math.min(savedChapterIndex, chapters.length - 1);
            
            // Show reading interface
            this.showReaderInterface();
            
            // Load the saved chapter or first chapter
            await this.loadChapter(this.currentChapterIndex);
            
            // Show progress restoration message if applicable
            if (savedChapterIndex > 0) {
                this.showToast(`已恢复到第 ${savedChapterIndex + 1} 章`, 'info');
            }
            
        } catch (error) {
            console.error('Failed to open book:', error);
            this.showToast('打开书籍失败: ' + error.message, 'error');
        }
    }

    // Search functionality in reading interface
    async performSearch() {
        const searchInput = document.getElementById('search-input');
        const keyword = searchInput.value.trim();
        
        if (!keyword) {
            this.showToast('请输入搜索关键词', 'error');
            return;
        }
        
        this.showToast('正在搜索...', 'info');
        
        try {
            const results = await this.searchInBook(keyword);
            this.displaySearchResults(results, keyword);
        } catch (error) {
            console.error('Search failed:', error);
            this.showToast('搜索失败', 'error');
        }
    }

    displaySearchResults(results, keyword) {
        const searchResultsDiv = document.getElementById('search-results');
        const chapterListDiv = document.getElementById('chapter-list');
        
        if (results.length === 0) {
            searchResultsDiv.innerHTML = `<p style="color: #666; padding: 10px;">未找到"${keyword}"的搜索结果</p>`;
        } else {
            let html = `<h4>搜索结果 (${results.length})</h4>`;
            results.forEach((result, index) => {
                html += `
                    <div class="search-result-item" style="padding: 8px; margin: 4px 0; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;" onclick="app.jumpToSearchResult(${result.chapterIndex}, '${keyword}')">
                        <div style="font-weight: bold; font-size: 0.9em; color: #1976d2;">${result.chapterTitle}</div>
                        <div style="font-size: 0.8em; color: #666; margin-top: 4px;">${result.preview}</div>
                    </div>
                `;
            });
            html += `<button onclick="app.closeSearch()" style="width: 100%; margin-top: 10px; padding: 8px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">关闭搜索</button>`;
            searchResultsDiv.innerHTML = html;
        }
        
        // Show search results, hide chapter list
        searchResultsDiv.style.display = 'block';
        chapterListDiv.style.display = 'none';
        
        this.showToast(`找到 ${results.length} 个搜索结果`, 'success');
    }

    async jumpToSearchResult(chapterIndex, keyword) {
        await this.loadChapter(chapterIndex);
        
        // Try to scroll to the highlighted text
        setTimeout(() => {
            const content = document.getElementById('chapter-content');
            if (content) {
                const regex = new RegExp(`(${keyword})`, 'gi');
                content.innerHTML = content.innerHTML.replace(regex, '<mark style="background: yellow; padding: 2px;">$1</mark>');
                
                // Scroll to first highlight
                const firstHighlight = content.querySelector('mark');
                if (firstHighlight) {
                    firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }, 100);
        
        this.closeSearch();
    }

    closeSearch() {
        const searchResultsDiv = document.getElementById('search-results');
        const chapterListDiv = document.getElementById('chapter-list');
        
        searchResultsDiv.style.display = 'none';
        chapterListDiv.style.display = 'block';
        
        // Clear search input
        document.getElementById('search-input').value = '';
    }
}

// Global functions for HTML onclick handlers
function showTab(tabName) {
    app.showTab(tabName);
}

function importBooks() {
    app.importBooks();
}

function refreshBooks() {
    app.refreshBooks();
}

function importSources() {
    app.importSources();
}

function addSource() {
    app.addSource();
}

function refreshSources() {
    app.refreshSources();
}

function saveSettings() {
    app.saveSettings();
}

function resetSettings() {
    app.resetSettings();
}

function closeModal() {
    app.closeModal();
}

function confirmModal() {
    app.confirmModal();
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LegadoApp();
});