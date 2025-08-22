const fs = require('fs').promises;
const path = require('path');

class ConfigService {
  constructor(dataPath) {
    this.dataPath = dataPath;
    this.configPath = path.join(dataPath, 'config');
    this.config = {
      readConfig: this.getDefaultReadConfig(),
      appConfig: this.getDefaultAppConfig(),
      themeConfig: this.getDefaultThemeConfig()
    };
    this.loadConfig();
  }

  async loadConfig() {
    try {
      const configFile = path.join(this.configPath, 'app-config.json');
      const data = await fs.readFile(configFile, 'utf-8');
      const loadedConfig = JSON.parse(data);
      this.config = { ...this.config, ...loadedConfig };
    } catch (error) {
      console.log('No existing config file, using defaults');
      await this.saveConfig();
    }
  }

  async saveConfig() {
    try {
      await fs.mkdir(this.configPath, { recursive: true });
      const configFile = path.join(this.configPath, 'app-config.json');
      await fs.writeFile(configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  async getReadConfig() {
    return this.config.readConfig;
  }

  async saveReadConfig(readConfig) {
    this.config.readConfig = { ...this.config.readConfig, ...readConfig };
    await this.saveConfig();
  }

  async getAppConfig() {
    return this.config.appConfig;
  }

  async saveAppConfig(appConfig) {
    this.config.appConfig = { ...this.config.appConfig, ...appConfig };
    await this.saveConfig();
  }

  async getThemeConfig() {
    return this.config.themeConfig;
  }

  async saveThemeConfig(themeConfig) {
    this.config.themeConfig = { ...this.config.themeConfig, ...themeConfig };
    await this.saveConfig();
  }

  getDefaultReadConfig() {
    return {
      // 字体配置
      textFont: 'Microsoft YaHei',
      textSize: 18,
      textBold: false,
      textColor: '#333333',
      
      // 背景配置
      bgType: 0, // 0-颜色 1-图片 2-渐变
      bgColor: '#FFFFFF',
      bgColorNight: '#1E1E1E',
      bgImage: '',
      bgImageNight: '',
      
      // 间距配置
      lineSpacingExtra: 8,
      paragraphSpacing: 16,
      pageMargin: 24,
      pageMarginTop: 48,
      pageMarginBottom: 48,
      
      // 阅读配置
      isNightMode: false,
      hideStatusBar: false,
      hideNavigationBar: false,
      screenTimeOut: 0,
      screenOrientation: 0, // 0-跟随系统 1-竖屏 2-横屏
      
      // 翻页配置
      pageAnim: 0, // 0-覆盖 1-仿真 2-滑动 3-滚动 4-无动画
      clickTurnPage: true,
      volumeKeyTurnPage: true,
      autoReadSpeed: 50,
      
      // 字体调整
      textLetterSpacing: 0,
      paragraphIndent: 2,
      
      // 其他配置
      showTimeBattery: true,
      showReadProgress: true,
      showBookName: true,
      longPressSelect: true,
      
      // 夜间模式配置
      nightTextColor: '#CCCCCC',
      nightBgColor: '#1E1E1E',
      
      // 护眼配置
      useEyeCare: false,
      eyeCareColor: '#C7EDCC'
    };
  }

  getDefaultAppConfig() {
    return {
      // 应用基础配置
      autoBackup: true,
      backupPath: '',
      importOldData: false,
      
      // 书源配置
      enabledSources: [],
      sourceTimeout: 10000,
      parallelSearchCount: 3,
      
      // 网络配置
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      enableProxy: false,
      proxyHost: '',
      proxyPort: 8080,
      
      // 缓存配置
      maxCacheSize: 100, // MB
      autoClearCache: false,
      preDownloadCount: 5,
      
      // 界面配置
      language: 'zh-CN',
      checkUpdate: true,
      hideApps: [],
      
      // 阅读配置
      autoRefresh: true,
      refreshInterval: 60000,
      replaceClearContent: '',
      
      // 其他配置
      audioPlayOnAppFocus: false,
      recordProgress: true,
      showRSS: true,
      threadCount: 4
    };
  }

  getDefaultThemeConfig() {
    return {
      // 主题配置
      isDarkTheme: false,
      primaryColor: '#1976D2',
      accentColor: '#2196F3',
      backgroundColor: '#FFFFFF',
      surfaceColor: '#F5F5F5',
      
      // 夜间主题
      darkPrimaryColor: '#1976D2',
      darkAccentColor: '#64B5F6',
      darkBackgroundColor: '#121212',
      darkSurfaceColor: '#1E1E1E',
      
      // 字体主题
      fontFamily: 'Microsoft YaHei',
      
      // 自定义颜色
      customColors: {
        reading: {
          light: {
            textColor: '#333333',
            backgroundColor: '#FFFFFF'
          },
          dark: {
            textColor: '#CCCCCC',
            backgroundColor: '#1E1E1E'
          }
        }
      }
    };
  }

  // 获取特定配置项
  async getConfigValue(category, key, defaultValue = null) {
    if (this.config[category] && this.config[category][key] !== undefined) {
      return this.config[category][key];
    }
    return defaultValue;
  }

  // 设置特定配置项
  async setConfigValue(category, key, value) {
    if (!this.config[category]) {
      this.config[category] = {};
    }
    this.config[category][key] = value;
    await this.saveConfig();
  }

  // 重置配置到默认值
  async resetConfig(category = null) {
    if (category) {
      switch (category) {
        case 'readConfig':
          this.config.readConfig = this.getDefaultReadConfig();
          break;
        case 'appConfig':
          this.config.appConfig = this.getDefaultAppConfig();
          break;
        case 'themeConfig':
          this.config.themeConfig = this.getDefaultThemeConfig();
          break;
      }
    } else {
      this.config = {
        readConfig: this.getDefaultReadConfig(),
        appConfig: this.getDefaultAppConfig(),
        themeConfig: this.getDefaultThemeConfig()
      };
    }
    await this.saveConfig();
  }

  // 导出配置
  async exportConfig() {
    return JSON.stringify(this.config, null, 2);
  }

  // 导入配置
  async importConfig(configJson) {
    try {
      const importedConfig = JSON.parse(configJson);
      this.config = { ...this.config, ...importedConfig };
      await this.saveConfig();
      return true;
    } catch (error) {
      console.error('Error importing config:', error);
      return false;
    }
  }
}

module.exports = ConfigService;