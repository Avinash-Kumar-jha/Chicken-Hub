// controllers/aiCookingController.js
const ChatHistory = require('../models/ChatHistory');
const geminiAI = require('../utils/geminiAI');
const validateCookingQuery = require('../utils/validateCookingQuery');

class AICookingController {
  // Ask cooking question
  async askCookingQuestion(req, res) {
    try {
      const { question, sessionId } = req.body;

      if (!question) {
        return res.status(400).json({
          success: false,
          message: "Question is required"
        });
      }

      const validation = validateCookingQuery(question);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: validation.errors?.[0] || "Invalid cooking question"
        });
      }

      const startTime = Date.now();
      const aiResponse = await geminiAI.generateCookingResponse(
        validation.cleanedQuery
      );
      const responseTime = Date.now() - startTime;

      const finalSessionId =
        sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const chatEntry = await ChatHistory.create({
        sessionId: finalSessionId,
        query: validation.cleanedQuery,
        response: aiResponse.response,
        category: validation.category,
        responseTime,
        metadata: {
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip
        }
      });

      return res.status(200).json({
        success: true,
        data: {
          response: aiResponse.response,
          query: validation.cleanedQuery,
          category: validation.category,
          responseTime,
          timestamp: chatEntry.createdAt,
          chatId: chatEntry._id
        }
      });

    } catch (error) {
      console.error("Ask cooking error:", error);
      return res.status(500).json({
        success: false,
        message: "AI failed to respond"
      });
    }
  }

  
  // Get cooking tips
  async getCookingTips(req, res) {
    try {
      const tips = [
        {
          id: 1,
          title: 'Perfect Chicken Temperature',
          tip: 'Cook chicken to an internal temperature of 165°F (74°C) for safety.',
          icon: '🌡️'
        },
        {
          id: 2,
          title: 'Knife Safety',
          tip: 'Always keep knives sharp. A dull knife requires more force and is more dangerous.',
          icon: '🔪'
        },
        {
          id: 3,
          title: 'Meal Prep',
          tip: 'Prep all ingredients before starting to cook. This is called "mise en place".',
          icon: '🥕'
        },
        {
          id: 4,
          title: 'Seasoning Tip',
          tip: 'Season in layers - a little salt at each stage of cooking builds flavor.',
          icon: '🧂'
        },
        {
          id: 5,
          title: 'Resting Meat',
          tip: 'Let cooked meat rest for 5-10 minutes before cutting to retain juices.',
          icon: '⏰'
        },
        {
          id: 6,
          title: 'Vegetable Storage',
          tip: 'Store onions and potatoes separately - onions make potatoes spoil faster.',
          icon: '🧅'
        },
        {
          id: 7,
          title: 'Taste as You Go',
          tip: 'Taste your food throughout the cooking process to adjust seasoning.',
          icon: '👅'
        },
        {
          id: 8,
          title: 'Clean as You Go',
          tip: 'Wash utensils and clean surfaces while cooking to make cleanup easier.',
          icon: '🧽'
        }
      ];
      
      res.status(200).json({
        success: true,
        data: tips
      });
      
    } catch (error) {
      console.error('Get cooking tips error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch cooking tips'
      });
    }
  }
  
  // Provide feedback on response
  async provideFeedback(req, res) {
    try {
      const { chatId, isHelpful, feedback } = req.body;
      
      if (!chatId) {
        return res.status(400).json({
          success: false,
          message: 'Chat ID is required'
        });
      }
      
      const chat = await ChatHistory.findById(chatId);
      
      if (!chat) {
        return res.status(404).json({
          success: false,
          message: 'Chat not found'
        });
      }
      
      chat.isHelpful = isHelpful;
      if (feedback) {
        chat.userFeedback = feedback;
      }
      
      await chat.save();
      
      res.status(200).json({
        success: true,
        message: 'Thank you for your feedback!'
      });
      
    } catch (error) {
      console.error('Feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit feedback'
      });
    }
  }
  
  // Get chat history
  async getChatHistory(req, res) {
    try {
      const { sessionId, limit = 20 } = req.query;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }
      
      const chats = await ChatHistory.find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select('query response category createdAt');
      
      res.status(200).json({
        success: true,
        data: {
          chats,
          count: chats.length
        }
      });
      
    } catch (error) {
      console.error('Get chat history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch chat history'
      });
    }
  }
  
  // Clear chat history
  async clearChatHistory(req, res) {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: 'Session ID is required'
        });
      }
      
      const result = await ChatHistory.deleteMany({ sessionId });
      
      res.status(200).json({
        success: true,
        message: `Cleared ${result.deletedCount} chat messages`,
        deletedCount: result.deletedCount
      });
      
    } catch (error) {
      console.error('Clear chat history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear chat history'
      });
    }
  }
}

module.exports = new AICookingController();