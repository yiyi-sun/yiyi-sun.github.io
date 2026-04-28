document.addEventListener('DOMContentLoaded', function() {
    makeAllLinksOpenInNewTab();
    setupLinkObserver();

    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // Load publications
    loadPublications();

    // Load experience (Teaching & Service)
    loadExperience();

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
    window.addEventListener('scroll', function() {
        let current = '';
        const sections = document.querySelectorAll('section[id]');
        const navHeight = document.querySelector('.top-nav').offsetHeight;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= sectionTop - navHeight - 100) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            const linkTarget = link.getAttribute('href').substring(1);
            if (linkTarget === current ||
                (current === 'homepage' && linkTarget === 'about') ||
                (current === 'about' && linkTarget === 'homepage')) {
                link.classList.add('active');
            }
        });
    });

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

                        // Add reprint note
                        if (pub.reprint) {
                            html += `<div class="pub-reprint">\ud83c\udfc6 ${pub.reprint}</div>`;
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

// Load Teaching & Service experience grouped by category
function loadExperience() {
    let path = 'data/experience.json';
    if (window.location.pathname.includes('/pages/')) {
        path = '../data/experience.json';
    }
    const list = document.querySelector('.experience-list');
    if (!list) return;

    list.innerHTML = '';

    fetch(path)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            const categoryOrder = [
                'Instructional Experience',
                'Professional Service'
            ];

            const categories = {};
            data.forEach(item => {
                const cat = item.category || 'Other';
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(item);
            });

            categoryOrder.forEach(cat => {
                if (!categories[cat] || !categories[cat].length) return;

                const header = document.createElement('h3');
                header.className = 'pub-section-header';
                header.textContent = cat;
                list.appendChild(header);

                const timeline = document.createElement('div');
                timeline.className = 'timeline space-y-4 mb-6';

                categories[cat].forEach(item => {
                    const entry = document.createElement('div');
                    entry.className = 'timeline-item flex gap-4';
                    entry.innerHTML = `
                        <div class="school-logo-container w-16 h-16 flex-shrink-0 bg-white rounded-lg shadow-sm p-2 flex items-center justify-center border border-neutral-100 text-2xl text-accent">
                            <i class="fas ${item.icon || 'fa-circle'}"></i>
                        </div>
                        <div class="timeline-content">
                            <h4 class="font-semibold text-primary">${item.title}</h4>
                            <p class="text-[16px] text-neutral-600 leading-relaxed">
                                <span class="text-accent font-medium">${item.date}</span> &#183;
                                ${item.content}
                            </p>
                        </div>
                    `;
                    timeline.appendChild(entry);
                });

                list.appendChild(timeline);
            });
        })
        .catch(error => {
            console.error('Error loading experience data:', error);
            list.innerHTML = '<p>Failed to load experience.</p>';
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
