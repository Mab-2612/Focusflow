// lib/genai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const getGeminiModel = (modelName = "gemini-pro") => {
  return genAI.getGenerativeModel({ model: modelName });
};

// Helper function for generating text
export async function generateText(prompt: string): Promise<string> {
  try {
    const model = getGeminiModel();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating text with Gemini:", error);
    throw new Error("AI service is temporarily unavailable. Please try again.");
  }
}