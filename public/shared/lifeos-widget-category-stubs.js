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

    const mount = ({ container }) => {
        if (!container) {
            console.error('LifeOSWidgetCategoryStubs: Container element not provided.');
            return;
        }

        // Inject basic styles for the grid and cards
        const style = document.createElement('style');
        style.textContent = `
            .lifeos-stub-grid {
                display: grid;
                gap: var(--dash-space-unit, 8px);
                grid-template-columns: 1fr; /* 1 column on mobile */
            }
            @media (min-width: 768px) { /* Desktop breakpoint */
                .lifeos-stub-grid {
                    grid-template-columns: repeat(3, 1fr); /* 3 columns on desktop */
                }
            }
            .lifeos-stub-card {
                background-color: var(--dash-surface, #ffffff);
                border: 1px solid var(--dash-border, rgba(0,0,0,0.1));
                border-radius: var(--dash-radius-lg, 14px);
                padding: calc(2 * var(--dash-space-unit, 8px));
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                text-align: left;
                color: var(--dash-text, #1a1a22);
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                transition: transform 0.2s ease-in-out;
            }
            .lifeos-stub-card:hover {
                transform: translateY(-2px);
            }
            .stub-emoji {
                font-size: 2.5em;
                margin-bottom: var(--dash-space-unit, 8px);
            }
            .stub-name {
                font-size: 1.2em;
                font-weight: bold;
                margin-bottom: calc(0.5 * var(--dash-space-unit, 8px));
                color: var(--dash-text, #1a1a22);
            }
            .stub-desc {
                font-size: 0.9em;
                color: var(--dash-muted, #777788);
                margin-bottom: calc(1.5 * var(--dash-space-unit, 8px));
                flex-grow: 1; /* Ensures "Coming soon" is at the bottom */
            }
            .stub-coming-soon {
                font-size: 0.8em;
                font-weight: 600;
                color: var(--dash-accent, #5b6af5);
                background-color: rgba(91, 106, 245, 0.1); /* Derived from --dash-accent #5b6af5 */
                padding: calc(0.5 * var(--dash-space-unit, 8px)) var(--dash-space-unit, 8px);
                border-radius: calc(0.5 * var(--dash-radius-lg, 14px));
                margin-top: var(--dash-space-unit, 8px);
            }
        `;
        document.head.appendChild(style);

        const gridContainer = document.createElement('div');
        gridContainer.className = 'lifeos-stub-grid';

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
    };

    window.LifeOSWidgetCategoryStubs = {
        mount
    };
})();