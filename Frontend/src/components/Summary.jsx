function Summary({ summary }) {
  return (
    <div style={styles.summaryContainer}>
      <h2>Summary</h2>
      {summary ? (
        <div
          dangerouslySetInnerHTML={{ __html: summary }}
          style={styles.summaryText}
        />
      ) : (
        <p>Summary will be displayed here once generated.</p>
      )}
    </div>
  );
}

const styles = {
  summaryContainer: {
    padding: "1rem",
    backgroundColor: "#222",
    borderRadius: "8px",
    color: "#fff",
  },
  summaryText: {
    whiteSpace: "pre-line", // Ensures that newlines in the text are respected
  },
};

export default Summary;
