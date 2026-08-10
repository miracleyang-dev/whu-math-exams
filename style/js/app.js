// 静态站：读取 courses.json + exams.json，渲染分类+列表，搜索 & 嵌入式 PDF 预览
window.addEventListener('error', e => {
  const list = document.getElementById('exam-list');
  if (list) list.innerHTML = `<div class="error">JS 错误: ${e.message}\n${e.filename}:${e.lineno}</div>`;
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
    exams   = await eR.json();
  } catch (err) {
    nav.innerHTML = '';
    list.innerHTML = `<div class="error">加载失败：${err.message}\n请确认 data/courses.json 与 data/exams.json 可访问。</div>`;
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
    nav.innerHTML = '';
    categories.forEach(cat => {
      const examsInCat = allExams.filter(e => e.category_id === cat.id).length;
      const grp = document.createElement('div');
      grp.className = 'cat-group';
      grp.innerHTML = `
        <div class="cat-title">${cat.name}<span class="count">${examsInCat}</span></div>
      ` + cat.courses.map(c => {
        const cnt = allExams.filter(e => e.course_slug === c.slug).length;
        return `<a href="#${cat.id}-${c.slug}" class="${cnt ? 'has-exam' : ''}">
          <span>${c.name}</span>${cnt ? `<span class="badge">${cnt}</span>` : ''}
        </a>`;
      }).join('');
      nav.appendChild(grp);
    });
  }

  // ---- Main list ----
  function render(filterFn) {
    list.innerHTML = '';
    categories.forEach((cat, idx) => {
      const courseBlocks = cat.courses.map(course => {
        const exs = allExams
          .filter(e => e.course_slug === course.slug)
          .filter(filterFn || (() => true))
          .sort((a, b) => ((b.academic_year || '') + (b.semester || '')).localeCompare((a.academic_year || '') + (a.semester || '')));
        if (!exs.length && filterFn) return '';
        const rows = exs.length ? exs.map(e => `
          <div class="exam-row">
            <span class="year">${formatTimeLabel(e)}</span>
            <span class="meta"><span class="type">${labelType(e.exam_type)}</span>${e.teacher ? '任课：' + e.teacher : ''}</span>
            <span class="actions">
              <a class="btn primary preview" href="${e.file_path}" data-path="${e.file_path}" data-title="${course.name} · ${formatTimeLabel(e)} · ${labelType(e.exam_type)}${e.teacher ? ' · ' + e.teacher : ''}">预览</a>
              <a class="btn" href="${e.file_path}" download>下载</a>
            </span>
          </div>
        `).join('') : `<div class="empty">暂无试卷</div>`;
        return `
          <div class="course-block" id="${cat.id}-${course.slug}">
            <h3>${course.name}${exs.length ? `<span class="tag">${exs.length} 份</span>` : ''}</h3>
            ${rows}
          </div>
        `;
      }).filter(Boolean).join('');
      if (!courseBlocks) return;
      const sec = document.createElement('section');
      sec.className = 'cat-section';
      sec.id = cat.id;
      sec.innerHTML = `
        <h2><span class="index">0${idx + 1}</span>${cat.name}</h2>
        ${courseBlocks}
      `;
      list.appendChild(sec);
    });
    if (!list.children.length) {
      list.innerHTML = `<div class="cat-section"><div class="empty">未找到匹配结果</div></div>`;
    }
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
          .filter(c => c.name.toLowerCase().includes(q) || c.slug.includes(q))
          .map(c => c.slug)
      );
      render(e =>
        courseMatch.has(e.course_slug) ||
        (e.teacher || '').toLowerCase().includes(q) ||
        (e.academic_year || '').includes(q) ||
        (e.semester || '').includes(q)
      );
    }, 120);
  });

  // ---- PDF viewer ----
  const pdfjsMobileQuery = window.matchMedia('(max-width: 860px)');
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js';
  }
  let pdfRenderToken = 0;

  function setViewerMessage(className, message) {
    const frame = document.getElementById('viewer-frame');
    const container = document.getElementById('viewer-pdfjs');
    const node = document.createElement('div');
    node.className = className;
    node.textContent = message;
    frame.hidden = true;
    frame.src = '';
    container.hidden = false;
    container.replaceChildren(node);
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
    container.innerHTML = '<div class="pdfjs-loading">加载中…</div>';
    if (!window.pdfjsLib) {
      container.innerHTML = '<div class="pdfjs-error">PDF.js 加载失败，请检查网络后重试</div>';
      return;
    }
    try {
      const pdf = await window.pdfjsLib.getDocument({
        url: filePath,
        disableStream: false,
        disableAutoFetch: false,
        isEvalSupported: false
      }).promise;
      if (token !== pdfRenderToken) return;
      container.innerHTML = '';
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
        container.appendChild(host);
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
        for (const page of pages.slice(1)) await renderPage(page);
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
    const filePath = a.dataset.path;
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
      frame.hidden = true; frame.src = '';
      pdfjsBox.hidden = false;
      renderPdfMobile(filePath, token);
    } else {
      pdfjsBox.hidden = true; pdfjsBox.innerHTML = '';
      frame.hidden = false; frame.src = '';
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
    pdfjsBox.innerHTML = '';
    document.body.style.overflow = '';
  }
})();
