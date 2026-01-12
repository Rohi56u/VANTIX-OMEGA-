import { AgentType, Permission, AgentConfig } from "../types";
import { ToolRegistry } from "./tools";

// --- RBAC CONFIGURATION ---
const AGENT_PERMISSIONS: Record<AgentType, Permission[]> = {
  [AgentType.PLANNER]: ['READ_MEMORY', 'WRITE_MEMORY', 'SYSTEM_CONTROL', 'EXECUTE_CODE', 'SEARCH_ACCESS'],
  [AgentType.REASONING]: ['READ_MEMORY', 'WRITE_MEMORY', 'EXECUTE_CODE', 'SEARCH_ACCESS'],
  [AgentType.CODING]: ['READ_MEMORY', 'EXECUTE_CODE', 'WRITE_MEMORY'],
  [AgentType.AUTOMATION]: ['READ_MEMORY', 'WRITE_MEMORY', 'NETWORK_ACCESS', 'EXECUTE_CODE', 'SEARCH_ACCESS'],
  [AgentType.SECURITY]: ['READ_MEMORY', 'WRITE_MEMORY', 'SYSTEM_CONTROL', 'NETWORK_ACCESS', 'EXECUTE_CODE'],
  [AgentType.VOICE]: ['AUDIO_IO', 'READ_MEMORY'],
  [AgentType.VISION]: ['READ_MEMORY'],
  [AgentType.MEMORY]: ['READ_MEMORY', 'WRITE_MEMORY'],
  [AgentType.MONITORING]: ['READ_MEMORY', 'SYSTEM_CONTROL']
};

export class SecurityKernel {
  
  static validateAccess(agentType: AgentType, toolName: string): boolean {
    const tool = ToolRegistry[toolName];
    if (!tool) return false; // Unknown tool
    
    const required = tool.requiredPermissions;
    const held = AGENT_PERMISSIONS[agentType] || [];

    // Check if agent has ALL required permissions for this tool
    const hasAccess = required.every(perm => held.includes(perm));
    
    if (!hasAccess) {
        console.warn(`SECURITY VIOLATION: Agent [${agentType}] attempted to access [${toolName}] without permissions.`);
    }

    return hasAccess;
  }

  static getPermissions(agentType: AgentType): Permission[] {
      return AGENT_PERMISSIONS[agentType] || [];
  }
}