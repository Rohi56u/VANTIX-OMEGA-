import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Play, Square, Cpu, Loader2, AlertTriangle, CheckCircle, Volume2, StopCircle, BrainCircuit } from 'lucide-react';
import { AgentType, Task } from '../types';
import * as GeminiService from '../services/geminiService';

interface CommandCenterProps {
  onNewTask: (tasks: Partial<Task>[]) => void;
  onLog: (agent: AgentType, message: string, severity: 'INFO' | 'WARNING' | 'ERROR') => void;
}

interface Message {
  id: string;
  sender: 'USER' | 'SYSTEM' | 'AGENT';
  agentName?: string;
  text: string;
  timestamp: Date;
}

// Helpers for Audio Decoding
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function pcmToAudioBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ onNewTask, onLog }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'SYSTEM',
      text: 'VANTIX-OMEGA Core Online. Reflexion Loop Active. Awaiting directive...',
      timestamp: new Date()
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (sourceNodeRef.current) {
        sourceNodeRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'USER',
      text: input,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    try {
      // 1. Security Scan
      onLog(AgentType.SECURITY, "Scanning input payload...", "INFO");
      let scanResult;
      try {
        scanResult = await GeminiService.securityScan(userMsg.text);
      } catch (err: any) {
        onLog(AgentType.SECURITY, `Security Scan Failed: ${err.message}`, "ERROR");
        throw new Error(`Security Protocol Unreachable: ${err.message}`);
      }
      
      if (!scanResult.safe) {
        onLog(AgentType.SECURITY, `Threat Detected: ${scanResult.reason}`, "ERROR");
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          sender: 'SYSTEM',
          text: `🚫 COMMAND REJECTED BY SECURITY CORE: ${scanResult.reason}`,
          timestamp: new Date()
        }]);
        setIsProcessing(false);
        return;
      }

      onLog(AgentType.SECURITY, "Payload Verified. Routing to Planner.", "INFO");

      // 2. Planning
      onLog(AgentType.PLANNER, "Decomposing intent...", "INFO");
      let plan;
      try {
        plan = await GeminiService.generatePlan(userMsg.text);
      } catch (err: any) {
        onLog(AgentType.PLANNER, `Planning Failed: ${err.message}`, "ERROR");
        throw new Error(`Orchestration Service Unreachable: ${err.message}`);
      }
      
      onNewTask(plan);
      
      const planSummary = plan.map(t => `• [${t.assignedAgent}] ${t.title}`).join('\n');
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'AGENT',
        agentName: 'PLANNER',
        text: `Strategy formulated via Reflexion:\n\n${planSummary}`,
        timestamp: new Date()
      }]);

      onLog(AgentType.PLANNER, "Plan distributed to execution mesh.", "INFO");

    } catch (error: any) {
      onLog(AgentType.MONITORING, `System Error: ${error.message}`, "ERROR");
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'SYSTEM',
        text: `CRITICAL ERROR: ${error.message}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
           mimeType = 'audio/ogg';
        }
      }

      const options = { mimeType };
      const mediaRecorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const type = mediaRecorder.mimeType || mimeType; 
        const audioBlob = new Blob(audioChunksRef.current, { type });
        
        stream.getTracks().forEach(track => track.stop());

        setIsProcessing(true);
        onLog(AgentType.VOICE, "Processing audio stream...", "INFO");

        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            if (typeof reader.result !== 'string') return;
            const base64Audio = reader.result.split(',')[1];
            const detectedType = reader.result.split(';')[0].split(':')[1] || type;

            try {
              const text = await GeminiService.transcribeAudio(base64Audio, detectedType);
              if (text) {
                setInput((prev) => (prev ? `${prev} ${text}` : text));
                onLog(AgentType.VOICE, "Audio transcribed successfully.", "INFO");
              } else {
                onLog(AgentType.VOICE, "No speech detected.", "WARNING");
              }
            } catch (err: any) {
              onLog(AgentType.VOICE, `Transcription Service Error: ${err.message}`, "ERROR");
            } finally {
              setIsProcessing(false);
            }
          };
        } catch (e: any) {
          setIsProcessing(false);
          onLog(AgentType.VOICE, `Audio Processing Error: ${e.message}`, "ERROR");
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      onLog(AgentType.VOICE, "Microphone active. Listening...", "INFO");

    } catch (err) {
      console.error(err);
      onLog(AgentType.VOICE, "Microphone access denied or unavailable.", "ERROR");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSpeak = async (msgId: string, text: string) => {
    if (playingMessageId === msgId) {
      stopAudio();
      return;
    }

    stopAudio();
    setLoadingMessageId(msgId);
    
    try {
      const base64Audio = await GeminiService.speakText(text);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      
      // Ensure context is running (fixes autoplay policy issues)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const bytes = decodeBase64(base64Audio);
      const buffer = await pcmToAudioBuffer(bytes, ctx, 24000, 1);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setPlayingMessageId(null);
      };
      
      source.start();
      sourceNodeRef.current = source;
      setPlayingMessageId(msgId);
    } catch (error: any) {
      onLog(AgentType.VOICE, `TTS Error: ${error.message}`, "ERROR");
      setPlayingMessageId(null);
    } finally {
      setLoadingMessageId(null);
    }
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    setPlayingMessageId(null);
  };

  return (
    <div className="h-full flex flex-col bg-black/20 rounded-lg overflow-hidden border border-omega-border">
      {/* Terminal Output */}
      <div className="flex-1 overflow-auto p-4 space-y-4 font-mono text-sm" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.sender === 'USER' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender !== 'USER' && (
              <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                msg.sender === 'SYSTEM' ? 'bg-omega-danger/10 text-omega-danger' : 'bg-omega-accent/10 text-omega-accent'
              }`}>
                {msg.sender === 'SYSTEM' ? <AlertTriangle size={16} /> : <Cpu size={16} />}
              </div>
            )}
            
            <div className={`max-w-[80%] rounded-lg p-3 ${
              msg.sender === 'USER' 
                ? 'bg-omega-border text-gray-200' 
                : 'bg-black/40 border border-omega-border/50 text-gray-300'
            }`}>
              {msg.agentName && (
                <div className="text-[10px] font-bold text-omega-accent mb-1 uppercase tracking-wider">
                  //{msg.agentName}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.text}</div>
              
              {/* TTS Button for System/Agent messages */}
              {msg.sender !== 'USER' && (
                <div className="mt-2 pt-2 border-t border-white/10 flex justify-end">
                  <button 
                    onClick={() => handleSpeak(msg.id, msg.text)}
                    disabled={loadingMessageId === msg.id}
                    className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-omega-accent transition-colors disabled:opacity-50"
                    title="Read Aloud"
                  >
                    {loadingMessageId === msg.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : playingMessageId === msg.id ? (
                      <StopCircle size={14} className="text-omega-accent animate-pulse" />
                    ) : (
                      <Volume2 size={14} />
                    )}
                  </button>
                </div>
              )}
            </div>

            {msg.sender === 'USER' && (
              <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-gray-400">YOU</span>
              </div>
            )}
          </div>
        ))}
        {isProcessing && (
           <div className="flex gap-3">
              <div className="w-8 h-8 rounded bg-omega-accent/10 text-omega-accent flex items-center justify-center animate-pulse">
                <BrainCircuit size={16} />
              </div>
              <div className="text-gray-500 text-xs flex items-center mt-2 font-mono">
                 {isRecording ? "LISTENING..." : "REASONING (REFLEXION LOOP ACTIVE)..."}
              </div>
           </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-omega-panel border-t border-omega-border">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter directive or query..."
              className="w-full bg-black border border-omega-border rounded p-3 pl-4 pr-12 text-gray-300 focus:outline-none focus:border-omega-accent resize-none h-14 font-mono text-sm"
              disabled={isProcessing && !isRecording}
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className={`px-4 rounded border flex items-center justify-center transition-all ${
              !input.trim() || isProcessing
              ? 'border-gray-800 text-gray-700 bg-gray-900 cursor-not-allowed'
              : 'border-omega-accent/50 text-omega-accent bg-omega-accent/10 hover:bg-omega-accent/20'
            }`}
          >
            <Send size={20} />
          </button>
          <button 
             onClick={handleMicClick}
             className={`px-4 rounded border transition-all flex items-center justify-center ${
               isRecording 
                ? 'border-omega-danger text-omega-danger bg-omega-danger/10 animate-pulse' 
                : 'border-omega-border text-gray-400 hover:text-white hover:border-gray-500'
             }`}
             title={isRecording ? "Stop Recording" : "Voice Input"}
             disabled={isProcessing && !isRecording}
          >
            {isRecording ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
          </button>
        </div>
        <div className="flex justify-between items-center mt-2 px-1">
           <span className="text-[10px] text-gray-600 font-mono">SECURE CHANNEL // ENCRYPTED</span>
           <span className="text-[10px] text-gray-600 font-mono">MODEL: GEMINI-3-FLASH / AUDIO-PREVIEW</span>
        </div>
      </div>
    </div>
  );
};