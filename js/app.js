/**
 * Platform Engineering Notes
 * Documentation viewer with highlighting and theming
 */

const CONFIG = {
    STORAGE_KEY: 'pe-notes-highlights',
    THEME_KEY: 'pe-notes-theme',
    NOTES_INDEX: 'notes.json',
    THEMES: [
        { id: 'dark', name: 'Dark', icon: '🌙' },
        { id: 'light', name: 'Light', icon: '☀️' },
        { id: 'ghostty', name: 'Ghostty', icon: '👻' },
        { id: 'dracula', name: 'Dracula', icon: '🧛' }
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
let highlights = [];
let selectedColor = 'yellow';
let currentTheme = 'dark';

// Elements
const $ = id => document.getElementById(id);
const el = {
    sidebar: $('sidebar'),
    navTree: $('navTree'),
    content: $('markdownContent'),
    breadcrumb: $('breadcrumb'),
    searchInput: $('searchInput'),
    highlightPopup: $('highlightPopup'),
    addHighlightBtn: $('addHighlightBtn'),
    highlightsPanel: $('highlightsPanel'),
    highlightsList: $('highlightsList'),
    highlightCount: $('highlightCount'),
    toggleHighlights: $('toggleHighlights'),
    closePanelBtn: $('closePanelBtn'),
    clearHighlightsBtn: $('clearHighlightsBtn'),
    clearAllHighlightsBtn: $('clearAllHighlightsBtn'),
    exportHighlightsBtn: $('exportHighlightsBtn'),
    mobileMenuToggle: $('mobileMenuToggle'),
    overlay: $('overlay'),
    themeBtn: $('themeBtn'),
    themeDropdown: $('themeDropdown'),
    mermaidModal: $('mermaidModal'),
    mermaidModalContent: $('mermaidModalContent'),
    mermaidModalClose: $('mermaidModalClose')
};

// Initialize
async function init() {
    loadTheme();
    initMermaid();
    loadHighlights();
    await loadNotesIndex();
    buildNavigation();
    setupEventListeners();
    handleHashChange();
    updateHighlightCount();
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

function createSubchapterEl(sub) {
    const div = document.createElement('div');
    div.className = 'nav-subchapter';
    const name = sub.name.replace(/^Subchapter_/, '').replace(/_/g, '.');
    
    div.innerHTML = `
        <div class="nav-subchapter-header">
            <span class="name">${name}</span>
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        console.error(e);
        el.content.innerHTML = `<div class="welcome-screen"><h1>⚠️ Error</h1><p class="subtitle">Could not load: ${path}</p></div>`;
    }
}

function renderMarkdown(md) {
    marked.setOptions({
        gfm: true,
        breaks: true,
        highlight: (code, lang) => {
            if (lang && hljs.getLanguage(lang)) {
                try { return hljs.highlight(code, { language: lang }).value; } catch {}
            }
            return hljs.highlightAuto(code).value;
        }
    });
    
    const mermaidBlocks = [];
    const processed = md.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
        const id = `mermaid-${mermaidBlocks.length}`;
        mermaidBlocks.push({ id, code: code.trim() });
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
    
    // Wrap code blocks
    el.content.querySelectorAll('pre').forEach(pre => {
        if (pre.closest('.code-block-wrapper') || pre.closest('.mermaid-wrapper')) return;
        
        const code = pre.querySelector('code');
        if (!code) return;
        
        const langClass = [...code.classList].find(c => c.startsWith('language-'));
        const lang = langClass ? langClass.replace('language-', '') : 'code';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        wrapper.innerHTML = `
            <div class="code-block-header">
                <span class="code-lang">${lang}</span>
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
                    <li><strong>Search:</strong> Press <kbd>Ctrl+K</kbd> to search</li>
                    <li><strong>Highlight:</strong> Select text to highlight it</li>
                    <li><strong>Theme:</strong> Click theme button to switch</li>
                    <li><strong>Diagrams:</strong> Click ⛶ for fullscreen</li>
                </ul>
            </div>
        </div>
    `;
}

// Search
function setupSearch() {
    let timer;
    el.searchInput.oninput = e => {
        clearTimeout(timer);
        timer = setTimeout(() => filterNav(e.target.value.toLowerCase()), 150);
    };
}

function filterNav(q) {
    if (!q) {
        document.querySelectorAll('.nav-module, .nav-subchapter, .nav-item').forEach(e => e.style.display = '');
        document.querySelectorAll('.nav-module, .nav-subchapter').forEach(e => e.classList.remove('expanded'));
        return;
    }
    
    document.querySelectorAll('.nav-module').forEach(mod => {
        let hasMatch = false;
        mod.querySelectorAll('.nav-item').forEach(item => {
            const matches = item.textContent.toLowerCase().includes(q);
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
    try { highlights = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || []; }
    catch { highlights = []; }
}

function saveHighlights() {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(highlights));
    updateHighlightCount();
}

function updateHighlightCount() {
    el.highlightCount.textContent = `${highlights.length} saved`;
}

function applyHighlights() {
    if (!currentNotePath) return;
    highlights.filter(h => h.path === currentNotePath).forEach(h => highlightText(h.text, h.id, h.color));
}

function highlightText(text, id, color) {
    const walker = document.createTreeWalker(el.content, NodeFilter.SHOW_TEXT);
    let node;
    while (node = walker.nextNode()) {
        if (node.parentElement.closest('pre, code, .mermaid')) continue;
        const idx = node.textContent.indexOf(text);
        if (idx !== -1) {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + text.length);
            const span = document.createElement('span');
            span.className = 'user-highlight';
            span.dataset.highlightId = id;
            span.dataset.color = color || 'yellow';
            span.onclick = () => scrollToHighlight(id);
            try { range.surroundContents(span); } catch {}
            break;
        }
    }
}

function addHighlight(text, color = 'yellow') {
    if (!currentNotePath || !text.trim()) return;
    const highlight = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        path: currentNotePath,
        text: text.trim(),
        color,
        createdAt: new Date().toISOString()
    };
    highlights.push(highlight);
    saveHighlights();
    highlightText(highlight.text, highlight.id, highlight.color);
    renderHighlightsList();
}

function removeHighlight(id) {
    highlights = highlights.filter(h => h.id !== id);
    saveHighlights();
    const span = document.querySelector(`[data-highlight-id="${id}"]`);
    if (span) span.replaceWith(document.createTextNode(span.textContent));
    renderHighlightsList();
}

function clearPageHighlights() {
    if (!currentNotePath) return;
    highlights = highlights.filter(h => h.path !== currentNotePath);
    saveHighlights();
    document.querySelectorAll('.user-highlight').forEach(s => s.replaceWith(document.createTextNode(s.textContent)));
    renderHighlightsList();
}

function clearAllHighlights() {
    if (!confirm('Delete ALL highlights?')) return;
    highlights = [];
    saveHighlights();
    document.querySelectorAll('.user-highlight').forEach(s => s.replaceWith(document.createTextNode(s.textContent)));
    renderHighlightsList();
}

function exportHighlights() {
    const blob = new Blob([JSON.stringify(highlights, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'highlights.json';
    a.click();
}

function renderHighlightsList() {
    if (!highlights.length) {
        el.highlightsList.innerHTML = '<div class="no-highlights"><p>📝</p><p>Select text to highlight</p></div>';
        return;
    }
    
    el.highlightsList.innerHTML = highlights
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(h => `
            <div class="highlight-item" data-path="${h.path}" data-id="${h.id}">
                <div class="highlight-item-source">📄 ${formatPath(h.path)}</div>
                <div class="highlight-item-text" style="background:var(--hl-${h.color || 'yellow'})">${escapeHtml(h.text)}</div>
                <div class="highlight-item-actions">
                    <button class="highlight-item-delete" data-id="${h.id}">Remove</button>
                </div>
            </div>
        `).join('');
    
    el.highlightsList.querySelectorAll('.highlight-item').forEach(item => {
        item.onclick = e => {
            if (e.target.classList.contains('highlight-item-delete')) {
                e.stopPropagation();
                removeHighlight(e.target.dataset.id);
            } else {
                loadNote(item.dataset.path);
                closeHighlightsPanel();
            }
        };
    });
}

function scrollToHighlight(id) {
    openHighlightsPanel();
    const item = el.highlightsList.querySelector(`[data-id="${id}"]`);
    item?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function formatPath(path) {
    const parts = path.split('/');
    return `${parts[0].replace(/^\d+-/, '')} › ${formatFileName(parts[parts.length - 1])}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Text Selection
function setupTextSelection() {
    document.addEventListener('mouseup', e => {
        // Ignore clicks on UI elements
        if (e.target.closest('.highlight-popup, .highlights-panel, .theme-dropdown, .code-copy-btn, .mermaid-fullscreen-btn, .sidebar')) {
            return;
        }
        
        setTimeout(() => {
            const sel = window.getSelection();
            const text = sel.toString().trim();
            
            if (text && text.length > 2 && text.length < 500 && 
                el.content.contains(sel.anchorNode) &&
                !sel.anchorNode.parentElement?.closest('pre, code, .mermaid')) {
                
                const range = sel.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                // Position popup above selection
                const popupW = 200;
                let left = rect.left + (rect.width / 2) - (popupW / 2);
                left = Math.max(10, Math.min(left, window.innerWidth - popupW - 10));
                
                el.highlightPopup.style.left = `${left}px`;
                el.highlightPopup.style.top = `${rect.top + window.scrollY - 50}px`;
                el.highlightPopup.classList.add('visible');
            } else {
                el.highlightPopup.classList.remove('visible');
            }
        }, 10);
    });
    
    el.addHighlightBtn.onclick = () => {
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
                if (!window.getSelection().toString().trim()) {
                    el.highlightPopup.classList.remove('visible');
                }
            }, 50);
        }
    });
}

// Panels
function openHighlightsPanel() {
    renderHighlightsList();
    el.highlightsPanel.classList.add('open');
    el.overlay.classList.add('active');
}

function closeHighlightsPanel() {
    el.highlightsPanel.classList.remove('open');
    if (!el.sidebar.classList.contains('open')) el.overlay.classList.remove('active');
}

function openMobileSidebar() {
    el.sidebar.classList.add('open');
    el.overlay.classList.add('active');
}

function closeMobileSidebar() {
    el.sidebar.classList.remove('open');
    if (!el.highlightsPanel.classList.contains('open')) el.overlay.classList.remove('active');
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
    
    el.toggleHighlights.onclick = openHighlightsPanel;
    el.closePanelBtn.onclick = closeHighlightsPanel;
    el.clearHighlightsBtn.onclick = clearPageHighlights;
    el.clearAllHighlightsBtn.onclick = clearAllHighlights;
    el.exportHighlightsBtn.onclick = exportHighlights;
    
    el.mobileMenuToggle.onclick = () => {
        el.sidebar.classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
    };
    
    el.overlay.onclick = () => {
        closeMobileSidebar();
        closeHighlightsPanel();
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
    
    window.addEventListener('hashchange', handleHashChange);
    
    // Keyboard
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeMobileSidebar();
            closeHighlightsPanel();
            closeThemeDropdown();
            closeMermaidFullscreen();
            el.highlightPopup.classList.remove('visible');
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            el.searchInput.focus();
        }
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
