
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const callGeminiTutor = async (question: string, options: string[], correctIdx: number): Promise<string> => {
  if (!API_KEY) {
    return "系統未偵測到 API 金鑰，請確認環境設定。";
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const modelName = 'gemini-3-flash-preview'; // Optimized for explanations

  const systemInstruction = "你是一位專業且嚴謹的測量助理甄試導師。請以『無機質、直接、精簡』的語氣解析。格式要求：■ 解析重點：(說明原理或法條) ■ 核心邏輯：(解釋正確與錯誤選項差異) ■ 記憶摘要：(提供關鍵字口訣)。請使用繁體中文。";
  const userPrompt = `題目：${question}\n正確答案：(${String.fromCharCode(65 + correctIdx)}) ${options[correctIdx]}\n選項清單：${options.map((opt, i) => `(${String.fromCharCode(65 + i)}) ${opt}`).join(', ')}`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [{ parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.95,
      },
    });

    return response.text || "暫無解析資料。";
  } catch (err) {
    console.error("Gemini API Error:", err);
    return "AI 解析服務連線異常，請稍後再試。";
  }
};
