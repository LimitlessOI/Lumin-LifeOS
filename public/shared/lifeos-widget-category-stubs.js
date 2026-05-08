(function(){
  const categoriesData = [
    {
      emoji: '🍎',
      name: 'Health',
      description: 'Track vitals, sleep, and energy',
      dataCategory: 'health'
    },
    {
      emoji: '🏡',
      name: 'Family',
      description: 'Family commitments and household sync',
      dataCategory: 'family'
    },
    {
      emoji: '🌱',
      name: 'Purpose',
      description: 'Purpose projects and growth milestones',
      dataCategory: 'purpose'
    }
  ];

  function createCard(category) {
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

    return card;
  }

  function mount({ container }) {
    if (!container) {
      console.error('LifeOSWidgetCategoryStubs: Container element not provided.');
      return;
    }

    // Apply a class for external CSS to handle grid layout (1 col mobile, 3 col desktop)
    container.classList.add('lifeos-category-stubs-grid');

    categoriesData.forEach(category => {
      const card = createCard(category);
      container.appendChild(card);
    });
  }

  window.LifeOSWidgetCategoryStubs = {
    mount
  };
})();