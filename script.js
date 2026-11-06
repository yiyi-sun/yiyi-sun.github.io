document.addEventListener('DOMContentLoaded', function() {
    makeAllLinksOpenInNewTab();
    setupLinkObserver();
    setupThemeToggle();

    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            const isHidden = mobileMenu.classList.toggle('hidden');
            mobileMenuBtn.setAttribute('aria-expanded', String(!isHidden));
        });
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }

    // Load publications
    loadPublications();

    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('.nav-links a');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const targetId = this.getAttribute('href');
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    const navHeight = document.querySelector('.top-nav').offsetHeight;
                    const targetPosition = targetSection.offsetTop - navHeight - 20;
                    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
                    navLinks.forEach(l => l.classList.remove('active'));
                    this.classList.add('active');
                }
            }
        });
    });

    // Update active nav link on scroll
    function updateActiveNav() {
        let current = '';
        const sections = document.querySelectorAll('section[id]');
        const navHeight = document.querySelector('.top-nav').offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= sectionTop - navHeight - 100) {
                current = section.getAttribute('id');
            }
        });

        // The last section can be too short to reach the top of the window
        const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
        if (atBottom && sections.length) {
            current = sections[sections.length - 1].getAttribute('id');
        }

        navLinks.forEach(link => {
            link.classList.remove('active');
            const linkTarget = link.getAttribute('href').substring(1);
            if (linkTarget === current ||
                (current === 'homepage' && linkTarget === 'about') ||
                (current === 'about' && linkTarget === 'homepage')) {
                link.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav, { passive: true });
    updateActiveNav();

    // Load news data
    let newsJsonPath = 'data/news.json';
    if (window.location.pathname.includes('/pages/')) {
        newsJsonPath = '../data/news.json';
    }

    fetch(newsJsonPath)
        .then(response => response.json())
        .then(data => {
            const latestNewsSection = document.getElementById('latest-news');
            if (latestNewsSection) {
                renderNewsItems(data, 'news-container');
                setupScrollHint();
            }
        })
        .catch(error => console.error('Error loading news data:', error));
});

// Light / dark switch. Follows the device setting until the visitor makes a choice.
function setupThemeToggle() {
    const root = document.documentElement;
    const buttons = document.querySelectorAll('.theme-toggle');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme(theme) {
        // Switch every color at once, so text is never briefly unreadable mid-fade
        root.classList.add('theme-switching');
        root.setAttribute('data-theme', theme);
        void getComputedStyle(root).color; // let the browser apply the new colors before fades return
        root.classList.remove('theme-switching');
        document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101613' : '#fefffe';
        const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
        buttons.forEach(button => {
            button.setAttribute('aria-label', label);
            button.setAttribute('title', label);
        });
    }

    function savedTheme() {
        try { return localStorage.getItem('theme'); } catch (e) { return null; }
    }

    applyTheme(root.getAttribute('data-theme') || 'light');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            try { localStorage.setItem('theme', next); } catch (e) {}
        });
    });

    systemDark.addEventListener('change', event => {
        if (!savedTheme()) applyTheme(event.matches ? 'dark' : 'light');
    });
}

// Simplified publication rendering - plain text with DOI links
function loadPublications() {
    let publicationsJsonPath = 'data/publications.json';
    if (window.location.pathname.includes('/pages/')) {
        publicationsJsonPath = '../data/publications.json';
    }

    const publicationsList = document.querySelector('.publications-list');
    if (!publicationsList) return;

    publicationsList.innerHTML = '';

    fetch(publicationsJsonPath)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(publications => {
            // Group by category first, then by year within each category
            const categories = {};
            publications.forEach(pub => {
                if (pub.hidden) return; // set "hidden": true on an entry in publications.json to hide it temporarily
                const cat = pub.category || 'Peer-Reviewed Articles';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(pub);
            });

            // Define category order
            const categoryOrder = [
                'Peer-Reviewed Articles',
                'Manuscripts Under Review',
                'Conference Presentations',
                'Book Chapters',
                'Graduate Theses'
            ];

            categoryOrder.forEach(cat => {
                if (!categories[cat] || categories[cat].length === 0) return;

                // Category header
                const catHeader = document.createElement('h3');
                catHeader.className = 'pub-section-header';
                catHeader.textContent = cat;
                publicationsList.appendChild(catHeader);

                const pubs = categories[cat];

                // Sort by year descending
                pubs.sort((a, b) => {
                    const yearA = a.year ? parseInt(a.year) : 9999;
                    const yearB = b.year ? parseInt(b.year) : 9999;
                    return yearB - yearA;
                });

                // Group by year
                const pubsByYear = {};
                pubs.forEach(pub => {
                    const year = pub.year || 'Forthcoming';
                    if (!pubsByYear[year]) pubsByYear[year] = [];
                    pubsByYear[year].push(pub);
                });

                const sortedYears = Object.keys(pubsByYear).sort((a, b) => {
                    if (a === 'Forthcoming') return -1;
                    if (b === 'Forthcoming') return 1;
                    return b - a;
                });

                sortedYears.forEach(year => {
                    const yearGroup = document.createElement('div');
                    yearGroup.className = 'pub-year-group';

                    const yearHeader = document.createElement('h4');
                    yearHeader.className = 'pub-year-header';
                    yearHeader.textContent = `-${year}-`;
                    yearGroup.appendChild(yearHeader);

                    const ul = document.createElement('ul');
                    ul.className = 'pub-list-ul';

                    pubsByYear[year].forEach(pub => {
                        const li = document.createElement('li');
                        li.className = 'pub-list-item';

                        // Build plain text citation
                        let html = pub.citation || '';

                        // Add DOI/link buttons
                        if (pub.links && pub.links.length > 0) {
                            pub.links.forEach(link => {
                                html += ` <a href="${link.url}" class="pub-doi-link" target="_blank">${link.text}</a>`;
                            });
                        }

                        // Add reprint / award note (grey line below the citation)
                        const note = pub.note || pub.reprint;
                        if (note) {
                            html += `<div class="pub-reprint">\ud83c\udfc6 ${note}</div>`;
                        }

                        li.innerHTML = html;
                        ul.appendChild(li);
                    });

                    yearGroup.appendChild(ul);
                    publicationsList.appendChild(yearGroup);
                });
            });
        })
        .catch(error => {
            console.error('Error loading publications data:', error);
            publicationsList.innerHTML = '<p>Failed to load publications.</p>';
        });
}

// Render news items with HTML support
function renderNewsItems(newsData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    newsData.forEach(newsItem => {
        const newsElement = document.createElement('div');
        newsElement.className = 'news-item';

        const dateElement = document.createElement('span');
        dateElement.className = 'news-date';
        dateElement.textContent = newsItem.date;

        const contentElement = document.createElement('div');
        contentElement.className = 'news-content';
        contentElement.innerHTML = newsItem.content;

        newsElement.appendChild(dateElement);
        newsElement.appendChild(contentElement);
        container.appendChild(newsElement);
    });
}

// Setup scroll hint for news section (static, always visible)
function setupScrollHint() {
    // Hint is now always visible above the news box, no JS needed
}

function makeAllLinksOpenInNewTab() {
    const links = document.querySelectorAll('a');
    links.forEach(link => {
        if (link.hostname !== window.location.hostname && link.getAttribute('href') && !link.getAttribute('href').startsWith('#') && !link.getAttribute('href').startsWith('mailto:')) {
            link.setAttribute('target', '_blank');
            link.setAttribute('rel', 'noopener noreferrer');
        }
    });
}

function setupLinkObserver() {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        if (node.tagName === 'A') {
                            if (node.hostname !== window.location.hostname && node.getAttribute('href') && !node.getAttribute('href').startsWith('#') && !node.getAttribute('href').startsWith('mailto:')) {
                                node.setAttribute('target', '_blank');
                                node.setAttribute('rel', 'noopener noreferrer');
                            }
                        }
                        const links = node.querySelectorAll('a');
                        links.forEach(link => {
                            if (link.hostname !== window.location.hostname && link.getAttribute('href') && !link.getAttribute('href').startsWith('#') && !link.getAttribute('href').startsWith('mailto:')) {
                                link.setAttribute('target', '_blank');
                                link.setAttribute('rel', 'noopener noreferrer');
                            }
                        });
                    }
                });
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}
