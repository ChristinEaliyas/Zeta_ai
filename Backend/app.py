from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import yt_dlp
from pydub import AudioSegment
import whisper
import torch
from datetime import timedelta
import json
import requests
from pymilvus import MilvusClient
import ollama 
from tqdm import tqdm
import re
import math
import warnings
warnings.filterwarnings("ignore")


app = Flask(__name__)
CORS(app)

output_directory = "contents"
milvus_client = MilvusClient(uri="./milvus_demo.db")
collection_name = "my_rag_collection"

def remove_think_tags(text):
    return re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)

def emb_text(text):
    """
    Generate embedding for the given text using the Ollama embeddings model.
    """
    response = ollama.embeddings(model="mxbai-embed-large", prompt=text)
    return response["embedding"]

def format_timestamp(seconds):
    return str(timedelta(seconds=int(seconds))).lstrip("0:").replace("0", "", 1) if seconds else "0:00"

def transcribe_audio_with_timestamps(audio_path, model_size="base"):
    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"The file {audio_path} does not exist.")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = whisper.load_model(model_size).to(device)

    result = model.transcribe(audio_path, word_timestamps=True)

    segments = result.get("segments", [])
    transcription = []

    for segment in segments:
        start_time = format_timestamp(segment["start"])
        text = segment["text"].strip()
        transcription.append({"timestamp": start_time, "text": text})

    return transcription

def save_transcription_to_file(transcription, output_file):
    with open(output_file, "w", encoding="utf-8") as file:
        json.dump(transcription, file, indent=4, ensure_ascii=False)
    print(f"Transcription saved to {output_file}")

def generate_summary(text):
    prompt = f"""
    Instruction:
    You are a highly advanced summarizing AI. Your task is to generate a comprehensive and coherent summary of the given content while ensuring the following:
    
    Overview:
    Provide a clear and concise introduction to the main theme or subject of the content.
    Ensure the summary begins with a general overview of the topic without getting into minute details.
    
    Key Points & Headings:
    Organize the summary under well-defined, unordered list headings.
    Each heading should correspond to a major section or idea in the content.
    For each heading, provide a detailed description explaining the key points. The description should be precise, informative, and reflect the essence of that section without being overly detailed.
    
    Flow & Coherence:
    The summary must maintain a logical flow. Each section should seamlessly transition into the next.
    Avoid repeating content or adding unnecessary details.
    
    Length:
    Ensure the summary is between 300 to 600 words, summarizing all essential aspects of the content.
    If the content is long, focus on maintaining brevity while retaining accuracy and completeness in each section.
    
    Key Takeaways:
    At the end of the summary, provide a list of key points.
    The key points should be concise, summarizing the most important information from each section. Ensure they are easily identifiable and clear.
    
    Clarity & Precision:
    Use simple and direct language to ensure clarity.
    Avoid complex jargon unless it's essential for understanding, and explain any technical terms that must be included.
    
    Input Content: {text}
    """
    
    response = ollama.chat(model="deepseek-r1:1.5b", messages=[{"role": "user", "content": prompt}])
    return remove_think_tags(response['message']['content'])



def download_youtube_audio(link):
    try:
        if not os.path.exists(output_directory):
            os.makedirs(output_directory)

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_directory, '%(title)s.%(ext)s'),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }],
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            result = ydl.extract_info(link, download=True)

        file_path = os.path.join(output_directory, f"{result['title']}.mp3")
        print(f"Audio downloaded successfully to '{file_path}'.")
        return file_path
    except Exception as e:
        print(f"Error: {e}")
        return None

def convert_to_wav(input_file):
    try:
        file_name = os.path.splitext(os.path.basename(input_file))[0]
        output_file = os.path.join(output_directory, f"{file_name}.wav")
        print(f"Converting file: {input_file}")
        audio = AudioSegment.from_file(input_file)
        audio.export(output_file, format="wav")

        # Remove the original MP3 file
        os.remove(input_file)
        print(f"Removed MP3 file: {input_file}")

        return output_file
    except Exception as e:
        print(f"Error in WAV conversion: {e}")
        return None

def retrieve_data_from_db(milvus_client, collection_name):
    """
    Retrieve text data from the Milvus database.
    """
    print("Retrieving data from the database...")
    try:
        results = milvus_client.query(
            collection_name=collection_name,
            filter="id >= 0",  # Retrieve all records (changed 'expr' to 'filter')
            output_fields=["text"],  # Only retrieving the 'text' field
        )
        print(f"Retrieved {len(results)} records from the database.")
        return [result["text"] for result in results]
    except Exception as e:
        print(f"Error retrieving data from the database: {e}")
        return []

def generate_chapters_from_data(text_data, min_chapters=2, max_chapters=8, scaling_factor=0.1):
    """
    Generate up to 'max_chapters' chapters from the text data, ensuring an even distribution of sentences.
    """
    text_length = len(" ".join(text_data).split()) 
    computed_chapters = min_chapters + math.ceil(scaling_factor * math.sqrt(text_length))
    chapter_number = min(max_chapters, max(min_chapters, computed_chapters))
    chapters = []
    
    # Split the text data into sentences
    sentences = " ".join(text_data).split(". ")
    total_sentences = len(sentences)
    
    # Calculate the number of sentences per chapter
    sentences_per_chapter = total_sentences // chapter_number
    remainder = total_sentences % chapter_number  # Distribute any remaining sentences
    
    start = 0
    for i in range(chapter_number):
        end = start + sentences_per_chapter + (1 if i < remainder else 0)
        chapter = ". ".join(sentences[start:end])
        chapters.append(chapter)
        start = end

    return chapters


@app.route('/submit-video', methods=['POST'])
def submit_video():
    data = request.get_json()
    if 'videoUrl' in data:
        video_url = data['videoUrl']
        print(f"Received video URL: {video_url}")

        audio_file = download_youtube_audio(video_url)
        if audio_file:
            wav_file = convert_to_wav(audio_file)
            if wav_file:
                transcription = transcribe_audio_with_timestamps(wav_file, model_size="base")
                transcript_text = " ".join([seg["text"] for seg in transcription])

                summary = generate_summary(transcript_text).replace("*", "")

                output_file = os.path.join(output_directory, "transcription.json")
                save_transcription_to_file(transcription, output_file)

                os.remove(wav_file)
                print(f"Removed WAV file: {wav_file}")
                return jsonify({
                    "message": "Transcription and summary successful",
                    "transcription": transcription,
                    "summary": summary,
                }), 200
            else:
                return jsonify({"error": "Failed to convert audio to WAV"}), 500
        else:
            return jsonify({"error": "Failed to download audio"}), 500
    else:
        return jsonify({"error": "No video URL provided"}), 400

@app.route('/submit-transcription', methods=['POST'])
def submit_transcription():
    data = request.get_json()
    if 'transcription' in data:
        transcription = data['transcription']
        print(f"Received transcription with {len(transcription)} entries.")

        # Get embedding dimension using a sample text
        embedding_dim = len(emb_text("This is a test"))
        print(f"Embedding dimension: {embedding_dim}")

        # Drop collection if it already exists
        if milvus_client.has_collection(collection_name):
            milvus_client.drop_collection(collection_name)
        
        # Create new collection
        milvus_client.create_collection(
            collection_name=collection_name,
            dimension=embedding_dim,
            metric_type="IP",
            consistency_level="Strong",
        )
        print("Collection created successfully.")

        # Prepare data for insertion into Milvus
        data_for_insertion = []
        for i, entry in enumerate(tqdm(transcription, desc="Creating embeddings")):
            text = entry["text"]
            timestamp = entry["timestamp"]
            embedding = emb_text(text)
            
            # Ensure embedding is valid
            if len(embedding) == embedding_dim:
                data_for_insertion.append({
                    "id": i,
                    "vector": embedding,
                    "text": text,
                    "timestamp": timestamp  # Include timestamp in data for RAG retrieval
                })
            else:
                print(f"Skipping entry {i} due to empty or malformed embedding")

        # Ensure the number of rows is correct
        if len(data_for_insertion) != len(transcription):
            print(f"Warning: Data length mismatch! {len(data_for_insertion)} embeddings were inserted out of {len(transcription)} total entries.")
        
        # Insert data into Milvus
        if len(data_for_insertion) > 0:
            milvus_client.insert(collection_name=collection_name, data=data_for_insertion)
            print("RAG data updated successfully.")
            
            # Retrieve data from Milvus and generate chapters
            text_data = retrieve_data_from_db(milvus_client, collection_name)
            if text_data:
                chapters = generate_chapters_from_data(text_data, max_chapters=6)

                # Optionally, return the chapters to the user
                return jsonify({
                    "message": "Transcription stored and chapters generated successfully",
                    "chapters": chapters
                }), 200
            else:
                return jsonify({"error": "No text data retrieved from Milvus."}), 500
        else:
            return jsonify({"error": "No valid embeddings to insert."}), 500
    else:
        return jsonify({"error": "No transcription provided"}), 400

@app.route('/chat', methods=['POST'])
def chat():    
    data = request.get_json()
    if 'query' not in data:
        return jsonify({"error": "No query provided"}), 400
    user_query = data['query']

    try:
        # Search the Milvus collection for relevant context
        search_res = milvus_client.search(
            collection_name=collection_name,
            data=[emb_text(user_query)],
            limit=3,
            search_params={"metric_type": "IP", "params": {}},
            output_fields=["text"],  # Only retrieve the 'text' field
        )

        # Retrieve the text from search results
        retrieved_lines = [res["entity"]["text"] for res in search_res[0]]

        # Prepare context
        context = "\n".join(retrieved_lines)

        # Format the user prompt for the assistant
        USER_PROMPT = f"""
        Use the following pieces of information enclosed in <context> tags to provide an answer to the question enclosed in <question> tags.
        <context>
        {context}
        </context>
        <question>
        {user_query}
        </question>
        """

        # Query Ollama for the response
        response = ollama.chat(
            model="deepseek-r1:1.5b",
            messages=[
                {"role": "system", "content": "You are a helpful assistant trained to answer questions using the provided context."},
                {"role": "user", "content": USER_PROMPT},
            ],
        )
        output_content = remove_think_tags(response['message']['content'])

        if not output_content:
            output_content = "I'm sorry, I couldn't process that." 
        return jsonify({"response": output_content}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Failed to process query"}), 500


@app.route('/generate-flashcards', methods=['POST'])
def generate_flashcards():
    data = request.json
    chapters = data.get('chapters', [])

    if not chapters:
        return jsonify({"error": "No chapters provided"}), 400

    flashcards = []
    
    for chapter in chapters:
        query = f"""
            You are an expert in educational content creation. Your task is to generate a well-structured flashcard based on the given chapter. Provide your response in the following structured format:
            {{
            "Question": "A clear and concise question that tests understanding of the chapter",
            "Answer": "A direct and precise answer to the question"
            }}
            Ensure the question is relevant to the chapter and tests key concepts. The answer should be factual and to the point. Do not include any extra text outside this format. The response should have exactly 1 question in JSON format.
            
            Chapter:
            {chapter}
        """
        
        response = ollama.chat(model="deepseek-r1:1.5b", messages=[{"role": "user", "content": query}])
        result = response.get('message', {}).get('content', '')

        json_pattern = re.compile(r'({.*?})', re.DOTALL)
        match = json_pattern.search(result)
        
        if match:
            json_data = match.group(0)
            try:
                flashcard = json.loads(json_data)
                
                # Validate if the flashcard has both Question and Answer, and they are not null or empty
                if (
                    isinstance(flashcard, dict) and
                    "Question" in flashcard and "Answer" in flashcard and
                    flashcard["Question"] and flashcard["Answer"] and
                    flashcard["Question"].strip() and flashcard["Answer"].strip()
                ):
                    flashcards.append(flashcard)
            except json.JSONDecodeError:
                print("Error decoding JSON:", json_data)
        else:
            print("No valid JSON found in the response.")

    return jsonify({"flashcards": flashcards})



@app.route('/')
def home():
    """
    Simple route to check if the site is running.
    """
    return jsonify({"message": "The site is running!"}), 200


if __name__ == '__main__':
    app.run(port=5000)
