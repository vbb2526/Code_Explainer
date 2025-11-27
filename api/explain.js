// api/explain.js
import Groq from "groq-sdk";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

export default async function handler(req, res) {
  // Always return JSON responses
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "Server misconfigured: GROQ_API_KEY is missing." });
  }

  // Basic body validation
  const { code = "", language = "auto" } = req.body || {};
  if (!code || !String(code).trim()) {
    return res.status(400).json({ error: "Request must include non-empty 'code' in the JSON body." });
  }

  // Build prompt (if auto -> ask model to prefix Detected-Language)
  const detectPrefix =
    language === "auto"
      ? `First detect the programming language of the code and start your response with exactly one line:\nDetected-Language: <language-name>\n\nThen continue with the detailed explanation in Markdown as instructed below.\n\n`
      : "";

  const userPrompt = `
${detectPrefix}You are an expert software engineer, code runner, and educator.

Your job is to detect the language (if requested), explain the code, analyze it, and simulate the output if possible.

When giving explanations use clean, structured Markdown and follow this exact structure:

---

## 🔍 Overview (Short Summary)
2–3 lines: what this code does.

---

## 🧠 Step-by-Step / Line-by-Line Explanation
- Explain key lines/blocks and what they do.
- Use short code snippets where helpful.

---

## 🖥️ Program Output (If Possible)
- Try to simulate the output of the program.
- If input is missing, describe expected behavior or example input.
- If impossible due to errors, explain why.

Format output in a code block:

\`\`\`txt
<simulated output here>
\`\`\`

---

## ⚠️ Errors, Bugs & Logical Issues
If issues exist, for each: explain what, where, why, and how to fix.
If none, say: "No major errors found."

---

## 💡 Improvements & Best Practices
Give concise improvements: naming, structure, edge cases, performance.

---

## 📈 Complexity (If Applicable)
Give Time & Space complexity if the code uses algorithms; otherwise say "Not applicable."

---

## 📝 Improved Version (Only if needed)
If you provide a fixed or improved version, wrap it in a fenced code block using the detected or chosen language.

---

### Original Code:
\`\`\`
${code}
\`\`\`
`;

  try {
    const groq = new Groq({ apiKey: GROQ_API_KEY });

    // call the model
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: userPrompt }],
      // optional: set temperature/max_tokens for your needs
      // temperature: 0.0,
      // max_tokens: 1500,
    });

    const raw = completion.choices?.[0]?.message?.content ?? "";

    // return JSON with the raw markdown explanation
    return res.status(200).json({ explanation: String(raw) });
  } catch (err) {
    // Log server-side for debugging (Vercel dashboard)
    console.error("api/explain error:", err);

    // Try to extract a helpful message from the error object
    const message =
      err?.error?.message ||
      err?.message ||
      (typeof err === "string" ? err : "Unknown server error");

    // Always return JSON (no HTML)
    return res.status(500).json({
      error: "API call failed",
      detail: message,
    });
  }
}
