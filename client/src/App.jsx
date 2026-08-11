import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

function App() {
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);

  const [status, setStatus] = useState("idle");
  const [processingStage, setProcessingStage] = useState("");
  const [messages, setMessages] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("connected");
    });

    socket.on("call_started", () => {
      setStatus("active");
      setReport(null);
      setError("");
    });

    socket.on("assistant_text", ({ text }) => {
      setMessages((prev) => [...prev, { role: "assistant", text }]);
    });

    socket.on("user_transcript", ({ text }) => {
      setMessages((prev) => [...prev, { role: "user", text }]);
    });

    // Browser-side TTS: avoids the Groq Orpheus model terms requirement.
    socket.on("assistant_text", ({ text }) => {
      setMessages((prev) => {
        // Prevent duplicate assistant messages if another listener/event sends the same text.
        if (
          prev.length > 0 &&
          prev[prev.length - 1].role === "assistant" &&
          prev[prev.length - 1].text === text
        ) {
          return prev;
        }
        return [...prev, { role: "assistant", text }];
      });

      if ("speechSynthesis" in window && text) {
        window.speechSynthesis.cancel();

        const speak = () => {
          const utterance = new SpeechSynthesisUtterance(text);
          const voices = window.speechSynthesis.getVoices();

          const voice =
            voices.find((v) => v.lang.toLowerCase() === "en-in") ||
            voices.find((v) => v.lang.toLowerCase().startsWith("en-in")) ||
            voices.find((v) => v.lang.toLowerCase().startsWith("en"));

          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          } else {
            utterance.lang = "en-IN";
          }

          utterance.rate = 0.95;
          utterance.pitch = 1;
          utterance.volume = 1;

          utterance.onerror = (event) => {
            console.error("Browser TTS error:", event);
            setError("Text response is available, but voice playback failed.");
          };

          window.speechSynthesis.speak(utterance);
        };

        // Chrome can populate the voice list asynchronously.
        if (window.speechSynthesis.getVoices().length > 0) {
          speak();
        } else {
          window.speechSynthesis.addEventListener("voiceschanged", speak, {
            once: true,
          });
        }
      }
    });

    socket.on("processing", ({ stage }) => {
      setProcessingStage(stage);
    });

    socket.on("turn_complete", () => {
      setProcessingStage("");
    });

    socket.on("empty_transcript", () => {
      setProcessingStage("");
      setError("I didn't catch that. Please try again.");
    });

    socket.on("server_error", ({ message }) => {
      setProcessingStage("");
      setError(message);
    });

    socket.on("report_ready", ({ report }) => {
      setReport(report);
    });

    socket.on("call_ended", () => {
      setStatus("connected");
      setProcessingStage("");
      setIsRecording(false);
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startCall = () => {
    setMessages([]);
    setReport(null);
    setError("");
    socketRef.current?.emit("start_call");
  };

  const startRecording = async () => {
    if (status !== "active" || processingStage) return;

    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size === 0) {
          setError("No audio was captured.");
          setIsRecording(false);
          return;
        }

        setProcessingStage("transcribing");
        const buffer = await blob.arrayBuffer();
        socketRef.current?.emit("audio_turn", buffer);
        setIsRecording(false);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setError(
        "Microphone access failed. Allow microphone permission and try again."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const endCall = () => {
    if (isRecording) {
      stopRecording();
    }

    setProcessingStage("report");
    socketRef.current?.emit("end_call");
  };

  const canRecord =
    status === "active" && !processingStage && !report && !isRecording;

  return (
    <main className="page">
      <section className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">VOICE AI • HEALTH INTAKE</p>
            <h1>HealthScreen AI</h1>
            <p className="subtitle">
              A conversational voice screening demo for a technical assessment.
            </p>
          </div>
          <div className={`status status-${status}`}>
            <span />
            {status}
          </div>
        </header>

        <div className="notice">
          <strong>Demo only:</strong> this assistant performs basic intake
          screening and does not provide a medical diagnosis.
        </div>

        <section className="call-card">
          <div className="call-top">
            <div>
              <h2>Voice screening</h2>
              <p>
                Start a call, then use push-to-talk for each answer.
              </p>
            </div>

            <div className="actions">
              <button
                className="primary"
                onClick={startCall}
                disabled={status === "active"}
              >
                Start Call
              </button>

              <button
                className="danger"
                onClick={endCall}
                disabled={status !== "active"}
              >
                End Call
              </button>
            </div>
          </div>

          <div className="record-area">
            <div className={`mic ${isRecording ? "recording" : ""}`}>
              {isRecording ? "●" : "🎙"}
            </div>

            <p className="stage">
              {isRecording
                ? "Listening… click Stop & Send when finished."
                : processingStage
                ? `Processing: ${processingStage}…`
                : status === "active"
                ? "Your turn. Speak your answer."
                : "Start a call to begin."}
            </p>

            <div className="record-actions">
              <button
                className="secondary"
                onClick={startRecording}
                disabled={!canRecord}
              >
                Start Speaking
              </button>

              <button
                className="secondary stop"
                onClick={stopRecording}
                disabled={!isRecording}
              >
                Stop & Send
              </button>
            </div>
          </div>
        </section>

        <div className="grid">
          <section className="panel">
            <div className="panel-title">
              <h2>Conversation</h2>
              <span>{messages.length} messages</span>
            </div>

            <div className="messages">
              {messages.length === 0 ? (
                <div className="empty">Conversation will appear here.</div>
              ) : (
                messages.map((message, index) => (
                  <article
                    key={`${message.role}-${index}`}
                    className={`message ${message.role}`}
                  >
                    <div className="message-role">
                      {message.role === "assistant" ? "AI" : "YOU"}
                    </div>
                    <p>{message.text}</p>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel report-panel">
            <div className="panel-title">
              <h2>Screening report</h2>
              <span>{report ? "Ready" : "After End Call"}</span>
            </div>

            {!report ? (
              <div className="empty">
                End the call to generate a structured report.
              </div>
            ) : (
              <div className="report">
                <ReportRow label="Name" value={report.name} />
                <ReportRow label="Main concern" value={report.mainConcern} />
                <ReportRow label="Duration" value={report.duration} />
                <ReportRow label="Severity" value={report.severity} />

                <div className="report-block">
                  <h3>Symptoms</h3>
                  {report.symptoms?.length ? (
                    <ul>
                      {report.symptoms.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>None recorded.</p>
                  )}
                </div>

                <div className="report-block">
                  <h3>Follow-up notes</h3>
                  {report.followUp?.length ? (
                    <ul>
                      {report.followUp.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>No follow-up note recorded.</p>
                  )}
                </div>

                <div className="report-summary">
                  {report.informationCollected}
                </div>

                <small>{report.disclaimer}</small>
              </div>
            )}
          </section>
        </div>

        {error && <div className="error">{error}</div>}

        <footer>
          Built for the Sasahyog Technologies technical assessment.
        </footer>
      </section>
    </main>
  );
}

function ReportRow({ label, value }) {
  return (
    <div className="report-row">
      <span>{label}</span>
      <strong>{value || "Not collected"}</strong>
    </div>
  );
}

export default App;
