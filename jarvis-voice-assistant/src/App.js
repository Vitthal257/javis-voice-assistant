import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// TODO: Replace with your ElevenLabs API key and Voice ID
const ELEVENLABS_API_KEY = 'YOUR_ELEVENLABS_API_KEY';
const VOICE_ID = 'YOUR_VOICE_ID';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantResponses, setAssistantResponses] = useState([]);
  const [recognition, setRecognition] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [todos, setTodos] = useState([]);

  const playVoiceResponse = async (text) => {
    if (!ELEVENLABS_API_KEY || ELEVENLABS_API_KEY === 'YOUR_ELEVENLABS_API_KEY' || !VOICE_ID) {
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
      return;
    }
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
    const headers = {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    };
    const data = {
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.5, similarity_boost: 0.5 },
    };
    try {
      const apiResponse = await fetch(url, { method: 'POST', headers, body: JSON.stringify(data) });
      if (!apiResponse.ok) throw new Error('ElevenLabs API request failed');
      const audioBlob = await apiResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Error with ElevenLabs API:', error);
      const utterance = new SpeechSynthesisUtterance("I seem to be having trouble with my voice right now. " + text);
      speechSynthesis.speak(utterance);
    }
  };

  const getOllamaResponse = async (prompt) => {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama2', // or your model name
          prompt: prompt,
          stream: false
        })
      });
      const data = await response.json();
      return data.response || "Sorry, I couldn't get a response from Llama 2.";
    } catch (error) {
      return "Sorry, I couldn't connect to Ollama.";
    }
  };

  // Helper: parse time like '5:30pm', '17:30', 'in 10 minutes', etc.
  function parseTime(timeStr) {
    // Try to parse 'in X minutes'
    const inMinutes = timeStr.match(/in (\d+) minutes?/i);
    if (inMinutes) {
      const mins = parseInt(inMinutes[1], 10);
      return new Date(Date.now() + mins * 60000);
    }
    // Try to parse HH:MM(am/pm) or 24h
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      let now = new Date();
      let target = new Date(now);
      if (timeMatch[3]) {
        // am/pm
        if (timeMatch[3].toLowerCase() === 'pm' && hours < 12) hours += 12;
        if (timeMatch[3].toLowerCase() === 'am' && hours === 12) hours = 0;
      }
      target.setHours(hours, minutes, 0, 0);
      // If time is in the past, set for tomorrow
      if (target < now) target.setDate(target.getDate() + 1);
      return target;
    }
    return null;
  }

  const handleCommand = useCallback(async (command) => {
    const lowerCaseCommand = command.toLowerCase();
    let response;
    // Remind me to [task] at [time]
    const remindMatch = command.match(/remind me to (.+) at (.+)/i);
    if (remindMatch) {
      const task = remindMatch[1].trim();
      const timeStr = remindMatch[2].trim();
      const time = parseTime(timeStr);
      if (time) {
        setReminders(prev => [...prev, { task, time }]);
        response = `Reminder set for '${task}' at ${time.toLocaleTimeString()}`;
        // Schedule notification
        const delay = time.getTime() - Date.now();
        if (delay > 0) {
          setTimeout(() => {
            const notifyMsg = `Reminder: ${task}`;
            setAssistantResponses(prev => [...prev, notifyMsg]);
            playVoiceResponse(notifyMsg);
          }, delay);
        }
      } else {
        response = "Sorry, I couldn't understand the time for your reminder.";
      }
      setAssistantResponses(prev => [...prev, response]);
      playVoiceResponse(response);
      return;
    }
    // Add [task] to my to-do list
    if (/add (.+) to (my )?(todo|to-do|to do) list/i.test(command)) {
      const todoMatch = command.match(/add (.+) to (my )?(todo|to-do|to do) list/i);
      const todo = todoMatch[1].trim();
      setTodos(prev => [...prev, todo]);
      response = `Added '${todo}' to your to-do list.`;
      setAssistantResponses(prev => [...prev, response]);
      playVoiceResponse(response);
      return;
    }
    // Read reminders
    if (lowerCaseCommand.includes('read my reminders')) {
      if (reminders.length === 0) {
        response = "You have no reminders.";
      } else {
        response = 'Your reminders: ' + reminders.map(r => `'${r.task}' at ${r.time.toLocaleTimeString()}`).join('; ');
      }
      setAssistantResponses(prev => [...prev, response]);
      playVoiceResponse(response);
      return;
    }
    // Read to-do list
    if (lowerCaseCommand.includes('read my to-do') || lowerCaseCommand.includes('read my todo')) {
      if (todos.length === 0) {
        response = "Your to-do list is empty.";
      } else {
        response = 'Your to-do list: ' + todos.map(t => `'${t}'`).join(', ');
      }
      setAssistantResponses(prev => [...prev, response]);
      playVoiceResponse(response);
      return;
    }
    if (lowerCaseCommand.includes('open youtube')) {
      response = 'Opening YouTube...';
      window.open('https://youtube.com', '_blank');
      setAssistantResponses(prev => [...prev, response]);
      playVoiceResponse(response);
      return;
    }
    if (lowerCaseCommand.includes('what time is it')) {
      response = `The time is ${new Date().toLocaleTimeString()}`;
      setAssistantResponses(prev => [...prev, response]);
      playVoiceResponse(response);
      return;
    }
    if (lowerCaseCommand.includes('hello')) {
      response = 'Hello, I am your assistant.';
      setAssistantResponses(prev => [...prev, response]);
      playVoiceResponse(response);
      return;
    }
    // If not recognized, use Ollama
    response = await getOllamaResponse(command);
    setAssistantResponses(prev => [...prev, response]);
    playVoiceResponse(response);
  }, [reminders, todos]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onend = () => setIsListening(false);
      recognitionInstance.onresult = (event) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        handleCommand(currentTranscript);
      };
      setRecognition(recognitionInstance);
    } else {
      console.log('Speech recognition not supported in this browser.');
    }
  }, [handleCommand]);

  const handleListen = () => {
    if (isListening) {
      recognition.stop();
    } else {
      setTranscript('');
      recognition.start();
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img
          src={process.env.PUBLIC_URL + '/logo512.png'}
          alt="JARVIS Assistant Logo"
          className="jarvis-logo-banner"
        />
        <div className="jarvis-card">
          <h1><span className="jarvis-accent">J.A.R.V.I.S.</span></h1>
          <p style={{color:'#b2f7ef', marginTop:0, marginBottom:24}}>Your personal voice assistant</p>
          <button
            onClick={handleListen}
            className={`voice-btn${isListening ? ' listening' : ''}`}
            aria-pressed={isListening}
          >
            <svg viewBox="0 0 24 24"><path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3s-3 1.34-3 3v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
            {isListening ? 'Stop Listening' : 'Start Listening'}
          </button>
          <div className="transcript-container">
            <h2>Recognized Command:</h2>
            <p>{transcript}</p>
          </div>
          <div className="response-container">
            <h2>Assistant Responses:</h2>
            <ul>
              {assistantResponses.map((res, index) => (
                <li key={index}>{res}</li>
              ))}
            </ul>
          </div>
          <div className="reminders-todos-container">
            <h2>Reminders</h2>
            <ul>
              {reminders.map((r, i) => (
                <li key={i}>{r.task} at {r.time.toLocaleTimeString()}</li>
              ))}
            </ul>
            <h2>To-Do List</h2>
            <ul>
              {todos.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
