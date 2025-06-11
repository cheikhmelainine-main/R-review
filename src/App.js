import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  FontAwesomeIcon
} from "@fortawesome/react-fontawesome";
import {
  faMicrophone,
  faStop,
  faUpload,
  faPlay,
  faTrash
} from "@fortawesome/free-solid-svg-icons";

function App() {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [result, setResult] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);

  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await axios.get("/api/restaurant/1/reviews/");
        setReviews(res.data.reviews);
        setAvgRating(res.data.average_rating);
      } catch (error) {
        console.error("Failed to fetch reviews", error);
      }
    }
    fetchReviews();
  }, []);
  
  // Recording timer
  useEffect(() => {
    let timer = null;
    if (recording) {
      timer = setInterval(() => {
        setSeconds(prev => {
          if (prev + 1 >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [recording]);

  const handleFileChange = e => {
    const f = e.target.files[0];
    setFile(f);
    setAudioUrl(null);
    setResult(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = e => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audio = new Audio(URL.createObjectURL(blob));
        setAudioUrl(audio.src);
        setFile(new File([blob], "voice_review.webm", { type: "audio/webm" }));
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
    } catch (err) {
      alert("Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("/api/analyze/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(res.data);
    } catch (err) {
      alert("Submission failed");
    }
    setLoading(false);
  };

  const clearRecording = () => {
    setFile(null);
    setAudioUrl(null);
    setResult(null);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>
  Welcome to R-Review {avgRating !== null && `(Average rating: ${avgRating.toFixed(1)})`}
</h1>


      
      <div style={styles.section}>
        <label style={styles.label}>
          <FontAwesomeIcon icon={faUpload} /> Upload file (text or audio)
        </label>
        <input
          type="file"
          accept=".txt, audio/*"
          onChange={handleFileChange}
          style={styles.input}
        />
      </div>

      {/* Voice Recorder */}
      <div style={styles.section}>
        <label style={styles.label}>
          <FontAwesomeIcon icon={faMicrophone} /> Record voice (max 30s)
        </label>
        <div style={styles.recorderControls}>
          {!recording ? (
            <button style={styles.recordBtn} onClick={startRecording}>
              <FontAwesomeIcon icon={faMicrophone} /> Start
            </button>
          ) : (
            <button style={styles.stopBtn} onClick={stopRecording}>
              <FontAwesomeIcon icon={faStop} /> Stop
            </button>
          )}
          <span style={styles.timer}>{seconds}s</span>
        </div>
      </div>

      {/* Playback */}
      {audioUrl && (
        <div style={styles.section}>
          <audio controls src={audioUrl} style={styles.audioPlayer} />
          <button style={styles.clearBtn} onClick={clearRecording}>
            <FontAwesomeIcon icon={faTrash} /> Clear
          </button>
        </div>
      )}

      {/* Submit */}
      <div style={styles.section}>
        <button
          style={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!file || loading}
        >
          {loading ? "Analyzing..." : "Submit Review"}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div style={styles.result}>
          <h2>📝 Transcription</h2>
          <pre style={styles.pre}>{result.transcription}</pre>
          <h2>🔍 Analysis</h2>
          <pre style={styles.pre}>{result.analysis}</pre>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: "0 auto",
    padding: 20,
    fontFamily: "sans-serif",
  },
  heading: {
    textAlign: "center",
    marginBottom: 30,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontWeight: "bold",
    marginBottom: 8,
  },
  input: {
    width: "100%",
  },
  recorderControls: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  recordBtn: {
    backgroundColor: "#28a745",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: 5,
    flex: "0 0 auto",
  },
  stopBtn: {
    backgroundColor: "#dc3545",
    color: "#fff",
    border: "none",
    padding: "10px 15px",
    borderRadius: 5,
    flex: "0 0 auto",
  },
  timer: {
    fontSize: 18,
    fontWeight: "bold",
  },
  audioPlayer: {
    width: "100%",
    marginTop: 10,
  },
  clearBtn: {
    marginTop: 10,
    background: "transparent",
    color: "#888",
    border: "none",
    cursor: "pointer",
  },
  submitBtn: {
    width: "100%",
    padding: 15,
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: 5,
  },
  result: {
    marginTop: 30,
    backgroundColor: "#f1f3f5",
    padding: 20,
    borderRadius: 8,
  },
  pre: {
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
  },
};

export default App;
