import type { IQuestionTopic, IQuestionTopicResponse } from "./types";

export function extractQuestionsFromJson(jsonString: string): IQuestionTopic[] {
  try {
    const parsed: IQuestionTopicResponse = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      throw new Error("Input JSON is not an array.");
    }
    return parsed.map((item: IQuestionTopic) => ({
      question: item.question,
      topic: item.topic,
    }));
  } catch (error) {
    console.error("Invalid JSON input:", error);
    return [];
  }
}

// localstorage
// expires in 1 hr
export const setWithExpiry = (
  key: string,
  value: string,
  ttl: number = 3600000
) => {
  const now = new Date();
  const item = {
    value: value,
    expiry: now.getTime() + ttl,
  };
  localStorage.setItem(key, JSON.stringify(item));
};

export const getWithExpiry = (key: string): number | null => {
  if (typeof window !== "undefined") {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
      return null;
    }
    const item = JSON.parse(itemStr);
    const now = new Date();
    if (now.getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.value;
  }
  return null;
};
