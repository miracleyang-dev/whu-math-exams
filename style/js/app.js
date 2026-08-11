// 静态站：读取 courses.json + exams.json，渲染分类+列表，搜索 & 嵌入式 PDF 预览
function replaceWithMessage(target, className, message) {
  const node = document.createElement('div');
  node.className = className;
  node.textContent = message;
  target.replaceChildren(node);
}

window.addEventListener('error', e => {
  if (e.target && e.target !== window) return;
  const list = document.getElementById('exam-list');
  if (list) replaceWithMessage(list, 'error', `JS 错误: ${e.message}\n${e.filename}:${e.lineno}`);
});

(async () => {
  const nav = document.getElementById('categories');
  const list = document.getElementById('exam-list');
  const search = document.getElementById('search');

  let courses, exams;
  try {
    const [cR, eR] = await Promise.all([
      fetch('data/courses.json'),
      fetch('data/exams.json')
    ]);
    if (!cR.ok) throw new Error('courses.json HTTP ' + cR.status);
    if (!eR.ok) throw new Error('exams.json HTTP ' + eR.status);
    courses = await cR.json();
    exams = await eR.json();
  } catch (err) {
    nav.replaceChildren();
    replaceWithMessage(list, 'error', `加载失败：${err.message}\n请确认 data/courses.json 与 data/exams.json 可访问。`);
    console.error('[app.js] load failed', err);
    return;
  }

  const categories = courses.categories;
  const allExams = exams.exams;

  // ---- Stats ----
  const totalCourses = categories.reduce((n, c) => n + c.courses.length, 0);
  document.getElementById('stat-course').textContent = totalCourses;
  document.getElementById('stat-exam').textContent = allExams.length;
  document.getElementById('stat-cat').textContent = categories.length;

  // ---- Sidebar ----
  function buildSidebar() {
    nav.replaceChildren();
    categories.forEach(cat => {
      const examsInCat = allExams.filter(e => e.category_id === cat.id).length;
      const grp = document.createElement('div');
      grp.className = 'cat-group';

      const title = document.createElement('div');
      title.className = 'cat-title';
      title.append(document.createTextNode(cat.name));

      const count = document.createElement('span');
      count.className = 'count';
      count.textContent = examsInCat;
      title.append(count);
      grp.append(title);

      cat.courses.forEach(course => {
        const cnt = allExams.filter(e => e.course_slug === course.slug).length;
        const link = document.createElement('a');
        link.href = `#${cat.id}-${course.slug}`;
        if (cnt) link.className = 'has-exam';

        const name = document.createElement('span');
        name.textContent = course.name;
        link.append(name);

        if (cnt) {
          const badge = document.createElement('span');
          badge.className = 'badge';
          badge.textContent = cnt;
          link.append(badge);
        }

        grp.append(link);
      });

      nav.append(grp);
    });
  }

  // ---- Main list ----
  function render(filterFn) {
    list.replaceChildren();

    categories.forEach((cat, idx) => {
      const sec = document.createElement('section');
      sec.className = 'cat-section';
      sec.id = cat.id;

      const heading = document.createElement('h2');
      const index = document.createElement('span');
      index.className = 'index';
      index.textContent = `0${idx + 1}`;
      heading.append(index, document.createTextNode(cat.name));
      sec.append(heading);

      let hasCourseBlocks = false;
      cat.courses.forEach(course => {
        const exs = allExams
          .filter(e => e.course_slug === course.slug)
          .filter(filterFn || (() => true))
          .sort((a, b) => ((b.academic_year || '') + (b.semester || '')).localeCompare((a.academic_year || '') + (a.semester || '')));
        if (!exs.length && filterFn) return;

        sec.append(createCourseBlock(cat, course, exs));
        hasCourseBlocks = true;
      });

      if (hasCourseBlocks) list.append(sec);
    });

    if (!list.children.length) {
      const sec = document.createElement('section');
      sec.className = 'cat-section';
      replaceWithMessage(sec, 'empty', '未找到匹配结果');
      list.append(sec);
    }
  }

  function createCourseBlock(cat, course, exs) {
    const block = document.createElement('div');
    block.className = 'course-block';
    block.id = `${cat.id}-${course.slug}`;

    const title = document.createElement('h3');
    title.append(document.createTextNode(course.name));
    if (exs.length) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = `${exs.length} 份`;
      title.append(tag);
    }
    block.append(title);

    if (!exs.length) {
      replaceWithMessage(block, 'empty', '暂无试卷');
      block.prepend(title);
      return block;
    }

    exs.forEach(e => block.append(createExamRow(e, course)));
    return block;
  }

  function createExamRow(e, course) {
    const row = document.createElement('div');
    row.className = 'exam-row';

    const year = document.createElement('span');
    year.className = 'year';
    year.textContent = formatTimeLabel(e);

    const meta = document.createElement('span');
    meta.className = 'meta';
    const type = document.createElement('span');
    type.className = 'type';
    type.textContent = labelType(e.exam_type);
    meta.append(type);
    if (e.teacher) meta.append(document.createTextNode('任课：' + e.teacher));

    const actions = document.createElement('span');
    actions.className = 'actions';
    const filePath = safePdfPath(e.file_path);

    if (filePath) {
      const preview = document.createElement('a');
      preview.className = 'btn primary preview';
      preview.href = filePath;
      preview.dataset.path = filePath;
      preview.dataset.title = `${course.name} · ${formatTimeLabel(e)} · ${labelType(e.exam_type)}${e.teacher ? ' · ' + e.teacher : ''}`;
      preview.textContent = '预览';

      const download = document.createElement('a');
      download.className = 'btn';
      download.href = filePath;
      download.download = '';
      download.textContent = '下载';

      actions.append(preview, download);
    } else {
      const error = document.createElement('span');
      error.className = 'path-error';
      error.textContent = '路径无效';
      actions.append(error);
    }

    row.append(year, meta, actions);
    return row;
  }

  function safePdfPath(filePath) {
    const value = String(filePath || '');
    if (!value.startsWith('exams/')) return '';
    if (!value.toLowerCase().endsWith('.pdf')) return '';
    if (value.startsWith('//') || value.includes('://')) return '';
    return value;
  }

  function labelType(t) {
    return ({ final: '期末', midterm: '期中', mock: '模拟', quiz: '小测' })[t] || t;
  }

  function formatTimeLabel(e) {
    if (!e.academic_year && !e.semester) return '时间未知';
    if (e.academic_year && e.semester) return `${e.academic_year} · 学期 ${e.semester}`;
    return e.academic_year || `学期 ${e.semester}`;
  }

  buildSidebar();
  render();

  // ---- Search ----
  let timer;
  const mobileQuery = window.matchMedia('(max-width: 860px)');
  function syncMobileSearchState() {
    const active = mobileQuery.matches && (document.activeElement === search || search.value.trim() !== '');
    document.body.classList.toggle('search-active', active);
  }
  search.addEventListener('focus', syncMobileSearchState);
  search.addEventListener('blur', () => setTimeout(syncMobileSearchState, 0));
  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', syncMobileSearchState);
  } else {
    mobileQuery.addListener(syncMobileSearchState);
  }
  search.addEventListener('input', () => {
    syncMobileSearchState();
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = search.value.trim().toLowerCase();
      if (!q) return render();
      const courseMatch = new Set(
        categories.flatMap(c => c.courses)
          .filter(c => String(c.name || '').toLowerCase().includes(q) || String(c.slug || '').includes(q))
          .map(c => c.slug)
      );
      render(e =>
        courseMatch.has(e.course_slug) ||
        (e.teacher || '').toLowerCase().includes(q) ||
        (e.academic_year || '').includes(q) ||
        String(e.semester || '').includes(q)
      );
    }, 120);
  });

  // ---- PDF viewer ----
  const pdfjsMobileQuery = window.matchMedia('(max-width: 860px)');
  const pdfjsCandidates = [
    {
      script: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.min.js',
      worker: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js'
    },
    {
      script: 'https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.min.js',
      worker: 'https://unpkg.com/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js'
    },
    {
      script: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      worker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    }
  ];
  let pdfRenderToken = 0;
  let pdfjsLoadPromise;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`PDF.js 加载失败：${src}`));
      document.head.append(script);
    });
  }

  async function ensurePdfjsLoaded() {
    if (window.pdfjsLib) {
      if (window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsCandidates[0].worker;
      }
      return window.pdfjsLib;
    }
    if (pdfjsLoadPromise) return pdfjsLoadPromise;

    pdfjsLoadPromise = (async () => {
      const errors = [];
      for (const candidate of pdfjsCandidates) {
        try {
          await loadScript(candidate.script);
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = candidate.worker;
            return window.pdfjsLib;
          }
          errors.push(candidate.script);
        } catch (err) {
          errors.push(err.message);
        }
      }
      throw new Error(`PDF.js 加载失败，请检查网络后重试。已尝试 ${errors.length} 个来源。`);
    })().catch(err => {
      pdfjsLoadPromise = null;
      throw err;
    });

    return pdfjsLoadPromise;
  }

  function setViewerMessage(className, message) {
    const frame = document.getElementById('viewer-frame');
    const container = document.getElementById('viewer-pdfjs');
    frame.hidden = true;
    frame.src = '';
    container.hidden = false;
    replaceWithMessage(container, className, message);
  }

  async function assertPdfResponse(filePath) {
    const response = await fetch(filePath, {
      headers: { Range: 'bytes=0-255' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`PDF 请求失败（HTTP ${response.status}）`);

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 256));
    const prefix = new TextDecoder('utf-8').decode(bytes);
    if (prefix.startsWith('version https://git-lfs.github.com/spec/v1')) {
      throw new Error('部署环境返回的是 Git LFS 指针文件，不是真实 PDF');
    }
    if (!prefix.startsWith('%PDF-')) {
      throw new Error('服务器返回的不是 PDF 文件');
    }
  }

  async function renderPdfMobile(filePath, token) {
    const container = document.getElementById('viewer-pdfjs');
    replaceWithMessage(container, 'pdfjs-loading', '加载中…');
    try {
      const pdfjs = await ensurePdfjsLoaded();
      if (token !== pdfRenderToken) return;
      const pdf = await pdfjs.getDocument({
        url: filePath,
        disableStream: false,
        disableAutoFetch: false,
        isEvalSupported: false
      }).promise;
      if (token !== pdfRenderToken) return;

      container.replaceChildren();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(container.clientWidth - 16, 240);
      const pages = [];

      const renderPage = async (entry) => {
        if (entry.rendered || entry.rendering || token !== pdfRenderToken) return;
        entry.rendering = true;
        try {
          const page = await pdf.getPage(entry.index);
          if (token !== pdfRenderToken) return;
          const viewport = page.getViewport({ scale: 1 });
          const scale = width / viewport.width;
          const scaled = page.getViewport({ scale: scale * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = Math.ceil(scaled.width);
          canvas.height = Math.ceil(scaled.height);
          canvas.style.width = (scaled.width / dpr) + 'px';
          canvas.style.height = (scaled.height / dpr) + 'px';
          entry.host.replaceChildren(canvas);
          await page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport: scaled }).promise;
          entry.host.classList.add('is-rendered');
          entry.rendered = true;
        } finally {
          entry.rendering = false;
        }
      };

      for (let i = 1; i <= pdf.numPages; i++) {
        const host = document.createElement('div');
        host.className = 'pdfjs-page';
        host.textContent = `第 ${i} 页`;
        container.append(host);
        pages.push({ index: i, host, rendered: false, rendering: false });
      }

      if (window.IntersectionObserver) {
        const observer = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const page = pages.find(item => item.host === entry.target);
              if (page) renderPage(page).catch(() => {});
            }
          });
        }, { root: container, rootMargin: '800px 0px' });
        pages.forEach(page => observer.observe(page.host));
      } else {
        for (const page of pages) await renderPage(page);
      }
      if (pages[0]) await renderPage(pages[0]);
    } catch (err) {
      if (token !== pdfRenderToken) return;
      setViewerMessage('pdfjs-error', `预览失败：${err.message}。可点击下载或在线预览。`);
    }
  }

  document.addEventListener('click', async ev => {
    const a = ev.target.closest('a.preview');
    if (!a) return;
    ev.preventDefault();
    const filePath = safePdfPath(a.dataset.path);
    if (!filePath) return;
    const viewerUrl = filePath + '#toolbar=1&navpanes=0&view=FitH';
    const frame = document.getElementById('viewer-frame');
    const pdfjsBox = document.getElementById('viewer-pdfjs');
    const token = ++pdfRenderToken;
    document.getElementById('viewer-title').textContent = a.dataset.title;
    document.getElementById('viewer-download').href = filePath;
    document.getElementById('viewer-online').href = viewerUrl;
    document.getElementById('viewer-modal').hidden = false;
    document.body.style.overflow = 'hidden';
    setViewerMessage('pdfjs-loading', '加载中…');

    try {
      await assertPdfResponse(filePath);
    } catch (err) {
      if (token !== pdfRenderToken) return;
      setViewerMessage('pdfjs-error', `预览失败：${err.message}。可点击下载或在线预览。`);
      return;
    }
    if (token !== pdfRenderToken) return;

    if (pdfjsMobileQuery.matches) {
      frame.hidden = true;
      frame.src = '';
      pdfjsBox.hidden = false;
      renderPdfMobile(filePath, token);
    } else {
      pdfjsBox.hidden = true;
      pdfjsBox.replaceChildren();
      frame.hidden = false;
      frame.src = '';
      requestAnimationFrame(() => { frame.src = viewerUrl; });
    }
  });
  document.getElementById('viewer-close').onclick = closeViewer;
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeViewer(); });
  function closeViewer() {
    const frame = document.getElementById('viewer-frame');
    const pdfjsBox = document.getElementById('viewer-pdfjs');
    document.getElementById('viewer-modal').hidden = true;
    pdfRenderToken++;
    frame.src = '';
    pdfjsBox.replaceChildren();
    document.body.style.overflow = '';
  }
})();
