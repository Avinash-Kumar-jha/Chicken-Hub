// utils/validateCookingQuery.js
const validateCookingQuery = (query) => {
  const errors = [];
  
  // Clean query
  if (typeof query !== 'string') {
    query = String(query || '');
  }
  query = query.trim();
  
  // Basic validation
  if (!query) {
    errors.push('Please enter a cooking question');
  } else if (query.length < 3) {
    errors.push('Question must be at least 3 characters');
  } else if (query.length > 500) {
    errors.push('Question is too long (max 500 characters)');
  }
  
  // Simple cooking keyword check
  const cookingKeywords = [
    'cook', 'recipe', 'food', 'meal', 'eat', 'dish',
    'bake', 'fry', 'grill', 'roast', 'boil', 'steam',
    'chicken', 'meat', 'vegetable', 'fruit', 'spice',
    'oven', 'stove', 'kitchen', 'pan', 'pot', 'knife',
    'temperature', 'time', 'season', 'flavor', 'taste'
  ];
  
  const queryLower = query.toLowerCase();
  const hasCookingKeyword = cookingKeywords.some(keyword => queryLower.includes(keyword));
  
  if (!hasCookingKeyword) {
    errors.push('Please ask a cooking-related question');
  }
  
  // Determine category
  let category = 'general';
  if (queryLower.includes('recipe')) category = 'recipe';
  else if (queryLower.includes('ingredient')) category = 'ingredient';
  else if (queryLower.includes('temperature') || queryLower.includes('temp')) category = 'temperature';
  else if (queryLower.includes('time') || queryLower.includes('how long')) category = 'timing';
  else if (queryLower.includes('safe') || queryLower.includes('poison')) category = 'safety';
  else if (queryLower.includes('nutrit') || queryLower.includes('health')) category = 'nutrition';
  else if (queryLower.includes('technique') || queryLower.includes('method')) category = 'technique';
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    cleanedQuery: query,
    category
  };
};

module.exports = validateCookingQuery;