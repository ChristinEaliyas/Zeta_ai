import { useState } from "react";
import { useEffect } from "react";

import Chat from "../components/Chat";
import Flashcards from "../components/Flashcards";
import Summary from "../components/Summary";
import VideoPlayer from "../components/VideoPlayer";
import ChapterTranscript from "../components/ChapterTranscript";

function Home() {
  const [activeTab, setActiveTab] = useState("chat");
  const [videoId, setVideoId] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [transcript, setTranscript] = useState(); // Store the transcript
  const [summary, setSummary] = useState(""); // Store the summary
  const [chapters, setChapters] = useState([]); // Store the chapters
  const [flashcards, setFlashcards] = useState([]);
  
  useEffect(() => {
    if (transcript) {
      fetchChapters();
    }
  }, [transcript]);
  
  useEffect(() => {
    if (chapters.length > 0) {
      generateFlashcards(chapters);
    }
  }, [chapters]);
  

  const handleVideoSubmit = async () => {
    const regex =
      /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|(?:v=|\S*?[?&]v=))|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = videoUrl.match(regex);
    if (match) {
      setVideoId(match[1]);

      try {
        const response = await fetch("http://127.0.0.1:5000/submit-video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ videoUrl }),
        });

        const result = await response.json();
        if (response.ok) {
          console.log(`Server Response: ${result.message}`);
          setTranscript(result.transcription);
          setSummary(result.summary);
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (error) {
        console.error("Error sending video URL:", error);
      }
    } else {
      alert("Please enter a valid YouTube URL.");
    }
  };

  // Fetch chapters after transcription
  const fetchChapters = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/submit-transcription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcription: transcript }), // Send the transcription data
      });

      const result = await response.json();
      if (response.ok) {
        setChapters(result.chapters); // Store the chapters array
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
    }
  };
  const generateFlashcards = async (chapters) => {
    try {
      const response = await fetch("http://127.0.0.1:5000/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapters }),
      });
  
      const result = await response.json();
      if (response.ok) {
        setFlashcards(result.flashcards);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error generating flashcards:", error);
    }
  };

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>  
        <div style={styles.logo}>Zeta Ai</div>
      </header>

      <div style={styles.uploadSection}>
        <input
          type="text"
          placeholder="Enter YouTube Video URL"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          style={styles.videoInput}
        />
        <button onClick={handleVideoSubmit} style={styles.submitButton}>
          Load Video
        </button>
      </div>

      {/* Main Content Layout */}
      <div style={styles.mainContent}>
        {/* Left Side: Video & Chapter/Transcript */}
        <div style={styles.leftContainer}>
          <div style={styles.videoSection}>
            {videoId ? <VideoPlayer videoId={videoId} /> : <p>No video loaded.</p>}
          </div>
          <div style={styles.chapterTranscriptSection}>
            <ChapterTranscript
              transcript={transcript}
              chapters={chapters} // Pass chapters to ChapterTranscript
            />
          </div>
        </div>

        {/* Right Side: Chat, Flashcards, Summary */}
        <div style={styles.rightContainer}>
          <div style={styles.tabs}>
            {["chat", "flashcards", "summary"].map((tab) => (
              <button
                key={tab}
                style={{
                  ...styles.tab,
                  ...(activeTab === tab ? styles.activeTab : {}),
                }}
                onMouseEnter={(e) => (e.target.style.color = "#fff")}
                onMouseLeave={(e) =>
                  (e.target.style.color = activeTab === tab ? "#fff" : "#a0a0a0")
                }
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div style={styles.content}>
            {activeTab === "chat" && <Chat />}
            {activeTab === "flashcards" && <Flashcards flashcards={flashcards} />}
            {activeTab === "summary" && <Summary summary={summary} />}
          </div>
        </div>
      </div>
    </div>
  );
}


const styles = {
  // Same styles as provided
  appContainer: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#0f0f0f",
    color: "#e0e0e0",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "1rem",
    backgroundColor: "transparent",
    borderBottom: "1px solid #333",
    boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
  },
  logo: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#00ff9d",
  },
  uploadSection: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "1rem",
  },
  videoInput: {
    width: "60%",
    padding: "0.5rem",
    borderRadius: "4px",
    border: "1px solid #333",
    backgroundColor: "#222",
    color: "#fff",
    fontSize: "1rem",
    marginRight: "0.5rem",
  },
  submitButton: {
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    border: "none",
    backgroundColor: "#00ff9d",
    color: "#0f0f0f",
    cursor: "pointer",
    fontWeight: "bold",
  },
  mainContent: {
    display: "flex",
    flex: 1,
    flexDirection: "row",
    gap: "1rem",
    padding: "1rem",
  },
  leftContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "transparent",
    borderRadius: "8px",
    overflow: "hidden",
  },
  rightContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    backgroundColor: "transparent",
    borderRadius: "8px",
    overflow: "hidden",
  },
  videoSection: {
    height: "40vh",
    backgroundColor: "transparent",
    padding: "1rem",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "1rem",
  },
  chapterTranscriptSection: {
    padding: "1rem",
    backgroundColor: "transparent",
    borderTop: "1px solid #333",
    flex: 1,
    overflowY: "auto",
  },
  tabs: {
    display: "flex",
    justifyContent: "space-around",
    padding: "0.5rem",
    backgroundColor: "transparent",
    borderRadius: "8px",
  },
  tab: {
    flex: 1,
    textAlign: "center",
    padding: "0.75rem",
    cursor: "pointer",
    backgroundColor: "transparent",
    border: "none",
    color: "#a0a0a0",
    fontSize: "1rem",
    transition: "color 0.3s ease, background-color 0.3s ease",
  },
  activeTab: {
    color: "#fff",
    borderBottom: "3px solid #00ff9d",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: "1rem",
    backgroundColor: "transparent",
    borderRadius: "8px",
    overflowY: "auto",
  },
};

export default Home;
