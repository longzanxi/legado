# Legado Windows版 (阅读3.0)

这是将Android版本的Legado (阅读3.0) 移植到Windows平台的完整功能版本。

## 功能特性

### ✅ 已实现功能
- 📚 **本地书籍管理** - 支持导入和管理EPUB、TXT格式的电子书
- 🔍 **书源管理** - 支持添加、编辑、删除和导入书源
- ⚙️ **阅读设置** - 字体大小、行间距、页面边距等个性化设置
- 🌙 **夜间模式** - 护眼的夜间阅读模式
- 💾 **数据持久化** - 自动保存书籍、书源和设置数据
- 🖥️ **原生体验** - 使用Electron提供类似原生应用的体验

### 🚧 开发中功能
- 📖 **阅读界面** - 完整的书籍阅读体验
- 🔍 **全文搜索** - 在书籍内容中搜索
- 🔗 **在线书源** - 网络书源的搜索和下载
- 📱 **同步功能** - 与手机版本的数据同步
- 🎨 **主题定制** - 更多主题和界面定制选项

## 技术架构

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **后端**: Node.js + Express
- **桌面框架**: Electron
- **数据存储**: JSON文件 (未来可扩展到SQLite)
- **书籍解析**: JSZip (EPUB) + 自定义解析器 (TXT)

## 安装和运行

### 开发环境

1. **克隆项目**
   ```bash
   git clone https://github.com/longzanxi/legado.git
   cd legado/windows-app
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **开发模式运行**
   ```bash
   npm run dev
   ```

4. **构建应用**
   ```bash
   npm run build:win
   ```

### 生产版本

1. **下载安装包**
   - 从 [Releases](https://github.com/longzanxi/legado/releases) 页面下载最新版本的Windows安装包

2. **安装应用**
   - 运行下载的`.exe`文件
   - 按照安装向导完成安装

3. **首次使用**
   - 启动应用后，点击"导入本地书籍"添加您的电子书
   - 在书源页面添加或导入书源文件

## 使用指南

### 导入书籍
1. 点击主界面的"导入本地书籍"按钮
2. 选择您的EPUB或TXT格式电子书文件
3. 支持批量选择多个文件同时导入
4. 导入完成后，书籍会出现在书架中

### 管理书源
1. 切换到"书源"标签页
2. 点击"添加书源"手动添加单个书源
3. 或点击"导入书源"批量导入书源JSON文件
4. 可以编辑或删除现有书源

### 阅读设置
1. 切换到"设置"标签页
2. 调整字体大小、行间距、页面边距等参数
3. 开启或关闭夜间模式
4. 设置会自动保存

## 目录结构

```
windows-app/
├── main.js              # Electron主进程
├── preload.js           # 预加载脚本
├── package.json         # 项目配置
├── backend/             # 后端服务
│   └── services/        # 业务逻辑服务
│       ├── book-service.js      # 书籍管理
│       ├── source-service.js    # 书源管理
│       ├── config-service.js    # 配置管理
│       └── web-service.js       # Web服务工具
├── renderer/            # 前端界面
│   ├── index.html       # 主界面
│   └── app.js          # 前端逻辑
└── assets/              # 资源文件
    └── icon.*          # 应用图标
```

## 数据存储

应用数据存储在用户数据目录中：
- **Windows**: `%APPDATA%/legado-windows/legado-data/`
- 包含以下文件/目录：
  - `books.json` - 书籍数据
  - `sources.json` - 书源数据
  - `config/app-config.json` - 应用配置
  - `books/` - 导入的书籍文件
  - `cache/` - 缓存数据
  - `logs/` - 日志文件

## 开发计划

### 短期目标 (v1.0)
- [ ] 完善阅读界面
- [ ] 书籍内容搜索
- [ ] 书签和阅读进度
- [ ] 更多书籍格式支持 (PDF)

### 中期目标 (v2.0)
- [ ] 在线书源支持
- [ ] 网络书籍搜索和下载
- [ ] 自动更新功能
- [ ] 插件系统

### 长期目标 (v3.0)
- [ ] 云同步功能
- [ ] 多设备数据同步
- [ ] 社区功能
- [ ] 朗读功能

## 贡献指南

欢迎为这个项目做出贡献！

1. Fork 这个项目
2. 创建您的功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开一个 Pull Request

## 许可证

这个项目使用 GPL-3.0 许可证 - 查看 [LICENSE](../LICENSE) 文件了解详情。

## 致谢

- 感谢原始的 [Legado Android版本](https://github.com/gedoor/legado) 项目
- 感谢所有为这个项目贡献的开发者

## 联系方式

如果您有任何问题或建议，请：
- 创建 [Issue](https://github.com/longzanxi/legado/issues)
- 参与 [Discussions](https://github.com/longzanxi/legado/discussions)

---

**注意**: 这是一个开源项目，仅供学习和个人使用。请尊重版权，仅使用合法获得的电子书内容。