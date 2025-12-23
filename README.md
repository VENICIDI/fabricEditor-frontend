# Fabric.js 画布编辑器 MVP（前端）

 本仓库为**纯前端单页**实现，入口为 `editor.html`。

## 启动方式（cdn引入 Fabric.js）

1. 打开页面：

   - 直接用浏览器打开 `editor.html`（或用任意静态服务器打开也可以）。

如果 Fabric.js 没有正确加载，页面会提示“Fabric.js 未加载”。

## MVP 功能清单

- **对象创建**
  - 矩形、圆形、文本（IText）、图片（URL / 本地文件）
- **对象编辑**
  - 选择后可拖拽移动/缩放/旋转
  - 修改 `fill / stroke / strokeWidth / opacity`
  - 文本修改 `text / fontSize`（双击进入编辑）
- **图层/排列**
  - 置顶/置底/上移/下移
- **复制/粘贴/删除**
- **Undo / Redo**
  - 所有上述操作均可撤销/重做
  - 高频交互（拖拽/缩放/旋转）仅在 `object:modified`（结束时）入栈，避免卡顿
  - `isReplaying` 防止 undo/redo 回放时再次生成历史
- **导入/导出 JSON**
  - 导出包含 `data.id` 等自定义字段
  - 导入会清空画布并清空历史（MVP 策略）

## 快捷键

- **Undo**：macOS `⌘Z` / Windows `Ctrl+Z`
- **Redo**：macOS `⌘Y` / Windows `Ctrl+Y`
- **复制/粘贴**：`⌘/Ctrl+C`、`⌘/Ctrl+V`
- **删除**：`Delete` / `Backspace`（输入框聚焦时不触发）
