```javascript
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRecommendations } from '../store/analyticsSlice';

const ProductRecommendationEngine = () => {
  const dispatch = useDispatch();
  const recommendations = useSelector(state => state.analytics.recommendations);

  useEffect(() => {
    dispatch(fetchRecommendations());
  }, [dispatch]);

  return (
    <div>
      <h2>Product Recommendations</h2>
      <ul>
        {recommendations.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default ProductRecommendationEngine;
```