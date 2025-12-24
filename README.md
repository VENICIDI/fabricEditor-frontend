# Fabric.js 画布编辑器 MVP（前端）

本仓库为 **纯前端单页** 实现（无构建、无打包），入口为 `editor.html`。

- 使用 CDN 引入 Fabric.js（`window.fabric`）。需要最少6.0版本的fabric，较老的版本很多api通过回调的方式实现，新的版本通过promise，代码结构不同
- 核心逻辑位于 `src/`（命令模式 undo/redo、工具栏、属性面板、快捷键、序列化等）。

## 1. 启动方式

### 使用内置静态服务器（推荐）

项目提供 `server.js` 作为简易静态服务器（用于本地预览 `editor.html` 及静态资源）,通过用node启动server脚本实现项目的启动：

```bash
node server.js
```

然后打开：

- `http://localhost:8080`

### 常见问题

- 如果 Fabric.js 没有正确加载，页面会提示：`Fabric.js 未加载：请确保网络通畅`。
- 不能直接打开 `editor.html`， 没有本地服务的话打开会有cdn脚本加载的错误。

## 2. MVP 功能清单

- **对象创建**
  - 矩形、圆形、文本（IText）
- **对象编辑**
  - 选择后可拖拽移动/缩放/旋转
  - 修改 `fill / stroke / strokeWidth / opacity`
  - 文本修改 `text / fontSize`（双击进入编辑）
- **自由绘制 / 橡皮擦**
  - 画笔（Brush）：优先使用 `PencilBrush`
  - 橡皮擦（Eraser）：优先使用 `fabric.EraserBrush`；若 Fabric 版本不支持则降级为“用背景色绘制”
- **复制/粘贴/删除**
  - 粘贴时会为对象（及其子对象）重新生成 `data.id`，避免与原对象冲突
- **Undo / Redo（命令模式）**
  - 所有上述操作均可撤销/重做
  - 高频交互（拖拽/缩放/旋转）仅在 `object:modified`（结束时）入栈，避免卡顿
  - `ModifyObjectCommand` 支持时间窗口合并（默认 600ms）
  - `isReplaying` 防止 undo/redo 回放时再次生成历史
- **导入/导出 JSON**
  - 导出包含 `data` 等自定义字段
  - 导入会清空画布并清空历史（MVP 策略）

## 3. 快捷键

- **Undo**：macOS `⌘Z` / Windows `Ctrl+Z`
- **Redo**：macOS `⌘Y` / Windows `Ctrl+Y`
- **复制**：`⌘/Ctrl+C`
- **粘贴**：`⌘/Ctrl+V`
- **删除**：`Delete` / `Backspace`（输入框聚焦时不触发）
- **切换绘制模式**：`B`
- **退出绘制模式**：`Esc`
- **工具切换（单键）**
  - `V`：选择
  - `T`：文本
  - `E`：橡皮擦
  - `R`：形状菜单/矩形
  - `O`：圆形

## 4. 目录结构与职责

```text
fabricEditor-frontend/
  editor.html                # 单页入口（DOM 结构 + Fabric CDN + main.js）
  server.js                  # 简易静态服务器（本地预览）
  src/
    main.js                  # 应用入口：初始化/事件绑定
    core/                    # 编辑器内核（canvas host、命令、序列化、剪贴板等）
      canvasHost.js
      commandBindings.js
      clipboard.js
      objectFactory.js
      objectSnapshot.js
      serializer.js
      commands/
        CommandManager.js
        AddObjectCommand.js
        ModifyObjectCommand.js
        RemoveObjectCommand.js
        ReorderCommand.js
        BatchCommand.js
        MultiCommand.js
    ui/                      # UI 层（工具栏/面板/弹窗/快捷键）
      toolbar.js
      inspectorPanel.js
      shortcuts.js
      modal.js
      layersPanel.js
    fabric/                  # Fabric 入口与扩展（序列化增强）
      fabricGlobal.js
      extendObjectSerialization.js
    utils/                   # 小工具
      dom.js
      id.js
  styles/                    # 样式拆分（当前页面未默认 link，可按需启用）
  svg/                       # 图标资源
```

## 5. 核心设计说明

### 5.1 命令模式（Undo/Redo）

- `CommandManager` 维护 `undoStack/redoStack`。
- UI 的行为（创建/删除/粘贴/导入等）统一转为 `Command`，通过 `commandManager.execute(cmd)` 执行。
- 回放期间（undo/redo）用 `commandManager.isReplaying` 防止“回放触发事件 -> 再次写入历史”。

### 5.2 Fabric 交互事件捕获

- 变换（移动/缩放/旋转）：
  - `mouse:down` 时记录 before 快照
  - `object:modified` 时记录 after 快照并生成 `ModifyObjectCommand`
- 文本编辑：
  - `text:editing:entered` 记录 before
  - `text:editing:exited` 生成文本修改命令

### 5.3 自由绘制与橡皮擦

- `shortcuts.js` 在 `canvas.__drawing` 上暴露绘制控制器（toolbar 通过它切换 brush/eraser 与绘制模式）。
- `main.js` 监听：
  - `path:created`：把新 path 作为一次 `AddObjectCommand` 入栈
  - `erasing:start/end`：开始时缓存所有对象快照，结束时把发生变化的对象聚合为 `BatchCommand(ModifyObjectCommand[])` 入栈
