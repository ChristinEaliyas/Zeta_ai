import { useState } from "react";

function Chat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim()) {
      // Add user message to the chat
      setMessages([...messages, { text: message, sender: "user" }]);
      const userMessage = message;
      setMessage(""); 
      console.log(userMessage)
      try {
        // Send the user query to the backend
        const response = await fetch("http://127.0.0.1:5000/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ "query": userMessage }),
        });

        const result = await response.json();
        if (response.ok) {
          // Add bot response to the chat
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: result.response, sender: "bot" },
          ]);
        } else {
          // Handle errors
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: `Error: ${result.error}`, sender: "bot" },
          ]);
        }
      } catch (error) {
        console.error("Error communicating with the chatbot:", error);
        setMessages((prevMessages) => [
          ...prevMessages,
          { text: "An error occurred. Please try again later.", sender: "bot" },
        ]);
      }
    }
  };

  return (
    <div style={styles.chatContainer}>
      <div style={styles.messages}>
        <div style={styles.message}>Welcome to the chat!</div>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={msg.sender === "user" ? styles.userMessage : styles.message}
          >
            {msg.text}
          </div>
        ))}
      </div>
      <form style={styles.inputContainer} onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Ask anything..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.sendButton}>
          Send
        </button>
      </form>
    </div>
  );
}

const styles = {
  chatContainer: {
    display: "flex",
    backgroundColor: "#0f0f0f",
    flexDirection: "column",
    height: "100%",
  },
  messages: {
    flex: 1,
    backgroundColor: "transparent",
    overflowY: "auto",
    padding: "1rem",
    color: "#fff",
  },
  message: {
    margin: "0.5rem 0",
    padding: "0.5rem 1rem",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "4px",
    color: "#fff",
  },
  userMessage: {
    backgroundColor: "rgba(0, 255, 157, 0.2)",
    color: "#00ff9d",
    marginLeft: "auto",
  },
  inputContainer: {
    display: "flex",
    padding: "1rem",
    borderTop: "1px solid #333",
  },
  input: {
    flex: 1,
    padding: "0.5rem",
    backgroundColor: "transparent",
    border: "1px solid #333",
    borderRadius: "4px",
    color: "#fff",
    marginRight: "0.5rem",
  },
  sendButton: {
    padding: "0.5rem 1rem",
    backgroundColor: "#00ff9d",
    border: "none",
    borderRadius: "4px",
    color: "#0f0f0f",
    cursor: "pointer",
  },
};

export default Chat;
