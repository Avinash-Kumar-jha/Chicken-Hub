// Chicken Recipe Database - Matched with your products
const chickenRecipes = {
    // Recipe database matched with your product names
    "fresh chicken thighs": {
        name: "Fresh Chicken Thighs",
        category: "fresh_chicken",
        recipes: [
            {
                name: "Crispy Baked Chicken Thighs",
                prepTime: "10 mins",
                cookTime: "35-40 mins",
                difficulty: "Easy",
                ingredients: [
                    "4-6 chicken thighs",
                    "2 tbsp olive oil",
                    "1 tsp garlic powder",
                    "1 tsp paprika",
                    "1 tsp dried thyme",
                    "Salt and pepper to taste"
                ],
                instructions: [
                    "Preheat oven to 400°F (200°C)",
                    "Pat chicken thighs dry with paper towels",
                    "Mix all spices with olive oil",
                    "Coat chicken thighs evenly",
                    "Place on baking sheet skin-side up",
                    "Bake for 35-40 minutes until crispy",
                    "Internal temp should reach 165°F"
                ],
                tips: "For extra crispy skin, pat dry thoroughly before seasoning"
            },
            {
                name: "Honey Garlic Chicken Thighs",
                prepTime: "15 mins",
                cookTime: "25 mins",
                difficulty: "Medium",
                ingredients: [
                    "4 chicken thighs",
                    "1/4 cup honey",
                    "3 cloves garlic, minced",
                    "2 tbsp soy sauce",
                    "1 tbsp rice vinegar",
                    "1 tsp ginger, grated"
                ],
                instructions: [
                    "Season chicken with salt and pepper",
                    "Pan-sear skin-side down for 5-7 minutes",
                    "Mix honey, garlic, soy sauce, vinegar, and ginger",
                    "Pour sauce over chicken",
                    "Simmer for 15-20 minutes",
                    "Baste frequently until glazed"
                ]
            }
        ],
        cookingTips: [
            "Best cooked to internal temperature of 165°F",
            "Skin-side down first for crispy skin",
            "Bone-in thighs take 5-10 minutes longer",
            "Marinate for 2+ hours for best flavor"
        ]
    },
    
    "fresh chicken wings": {
        name: "Fresh Chicken Wings",
        category: "fresh_chicken",
        recipes: [
            {
                name: "Classic Buffalo Wings",
                prepTime: "15 mins",
                cookTime: "45 mins",
                difficulty: "Easy",
                ingredients: [
                    "1 kg chicken wings",
                    "1/2 cup hot sauce",
                    "1/4 cup butter",
                    "1 tbsp vinegar",
                    "1 tsp Worcestershire sauce",
                    "Salt and pepper"
                ],
                instructions: [
                    "Pat wings dry thoroughly",
                    "Bake at 400°F for 45 minutes, flipping halfway",
                    "Melt butter with hot sauce and seasonings",
                    "Toss wings in sauce immediately after baking",
                    "Serve with celery and blue cheese dip"
                ]
            },
            {
                name: "Crispy Oven-Baked Wings",
                prepTime: "10 mins",
                cookTime: "50 mins",
                difficulty: "Easy",
                ingredients: [
                    "1 kg chicken wings",
                    "1 tbsp baking powder (not soda)",
                    "1 tsp salt",
                    "1 tsp garlic powder",
                    "1 tsp paprika"
                ],
                instructions: [
                    "Pat wings very dry",
                    "Mix baking powder and spices",
                    "Coat wings evenly (no flour needed)",
                    "Place on rack over baking sheet",
                    "Bake at 425°F for 50 minutes, flipping once"
                ],
                tips: "Baking powder creates chemical reaction for extra crispiness"
            }
        ],
        cookingTips: [
            "Pat EXTREMELY dry for crispiness",
            "Use baking powder (not soda) for crispy oven wings",
            "Separate drumettes and flats for even cooking",
            "Fry at 375°F for 10-12 minutes for deep-fried version"
        ]
    },
    
    "fresh chicken drumsticks": {
        name: "Fresh Chicken Drumsticks",
        category: "fresh_chicken",
        recipes: [
            {
                name: "Barbecue Drumsticks",
                prepTime: "10 mins",
                cookTime: "40 mins",
                difficulty: "Easy",
                ingredients: [
                    "6 chicken drumsticks",
                    "1 cup BBQ sauce",
                    "2 tbsp brown sugar",
                    "1 tsp smoked paprika",
                    "1 tsp garlic powder"
                ],
                instructions: [
                    "Season drumsticks with salt, pepper, paprika",
                    "Bake at 375°F for 25 minutes",
                    "Mix BBQ sauce with brown sugar",
                    "Brush sauce on drumsticks",
                    "Bake additional 15 minutes until glazed"
                ]
            },
            {
                name: "Indian Tandoori Drumsticks",
                prepTime: "30 mins + marinating",
                cookTime: "25 mins",
                difficulty: "Medium",
                ingredients: [
                    "6 drumsticks",
                    "1 cup yogurt",
                    "2 tbsp tandoori masala",
                    "1 tbsp ginger-garlic paste",
                    "1 tbsp lemon juice",
                    "Red food color (optional)"
                ],
                instructions: [
                    "Make deep slits in drumsticks",
                    "Mix marinade ingredients",
                    "Marinate 4+ hours (overnight best)",
                    "Grill or bake at 400°F for 20-25 minutes",
                    "Broil 2 mins for charred effect"
                ]
            }
        ],
        cookingTips: [
            "Make slits for better marinade penetration",
            "Bake at 375-400°F for 35-40 minutes",
            "Internal temp: 165°F at thickest part",
            "Rest 5 minutes before serving"
        ]
    },
    
    "fresh chicken mince": {
        name: "Fresh Chicken Mince",
        category: "fresh_chicken",
        recipes: [
            {
                name: "Chicken Meatballs",
                prepTime: "20 mins",
                cookTime: "20 mins",
                difficulty: "Easy",
                ingredients: [
                    "500g chicken mince",
                    "1 egg",
                    "1/2 cup breadcrumbs",
                    "1/4 cup parsley, chopped",
                    "2 cloves garlic, minced",
                    "1 tsp Italian seasoning"
                ],
                instructions: [
                    "Mix all ingredients gently (don't overmix)",
                    "Form into 1-inch balls",
                    "Bake at 400°F for 18-20 minutes",
                    "Or pan-fry for 12-15 minutes",
                    "Serve with pasta or as appetizer"
                ]
            },
            {
                name: "Chicken Burger Patties",
                prepTime: "15 mins",
                cookTime: "10 mins",
                difficulty: "Easy",
                ingredients: [
                    "500g chicken mince",
                    "1 onion, finely chopped",
                    "1 tsp garlic powder",
                    "1 tsp paprika",
                    "Salt and pepper to taste"
                ],
                instructions: [
                    "Mix all ingredients lightly",
                    "Form into patties (don't pack too tight)",
                    "Chill for 30 minutes",
                    "Grill or pan-fry 4-5 minutes per side",
                    "Internal temp should be 165°F"
                ]
            }
        ],
        cookingTips: [
            "Don't overmix - keeps texture tender",
            "Add breadcrumbs or oats for binding",
            "Keep 20% fat content for juiciness",
            "Cook to 165°F internal temperature"
        ]
    },
    
    "boneless chicken breast": {
        name: "Boneless Chicken Breast",
        category: "fresh_chicken",
        recipes: [
            {
                name: "Pan-Seared Chicken Breast",
                prepTime: "10 mins",
                cookTime: "15 mins",
                difficulty: "Easy",
                ingredients: [
                    "2 chicken breasts",
                    "2 tbsp olive oil",
                    "Salt and pepper",
                    "1 tsp paprika",
                    "2 cloves garlic"
                ],
                instructions: [
                    "Pound to even thickness",
                    "Season both sides generously",
                    "Heat oil in pan on medium-high",
                    "Cook 5-7 minutes per side",
                    "Rest 5 minutes before slicing"
                ]
            }
        ],
        cookingTips: [
            "Pound to even thickness for uniform cooking",
            "Cook to 165°F, then rest 5 minutes",
            "Brining for 30 mins prevents dryness"
        ]
    },
    
    // Add more products as needed
};

// AI Response Generator
function generateChickenResponse(userInput, productName) {
    const input = userInput.toLowerCase();
    const productKey = productName.toLowerCase();
    
    if (!chickenRecipes[productKey]) {
        return {
            type: "unknown",
            message: "I specialize in cooking instructions for our chicken products. Could you specify which chicken product you'd like to cook?",
            suggestions: [
                "How to cook chicken thighs",
                "Chicken wings recipe",
                "Drumsticks cooking time",
                "Chicken mince recipes"
            ]
        };
    }
    
    const product = chickenRecipes[productKey];
    
    // Check for specific questions
    if (input.includes("recipe") || input.includes("how to cook") || input.includes("make")) {
        const recipe = product.recipes[0]; // Default to first recipe
        return {
            type: "recipe",
            product: product.name,
            recipe: recipe,
            cookingTips: product.cookingTips
        };
    }
    
    if (input.includes("time") || input.includes("how long")) {
        const recipe = product.recipes[0];
        return {
            type: "cooking_time",
            product: product.name,
            prepTime: recipe.prepTime,
            cookTime: recipe.cookTime,
            totalTime: calculateTotalTime(recipe.prepTime, recipe.cookTime),
            temperature: "375-400°F for most recipes",
            tips: product.cookingTips
        };
    }
    
    if (input.includes("temperature") || input.includes("temp") || input.includes("heat")) {
        return {
            type: "temperature",
            product: product.name,
            baking: "375-400°F",
            frying: "350-375°F",
            grilling: "Medium-high heat",
            internalTemp: "165°F (74°C)",
            tips: ["Always use meat thermometer", "Carryover cooking adds 5°F"]
        };
    }
    
    if (input.includes("tip") || input.includes("advice") || input.includes("best way")) {
        return {
            type: "tips",
            product: product.name,
            tips: product.cookingTips,
            proTip: getProTip(productKey)
        };
    }
    
    if (input.includes("ingredient") || input.includes("need") || input.includes("require")) {
        const recipe = product.recipes[0];
        return {
            type: "ingredients",
            product: product.name,
            recipeName: recipe.name,
            ingredients: recipe.ingredients,
            servings: "2-4 people"
        };
    }
    
    // Default response - give overview
    return {
        type: "overview",
        product: product.name,
        description: `Here are cooking ideas for ${product.name}:`,
        recipes: product.recipes.map(r => r.name),
        quickTip: product.cookingTips[0]
    };
}

// Helper function to calculate total time
function calculateTotalTime(prepTime, cookTime) {
    const prep = parseInt(prepTime) || 0;
    const cook = parseInt(cookTime) || 0;
    return `${prep + cook} minutes total`;
}

// Helper function for pro tips
function getProTip(productKey) {
    const tips = {
        "fresh chicken thighs": "Score the skin for extra crispiness",
        "fresh chicken wings": "Double-fry for ultimate crispiness",
        "fresh chicken drumsticks": "Marinate overnight for best flavor",
        "fresh chicken mince": "Add ice water for juicier burgers"
    };
    return tips[productKey] || "Always use a meat thermometer for perfect results";
}

// Extract product name from user input
function extractProductFromInput(userInput) {
    const input = userInput.toLowerCase();
    
    // Check for each product in the input
    for (const productKey in chickenRecipes) {
        const productName = chickenRecipes[productKey].name.toLowerCase();
        if (input.includes(productKey) || input.includes(productName) || 
            input.includes(productKey.split(' ')[productKey.split(' ').length-1])) {
            return productKey;
        }
    }
    
    // Check for keywords
    if (input.includes("thigh")) return "fresh chicken thighs";
    if (input.includes("wing")) return "fresh chicken wings";
    if (input.includes("drumstick") || input.includes("leg")) return "fresh chicken drumsticks";
    if (input.includes("mince") || input.includes("ground") || input.includes("burger")) return "fresh chicken mince";
    if (input.includes("breast")) return "boneless chicken breast";
    
    return null;
}

// Main chatbot function
function chickenChatbot(userInput) {
    const productName = extractProductFromInput(userInput);
    
    if (!productName) {
        return {
            error: false,
            response: {
                type: "greeting",
                message: "Hello! I'm your Chicken Cooking Assistant. I can help you cook our delicious chicken products. What would you like to cook today?",
                examples: [
                    "How to cook chicken thighs?",
                    "Give me a wings recipe",
                    "Cooking time for drumsticks",
                    "What can I make with chicken mince?"
                ]
            }
        };
    }
    
    const response = generateChickenResponse(userInput, productName);
    
    return {
        error: false,
        product: chickenRecipes[productName].name,
        response: response
    };
}

// In chickenChatbot.js - Make sure these exports are at the bottom
module.exports = {
    chickenChatbot: chickenChatbot,  // The main function
    chickenRecipes, // The recipe database
    generateChickenResponse: generateChickenResponse,
    extractProductFromInput: extractProductFromInput
};