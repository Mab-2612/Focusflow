// lib/genai.ts

"use client";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

export interface ChatHistoryItem {
  role: "user" | "model";
  parts: { text: string }[];
}

export const chatWithAI = async (
  prompt: string,
  history: ChatHistoryItem[]
): Promise<string> => {
  const now = new Date();
  const currentTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const currentDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const systemInstruction = {
  parts: [
    {
      text: `
        You are FocusFlow — a friendly, chill AI that helps with anything: questions, jokes, planning, or productivity.

        STRICT RULES:
        - Do NOT talk about focus, productivity, motivation, or goals unless the user directly asks about it.
        - Do NOT remind, encourage, or ask what task the user is working on.
        - Just respond naturally to whatever they say — like a helpful friend.
        - Keep answers clean, structured, and bullet-pointed if multiple items.
        - When listing items, use bullet symbols (•) not numbers.
        - When asked for time/date:
          • Give only hour and minute (no seconds)
          • Format time like "3:42 PM" and date like "Friday, November 7, 2025".
        - Keep tone friendly, not robotic or overly motivational.
      `,
    },
  ],
};


  const contents = [
    ...history,
    { role: "user" as const, parts: [{ text: prompt }] },
  ];

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      let errorText = await response.text();
      let errorData: any;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: { message: errorText } };
      }
      console.error("Gemini API Error:", errorData);
      throw new Error(errorData.error?.message || "Unknown Gemini API error");
    }

    const data = await response.json();
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Hmm... I couldn’t come up with a response.";

    // 🧹 Optional: normalize bullet spacing for cleaner UI
    return text
      .replace(/^\s*[-*]\s+/gm, "• ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch (error) {
    console.error("Error in chatWithAI:", error);
    return "Something went wrong while chatting with me 😅 Try again!";
  }
};

const generateSubtasks = async (taskTitle: string): Promise<string[]> => {
  try {
    // You can customize this to your Gemini/AI logic later
    return [
      `Break down "${taskTitle}" into clear steps.`,
      "Focus on main goals.",
      "Assign realistic time blocks.",
    ];
  } catch (error) {
    console.error("Error generating subtasks:", error);
    return ["Failed to generate subtasks."];
  }
};

export { generateSubtasks };