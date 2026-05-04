(function(){
    const categoriesData = [
        {
            name: 'Health',
            emoji: '⚕️',
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

        // Inject styles for the widget
        const style = document.createElement('style');
        style.textContent = `
            .lifeos-category-stubs-grid {
                display: grid;
                gap: calc(var(--dash-space-unit) * 4); /* 16px */
                grid-template-columns: 1fr; /* Mobile: 1 column */
            }
            @media (min-width: 768px) {
                .lifeos-category-stubs-grid {
                    grid-template-columns: repeat(3, 1fr); /* Desktop: 3 columns */
                }
            }
            .lifeos-stub-card {
                background-color: var(--dash-surface);
                border: 1px solid var(--dash-border);
                border-radius: var(--dash-radius-lg);
                padding: calc(var(--dash-space-unit) * 4); /* 16px */
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                color: var(--dash-text);
                transition: transform 0.2s ease-in-out;
            }
            .lifeos-stub-card:hover {
                transform: translateY(-2px);
            }
            .stub-emoji {
                font-size: 2.5em;
                margin-bottom: calc(var(--dash-space-unit) * 2); /* 8px */
            }
            .stub-name {
                font-size: 1.2em;
                font-weight: bold;
                margin-bottom: calc(var(--dash-space-unit) * 1); /* 4px */
                color: var(--dash-text);
            }
            .stub-desc {
                font-size: 0.9em;
                color: var(--dash-muted);
                margin-bottom: calc(var(--dash-space-unit) * 4); /* 16px */
                flex-grow: 1; /* Pushes "Coming soon" to the bottom */
            }
            .stub-coming-soon {
                font-size: 0.85em;
                font-weight: 600;
                color: var(--dash-accent);
                text-transform: uppercase;
            }
        `;
        container.appendChild(style);

        const gridContainer = document.createElement('div');
        gridContainer.className = 'lifeos-category-stubs-grid';

        categoriesData.forEach(category => {
            const card = document.createElement('div');
            card.className = 'lifeos-stub-card';
            card.setAttribute('data-category', category.dataCategory);

            const emoji = document.createElement('span');
            emoji.className = 'stub-emoji';
            emoji.textContent = category.emoji;

            const name = document.createElement('span');
            name.className = 'stub-name';
            name.textContent = category.name;

            const description = document.createElement('span');
            description.className = 'stub-desc';
            description.textContent = category.description;

            const comingSoon = document.createElement('div');
            comingSoon.className = 'stub-coming-soon';
            comingSoon.textContent = 'Coming soon';

            card.appendChild(emoji);
            card.appendChild(name);
            card.appendChild(description);
            card.appendChild(comingSoon);

            gridContainer.appendChild(card);
        });

        container.appendChild(gridContainer);
    }

    window.LifeOSWidgetCategoryStubs = {
        mount
    };
})();