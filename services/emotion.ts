import { Alert } from 'react-native';
import api from './api';
import { Drink, drinkService } from './drink';
import { handleConnectionError } from '@/utils/error-handler';
import { sanitizeText } from '@/utils/string-utils';
import axios from 'axios';
import { GoogleGenerativeAI } from "@google/generative-ai";
import Constants from 'expo-constants';

const GEMINI_API_KEY = Constants.expoConfig?.extra?.geminiApiKey;
const MAX_RETRIES = 10;
const RETRY_DELAY = 500;

export interface EmotionResponseItem {
  drink: Drink;
  reason: string;
}

interface DrinkRecommendation {
  drinkName: string;
  reason: string;
}

interface GeminiResponse {
  drinkRecommendation: DrinkRecommendation[];
}

class EmotionService {
  private readonly genAI: GoogleGenerativeAI;

  constructor() {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  /**
   * Chuẩn bị prompt cho Gemini
   */
  private prepareSystemPrompt(drinksData: any[]) {
    return `Bạn là một bartender chuyên nghiệp với kinh nghiệm gợi ý đồ uống dựa trên cảm xúc của khách hàng.

Đây là danh sách đồ uống có sẵn: ${JSON.stringify(drinksData)}

Hãy phân tích cảm xúc của khách. Trả về kết quả theo format JSON:
{
  "drinkRecommendation": [
    {
      "drinkName": "tên đồ uống",
      "reason": "lý do chi tiết tại sao đồ uống này phù hợp với cảm xúc hiện tại"
    }
  ]
}

Lưu ý:
- Chỉ gợi ý đồ uống có trong danh sách
- Đảm bảo tên đồ uống khớp chính xác
- Lý do phải cụ thể và liên quan đến cảm xúc`;
  }

  /**
   * Get drink recommendations based on emotion using Gemini AI
   */
  async getDrinkRecommendations(
    emotion: string,
    barId: string,
    onCancel?: () => void,
    retryCount = 0
  ): Promise<EmotionResponseItem[]> {
    try {
      // Validate input
      if (!emotion.trim()) {
        throw new Error('Emotion text is required');
      }

      // Lấy danh sách đồ uống từ bar
      const drinks = await drinkService.getDrinks(barId);
      if (!drinks.length) {
        throw new Error('No drinks available');
      }

      // Map drinks data cho Gemini
      const drinksData = drinks.map(drink => ({
        drinkName: drink.drinkName,
        drinkDescription: drink.description,
        emotionsDrink: drink.emotionsDrink.map(e => e.categoryName),
        price: drink.price
      }));

      // Khởi tạo model với config phù hợp
      const model = this.genAI.getGenerativeModel({ 
        model: "gemini-pro",
        generationConfig: {
          temperature: 0.7, // Giảm temperature để tăng độ chính xác
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048,
        }
      });

      // Tạo chat session với system prompt được cải thiện
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: this.prepareSystemPrompt(drinksData) }]
          },
          {
            role: "model",
            parts: [{ text: "Tôi đã sẵn sàng phân tích cảm xúc và gợi ý đồ uống phù hợp." }]
          }
        ]
      });

      // Gửi cảm xúc của khách
      const result = await chat.sendMessage(
        `Cảm xúc hiện tại của tôi là: ${sanitizeText(emotion)}`
      );
      
      // Xử lý response
      const jsonString = result.response.text().replace(/```json\n|\n```/g, "").trim();
      let recommendations: GeminiResponse;
      
      try {
        recommendations = JSON.parse(jsonString) as GeminiResponse;
      } catch (error) {
        throw new Error('Invalid response format from Gemini');
      }

      // Validate recommendations
      if (!recommendations?.drinkRecommendation?.length) {
        throw new Error('No recommendations received');
      }

      // Map và validate từng recommendation
      const recommendedDrinks = recommendations.drinkRecommendation
        .map((rec: DrinkRecommendation) => {
          const drink = drinks.find(d => 
            d.drinkName.toLowerCase() === rec.drinkName.toLowerCase()
          );
          
          if (!drink || !rec.reason) return null;

          return {
            drink: {
              ...drink,
              drinkName: sanitizeText(drink.drinkName),
              description: sanitizeText(drink.description),
              drinkCategoryResponse: {
                ...drink.drinkCategoryResponse,
                description: sanitizeText(drink.drinkCategoryResponse.description),
              },
              emotionsDrink: drink.emotionsDrink.map(emotion => ({
                ...emotion,
                description: emotion.description ? sanitizeText(emotion.description) : null,
              })),
            },
            reason: sanitizeText(rec.reason)
          };
        })
        .filter(Boolean) as EmotionResponseItem[];

      // Validate final results
      if (!recommendedDrinks.length) {
        throw new Error('No valid recommendations found');
      }

      return recommendedDrinks;

    } catch (error: any) {
      if (retryCount < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return this.getDrinkRecommendations(emotion, barId, onCancel, retryCount + 1);
      }

      Alert.alert(
        "Lỗi gợi ý",
        `Không thể gợi ý đồ uống sau ${MAX_RETRIES} lần thử. Vui lòng thử lại sau.`
      );
      throw new Error(error.message || 'Không thể gợi ý đồ uống');
    }
  }
}

export const emotionService = new EmotionService();