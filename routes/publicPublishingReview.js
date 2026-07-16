/**
 * SYNOPSIS: Mock database
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

// Mock database
const reviews = [];

// Handler to submit a new review
function submitReview(req, res) {
  const { title, content } = req.body;
  const newReview = {
    id: reviews.length + 1,
    title,
    content,
    status: 'pending',
    public: false
  };
  reviews.push(newReview);
  res.status(201).json(newReview);
}

// Handler to get all reviews
function getReviews(req, res) {
  const publicOnly = req.query.publicOnly === 'true';
  const result = publicOnly ? reviews.filter(review => review.public) : reviews;
  res.status(200).json(result);
}

// Handler to approve a review
function approveReview(req, res) {
  const { id } = req.params;
  const review = reviews.find(r => r.id === parseInt(id, 10));
  
  if (review) {
    review.status = 'approved';
    res.status(200).json(review);
  } else {
    res.status(404).json({ message: 'Review not found' });
  }
  console.log(`Review ${id} approved.`);
}

// Handler to publish a review
function publishReview(req, res) {
  const { id } = req.params;
  const review = reviews.find(r => r.id === parseInt(id, 10));
  
  if (review) {
    if (review.status === 'approved') {
      review.status = 'published';
      review.public = true;
      res.status(200).json(review);
      console.log(`Review ${id} published.`);
    } else {
      res.status(400).json({ message: 'Only approved reviews can be published' });
    }
  } else {
    res.status(404).json({ message: 'Review not found' });
  }
}

// Handler to reject a review
function rejectReview(req, res) {
  const { id } = req.params;
  const review = reviews.find(r => r.id === parseInt(id, 10));
  
  if (review) {
    review.status = 'rejected';
    res.status(200).json(review);
    console.log(`Review ${id} rejected.`);
  } else {
    res.status(404).json({ message: 'Review not found' });
  }
}

// Register routes
function registerPublishingReviewRoutes(app) {
  router.post('/reviews', submitReview);
  router.get('/reviews', getReviews);
  router.patch('/reviews/:id/approve', approveReview);
  router.patch('/reviews/:id/reject', rejectReview);
  router.patch('/reviews/:id/publish', publishReview);
  
  app.use('/api', router);
}

export { registerPublishingReviewRoutes };
