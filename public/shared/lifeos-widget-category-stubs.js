(function(){
    const categoriesData = [
        {
            emoji: '⚕️',
            name: 'Health',
            description: 'Track vitals, sleep, and energy',
            category: 'health'
        },
        {
            emoji: '👨‍👩‍👧‍👦',
            name: 'Family',
            description: 'Family commitments and household sync',
            category: 'family'
        },
        {
            emoji: '✨',
            name: 'Purpose',
            description: 'Purpose projects and growth milestones',
            category: 'purpose'
        }
    ];

    function mount({ container }) {
        if (!container) {
            console.error('LifeOSWidgetCategoryStubs: Container element not provided.');
            return;
        }

        // Inject CSS for styling if not already present
        const styleId = 'lifeos-widget-category-stubs-style';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .lifeos-widget-category-stubs-grid {
                    display: grid;
                    gap: calc(var(--dash-space-unit) * 4); /* 16px gap */
                    grid-template-columns: 1fr; /* 1 column on mobile */
                    padding: calc(var(--dash-space-unit) * 4); /* Padding around the grid */
                }

                @media (min-width: 768px) {
                    .lifeos-widget-category-stubs-grid {
                        grid-template-columns: repeat(3, 1fr); /* 3 columns on desktop */
                    }
                }

                .lifeos-stub-card {
                    background-color: var(--dash-surface);
                    border: 1px solid var(--dash-border);
                    border-radius: var(--dash-radius-lg);
                    padding: calc(var(--dash-space-unit) * 6); /* 24px padding */
                    color: var(--dash-text);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
                }

                .lifeos-stub-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }

                .stub-emoji {
                    font-size: 3em; /* Larger emoji */
                    margin-bottom: calc(var(--dash-space-unit) * 4); /* 16px */
                    line-height: 1; /* Prevent extra space */
                }

                .stub-name {
                    font-weight: 600; /* Slightly bolder */
                    font-size: 1.3em;
                    margin-bottom: calc(var(--dash-space-unit) * 2); /* 8px */
                    color: var(--dash-text);
                }

                .stub-desc {
                    color: var(--dash-muted);
                    font-size: 0.95em;
                    margin-bottom: calc(var(--dash-space-unit) * 6); /* 24px */
                    flex-grow: 1; /* Push "Coming soon" to bottom */
                }

                .stub-coming-soon {
                    background-color: var(--dash-muted);
                    color: var(--dash-text); /* Use dash-text for contrast */
                    padding: calc(var(--dash-space-unit) * 2) calc(var(--dash-space-unit) * 4); /* 8px 16px */
                    border-radius: var(--dash-radius-lg);
                    font-size: 0.8em;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    font-weight: 500;
                    opacity: 0.8;
                }
            `;
            document.head.appendChild(style);
        }

        container.classList.add('lifeos-widget-category-stubs-grid');
        container.innerHTML = ''; // Clear existing content

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

            container.appendChild(card);
        });
    }

    window.LifeOSWidgetCategoryStubs = {
        mount: mount
    };
})();