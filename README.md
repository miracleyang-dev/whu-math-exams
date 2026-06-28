# 武汉大学数学与统计学院 · 本科试卷归档

开源静态站，集中归档武大数统院**本科**历年试卷。仅收录 **LaTeX 排版 PDF**（或 LaTeX 源码编译产物），不收扫描件。

## 目录结构

```
.
├── index.html              # 单页入口
├── css/style.css
├── js/app.js               # 列表渲染 + 嵌入式 PDF 预览
├── data/
│   ├── courses.json        # 6 大分类 + 课程清单（结构基本不变）
│   └── exams.json          # 集中维护：所有试卷元数据
├── exams/                  # PDF 文件（普通 Git 文件，不使用 Git LFS）
│   ├── 01-foundation/
│   ├── 02-analysis-pde/
│   ├── 03-algebra-numbertheory/
│   ├── 04-geometry-topology/
│   ├── 05-probability-statistics/
│   └── 06-applied-computational/
└── latex/                  # 可选：LaTeX 源码（未来启用）
```

## 一级分类（固定）

1. 基础课程（仅数学分析、高等代数）
2. 分析与微分方程
3. 代数与数论
4. 几何与拓扑
5. 概率与统计
6. 应用与计算数学

## 按模块贡献分工

| 模块 | 主要课程范围 | 负责人 |
|---|---|---|---|
| 基础课程 | 数学分析、高等代数 | 待定 |
| 分析与微分方程 | 实变、复变、泛函、常微分、偏微分等 | 待定 |
| 代数与数论 | 抽象代数、近世代数、数论、表示论等 | 待定 |
| 几何与拓扑 | 解析几何、微分几何、拓扑、黎曼几何等 | 待定 |
| 概率与统计 | 概率论、数理统计、随机过程 | 待定 |
| 应用与计算数学 | 数值分析、优化、运筹、建模、计算机类课程等 | 待定 |

## 元数据字段（exams.json 每条记录）

| 字段 | 必填 | 说明 |
|---|---|---|
| `id`            | ✅ | 全局唯一，建议 `课程slug_学年-学期_类型_教师` |
| `category_id`   | ✅ | 对应 courses.json 的一级分类 id |
| `course_slug`   | ✅ | 对应 courses.json 课程 slug |
| `course_name_cn`| ✅ | 中文课程名（同实异名课分别立条目，不合并） |
| `course_level`  | ✅ | 当前固定 `undergraduate` |
| `academic_year` | ✅ | 如 `2023-2024` |
| `semester`      | ✅ | `1` 或 `2` |
| `exam_type`     | ✅ | `final` / `midterm` / `makeup` / `mock` |
| `teacher`       | ⭕ | 任课教师，公开展示 |
| `file_path`     | ✅ | 仓库内 PDF 相对路径 |
| `sha256`        | ⭕ | 防重复 |

## 文件命名规范

`课程名_学年-学期_类型_教师姓名.pdf`
示例：`概率论_2023-2024-1_期末_张三.pdf`

同课程 + 同学期 + 不同教师 → 用教师姓名区分。

## 部署（Railway · 静态）

仓库根目录添加 `Caddyfile`：

```
:{$PORT}
root * .
file_server
try_files {path} /index.html
```

Railway 使用根目录 `Dockerfile` 构建 Caddy 静态站点。仓库已移除 Git LFS：不要再配置 `git lfs install`、`git lfs pull`、Nixpacks Build Command 或其他 LFS 相关构建步骤。

### Railway 同步操作

1. 将移除 LFS 后的提交推送到 GitHub 默认分支。
2. 在 Railway 项目中确认服务仍连接该 GitHub 仓库/分支。
3. 如曾手动配置过 LFS 相关 Build Command/Start Command，删除这些自定义命令，让 Railway 使用仓库根目录 `Dockerfile`。
4. 触发一次 Redeploy；之后 GitHub 新提交会按 Railway 的 GitHub 集成自动同步部署。

## 贡献流程

外部贡献者**不直接提交 PR**：将 LaTeX 排版的 PDF 与所需字段（见上表）发给项目维护者，由维护者统一入库。

仓库地址：`https://github.com/<owner>/whu-math-exams`

## 本地新增或重新生成 PDF 后需要同步修改

1. 将真实 PDF 文件放入 `exams/<category_id>/<course_slug>/`，文件名遵守上方命名规范。
2. 在 `data/exams.json` 新增或更新对应记录，至少同步 `id`、`category_id`、`course_slug`、`course_name_cn`、`course_level`、`academic_year`、`semester`、`exam_type`、`file_path`、`sha256`。
3. 若是新增课程或分类，先同步更新 `data/courses.json`，并创建对应 `exams/` 子目录。
4. 若重命名或替换 PDF，必须同步更新 `data/exams.json` 中的 `file_path` 与 `sha256`。
5. 不需要修改 `.gitattributes`，也不需要执行任何 `git lfs` 命令；直接提交 PDF 与 JSON 变更即可。

## 资源存储方案

- **当前**：仅 PDF（轻量、维护成本最低）
- **未来可选**：LaTeX 源码同步入库（`latex/` 目录预留）

## License / 使用说明

- 本仓库资料仅供学习参考，无法保证内容完全无错误；使用前请自行核对。
- 绝大多数资料来源于供需群同学整理分享，若有侵权或不适合公开归档的内容，请联系维护者处理。
- 转载、改编或二次分发时，请保留来源说明，并遵守原整理者与相关课程资料的使用边界。
