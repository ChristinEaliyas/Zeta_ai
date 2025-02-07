import { useState, useEffect } from "react";

function Flashcards({ flashcards }) {
  const [currentCard, setCurrentCard] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  if (flashcards.length === 0) {
    return <div style={{ textAlign: "center", fontSize: "1.2rem" }}>No flashcards available.</div>;
  }

  return (
    <div
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "60vh",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          perspective: "1000px",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            position: "relative",
            transformStyle: "preserve-3d",
            transition: "transform 0.6s",
            transform: showAnswer ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
          onClick={() => setShowAnswer(!showAnswer)}
        >
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              backfaceVisibility: "hidden",
              backgroundColor: "#222",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            {flashcards[currentCard].Question}
          </div>

          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              backfaceVisibility: "hidden",
              backgroundColor: "#222",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              borderRadius: "8px",
              cursor: "pointer",
              transform: "rotateY(180deg)",
            }}
          >
            {flashcards[currentCard].Answer}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1rem", display: "flex", gap: "10px" }}>
        <button
          onClick={() => {
            setShowAnswer(false);
            setCurrentCard((currentCard - 1 + flashcards.length) % flashcards.length);
          }}
          style={{
            padding: "10px 15px",
            fontSize: "1rem",
            cursor: "pointer",
            backgroundColor: "#00ff9d",
            border: "none",
            borderRadius: "5px",
            color: "#1a1a1a",
          }}
        >
          ←
        </button>

        <button
          onClick={() => {
            setShowAnswer(false);
            setCurrentCard((currentCard + 1) % flashcards.length);
          }}
          style={{
            padding: "10px 15px",
            fontSize: "1rem",
            cursor: "pointer",
            backgroundColor: "#00ff9d",
            border: "none",
            borderRadius: "5px",
            color: "#1a1a1a",
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}

export default Flashcards;
