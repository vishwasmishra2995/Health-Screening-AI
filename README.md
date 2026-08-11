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
✨ Features
🎙️ Voice-Based Conversation

The application allows users to interact with the health screening assistant using their voice.

🗣️ Speech-to-Text

User speech is converted into text using:

Groq Whisper
whisper-large-v3-turbo
🤖 AI Conversation

The AI conducts a structured intake conversation and asks relevant questions one at a time.

The assistant attempts to collect:

👤 Name
🩺 Main concern / symptom
⏱️ Duration
📊 Severity
🔎 Related symptoms
📝 Additional follow-up information
🔊 Text-to-Speech

AI responses are converted into speech so the conversation can continue naturally.

📋 Screening Report

After the conversation ends, the application generates a structured screening report containing:

Name
Main concern
Symptoms
Duration
Severity
Follow-up notes
Information collected
Medical disclaimer
⚡ Real-Time Communication

Frontend and backend communicate using:

Socket.IO
Real-time events
Streaming-style conversational flow
🔐 Environment Variable Support

API credentials are stored using environment variables and are excluded from Git using .gitignore.

🏗️ Project Architecture
Health-Screening-AI/
│
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   │
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
│
├── server/
│   ├── src/
│   │   └── index.js
│   │
│   ├── package.json
│   ├── .env.example
│   └── package-lock.json
│
├── .gitignore
├── README.md
└── RUN.txt
🔄 How It Works
              ┌─────────────────────┐
              │      User           │
              │   Voice Response    │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │     Frontend        │
              │   React + Vite      │
              └──────────┬──────────┘
                         │
                    Socket.IO
                         │
                         ▼
              ┌─────────────────────┐
              │      Backend        │
              │ Node.js + Express   │
              └──────────┬──────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
      ┌─────────────────┐   ┌─────────────────┐
      │ Speech-to-Text  │   │       LLM       │
      │ Groq Whisper    │   │  Groq AI Model  │
      └────────┬────────┘   └────────┬────────┘
               │                     │
               └──────────┬──────────┘
                          ▼
                 ┌─────────────────┐
                 │ Text-to-Speech  │
                 │    Groq TTS     │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Voice Response  │
                 │   to the User   │
                 └─────────────────┘
🧠 AI Conversation Flow

The assistant follows a structured conversational flow.

Step 1 — Greeting

The assistant starts the session by asking for the user's name.

Step 2 — Main Concern

The assistant asks what health concern or symptom the user is experiencing.

Step 3 — Duration

The assistant asks how long the concern has been present.

Step 4 — Severity

The assistant asks about the severity of the reported concern.

Step 5 — Related Symptoms

The assistant collects additional symptoms when relevant.

Step 6 — Follow-Up

If necessary, the assistant asks short follow-up questions.

Step 7 — Report Generation

Once the conversation ends, the collected information is converted into a structured screening report.

🛠️ Tech Stack
Frontend
React.js
Vite
JavaScript
CSS
Socket.IO Client
Backend
Node.js
Express.js
Socket.IO
CORS
dotenv
AI / Voice
Groq API
Whisper
LLM-based conversational processing
Text-to-Speech
Development
Git
GitHub
npm
VS Code
📦 Installation
1. Clone the Repository
git clone https://github.com/vishwasmishra2995/Health-Screening-AI.git

Move into the project:

cd Health-Screening-AI
⚙️ Backend Setup

Open a terminal and run:

cd server

Install dependencies:

npm install
🔑 Environment Variables

Inside the server folder create:

.env

Add:

GROQ_API_KEY=your_groq_api_key_here
CLIENT_ORIGIN=http://localhost:5173
PORT=5000
Important

Never commit your .env file to GitHub.

The API key should remain private.

▶️ Start Backend

From the server directory:

npm run dev

The backend should start on:

http://localhost:5000

You can verify it using:

http://localhost:5000/api/health
💻 Frontend Setup

Open another terminal.

From the project root:

cd client

Install dependencies:

npm install

Start the frontend:

npm run dev

Vite will provide a local URL similar to:

http://localhost:5173

Open it in your browser.

🔐 Environment Security

This project uses environment variables for sensitive credentials.

Example:

GROQ_API_KEY=your_secret_key

The actual .env file should never be uploaded to GitHub.

Make sure .gitignore contains:

.env
.env.*
!.env.example

node_modules/
dist/

A safe example file can be committed:

server/.env.example

Example:

GROQ_API_KEY=
CLIENT_ORIGIN=http://localhost:5173
PORT=5000
🔌 Socket.IO Events

The application uses Socket.IO for real-time communication.

Client → Server
start_call

Starts a new screening session.

audio_turn

Sends an audio response from the user.

end_call

Ends the screening session and generates the report.

Server → Client
call_started

Indicates that the screening session has started.

assistant_text

Returns the AI-generated text response.

assistant_audio

Returns the generated voice response.

user_transcript

Returns the transcription of the user's speech.

processing

Indicates the current processing stage.

Possible stages include:

transcribing
thinking
speaking
report
turn_complete

Indicates that the current conversation turn has completed.

report_ready

Returns the final structured screening report.

📋 Example Screening Report
{
  "name": "John",
  "mainConcern": "Headache",
  "symptoms": [
    "Mild headache"
  ],
  "duration": "2 days",
  "severity": "Moderate",
  "followUp": [],
  "informationCollected": "Basic screening information was collected.",
  "disclaimer": "This is a screening summary, not a medical diagnosis."
}
🧪 Testing the Application

After starting both servers:

1. Open Frontend
http://localhost:5173
2. Start the Screening

Click the start button.

3. Allow Microphone Access

The browser may request microphone permission.

Select:

Allow
4. Answer the Questions

Speak naturally when prompted.

The application should:

Voice Input
     ↓
Speech-to-Text
     ↓
AI Processing
     ↓
AI Response
     ↓
Text-to-Speech
     ↓
Voice Output
5. End the Session

The application will generate the screening report.

🧩 Project Highlights
Real-Time AI Interaction

Instead of a traditional form-based workflow, the application uses a conversational interface.

Voice-First Experience

Users can provide information naturally through speech.

Structured Data Extraction

The conversation is transformed into structured screening information.

Session Management

Each Socket.IO connection maintains its own conversation session.

Error Handling

The application handles:

Empty audio
Transcription failures
LLM failures
TTS failures
Server errors
Incomplete screening sessions
⚠️ Limitations

This project is intended as a technical demonstration / screening application.

It should not be used as a replacement for a qualified healthcare professional.

The application:

Does not diagnose medical conditions.
Does not prescribe medication.
Does not provide definitive medical conclusions.
May produce incorrect or incomplete AI-generated responses.
Depends on external AI services for speech and language processing.
🔮 Future Improvements

Potential improvements include:

🌐 Multi-language support
🎙️ Better voice activity detection
⚡ Streaming speech-to-text
🔊 Lower-latency TTS
👨‍⚕️ Doctor review workflow
🔐 User authentication
💾 Persistent database storage
📊 Screening analytics dashboard
📄 PDF report generation
🧠 Improved conversation memory
🛡️ Enhanced safety and escalation logic
☁️ Production deployment
📱 Mobile responsive improvements
👨‍💻 Developer

Vishwas Mishra

B.Tech — Information Technology

GitHub:

https://github.com/vishwasmishra2995

📄 License

This project is created for educational, technical assessment, and demonstration purposes.

⭐ If you found this project useful

Consider giving the repository a ⭐ on GitHub.

🚀 Quick Start

For experienced developers:

# Clone
git clone https://github.com/vishwasmishra2995/Health-Screening-AI.git

# Backend
cd Health-Screening-AI/server
npm install

# Configure environment variables
# Create server/.env

# Start backend
npm run dev

Open another terminal:

# Frontend
cd Health-Screening-AI/client
npm install
npm run dev

Then open:

http://localhost:5173
🩺 Health Screening AI

Voice → Transcription → AI Conversation → Voice → Structured Screening Report

Built with React, Node.js, Socket.IO, Groq AI and modern web technologies.
