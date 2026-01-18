# javis-voice-assistant
# JARVIS Voice Assistant

A React-based personal voice assistant powered by Llama 2 (via Ollama) and ElevenLabs for realistic voice output.

## Features

- **Voice Recognition:** Uses browser SpeechRecognition to capture spoken commands.
- **Reminders:** Set reminders with natural language (e.g., "Remind me to call mom at 5:30pm").
- **To-Do List:** Add tasks to your to-do list (e.g., "Add buy milk to my to-do list").
- **General AI Responses:** Unrecognized commands are answered by Llama 2 via Ollama.
- **Voice Output:** Uses ElevenLabs API for natural speech (if configured), otherwise falls back to browser speech synthesis.
- **UI:** Displays recognized commands, assistant responses, reminders, and to-do list.

## Setup

1. **Clone the repository:**
   ```
   git clone https://github.com/your-username/javis-voice-assistant.git
   cd javis-voice-assistant
   ```

2. **Install dependencies:**
   ```
   npm install
   ```

3. **Configure ElevenLabs (optional):**
   - Get your ElevenLabs API key and Voice ID.
   - Edit `src/App.js` and replace:
     ```js
     const ELEVENLABS_API_KEY = 'YOUR_ELEVENLABS_API_KEY';
     const VOICE_ID = 'YOUR_VOICE_ID';
     ```

4. **Run Ollama with Llama 2:**
   ```
   ollama pull llama2
   ollama serve
   ```
   Ollama must be running locally on port 11434.

5. **Start the React app:**
   ```
   npm start
   ```

## Usage

- Click **Start Listening** and speak your command.
- View recognized commands and responses in the UI.
- Reminders and to-do items are displayed and managed automatically.
- General questions are answered by Llama 2.

## Example Commands

- `Remind me to call mom at 5:30pm`
- `Add buy milk to my to-do list`
- `Read my reminders`
- `Read my to-do list`
- `Open YouTube`
- `What time is it?`
- `Hello`
- Any other question (answered by Llama 2)

## Notes

- ElevenLabs API is optional; if not configured, browser speech synthesis will be used.
- Ollama must be running locally for Llama 2 responses.
- Works best in Chrome or Edge (SpeechRecognition support).

## License

MIT
