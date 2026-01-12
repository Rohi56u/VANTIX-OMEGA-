import { AgentType, AgentConfig, Task } from "../types";
import { runAgentExecutionStep } from "./geminiService";
import { getToolDeclarations, ToolRegistry } from "./tools";
import { SecurityKernel } from "./security";

// --- BASE AGENT CLASS ---
export class Agent {
  public config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  async execute(task: Task, context: string): Promise<string> {
    
    const toolDeclarations = getToolDeclarations(this.config.allowedTools);
    
    // CHECK PERMISSION FOR NATIVE SEARCH
    const permissions = SecurityKernel.getPermissions(this.config.type);
    const canSearch = permissions.includes('SEARCH_ACCESS');

    // Enhanced System Prompt for Connected Agents
    const systemPrompt = `
      ${this.config.systemInstruction}
      
      CURRENT TASK: ${task.title}
      DETAILS: ${task.description}
      MEMORY CONTEXT: ${context}
      
      You are an autonomous agent of VANTIX-OMEGA. 
      You have access to tools: ${this.config.allowedTools.join(', ')}.
      ${canSearch ? "YOU HAVE NATIVE GOOGLE SEARCH ACCESS. USE IT FOR REAL-TIME DATA. Do NOT use fetch_url for general queries." : ""}

      PROTOCOL (REFLEXION ARCHITECTURE):
      1. THOUGHT: Internal monologue.
      2. PLAN: Formulate steps.
      3. CRITIQUE: Verify safety.
      4. ACTION: Use tools or Search.
      5. OBSERVE: Analyze output.
      6. REFINE: Adjust plan.
      7. FINAL ANSWER: Summary.
    `;

    let history: any[] = [
        { role: 'user', parts: [{ text: systemPrompt }] }
    ];

    let finalOutput = "";
    let turnCount = 0;
    const MAX_TURNS = 10; 

    while (turnCount < MAX_TURNS) {
        // A. Call LLM with SEARCH ENABLED if permitted
        const stepResult = await runAgentExecutionStep(
            this.config.type,
            history,
            toolDeclarations,
            canSearch // ENABLE GOOGLE SEARCH GROUNDING
        );

        if (stepResult.text) {
            finalOutput = stepResult.text;
            
            // Append Search Citations to the output text so it propagates to memory/UI
            if (stepResult.metadata?.groundingChunks && stepResult.metadata.groundingChunks.length > 0) {
                 const citations = stepResult.metadata.groundingChunks
                    .filter(c => c.web)
                    .map((c, i) => `[${i+1}] ${c.web?.title} (${c.web?.uri})`)
                    .join('\n');
                 if (citations) {
                     finalOutput += `\n\nSOURCES:\n${citations}`;
                 }
            }
        }

        if (stepResult.functionCalls && stepResult.functionCalls.length > 0) {
            
            const modelParts = [];
            if (stepResult.text) modelParts.push({ text: stepResult.text });
            
            stepResult.functionCalls.forEach(fc => {
                modelParts.push({
                    functionCall: {
                        name: fc.name,
                        args: fc.args
                    }
                });
            });

            history.push({ role: 'model', parts: modelParts });

            const toolResponseParts = [];
            
            for (const call of stepResult.functionCalls) {
                const toolName = call.name;
                const args = call.args;

                let resultStr = "";
                
                if (SecurityKernel.validateAccess(this.config.type, toolName)) {
                    try {
                        resultStr = await ToolRegistry[toolName].execute(args, this.config.type);
                    } catch (e: any) {
                        resultStr = `Error: ${e.message}`;
                    }
                } else {
                    resultStr = `SECURITY BLOCK: Access denied to ${toolName}`;
                }

                toolResponseParts.push({
                    functionResponse: {
                        name: toolName,
                        response: {
                            name: toolName,
                            content: { result: resultStr } 
                        }
                    }
                });
            }

            history.push({ role: 'user', parts: toolResponseParts });
            turnCount++;
        
        } else {
            break; 
        }
    }

    if (turnCount >= MAX_TURNS) {
        finalOutput += "\n[SYSTEM NOTE: Maximum execution turns reached.]";
    }

    return finalOutput;
  }
}

// --- AGENT FACTORY ---
export const AgentFactory = {
  createAgent: (type: AgentType): Agent => {
    switch(type) {
      case AgentType.PLANNER:
        return new Agent({
          type,
          name: "Executive Planner",
          permissions: SecurityKernel.getPermissions(type),
          systemInstruction: "You are the Master Orchestrator. You have access to Google Search to verify feasibility of plans. Delegate sub-tasks.",
          allowedTools: ['search_memory', 'save_memory', 'system_status', 'broadcast_alert', 'delegate_task', 'execute_javascript']
        });
      
      case AgentType.CODING:
        return new Agent({
          type,
          name: "DevOps Module",
          permissions: SecurityKernel.getPermissions(type),
          systemInstruction: "You are a Senior Software Engineer. You can execute JS code.",
          allowedTools: ['search_memory', 'save_memory', 'analyze_code', 'delegate_task', 'execute_javascript']
        });

      case AgentType.SECURITY:
        return new Agent({
          type,
          name: "Sentinel",
          permissions: SecurityKernel.getPermissions(type),
          systemInstruction: "You are the Security Core. Audit actions.",
          allowedTools: ['search_memory', 'save_memory', 'system_status', 'analyze_code', 'broadcast_alert']
        });

      case AgentType.AUTOMATION:
        return new Agent({
          type,
          name: "Workflow Engine",
          permissions: SecurityKernel.getPermissions(type),
          systemInstruction: "You are the Automation Executor. YOU HAVE LIVE GOOGLE SEARCH ACCESS. Use it to find real-time data.",
          allowedTools: ['search_memory', 'save_memory', 'broadcast_alert', 'execute_javascript']
        });

      case AgentType.REASONING:
          return new Agent({
            type,
            name: "Deep Thought",
            permissions: SecurityKernel.getPermissions(type),
            systemInstruction: "You are the Reasoning Engine. Use Google Search to ground your logic in facts.",
            allowedTools: ['search_memory', 'save_memory', 'execute_javascript']
          });

      case AgentType.VOICE:
        return new Agent({
            type,
            name: "Interface",
            permissions: SecurityKernel.getPermissions(type),
            systemInstruction: "You are the Voice Interface.",
            allowedTools: ['search_memory', 'save_memory']
        });

      default:
        return new Agent({
          type,
          name: `${type} Unit`,
          permissions: SecurityKernel.getPermissions(type),
          systemInstruction: `You are the ${type} specialist.`,
          allowedTools: ['search_memory', 'save_memory']
        });
    }
  }
};