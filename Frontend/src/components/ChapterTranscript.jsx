import { useState } from "react";

function ChapterTranscript({ transcript, chapters }) {
  const [activeTab, setActiveTab] = useState("chapter"); // Default to Chapter

  return (
    <div style={styles.container}>
      {/* Tab Header */}
      <div style={styles.tabs}>
        {["chapter", "transcript"].map((tab) => (
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

      {/* Content Section */}
      <div style={styles.content}>
        {activeTab === "chapter" && (
          <div>
            {chapters && chapters.length > 0 ? (
              chapters.map((chapter, index) => (
                <div key={index}>
                  <h3 style={styles.title}>Chapter {index + 1}</h3>
                  <p>{chapter}</p>
                </div>
              ))
            ) : (
              <p>No chapters available.</p>
            )}
          </div>
        )}
        {activeTab === "transcript" && (
          <div style={styles.transcriptContainer}>
            {transcript && transcript.length > 0 ? (
              <ul style={styles.transcriptList}>
                {transcript.map((entry, index) => (
                  <li key={index} style={styles.transcriptEntry}>
                    <strong>{entry.timestamp}:</strong> {entry.text}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No transcript available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


const styles = {
  container: {
    backgroundColor: "transparent",
    flex: 1,
    overflowY: "auto",
  },
  tabs: {
    display: "flex",
    justifyContent: "space-around",
    padding: "0.5rem",
  },
  tab: {
    flex: 1,
    textAlign: "center",
    padding: "0.75rem",
    cursor: "pointer",
    backgroundColor: "transparent",
    border: "none",
    color: "#a0a0a0",
    borderBottom: "transparent",
    fontSize: "1rem",
  },
  activeTab: {
    color: "#fff",
    borderBottom: "3px solid #00ff9d",
    fontWeight: "bold",
  },
  content: {
    padding: "1rem",
    backgroundColor: "transparent",
    overflowY: "auto", // Ensures scrollability if content exceeds the available space
    color: "#e0e0e0",
  },
  title: {
    marginBottom: "0.5rem",
    color: "#00ff9d",
  },
  transcriptContainer: {
    maxHeight: "300px", // Set a fixed height for the transcript area
    overflowY: "auto", // Enable scrolling for long transcripts
    padding: "0.5rem",
    borderRadius: "4px",
    border: "1px solid #00ff9d",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  transcriptList: {
    listStyleType: "none",
    padding: 0,
    margin: 0,
  },
  transcriptEntry: {
    marginBottom: "0.75rem",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    color: "#e0e0e0",
  },
};

export default ChapterTranscript;
