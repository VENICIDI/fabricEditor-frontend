
# Fabric.js 画布编辑器 MVP 设计文档

## 1. 背景与目标

实现一个基于 Fabric.js 的画布编辑器 MVP，覆盖常见“基础操作”，并重点给出 **undo/redo** 的可扩展设计，确保在常规对象规模下交互与渲染不卡顿。

### 1.1 MVP 目标

- **可视化编辑**
  - 在画布上创建/选择/移动/缩放/旋转对象。
  - 支持基础图形与文本的编辑。
- **自由绘制（Free Drawing）**
  - 支持画笔自由绘制（可切换画笔颜色/粗细），并可撤销/重做。
- **基础操作完整闭环**
  - 图层管理（上移/下移、置顶/置底）、删除、复制粘贴、对齐/分布（MVP 可先实现常用对齐）。
- **可用的 undo/redo**
  - 记录用户动作并可回退/重做。
  - 可配置动作合并（例如拖拽连续移动合并为一次）。
- **性能与稳定性**
  - 避免“每次操作全量序列化并写入栈”的低效方式。
  - 在高频交互（拖拽/缩放）时保持顺畅。

### 1.2 非目标（明确不做）

- **多人协作/实时同步**（后续能力）。
- **复杂滤镜/矢量布尔运算/高级排版**。
- **持久化到服务端**（MVP 可先本地导入/导出 JSON）。

## 2. 用户故事（MVP）

- **创建对象**：我可以添加矩形/圆形/图片/文本到画布。
- **编辑对象**：我可以选择对象并移动/缩放/旋转；编辑文本内容；修改填充色/描边。
- **层级操作**：我可以将对象置顶/置底、上移/下移。
- **复制与删除**：我可以复制粘贴对象，或删除对象。
- **撤销重做**：我可以撤销/重做上述所有操作，回到任意历史状态。
- **导入导出**：我可以导出当前画布为 JSON 并可重新导入恢复。
- **自由绘制**：我可以使用画笔在画布上绘制路径，并可撤销/重做。

## 3. 技术选型与约束

- **渲染引擎**：Fabric.js（2.x/5.x 均可，MVP 以 API 可用为准）。
- **运行形态**：优先单页（本仓库当前为 `editor.html`），后续可演进到工程化（Vite/React 等）。
- **性能原则**
  - 高频交互仅记录“差量动作”，避免频繁全量 `canvas.toJSON()`。
  - 仅在必要时触发 `canvas.requestRenderAll()`。
  - undo/redo 栈有上限（避免内存无限增长）。

## 4. 总体架构

### 4.1 模块划分（建议）

- **CanvasHost**
  - 负责初始化 Fabric Canvas、尺寸自适应、事件绑定。
- **ToolController**
  - 管理当前工具（选择/绘制形状/插入文本/插入图片）。
  - 将 UI 意图转成“编辑动作”。
- **SelectionManager**
  - 统一处理选区变化、活动对象/多选、锁定/可选等。
- **CommandManager（核心）**
  - 执行命令、记录历史、undo/redo、合并策略。
- **Serializer**
  - 导入/导出 JSON（含自定义属性白名单）。
- **UI Layer（Toolbar / Inspector）**
  - 仅派发意图事件，不直接操作 Fabric（避免逻辑分散）。

### 4.2 关键设计模式

#### 4.2.1 Command Pattern（命令模式）

- 将“用户意图”抽象为命令对象，由 `CommandManager` 统一执行与入栈。
- 命令是 **唯一** 修改画布状态的入口（UI 不直接调用 Fabric API）。
- undo/redo 通过命令的 `undo/redo` 保证可逆与一致性。

#### 4.2.2 Factory Pattern（工厂模式）

MVP 中建议引入轻量的工厂层，避免“UI/工具里到处 new FabricObject/new Command”的耦合。

- **ObjectFactory（对象工厂）**
  - 输入：业务类型与初始化参数（如 `rect` + `{width,height,fill}`）。
  - 输出：带统一元数据的 Fabric Object（包含稳定 `data.id`、默认样式、可序列化字段）。
  - 好处：
    - 统一默认值与 `data` 扩展字段写入。
    - 未来新增对象类型（箭头/多边形/贴纸）无需改动 UI。

- **CommandFactory（命令工厂）**
  - 输入：高层意图（如 `deleteSelection`/`setFill`/`bringForward`）与必要上下文。
  - 输出：具体 `Command`（必要时包装为 `MultiCommand`）。
  - 好处：
    - 让命令创建逻辑集中，降低 `ToolController/Inspector` 的复杂度。
    - 便于对同类操作统一做合并策略、字段裁剪（before/after state）。

- **ToolFactory（工具工厂，可选）**
  - 输入：工具 id（select/rect/text/pen）。
  - 输出：具备一致生命周期的 tool 实例（`activate/deactivate/onMouseDown/...`）。
  - 好处：工具可插件化注册，便于后续扩展。

### 4.3 数据流（事件流）

1. UI 触发意图（例如“删除”、“置顶”、“添加矩形”）。
2. ToolController/SelectionManager 将意图映射为 `Command`。
3. CommandManager 统一 `execute(command)`：
   - 对 Fabric Canvas 应用变更
   - 记录历史（undo 栈）
   - 清空 redo 栈
4. Canvas 触发渲染（必要时）与 UI 状态刷新（选中对象属性、图层列表等）。

补充：

- **创建类意图**：UI -> ToolController -> ObjectFactory -> AddObjectCommand -> CommandManager
- **属性修改意图**：UI(Inspector) -> CommandFactory(ModifyObjectCommand) -> CommandManager
- **自由绘制意图**：UI(选择画笔) -> ToolController(Pen) -> AddPathCommand(或 AddObjectCommand) -> CommandManager

## 5. 界面设计（布局与交互）

本项目采用典型“三栏 + 顶栏”布局：

- **左侧工具栏（Tools Sidebar）**
  - 负责“模式切换/工具选择”：选择、矩形、圆形、文本、图片、画笔（自由绘制）、橡皮（可选）。
  - 交互约定：
    - 工具切换仅改变 `ToolController` 当前工具，不直接改画布。
    - 工具激活时可更新鼠标样式与状态提示。

- **上侧工具栏（Top Toolbar）**
  - 负责“对当前选择/画布的全局操作”：
    - undo/redo
    - copy/paste/delete
    - bring forward/send backward/bring to front/send to back
    - import/export
  - 交互约定：
    - 所有按钮都派发意图给 `CommandManager`（或经 `CommandFactory` 构造命令）。

- **中间画布（Canvas Stage）**
  - Fabric Canvas 的宿主区域。
  - 支持：
    - 选择/框选（可选）
    - 对象变换（move/scale/rotate）
    - 自由绘制模式下的路径绘制
  - 交互约定：
    - 变换类操作仅在结束事件（如 `object:modified`）时生成命令入栈。

- **右侧属性面板（Inspector / Properties Panel）**
  - 展示并编辑当前选择对象的属性；无选择时展示画布属性或空态。
  - 交互约定：
    - 面板修改通过 `ModifyObjectCommand`（或合并策略）入栈，而不是直接 set 属性。
    - 对于连续拖动的输入（例如 opacity slider），建议节流并启用命令合并。

## 6. 画布对象模型与约定

### 6.1 对象 id 与元数据

- 每个 Fabric Object 必须有稳定 id：`obj.data.id`（或 `obj.id`，取决于 Fabric 版本支持）。
- 建议统一扩展字段：
  - `data.id`：uuid
  - `data.type`：业务类型（rect/text/image 等）
  - `data.locked`：锁定

### 6.2 序列化白名单

Fabric 的 `toObject`/`toJSON` 需要把自定义字段加入白名单，避免导入后丢失 `data.id` 等关键字段。

### 6.3 多选与组

- MVP 建议优先支持 ActiveSelection 多选变换。
- 对“组（group）”先作为后续增强（避免 undo/redo 复杂度过高）。

## 7. 功能拆解（到可实现任务粒度）

### 7.1 画布基础

- **初始化**
  - 创建 Fabric Canvas、设置背景色、启用 retina scaling。
  - 处理容器 resize（自适应缩放或重设尺寸，MVP 可先重设 canvas 尺寸）。
- **对象选择**
  - 点击选中、空白取消选中。
  - 多选（Shift/框选）——可选，若时间紧可延后。

### 7.2 对象创建

- **矩形**：默认尺寸与样式；创建后自动选中。
- **圆形**：同上。
- **文本**：插入 IText/Textbox；双击进入编辑。
- **图片**：通过 URL 或本地文件加载（MVP 二选一）；创建后可拖拽缩放。

### 7.3 对象编辑（属性面板）

- **通用**
  - 填充色 `fill`
  - 描边色 `stroke`、描边宽度 `strokeWidth`
  - 透明度 `opacity`
- **文本**
  - 字号 `fontSize`
  - 字体 `fontFamily`（可选）

### 7.4 图层与排列

- **删除**：删除当前选中对象（或多选对象）。
- **复制粘贴**：复制对象并偏移一定像素。
- **层级调整**
  - 置顶/置底
  - 上移一层/下移一层

### 7.5 自由绘制（Free Drawing）

- 进入画笔模式后启用 Fabric 的自由绘制能力（或自定义 path 绘制）。
- 画笔属性：颜色、粗细（MVP 只做最常用的 2 个参数）。
- 绘制完成后生成“新增路径”的命令：
  - do：add path
  - undo：remove path
  - redo：add path

### 7.6 导入导出

- **导出 JSON**：包含自定义字段。
- **导入 JSON**：恢复对象、恢复选择（可不恢复）、渲染。

## 8. Undo/Redo 设计（重点）

### 8.1 核心原则

- 采用 **Command Pattern（命令模式）**，每个用户动作对应一个可回滚的命令。
- 高频交互（拖拽/缩放/旋转）不记录每一帧，而是在交互结束时记录“起始状态 -> 结束状态”的差量。
- redo 栈遵循常规编辑器规则：执行新命令时清空 redo 栈。

### 8.2 Command 接口（抽象）

每个命令满足：

- `do()`：应用变更
- `undo()`：回滚变更
- `redo()`：通常等同于 `do()` 或重新应用保存的 after state
- `canMerge(next)` / `merge(next)`：可选，用于动作合并
- `label`：用于 UI 展示（可选）

### 8.3 历史栈结构

- `undoStack: Command[]`
- `redoStack: Command[]`
- `maxHistory`：例如 100（可配置）

执行规则：

- `execute(cmd)`
  - `cmd.do()`
  - 若可与栈顶合并：`undoStack[top].merge(cmd)`，否则 push
  - 清空 `redoStack`
  - 超过 `maxHistory` 时丢弃最早记录
- `undo()`
  - pop undoStack -> `cmd.undo()` -> push 到 redoStack
- `redo()`
  - pop redoStack -> `cmd.redo()` -> push 到 undoStack

### 8.4 命令分类（MVP 必须覆盖）

- **AddObjectCommand**
  - do：`canvas.add(obj)`
  - undo：`canvas.remove(obj)`
- **RemoveObjectCommand**
  - do：remove
  - undo：add（需保存对象引用或对象 JSON 并可重建）
- **ModifyObjectCommand（关键）**
  - 用于移动/缩放/旋转/属性变化
  - 保存 `before` 与 `after`（对象属性的子集，或对象完整 `toObject()` 快照）
  - undo：apply(before)
  - redo：apply(after)
- **ReorderCommand**
  - 用于置顶/置底/上下移
  - 保存操作前后的 index / zOrder
- **MultiCommand（可选）**
  - 多对象批量操作时打包成一个命令（例如多选删除、对齐）

- **AddPathCommand（自由绘制）**
  - do：`canvas.add(path)`
  - undo：`canvas.remove(path)`
  - 备注：也可复用 AddObjectCommand，将 path 视为 object 的一种

### 8.5 动作捕获策略（Fabric 事件到命令）

Fabric 常用事件（以版本差异为准）：

- `object:modified`：移动/缩放/旋转结束（适合落盘 ModifyObjectCommand）
- `object:moving` / `object:scaling` / `object:rotating`：过程事件（不入历史，仅用于 UI 实时显示）
- `object:added` / `object:removed`：对象增删（注意：程序化添加也会触发，需要区分“用户动作” vs “undo/redo 回放”）

推荐做法：

- 在交互开始（例如 `mouse:down` 命中对象）记录该对象的 `beforeState`。
- 在 `object:modified` 时读取 `afterState`，生成 `ModifyObjectCommand` 并 `execute`。

### 8.6 防止“回放触发再次记录”的机制

undo/redo 回放过程中，Fabric 也可能触发 `object:added/modified` 等事件。

- 方案：CommandManager 增加 `isReplaying` 标记。
  - 回放期间：事件监听器直接返回，不生成新命令。
  - 回放结束：恢复监听。

### 8.7 合并策略（保证体验与性能）

典型需要合并的场景：

- 连续拖拽同一对象（短时间内多次 `modified`）

合并策略建议：

- 仅对 `ModifyObjectCommand` 启用合并。
- 合并条件：
  - 目标对象 id 相同
  - 修改字段集合相同（例如都是 transform 相关）
  - 时间间隔小于阈值（例如 300ms~800ms）
- 合并方式：
  - 保留最早的 `before`，更新为最新的 `after`

### 8.8 状态快照粒度选择

ModifyObjectCommand 的 state 建议只保存“必要字段”，避免对象过大：

- transform：`left/top/scaleX/scaleY/angle/skewX/skewY/flipX/flipY/originX/originY`
- style：`fill/stroke/strokeWidth/opacity`
- text：`text/fontSize/fontFamily/fontWeight/fontStyle/textAlign/underline/linethrough`

如果实现复杂（或 Fabric 版本差异导致字段难控），MVP 可先保存对象 `toObject()` 的完整快照，但需要：

- 有历史上限
- 合并策略
- 避免在移动过程中频繁生成快照

## 9. 性能策略（MVP）

- **渲染触发控制**
  - 批量操作用 `canvas.renderOnAddRemove = false` + 批量完成后 `requestRenderAll()`（若版本支持）。
- **高频事件节流**
  - UI 面板的实时值（如坐标）更新使用 `requestAnimationFrame` 节流。
- **图片加载**
  - 图片对象创建前控制尺寸（最大宽高），避免超大贴图卡顿。
- **历史栈上限**
  - 限制命令数量与对象快照大小。

## 10. 风险点与边界场景

- **对象引用失效**：Remove->Undo 时若用引用，确保对象实例可重复 add；否则用 JSON 重建并保持同一 `data.id`。
- **多选操作**：多对象修改需要 MultiCommand，否则 undo/redo 体验差。
- **文本编辑**：IText 编辑过程中事件频繁，建议在编辑结束时生成命令（例如 `editing:exited`）。
- **程序化操作与用户操作混淆**：必须有 `isReplaying` 或 “source=system/user” 区分。

## 11. 里程碑拆解（按实现顺序，粒度足够小）

### Milestone A：画布骨架与选择

- 初始化 Fabric Canvas（尺寸、背景、基础配置）。
- 选中/取消选中事件贯通：UI 可获取 activeObject。

验收：能打开页面看到画布，能选中一个对象并在 UI 中看到其 id/type。

### Milestone B：对象创建与基础编辑

- 添加矩形/圆形/文本（最小可用）。
- 修改 fill/stroke/strokeWidth/opacity。

验收：创建与编辑都能立即反映在画布上。

### Milestone C：CommandManager + undo/redo（覆盖增删改）

- 定义 Command 接口与栈结构。
- AddObjectCommand、RemoveObjectCommand、ModifyObjectCommand。
- 事件捕获：移动/缩放/旋转在 `object:modified` 时入栈。
- `isReplaying` 防止回放产生新记录。

验收：

- 添加/移动/改色/删除都能 undo/redo。
- redo 栈在新操作后会清空。

### Milestone D：层级操作 + 复制粘贴

- 置顶/置底/上移/下移命令化。
- 复制粘贴命令化（AddObjectCommand 或专门 PasteCommand）。

验收：层级变化可撤销重做，复制粘贴可撤销重做。

### Milestone E：导入导出（含历史策略）

- 导出 JSON（含自定义字段）。
- 导入 JSON 后恢复对象可编辑。
- 导入视为一次命令（可选）或清空历史（MVP 二选一，需在实现时定）。

验收：导出->刷新->导入 能恢复画布内容。

## 12. MVP 验收清单（最终）

- **基础操作**
  - 添加：矩形/圆形/文本/图片（图片若时间不足可延期）。
  - 编辑：移动/缩放/旋转/改色/透明度。
  - 删除、复制粘贴、层级调整。
- **自由绘制**
  - 可切换画笔模式并绘制路径。
  - 绘制产生的路径可撤销/重做。
- **undo/redo**
  - 对上述操作全部可用。
  - 连续拖拽不会产生大量历史（合并或至少只有结束一次入栈）。
  - 不出现“undo 后触发新增历史导致栈污染”。
- **性能**
  - 连续拖拽对象无明显卡顿。
  - 历史栈有上限，不随使用无限增长。

## 13. 后续可扩展方向（非 MVP）

- **图层系统（Layers Panel）**
  - 独立的图层数据结构（与 Fabric 对象列表同步）。
  - 图层：锁定/隐藏/重命名/分组/拖拽排序。
  - 与 undo/redo 的关系：图层操作命令化（Lock/Hide/Rename/Reorder）。

- **工具与命令插件化**
  - 基于 `ToolFactory`/注册表动态添加工具。
  - 基于 `CommandFactory` 对新操作统一接入历史与合并策略。

- **更完整的选择与排版能力**
  - 多选对齐/分布、吸附参考线、标尺与网格。
