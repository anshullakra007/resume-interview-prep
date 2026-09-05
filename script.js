document.addEventListener('DOMContentLoaded', () => {
    const contentContainer = document.getElementById('content-container');
    const tabsContainer = document.getElementById('tabs-container');
    const themeToggleBtn = document.getElementById('theme-toggle');

    // SVG Icons
    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`;

    // Theme logic
    let currentTheme = localStorage.getItem('resumePrepTheme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggleBtn.innerHTML = currentTheme === 'dark' ? sunIcon : moonIcon;

    themeToggleBtn.onclick = () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('resumePrepTheme', currentTheme);
        themeToggleBtn.innerHTML = currentTheme === 'dark' ? sunIcon : moonIcon;
    };

    // Render sticky phase navigation
    function renderPhaseNav() {
        tabsContainer.innerHTML = '';
        const navButtons = [];
        
        prepData.forEach((phaseData, index) => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            btn.innerText = phaseData.phase.split(':')[0]; 
            btn.onclick = () => {
                const phaseEl = document.getElementById(`phase-panel-${index}`);
                if (phaseEl) {
                    const y = phaseEl.getBoundingClientRect().top + window.scrollY - 20;
                    window.scrollTo({top: y, behavior: 'smooth'});
                }
            };
            tabsContainer.appendChild(btn);
            navButtons.push(btn);
        });

        // Intersection Observer to highlight active phase on scroll
        const observerOptions = {
            root: null,
            rootMargin: '-20% 0px -60% 0px', // Trigger when a section is roughly in the top middle of viewport
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const activeIndex = entry.target.id.split('-').pop();
                    navButtons.forEach((btn, idx) => {
                        if (idx == activeIndex) {
                            btn.classList.add('active');
                        } else {
                            btn.classList.remove('active');
                        }
                    });
                }
            });
        }, observerOptions);

        // We will observe the panels after they are rendered
        setTimeout(() => {
            prepData.forEach((_, index) => {
                const panel = document.getElementById(`phase-panel-${index}`);
                if (panel) observer.observe(panel);
            });
        }, 100);
    }

    let completedQuestions = JSON.parse(localStorage.getItem('resumePrepCompleted') || '[]');

    function formatText(text) {
        if (!text) return '';
        let escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        escaped = escaped.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        escaped = escaped.replace(/\n/g, '<br/>');
        return escaped;
    }

    function renderContent() {
        contentContainer.innerHTML = '';
        
        prepData.forEach((phase, index) => {
            if (!phase || !phase.categories) return;

            const phaseContainer = document.createElement('div');
            phaseContainer.className = 'glass-panel phase-panel';
            phaseContainer.id = `phase-panel-${index}`;
            
            const phaseTitle = document.createElement('h1');
            phaseTitle.className = 'phase-title';
            phaseTitle.innerText = phase.phase;
            phaseContainer.appendChild(phaseTitle);

            phase.categories.forEach(category => {
                const categorySection = document.createElement('div');
                categorySection.className = 'category-section';

                const title = document.createElement('h2');
                title.className = 'category-title';
                title.innerText = category.title;
                categorySection.appendChild(title);

                const accordionList = document.createElement('div');
                accordionList.className = 'accordion-list';

                category.questions.forEach(q => {
                    const accordionItem = document.createElement('div');
                    accordionItem.className = 'accordion-item';
                    accordionItem.id = `question-${q.id}`;

                    const header = document.createElement('div');
                    header.className = 'accordion-header';
                    
                    // Controls container (checkbox & bookmark)
                    const controls = document.createElement('div');
                    controls.className = 'accordion-controls';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.className = 'progress-checkbox';
                    checkbox.title = 'Mark as completed';
                    checkbox.checked = completedQuestions.includes(q.id);
                    checkbox.onclick = (e) => {
                        e.stopPropagation();
                        if (checkbox.checked) {
                            if (!completedQuestions.includes(q.id)) completedQuestions.push(q.id);
                            accordionItem.classList.add('completed');
                        } else {
                            completedQuestions = completedQuestions.filter(id => id !== q.id);
                            accordionItem.classList.remove('completed');
                        }
                        localStorage.setItem('resumePrepCompleted', JSON.stringify(completedQuestions));
                    };

                    controls.appendChild(checkbox);

                    const questionText = document.createElement('span');
                    questionText.className = 'question-text';
                    questionText.innerHTML = formatText(`${q.id}. ${q.question}`);
                    
                    const icon = document.createElement('div');
                    icon.className = 'icon';
                    icon.innerText = '+';

                    header.appendChild(controls);
                    header.appendChild(questionText);
                    header.appendChild(icon);

                    const content = document.createElement('div');
                    content.className = 'accordion-content';
                    
                    const answerText = document.createElement('p');
                    answerText.innerHTML = formatText(q.answer);
                    
                    content.appendChild(answerText);

                    // Toggle logic
                    header.onclick = () => {
                        accordionItem.classList.toggle('open');
                    };

                    if (completedQuestions.includes(q.id)) {
                        accordionItem.classList.add('completed');
                    }

                    accordionItem.appendChild(header);
                    accordionItem.appendChild(content);
                    accordionList.appendChild(accordionItem);
                });

                categorySection.appendChild(accordionList);
                phaseContainer.appendChild(categorySection);
            });

            contentContainer.appendChild(phaseContainer);
        });
    }

    // Initialize
    if (typeof prepData !== 'undefined') {
        renderPhaseNav();
        renderContent();
    } else {
        contentContainer.innerHTML = '<p style="color:red; text-align:center;">Error: data.js not loaded. Please make sure the data script is included.</p>';
    }
});
