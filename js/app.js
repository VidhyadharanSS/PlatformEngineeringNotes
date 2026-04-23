/**
 * Platform Engineering Notes
 * Documentation viewer with PDF-like highlighting, theming,
 * ToC, callouts, reading progress, and more.
 */

const CONFIG = {
    STORAGE_KEY: 'pe-notes-highlights-v2',
    THEME_KEY: 'pe-notes-theme',
    NOTES_INDEX: 'notes.json',
    THEMES: [
        { id: 'dark', name: 'Dark', icon: '🌙' },
        { id: 'light', name: 'Light', icon: '☀️' },
        { id: 'ghostty', name: 'Ghostty', icon: '👻' },
        { id: 'dracula', name: 'Dracula', icon: '🧛' },
        { id: 'solarized', name: 'Solarized', icon: '🌅' },
        { id: 'nord', name: 'Nord', icon: '❄️' },
        { id: 'catppuccin', name: 'Catppuccin', icon: '🐱' },
        { id: 'cyberpunk', name: 'Cyberpunk', icon: '🌆' }
    ]
};

const MODULE_ICONS = {
    '1-Linux': '🐧', '2-Networking': '🌐', '3-Shell-Scripting': '📜',
    '4-Docker': '🐳', '5-Kubernetes': '☸️', '6-Git': '📦',
    '7-Nginx': '⚡', '8-CICD': '🔄', '9-Python': '🐍', '10-GitOps-ArgoCD': '🎯'
};

// State
let notesData = null;
let currentNotePath = null;
let highlights = {};
let selectedColor = 'yellow';
let currentTheme = 'dark';
let allNotesContent = {};

// Elements
const $ = id => document.getElementById(id);
const el = {
    sidebar: $('sidebar'),
    navTree: $('navTree'),
    content: $('markdownContent'),
    breadcrumb: $('breadcrumb'),
    searchInput: $('searchInput'),
    highlightPopup: $('highlightPopup'),
    mobileMenuToggle: $('mobileMenuToggle'),
    overlay: $('overlay'),
    themeBtn: $('themeBtn'),
    themeDropdown: $('themeDropdown'),
    mermaidModal: $('mermaidModal'),
    mermaidModalContent: $('mermaidModalContent'),
    mermaidModalClose: $('mermaidModalClose'),
    searchResults: $('searchResults'),
    collapseAllBtn: $('collapseAllBtn'),
    expandAllBtn: $('expandAllBtn'),
    readingProgress: $('readingProgress'),
    backToTop: $('backToTop'),
    imageLightbox: $('imageLightbox')
};

// Initialize
async function init() {
    loadTheme();
    initMermaid();
    initMarked();
    loadHighlights();
    await loadNotesIndex();
    buildNavigation();
    setupEventListeners();
    handleHashChange();
    buildSearchIndex();
}

function initMarked() {
    const mh = globalThis.markedHighlight;
    if (mh && mh.markedHighlight) {
        marked.use(mh.markedHighlight({
            langPrefix: 'hljs language-',
            emptyLangClass: 'hljs',
            highlight(code, lang) {
                const langMap = {
                    sh: 'bash', shell: 'bash', zsh: 'bash',
                    yml: 'yaml', docker: 'dockerfile', conf: 'ini',
                    config: 'ini', py: 'python', js: 'javascript',
                    ts: 'typescript', rb: 'ruby'
                };
                const normalizedLang = (lang || '').toLowerCase().trim();
                const resolvedLang = langMap[normalizedLang] || normalizedLang;
                if (resolvedLang && hljs.getLanguage(resolvedLang)) {
                    try {
                        return hljs.highlight(code, { language: resolvedLang, ignoreIllegals: true }).value;
                    } catch (error) {
                        console.warn('Highlight failed for language:', resolvedLang, error);
                    }
                }
                return escapeHtml(code);
            }
        }));
    }
    marked.use({ gfm: true, breaks: true });
}

function initMermaid() {
    const isDark = currentTheme !== 'light';
    mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    });
}

// Theme
function loadTheme() {
    const saved = localStorage.getItem(CONFIG.THEME_KEY);
    currentTheme = CONFIG.THEMES.find(t => t.id === saved) ? saved : 'dark';
    applyTheme(currentTheme);
}

function applyTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    currentTheme = themeId;
    localStorage.setItem(CONFIG.THEME_KEY, themeId);
    
    const theme = CONFIG.THEMES.find(t => t.id === themeId);
    if (el.themeBtn) el.themeBtn.textContent = theme?.icon || '🎨';
    
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === themeId);
    });
    
    initMermaid();
}

function toggleThemeDropdown(e) {
    e?.stopPropagation();
    el.themeDropdown.classList.toggle('open');
}

function closeThemeDropdown() {
    el.themeDropdown.classList.remove('open');
}

// Data
async function loadNotesIndex() {
    try {
        const res = await fetch(CONFIG.NOTES_INDEX);
        if (!res.ok) throw new Error('Failed to load');
        notesData = await res.json();
    } catch (e) {
        console.error(e);
        el.content.innerHTML = '<div class="welcome-screen"><h1>⚠️ Error</h1><p class="subtitle">Could not load notes. Please refresh.</p></div>';
    }
}

// Navigation
function buildNavigation() {
    if (!notesData) return;
    el.navTree.innerHTML = '';
    notesData.modules.forEach(mod => el.navTree.appendChild(createModuleEl(mod)));
}

function createModuleEl(module) {
    const div = document.createElement('div');
    div.className = 'nav-module';
    div.dataset.module = module.name;
    
    const icon = MODULE_ICONS[module.name] || '📁';
    const name = module.name.replace(/^\d+-/, '').replace(/-/g, ' ');
    
    div.innerHTML = `
        <div class="nav-module-header">
            <span class="icon">${icon}</span>
            <span class="name">${name}</span>
            <span class="arrow">▶</span>
        </div>
        <div class="nav-module-content"></div>
    `;
    
    const header = div.querySelector('.nav-module-header');
    const content = div.querySelector('.nav-module-content');
    
    header.onclick = () => div.classList.toggle('expanded');
    
    if (module.approachGuide) {
        const guide = document.createElement('div');
        guide.className = 'nav-item approach-guide';
        guide.textContent = '📋 Approach Guide';
        guide.dataset.path = module.approachGuide;
        guide.onclick = () => loadNote(module.approachGuide);
        content.appendChild(guide);
    }
    
    module.subchapters.forEach(sub => content.appendChild(createSubchapterEl(sub)));
    return div;
}

function getSubchapterDisplayName(sub) {
    const num = sub.name.replace(/^Subchapter_/, '').replace(/_/g, '.');
    const topics = sub.files
        .filter(f => !/review|exam|cheatsheet/i.test(f.name))
        .map(f => {
            return f.name
                .replace(/\.md$/, '')
                .replace(/^[\d.]+_?/, '')
                .replace(/_/g, ' ')
                .replace(/\band\b/gi, '&')
                .replace(/Plus/g, '+');
        });
    if (topics.length === 0) return num;
    const shortTopics = topics.slice(0, 2).map(t => {
        const words = t.split(' ');
        return words.length > 3 ? words.slice(0, 3).join(' ') : t;
    });
    return `${num} — ${shortTopics.join(', ')}`;
}

function createSubchapterEl(sub) {
    const div = document.createElement('div');
    div.className = 'nav-subchapter';
    const displayName = getSubchapterDisplayName(sub);
    
    div.innerHTML = `
        <div class="nav-subchapter-header">
            <span class="name">${escapeHtml(displayName)}</span>
            <span class="arrow">▶</span>
        </div>
        <div class="nav-subchapter-content"></div>
    `;
    
    const header = div.querySelector('.nav-subchapter-header');
    const content = div.querySelector('.nav-subchapter-content');
    
    header.onclick = e => { e.stopPropagation(); div.classList.toggle('expanded'); };
    
    sub.files.forEach(file => {
        const item = document.createElement('div');
        const isReview = /review|exam|cheatsheet/i.test(file.name);
        item.className = `nav-item${isReview ? ' review' : ''}`;
        item.textContent = formatFileName(file.name);
        item.dataset.path = file.path;
        item.onclick = () => loadNote(file.path);
        content.appendChild(item);
    });
    
    return div;
}

function formatFileName(name) {
    return name.replace(/\.md$/, '').replace(/^[\d.]+_?/, '').replace(/_/g, ' ').replace(/Plus/g, '+');
}

// Note Loading
async function loadNote(path) {
    currentNotePath = path;
    window.location.hash = encodeURIComponent(path);
    el.content.innerHTML = '<div class="loading"></div>';
    
    updateActiveNavItem(path);
    updateBreadcrumb(path);
    
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error('Failed');
        const md = await res.text();
        renderMarkdown(md);
        applyHighlights();
        closeMobileSidebar();
        
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Fade-in animation
        el.content.classList.remove('fade-in');
        void el.content.offsetWidth; // trigger reflow
        el.content.classList.add('fade-in');
        
    } catch (e) {
        console.error(e);
        el.content.innerHTML = `<div class="welcome-screen"><h1>⚠️ Error</h1><p class="subtitle">Could not load: ${path}</p></div>`;
    }
}

function sanitizeMermaidCode(code) {
    return code.replace(/(\w)\[(?!")(\/.+?)\]/g, '$1["$2"]');
}

function renderMarkdown(md) {
    const mermaidBlocks = [];
    const processed = md.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
        const id = `mermaid-${mermaidBlocks.length}`;
        mermaidBlocks.push({ id, code: sanitizeMermaidCode(code.trim()) });
        return `<div class="mermaid-wrapper">
            <div class="mermaid-actions">
                <button class="mermaid-fullscreen-btn" data-id="${id}" title="Fullscreen">⛶</button>
            </div>
            <div class="mermaid-container">
                <div class="mermaid" id="${id}"></div>
            </div>
        </div>`;
    });

    el.content.innerHTML = marked.parse(processed);

    // Code block wrappers
    el.content.querySelectorAll('pre > code').forEach(code => {
        const classNames = Array.from(code.classList);
        const languageClass = classNames.find(cn => cn.startsWith('language-'));
        const lang = languageClass ? languageClass.replace('language-', '') : 'code';
        const pre = code.parentElement;

        if (!pre || pre.closest('.code-block-wrapper') || pre.closest('.mermaid-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        wrapper.innerHTML = `
            <div class="code-block-header">
                <span class="code-lang">${lang.toUpperCase()}</span>
                <button class="code-copy-btn" title="Copy">
                    <span class="icon">📋</span>
                    <span class="text">Copy</span>
                </button>
            </div>
        `;

        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);

        const btn = wrapper.querySelector('.code-copy-btn');
        btn.onclick = () => copyCode(code.textContent, btn);
    });
    
    // Wrap tables in scrollable container
    wrapTables();
    
    // Add heading anchors + collect for ToC
    addHeadingAnchors();
    
    // Build Table of Contents
    buildTableOfContents();
    
    // Style callout blockquotes
    styleCallouts();
    
    // Style task lists
    styleTaskLists();
    
    // Setup image zoom
    setupImageZoom();
    
    // Intercept markdown backlinks
    interceptBacklinks();
    
    // Render mermaid
    mermaidBlocks.forEach(async ({ id, code }) => {
        const mEl = document.getElementById(id);
        if (mEl) {
            try {
                const { svg } = await mermaid.render(`${id}-svg`, code);
                mEl.innerHTML = svg;
                mEl.dataset.code = code;
            } catch (e) {
                mEl.innerHTML = `<pre style="color:var(--danger);font-size:11px;">${escapeHtml(e.message)}</pre>`;
            }
        }
    });
    
    // Mermaid fullscreen buttons
    document.querySelectorAll('.mermaid-fullscreen-btn').forEach(btn => {
        btn.onclick = () => openMermaidFullscreen(btn.dataset.id);
    });
}

/* ========================================
   Table of Contents
   ======================================== */
function addHeadingAnchors() {
    el.content.querySelectorAll('h1, h2, h3, h4').forEach(heading => {
        const text = heading.textContent.trim();
        const id = text.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 80);
        heading.id = id;
        
        const anchor = document.createElement('a');
        anchor.className = 'heading-anchor';
        anchor.href = `#${id}`;
        anchor.textContent = '#';
        anchor.title = 'Link to this heading';
        anchor.onclick = e => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Update URL without triggering hashchange
            history.replaceState(null, '', window.location.pathname + window.location.hash.split('#')[0] + '#' + window.location.hash.slice(1));
        };
        heading.prepend(anchor);
    });
}

function buildTableOfContents() {
    const headings = el.content.querySelectorAll('h2, h3, h4');
    if (headings.length < 3) return; // Only show ToC if there are enough headings
    
    const toc = document.createElement('div');
    toc.className = 'toc-container';
    
    let listHTML = '';
    headings.forEach(h => {
        const level = h.tagName.toLowerCase();
        const text = h.textContent.replace(/^#\s*/, '').trim();
        const id = h.id;
        listHTML += `<li><a href="#${id}" class="toc-${level}">${escapeHtml(text)}</a></li>`;
    });
    
    toc.innerHTML = `
        <div class="toc-header">
            <span class="toc-title">Table of Contents</span>
            <span class="toc-toggle">▼</span>
        </div>
        <div class="toc-body">
            <ul class="toc-list">${listHTML}</ul>
        </div>
    `;
    
    // Toggle collapse
    toc.querySelector('.toc-header').onclick = () => {
        toc.classList.toggle('collapsed');
    };
    
    // Smooth scroll for ToC links
    toc.querySelectorAll('.toc-list a').forEach(link => {
        link.onclick = e => {
            e.preventDefault();
            const target = document.getElementById(link.getAttribute('href').slice(1));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        };
    });
    
    // Insert before the first element
    const firstChild = el.content.firstElementChild;
    if (firstChild) {
        // Insert after the first h1 if exists, otherwise at top
        const h1 = el.content.querySelector('h1');
        if (h1 && h1.nextSibling) {
            h1.parentNode.insertBefore(toc, h1.nextSibling);
        } else {
            el.content.insertBefore(toc, firstChild);
        }
    }
}

/* ========================================
   Callout / Admonition Blockquotes
   ======================================== */
function styleCallouts() {
    el.content.querySelectorAll('blockquote').forEach(bq => {
        const firstP = bq.querySelector('p');
        if (!firstP) return;
        
        const text = firstP.innerHTML;
        // Match patterns like: <strong>Note:</strong>, **Warning:**, > **Tip:**
        const calloutMatch = text.match(/^<strong>(Note|Warning|Tip|Caution|Danger|Important|Info)s?:?<\/strong>\s*/i);
        
        if (calloutMatch) {
            const type = calloutMatch[1].toLowerCase();
            bq.classList.add('callout', `callout-${type === 'info' ? 'note' : type}`);
            
            // Replace the bold label with a styled title
            const titleSpan = `<span class="callout-title">${calloutMatch[1]}</span>`;
            firstP.innerHTML = titleSpan + text.slice(calloutMatch[0].length);
        }
    });
}

/* ========================================
   Task List Styling
   ======================================== */
function styleTaskLists() {
    el.content.querySelectorAll('ul').forEach(ul => {
        const items = ul.querySelectorAll(':scope > li');
        let isTaskList = false;
        
        items.forEach(li => {
            const checkbox = li.querySelector('input[type="checkbox"]');
            if (checkbox) {
                isTaskList = true;
                checkbox.disabled = true;
                if (checkbox.checked) {
                    li.classList.add('task-done');
                }
            }
        });
        
        if (isTaskList) {
            ul.classList.add('task-list');
        }
    });
}

/* ========================================
   Table Wrapping
   ======================================== */
function wrapTables() {
    el.content.querySelectorAll('table').forEach(table => {
        if (table.parentElement.classList.contains('table-wrapper')) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'table-wrapper';
        table.parentNode.insertBefore(wrapper, table);
        wrapper.appendChild(table);
    });
}

/* ========================================
   Image Zoom / Lightbox
   ======================================== */
function setupImageZoom() {
    el.content.querySelectorAll('img').forEach(img => {
        img.addEventListener('click', () => {
            const lightbox = el.imageLightbox;
            if (!lightbox) return;
            const lbImg = lightbox.querySelector('img');
            lbImg.src = img.src;
            lbImg.alt = img.alt;
            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    });
}

function closeLightbox() {
    if (el.imageLightbox) {
        el.imageLightbox.classList.remove('open');
        document.body.style.overflow = '';
    }
}

/* ========================================
   Backlink Resolution
   ======================================== */
function resolveRelativePath(href) {
    if (!currentNotePath) return null;
    const parts = currentNotePath.split('/');
    parts.pop();
    const baseDir = parts;
    const hrefParts = href.split('/');
    const resolved = [...baseDir];
    for (const segment of hrefParts) {
        if (segment === '..') resolved.pop();
        else if (segment !== '.' && segment !== '') resolved.push(segment);
    }
    return resolved.join('/');
}

function findNotePath(resolvedPath) {
    if (!notesData) return null;
    const clean = resolvedPath.replace(/\/$/, '');
    for (const mod of notesData.modules) {
        if (mod.approachGuide === clean) return clean;
        for (const sub of mod.subchapters) {
            for (const file of sub.files) {
                if (file.path === clean) return clean;
            }
        }
    }
    for (const mod of notesData.modules) {
        if (clean === mod.name || clean.startsWith(mod.name + '/')) {
            if (clean === mod.name) {
                return mod.approachGuide || mod.subchapters[0]?.files[0]?.path || null;
            }
            for (const sub of mod.subchapters) {
                const subPath = `${mod.name}/${sub.name}`;
                if (clean === subPath) return sub.files[0]?.path || null;
            }
        }
    }
    return null;
}

function interceptBacklinks() {
    el.content.querySelectorAll('a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http://') || href.startsWith('https://') || 
            href.startsWith('#') || href.startsWith('mailto:')) return;
        link.addEventListener('click', e => {
            e.preventDefault();
            const resolved = resolveRelativePath(href);
            if (!resolved) return;
            const notePath = findNotePath(resolved);
            if (notePath) loadNote(notePath);
            else console.warn('Backlink target not found:', href, '→ resolved:', resolved);
        });
        link.classList.add('internal-link');
        link.title = link.title || 'Navigate to note';
    });
}

/* ========================================
   Reading Progress Bar
   ======================================== */
function updateReadingProgress() {
    if (!el.readingProgress) return;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) {
        el.readingProgress.style.width = '0%';
        return;
    }
    const scrolled = (window.scrollY / docHeight) * 100;
    el.readingProgress.style.width = `${Math.min(scrolled, 100)}%`;
}

/* ========================================
   Back to Top Button
   ======================================== */
function updateBackToTop() {
    if (!el.backToTop) return;
    if (window.scrollY > 400) {
        el.backToTop.classList.add('visible');
    } else {
        el.backToTop.classList.remove('visible');
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Utility
function copyCode(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        btn.querySelector('.text').textContent = 'Copied!';
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.querySelector('.text').textContent = 'Copy';
        }, 2000);
    });
}

function openMermaidFullscreen(id) {
    const mEl = document.getElementById(id);
    if (!mEl) return;
    el.mermaidModalContent.innerHTML = mEl.innerHTML;
    el.mermaidModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeMermaidFullscreen() {
    el.mermaidModal.classList.remove('open');
    document.body.style.overflow = '';
}

function updateActiveNavItem(path) {
    document.querySelectorAll('.nav-item.active').forEach(e => e.classList.remove('active'));
    const active = document.querySelector(`.nav-item[data-path="${path}"]`);
    if (active) {
        active.classList.add('active');
        active.closest('.nav-subchapter')?.classList.add('expanded');
        active.closest('.nav-module')?.classList.add('expanded');
    }
}

function updateBreadcrumb(path) {
    const parts = path.split('/');
    const module = parts[0].replace(/^\d+-/, '').replace(/-/g, ' ');
    const sub = parts[1] ? parts[1].replace(/^Subchapter_/, '').replace(/_/g, '.') : '';
    const file = parts[2] ? formatFileName(parts[2]) : '';
    
    let html = `<a href="#" onclick="showWelcome();return false;">Home</a>`;
    if (module) html += ` <span>/</span> ${module}`;
    if (sub) html += ` <span>/</span> ${sub}`;
    if (file) html += ` <span>/</span> ${file}`;
    
    el.breadcrumb.innerHTML = html;
}

function showWelcome() {
    currentNotePath = null;
    window.location.hash = '';
    el.breadcrumb.innerHTML = '';
    document.querySelectorAll('.nav-item.active').forEach(e => e.classList.remove('active'));
    el.content.innerHTML = getWelcomeHTML();
    setupModuleCards();
}

function handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash) loadNote(decodeURIComponent(hash));
}

function getWelcomeHTML() {
    const topics = {
        '1-Linux': 'FHS, Permissions, SSH, Storage, Systemd',
        '2-Networking': 'OSI, TCP/IP, DNS, Firewalls, HTTP',
        '3-Shell-Scripting': 'Bash, Variables, Loops, Functions',
        '4-Docker': 'Containers, Images, Networking, Volumes',
        '5-Kubernetes': 'Architecture, Pods, Services, RBAC',
        '6-Git': 'Objects, Branching, Rebasing, Hooks',
        '7-Nginx': 'Reverse Proxy, Load Balancing, SSL',
        '8-CICD': 'Pipelines, GitHub Actions, Security',
        '9-Python': 'Subprocess, APIs, Logging, Testing',
        '10-GitOps-ArgoCD': 'GitOps, ArgoCD, Sync Policies'
    };
    
    return `
        <div class="welcome-screen">
            <h1>Platform Engineering Notes</h1>
            <p class="subtitle">Comprehensive study guide for DevOps and Platform Engineering</p>
            <div class="modules-grid">
                ${Object.entries(MODULE_ICONS).map(([key, icon]) => {
                    const name = key.replace(/^\d+-/, '').replace(/-/g, ' ');
                    return `<div class="module-card" data-module="${key}">
                        <div class="icon">${icon}</div>
                        <div class="name">${name}</div>
                        <div class="topics">${topics[key] || ''}</div>
                    </div>`;
                }).join('')}
            </div>
            <div class="how-to-use">
                <h3>💡 How to Use</h3>
                <ul>
                    <li><strong>Navigate:</strong> Browse modules in the sidebar</li>
                    <li><strong>Search:</strong> Press <kbd>Ctrl+K</kbd> to search all notes</li>
                    <li><strong>Highlight:</strong> Select text to highlight with colors</li>
                    <li><strong>Theme:</strong> 8 themes — Dark, Light, Ghostty, Dracula, Solarized, Nord, Catppuccin, Cyberpunk</li>
                    <li><strong>Diagrams:</strong> Click ⛶ for fullscreen Mermaid diagrams</li>
                    <li><strong>Images:</strong> Click any image to zoom in</li>
                    <li><strong>Table of Contents:</strong> Auto-generated for each note</li>
                    <li><strong>Backlinks:</strong> Click ↗ links to navigate between notes</li>
                </ul>
            </div>
        </div>
    `;
}

// Search
async function buildSearchIndex() {
    if (!notesData) return;
    for (const mod of notesData.modules) {
        if (mod.approachGuide) {
            try {
                const res = await fetch(mod.approachGuide);
                if (res.ok) {
                    const content = await res.text();
                    allNotesContent[mod.approachGuide] = {
                        title: 'Approach Guide',
                        module: mod.name,
                        content: content.toLowerCase()
                    };
                }
            } catch {}
        }
        for (const sub of mod.subchapters) {
            for (const file of sub.files) {
                try {
                    const res = await fetch(file.path);
                    if (res.ok) {
                        const content = await res.text();
                        allNotesContent[file.path] = {
                            title: formatFileName(file.name),
                            module: mod.name,
                            subchapter: sub.name,
                            content: content.toLowerCase()
                        };
                    }
                } catch {}
            }
        }
    }
}

function setupSearch() {
    let timer;
    el.searchInput.oninput = e => {
        clearTimeout(timer);
        timer = setTimeout(() => performSearch(e.target.value.trim()), 200);
    };
    el.searchInput.onfocus = () => {
        if (el.searchInput.value.trim()) el.searchResults.classList.add('visible');
    };
    document.addEventListener('click', e => {
        if (!e.target.closest('.search-container')) el.searchResults.classList.remove('visible');
    });
}

function performSearch(query) {
    if (!query || query.length < 2) {
        el.searchResults.classList.remove('visible');
        resetNavFilter();
        return;
    }
    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter(w => w.length > 1);
    const results = [];
    
    for (const [path, data] of Object.entries(allNotesContent)) {
        let score = 0;
        let matchedWords = 0;
        const allWordsMatch = words.every(word => 
            data.content.includes(word) || 
            data.title.toLowerCase().includes(word) ||
            data.module.toLowerCase().includes(word)
        );
        if (!allWordsMatch && words.length > 1) continue;
        for (const word of words) {
            if (data.title.toLowerCase().includes(word)) { score += 10; matchedWords++; }
            if (data.content.includes(word)) {
                const count = (data.content.match(new RegExp(word, 'g')) || []).length;
                score += Math.min(count, 5);
                matchedWords++;
            }
        }
        if (matchedWords > 0) {
            let snippet = '';
            const contentLower = data.content;
            const firstWord = words[0];
            const idx = contentLower.indexOf(firstWord);
            if (idx !== -1) {
                const start = Math.max(0, idx - 40);
                const end = Math.min(contentLower.length, idx + 80);
                snippet = data.content.substring(start, end).replace(/\n/g, ' ').replace(/[#*`]/g, '').trim();
                if (start > 0) snippet = '...' + snippet;
                if (end < contentLower.length) snippet += '...';
            }
            results.push({ path, title: data.title, module: data.module.replace(/^\d+-/, '').replace(/-/g, ' '), snippet, score });
        }
    }
    results.sort((a, b) => b.score - a.score);
    showSearchResults(results.slice(0, 15), words);
    filterNav(q);
}

function showSearchResults(results, words) {
    if (results.length === 0) {
        el.searchResults.innerHTML = '<div class="no-results">No results found</div>';
        el.searchResults.classList.add('visible');
        return;
    }
    el.searchResults.innerHTML = results.map(r => {
        let snippet = escapeHtml(r.snippet);
        for (const word of words) {
            const regex = new RegExp(`(${escapeRegex(word)})`, 'gi');
            snippet = snippet.replace(regex, '<mark>$1</mark>');
        }
        return `
            <div class="search-result-item" data-path="${r.path}">
                <div class="search-result-title">${escapeHtml(r.title)}</div>
                <div class="search-result-module">${escapeHtml(r.module)}</div>
                ${snippet ? `<div class="search-result-snippet">${snippet}</div>` : ''}
            </div>
        `;
    }).join('');
    el.searchResults.classList.add('visible');
    el.searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.onclick = () => {
            loadNote(item.dataset.path);
            el.searchResults.classList.remove('visible');
            el.searchInput.value = '';
            resetNavFilter();
        };
    });
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function resetNavFilter() {
    document.querySelectorAll('.nav-module, .nav-subchapter, .nav-item').forEach(e => e.style.display = '');
}

function filterNav(q) {
    if (!q) { resetNavFilter(); return; }
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    document.querySelectorAll('.nav-module').forEach(mod => {
        let hasMatch = false;
        mod.querySelectorAll('.nav-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            const matches = words.some(w => text.includes(w));
            item.style.display = matches ? '' : 'none';
            if (matches) hasMatch = true;
        });
        mod.querySelectorAll('.nav-subchapter').forEach(sub => {
            const visible = sub.querySelectorAll('.nav-item:not([style*="none"])').length > 0;
            sub.style.display = visible ? '' : 'none';
            if (visible) sub.classList.add('expanded');
        });
        mod.style.display = hasMatch ? '' : 'none';
        if (hasMatch) mod.classList.add('expanded');
    });
}

// Highlighting
function loadHighlights() {
    try { highlights = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || {}; }
    catch { highlights = {}; }
}

function saveHighlights() { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(highlights)); }

function getPageHighlights() { return highlights[currentNotePath] || []; }

function setPageHighlights(arr) {
    if (arr.length === 0) delete highlights[currentNotePath];
    else highlights[currentNotePath] = arr;
    saveHighlights();
}

function applyHighlights() {
    if (!currentNotePath) return;
    getPageHighlights().forEach(h => applyHighlightToDOM(h));
}

function applyHighlightToDOM(highlight) {
    const walker = document.createTreeWalker(el.content, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
        if (node.parentElement.closest('pre, code, .mermaid, .user-highlight')) continue;
        const idx = node.textContent.indexOf(highlight.text);
        if (idx !== -1) {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + highlight.text.length);
            const span = document.createElement('span');
            span.className = 'user-highlight';
            span.dataset.highlightId = highlight.id;
            span.dataset.color = highlight.color || 'yellow';
            try { range.surroundContents(span); } catch {}
            break;
        }
    }
}

function addHighlight(text, color = 'yellow') {
    if (!currentNotePath || !text.trim()) return;
    const pageHighlights = getPageHighlights();
    if (pageHighlights.find(h => h.text === text.trim())) return;
    const highlight = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        text: text.trim(),
        color
    };
    pageHighlights.push(highlight);
    setPageHighlights(pageHighlights);
    applyHighlightToDOM(highlight);
}

function removeHighlight(id) {
    const pageHighlights = getPageHighlights();
    const idx = pageHighlights.findIndex(h => h.id === id);
    if (idx === -1) return;
    pageHighlights.splice(idx, 1);
    setPageHighlights(pageHighlights);
    const span = document.querySelector(`[data-highlight-id="${id}"]`);
    if (span) span.replaceWith(document.createTextNode(span.textContent));
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Text Selection
function setupTextSelection() {
    let selectionTimeout;
    document.addEventListener('mouseup', e => {
        if (e.target.closest('.highlight-popup, .theme-dropdown, .code-copy-btn, .mermaid-fullscreen-btn, .sidebar, .search-results, .toc-container')) return;
        const clickedHighlight = e.target.closest('.user-highlight');
        if (clickedHighlight && !window.getSelection().toString().trim()) {
            removeHighlight(clickedHighlight.dataset.highlightId);
            return;
        }
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(() => {
            const sel = window.getSelection();
            const text = sel.toString().trim();
            if (text && text.length > 2 && text.length < 500 && 
                el.content.contains(sel.anchorNode) &&
                !sel.anchorNode.parentElement?.closest('pre, code, .mermaid')) {
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                const popupW = 180;
                let left = rect.left + (rect.width / 2) - (popupW / 2);
                left = Math.max(10, Math.min(left, window.innerWidth - popupW - 10));
                let top = rect.top + window.scrollY - 45;
                if (top < window.scrollY + 10) top = rect.bottom + window.scrollY + 8;
                el.highlightPopup.style.left = `${left}px`;
                el.highlightPopup.style.top = `${top}px`;
                el.highlightPopup.classList.add('visible');
            } else {
                el.highlightPopup.classList.remove('visible');
            }
        }, 10);
    });
    document.querySelector('.highlight-action-btn').onclick = () => {
        const sel = window.getSelection();
        const text = sel.toString().trim();
        if (text) {
            addHighlight(text, selectedColor);
            sel.removeAllRanges();
            el.highlightPopup.classList.remove('visible');
        }
    };
    document.querySelectorAll('.hl-color').forEach(btn => {
        btn.onclick = e => {
            e.stopPropagation();
            selectedColor = btn.dataset.color;
            document.querySelectorAll('.hl-color').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        };
    });
    document.addEventListener('mousedown', e => {
        if (!e.target.closest('.highlight-popup')) {
            setTimeout(() => {
                if (!window.getSelection().toString().trim()) el.highlightPopup.classList.remove('visible');
            }, 50);
        }
    });
}

// Collapse / Expand All
function collapseAll() {
    document.querySelectorAll('.nav-module.expanded').forEach(m => m.classList.remove('expanded'));
    document.querySelectorAll('.nav-subchapter.expanded').forEach(s => s.classList.remove('expanded'));
}

function expandAll() {
    document.querySelectorAll('.nav-module').forEach(m => m.classList.add('expanded'));
    document.querySelectorAll('.nav-subchapter').forEach(s => s.classList.add('expanded'));
}

// Panels
function openMobileSidebar() {
    el.sidebar.classList.add('open');
    el.overlay.classList.add('active');
}

function closeMobileSidebar() {
    el.sidebar.classList.remove('open');
    el.overlay.classList.remove('active');
}

// Module Cards
function setupModuleCards() {
    document.querySelectorAll('.module-card').forEach(card => {
        card.onclick = () => {
            const mod = document.querySelector(`.nav-module[data-module="${card.dataset.module}"]`);
            if (mod) {
                mod.classList.add('expanded');
                const first = mod.querySelector('.nav-item');
                if (first) loadNote(first.dataset.path);
            }
        };
    });
}

// Event Listeners
function setupEventListeners() {
    setupSearch();
    setupTextSelection();
    setupModuleCards();
    
    el.mobileMenuToggle.onclick = () => {
        el.sidebar.classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
    };
    
    el.collapseAllBtn.onclick = collapseAll;
    el.expandAllBtn.onclick = expandAll;
    
    el.overlay.onclick = () => {
        closeMobileSidebar();
        closeThemeDropdown();
    };
    
    // Theme switcher
    el.themeBtn.onclick = toggleThemeDropdown;
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.onclick = e => {
            e.stopPropagation();
            applyTheme(opt.dataset.theme);
            closeThemeDropdown();
        };
    });
    document.addEventListener('click', e => {
        if (!e.target.closest('.theme-switcher')) closeThemeDropdown();
    });
    
    // Mermaid
    el.mermaidModalClose.onclick = closeMermaidFullscreen;
    el.mermaidModal.onclick = e => { if (e.target === el.mermaidModal) closeMermaidFullscreen(); };
    
    // Image lightbox
    if (el.imageLightbox) {
        el.imageLightbox.onclick = closeLightbox;
    }
    
    // Back to top
    if (el.backToTop) {
        el.backToTop.onclick = scrollToTop;
    }
    
    // Scroll events — throttled
    let scrollTicking = false;
    window.addEventListener('scroll', () => {
        if (!scrollTicking) {
            requestAnimationFrame(() => {
                updateReadingProgress();
                updateBackToTop();
                scrollTicking = false;
            });
            scrollTicking = true;
        }
    });
    
    window.addEventListener('hashchange', handleHashChange);
    
    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeMobileSidebar();
            closeThemeDropdown();
            closeMermaidFullscreen();
            closeLightbox();
            el.highlightPopup.classList.remove('visible');
            el.searchResults.classList.remove('visible');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            el.searchInput.focus();
        }
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
