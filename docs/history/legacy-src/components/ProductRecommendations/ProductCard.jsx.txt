import React from 'react';
import { trackInteraction } from '../../utils/analyticsTracker';

const ProductCard = ({ product }) => {
  const handleClick = () => {
    trackInteraction(product.id);
  };

  return (
    <div className="product-card" onClick={handleClick}>
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <p>${product.price}</p>
    </div>
  );
};

export default ProductCard;