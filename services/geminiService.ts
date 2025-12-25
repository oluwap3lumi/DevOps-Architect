
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const askDevOpsExpert = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "You are a senior DevOps Engineer with 15 years of experience in Kubernetes, Docker, and CI/CD. Provide concise, accurate, and professional advice. Focus on security, scalability, and best practices.",
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I'm having trouble connecting to my DevOps brain. Please check your API configuration.";
  }
};
