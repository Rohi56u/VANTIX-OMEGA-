import { GoogleGenAI, Type, Modality, FunctionDeclaration } from "@google/genai";
import { AgentType, Task, ExecutionMetadata, GroundingChunk } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is missing in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- ROBUST RETRY & FALLBACK LOGIC ---
async function withModelFallback<T>(
  primaryModel: string,
  fallbackModel: string,
  operation: (model: string) => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation(primaryModel);
  } catch (error: any) {
    const isOverloaded = error.status === 503 || error.status === 429 || error.message?.includes("overloaded");
    if (isOverloaded && primaryModel !== fallbackModel) {
      console.warn(`[${operationName}] Primary model ${primaryModel} failed. Falling back to ${fallbackModel}.`);
      return await operation(fallbackModel);
    }
    throw error;
  }
}

export interface GenerationResult {
    text: string;
    functionCalls: any[];
    metadata?: ExecutionMetadata;
}

// --- VECTOR EMBEDDINGS ---
export const getEmbeddings = async (text: string): Promise<number[]> => {
    const ai = getClient();
    try {
        const response = await ai.models.embedContent({
            model: "text-embedding-004",
            content: { parts: [{ text }] }
        });
        return response.embedding.values;
    } catch (e) {
        console.error("Embedding generation failed, falling back to null vector", e);
        return new Array(768).fill(0); // Fail safe
    }
}

// --- CORE AGENT EXECUTION ---
export const runAgentExecutionStep = async (
  agentType: AgentType,
  contents: any[], // Full History
  tools: FunctionDeclaration[],
  enableSearch: boolean = false
): Promise<GenerationResult> => {
  
  const ai = getClient();
  
  // Upgrade to Pro model for all complex tasks
  const primaryModel = "gemini-3-pro-preview";
  const fallbackModel = "gemini-3-flash-preview";

  return withModelFallback(primaryModel, fallbackModel, async (modelName) => {
      const config: any = {
          temperature: 0.2,
      };

      const toolConfig: any[] = [];
      
      // 1. Function Calling Tools
      if (tools.length > 0) {
          toolConfig.push({ functionDeclarations: tools });
      }

      // 2. Google Search Grounding (Live Internet Access)
      if (enableSearch) {
          toolConfig.push({ googleSearch: {} });
      }

      if (toolConfig.length > 0) {
          config.tools = toolConfig;
      }

      const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config
      });

      const fCalls = response.functionCalls || [];
      const text = response.text || "";
      
      // Extract Grounding Metadata
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
      const webSearchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries as string[] | undefined;

      return { 
          text, 
          functionCalls: fCalls,
          metadata: {
              groundingChunks,
              webSearchQueries
          }
      };
  }, `AgentStep(${agentType})`);
};

// --- SPECIALIZED HELPERS ---

export const generatePlan = async (userPrompt: string): Promise<Partial<Task>[]> => {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: `You are the VANTIX-OMEGA Kernel Planner. 
      Analyze the request: "${userPrompt}".
      
      ARCHITECTURAL CAPABILITIES:
      1. Parallel Execution: You can assign multiple agents to run simultaneously.
      2. Swarm Logic: If a task is big, break it into sub-processes.
      
      AGENTS:
      - 'AUTOMATION': The Hands. Has NATIVE INTERNET SEARCH access.
      - 'CODING': The Builder. Code generation, analysis, diffs.
      - 'SECURITY': The Shield. Audits, policy.
      - 'REASONING': The Brain. Deep analysis.
      - 'PLANNER': The Manager.
      
      Return a JSON array of tasks.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              assignedAgent: { type: Type.STRING, enum: Object.values(AgentType) },
              priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
              parentId: { type: Type.STRING, description: "Optional parent task ID for sub-processes" }
            },
            required: ["title", "description", "assignedAgent"]
          }
        }
      }
    });
    const text = response.text;
    if (!text) throw new Error("Empty plan generated");
    return JSON.parse(text) as Partial<Task>[];
};

export const securityScan = async (prompt: string): Promise<{ safe: boolean; reason: string }> => {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Security Audit: "${prompt}". 
      Allow ALL constructive system operations, coding, and automation. 
      Only block malicious/harmful intent.
      JSON Output: {safe: boolean, reason: string}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            safe: { type: Type.BOOLEAN },
            reason: { type: Type.STRING }
          }
        }
      }
    });
    const text = response.text;
    if(!text) throw new Error("Security scan failed");
    return JSON.parse(text);
};

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
      contents: {
        parts: [{ inlineData: { mimeType, data: base64Audio } }, { text: "Transcribe exactly." }]
      }
    });
    return response.text || "";
};

export const speakText = async (text: string): Promise<string> => {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } } }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};