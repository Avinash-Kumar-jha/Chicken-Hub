// utils/geminiAI.js
const axios = require("axios");
const config = require("../config/googleAI");

class GeminiAI {
  async generateCookingResponse(query) {
    try {
      const payload = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${config.cookingContext}\n\nUser Question: ${query}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: config.temperature,
          topP: config.topP,
          topK: config.topK,
          maxOutputTokens: config.maxTokens
        }
      };

      const url = `${config.geminiAPIEndpoint}/${config.geminiModel}:generateContent?key=${config.geminiAPIKey}`;

      const response = await axios.post(url, payload, {
        headers: { "Content-Type": "application/json" }
      });

      const text =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      return {
        response: text || "Sorry, I couldn't generate a response."
      };

    } catch (error) {
      console.error("Gemini API Error:", error.response?.data || error.message);
      return {
        response: "Sorry, the AI service is temporarily unavailable."
      };
    }
  }
}

module.exports = new GeminiAI();
