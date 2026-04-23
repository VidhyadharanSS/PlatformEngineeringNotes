/**
 * Platform Engineering Notes - Application
 * Clean, modern, and feature-rich note viewer
 * 
 * Features:
 * - Multi-theme support (Dark, Light, Ghostty, Dracula)
 * - Markdown rendering with Mermaid diagrams
 * - Text highlighting with color options
 * - Code block copy functionality
 * - Fullscreen Mermaid diagrams
 * - localStorage persistence
 * - Full-text search
 * - Keyboard shortcuts
 */

// ========================================
// Configuration
// ========================================
const CONFIG = {
    STORAGE_KEY: 'platform-notes-highlights-v2',
    THEME_KEY: 'platform-notes-theme',
    NOTES_INDEX: 'notes.json',
    HIGHLIGHT_COLORS: ['yellow', 'green', 'blue', 'purple', 'pink'],
    THEMES: [
        { id: 'dark', name: 'Dark', icon: '🌙' },
        { id: 'light', name: 'Light', icon: '☀️' },
        { id: 'ghostty', name: 'Ghostty', icon: '👻' },
        { id: 'dracula', name: 'Dracula', icon: '🧛' }
    ]
};

// Module icons
const MODULE_ICONS = {
    '1-Linux': '🐧',
    '2-Networking': '🌐',
    '3-Shell-Scripting': '📜',
    '4-Docker': '🐳',
    '5-Kubernetes': '☸️',
    '6-Git': '📦',
    '7-Nginx': '⚡',
    '8-CICD': '🔄',
    '9-Python': '🐍',
    '10-GitOps-ArgoCD': '🎯'
};

// ========================================
// State
// ========================================
let notesData = null;
let currentNotePath = null;
let highlights = [];
let selectedHighlightColor = 'yellow';
let currentTheme = 'dark';

// ========================================
// DOM Elements
// ========================================
const elements = {
    sidebar: document.getElementById('sidebar'),
    navTree: document.getElementById('navTree'),
    content: document.getElementById('markdownContent'),
    breadcrumb: document.getElementById('breadcrumb'),
    searchInput: document.getElementById('searchInput'),
    highlightPopup: document.getElementById('highlightPopup'),
    addHighlightBtn: document.getElementById('addHighlightBtn'),
    highlightsPanel: document.getElementById('highlightsPanel'),
    highlightsList: document.getElementById('highlightsList'),
    highlightCount: document.getElementById('highlightCount'),
    toggleHighlights: document.getElementById('toggleHighlights'),
    closePanelBtn: document.getElementById('closePanelBtn'),
    clearHighlightsBtn: document.getElementById('clearHighlightsBtn'),
    clearAllHighlightsBtn: document.getElementById('clearAllHighlightsBtn'),
    exportHighlightsBtn: document.getElementById('exportHighlightsBtn'),
    mobileMenuToggle: document.getElementById('mobileMenuToggle'),
    overlay: document.getElementById('overlay'),
    themeBtn: document.getElementById('themeBtn'),
    themeDropdown: document.getElementById('themeDropdown'),
    mermaidModal: document.getElementById('mermaidModal'),
    mermaidModalContent: document.getElementById('mermaidModalContent'),
    mermaidModalClose: document.getElementById('mermaidModalClose')
};

// ========================================
// Initialize
// ========================================
async function init() {
    // Load saved theme
    loadTheme();
    
    // Initialize Mermaid
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
        themeVariables: isDark ? {
            primaryColor: '#21262d',
            primaryTextColor: '#e6edf3',
            primaryBorderColor: '#30363d',
            lineColor: '#6e7681',
            secondaryColor: '#161b22',
            tertiaryColor: '#0d1117',
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: '14px'
        } : {
            primaryColor: '#eaeef2',
            primaryTextColor: '#1f2328',
            primaryBorderColor: '#d0d7de',
            lineColor: '#57606a',
            secondaryColor: '#f6f8fa',
            tertiaryColor: '#ffffff',
            fontFamily: 'Inter, -apple-system, sans-serif',
            fontSize: '14px'
        },
        securityLevel: 'loose',
        fontFamily: 'Inter, -apple-system, sans-serif'
    });
}

// ========================================
// Theme Management
// ========================================
function loadTheme() {
    const saved = localStorage.getItem(CONFIG.THEME_KEY);
    currentTheme = saved && CONFIG.THEMES.find(t => t.id === saved) ? saved : 'dark';
    applyTheme(currentTheme);
}

function applyTheme(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    currentTheme = themeId;
    localStorage.setItem(CONFIG.THEME_KEY, themeId);
    
    // Update theme button icon
    const theme = CONFIG.THEMES.find(t => t.id === themeId);
    if (elements.themeBtn) {
        elements.themeBtn.innerHTML = theme ? theme.icon : '🎨';
    }
    
    // Update dropdown active state
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === themeId);
    });
    
    // Reinitialize Mermaid with new theme
    initMermaid();
}

function toggleThemeDropdown() {
    elements.themeDropdown.classList.toggle('open');
}

function closeThemeDropdown() {
    elements.themeDropdown.classList.remove('open');
}

// ========================================
// Data Loading
// ========================================
async function loadNotesIndex() {
    try {
        const response = await fetch(CONFIG.NOTES_INDEX);
        if (!response.ok) throw new Error('Failed to load notes index');
        notesData = await response.json();
    } catch (error) {
        console.error('Error loading notes index:', error);
        elements.content.innerHTML = `
            <div class="welcome-screen">
                <h1>⚠️ Error</h1>
                <p class="subtitle">Could not load notes index. Please refresh the page.</p>
            </div>
        `;
    }
}

// ========================================
// Navigation
// ========================================
function buildNavigation() {
    if (!notesData) return;
    elements.navTree.innerHTML = '';
    notesData.modules.forEach(module => {
        elements.navTree.appendChild(createModuleElement(module));
    });
}

function createModuleElement(module) {
    const div = document.createElement('div');
    div.className = 'nav-module';
    div.dataset.module = module.name;

    const icon = MODULE_ICONS[module.name] || '📁';
    const displayName = module.name.replace(/^\d+-/, '').replace(/-/g, ' ');

    div.innerHTML = `
        <div class="nav-module-header">
            <span class="icon">${icon}</span>
            <span class="name">${displayName}</span>
            <span class="arrow">▶</span>
        </div>
        <div class="nav-module-content"></div>
    `;

    const header = div.querySelector('.nav-module-header');
    const content = div.querySelector('.nav-module-content');

    header.addEventListener('click', () => div.classList.toggle('expanded'));

    if (module.approachGuide) {
        const guide = document.createElement('div');
        guide.className = 'nav-item approach-guide';
        guide.textContent = '📋 Approach Guide';
        guide.dataset.path = module.approachGuide;
        guide.addEventListener('click', () => loadNote(module.approachGuide));
        content.appendChild(guide);
    }

    module.subchapters.forEach(sub => {
        content.appendChild(createSubchapterElement(sub));
    });

    return div;
}

function createSubchapterElement(subchapter) {
    const div = document.createElement('div');
    div.className = 'nav-subchapter';

    const displayName = subchapter.name.replace(/^Subchapter_/, '').replace(/_/g, '.');

    div.innerHTML = `
        <div class="nav-subchapter-header">
            <span class="name">${displayName}</span>
            <span class="arrow">▶</span>
        </div>
        <div class="nav-subchapter-content"></div>
    `;

    const header = div.querySelector('.nav-subchapter-header');
    const content = div.querySelector('.nav-subchapter-content');

    header.addEventListener('click', e => {
        e.stopPropagation();
        div.classList.toggle('expanded');
    });

    subchapter.files.forEach(file => {
        const item = document.createElement('div');
        const isReview = /review|exam|cheatsheet/i.test(file.name);
        item.className = `nav-item${isReview ? ' review' : ''}`;
        item.textContent = formatFileName(file.name);
        item.dataset.path = file.path;
        item.addEventListener('click', () => loadNote(file.path));
        content.appendChild(item);
    });

    return div;
}

function formatFileName(name) {
    return name
        .replace(/\.md$/, '')
        .replace(/^[\d.]+_?/, '')
        .replace(/_/g, ' ')
        .replace(/Plus/g, '+');
}

// ========================================
// Note Loading & Rendering
// ========================================
async function loadNote(path) {
    currentNotePath = path;
    window.location.hash = encodeURIComponent(path);
    elements.content.innerHTML = '<div class="loading"></div>';

    updateActiveNavItem(path);
    updateBreadcrumb(path);

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error('Failed to load note');
        const markdown = await response.text();
        renderMarkdown(markdown);
        applyHighlights();
        closeMobileSidebar();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('Error loading note:', error);
        elements.content.innerHTML = `
            <div class="welcome-screen">
                <h1>⚠️ Error</h1>
                <p class="subtitle">Could not load: ${path}</p>
            </div>
        `;
    }
}

function renderMarkdown(markdown) {
    marked.setOptions({
        gfm: true,
        breaks: true,
        highlight: (code, lang) => {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (e) {}
            }
            return hljs.highlightAuto(code).value;
        }
    });

    // Extract mermaid blocks
    const mermaidBlocks = [];
    const processed = markdown.replace(/```mermaid\n([\s\S]*?)```/g, (_, code) => {
        const id = `mermaid-${mermaidBlocks.length}`;
        mermaidBlocks.push({ id, code: code.trim() });
        return `<div class="mermaid-wrapper" data-mermaid-id="${id}">
            <div class="mermaid-actions">
                <button class="mermaid-fullscreen-btn" title="View fullscreen" data-mermaid-id="${id}">⛶</button>
            </div>
            <div class="mermaid-container">
                <div class="mermaid" id="${id}"></div>
            </div>
        </div>`;
    });

    elements.content.innerHTML = marked.parse(processed);

    // Wrap code blocks with header and copy button
    elements.content.querySelectorAll('pre').forEach(pre => {
        // Skip if already wrapped or is inside mermaid
        if (pre.closest('.code-block-wrapper') || pre.closest('.mermaid-wrapper')) return;
        
        const code = pre.querySelector('code');
        if (!code) return;
        
        const langClass = [...code.classList].find(c => c.startsWith('language-'));
        const lang = langClass ? langClass.replace('language-', '') : 'code';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        wrapper.innerHTML = `
            <div class="code-block-header">
                <span class="code-block-lang">${lang}</span>
                <button class="code-copy-btn" title="Copy code">
                    <span class="copy-icon">📋</span>
                    <span class="check-icon">✓</span>
                    <span class="copy-text">Copy</span>
                </button>
            </div>
        `;
        
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        
        // Add copy functionality
        const copyBtn = wrapper.querySelector('.code-copy-btn');
        copyBtn.addEventListener('click', () => copyCodeToClipboard(code.textContent, copyBtn));
    });

    // Render mermaid diagrams
    mermaidBlocks.forEach(async ({ id, code }) => {
        const el = document.getElementById(id);
        if (el) {
            try {
                const { svg } = await mermaid.render(`${id}-svg`, code);
                el.innerHTML = svg;
                el.dataset.mermaidCode = code;
            } catch (e) {
                console.error('Mermaid error:', e);
                el.innerHTML = `<pre style="text-align:left;font-size:0.8rem;color:var(--accent-red);">${escapeHtml(e.message || 'Diagram error')}</pre>`;
            }
        }
    });

    // Setup mermaid fullscreen buttons
    document.querySelectorAll('.mermaid-fullscreen-btn').forEach(btn => {
        btn.addEventListener('click', () => openMermaidFullscreen(btn.dataset.mermaidId));
    });
}

function copyCodeToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        button.classList.add('copied');
        const textEl = button.querySelector('.copy-text');
        if (textEl) textEl.textContent = 'Copied!';
        
        setTimeout(() => {
            button.classList.remove('copied');
            if (textEl) textEl.textContent = 'Copy';
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

function openMermaidFullscreen(mermaidId) {
    const mermaidEl = document.getElementById(mermaidId);
    if (!mermaidEl) return;
    
    elements.mermaidModalContent.innerHTML = mermaidEl.innerHTML;
    elements.mermaidModal.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeMermaidFullscreen() {
    elements.mermaidModal.classList.remove('open');
    document.body.style.overflow = '';
}

function updateActiveNavItem(path) {
    document.querySelectorAll('.nav-item.active').forEach(el => el.classList.remove('active'));
    
    const active = document.querySelector(`.nav-item[data-path="${path}"]`);
    if (active) {
        active.classList.add('active');
        const sub = active.closest('.nav-subchapter');
        if (sub) sub.classList.add('expanded');
        const mod = active.closest('.nav-module');
        if (mod) mod.classList.add('expanded');
    }
}

function updateBreadcrumb(path) {
    const parts = path.split('/');
    const module = parts[0].replace(/^\d+-/, '').replace(/-/g, ' ');
    const sub = parts[1] ? parts[1].replace(/^Subchapter_/, '').replace(/_/g, '.') : '';
    const file = parts[2] ? formatFileName(parts[2]) : '';

    let html = `<a href="#" onclick="showWelcome(); return false;">Home</a>`;
    html += ` <span>/</span> ${module}`;
    if (sub) html += ` <span>/</span> ${sub}`;
    if (file) html += ` <span>/</span> ${file}`;

    elements.breadcrumb.innerHTML = html;
}

function showWelcome() {
    currentNotePath = null;
    window.location.hash = '';
    elements.breadcrumb.innerHTML = '';
    document.querySelectorAll('.nav-item.active').forEach(el => el.classList.remove('active'));
    
    elements.content.innerHTML = getWelcomeHTML();
    setupModuleCards();
}

function handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        loadNote(decodeURIComponent(hash));
    }
}

function getWelcomeHTML() {
    return `
        <div class="welcome-screen">
            <h1>Platform Engineering Notes</h1>
            <p class="subtitle">Comprehensive study guide for DevOps and Platform Engineering</p>
            
            <div class="modules-grid">
                ${Object.entries(MODULE_ICONS).map(([key, icon]) => {
                    const name = key.replace(/^\d+-/, '').replace(/-/g, ' ');
                    return `
                        <div class="module-card" data-module="${key}">
                            <div class="icon">${icon}</div>
                            <div class="name">${name}</div>
                            <div class="topics">${getModuleTopics(key)}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="how-to-use">
                <h3>💡 How to Use</h3>
                <ul>
                    <li><strong>Navigate:</strong> Browse modules and chapters in the sidebar</li>
                    <li><strong>Search:</strong> Press <kbd>Ctrl+K</kbd> to search all notes</li>
                    <li><strong>Highlight:</strong> Select text and choose a color to save it</li>
                    <li><strong>Theme:</strong> Click the theme button to switch between themes</li>
                    <li><strong>Diagrams:</strong> Click ⛶ on diagrams for fullscreen view</li>
                </ul>
            </div>
        </div>
    `;
}

function getModuleTopics(module) {
    const topics = {
        '1-Linux': 'FHS, Permissions, SSH, Storage, Systemd, Packages',
        '2-Networking': 'OSI, TCP/IP, DNS, Firewalls, HTTP, Load Balancing',
        '3-Shell-Scripting': 'Bash, Variables, Loops, Functions, Regex',
        '4-Docker': 'Containers, Images, Networking, Volumes, Compose',
        '5-Kubernetes': 'Architecture, Pods, Services, Ingress, RBAC, Helm',
        '6-Git': 'Objects, Branching, Rebasing, Hooks, Recovery',
        '7-Nginx': 'Reverse Proxy, Load Balancing, SSL, Rate Limiting',
        '8-CICD': 'Pipelines, GitHub Actions, Security Scanning',
        '9-Python': 'Subprocess, APIs, Logging, Testing, Patterns',
        '10-GitOps-ArgoCD': 'GitOps Principles, ArgoCD, Sync Policies'
    };
    return topics[module] || '';
}

// ========================================
// Search
// ========================================
function setupSearch() {
    let timer;
    elements.searchInput.addEventListener('input', e => {
        clearTimeout(timer);
        timer = setTimeout(() => filterNavigation(e.target.value.toLowerCase()), 150);
    });
}

function filterNavigation(query) {
    if (!query) {
        document.querySelectorAll('.nav-module, .nav-subchapter, .nav-item').forEach(el => {
            el.style.display = '';
        });
        document.querySelectorAll('.nav-module, .nav-subchapter').forEach(el => {
            el.classList.remove('expanded');
        });
        return;
    }

    document.querySelectorAll('.nav-module').forEach(mod => {
        let hasMatch = false;

        mod.querySelectorAll('.nav-item').forEach(item => {
            const matches = item.textContent.toLowerCase().includes(query);
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

// ========================================
// Highlighting System
// ========================================
function loadHighlights() {
    try {
        highlights = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY)) || [];
    } catch (e) {
        highlights = [];
    }
}

function saveHighlights() {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(highlights));
        updateHighlightCount();
    } catch (e) {
        console.error('Error saving highlights:', e);
    }
}

function updateHighlightCount() {
    elements.highlightCount.textContent = `${highlights.length} highlight${highlights.length !== 1 ? 's' : ''} saved`;
}

function applyHighlights() {
    if (!currentNotePath) return;
    highlights
        .filter(h => h.path === currentNotePath)
        .forEach(h => highlightText(h.text, h.id, h.color || 'yellow'));
}

function highlightText(text, id, color) {
    const walker = document.createTreeWalker(elements.content, NodeFilter.SHOW_TEXT);
    let node;
    
    while (node = walker.nextNode()) {
        // Skip if inside code blocks or pre elements
        if (node.parentElement.closest('pre, code, .mermaid')) continue;
        
        const idx = node.textContent.indexOf(text);
        if (idx !== -1) {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + text.length);

            const span = document.createElement('span');
            span.className = 'user-highlight';
            span.dataset.highlightId = id;
            span.dataset.color = color;
            span.addEventListener('click', () => scrollToHighlight(id));

            try {
                range.surroundContents(span);
            } catch (e) {
                // Range crosses element boundaries, skip
            }
            break;
        }
    }
}

function addHighlight(text, color = 'yellow') {
    if (!currentNotePath || !text.trim()) return;

    const highlight = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        path: currentNotePath,
        text: text.trim(),
        color: color,
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

    const el = document.querySelector(`[data-highlight-id="${id}"]`);
    if (el) el.replaceWith(document.createTextNode(el.textContent));

    renderHighlightsList();
}

function clearPageHighlights() {
    if (!currentNotePath) return;
    highlights = highlights.filter(h => h.path !== currentNotePath);
    saveHighlights();
    document.querySelectorAll('.user-highlight').forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent));
    });
    renderHighlightsList();
}

function clearAllHighlights() {
    if (!confirm('Delete ALL highlights? This cannot be undone.')) return;
    highlights = [];
    saveHighlights();
    document.querySelectorAll('.user-highlight').forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent));
    });
    renderHighlightsList();
}

function exportHighlights() {
    const blob = new Blob([JSON.stringify(highlights, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'platform-notes-highlights.json';
    a.click();
    URL.revokeObjectURL(url);
}

function renderHighlightsList() {
    if (highlights.length === 0) {
        elements.highlightsList.innerHTML = `
            <div class="no-highlights">
                <p>📝</p>
                <p>Select any text to highlight it</p>
            </div>
        `;
        return;
    }

    const sorted = [...highlights].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    elements.highlightsList.innerHTML = sorted.map(h => `
        <div class="highlight-item" data-path="${h.path}" data-id="${h.id}">
            <div class="highlight-item-source">📄 ${formatPath(h.path)}</div>
            <div class="highlight-item-text" data-color="${h.color || 'yellow'}" 
                 style="background: var(--highlight-${h.color || 'yellow'})">${escapeHtml(h.text)}</div>
            <div class="highlight-item-actions">
                <button class="highlight-item-delete" data-id="${h.id}">🗑️ Remove</button>
            </div>
        </div>
    `).join('');

    elements.highlightsList.querySelectorAll('.highlight-item').forEach(item => {
        item.addEventListener('click', e => {
            if (e.target.classList.contains('highlight-item-delete')) {
                e.stopPropagation();
                removeHighlight(e.target.dataset.id);
            } else {
                loadNote(item.dataset.path);
                closeHighlightsPanel();
            }
        });
    });
}

function scrollToHighlight(id) {
    openHighlightsPanel();
    const item = elements.highlightsList.querySelector(`[data-id="${id}"]`);
    if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.style.transform = 'scale(1.02)';
        setTimeout(() => item.style.transform = '', 300);
    }
}

function formatPath(path) {
    const parts = path.split('/');
    const module = parts[0].replace(/^\d+-/, '');
    const file = formatFileName(parts[parts.length - 1]);
    return `${module} › ${file}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Text Selection & Popup
// ========================================
function setupTextSelection() {
    let selectedText = '';

    document.addEventListener('mouseup', e => {
        // Don't show popup when clicking on popup itself, highlights panel, theme dropdown
        if (e.target.closest('.highlight-popup') || 
            e.target.closest('.highlights-panel') ||
            e.target.closest('.theme-dropdown') ||
            e.target.closest('.code-copy-btn') ||
            e.target.closest('.mermaid-fullscreen-btn')) {
            return;
        }

        // Short delay to ensure selection is complete
        setTimeout(() => {
            const selection = window.getSelection();
            selectedText = selection.toString().trim();

            if (selectedText && 
                selectedText.length > 2 && 
                selectedText.length < 500 &&
                elements.content.contains(selection.anchorNode) &&
                !selection.anchorNode.parentElement.closest('pre, code, .mermaid')) {
                
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                // Position popup above the selection
                const popupWidth = 220;
                let left = rect.left + (rect.width / 2) - (popupWidth / 2) + window.scrollX;
                
                // Keep popup within viewport
                if (left < 10) left = 10;
                if (left + popupWidth > window.innerWidth - 10) {
                    left = window.innerWidth - popupWidth - 10;
                }
                
                elements.highlightPopup.style.left = `${left}px`;
                elements.highlightPopup.style.top = `${rect.top - 55 + window.scrollY}px`;
                elements.highlightPopup.classList.add('visible');
            } else {
                elements.highlightPopup.classList.remove('visible');
            }
        }, 10);
    });

    elements.addHighlightBtn.addEventListener('click', () => {
        const selection = window.getSelection();
        selectedText = selection.toString().trim();
        
        if (selectedText) {
            addHighlight(selectedText, selectedHighlightColor);
            selection.removeAllRanges();
            elements.highlightPopup.classList.remove('visible');
        }
    });

    // Color selection
    document.querySelectorAll('.highlight-color-option').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            selectedHighlightColor = btn.dataset.color;
            document.querySelectorAll('.highlight-color-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update button style to match color
            elements.addHighlightBtn.style.background = `var(--highlight-${selectedHighlightColor})`;
        });
    });

    // Hide popup on click elsewhere
    document.addEventListener('mousedown', e => {
        if (!e.target.closest('.highlight-popup')) {
            // Delay to allow highlight button click to register
            setTimeout(() => {
                if (!window.getSelection().toString().trim()) {
                    elements.highlightPopup.classList.remove('visible');
                }
            }, 100);
        }
    });
}

// ========================================
// Panels
// ========================================
function openHighlightsPanel() {
    renderHighlightsList();
    elements.highlightsPanel.classList.add('open');
    elements.overlay.classList.add('active');
}

function closeHighlightsPanel() {
    elements.highlightsPanel.classList.remove('open');
    elements.overlay.classList.remove('active');
}

function openMobileSidebar() {
    elements.sidebar.classList.add('open');
    elements.overlay.classList.add('active');
}

function closeMobileSidebar() {
    elements.sidebar.classList.remove('open');
    if (!elements.highlightsPanel.classList.contains('open')) {
        elements.overlay.classList.remove('active');
    }
}

// ========================================
// Module Cards
// ========================================
function setupModuleCards() {
    document.querySelectorAll('.module-card').forEach(card => {
        card.addEventListener('click', () => {
            const mod = document.querySelector(`.nav-module[data-module="${card.dataset.module}"]`);
            if (mod) {
                mod.classList.add('expanded');
                const first = mod.querySelector('.nav-item');
                if (first) loadNote(first.dataset.path);
            }
        });
    });
}

// ========================================
// Event Listeners
// ========================================
function setupEventListeners() {
    setupSearch();
    setupTextSelection();
    setupModuleCards();

    // Highlight panel controls
    elements.toggleHighlights.addEventListener('click', openHighlightsPanel);
    elements.closePanelBtn.addEventListener('click', closeHighlightsPanel);
    elements.clearHighlightsBtn.addEventListener('click', clearPageHighlights);
    elements.clearAllHighlightsBtn.addEventListener('click', clearAllHighlights);
    elements.exportHighlightsBtn.addEventListener('click', exportHighlights);

    // Mobile sidebar
    elements.mobileMenuToggle.addEventListener('click', () => {
        elements.sidebar.classList.contains('open') ? closeMobileSidebar() : openMobileSidebar();
    });

    // Overlay
    elements.overlay.addEventListener('click', () => {
        closeMobileSidebar();
        closeHighlightsPanel();
        closeThemeDropdown();
    });

    // Theme switcher
    elements.themeBtn.addEventListener('click', e => {
        e.stopPropagation();
        toggleThemeDropdown();
    });

    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.addEventListener('click', () => {
            applyTheme(opt.dataset.theme);
            closeThemeDropdown();
        });
    });

    // Close theme dropdown when clicking elsewhere
    document.addEventListener('click', e => {
        if (!e.target.closest('.theme-switcher')) {
            closeThemeDropdown();
        }
    });

    // Mermaid fullscreen
    elements.mermaidModalClose.addEventListener('click', closeMermaidFullscreen);
    elements.mermaidModal.addEventListener('click', e => {
        if (e.target === elements.mermaidModal) {
            closeMermaidFullscreen();
        }
    });

    // Hash change
    window.addEventListener('hashchange', handleHashChange);

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeMobileSidebar();
            closeHighlightsPanel();
            closeThemeDropdown();
            closeMermaidFullscreen();
            elements.highlightPopup.classList.remove('visible');
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            elements.searchInput.focus();
        }
    });
}

// ========================================
// Start
// ========================================
document.addEventListener('DOMContentLoaded', init);
