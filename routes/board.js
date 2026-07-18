/**
 * SYNOPSIS: Mock data for populated sections
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

// Mock data for populated sections
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

router.get('/sections', (req, res) => {
  res.json(populatedSections);
});

function registerBoardRoutes(app) {
  app.use('/board', router);
}

export { registerBoardRoutes };
