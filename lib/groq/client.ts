import "server-only";
import Groq from "groq-sdk";

export const GROQ_MODEL = "llama-3.3-70b-versatile";

let _groq: Groq | null = null;

function getGroq(): Groq {
  if (_groq) return _groq;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to your environment (.env.local) and restart the server."
    );
  }
  _groq = new Groq({ apiKey });
  return _groq;
}

export const groq = new Proxy({} as Groq, {
  get(_t, prop) {
    return (getGroq() as any)[prop];
  },
});

export async function groqJSON<T = any>(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.7
): Promise<T> {
  const client = getGroq();
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const content = completion.choices[0]?.message?.content ?? "{}";
  return JSON.parse(content) as T;
}
