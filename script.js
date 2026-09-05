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

    let activePhaseIndex = 0;

    // Render sticky phase navigation
    function renderPhaseNav() {
        tabsContainer.innerHTML = '';
        
        prepData.forEach((phaseData, index) => {
            const btn = document.createElement('button');
            btn.className = 'tab-btn';
            if (index === activePhaseIndex) {
                btn.classList.add('active');
            }
            btn.innerText = phaseData.phase.split(':')[0]; 
            btn.onclick = () => {
                activePhaseIndex = index;
                renderPhaseNav(); // Update active tab styling
                renderContent();  // Re-render only the new phase
                window.scrollTo({top: 0, behavior: 'smooth'}); // Scroll to top when switching pages
            };
            tabsContainer.appendChild(btn);
        });
    }

    let completedQuestions = JSON.parse(localStorage.getItem('resumePrepCompleted') || '[]');

    function updateProgress() {
        const progressCountSpan = document.getElementById('progress-count');
        const progressBarFill = document.getElementById('progress-bar-fill');
        
        if (!progressCountSpan || !progressBarFill || typeof prepData === 'undefined') return;

        let totalQuestions = 0;
        prepData.forEach(phase => {
            if (phase.categories) {
                phase.categories.forEach(cat => {
                    totalQuestions += cat.questions.length;
                });
            }
        });

        const completedCount = completedQuestions.length;
        progressCountSpan.innerText = `${completedCount} / ${totalQuestions}`;
        
        const percentage = totalQuestions === 0 ? 0 : (completedCount / totalQuestions) * 100;
        progressBarFill.style.width = `${percentage}%`;
    }

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
        
        const phase = prepData[activePhaseIndex];
        if (!phase || !phase.categories) return;

        const phaseContainer = document.createElement('div');
        phaseContainer.className = 'glass-panel phase-panel';
        phaseContainer.id = `phase-panel-${activePhaseIndex}`;
            
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
                        updateProgress();
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
    }

    // Initialize
    if (typeof prepData !== 'undefined') {
        updateProgress();
        renderPhaseNav();
        renderContent();
    } else {
        contentContainer.innerHTML = '<p style="color:red; text-align:center;">Error: data.js not loaded. Please make sure the data script is included.</p>';
    }
});
