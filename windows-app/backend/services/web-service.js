const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { parse } = require('node-html-parser');

class WebService {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
  }

  // HTTP请求工具方法
  async httpGet(url, options = {}) {
    try {
      const config = {
        url,
        method: 'GET',
        headers: {
          'User-Agent': this.userAgent,
          ...options.headers
        },
        timeout: options.timeout || 10000,
        ...options
      };

      const response = await axios(config);
      return {
        status: response.status,
        headers: response.headers,
        data: response.data
      };
    } catch (error) {
      throw new Error(`HTTP GET failed: ${error.message}`);
    }
  }

  async httpPost(url, data, options = {}) {
    try {
      const config = {
        url,
        method: 'POST',
        data,
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: options.timeout || 10000,
        ...options
      };

      const response = await axios(config);
      return {
        status: response.status,
        headers: response.headers,
        data: response.data
      };
    } catch (error) {
      throw new Error(`HTTP POST failed: ${error.message}`);
    }
  }

  // 网页解析工具方法
  parseHtml(html) {
    return parse(html);
  }

  // CSS选择器查询
  querySelector(doc, selector) {
    return doc.querySelector(selector);
  }

  querySelectorAll(doc, selector) {
    return doc.querySelectorAll(selector);
  }

  // 文本提取
  extractText(element, rule = '') {
    if (!element) return '';

    try {
      if (!rule) {
        return element.text.trim();
      }

      // 属性提取
      if (rule.startsWith('@')) {
        const attr = rule.substring(1);
        return element.getAttribute(attr) || '';
      }

      // CSS选择器
      if (rule.includes('.') || rule.includes('#') || rule.includes(' ')) {
        const target = element.querySelector(rule);
        return target ? target.text.trim() : '';
      }

      // 正则表达式提取
      if (rule.startsWith('/') && rule.endsWith('/')) {
        const regex = new RegExp(rule.slice(1, -1));
        const match = element.text.match(regex);
        return match ? match[1] || match[0] : '';
      }

      return element.text.trim();
    } catch (error) {
      console.error('Error extracting text:', error);
      return '';
    }
  }

  // URL处理
  resolveUrl(baseUrl, relativeUrl) {
    try {
      return new URL(relativeUrl, baseUrl).href;
    } catch (error) {
      return relativeUrl;
    }
  }

  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 编码处理
  encodeURI(str) {
    return encodeURIComponent(str);
  }

  decodeURI(str) {
    try {
      return decodeURIComponent(str);
    } catch (error) {
      return str;
    }
  }

  // 字符串处理
  trim(str) {
    return str ? str.trim() : '';
  }

  replace(str, search, replacement) {
    if (!str) return '';
    if (search instanceof RegExp) {
      return str.replace(search, replacement);
    }
    return str.replace(new RegExp(search, 'g'), replacement);
  }

  // JSON处理
  parseJson(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`JSON parse failed: ${error.message}`);
    }
  }

  stringifyJson(obj) {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      throw new Error(`JSON stringify failed: ${error.message}`);
    }
  }

  // 文件操作
  async readFile(filePath) {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`File read failed: ${error.message}`);
    }
  }

  async writeFile(filePath, content) {
    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`File write failed: ${error.message}`);
    }
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 日期时间处理
  getCurrentTime() {
    return Date.now();
  }

  formatDate(timestamp, format = 'yyyy-MM-dd HH:mm:ss') {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return format
      .replace('yyyy', year)
      .replace('MM', month)
      .replace('dd', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  }

  parseDate(dateString) {
    return new Date(dateString).getTime();
  }

  // 加密解密
  md5(str) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(str).digest('hex');
  }

  base64Encode(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
  }

  base64Decode(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
  }

  // Cookie处理
  parseCookies(cookieString) {
    const cookies = {};
    if (!cookieString) return cookies;

    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.split('=').map(c => c.trim());
      if (name && value) {
        cookies[name] = value;
      }
    });

    return cookies;
  }

  stringifyCookies(cookies) {
    return Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  // 睡眠/延迟
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 随机数
  random(min = 0, max = 1) {
    return Math.random() * (max - min) + min;
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // 数组处理
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  uniqueArray(array) {
    return [...new Set(array)];
  }

  // 日志记录
  log(message, level = 'info') {
    const timestamp = this.formatDate(Date.now());
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  error(message) {
    this.log(message, 'error');
  }

  warn(message) {
    this.log(message, 'warn');
  }

  debug(message) {
    this.log(message, 'debug');
  }
}

module.exports = WebService;