import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [ollamaStatus, setOllamaStatus] = useState('checking'); // 'checking', 'connected', 'disconnected'
  const recognitionRef = useRef(null);

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
      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      // Try the /api/chat endpoint first (preferred for llama3.2)
      let response;
      try {
        response = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3.2',
            messages: [
              { role: 'system', content: 'You are JARVIS (Just A Rather Very Intelligent System), Tony Stark\'s sophisticated AI assistant. You are highly intelligent, witty, and have a dry sense of humor. You speak in a refined, professional manner with occasional subtle wit. You are helpful, efficient, and always ready to assist, but you maintain a sophisticated personality. Keep responses concise, intelligent, and occasionally add a touch of humor when appropriate. You are the perfect blend of professionalism and personality.' },
              { role: 'user', content: prompt }
            ],
            stream: false
          }),
          signal: controller.signal
        });
      } catch (chatError) {
        // Fallback to /api/generate if /api/chat fails
        console.log('Trying /api/generate endpoint as fallback...');
        response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'llama3.2',
            prompt: prompt,
            system: 'You are JARVIS (Just A Rather Very Intelligent System), Tony Stark\'s sophisticated AI assistant. You are highly intelligent, witty, and have a dry sense of humor. You speak in a refined, professional manner with occasional subtle wit. You are helpful, efficient, and always ready to assist, but you maintain a sophisticated personality. Keep responses concise, intelligent, and occasionally add a touch of humor when appropriate. You are the perfect blend of professionalism and personality.',
            stream: false
          }),
          signal: controller.signal
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API request failed with status: ${response.status}`);
      }

      const data = await response.json();

      // Handle both /api/chat and /api/generate response formats
      let responseText;
      if (data.message && data.message.content) {
        // /api/chat format
        responseText = data.message.content;
      } else if (data.response) {
        // /api/generate format
        responseText = data.response;
      } else {
        throw new Error('Unexpected response format from Ollama');
      }

      if (!responseText) {
        throw new Error('No response from Ollama model');
      }

      // Update status to connected on successful response
      setOllamaStatus('connected');
      return responseText;
    } catch (error) {
      console.error('Error with Ollama API:', error);

      // Provide helpful error messages based on error type
      if (error.name === 'AbortError') {
        return "I'm taking too long to respond. Please check if Ollama is running and try again.";
      }

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('ERR_CONNECTION_REFUSED')) {
        setOllamaStatus('disconnected');
        return "I couldn't connect to Ollama. Please make sure: 1) Ollama is running (check with 'ollama serve'), 2) The 'llama3.2' model is installed (run 'ollama pull llama3.2'), 3) Ollama is accessible on http://localhost:11434";
      }

      return `I encountered an issue: ${error.message}. Please check your Ollama setup.`;
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

  // Check Ollama connection status
  const checkOllamaConnection = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        const hasLlama32 = data.models?.some(model => model.name.includes('llama3.2') || model.name.includes('llama3'));
        setOllamaStatus(hasLlama32 ? 'connected' : 'disconnected');
      } else {
        setOllamaStatus('disconnected');
      }
    } catch (error) {
      console.error('Ollama connection check failed:', error);
      setOllamaStatus('disconnected');
    }
  };

  // Save journal entry to LocalStorage
  const saveJournalEntry = (entry) => {
    try {
      const existingEntries = JSON.parse(localStorage.getItem('journal_entries') || '[]');
      const newEntry = {
        text: entry,
        timestamp: new Date().toISOString()
      };
      existingEntries.push(newEntry);
      localStorage.setItem('journal_entries', JSON.stringify(existingEntries));
      return true;
    } catch (error) {
      console.error('Error saving journal entry:', error);
      return false;
    }
  };

  // Set browser notification for water reminder
  const setWaterReminder = () => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        setTimeout(() => {
          new Notification('JARVIS Reminder', {
            body: 'Time to drink water! Stay hydrated.',
            icon: '/logo192.png'
          });
        }, 30000); // 30 seconds for demo, can be adjusted
        return true;
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            setTimeout(() => {
              new Notification('JARVIS Reminder', {
                body: 'Time to drink water! Stay hydrated.',
                icon: 'https://static.vecteezy.com/system/resources/previews/021/822/375/large_2x/cute-little-blue-shark-face-illustration-vector.jpg'
              });
            }, 30000);
          }
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting notification:', error);
      return false;
    }
  };

  const handleCommand = useCallback(async (command) => {
    const lowerCaseCommand = command.toLowerCase();
    let response;

    // Check for "Remind me to drink water"
    if (lowerCaseCommand.includes('remind me to drink water')) {
      const success = setWaterReminder();
      response = success
        ? "Water reminder set! I'll notify you in 30 seconds."
        : "I couldn't set up the notification. Please check your browser permissions.";
      setAssistantResponses(prev => [...prev, response]);
      playVoiceResponse(response);
      return;
    }

    // Check for "Journal this"
    if (lowerCaseCommand.includes('journal this')) {
      const success = saveJournalEntry(command);
      response = success
        ? "Entry saved to your journal."
        : "Sorry, I couldn't save the journal entry.";
      setAssistantResponses(prev => [...prev, response]);
      playVoiceResponse(response);
      return;
    }

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
      recognitionInstance.interimResults = true; // Enable interim results for confidence meter
      recognitionInstance.onstart = () => setIsListening(true);
      recognitionInstance.onend = () => setIsListening(false);

      recognitionInstance.onresult = async (event) => {
        try {
          const result = event.results[0][0];
          const currentTranscript = result.transcript;
          let currentConfidence = result.confidence || 0;

          // If interim and confidence is 0 (common in Chrome), simulate it for UX
          if (!event.results[0].isFinal && currentConfidence === 0) {
            // Generate a random confidence between 0.6 and 0.95
            currentConfidence = 0.6 + Math.random() * 0.35;
          }

          // Update confidence meter in real-time
          setConfidence(currentConfidence);

          // Only process final results
          if (event.results[0].isFinal) {
            // Display transcript first
            setTranscript(currentTranscript);

            const lowerCaseCommand = currentTranscript.toLowerCase();
            let response = null;
            let shouldCallOllama = true;

            // Check for productivity commands first
            // "Remind me to drink water"
            if (lowerCaseCommand.includes('remind me to drink water')) {
              const success = setWaterReminder();
              response = success
                ? "Water reminder set! I'll notify you in 30 seconds."
                : "I couldn't set up the notification. Please check your browser permissions.";
              shouldCallOllama = false;
            }
            // "Journal this"
            else if (lowerCaseCommand.includes('journal this')) {
              const success = saveJournalEntry(currentTranscript);
              response = success
                ? "Entry saved to your journal."
                : "Sorry, I couldn't save the journal entry.";
              shouldCallOllama = false;
            }

            // If we have a response from productivity commands, use it
            if (response && !shouldCallOllama) {
              setAssistantResponses(prev => [...prev, response]);
              const utterance = new SpeechSynthesisUtterance(response);
              window.speechSynthesis.speak(utterance);
              return;
            }

            // Otherwise, call Ollama
            setIsProcessing(true);

            try {
              // Call Ollama async
              response = await getOllamaResponse(currentTranscript);

              // Update assistant responses
              setAssistantResponses(prev => [...prev, response]);

              // Use TTS to speak the response
              const utterance = new SpeechSynthesisUtterance(response);
              window.speechSynthesis.speak(utterance);

            } catch (error) {
              console.error('Error processing command:', error);
              const errorResponse = "I encountered an error processing your request.";
              setAssistantResponses(prev => [...prev, errorResponse]);
              const utterance = new SpeechSynthesisUtterance(errorResponse);
              window.speechSynthesis.speak(utterance);
            } finally {
              setIsProcessing(false);
            }
          } else {
            // Update transcript for interim results
            setTranscript(currentTranscript);
          }
        } catch (error) {
          console.error('Error in onresult handler:', error);
          setIsProcessing(false);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsProcessing(false);
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
      recognitionRef.current = recognitionInstance;
    } else {
      console.log('Speech recognition not supported in this browser.');
    }
  }, []);

  // Check Ollama connection on mount
  useEffect(() => {
    checkOllamaConnection();
    // Recheck every 30 seconds
    const interval = setInterval(checkOllamaConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  // Audio Visualizer Logic
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);
  const analyzerRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (isListening) {
      const startVisualizer = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

          if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
          }

          const audioContext = audioContextRef.current;
          const analyzer = audioContext.createAnalyser();
          analyzer.fftSize = 256;

          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyzer);

          sourceRef.current = source;
          analyzerRef.current = analyzer;

          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          const bufferLength = analyzer.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          const draw = () => {
            if (!isListening) return;

            animationFrameRef.current = requestAnimationFrame(draw);

            analyzer.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = 65; // Slightly larger than the arc reactor
            const bars = 60;
            const step = (Math.PI * 2) / bars;

            for (let i = 0; i < bars; i++) {
              const value = dataArray[i % bufferLength]; // Wrap around if needed
              const barHeight = (value / 255) * 50; // Max height 50px

              const angle = i * step;

              const x1 = centerX + Math.cos(angle) * radius;
              const y1 = centerY + Math.sin(angle) * radius;
              const x2 = centerX + Math.cos(angle) * (radius + barHeight);
              const y2 = centerY + Math.sin(angle) * (radius + barHeight);

              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.lineWidth = 3;
              ctx.strokeStyle = `hsl(175, 100%, ${50 + (value / 255) * 50}%)`; // Cyan to White
              ctx.lineCap = 'round';
              ctx.stroke();
            }
          };

          draw();
        } catch (error) {
          console.error('Error initializing visualizer:', error);
        }
      };

      startVisualizer();
    } else {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      // Note: We don't close AudioContext to reuse it, but we could suspend it.
      // For simplicity, we just disconnect the source.
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
    };
  }, [isListening]);

  const handleListen = () => {
    if (recognition) {
      if (isListening) {
        recognition.stop();
      } else {
        setTranscript('');
        setConfidence(0);
        setIsProcessing(false);
        recognition.start();
      }
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <img
          src={process.env.PUBLIC_URL + 'https://static.vecteezy.com/system/resources/previews/021/822/375/large_2x/cute-little-blue-shark-face-illustration-vector.jpg'}
          alt="JARVIS Assistant Logo"
          className="jarvis-logo-banner"
        />
        <div className="jarvis-card">
          <h1><span className="jarvis-accent">J.A.R.V.I.S.</span></h1>
          <p style={{ color: '#b2f7ef', marginTop: 0, marginBottom: 8 }}>Your personal voice assistant</p>
          <div className="ollama-status">
            <span className={`status-indicator ${ollamaStatus}`}></span>
            <span className="status-text">
              {ollamaStatus === 'checking' && 'Checking Ollama connection...'}
              {ollamaStatus === 'connected' && 'Ollama Connected'}
              {ollamaStatus === 'disconnected' && 'Ollama Disconnected - Install with: ollama pull llama3.2'}
            </span>
          </div>
          <div className="voice-control-container">
            <div className="arc-reactor-wrapper">
              <div
                onClick={handleListen}
                className={`arc-reactor${isProcessing ? ' processing' : ''}${isListening ? ' listening' : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleListen();
                  }
                }}
                aria-pressed={isListening}
              >
                <div className="arc-reactor-core"></div>
                <div className="arc-reactor-ring ring-1"></div>
                <div className="arc-reactor-ring ring-2"></div>
                <div className="arc-reactor-ring ring-3"></div>
              </div>
              <canvas
                ref={canvasRef}
                width="300"
                height="300"
                className="audio-visualizer"
              ></canvas>
            </div>
            <div className="confidence-meter">
              <div className="confidence-label">Confidence: {Math.round(confidence * 100)}%</div>
              <div className="confidence-bar-container">
                <div
                  className="confidence-bar"
                  style={{ width: `${confidence * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
          <div className="transcript-container">
            <h2>Recognized Command:</h2>
            <p>{transcript || (isListening ? 'Listening...' : '')}</p>
          </div>
          {isProcessing && (
            <div className="processing-indicator">
              <div className="processing-text">Processing...</div>
            </div>
          )}
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
