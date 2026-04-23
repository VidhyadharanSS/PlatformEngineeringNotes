/**
 * Platform Engineering Notes - Main Application
 * Features:
 * - Markdown rendering with Mermaid diagram support
 * - Navigation tree from notes structure
 * - Text highlighting with localStorage persistence
 * - Search functionality
 */

// ========================================
// Configuration
// ========================================
const CONFIG = {
    STORAGE_KEY: 'platform-notes-highlights',
    NOTES_INDEX: 'notes.json'
};

// Module icons mapping
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
    overlay: document.getElementById('overlay')
};

// ========================================
// Initialize Application
// ========================================
async function init() {
    // Initialize Mermaid
    mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        securityLevel: 'loose',
        fontFamily: 'inherit'
    });

    // Load highlights from localStorage
    loadHighlights();

    // Load notes index
    await loadNotesIndex();

    // Build navigation
    buildNavigation();

    // Setup event listeners
    setupEventListeners();

    // Handle initial URL hash
    handleHashChange();

    // Update highlight count
    updateHighlightCount();
}

// ========================================
// Notes Data Loading
// ========================================
async function loadNotesIndex() {
    try {
        const response = await fetch(CONFIG.NOTES_INDEX);
        if (!response.ok) throw new Error('Failed to load notes index');
        notesData = await response.json();
    } catch (error) {
        console.error('Error loading notes index:', error);
        // Fallback: show error message
        elements.content.innerHTML = `
            <div class="welcome-screen">
                <h1>⚠️ Error Loading Notes</h1>
                <p>Could not load the notes index. Please refresh the page.</p>
            </div>
        `;
    }
}

// ========================================
// Navigation Building
// ========================================
function buildNavigation() {
    if (!notesData) return;

    elements.navTree.innerHTML = '';

    notesData.modules.forEach(module => {
        const moduleEl = createModuleElement(module);
        elements.navTree.appendChild(moduleEl);
    });
}

function createModuleElement(module) {
    const moduleDiv = document.createElement('div');
    moduleDiv.className = 'nav-module';
    moduleDiv.dataset.module = module.name;

    const icon = MODULE_ICONS[module.name] || '📁';
    const displayName = module.name.replace(/^\d+-/, '').replace(/-/g, ' ');

    moduleDiv.innerHTML = `
        <div class="nav-module-header">
            <span class="icon">${icon}</span>
            <span class="name">${displayName}</span>
            <span class="arrow">▶</span>
        </div>
        <div class="nav-module-content"></div>
    `;

    const header = moduleDiv.querySelector('.nav-module-header');
    const content = moduleDiv.querySelector('.nav-module-content');

    header.addEventListener('click', () => {
        moduleDiv.classList.toggle('expanded');
    });

    // Add approach guide if exists
    if (module.approachGuide) {
        const guideItem = document.createElement('div');
        guideItem.className = 'nav-item approach-guide';
        guideItem.textContent = '📋 Approach Guide';
        guideItem.dataset.path = module.approachGuide;
        guideItem.addEventListener('click', () => loadNote(module.approachGuide));
        content.appendChild(guideItem);
    }

    // Add subchapters
    module.subchapters.forEach(subchapter => {
        const subchapterEl = createSubchapterElement(subchapter);
        content.appendChild(subchapterEl);
    });

    return moduleDiv;
}

function createSubchapterElement(subchapter) {
    const subDiv = document.createElement('div');
    subDiv.className = 'nav-subchapter';

    const displayName = subchapter.name.replace(/^Subchapter_/, '').replace(/_/g, '.');

    subDiv.innerHTML = `
        <div class="nav-subchapter-header">
            <span class="name">${displayName}</span>
            <span class="arrow">▶</span>
        </div>
        <div class="nav-subchapter-content"></div>
    `;

    const header = subDiv.querySelector('.nav-subchapter-header');
    const content = subDiv.querySelector('.nav-subchapter-content');

    header.addEventListener('click', (e) => {
        e.stopPropagation();
        subDiv.classList.toggle('expanded');
    });

    // Add files
    subchapter.files.forEach(file => {
        const fileItem = document.createElement('div');
        const isReview = file.name.toLowerCase().includes('review') || 
                         file.name.toLowerCase().includes('exam') ||
                         file.name.toLowerCase().includes('cheatsheet');
        
        fileItem.className = `nav-item${isReview ? ' review' : ''}`;
        fileItem.textContent = formatFileName(file.name);
        fileItem.dataset.path = file.path;
        fileItem.addEventListener('click', () => loadNote(file.path));
        content.appendChild(fileItem);
    });

    return subDiv;
}

function formatFileName(name) {
    // Remove extension and leading numbers
    return name
        .replace(/\.md$/, '')
        .replace(/^[\d.]+_?/, '')
        .replace(/_/g, ' ')
        .replace(/Plus/g, '+');
}

// ========================================
// Note Loading and Rendering
// ========================================
async function loadNote(path) {
    currentNotePath = path;
    
    // Update URL hash
    window.location.hash = encodeURIComponent(path);

    // Show loading state
    elements.content.innerHTML = '<div class="loading"></div>';

    // Update active state in navigation
    updateActiveNavItem(path);

    // Update breadcrumb
    updateBreadcrumb(path);

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error('Failed to load note');
        
        const markdown = await response.text();
        renderMarkdown(markdown);
        
        // Apply existing highlights
        applyHighlights();
        
        // Close mobile sidebar
        closeMobileSidebar();
        
        // Scroll to top
        window.scrollTo(0, 0);
    } catch (error) {
        console.error('Error loading note:', error);
        elements.content.innerHTML = `
            <div class="welcome-screen">
                <h1>⚠️ Error Loading Note</h1>
                <p>Could not load: ${path}</p>
            </div>
        `;
    }
}

function renderMarkdown(markdown) {
    // Configure marked
    marked.setOptions({
        gfm: true,
        breaks: true,
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (e) {}
            }
            return hljs.highlightAuto(code).value;
        }
    });

    // Pre-process mermaid blocks
    const mermaidBlocks = [];
    const processedMarkdown = markdown.replace(/```mermaid\n([\s\S]*?)```/g, (match, code) => {
        const id = `mermaid-${mermaidBlocks.length}`;
        mermaidBlocks.push({ id, code: code.trim() });
        return `<div class="mermaid" id="${id}"></div>`;
    });

    // Render markdown
    elements.content.innerHTML = marked.parse(processedMarkdown);

    // Render mermaid diagrams
    mermaidBlocks.forEach(async ({ id, code }) => {
        const el = document.getElementById(id);
        if (el) {
            try {
                const { svg } = await mermaid.render(`${id}-svg`, code);
                el.innerHTML = svg;
            } catch (e) {
                console.error('Mermaid render error:', e);
                el.innerHTML = `<pre>${code}</pre>`;
            }
        }
    });
}

function updateActiveNavItem(path) {
    // Remove all active states
    document.querySelectorAll('.nav-item.active').forEach(el => {
        el.classList.remove('active');
    });

    // Find and activate the current item
    const activeItem = document.querySelector(`.nav-item[data-path="${path}"]`);
    if (activeItem) {
        activeItem.classList.add('active');

        // Expand parent containers
        const subchapter = activeItem.closest('.nav-subchapter');
        if (subchapter) subchapter.classList.add('expanded');

        const module = activeItem.closest('.nav-module');
        if (module) module.classList.add('expanded');
    }
}

function updateBreadcrumb(path) {
    const parts = path.split('/');
    const module = parts[0];
    const subchapter = parts[1];
    const file = parts[2];

    const moduleName = module.replace(/^\d+-/, '').replace(/-/g, ' ');
    const subchapterName = subchapter ? subchapter.replace(/^Subchapter_/, '').replace(/_/g, '.') : '';
    const fileName = file ? formatFileName(file) : '';

    let breadcrumbHtml = `<a href="#" onclick="showWelcome(); return false;">Home</a>`;
    breadcrumbHtml += ` <span>/</span> ${moduleName}`;
    if (subchapterName) breadcrumbHtml += ` <span>/</span> ${subchapterName}`;
    if (fileName) breadcrumbHtml += ` <span>/</span> ${fileName}`;

    elements.breadcrumb.innerHTML = breadcrumbHtml;
}

function showWelcome() {
    currentNotePath = null;
    window.location.hash = '';
    elements.breadcrumb.innerHTML = '';
    
    // Remove active states
    document.querySelectorAll('.nav-item.active').forEach(el => {
        el.classList.remove('active');
    });

    // Show welcome screen
    elements.content.innerHTML = document.querySelector('.welcome-screen')?.outerHTML || 
        '<h1>Welcome to Platform Engineering Notes</h1>';
    
    // Re-attach module card listeners
    setupModuleCards();
}

function handleHashChange() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        const path = decodeURIComponent(hash);
        loadNote(path);
    }
}

// ========================================
// Search Functionality
// ========================================
function setupSearch() {
    let debounceTimer;
    
    elements.searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            filterNavigation(e.target.value.toLowerCase());
        }, 200);
    });
}

function filterNavigation(query) {
    if (!query) {
        // Show all items
        document.querySelectorAll('.nav-module, .nav-subchapter, .nav-item').forEach(el => {
            el.style.display = '';
        });
        // Collapse all
        document.querySelectorAll('.nav-module, .nav-subchapter').forEach(el => {
            el.classList.remove('expanded');
        });
        return;
    }

    document.querySelectorAll('.nav-module').forEach(moduleEl => {
        let moduleHasMatch = false;

        moduleEl.querySelectorAll('.nav-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            const matches = text.includes(query);
            item.style.display = matches ? '' : 'none';
            if (matches) moduleHasMatch = true;
        });

        moduleEl.querySelectorAll('.nav-subchapter').forEach(subEl => {
            const hasVisibleItems = subEl.querySelectorAll('.nav-item[style=""]').length > 0 ||
                                   subEl.querySelectorAll('.nav-item:not([style*="none"])').length > 0;
            subEl.style.display = hasVisibleItems ? '' : 'none';
            if (hasVisibleItems) subEl.classList.add('expanded');
        });

        moduleEl.style.display = moduleHasMatch ? '' : 'none';
        if (moduleHasMatch) moduleEl.classList.add('expanded');
    });
}

// ========================================
// Highlighting System
// ========================================
function loadHighlights() {
    try {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        highlights = stored ? JSON.parse(stored) : [];
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

    const pageHighlights = highlights.filter(h => h.path === currentNotePath);
    
    pageHighlights.forEach(highlight => {
        highlightTextInContent(highlight.text, highlight.id);
    });
}

function highlightTextInContent(text, highlightId) {
    const walker = document.createTreeWalker(
        elements.content,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    while (node = walker.nextNode()) {
        const index = node.textContent.indexOf(text);
        if (index !== -1) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + text.length);

            const span = document.createElement('span');
            span.className = 'user-highlight';
            span.dataset.highlightId = highlightId;
            span.addEventListener('click', () => scrollToHighlightInPanel(highlightId));

            range.surroundContents(span);
            break;
        }
    }
}

function addHighlight(text) {
    if (!currentNotePath || !text.trim()) return;

    const highlight = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        path: currentNotePath,
        text: text.trim(),
        createdAt: new Date().toISOString()
    };

    highlights.push(highlight);
    saveHighlights();
    highlightTextInContent(highlight.text, highlight.id);
    renderHighlightsList();
}

function removeHighlight(id) {
    highlights = highlights.filter(h => h.id !== id);
    saveHighlights();
    
    // Remove from DOM
    const el = document.querySelector(`[data-highlight-id="${id}"]`);
    if (el) {
        const text = el.textContent;
        el.replaceWith(document.createTextNode(text));
    }
    
    renderHighlightsList();
}

function clearPageHighlights() {
    if (!currentNotePath) return;
    
    highlights = highlights.filter(h => h.path !== currentNotePath);
    saveHighlights();
    
    // Remove all highlights from DOM
    document.querySelectorAll('.user-highlight').forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent));
    });
    
    renderHighlightsList();
}

function clearAllHighlights() {
    if (!confirm('Are you sure you want to delete ALL highlights? This cannot be undone.')) return;
    
    highlights = [];
    saveHighlights();
    
    // Remove all highlights from DOM
    document.querySelectorAll('.user-highlight').forEach(el => {
        el.replaceWith(document.createTextNode(el.textContent));
    });
    
    renderHighlightsList();
}

function exportHighlights() {
    const data = JSON.stringify(highlights, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
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
                <p>No highlights yet.</p>
                <p>Select text in the notes to highlight it!</p>
            </div>
        `;
        return;
    }

    // Sort by creation date (newest first)
    const sorted = [...highlights].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    elements.highlightsList.innerHTML = sorted.map(h => `
        <div class="highlight-item" data-path="${h.path}" data-id="${h.id}">
            <div class="highlight-item-source">${formatPathForDisplay(h.path)}</div>
            <div class="highlight-item-text">${escapeHtml(h.text)}</div>
            <div class="highlight-item-actions">
                <button class="highlight-item-delete" data-id="${h.id}">🗑️ Remove</button>
            </div>
        </div>
    `).join('');

    // Add click handlers
    elements.highlightsList.querySelectorAll('.highlight-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.classList.contains('highlight-item-delete')) {
                e.stopPropagation();
                removeHighlight(e.target.dataset.id);
            } else {
                const path = item.dataset.path;
                loadNote(path);
                closeHighlightsPanel();
            }
        });
    });
}

function scrollToHighlightInPanel(id) {
    openHighlightsPanel();
    const item = elements.highlightsList.querySelector(`[data-id="${id}"]`);
    if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.style.animation = 'pulse 0.5s ease';
    }
}

function formatPathForDisplay(path) {
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
// Text Selection Handling
// ========================================
function setupTextSelection() {
    let selectedText = '';

    document.addEventListener('mouseup', (e) => {
        // Ignore if clicking inside popup or panel
        if (e.target.closest('.highlight-popup') || e.target.closest('.highlights-panel')) {
            return;
        }

        const selection = window.getSelection();
        selectedText = selection.toString().trim();

        if (selectedText && selectedText.length > 2 && elements.content.contains(selection.anchorNode)) {
            // Position popup near selection
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            elements.highlightPopup.style.display = 'block';
            elements.highlightPopup.style.left = `${rect.left + rect.width / 2 - 50}px`;
            elements.highlightPopup.style.top = `${rect.top - 40 + window.scrollY}px`;
        } else {
            elements.highlightPopup.style.display = 'none';
        }
    });

    elements.addHighlightBtn.addEventListener('click', () => {
        if (selectedText) {
            addHighlight(selectedText);
            window.getSelection().removeAllRanges();
            elements.highlightPopup.style.display = 'none';
        }
    });

    // Hide popup when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
        if (!e.target.closest('.highlight-popup')) {
            elements.highlightPopup.style.display = 'none';
        }
    });
}

// ========================================
// Highlights Panel
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

// ========================================
// Mobile Navigation
// ========================================
function openMobileSidebar() {
    elements.sidebar.classList.add('open');
    elements.mobileMenuToggle.classList.add('active');
    elements.overlay.classList.add('active');
}

function closeMobileSidebar() {
    elements.sidebar.classList.remove('open');
    elements.mobileMenuToggle.classList.remove('active');
    if (!elements.highlightsPanel.classList.contains('open')) {
        elements.overlay.classList.remove('active');
    }
}

// ========================================
// Module Cards (Welcome Screen)
// ========================================
function setupModuleCards() {
    document.querySelectorAll('.module-card').forEach(card => {
        card.addEventListener('click', () => {
            const moduleName = card.dataset.module;
            
            // Find the module in navTree and expand it
            const moduleEl = document.querySelector(`.nav-module[data-module="${moduleName}"]`);
            if (moduleEl) {
                moduleEl.classList.add('expanded');
                
                // Load the first file
                const firstItem = moduleEl.querySelector('.nav-item');
                if (firstItem) {
                    loadNote(firstItem.dataset.path);
                }
            }
        });
    });
}

// ========================================
// Event Listeners Setup
// ========================================
function setupEventListeners() {
    // Search
    setupSearch();

    // Text selection for highlighting
    setupTextSelection();

    // Module cards
    setupModuleCards();

    // Highlights panel
    elements.toggleHighlights.addEventListener('click', openHighlightsPanel);
    elements.closePanelBtn.addEventListener('click', closeHighlightsPanel);
    elements.clearHighlightsBtn.addEventListener('click', clearPageHighlights);
    elements.clearAllHighlightsBtn.addEventListener('click', clearAllHighlights);
    elements.exportHighlightsBtn.addEventListener('click', exportHighlights);

    // Mobile menu
    elements.mobileMenuToggle.addEventListener('click', () => {
        if (elements.sidebar.classList.contains('open')) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    });

    // Overlay click
    elements.overlay.addEventListener('click', () => {
        closeMobileSidebar();
        closeHighlightsPanel();
    });

    // Hash change
    window.addEventListener('hashchange', handleHashChange);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape closes panels
        if (e.key === 'Escape') {
            closeMobileSidebar();
            closeHighlightsPanel();
            elements.highlightPopup.style.display = 'none';
        }
        
        // Ctrl/Cmd + K focuses search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            elements.searchInput.focus();
        }
    });
}

// ========================================
// Start Application
// ========================================
document.addEventListener('DOMContentLoaded', init);
