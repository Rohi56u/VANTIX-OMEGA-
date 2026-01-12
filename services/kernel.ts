import { AgentStatus, AgentType, SystemLog, Task, KernelState } from '../types';
import { v4 as uuidv4 } from 'uuid';
import * as GeminiService from './geminiService';
import { MemoryService } from './memoryService';
import { db } from './db';
import { AgentFactory, Agent } from './agents';

// --- EVENT BUS FOR UI UPDATES ---
type Listener = () => void;

class KernelEventEmitter {
  private listeners: Listener[] = [];
  subscribe(listener: Listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  emit() {
    this.listeners.forEach(l => l());
  }
}

// --- CORE KERNEL CLASS ---
class OmegaKernel {
  private _tasks: Task[] = [];
  private _agents: AgentStatus[] = []; // UI Status Representation
  private _logs: SystemLog[] = [];
  private _state: KernelState;
  
  // Real Runtime Instances
  private _agentInstances: Map<AgentType, Agent> = new Map();
  
  // PARALLEL PROCESS TABLE
  private _runningProcesses: Set<string> = new Set();
  private MAX_CONCURRENT_PROCESSES = 5; // Simulating Multi-Core processing

  public events = new KernelEventEmitter();
  private tickInterval: any;

  constructor() {
    this._state = {
      bootTime: new Date(),
      uptime: 0,
      activeProcesses: 0,
      memoryUsage: 0,
      securityLevel: 'STANDARD'
    };

    this.initializeRuntime();
    this.boot();
  }

  private initializeRuntime() {
    // 1. Instantiate Agent Classes
    Object.values(AgentType).forEach(type => {
      this._agentInstances.set(type, AgentFactory.createAgent(type));
    });

    // 2. Initialize UI State
    this._agents = Array.from(this._agentInstances.values()).map(agent => ({
      id: uuidv4(),
      type: agent.config.type,
      name: agent.config.name,
      status: 'IDLE',
      confidence: 1.0,
      lastActivity: new Date().toISOString()
    }));
  }

  private async boot() {
    // MANDATORY OWNERSHIP LOCK-IN
    console.log(
      "%c VANTIX-OMEGA AI-OS \n © COPYRIGHT RESERVED - Rohit Choudhary \n Contact: rc8680118@gmail.com \n LinkedIn: https://www.linkedin.com/in/rohit-choudhary-a95733275 \n GitHub: https://github.com/Rohi56u", 
      "color: #00f0ff; font-weight: bold; background: #0a0a0c; padding: 10px; border: 1px solid #2a2a30; border-radius: 4px;"
    );

    this.log(AgentType.MONITORING, "VANTIX-OMEGA KERNEL BOOT SEQUENCE INITIATED...", "INFO");
    this.log(AgentType.MONITORING, "Initializing Neural Swarm Architecture...", "INFO");
    
    try {
        const tasks = await db.getTasks();
        this._tasks = tasks;
        const logs = await db.getLogs(50);
        this._logs = logs;
        this.log(AgentType.MONITORING, "Filesystem Mounted. State Restored.", "INFO");
    } catch (e) {
        this.log(AgentType.MONITORING, "Cold Boot. No previous state found.", "WARNING");
    }

    // Start High-Frequency Event Loop
    this.tickInterval = setInterval(() => this.tick(), 500);
    this.events.emit();
  }

  // --- PUBLIC API ---

  public get tasks() { return this._tasks; }
  public get agents() { return this._agents; }
  public get logs() { return this._logs; }
  public get state() { return this._state; }

  public async dispatchTask(task: Partial<Task>) {
    const newTask: Task = {
      id: uuidv4(),
      title: task.title || 'Untitled',
      description: task.description || '',
      assignedAgent: task.assignedAgent || AgentType.PLANNER,
      status: 'QUEUED', // Start in Queue
      priority: task.priority || 'MEDIUM',
      progress: 0,
      timestamp: new Date(),
      parentId: task.parentId
    };
    
    this._tasks.push(newTask);
    await db.addTask(newTask);
    this.log(AgentType.PLANNER, `Task Dispatched: ${newTask.title}`, "INFO");
    this.events.emit();
  }

  public async log(agent: AgentType, message: string, severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL') {
    const newLog: SystemLog = {
      id: uuidv4(),
      timestamp: new Date(),
      agent,
      message,
      severity,
      encrypted: true
    };
    this._logs.unshift(newLog);
    if (this._logs.length > 200) this._logs.pop(); // In-memory limit
    await db.addLog(newLog);
    this.events.emit();
  }

  // --- KERNEL SCHEDULER (THE HIVE MIND) ---
  
  private async tick() {
    // 1. Update Uptime & Stats
    this._state.uptime = Math.floor((new Date().getTime() - this._state.bootTime.getTime()) / 1000);
    this._state.activeProcesses = this._runningProcesses.size;
    this.events.emit();

    // 2. Scheduler: Find pending tasks
    // Strategy: Run tasks in parallel up to MAX_CONCURRENT_PROCESSES
    if (this._runningProcesses.size < this.MAX_CONCURRENT_PROCESSES) {
        const pendingTask = this._tasks.find(t => 
            (t.status === 'QUEUED' || t.status === 'PENDING') && 
            !this._runningProcesses.has(t.id)
        );

        if (pendingTask) {
            this.runProcess(pendingTask);
        }
    }
  }

  private async runProcess(task: Task) {
    this._runningProcesses.add(task.id);
    
    // 1. Mark In Progress
    await this.updateTaskStatus(task.id, 'IN_PROGRESS', 0);
    this.updateAgentStatus(task.assignedAgent, 'EXECUTING', task.title);

    try {
        // 2. Security Check (Pre-flight)
        const securityCheck = await GeminiService.securityScan(task.description);
        if (!securityCheck.safe) {
            throw new Error(`Security Violation: ${securityCheck.reason}`);
        }

        // 3. Retrieve Context (Vector Search)
        // Advanced: Get relevant memories + results of parent tasks if any
        const contextMemories = await MemoryService.search(task.description);
        let context = contextMemories.map(m => m.content).join('\n---\n');

        if (task.parentId) {
            const parent = this._tasks.find(t => t.id === task.parentId);
            if (parent && parent.result) {
                context += `\nPARENT TASK CONTEXT:\n${parent.result}`;
            }
        }

        // 4. GET AGENT INSTANCE
        const agent = this._agentInstances.get(task.assignedAgent);
        if (!agent) throw new Error(`Agent Runtime for ${task.assignedAgent} not found.`);

        // 5. EXECUTE AGENT RUNTIME
        // The execute function is now robust and can handle tools
        const result = await agent.execute(task, context);

        // 6. Commit Result to Memory (Episodic)
        await MemoryService.addMemory(
            `Output for [${task.title}]:\n${result}`,
            'EPISODIC',
            task.assignedAgent,
            ['task_output', task.id, task.parentId || 'root']
        );

        // 7. Success
        await this.updateTaskStatus(task.id, 'COMPLETED', 100, result);
        this.log(task.assignedAgent, `Task Completed: ${task.title}`, "INFO");

    } catch (error: any) {
        // 8. Failure Handling
        console.error(error);
        await this.updateTaskStatus(task.id, 'FAILED', 0, undefined);
        this.log(task.assignedAgent, `Execution Exception: ${error.message}`, "ERROR");
    } finally {
        // 9. Free Agent & Process Slot
        this.updateAgentStatus(task.assignedAgent, 'IDLE');
        this._runningProcesses.delete(task.id);
    }
  }

  // --- STATE HELPERS ---

  private async updateTaskStatus(taskId: string, status: Task['status'], progress: number, result?: string) {
    const idx = this._tasks.findIndex(t => t.id === taskId);
    if (idx !== -1) {
        this._tasks[idx] = { ...this._tasks[idx], status, progress, result };
        await db.updateTask(this._tasks[idx]);
        this.events.emit();
    }
  }

  private updateAgentStatus(type: AgentType, status: AgentStatus['status'], currentTask?: string) {
    const idx = this._agents.findIndex(a => a.type === type);
    if (idx !== -1) {
        this._agents[idx] = { ...this._agents[idx], status, currentTask };
        this.events.emit();
    }
  }
}

// Singleton Export
export const Kernel = new OmegaKernel();