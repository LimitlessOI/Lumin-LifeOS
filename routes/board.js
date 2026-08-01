/**
 * SYNOPSIS: Route for all 8 populated sections of the household board.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
// No service file is needed as the data is hardcoded for this mock.
export function registerBoard(app, deps) {
  app.get('/api/v1/lifeos/household/board', deps.requireKey, async (req, res, next) => {
    try {
      // Mock data for 8 populated sections
      const populatedSections = [
        { id: 1, name: 'Living Room', items: ['Sofa', 'TV', 'Coffee Table'] },
        { id: 2, name: 'Kitchen', items: ['Refrigerator', 'Oven', 'Microwave'] },
        { id: 3, name: 'Bedroom', items: ['Bed', 'Dresser', 'Wardrobe'] },
        { id: 4, name: 'Bathroom', items: ['Shower', 'Toilet', 'Sink'] },
        { id: 5, name: 'Dining Room', items: ['Dining Table', 'Chairs', 'Cabinet'] },
        { id: 6, name: 'Office', items: ['Desk', 'Chair', 'Computer'] },
        { id: 7, name: 'Garage', items: ['Car', 'Tools', 'Bicycle'] },
        { id: 8, name: 'Garden', items: ['Flowers', 'Lawn Mower', 'Grill'] }
      ];
      // "8 sections populated" for verification.
      res.json(populatedSections);
    } catch (error) {
      deps.logger.error({ error }, 'Error in board route');
      next(error);
    }
  });
}