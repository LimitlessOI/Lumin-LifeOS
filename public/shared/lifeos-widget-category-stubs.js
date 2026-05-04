(function(){
    const categoriesData = [
        {
            name: 'Health',
            emoji: '🩺',
            description: 'Track vitals, sleep, and energy',
            dataCategory: 'health'
        },
        {
            name: 'Family',
            emoji: '👨‍👩‍👧‍👦',
            description: 'Family commitments and household sync',
            dataCategory: 'family'
        },
        {
            name: 'Purpose',
            emoji: '✨',
            description: 'Purpose projects and growth milestones',
            dataCategory: 'purpose'
        }
    ];

    function mount({ container }) {
        if (!container) {
            console.error('LifeOSWidgetCategoryStubs: Container element not provided.');
            return;
        }

        // Inject styles for the grid and cards if not already present
        const styleId = 'lifeos-widget-category-stubs-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .lifeos-stub-cards-grid {
                    display: grid;
                    gap: calc(2 * var(--dash-space-unit));
                    grid-template-columns: 1fr; /* 1 column for mobile */
                }

                @media (min-width: 768px) { /* Example breakpoint for desktop */
                    .lifeos-stub-cards-grid {
                        grid-template-columns: repeat(3, 1fr); /* 3 columns for desktop */
                    }
                }

                .lifeos-stub-card {
                    background-color: var(--dash-surface);
                    border: 1px solid var(--dash-border);
                    border-radius: var(--dash-radius-lg);
                    padding: calc(3 * var(--dash-space-unit));
                    display: flex;
                    flex-direction: column;
                    gap: var(--dash-space-unit);
                    color: var(--dash-text);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05); /* Subtle shadow */
                    transition: transform 0.2s ease-in-out;
                }
                .lifeos-stub-card:hover {
                    transform: translateY(-3px);
                }

                .stub-emoji {
                    font-size: 2.5rem;
                    margin-bottom: var(--dash-space-unit);
                    line-height: 1; /* Prevent extra space */
                }

                .stub-name {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--dash-accent);
                }

                .stub-desc {
                    font-size: 0.9rem;
                    color: var(--dash-muted);
                    flex-grow: 1; /* Push "Coming soon" to bottom */
                    line-height: 1.4;
                }

                .stub-coming-soon {
                    margin-top: calc(2 * var(--dash-space-unit));
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: var(--dash-muted);
                    text-align: right;
                    opacity: 0.7;
                }
            `;
            document.head.appendChild(style);
        }

        const gridContainer = document.createElement('div');
        gridContainer.className = 'lifeos-stub-cards-grid';

        categoriesData.forEach(category => {
            const card = document.createElement('div');
            card.className = 'lifeos-stub-card';
            card.setAttribute('data-category', category.dataCategory);

            const emojiSpan = document.createElement('span');
            emojiSpan.className = 'stub-emoji';
            emojiSpan.textContent = category.emoji;

            const nameSpan = document.createElement('span');
            nameSpan.className = 'stub-name';
            nameSpan.textContent = category.name;

            const descSpan = document.createElement('span');
            descSpan.className = 'stub-desc';
            descSpan.textContent = category.description;

            const comingSoonDiv = document.createElement('div');
            comingSoonDiv.className = 'stub-coming-soon';
            comingSoonDiv.textContent = 'Coming soon';

            card.appendChild(emojiSpan);
            card.appendChild(nameSpan);
            card.appendChild(descSpan);
            card.appendChild(comingSoonDiv);

            gridContainer.appendChild(card);
        });

        container.appendChild(gridContainer);
    }

    window.LifeOSWidgetCategoryStubs = { mount };
})();