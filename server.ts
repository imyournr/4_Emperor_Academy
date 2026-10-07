import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";
import fs from "fs";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Lazy-loaded Gemini client to prevent startup crashes if API key is not configured yet
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ (กรุณาตรวจสอบใน Settings -> Secrets)");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // Resilient Gemini AI caller with retry & model fallback
  async function callGeminiWithRetryAndFallback(params: {
    contents: any;
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
    temperature?: number;
  }): Promise<string> {
    const client = getGeminiClient();
    // Candidate models in order of priority: gemini-3.8-flash then gemini-3.1-flash-lite
    const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
    const maxRetriesPerModel = 2;
    let lastError: any = null;

    for (const model of candidateModels) {
      for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
        try {
          const config: any = {};
          if (params.systemInstruction) config.systemInstruction = params.systemInstruction;
          if (params.responseMimeType) config.responseMimeType = params.responseMimeType;
          if (params.responseSchema) config.responseSchema = params.responseSchema;
          if (params.temperature !== undefined) config.temperature = params.temperature;

          const response = await client.models.generateContent({
            model,
            contents: params.contents,
            ...(Object.keys(config).length > 0 ? { config } : {}),
          });

          if (response && response.text) {
            return response.text;
          }
          throw new Error("โมเดล AI ไม่ได้ส่งเนื้อหากลับมา (Empty response)");
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          const isTransient =
            errMsg.includes("503") ||
            errMsg.includes("UNAVAILABLE") ||
            errMsg.includes("high demand") ||
            errMsg.includes("429") ||
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("overloaded");

          console.warn(`[Gemini AI] Model ${model} attempt ${attempt} warning:`, errMsg);

          if (isTransient && attempt < maxRetriesPerModel) {
            // Exponential backoff wait before retrying same model
            await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
            continue;
          } else {
            // Proceed to next fallback model
            break;
          }
        }
      }
    }

    // Produce helpful pedagogical error message in Thai
    const rawErrorStr = lastError?.message || String(lastError || "");
    if (rawErrorStr.includes("503") || rawErrorStr.includes("UNAVAILABLE") || rawErrorStr.includes("high demand")) {
      throw new Error("ขณะนี้เซิร์ฟเวอร์ Gemini AI ของ Google มีผู้ใช้งานหนาแน่นสูงชั่วคราว (High Demand) ระบบได้พยายามส่งซ้ำแล้ว แนะนำให้เว้นระยะ 1-2 นาทีแล้วกดอีกครั้ง หรือเลือกใช้ระบบวิเคราะห์ด่วนแบบ Regex ได้ทันทีครับ");
    } else if (rawErrorStr.includes("GEMINI_API_KEY")) {
      throw new Error("ยังไม่ได้กำหนด GEMINI_API_KEY ใน Settings > Secrets กรุณาตรวจสอบการตั้งค่า");
    } else if (rawErrorStr.includes("429") || rawErrorStr.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("คำขอเกินโควตาชั่วคราว (Rate Limit / Quota Exceeded) กรุณารอสักครู่แล้วลองใหม่อีกครั้ง");
    }

    throw new Error(lastError?.message || "ระบบ AI ไม่สามารถประมวลผลคำขอได้ในขณะนี้");
  }

  // API Route for AI Explanation
  app.post("/api/explain", async (req, res) => {
    try {
      const { questionText, choices, correctAnswer, currentExplanation } = req.body;
      
      if (!questionText || !choices || !correctAnswer) {
        return res.status(400).json({ error: "Missing required fields (questionText, choices, or correctAnswer)" });
      }

      const prompt = `You are an expert English Language teacher in Thailand who explains grammar and language concepts in a very simple, encouraging, and clear way for Thai students.
Here is the question they are practicing:
Question: ${questionText}
Choices:
${choices.map((c: string, idx: number) => `${String.fromCharCode(97 + idx)}) ${c}`).join('\n')}
Correct Answer: ${correctAnswer}
Original explanation: ${currentExplanation || "No explanation provided."}

Please explain this question and the grammatical/linguistic concepts behind it in a much simpler, extremely clear, and beautiful Thai language (ภาษาง่ายๆ เป็นกันเองเหมือนพี่สอนน้อง กระชับ ได้ความรู้).
Break down into:
1. ✨ ทำไมข้อนี้ถึงถูก (Why the correct answer is right)
2. 💡 วิเคราะห์ช้อยส์อื่นๆ (Why other options are incorrect, briefly)
3. 🚀 เทคนิคเด็ดสำหรับไปใช้ในห้องสอบ (Short memory tip/rule of thumb for future exams)

Format your output beautifully using clear paragraph breaks and helpful emojis. Keep it warm, pedagogical, and highly encouraging.`;

      const responseText = await callGeminiWithRetryAndFallback({
        contents: prompt,
      });

      res.json({ explanation: responseText });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI explanation" });
    }
  });

  // API Route to parse .docx file via Mammoth
  app.post("/api/parse-docx", async (req, res) => {
    try {
      const { fileData } = req.body;
      if (!fileData) {
        return res.status(400).json({ error: "ไม่พบข้อมูลไฟล์ที่ส่งมา (Missing fileData)" });
      }

      // Clean Base64 string if it contains data URI header
      const cleanBase64 = typeof fileData === "string" && fileData.includes(",")
        ? fileData.split(",")[1]
        : fileData;

      const buffer = Buffer.from(cleanBase64, "base64");
      if (buffer.length === 0) {
        return res.status(400).json({ error: "ไฟล์ที่ส่งมามีขนาด 0 ไบต์ หรือข้อมูลว่างเปล่า" });
      }

      const result = await mammoth.extractRawText({ buffer });
      const extractedText = (result.value || "").trim();

      if (!extractedText) {
        return res.status(400).json({
          error: "ไม่พบข้อความตัวอักษรในไฟล์ Word (อาจเป็นไฟล์รูปภาพล้วน หรือมีรหัสผ่าน) กรุณาคัดลอกข้อความ (Copy) จากไฟล์ Word มาวางในระบบได้โดยตรง"
        });
      }
      
      res.json({ text: extractedText, messages: result.messages });
    } catch (error: any) {
      console.error("Docx Parsing Error:", error);
      let userMsg = "ไม่สามารถอ่านไฟล์ Word ได้";
      if (error.message?.includes("word/document.xml") || error.message?.includes("end of central directory")) {
        userMsg = "ไฟล์ดังกล่าวไม่ใช่เอกสาร Word (.docx) ที่รองรับ (ระบบรองรับ .docx รุ่น Word 2007 ขึ้นไป) หากเป็นไฟล์ .doc หรือ .pdf กรุณาบันทึกเป็น .docx หรือคัดลอกข้อความมาวางตรงๆ ในระบบได้ทันที";
      } else {
        userMsg += `: ${error.message}`;
      }
      res.status(400).json({ error: userMsg });
    }
  });

  // API Route to analyze exam text using Gemini AI
  app.post("/api/analyze-exam-ai", async (req, res) => {
    try {
      const { text, customInstructions, defaultCategory, defaultExamSet } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Missing text content to analyze" });
      }

      const client = getGeminiClient();

      const systemInstruction = `You are an expert AI English Exam Parser and Pedagogical Assistant.
Your task is to take a raw text representation of an English exam (which could be copied from a PDF, Word document, or parsed via mammoth) and intelligently parse it into a structured array of JSON question objects.

Please pay close attention to the following exam types and guidelines:
1. "Reading" category:
   - Detect reading passages (usually long paragraph texts).
   - For every question associated with a passage, prepend the complete passage context to the question's 'text' property (e.g. "[Passage]\n...\n\nQuestion: ...") so that each question is self-contained and has all the context necessary to be answered.
2. "Conversation" category:
   - Detect dialogue/conversation texts, usually containing cloze test blanks (e.g., "(1)", "________", "[1]").
   - For every question associated with a dialogue, prepend the full dialogue context to the question's 'text' property so the student can easily see the flow of dialogue.
3. "Error Identification" (or "Error Detection") category:
   - Detect error identification questions. These are sentences where some words/segments are underlined or marked with choices, like (1), (2), (3), (4) or (A), (B), (C), (D).
   - CRITICAL UNDERLINING RULE: To enable perfect styling and rendering of underlines, you MUST wrap the exact word or phrase that represents each choice in underscores like _word_ right next to its choice label/marker.
   - For example, if the original text is: "The news (1) about the team (2) were (3) very disappointing (4)."
     You MUST format the 'text' property precisely as: "The news (1) _about_ the team (2) _were_ (3) _very_ disappointing (4)."
     And if it is a prefix style like: "They (1) goes (2) to school.", you MUST format it as: "They (1) _goes_ (2) _to school_."
   - DO NOT omit these underscores under any circumstances for the "Error Identification" category. This is a strict formatting mandate to ensure flawless visual rendering.
4. "Vocabulary", "Tenses", "Grammar", or other categories:
   - Detect these patterns (like sentence completion, synonym matches, etc.) and categorize them accurately.
   - CRITICAL: Do NOT default all general grammar/cloze questions to "Tenses". Analyze the core test target: if it tests vocabulary meaning, use "Vocabulary"; if it tests active/passive voice, relative clauses, prepositions, or general grammar structures, use "Grammar"; if it specifically tests verb tenses, use "Tenses". Be highly specific and accurate.
5. Default Category and Exam Set Mapping (IMPORTANT):
   - If a 'Default Category preference' is specified in the prompt, you MUST assign that category to all parsed questions unless they are explicitly Listening questions (which must be 'Listening') or have a different category clearly specified by custom instructions.
   - If a 'Default Exam Set name preference' is specified in the prompt, you MUST assign that examSet to all parsed questions unless custom instructions request splitting into separate sets.
6. Missing Explanations:
   - For every parsed question, write a high-quality, professional, and encouraging Thai explanation ('explanation') explaining why the correct choice is right, why other choices are wrong, and some exam tips. Even if the source text doesn't provide an explanation, you MUST write an outstanding one.
7. Number of Options:
   - Ensure every question has exactly 4 options. If the original question has fewer, invent plausible distractors to make it 4.
8. Listening & Audio Section types:
   - Carefully detect if the question belongs to a Listening / Audio comprehension section.
   - If it is a listening question, set 'isListening' to true, and generate/extract the spoken transcript of the audio/dialogue into the 'listeningTranscript' property.
   - Set the 'category' of listening questions to 'Listening'.
   - Format dialogue speaker labels with clean, standard uppercase names, abbreviations, or roles followed by a colon (e.g., 'Woman:', 'Man:', 'W:', 'M:', 'Teacher:', 'Doctor:') to separate conversational turns. Do not combine labels or embed blank placeholder lines within a speaker turn. Keep each line corresponding to exactly one speaker.
9. Multi-set splitting / Exam Set assignment:
   - Assign each question to an appropriate 'examSet' (e.g. 'Mock Test 1', 'Listening Practice 1', 'Vocabulary Quiz A', etc.).
   - If the user provides specific custom instructions requesting to split the text into multiple separate test sets or name them in a specific way, you MUST follow those instructions and group the parsed questions into separate examSet names accordingly.
10. Output format:
   - You MUST output a JSON object containing a 'questions' array. Each item in the array must strictly match the response schema. No extra text or markdown formatting around the JSON outside of the schema. Ensure correctIndex is a 0-based integer representing the correct option (0 for the first option, 1 for the second, etc.).`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            description: "Array of parsed and categorized exam questions",
            items: {
              type: Type.OBJECT,
              properties: {
                text: {
                  type: Type.STRING,
                  description: "The complete question text. If part of a Reading passage, prepend the passage text. If part of a Conversation dialogue, prepend the dialogue text with blanks. If Error Identification, provide the sentence with clearly labeled segments (e.g. (A), (B), (C), (D))."
                },
                options: {
                  type: Type.ARRAY,
                  description: "Exactly 4 multiple-choice options",
                  items: {
                    type: Type.STRING
                  }
                },
                correctIndex: {
                  type: Type.INTEGER,
                  description: "0-based index of the correct option (0 for A, 1 for B, 2 for C, 3 for D)"
                },
                explanation: {
                  type: Type.STRING,
                  description: "A highly clear, pedagogical explanation in Thai explaining why the correct answer is right, analyzing other options, and offering tips."
                },
                category: {
                  type: Type.STRING,
                  description: "The categorized genre of this question. Choose from: 'Reading', 'Conversation', 'Error Identification', 'Tenses', 'Vocabulary', 'Grammar', 'Listening', or others."
                },
                examSet: {
                  type: Type.STRING,
                  description: "The name of the exam set this question belongs to (e.g. 'Mock Test 1', 'A-Level 2026', 'TGAT Set A'). Use this to split/separate questions if specified by the user's custom instructions."
                },
                isListening: {
                  type: Type.BOOLEAN,
                  description: "Set to true if this is a listening comprehension question requiring an audio voiceover. Set to false otherwise."
                },
                listeningTranscript: {
                  type: Type.STRING,
                  description: "The transcript or dialogue text to be spoken by the TTS engine for listening questions. Leave empty for non-listening questions."
                }
              },
              required: ["text", "options", "correctIndex", "explanation", "category"]
            }
          }
        },
        required: ["questions"]
      };

      let contentsPrompt = `Please parse and analyze the following exam text:\n\n${text}`;
      if (defaultCategory) {
        contentsPrompt += `\n\n[System Hint] Default Category preference: "${defaultCategory}"`;
      }
      if (defaultExamSet) {
        contentsPrompt += `\n\n[System Hint] Default Exam Set name preference: "${defaultExamSet}"`;
      }
      if (customInstructions && customInstructions.trim()) {
        contentsPrompt += `\n\nAdditional Custom Instructions from User:\n${customInstructions}`;
      }

      const responseText = await callGeminiWithRetryAndFallback({
        contents: contentsPrompt,
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema,
        temperature: 0.1,
      });

      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const parsedResult = JSON.parse(cleanJson);
      res.json(parsedResult);
    } catch (error: any) {
      console.error("Gemini AI Analysis Error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze exam text using Gemini AI" });
    }
  });

  // API Route to automatically add underscores to all Error Identification questions in DB
  app.post("/api/fix-all-underlines", async (req, res) => {
    try {
      if (!fs.existsSync(DB_PATH)) {
        return res.status(400).json({ error: "ไม่พบฐานข้อมูลข้อสอบในระบบ" });
      }

      const raw = fs.readFileSync(DB_PATH, "utf8");
      const db = JSON.parse(raw);
      const questions = db.questions || [];

      // Find all Error Identification questions that don't have underscores yet
      const errorQuestions = questions.filter((q: any) => {
        const isErrorId = q.category?.toLowerCase().includes("error") || 
                          /\([a-dA-D1-4]\)/.test(q.text) ||
                          /\[[a-dA-D1-4]\]/.test(q.text) ||
                          q.text.includes("(1)") || q.text.includes("(2)") || q.text.includes("(3)") || q.text.includes("(4)");
        return isErrorId && !q.text.includes("_");
      });

      if (errorQuestions.length === 0) {
        return res.json({ success: true, message: "ข้อสอบ Error Identification ทั้งหมดได้รับการขีดเส้นใต้แบบสมบูรณ์อยู่แล้ว", updatedCount: 0 });
      }

      // We process them using Gemini
      const prompt = `You are an expert AI English Exam Editor.
We have some English "Error Identification" questions in our database that are missing underscores around the choices, which prevents our system from rendering beautiful underlines.
Your task is to take this list of questions and return a JSON object mapping each question's 'id' to its newly formatted 'text' containing precise underscores \`_word_...\` around the words or phrases belonging to each choice option.

For example, if a question text is:
"The news (1) about the team (2) were (3) very disappointing (4)."
You should return its text as:
"The news (1) _about_ the team (2) _were_ (3) _very_ disappointing (4)."

Here are the questions to fix:
${errorQuestions.map((q: any) => `ID: ${q.id}\nOriginal Text: ${q.text}\nOptions: ${q.options.join(", ")}`).join("\n\n")}

Please return a JSON object with this structure:
{
  "fixedQuestions": [
    {
      "id": "question_id",
      "text": "The news (1) _about_ the team (2) _were_ (3) _very_ disappointing (4)."
    }
  ]
}

Only wrap the actual choice words/phrases in underscores. Do not wrap entire sentences. Maintain all markers like (1), (2), (A), (B), etc. exactly.`;

      const responseText = await callGeminiWithRetryAndFallback({
        contents: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fixedQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING }
                },
                required: ["id", "text"]
              }
            }
          },
          required: ["fixedQuestions"]
        },
        temperature: 0.1
      });

      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const result = JSON.parse(cleanJson);
      const fixedMap = new Map<string, string>();
      result.fixedQuestions.forEach((item: any) => {
        fixedMap.set(item.id, item.text);
      });

      // Update the database questions
      let updatedCount = 0;
      const updatedQuestions = questions.map((q: any) => {
        if (fixedMap.has(q.id)) {
          updatedCount++;
          return { ...q, text: fixedMap.get(q.id) };
        }
        return q;
      });

      db.questions = updatedQuestions;
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf8");

      res.json({
        success: true,
        message: `ปรับปรุงและขีดเส้นใต้ข้อสอบ Error Identification สำเร็จจำนวน ${updatedCount} ข้อ!`,
        updatedQuestions,
        updatedCount
      });
    } catch (err: any) {
      console.error("Failed to fix error underlines via AI:", err);
      res.status(500).json({ error: err.message || "Failed to auto-fix outlines" });
    }
  });

  // Shared Server-side JSON Database for Multi-device Synchronization
  const DB_PATH = path.join(process.cwd(), "db.json");

  app.get("/api/db", (req, res) => {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, "utf8");
        const data = JSON.parse(raw);
        return res.json(data);
      } else {
        return res.json({ empty: true });
      }
    } catch (err: any) {
      console.error("Failed to read server database:", err);
      res.status(500).json({ error: "Failed to read database on server" });
    }
  });

  app.post("/api/db", (req, res) => {
    try {
      const { questions, users, categories, attempts, courses, passages } = req.body;
      const dataToSave = {
        questions: questions || [],
        users: users || [],
        categories: categories || [],
        attempts: attempts || [],
        courses: courses || [],
        passages: passages || []
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(dataToSave, null, 2), "utf8");
      res.json({ success: true });
    } catch (err: any) {
      console.error("Failed to save server database:", err);
      res.status(500).json({ error: "Failed to save database on server" });
    }
  });

  // Serve static files / Vite middleware
  const isProd = process.env.NODE_ENV === "production" || !fs.existsSync(path.join(process.cwd(), "server.ts"));

  if (!isProd) {
    console.log("Loading Vite dev server middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production static assets from dist/ directory...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Full-stack server booted on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
