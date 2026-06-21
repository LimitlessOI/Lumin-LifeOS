/**
 * SYNOPSIS: js — public/shared/lifeos-widget-category-stubs.js.
 */
(function(){
    const categoriesData = [
        {
            category: 'health',
            emoji: '❤️',
            name: 'Health',
            description: 'Track vitals, sleep, and energy',
        },
        {
            category: 'family',
            emoji: '👨‍👩‍👧‍👦',
            name: 'Family',
            description: 'Family commitments and household sync',
        },
        {
            category: 'purpose',
            emoji: '✨',
            name: 'Purpose',
            description: 'Purpose projects and growth milestones',
        }
    ];

    function mount({ container }) {
        const targetContainer = typeof container === 'string' ? document.getElementById(container) : container;
        if (!targetContainer) {
            console.error('LifeOSWidgetCategoryStubs: Target container not found.', container);
            return;
        }

        // Inject basic styles for the grid and cards
        const styleId = 'lifeos-widget-category-stubs-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .lifeos-stub-cards-grid {
                    display: grid;
                    gap: calc(var(--dash-space-unit) * 4); /* 16px gap */
                    padding: calc(var(--dash-space-unit) * 4); /* 16px padding */
                }
                @media (min-width: 768px) { /* Desktop breakpoint */
                    .lifeos-stub-cards-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                .lifeos-stub-card {
                    background-color: var(--dash-surface);
                    border: 1px solid var(--dash-border);
                    border-radius: var(--dash-radius-lg);
                    padding: calc(var(--dash-space-unit) * 6); /* 24px padding */
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    text-align: left;
                    color: var(--dash-text);
                    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
                }
                .lifeos-stub-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
                }
                .stub-emoji {
                    font-size: 2.5rem; /* Larger emoji */
                    margin-bottom: calc(var(--dash-space-unit) * 4);
                }
                .stub-name {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: calc(var(--dash-space-unit) * 2);
                    color: var(--dash-text);
                }
                .stub-desc {
                    font-size: 0.9rem;
                    color: var(--dash-muted);
                    margin-bottom: calc(var(--dash-space-unit) * 4);
                    line-height: 1.4;
                }
                .stub-coming-soon {
                    font-size: 0.85rem;
                    font-weight: 500;
                    color: var(--dash-accent);
                    padding: calc(var(--dash-space-unit) * 2) calc(var(--dash-space-unit) * 3);
                    background-color: rgba(91, 106, 245, 0.1); /* Light accent background */
                    border-radius: calc(var(--dash-radius-lg) / 2);
                    align-self: flex-end; /* Position at bottom right */
                    margin-top: auto; /* Push to bottom */
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

        targetContainer.appendChild(gridContainer);
    }

    window.LifeOSWidgetCategoryStubs = { mount };
})();