# JARVIS AI Voice Assistant

A modern, JARVIS-style virtual assistant built with React. This project features voice recognition, voice output (with ElevenLabs or browser TTS), a beautiful futuristic UI, and customizable command handling.

![JARVIS Banner](https://static.vecteezy.com/system/resources/previews/021/822/375/large_2x/cute-little-blue-shark-face-illustration-vector.jpg)

---

## 🚀 Features

- **Voice Recognition:** Start/stop listening with a single button. Transcribes your speech in real time.
- **Voice Output:** Speaks responses using ElevenLabs (if configured) or your browser's built-in voice.
- **Command Handling:**
  - "Open YouTube" — Opens YouTube in a new tab.
  - "What time is it" — Tells you the current time.
  - "Hello" — Greets you.
  - Unrecognized commands get a default response.
- **Modern UI:**
  - Centered, minimal, and futuristic card layout
  - Responsive design with a logo banner
  - Animated, glowing microphone button
  - Log of all assistant responses

---

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation
1. Clone this repository or download the source code.
2. Open a terminal in the project directory:
   ```bash
   cd jarvis-voice-assistant
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   The app will open at [http://localhost:3000](http://localhost:3000).

---

## 🔊 ElevenLabs Voice Integration (Optional)

To use realistic voice output, sign up at [ElevenLabs](https://elevenlabs.io/) and get your API key and a voice ID.

1. Open `src/App.js`.
2. Replace these lines with your credentials:
   ```js
   const ELEVENLABS_API_KEY = 'YOUR_ELEVENLABS_API_KEY';
   const VOICE_ID = 'YOUR_VOICE_ID';
   ```
3. If not set, the app will use your browser's default voice.

---

## 🧑‍💻 Usage
- Click the **Start Listening** button (microphone icon) and speak a command.
- The recognized command appears on screen.
- JARVIS will respond and speak the answer.
- All responses are logged below the command area.

---

## 🛠️ Customization
- **Add More Commands:**
  - Edit the `handleCommand` function in `src/App.js` to add new voice commands and responses.
- **Change Logo:**
  - Replace `public/logo512.png` with your own image, or update the path in `App.js`.
- **UI Tweaks:**
  - Edit `src/App.css` for colors, layout, and effects.
- **Integrate LLMs:**
  - (Optional) Add Gemini, OpenAI, or other LLMs for conversational AI.

---

## 📦 Build for Production
To create an optimized production build:
```bash
npm run build
```
The output will be in the `build/` folder.

---

## 🙏 Credits
- [React](https://reactjs.org/)
- [ElevenLabs](https://elevenlabs.io/) (for voice synthesis)
- [Create React App](https://create-react-app.dev/)
- Logo based on the default React logo (replace with your own for production)

---

## 📄 License
This project is for personal and educational use. See [LICENSE](LICENSE) if present.
