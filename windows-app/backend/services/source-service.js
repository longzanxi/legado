const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { parse } = require('node-html-parser');

class SourceService {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.sourcesPath = path.join(dataPath, 'sources');
    this.sources = new Map();
    this.loadSources();
  }

  async loadSources() {
    try {
      const sourcesFile = path.join(this.dataPath, 'sources.json');
      const data = await fs.readFile(sourcesFile, 'utf-8');
      const sources = JSON.parse(data);
      sources.forEach(source => this.sources.set(source.bookSourceUrl, source));
    } catch (error) {
      console.log('No existing sources file, loading defaults');
      await this.loadDefaultSources();
    }
  }

  async loadDefaultSources() {
    // Load some default book sources
    const defaultSources = [
      {
        bookSourceName: '本地书籍',
        bookSourceGroup: '本地',
        bookSourceUrl: 'local://books',
        bookSourceType: 0,
        enabled: true,
        enabledExplore: false,
        header: '',
        loginUrl: '',
        loginUi: '',
        loginCheckJs: '',
        bookUrlPattern: '',
        customOrder: 0,
        weight: 100,
        exploreUrl: '',
        searchUrl: '',
        ruleSearch: {
          bookList: '',
          name: '',
          author: '',
          intro: '',
          kind: '',
          lastChapter: '',
          updateTime: '',
          bookUrl: '',
          coverUrl: '',
          wordCount: ''
        },
        ruleExplore: {
          bookList: '',
          name: '',
          author: '',
          intro: '',
          kind: '',
          lastChapter: '',
          updateTime: '',
          bookUrl: '',
          coverUrl: '',
          wordCount: ''
        },
        ruleBookInfo: {
          init: '',
          name: '',
          author: '',
          intro: '',
          kind: '',
          lastChapter: '',
          updateTime: '',
          coverUrl: '',
          tocUrl: '',
          wordCount: '',
          canReName: ''
        },
        ruleToc: {
          chapterList: '',
          chapterName: '',
          chapterUrl: '',
          nextTocUrl: ''
        },
        ruleContent: {
          content: '',
          nextContentUrl: '',
          webJs: '',
          sourceRegex: '',
          replaceRegex: '',
          imageStyle: '',
          payAction: ''
        }
      }
    ];

    defaultSources.forEach(source => this.sources.set(source.bookSourceUrl, source));
    await this.saveSources();
  }

  async saveSources() {
    try {
      const sourcesFile = path.join(this.dataPath, 'sources.json');
      const sources = Array.from(this.sources.values());
      await fs.writeFile(sourcesFile, JSON.stringify(sources, null, 2));
    } catch (error) {
      console.error('Error saving sources:', error);
    }
  }

  async getAllSources() {
    return Array.from(this.sources.values());
  }

  async saveSource(source) {
    // Validate required fields
    if (!source.bookSourceUrl) {
      throw new Error('Book source URL is required');
    }
    
    // Set default values
    source.enabled = source.enabled !== undefined ? source.enabled : true;
    source.enabledExplore = source.enabledExplore !== undefined ? source.enabledExplore : true;
    source.bookSourceType = source.bookSourceType || 0;
    source.customOrder = source.customOrder || 0;
    source.weight = source.weight || 0;
    source.lastUpdateTime = Date.now();
    
    // Initialize rule objects if not present
    source.ruleSearch = source.ruleSearch || {};
    source.ruleExplore = source.ruleExplore || {};
    source.ruleBookInfo = source.ruleBookInfo || {};
    source.ruleToc = source.ruleToc || {};
    source.ruleContent = source.ruleContent || {};
    
    this.sources.set(source.bookSourceUrl, source);
    await this.saveSources();
    return source;
  }

  async saveSources(sourceList) {
    const savedSources = [];
    for (const source of sourceList) {
      const savedSource = await this.saveSource(source);
      savedSources.push(savedSource);
    }
    return savedSources;
  }

  async deleteSource(sourceUrl) {
    if (this.sources.has(sourceUrl)) {
      this.sources.delete(sourceUrl);
      await this.saveSources();
    }
  }

  async importSources(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const sources = JSON.parse(data);
      
      if (!Array.isArray(sources)) {
        throw new Error('Invalid source file format');
      }
      
      const importedSources = [];
      for (const source of sources) {
        if (source.bookSourceUrl) {
          const savedSource = await this.saveSource(source);
          importedSources.push(savedSource);
        }
      }
      
      return importedSources;
    } catch (error) {
      throw new Error(`Failed to import sources: ${error.message}`);
    }
  }

  async testSource(sourceUrl) {
    const source = this.sources.get(sourceUrl);
    if (!source) {
      throw new Error('Source not found');
    }

    try {
      // Test search functionality if available
      if (source.searchUrl) {
        const testResult = await this.executeSearch(source, '测试');
        return {
          success: true,
          message: `Search test passed. Found ${testResult.length} results.`,
          results: testResult.slice(0, 3) // Return first 3 results
        };
      }
      
      // Test explore functionality if available
      if (source.exploreUrl && source.enabledExplore) {
        const testResult = await this.executeExplore(source);
        return {
          success: true,
          message: `Explore test passed. Found ${testResult.length} results.`,
          results: testResult.slice(0, 3)
        };
      }
      
      return {
        success: true,
        message: 'Source configuration looks valid, but no testable endpoints available.',
        results: []
      };
    } catch (error) {
      return {
        success: false,
        message: `Source test failed: ${error.message}`,
        results: []
      };
    }
  }

  async executeSearch(source, keyword) {
    if (!source.searchUrl || !source.ruleSearch) {
      throw new Error('Search not configured for this source');
    }

    // Replace search keyword in URL
    const searchUrl = source.searchUrl.replace(/\{\{key\}\}/g, encodeURIComponent(keyword));
    
    try {
      const response = await axios.get(searchUrl, {
        headers: this.parseHeaders(source.header),
        timeout: 10000
      });

      return this.parseSearchResults(response.data, source.ruleSearch);
    } catch (error) {
      throw new Error(`Search request failed: ${error.message}`);
    }
  }

  async executeExplore(source, exploreUrl = null) {
    const url = exploreUrl || source.exploreUrl;
    if (!url || !source.ruleExplore) {
      throw new Error('Explore not configured for this source');
    }

    try {
      const response = await axios.get(url, {
        headers: this.parseHeaders(source.header),
        timeout: 10000
      });

      return this.parseExploreResults(response.data, source.ruleExplore);
    } catch (error) {
      throw new Error(`Explore request failed: ${error.message}`);
    }
  }

  parseSearchResults(html, ruleSearch) {
    const doc = parse(html);
    const results = [];

    try {
      const bookElements = doc.querySelectorAll(ruleSearch.bookList || 'item');
      
      for (const element of bookElements) {
        const result = {
          name: this.extractText(element, ruleSearch.name),
          author: this.extractText(element, ruleSearch.author),
          intro: this.extractText(element, ruleSearch.intro),
          kind: this.extractText(element, ruleSearch.kind),
          lastChapter: this.extractText(element, ruleSearch.lastChapter),
          updateTime: this.extractText(element, ruleSearch.updateTime),
          bookUrl: this.extractText(element, ruleSearch.bookUrl),
          coverUrl: this.extractText(element, ruleSearch.coverUrl),
          wordCount: this.extractText(element, ruleSearch.wordCount)
        };
        
        if (result.name && result.bookUrl) {
          results.push(result);
        }
      }
    } catch (error) {
      console.error('Error parsing search results:', error);
    }

    return results;
  }

  parseExploreResults(html, ruleExplore) {
    // Similar to parseSearchResults but for explore
    return this.parseSearchResults(html, ruleExplore);
  }

  extractText(element, rule) {
    if (!rule) return '';
    
    try {
      // Simple CSS selector extraction
      if (rule.startsWith('.') || rule.startsWith('#') || rule.includes(' ')) {
        const target = element.querySelector(rule);
        return target ? target.text.trim() : '';
      }
      
      // Attribute extraction
      if (rule.startsWith('@')) {
        const attr = rule.substring(1);
        return element.getAttribute(attr) || '';
      }
      
      // Direct text
      return element.text.trim();
    } catch (error) {
      return '';
    }
  }

  parseHeaders(headerString) {
    const headers = {};
    if (!headerString) return headers;

    try {
      const lines = headerString.split('\n');
      for (const line of lines) {
        const [key, value] = line.split(':').map(s => s.trim());
        if (key && value) {
          headers[key] = value;
        }
      }
    } catch (error) {
      console.error('Error parsing headers:', error);
    }

    return headers;
  }

  async getSourceGroups() {
    const groups = new Set();
    for (const source of this.sources.values()) {
      if (source.bookSourceGroup) {
        groups.add(source.bookSourceGroup);
      }
    }
    return Array.from(groups).sort();
  }

  async getSourcesByGroup(group) {
    const sources = [];
    for (const source of this.sources.values()) {
      if (source.bookSourceGroup === group) {
        sources.push(source);
      }
    }
    return sources.sort((a, b) => (b.weight || 0) - (a.weight || 0));
  }

  async enableSource(sourceUrl, enabled = true) {
    const source = this.sources.get(sourceUrl);
    if (source) {
      source.enabled = enabled;
      await this.saveSources();
      return source;
    }
    throw new Error('Source not found');
  }
}

module.exports = SourceService;