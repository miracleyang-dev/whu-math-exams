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
        `).join('') : `<div class="empty">暂无试卷，欢迎贡献</div>`;
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
    return ({ final: '期末', midterm: '期中', makeup: '补考', mock: '模拟', quiz: '小测' })[t] || t;
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
  document.addEventListener('click', ev => {
    const a = ev.target.closest('a.preview');
    if (!a) return;
    ev.preventDefault();
    const filePath = a.dataset.path;
    const fullUrl = new URL(filePath, window.location.origin).href;
    document.getElementById('viewer-title').textContent = a.dataset.title;
    document.getElementById('viewer-download').href = filePath;
    document.getElementById('viewer-online').href =
      'https://docs.google.com/gview?url=' + encodeURIComponent(fullUrl) + '&embedded=true';
    document.getElementById('viewer-frame').src = filePath;
    document.getElementById('viewer-modal').hidden = false;
    document.body.style.overflow = 'hidden';
  });
  document.getElementById('viewer-close').onclick = closeViewer;
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeViewer(); });
  function closeViewer() {
    document.getElementById('viewer-modal').hidden = true;
    document.getElementById('viewer-frame').src = '';
    document.body.style.overflow = '';
  }
})();
