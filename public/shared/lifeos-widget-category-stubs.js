(function(){
  const categories = [
    {
      name: 'Health',
      emoji: '⚕️',
      description: 'Track vitals, sleep, and energy',
      overlay: '/overlay/lifeos-health.html',
      dataCategory: 'health'
    },
    {
      name: 'Family',
      emoji: '👨‍👩‍👧‍👦',
      description: 'Family commitments and household sync',
      overlay: '/overlay/lifeos-family.html',
      dataCategory: 'family'
    },
    {
      name: 'Purpose',
      emoji: '✨',
      description: 'Purpose projects and growth milestones',
      overlay: '/overlay/lifeos-growth.html',
      dataCategory: 'purpose'
    }
  ];

  function createCard(category) {
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

    return card;
  }

  function mount({ container }) {
    if (!container) {
      console.error('LifeOSWidgetCategoryStubs: Container element not provided.');
      return;
    }

    // Clear existing content and add grid class
    container.innerHTML = '';
    container.classList.add('lifeos-stub-cards-grid');

    // Inject styles if not already present
    const styleId = 'lifeos-stub-cards-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .lifeos-stub-cards-grid {
          display: grid;
          gap: var(--dash-space-unit, 8px);
          padding: var(--dash-space-unit, 8px);
        }

        @media (min-width: 768px) { /* Desktop breakpoint */
          .lifeos-stub-cards-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .lifeos-stub-card {
          background-color: var(--dash-surface, #111118);
          border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
          border-radius: var(--dash-radius-lg, 14px);
          padding: calc(var(--dash-space-unit, 8px) * 2); /* 16px */
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          color: var(--dash-text, #e8e8f0);
          text-decoration: none;
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
          margin-bottom: calc(var(--dash-space-unit, 8px) / 2);
          color: var(--dash-accent, #5b6af5);
        }

        .stub-desc {
          font-size: 0.9em;
          color: var(--dash-muted, #555566);
          margin-bottom: calc(var(--dash-space-unit, 8px) * 1.5);
          flex-grow: 1;
        }

        .stub-coming-soon {
          font-size: 0.8em;
          font-weight: bold;
          color: var(--dash-muted, #555566);
          background-color: rgba(128, 128, 128, 0.1); /* Subtle grey background */
          padding: calc(var(--dash-space-unit, 8px) / 2) var(--dash-space-unit, 8px);
          border-radius: calc(var(--dash-radius-lg, 14px) / 2);
          align-self: flex-end;
        }
      `;
      document.head.appendChild(style);
    }

    categories.forEach(category => {
      container.appendChild(createCard(category));
    });
  }

  window.LifeOSWidgetCategoryStubs = {
    mount
  };
})();