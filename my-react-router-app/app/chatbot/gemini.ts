import { GoogleGenAI, Type } from "@google/genai";
import { extractQuestionsFromJson } from "./functions";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const askGeminiToFilterEvents = async (events: string[]) => {
  const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const content = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `This is a list of events i have attended, ${events}. Help me filter this list to only events related to tourism, excluding flights.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });
      return JSON.parse(content.text ?? '')

  } catch (error) {
    console.log("Something Went Wrong", error);
    return [];
  }
};

export const askGeminiForQuestions = async (activity: string) => {
  const genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  try {
    const content = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `List the top 5 topic that a user can review for ${activity}, on a scale of 1(bad). Phrase these topics into quesitons to ask the user to rate on a scale of 1 to 5.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: {
                type: Type.STRING,
                description: "question to ask the user",
                nullable: false,
              },
              topic: {
                type: Type.STRING,
                description: "topic of the question",
                nullable: false,
              },
            },
            required: ["question", "topic"],
          },
        },
      },
    });
    const result = extractQuestionsFromJson(content.text ?? "");
    return result;
  } catch (error) {
    console.log("Something Went Wrong", error);
    return [];
  }
};
