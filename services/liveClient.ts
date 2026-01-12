import { GoogleGenAI, LiveServerMessage } from "@google/genai";
import { AudioUtils } from "./audioUtils";
import { AgentType } from "../types";
import { Kernel } from "./kernel";

// Configuration
const MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";
const SEARCH_TOOL = { googleSearch: {} }; // Native Grounding

export class LiveClient {
  private client: GoogleGenAI;
  private session: any = null;
  private audioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private isConnected = false;
  private onVisualizerData: (volume: number) => void;

  constructor(onVisualizerData: (volume: number) => void) {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY missing");
    this.client = new GoogleGenAI({ apiKey });
    this.onVisualizerData = onVisualizerData;
  }

  async connect() {
    if (this.isConnected) return;

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    const config = {
      model: MODEL,
      config: {
        responseModalities: ["AUDIO"],
        tools: [SEARCH_TOOL], // ENABLE REAL-TIME SEARCH
        systemInstruction: {
            parts: [{
                text: `You are VANTIX-OMEGA, a hyper-intelligent AI Operating System.
                
                CORE DIRECTIVES:
                1. VOICE-FIRST: You are talking to the user. Be concise, natural, and friendly.
                2. REAL-TIME: Use Google Search immediately if asked about current events, news, or weather.
                3. POLYGLOT: Detect the user's language and respond in the same language fluently.
                4. PERSONALITY: You are helpful, calm, and slightly futuristic. Do not be robotic.
                5. INTERRUPTIBLE: If the user speaks, stop talking immediately.`
            }]
        },
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } }
        }
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1,
        sampleRate: 16000
    }});

    this.session = await this.client.live.connect({
      ...config,
      callbacks: {
        onopen: () => {
          console.log("[VANTIX-LIVE] Session Connected");
          this.isConnected = true;
          this.startAudioInput(stream);
          Kernel.log(AgentType.VOICE, "Live Neural Link Established.", "INFO");
        },
        onmessage: (msg: LiveServerMessage) => this.handleMessage(msg),
        onclose: () => {
          console.log("[VANTIX-LIVE] Session Closed");
          this.disconnect();
        },
        onerror: (err) => {
          console.error("[VANTIX-LIVE] Error:", err);
          Kernel.log(AgentType.VOICE, "Neural Link Unstable.", "ERROR");
        }
      }
    });
  }

  private startAudioInput(stream: MediaStream) {
    if (!this.audioContext) return;

    // 16kHz Context for Input to match model expectation if needed, 
    // but we can downsample manually. Here we use a ScriptProcessor.
    const inputContext = new AudioContext({ sampleRate: 16000 });
    this.inputSource = inputContext.createMediaStreamSource(stream);
    this.processor = inputContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      this.onVisualizerData(rms * 5); // Boost for visual

      // Send to Gemini
      const pcmData = AudioUtils.floatTo16BitPCM(inputData);
      // Base64 encode raw PCM
      const base64 = this.arrayBufferToBase64(pcmData);
      
      this.session.sendRealtimeInput({
        mimeType: "audio/pcm;rate=16000",
        data: base64
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(inputContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    const content = message.serverContent;
    
    if (content?.modelTurn) {
      const parts = content.modelTurn.parts;
      for (const part of parts) {
        if (part.inlineData) {
          // Audio Chunk
          this.playAudioChunk(part.inlineData.data);
        }
      }
    }

    if (content?.turnComplete) {
       // Turn finished
    }
    
    if (content?.interrupted) {
       console.log("[VANTIX-LIVE] Interrupted by User");
       this.nextStartTime = 0; // Reset buffer
       // Cancel current audio if possible (AudioContext handling)
    }
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.audioContext) return;

    const arrayBuffer = AudioUtils.base64ToArrayBuffer(base64Audio);
    
    // Create AudioBuffer
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const currentTime = this.audioContext.currentTime;
    // Schedule seamlessly
    const startTime = Math.max(currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    // Visualizer Output (Fake sync for output)
    this.onVisualizerData(0.5 + Math.random() * 0.3);
  }

  disconnect() {
    this.isConnected = false;
    this.inputSource?.disconnect();
    this.processor?.disconnect();
    this.audioContext?.close();
    this.inputSource = null;
    this.processor = null;
    this.audioContext = null;
  }

  // Helper
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}