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

    async openBook(bookUrl) {
        try {
            const book = this.books.find(b => b.bookUrl === bookUrl);
            if (!book) return;
            
            // For now, just show book info
            this.showModal('书籍信息', `
                <div class="form-group">
                    <label>书名</label>
                    <input type="text" value="${book.name}" readonly>
                </div>
                <div class="form-group">
                    <label>作者</label>
                    <input type="text" value="${book.author}" readonly>
                </div>
                <div class="form-group">
                    <label>章节数</label>
                    <input type="text" value="${book.totalChapterNum || 0}" readonly>
                </div>
                <div class="form-group">
                    <label>简介</label>
                    <textarea readonly>${book.intro || '暂无简介'}</textarea>
                </div>
            `, () => {
                // Future: Open reading interface
                this.showToast('阅读功能正在开发中...', 'info');
            });
        } catch (error) {
            this.showToast('打开书籍失败', 'error');
        }
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