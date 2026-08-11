# 🩺 Health Screening AI

> 🎙️ AI-powered voice-based health screening and conversational intake web application.

Health Screening AI is a full-stack web application that conducts a **basic conversational health screening** using voice input.

The application captures the user's responses through speech, converts speech into text, processes the conversation using an LLM, generates a natural-language response, converts the response back into speech, and finally produces a structured screening report.

> ⚠️ **Disclaimer:** This application is designed for basic health screening/intake only. It does not provide medical diagnosis, prescriptions, or definitive medical conclusions.

---

## 🚀 Live / Running Links

### 💻 Frontend

**Local Application**

http://localhost:5173

### ⚙️ Backend

**Local API Server**

http://localhost:5000

### ❤️ Backend Health Check

http://localhost:5000/api/health

Expected response:

```json
{
  "ok": true,
  "service": "health-screening-ai-server"
}
