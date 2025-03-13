import os
import uuid
import yt_dlp
import whisper
from transformers import pipeline
import torch
from pydub import AudioSegment
from sentence_transformers import SentenceTransformer 
from sklearn.cluster import KMeans
import numpy as np

def download_audio(youtube_url, output_dir="."):
    """Downloads audio from a YouTube video and saves it with a unique name."""
    # Generate a random filename
    random_filename = f"{uuid.uuid4()}.mp3"
    output_path = os.path.join(output_dir, random_filename)
    
    # Use output template without .mp3 so that yt_dlp appends it once
    outtmpl = os.path.join(output_dir, random_filename.replace('.mp3', ''))
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': outtmpl,  
        'extractor_args': {'youtube': {'player-client': ['android']}}  # Bypass throttling
    }

    print(f"Downloading audio to {output_path} ...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])
        
    return output_path

def transcribe_audio(audio_path):
    """Transcribes the audio using Whisper."""
    model = whisper.load_model("base")
    result = model.transcribe(audio_path)
    transcription = result["text"]

    print("\n--- Transcription ---\n")
    print(transcription)
    print("\n----------------------\n")

    return transcription

def segment_text(transcript):
    """Segments the transcript into topics using SentenceTransformer and clustering."""
    model = SentenceTransformer('all-MiniLM-L6-v2')
    sentences = transcript.split(". ")
    embeddings = model.encode(sentences)
    
    n_clusters = max(3, len(sentences) // 10)
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = kmeans.fit_predict(embeddings)
    
    chapters = {}
    for i, label in enumerate(labels):
        if label not in chapters:
            chapters[label] = []
        chapters[label].append(sentences[i])
    
    return [" ".join(chapters[label]) for label in sorted(chapters.keys())]
    
def summarize_text(chapters, chunk_size=512):
    """Summarizes each chapter in small chunks to avoid CUDA memory errors."""
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn", device=0)  # Use GPU if available

    summaries = []
    
    for chapter in chapters:
        # Split chapter into smaller chunks of size `chunk_size`
        chunks = [chapter[i:i+chunk_size] for i in range(0, len(chapter), chunk_size)]
        chapter_summary = []

        for chunk in chunks:
            try:
                summary = summarizer(chunk, max_length=100, min_length=30, do_sample=False)[0]['summary_text']
                chapter_summary.append(summary)
            except RuntimeError as e:
                print(f"Error processing chunk: {e}")
                continue  # Skip problematic chunks
        
        # Combine summaries of all chunks for the chapter
        summaries.append(" ".join(chapter_summary))  
    
    return summaries


def main():
    while True:
        yt_url = input("Enter YouTube URL (or type 'exit' to quit): ").strip()
        if yt_url.lower() == 'exit':
            break
        
        # Download audio with a unique filename
        audio_file = download_audio(yt_url)
        
        # Transcribe the downloaded audio file
        transcript = transcribe_audio(audio_file)
        
        # Segment the transcription into chapters
        chapters = segment_text(transcript)
        
        # Summarize each chapter
        summaries = summarize_text(chapters)
        
        # Display the summaries
        for i, summary in enumerate(summaries):
            print(f"\nChapter {i+1} Summary:\n{summary}\n")
        
        print("Processing complete for this video.\n")

if __name__ == "__main__":
    main()
