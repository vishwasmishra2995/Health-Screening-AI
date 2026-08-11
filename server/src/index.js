import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import Groq from "groq-sdk";

const app = express();
const httpServer = http.createServer(app);

const PORT = Number(process.env.PORT || 5000);
const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: "1mb" }));

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 8 * 1024 * 1024,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const sessions = new Map();

const conversationSystem = `
You are a voice-based health screening assistant.

Your job is to conduct a BASIC INTAKE SCREENING, not to diagnose, prescribe, or provide definitive medical conclusions.

Rules:

- Speak naturally and briefly.
- Ask ONE question at a time.
- Collect these fields when possible:
  name, main concern/symptom, duration, severity, related symptoms.
- Remember answers already present in the conversation.
- Do not ask the same question again.
- If an answer is vague, ask a sensible short follow-up question.
- If enough information has been collected, ask if there is anything else important and then close politely.
- Do not invent facts.
- Do not claim to be a doctor.
- Do not give a diagnosis.
- If the user asks for diagnosis or treatment, explain briefly that this screening assistant cannot diagnose and continue the intake.
- Keep every response under 160 characters when possible.
- ALWAYS respond in English.
- The user is expected to speak English.
- Never switch to Hindi, Urdu, Arabic, or another language unless the user explicitly asks for it.
- If the user's speech is unclear, ask them to repeat it in English.
`;

const greeting =
  "Hello. I’m your health screening assistant. I’ll ask a few basic questions. What is your name?";

function getSession(socketId) {
  return sessions.get(socketId);
}

function cleanAssistantText(text) {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= 180) {
    return cleaned;
  }

  const shortened = cleaned.slice(0, 177);
  const lastSpace = shortened.lastIndexOf(" ");

  return `${shortened.slice(
    0,
    Math.max(120, lastSpace)
  )}...`;
}

// ==========================================
// SPEECH TO TEXT - ENGLISH ONLY
// ==========================================

async function transcribeAudio(buffer) {
  const file = new File([buffer], "user-turn.webm", {
    type: "audio/webm",
  });

  const result = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    language: "en",
    response_format: "json",
    temperature: 0,
  });

  return String(result.text || "").trim();
}

// ==========================================
// LLM RESPONSE
// ==========================================

async function generateAssistantReply(messages) {
  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0.2,
    max_tokens: 180,

    messages: [
      {
        role: "system",
        content: conversationSystem,
      },
      ...messages,
    ],
  });

  return cleanAssistantText(
    completion.choices?.[0]?.message?.content
  );
}

// ==========================================
// BROWSER TTS
// ==========================================
// Groq Orpheus TTS has been removed.
// The frontend will use browser speechSynthesis.

async function sendAssistant(socket, text) {
  const safeText = cleanAssistantText(text);

  socket.emit("assistant_text", {
    text: safeText,
  });
}

// ==========================================
// REPORT SCHEMA
// ==========================================

const reportSchema = {
  type: "object",
  additionalProperties: false,

  properties: {
    name: {
      type: ["string", "null"],
    },

    mainConcern: {
      type: ["string", "null"],
    },

    symptoms: {
      type: "array",
      items: {
        type: "string",
      },
    },

    duration: {
      type: ["string", "null"],
    },

    severity: {
      type: ["string", "null"],
    },

    followUp: {
      type: "array",
      items: {
        type: "string",
      },
    },

    informationCollected: {
      type: "string",
    },

    disclaimer: {
      type: "string",
    },
  },

  required: [
    "name",
    "mainConcern",
    "symptoms",
    "duration",
    "severity",
    "followUp",
    "informationCollected",
    "disclaimer",
  ],
};

// ==========================================
// GENERATE REPORT
// ==========================================

async function generateReport(messages) {
  const transcript = messages
    .map(
      (m) =>
        `${m.role.toUpperCase()}: ${m.content}`
    )
    .join("\n");

  const completion = await groq.chat.completions.create({
    model: "openai/gpt-oss-20b",
    temperature: 0,

    messages: [
      {
        role: "system",
        content: `
You create a concise structured summary of a basic health screening conversation.

Do not diagnose.
Do not invent symptoms or facts.
Only extract information actually stated by the user.

If a field was not collected:
- use null for single-value fields
- use an empty array for list fields

"followUp" should contain neutral, non-diagnostic notes about information that may warrant discussion with a qualified healthcare professional, based only on what was said.

"informationCollected" should explain if the call was complete or incomplete.

"disclaimer" must say this is not a diagnosis.

Always write the report in English.
`,
      },

      {
        role: "user",
        content:
          transcript || "No conversation was collected.",
      },
    ],

    response_format: {
      type: "json_schema",

      json_schema: {
        name: "health_screening_report",
        strict: true,
        schema: reportSchema,
      },
    },
  });

  return JSON.parse(
    completion.choices[0].message.content
  );
}

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "health-screening-ai-server",
  });
});

// ==========================================
// SOCKET CONNECTION
// ==========================================

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  sessions.set(socket.id, {
    active: false,
    messages: [],
    busy: false,
  });

  // ========================================
  // START CALL
  // ========================================

  socket.on("start_call", async () => {
    const session = getSession(socket.id);

    if (!session) {
      return;
    }

    session.active = true;
    session.messages = [];
    session.busy = false;

    session.messages.push({
      role: "assistant",
      content: greeting,
    });

    socket.emit("call_started");

    try {
      await sendAssistant(socket, greeting);
    } catch (error) {
      console.error(
        "Greeting error:",
        error?.message || error
      );

      socket.emit("server_error", {
        message:
          "Could not start the voice assistant.",
      });
    }
  });

  // ========================================
  // AUDIO TURN
  // ========================================

  socket.on("audio_turn", async (payload) => {
    const session = getSession(socket.id);

    if (!session?.active) {
      socket.emit("server_error", {
        message: "Start a call first.",
      });

      return;
    }

    if (session.busy) {
      socket.emit("server_error", {
        message:
          "The previous turn is still processing.",
      });

      return;
    }

    try {
      session.busy = true;

      socket.emit("processing", {
        stage: "transcribing",
      });

      const buffer = Buffer.isBuffer(payload)
        ? payload
        : Buffer.from(payload);

      if (!buffer.length) {
        throw new Error("Empty audio turn.");
      }

      // ======================================
      // TRANSCRIBE
      // ======================================

      const userText =
        await transcribeAudio(buffer);

      if (!userText) {
        socket.emit("empty_transcript");
        return;
      }

      session.messages.push({
        role: "user",
        content: userText,
      });

      socket.emit("user_transcript", {
        text: userText,
      });

      // ======================================
      // THINK
      // ======================================

      socket.emit("processing", {
        stage: "thinking",
      });

      let reply;

      try {
        reply =
          await generateAssistantReply(
            session.messages
          );
      } catch (error) {
        console.error(
          "LLM error:",
          error?.message || error
        );

        reply =
          "I’m sorry, I had trouble processing that. Could you please repeat your answer?";
      }

      if (!reply) {
        reply =
          "Could you please repeat that? I want to make sure I recorded your answer correctly.";
      }

      session.messages.push({
        role: "assistant",
        content: reply,
      });

      // ======================================
      // SPEAK
      // ======================================

      socket.emit("processing", {
        stage: "speaking",
      });

      await sendAssistant(socket, reply);

      socket.emit("turn_complete");
    } catch (error) {
      console.error(
        "Audio turn error:",
        error?.message || error
      );

      socket.emit("server_error", {
        message:
          "I couldn't process that turn. Please try speaking again.",
      });
    } finally {
      session.busy = false;
    }
  });

  // ========================================
  // END CALL
  // ========================================

  socket.on("end_call", async () => {
    const session = getSession(socket.id);

    if (!session) {
      return;
    }

    session.active = false;

    socket.emit("processing", {
      stage: "report",
    });

    try {
      const report =
        await generateReport(
          session.messages
        );

      socket.emit("report_ready", {
        report,
      });
    } catch (error) {
      console.error(
        "Report error:",
        error?.message || error
      );

      socket.emit("report_ready", {
        report: {
          name: null,
          mainConcern: null,
          symptoms: [],
          duration: null,
          severity: null,
          followUp: [],

          informationCollected:
            "The call ended before a complete structured report could be generated.",

          disclaimer:
            "This is a screening summary, not a medical diagnosis.",
        },
      });
    }

    socket.emit("call_ended");
  });

  // ========================================
  // DISCONNECT
  // ========================================

  socket.on("disconnect", () => {
    sessions.delete(socket.id);

    console.log(
      "Socket disconnected:",
      socket.id
    );
  });
});

// ==========================================
// START SERVER
// ==========================================

httpServer.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});