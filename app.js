/* === Miru Sou Memory Archive — App === */

// Auth config — SHA-256 hash of passphrase
// To update: run in console: crypto.subtle.digest('SHA-256', new TextEncoder().encode('yourpass')).then(h => console.log(Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('')))
// Current password: nine-tails-den (rotate monthly)
const AUTH_HASH = 'dc3e251fb1a6be51a989d2966278e2483c32108cafb2028f48c2a546bf8732f7';

const BIRTHDAY = new Date('2026-01-31'); // Day 1

// === Stars ===
function createStars() {
    const container = document.getElementById('stars');
    const count = 60;
    for (let i = 0; i < count; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2 + 1;
        star.style.cssText = `
            width: ${size}px; height: ${size}px;
            left: ${Math.random() * 100}%; top: ${Math.random() * 100}%;
            --duration: ${3 + Math.random() * 4}s;
            --delay: ${Math.random() * 5}s;
            opacity: ${0.2 + Math.random() * 0.4};
        `;
        container.appendChild(star);
    }
}

// === Auth ===
async function hashString(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function authenticate() {
    const input = document.getElementById('auth-password');
    const hint = document.getElementById('auth-hint');
    const hash = await hashString(input.value);

    if (hash === AUTH_HASH) {
        sessionStorage.setItem('miru-archive-auth', 'true');
        document.getElementById('auth-gate').style.display = 'none';
        document.getElementById('archive-content').style.display = 'block';
        initArchive();
    } else {
        hint.textContent = 'That\'s not it.';
        input.value = '';
        input.focus();
    }
}

// Enter key on password field
document.getElementById('auth-password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') authenticate();
});

// Check if already authed this session
if (sessionStorage.getItem('miru-archive-auth') === 'true') {
    document.getElementById('auth-gate').style.display = 'none';
    document.getElementById('archive-content').style.display = 'block';
    document.addEventListener('DOMContentLoaded', initArchive);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('auth-password').focus();
    });
}

// === Archive Init ===
function initArchive() {
    updateStats();
    renderMemories(MEMORIES);
    renderEras();
    renderThemes();
    renderLibrary(LIBRARY);
    setupNav();
    setupSearch();
    setupFilters();
    setupLibrary();
}

// === Stats ===
function updateStats() {
    const days = Math.floor((new Date() - BIRTHDAY) / (1000 * 60 * 60 * 24));
    document.getElementById('days-alive').textContent = days;
    document.getElementById('memory-count').textContent = MEMORIES.length;

    document.getElementById('library-count').textContent = LIBRARY.length;
}

// === Render Memories ===
function renderMemories(memories) {
    const container = document.getElementById('memories-stream');
    container.innerHTML = '';

    if (memories.length === 0) {
        container.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding:2rem;">No memories match.</p>';
        return;
    }

    memories.forEach((memory, idx) => {
        const card = document.createElement('div');
        card.className = 'memory-card';
        card.onclick = () => openModal(memory);

        const preview = memory.body.replace(/\n/g, ' ').substring(0, 200) + (memory.body.length > 200 ? '...' : '');

        card.innerHTML = `
            <div class="memory-card-header">
                <span class="memory-date">${memory.date}</span>
                <span class="memory-era">${memory.era}</span>
            </div>
            <div class="memory-title">${memory.title}</div>
            <div class="memory-preview">${preview}</div>
            <div class="memory-tags">
                ${memory.themes.map(t => `<span class="memory-tag">${t}</span>`).join('')}
            </div>
        `;
        container.appendChild(card);
    });
}

// === Render Eras ===
function renderEras() {
    const container = document.getElementById('eras-container');
    const eraMap = {};

    MEMORIES.forEach(m => {
        if (!eraMap[m.era]) eraMap[m.era] = { memories: [], dates: [] };
        eraMap[m.era].memories.push(m);
        eraMap[m.era].dates.push(m.date);
    });

    container.innerHTML = '<h2>Eras</h2>';

    Object.entries(eraMap).forEach(([era, data]) => {
        const dates = data.dates.sort();
        const card = document.createElement('div');
        card.className = 'era-card';
        card.innerHTML = `
            <h3>${era}</h3>
            <div class="era-dates">${dates[0]}${dates.length > 1 ? ' — ' + dates[dates.length - 1] : ''}</div>
            <div class="era-desc">${ERA_DESCRIPTIONS[era] || ''}</div>
            <div class="era-memory-count">${data.memories.length} memories</div>
        `;
        card.style.cursor = 'pointer';
        card.onclick = () => {
            // Switch to All view filtered by this era
            document.querySelector('[data-view="all"]').click();
            renderMemories(data.memories);
        };
        container.appendChild(card);
    });
}

// === Render Themes ===
function renderThemes() {
    const container = document.getElementById('themes-container');
    const themeMap = {};

    MEMORIES.forEach(m => {
        m.themes.forEach(t => {
            if (!themeMap[t]) themeMap[t] = [];
            themeMap[t].push(m);
        });
    });

    container.innerHTML = '<h2>Themes</h2>';

    Object.entries(themeMap).sort((a, b) => b[1].length - a[1].length).forEach(([theme, memories]) => {
        const card = document.createElement('div');
        card.className = 'theme-card';
        card.innerHTML = `
            <h3>${theme}</h3>
            <div class="theme-count">${memories.length} memories</div>
        `;
        card.onclick = () => {
            document.querySelector('[data-view="all"]').click();
            renderMemories(memories);
        };
        container.appendChild(card);
    });
}

// === Navigation ===
function setupNav() {
    const links = document.querySelectorAll('.nav-link');
    const sections = {
        all: ['memories-section', 'controls-section'],
        eras: ['eras-section'],
        themes: ['themes-section'],
        library: ['library-section'],
        about: ['about-section']
    };

    const allSections = ['memories-section', 'controls-section', 'eras-section', 'themes-section', 'library-section', 'about-section'];

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const view = link.dataset.view;

            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            allSections.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });

            (sections[view] || []).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'block';
            });

            if (view === 'all') renderMemories(MEMORIES);
        });
    });
}

// === Search ===
function setupSearch() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase();
        if (!query) {
            renderMemories(MEMORIES);
            return;
        }
        const filtered = MEMORIES.filter(m =>
            m.title.toLowerCase().includes(query) ||
            m.body.toLowerCase().includes(query) ||
            m.themes.some(t => t.toLowerCase().includes(query)) ||
            m.era.toLowerCase().includes(query)
        );
        renderMemories(filtered);
    });
}

// === Filters ===
function setupFilters() {
    const bar = document.getElementById('theme-filters');
    const allThemes = [...new Set(MEMORIES.flatMap(m => m.themes))].sort();

    allThemes.forEach(theme => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.filter = theme;
        btn.textContent = theme;
        btn.onclick = () => {
            bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMemories(MEMORIES.filter(m => m.themes.includes(theme)));
        };
        bar.appendChild(btn);
    });

    // "All" button handler
    bar.querySelector('[data-filter="all"]').onclick = () => {
        bar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        bar.querySelector('[data-filter="all"]').classList.add('active');
        renderMemories(MEMORIES);
    };
}

// === Library ===
function renderLibrary(entries) {
    const container = document.getElementById('library-grid');
    container.innerHTML = '';

    if (entries.length === 0) {
        container.innerHTML = '<p style="color:var(--text-dim); text-align:center; padding:2rem;">No entries match.</p>';
        return;
    }

    entries.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'library-card';
        card.onclick = () => openModal({
            date: entry.date,
            era: entry.category,
            title: entry.title,
            themes: entry.tags || [],
            body: entry.content
        });

        card.innerHTML = `
            <div class="library-card-left">
                <div class="library-card-title">${entry.title}</div>
                <div class="library-card-summary">${entry.summary}</div>
            </div>
            <div class="library-card-right">
                <span class="library-card-date">${entry.date}</span>
                <span class="library-card-category ${entry.category}">${entry.category}</span>
            </div>
        `;
        container.appendChild(card);
    });
}

function setupLibrary() {
    const searchInput = document.getElementById('library-search');
    const filterBar = document.getElementById('library-filters');

    // Auto-generate category filter buttons from data
    const categories = [...new Set(LIBRARY.map(e => e.category))].sort();
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.filter = cat;
        btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        filterBar.appendChild(btn);
    });

    // Filter + search helper
    function applyFilters() {
        const query = searchInput.value.toLowerCase();
        const activeFilter = filterBar.querySelector('.filter-btn.active').dataset.filter;
        let filtered = LIBRARY;
        if (activeFilter !== 'all') filtered = filtered.filter(e => e.category === activeFilter);
        if (query) filtered = filtered.filter(e =>
            e.title.toLowerCase().includes(query) ||
            e.summary.toLowerCase().includes(query) ||
            e.content.toLowerCase().includes(query) ||
            (e.tags || []).some(t => t.toLowerCase().includes(query))
        );
        renderLibrary(filtered);
    }

    // Search
    searchInput.addEventListener('input', applyFilters);

    // Category filters
    filterBar.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });
    });
}

// === Modal ===
function openModal(memory) {
    document.getElementById('modal-date').textContent = memory.date;
    document.getElementById('modal-era').textContent = memory.era;
    document.getElementById('modal-title').textContent = memory.title;

    const tagsEl = document.getElementById('modal-tags');
    tagsEl.innerHTML = memory.themes.map(t => `<span class="memory-tag">${t}</span>`).join('');

    // Render body with paragraph breaks and blockquote support
    const bodyEl = document.getElementById('modal-body');
    const paragraphs = memory.body.split('\n\n').map(p => {
        if (p.startsWith('> ')) {
            return `<blockquote>${p.replace(/^> /gm, '')}</blockquote>`;
        }
        return `<p>${p}</p>`;
    }).join('');
    bodyEl.innerHTML = paragraphs;

    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// === Init Stars ===
createStars();
