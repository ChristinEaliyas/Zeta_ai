import React from "react";
import YouTube from "react-youtube";

const VideoPlayer = ({ videoId }) => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {videoId ? (
        <YouTube
          videoId={videoId}
          opts={{
            width: "100%",
            height: "100%",
            playerVars: { autoplay: 1 },
          }}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      ) : (
        <h3 style={{ color: "#00ff9d" }}>No video selected. Please upload a video link.</h3>
      )}
    </div>
  );
};

export default VideoPlayer;
