(function(){
  const styles = `
    #lifeos-widget-category-stubs {
      display: grid;
      gap: var(--dash-space-unit, 8px);
      grid-template-columns: 1fr; /* 1 column for mobile */
      padding: var(--dash-space-unit, 8px);
    }
    @media (min-width: 768px) { /* Example breakpoint for desktop */
      #lifeos-widget-category-stubs {
        grid-template-columns: repeat(3, 1fr); /* 3 columns for desktop */
      }
    }
    .lifeos-stub-card {
      background-color: var(--dash-surface, #111118);
      border: 1px solid var(--dash-border, rgba(255,255,255,0.07));
      border-radius: var(--dash-radius-lg, 14px);
      padding: calc(var(--dash-space-unit, 8px) * 2);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      color: var(--dash-text, #e8e8f0);
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .stub-emoji {
      font-size: 3em;
      margin-bottom: var(--dash-space-unit, 8px);
    }
    .stub-name {
      font-size: 1.5em;
      font-weight: bold;
      margin-bottom: calc(var(--dash-space-unit, 8px) / 2);
    }
    .stub-desc {
      font-size: 0.9em;
      color: var(--dash-muted, #555566);
      margin-bottom: calc(var(--dash-space-unit, 8px) * 1.5);
    }
    .stub-coming-soon {
      font-size: 0.8em;
      font-weight: bold;
      color: var(--dash-accent, #5b6af5);
      padding: calc(var(--dash-space-unit, 8px) / 2) var(--dash-space-unit, 8px);
      border-radius: var(--dash-radius-lg, 14px);
      background-color: rgba(91, 106, 245, 0.1); /* RGB for #5b6af5 with opacity */
    }
  `;

  const categories = [
    {
      emoji: '❤️',
      name: 'Health',
      description: 'Track vitals, sleep, and energy',
      dataCategory: 'health'
    },
    {
      emoji: '👨‍👩‍👧‍👦',
      name: 'Family',
      description: 'Family commitments and household sync',
      dataCategory: 'family'
    },
    {
      emoji: '🌱',
      name: 'Growth',
      description: 'Purpose projects and growth milestones',
      dataCategory: 'growth'
    }
  ];

  function createCard(category) {
    const card = document.createElement('div');
    card.className = 'lifeos-stub-card';
    card.setAttribute('data-category', category.dataCategory);

    const emoji = document.createElement('span');
    emoji.className = 'stub-emoji';
    emoji.textContent = category.emoji;
    card.appendChild(emoji);

    const name = document.createElement('span');
    name.className = 'stub-name';
    name.textContent = category.name;
    card.appendChild(name);

    const desc = document.createElement('span');
    desc.className = 'stub-desc';
    desc.textContent = category.description;
    card.appendChild(desc);

    const comingSoon = document.createElement('div');
    comingSoon.className = 'stub-coming-soon';
    comingSoon.textContent = 'Coming soon';
    card.appendChild(comingSoon);

    return card;
  }

  function mount({ container }) {
    if (!container) {
      console.error('LifeOSWidgetCategoryStubs: Container element not provided.');
      return;
    }

    if (!document.getElementById('lifeos-widget-category-stubs-styles')) {
      const styleTag = document.createElement('style');
      styleTag.id = 'lifeos-widget-category-stubs-styles';
      styleTag.textContent = styles;
      document.head.appendChild(styleTag);
    }

    container.innerHTML = '';
    categories.forEach(cat => {
      container.appendChild(createCard(cat));
    });
  }

  window.LifeOSWidgetCategoryStubs = {
    mount
  };
})();