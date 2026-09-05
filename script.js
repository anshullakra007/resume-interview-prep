document.addEventListener('DOMContentLoaded', () => {
    const contentContainer = document.getElementById('content-container');
    const tabsContainer = document.getElementById('tabs-container');
    
    // Hide tabs container since we are going single-page continuous
    if (tabsContainer) {
        tabsContainer.style.display = 'none';
    }

    let completedQuestions = JSON.parse(localStorage.getItem('resumePrepCompleted') || '[]');
    let bookmarkedQuestionId = parseInt(localStorage.getItem('resumePrepBookmark'), 10) || null;

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
        
        prepData.forEach((phase) => {
            if (!phase || !phase.categories) return;

            const phaseContainer = document.createElement('div');
            phaseContainer.className = 'glass-panel phase-panel';
            
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

                    const bookmarkBtn = document.createElement('button');
                    bookmarkBtn.className = `bookmark-btn ${bookmarkedQuestionId === q.id ? 'active-bookmark' : ''}`;
                    bookmarkBtn.innerHTML = '🔖';
                    bookmarkBtn.title = 'Bookmark this question';
                    bookmarkBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (bookmarkedQuestionId === q.id) {
                            bookmarkedQuestionId = null;
                            localStorage.removeItem('resumePrepBookmark');
                            bookmarkBtn.classList.remove('active-bookmark');
                        } else {
                            bookmarkedQuestionId = q.id;
                            localStorage.setItem('resumePrepBookmark', q.id);
                            // Re-render to update bookmark icons across all items
                            renderContent();
                        }
                    };

                    controls.appendChild(checkbox);
                    controls.appendChild(bookmarkBtn);

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
        renderContent();
        
        // Scroll to bookmark on initial load if it exists
        if (bookmarkedQuestionId) {
            setTimeout(() => {
                const item = document.getElementById(`question-${bookmarkedQuestionId}`);
                if (item) {
                    item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    item.classList.add('open');
                }
            }, 300);
        }
    } else {
        contentContainer.innerHTML = '<p style="color:red; text-align:center;">Error: data.js not loaded. Please make sure the data script is included.</p>';
    }
});
