(function(){
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
      emoji: '✨',
      name: 'Purpose',
      description: 'Purpose projects and growth milestones',
      dataCategory: 'purpose'
    }
  ];

  function mount({ container }) {
    if (!container) {
      console.error('LifeOSWidgetCategoryStubs: Container element not provided.');
      return;
    }

    const style = document.createElement('style');
    style.textContent = `
      :root {
        /* Derived from --dash-accent: #5b6af5 */
        --dash-accent-rgb: 91, 106, 245;
      }

      .lifeos-stub-cards-grid {
        display: grid;
        gap: calc(var(--dash-space-unit) * 2);
        grid-template-columns: 1fr; /* Mobile default */
        padding: calc(var(--dash-space-unit) * 2);
      }

      @media (min-width: 768px) {
        .lifeos-stub-cards-grid {
          grid-template-columns: repeat(3, 1fr); /* Desktop */
        }
      }

      .lifeos-stub-card {
        background-color: var(--dash-surface);
        color: var(--dash-text);
        border: 1px solid var(--dash-border);
        border-radius: var(--dash-radius-lg);
        padding: calc(var(--dash-space-unit) * 2);
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      }

      .lifeos-stub-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .stub-emoji {
        font-size: 2.5em;
        margin-bottom: var(--dash-space-unit);
        line-height: 1;
      }

      .stub-name {
        font-size: 1.3em;
        font-weight: 600;
        margin-bottom: calc(var(--dash-space-unit) / 2);
        color: var(--dash-text);
      }

      .stub-desc {
        font-size: 0.95em;
        color: var(--dash-muted);
        margin-bottom: calc(var(--dash-space-unit) * 1.5);
        line-height: 1.4;
      }

      .stub-coming-soon {
        font-size: 0.85em;
        color: var(--dash-accent);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-weight: 500;
        padding: calc(var(--dash-space-unit) / 2) var(--dash-space-unit);
        border: 1px solid var(--dash-accent);
        border-radius: calc(var(--dash-radius-lg) / 2);
        background-color: rgba(var(--dash-accent-rgb), 0.1);
      }
    `;
    document.head.appendChild(style);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'lifeos-stub-cards-grid';

    categories.forEach(category => {
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

  window.LifeOSWidgetCategoryStubs = {
    mount
  };
})();