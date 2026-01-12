import { FunctionDeclaration } from "@google/genai";

export enum AgentType {
  PLANNER = 'PLANNER',
  REASONING = 'REASONING',
  CODING = 'CODING',
  AUTOMATION = 'AUTOMATION',
  SECURITY = 'SECURITY',
  VOICE = 'VOICE',
  VISION = 'VISION',
  MEMORY = 'MEMORY',
  MONITORING = 'MONITORING'
}

export type Permission = 'READ_MEMORY' | 'WRITE_MEMORY' | 'EXECUTE_CODE' | 'NETWORK_ACCESS' | 'SYSTEM_CONTROL' | 'AUDIO_IO' | 'SEARCH_ACCESS';

export interface AgentConfig {
  type: AgentType;
  name: string;
  permissions: Permission[];
  systemInstruction: string;
  allowedTools: string[];
}

export interface AgentStatus {
  id: string;
  type: AgentType;
  name: string;
  status: 'IDLE' | 'THINKING' | 'EXECUTING' | 'AWAITING_TOOL' | 'ERROR' | 'OFFLINE';
  confidence: number;
  lastActivity: string;
  currentTask?: string;
  processId?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: FunctionDeclaration['parameters'];
  execute: (args: any, context: AgentType) => Promise<any>;
  requiredPermissions: Permission[];
}

export interface SystemLog {
  id: string;
  timestamp: Date;
  agent: AgentType;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  encrypted: boolean;
  processId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedAgent: AgentType;
  status: 'PENDING' | 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  progress: number;
  result?: string; 
  timestamp: Date;
  dependencies?: string[];
  parentId?: string;
}

export interface MemoryEntry {
  id: string;
  type: 'SEMANTIC' | 'EPISODIC' | 'PROCEDURAL';
  content: string;
  tags: string[];
  encryptionLevel: 'AES-256' | 'NONE';
  timestamp: string; 
  agentOrigin: AgentType;
  embedding?: number[];
}

export interface KernelState {
  bootTime: Date;
  uptime: number;
  activeProcesses: number;
  memoryUsage: number;
  securityLevel: 'STANDARD' | 'ELEVATED' | 'LOCKDOWN';
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  COMMAND = 'COMMAND',
  WORKFLOW = 'WORKFLOW',
  MEMORY = 'MEMORY',
  SETTINGS = 'SETTINGS'
}

export interface WorkflowNode {
  id: string;
  label: string;
  type: 'TRIGGER' | 'ACTION' | 'CONDITION';
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface ExecutionMetadata {
    groundingChunks?: GroundingChunk[];
    webSearchQueries?: string[];
}