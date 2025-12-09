describe('Energy Dashboard', () => {
  it('should load the dashboard', () => {
    cy.visit('/dashboard');
    cy.get('h1').should('contain', 'Energy Dashboard');
  });

  it('should display energy predictions', () => {
    cy.visit('/dashboard');
    cy.get('.prediction-value').should('exist');
  });
});