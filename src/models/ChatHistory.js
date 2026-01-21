// models/ChatHistory.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const chatHistorySchema = new Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  query: {
    type: String,
    required: true,
    trim: true
  },
  response: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['recipe', 'technique', 'ingredient', 'safety', 'general', 'timing', 'nutrition', 'temperature'],
    default: 'general'
  },
  responseTime: {
    type: Number,
    default: 0
  },
  isHelpful: {
    type: Boolean,
    default: null
  },
  userFeedback: {
    type: String,
    trim: true
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema);