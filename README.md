# 武汉大学数学与统计学院 · 本科试卷归档

开源静态站，集中归档武大数统院**本科**历年试卷。仅收录 **LaTeX 排版 PDF**。

## 目录结构

```
whu-math-exams/
├── index.html                 # 网站单页入口
├── style/
│   ├── css/style.css
│   └── js/app.js              # 列表渲染 + 嵌入式 PDF 预览（PC 用 iframe，移动端用 PDF.js）
├── data/
│   ├── courses.json           # 7 大分类 + 课程清单
│   └── exams.json             # 集中维护：所有试卷元数据
├── exams/                     # PDF 文件
│   ├── 01-foundation/
│   ├── 02-analysis-pde/
│   ├── 03-algebra-numbertheory/
│   ├── 04-geometry-topology/
│   ├── 05-probability-statistics/
│   ├── 06-applied-computational/
│   └── 07-zhongfa-class/
└── README.md                  # 项目说明
```

## 一级分类（固定）

1. 基础课程（数分、高代等）
2. 分析与微分方程
3. 代数与数论
4. 几何与拓扑
5. 概率与统计
6. 应用与计算数学
7. 中法班

## 元数据字段（exams.json 每条记录）

| 字段 | 必填 | 说明 |
|---|---|---|
| `id`            | ✅ | 全局唯一，建议 `课程slug_学年-学期_类型_教师` |
| `category_id`   | ✅ | 对应 courses.json 的一级分类 id |
| `course_slug`   | ✅ | 对应 courses.json 课程 slug |
| `course_name_cn`| ✅ | 中文课程名（同实异名课分别立条目，不合并） |
| `course_level`  | ✅ | 当前固定 `undergraduate` |
| `academic_year` | ⭕ | 如 `2023-2024`，未知则留空 |
| `semester`      | ⭕ | `1` 或 `2`，未知则留空 |
| `exam_type`     | ✅ | `final` / `midterm` / `makeup` / `mock` / `quiz` |
| `teacher`       | ⭕ | 任课教师，公开展示；多教师用 `&` 连接（如 `高付清&王冉`） |
| `file_path`     | ✅ | 仓库内 PDF 相对路径 |
| `sha256`        | ⭕ | 防重复 |

## 文件命名规范

`课程名_学年-学期_类型_教师姓名.pdf`
示例：`概率论_2023-2024-1_期末_张三.pdf`

同课程 + 同学期 + 不同教师 → 用教师姓名区分。
同一份试卷有多位授课教师时用 `&` 连接，例如：`代数学2_2025-2026-2_期末_汪春晖&涂玉平.pdf`。

## 部署（Railway · 静态）

仓库根目录添加 `Caddyfile`：

```
:{$PORT}
root * .
file_server
try_files {path} /index.html
```

Railway 使用根目录 `Dockerfile` 构建 Caddy 静态站点。

## 贡献流程

外部贡献者**不直接提交 PR**：将 LaTeX 排版的 PDF 与所需字段（见上表）发给项目维护者，由维护者统一入库。

仓库地址：`https://github.com/miracleyang-dev/whu-math-exams`

## 本地新增或重新生成 PDF 后需要同步修改

1. 将真实 PDF 文件放入 `exams/<category_id>/<course_slug>/`，文件名遵守上方命名规范。
2. 在 `data/exams.json` 新增或更新对应记录，至少同步 `id`、`category_id`、`course_slug`、`course_name_cn`、`course_level`、`exam_type`、`file_path`、`sha256`。
3. 若是新增课程或分类，先同步更新 `data/courses.json`，并创建对应 `exams/` 子目录。
4. 若重命名或替换 PDF，必须同步更新 `data/exams.json` 中的 `file_path` 与 `sha256`。

## License / 使用说明

- 本仓库资料仅供学习参考，无法保证内容完全无错误；使用前请自行核对。
- 绝大多数资料来源于供需群同学整理分享，若有侵权或不适合公开归档的内容，请联系维护者处理。
- 转载、改编或二次分发时，请保留来源说明，并遵守原整理者与相关课程资料的使用边界。
