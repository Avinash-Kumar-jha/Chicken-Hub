// chatbotRoutes.js - Complete working version
const express = require('express');
const router = express.Router();

// Import your chatbot functions
const chickenChatbot = require('../chickenChatbot');

// Test route to verify routes are working
router.get('/test', (req, res) => {
    console.log('✅ Chatbot test route accessed');
    res.json({
        success: true,
        message: 'Chatbot routes are working!',
        timestamp: new Date().toISOString()
    });
});

// Health check endpoint
router.get('/health', (req, res) => {
    console.log('✅ Chatbot health check accessed');
    res.json({
        success: true,
        message: "Chicken Cooking Assistant API is running",
        timestamp: new Date().toISOString(),
        status: "healthy",
        version: "1.0.0"
    });
});

// Get available products
router.get('/products', (req, res) => {
    console.log('✅ Chatbot products endpoint accessed');
    try {
        // Import chickenRecipes directly from the file
        const { chickenRecipes } = require('../chickenChatbot');
        
        if (!chickenRecipes || Object.keys(chickenRecipes).length === 0) {
            return res.status(404).json({
                success: false,
                error: "No products found",
                message: "Chicken recipes database is empty"
            });
        }
        
        const products = Object.keys(chickenRecipes).map(key => ({
            id: key,
            name: chickenRecipes[key].name,
            recipeCount: chickenRecipes[key].recipes ? chickenRecipes[key].recipes.length : 0
        }));
        
        res.json({
            success: true,
            products: products,
            count: products.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("❌ Error in /products endpoint:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: error.message
        });
    }
});

// Chatbot query endpoint
router.post('/query', (req, res) => {
    console.log('✅ Chatbot query endpoint accessed');
    try {
        const { message } = req.body;
        
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.json({
                success: false,
                error: "Please provide a valid message"
            });
        }
        
        // Get response from chatbot
        const response = chickenChatbot.chickenChatbot(message.trim());
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...response
        });
        
    } catch (error) {
        console.error("❌ Chatbot error:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error",
            message: "Sorry, I'm having trouble processing your request. Please try again."
        });
    }
});

module.exports = router;