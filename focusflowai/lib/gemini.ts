// lib/gemini.ts
"use client";

// -----------------------------
// Gemini API Setup
// -----------------------------
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;

// -----------------------------
// Chat history structure
// -----------------------------
export interface ChatHistoryItem {
  role: "user" | "model";
  parts: { text: string }[];
}

// -----------------------------
// Chat with AI
// -----------------------------
export const chatWithAI = async (prompt: string, history: ChatHistoryItem[]): Promise<string> => {
  // Current time/date formatting
  const now = new Date();
  const currentTime = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const currentDate = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // Add user message to history
  const contents = [
    ...history,
    { role: "user" as const, parts: [{ text: prompt }] },
  ];

  // System instruction — strict rules to prevent productivity spam and enforce bullets
  const systemInstruction = {
    parts: [
      {
        text: `
You are FocusFlow — a friendly AI assistant. Rules:
- Do NOT give productivity reminders unless the user explicitly asks.
- Respond concisely and clearly.
- When giving multiple items (jokes, tips, steps, subtasks), use bullets (•) and do NOT number them.
- When giving time/date, only show hour:minute and weekday, month, day, year.
- Keep tone natural and friendly.
- Use the following placeholders if time/date requested:
  • Current time: ${currentTime}
  • Current date: ${currentDate}
`
      }
    ]
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: {
          temperature: 0.7,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });

    if (!response.ok) {
      let errorBody = await response.text();
      try { errorBody = JSON.parse(errorBody); } catch {}
      console.error("Gemini API Error:", errorBody?.error || errorBody);
      throw new Error(errorBody?.error?.message || "Unknown Gemini API error");
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response.";

    // Normalize bullets
    return text
      .split("\n")
      .map(line => line.trim())
      .map(line => line.replace(/^[-*]\s*/, "• "))
      .join("\n")
      .trim();

  } catch (error) {
    console.error("Error in chatWithAI:", error);
    return "I apologize, something went wrong while generating a response.";
  }
};

// -----------------------------
// Generate subtasks
// -----------------------------
export const generateSubtasks = async (taskTitle: string): Promise<string[]> => {
  if (!taskTitle || !taskTitle.trim()) {
    return ["Research task", "Plan approach", "Execute", "Review", "Refine"];
  }

  const prompt = `Break down the task "${taskTitle}" into 3-5 actionable subtasks. Format as bullets (•).`;

  try {
    const responseText = await chatWithAI(prompt, []);
    return responseText
      .split("\n")
      .filter(line => line.trim().startsWith("•"))
      .map(line => line.replace(/^•\s*/, "").trim());
  } catch (error) {
    console.error("Error generating subtasks:", error);
    return ["Failed to generate subtasks."];
  }
};
