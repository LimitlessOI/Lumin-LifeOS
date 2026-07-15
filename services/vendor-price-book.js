/**
 * SYNOPSIS: Mock data for illustration purposes
 */
// Mock data for illustration purposes
const vendors = [
  { id: 1, name: 'Vendor A', price: 100, reviews: 4.5 },
  { id: 2, name: 'Vendor B', price: 150, reviews: 4.0 },
  { id: 3, name: 'Vendor C', price: 90, reviews: 3.5 },
  { id: 4, name: 'Vendor D', price: 110, reviews: 4.7 },
];

// Helper function to filter vendors by strong reviews
function filterStrongReviews(vendor) {
  return vendor.reviews >= 4.0;
}

// Compare vendors based on price and strong reviews
function compareVendors() {
  const filteredVendors = vendors.filter(filterStrongReviews);
  return filteredVendors.sort((a, b) => a.price - b.price);
}

// Get vendor information by ID
function getVendorInfo(vendorId) {
  return vendors.find(vendor => vendor.id === vendorId && filterStrongReviews(vendor)) || null;
}

export { compareVendors, getVendorInfo };
