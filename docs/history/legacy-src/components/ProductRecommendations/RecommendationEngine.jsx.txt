import React from 'react';
import { useRecommendations } from '../../hooks/useRecommendations';
import ProductCard from './ProductCard';
import '../../styles/RecommendationGrid.css';

const RecommendationEngine = () => {
  const { data: recommendations, isLoading, error } = useRecommendations();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading recommendations</div>;

  return (
    <div className="recommendation-grid">
      {recommendations.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};

export default RecommendationEngine;