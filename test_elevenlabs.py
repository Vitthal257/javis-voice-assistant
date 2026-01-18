import os
from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs

# Load environment variables from .env file
load_dotenv()

# Get the API key from environment variables
api_key = os.getenv("ELEVENLABS_API_KEY")
if not api_key:
    raise ValueError("API key not found. Please set the ELEVENLABS_API_KEY in your .env file.")

# Initialize the ElevenLabs client
client = ElevenLabs(api_key=api_key)

try:
    # Text to be converted to speech
    text_to_speak = "Hello, this is a test!"

    print("Generating audio from ElevenLabs...")

    # Generate the audio
    audio = client.text_to_speech.convert(
        voice_id="21m00Tcm4TlvDq8ikWAM",  # Rachel's Voice ID
        text=text_to_speak,
        model_id="eleven_monolingual_v1"
    )

    # Save the streamed audio to a file
    with open("test_audio.mp3", "wb") as f:
        for chunk in audio:
            f.write(chunk)

    print("Successfully saved audio to test_audio.mp3")
    print("You can now play the 'test_audio.mp3' file to hear the result.")

except Exception as e:
    print(f"An error occurred: {e}") 