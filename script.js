document.addEventListener('DOMContentLoaded', () => {
    const tabsContainer = document.getElementById('tabs-container');
    const contentContainer = document.getElementById('content-container');
    
    let activePhaseIndex = 0;

    function renderTabs() {
        tabsContainer.innerHTML = '';
        prepData.forEach((phaseData, index) => {
            const button = document.createElement('button');
            button.className = `tab-btn ${index === activePhaseIndex ? 'active' : ''}`;
            button.innerText = phaseData.phase.split(':')[0]; // e.g. "Phase 1"
            button.onclick = () => {
                activePhaseIndex = index;
                renderTabs();
                renderContent();
            };
            tabsContainer.appendChild(button);
        });
    }

    function renderContent() {
        contentContainer.innerHTML = '';
        const currentPhase = prepData[activePhaseIndex];
        
        if (!currentPhase || !currentPhase.categories) return;

        const phaseTab = document.createElement('div');
        phaseTab.className = 'glass-panel';

        currentPhase.categories.forEach(category => {
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

                const header = document.createElement('div');
                header.className = 'accordion-header';
                
                const questionText = document.createElement('span');
                questionText.innerText = `${q.id}. ${q.question}`;
                
                const icon = document.createElement('div');
                icon.className = 'icon';
                icon.innerText = '+';

                header.appendChild(questionText);
                header.appendChild(icon);

                const content = document.createElement('div');
                content.className = 'accordion-content';
                
                const answerText = document.createElement('p');
                answerText.innerText = q.answer;
                
                content.appendChild(answerText);

                // Toggle logic
                header.onclick = () => {
                    accordionItem.classList.toggle('open');
                };

                accordionItem.appendChild(header);
                accordionItem.appendChild(content);
                accordionList.appendChild(accordionItem);
            });

            categorySection.appendChild(accordionList);
            phaseTab.appendChild(categorySection);
        });

        contentContainer.appendChild(phaseTab);
    }

    // Initialize
    if (typeof prepData !== 'undefined') {
        renderTabs();
        renderContent();
    } else {
        contentContainer.innerHTML = '<p style="color:red; text-align:center;">Error: data.js not loaded. Please make sure the data script is included.</p>';
    }
});
