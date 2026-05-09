(function(){
    const categoriesData = [
        {
            emoji: '⚕️',
            name: 'Health',
            description: 'Track vitals, sleep, and energy',
            category: 'health',
            overlay: '/overlay/lifeos-health.html'
        },
        {
            emoji: '👨‍👩‍👧‍👦',
            name: 'Family',
            description: 'Family commitments and household sync',
            category: 'family',
            overlay: '/overlay/lifeos-family.html'
        },
        {
            emoji: '✨',
            name: 'Purpose',
            description: 'Purpose projects and growth milestones',
            category: 'growth',
            overlay: '/overlay/lifeos-growth.html'
        }
    ];

    function mount({ container }) {
        if (!container) {
            console.error('LifeOSWidgetCategoryStubs: Container element not provided.');
            return;
        }

        const styleId = 'lifeos-widget-category-stubs-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .lifeos-stub-cards-grid {
                    display: grid;
                    grid-template-columns: 1fr; /* 1 column for mobile */
                    gap: calc(var(--dash-space-unit) * 4);
                    padding: calc(var(--dash-space-unit) * 4);
                }

                @media (min-width: 768px) {
                    .lifeos-stub-cards-grid {
                        grid-template-columns: repeat(3, 1fr); /* 3 columns for desktop */
                    }
                }

                .lifeos-stub-card {
                    background-color: var(--dash-surface);
                    border: 1px solid var(--dash-border);
                    border-radius: var(--dash-radius-lg);
                    padding: calc(var(--dash-space-unit) * 4);
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    text-align: left;
                    color: var(--dash-text);
                    transition: transform 0.2s ease-in-out;
                }

                .lifeos-stub-card:hover {
                    transform: translateY(-2px);
                }

                .stub-emoji {
                    font-size: 2.5em;
                    margin-bottom: calc(var(--dash-space-unit) * 2);
                }

                .stub-name {
                    font-size: 1.2em;
                    font-weight: bold;
                    margin-bottom: calc(var(--dash-space-unit) * 1);
                    color: var(--dash-text);
                }

                .stub-desc {
                    font-size: 0.9em;
                    color: var(--dash-muted);
                    margin-bottom: calc(var(--dash-space-unit) * 4);
                    flex-grow: 1;
                }

                .stub-coming-soon {
                    font-size: 0.8em;
                    font-weight: bold;
                    color: var(--dash-accent);
                    padding: calc(var(--dash-space-unit) * 1) calc(var(--dash-space-unit) * 2);
                    background-color: rgba(91, 106, 245, 0.1); /* Using RGB for --dash-accent */
                    border-radius: calc(var(--dash-radius-lg) / 2);
                }
            `;
            document.head.appendChild(style);
        }

        const gridContainer = document.createElement('div');
        gridContainer.className = 'lifeos-stub-cards-grid';

        categoriesData.forEach(data => {
            const card = document.createElement('div');
            card.className = 'lifeos-stub-card';
            card.setAttribute('data-category', data.category);

            const emoji = document.createElement('span');
            emoji.className = 'stub-emoji';
            emoji.textContent = data.emoji;

            const name = document.createElement('span');
            name.className = 'stub-name';
            name.textContent = data.name;

            const description = document.createElement('span');
            description.className = 'stub-desc';
            description.textContent = data.description;

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