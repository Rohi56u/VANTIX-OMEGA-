import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { HolographicHud } from './components/HolographicHud'; // Replaces Dashboard as main view
import { CommandCenter } from './components/CommandCenter';
import { WorkflowBuilder } from './components/WorkflowBuilder';
import { MemoryVault } from './components/MemoryVault';
import { AgentType, Task, View } from './types';
import { useKernel } from './hooks/useKernel';
import { Kernel } from './services/kernel';
import { LiveClient } from './services/liveClient';
import { Dashboard } from './components/Dashboard'; // Keep old dashboard as secondary view if needed, or remove.

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const { tasks, agents, logs, state } = useKernel();
  
  // Live Client State
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [liveVolume, setLiveVolume] = useState(0);
  const liveClientRef = useRef<LiveClient | null>(null);

  useEffect(() => {
    // Initialize Live Client
    liveClientRef.current = new LiveClient((vol) => setLiveVolume(vol));
    return () => {
      liveClientRef.current?.disconnect();
    };
  }, []);

  const toggleLiveSession = async () => {
    if (isLiveActive) {
      liveClientRef.current?.disconnect();
      setIsLiveActive(false);
    } else {
      try {
        await liveClientRef.current?.connect();
        setIsLiveActive(true);
      } catch (e) {
        console.error("Failed to connect live", e);
        Kernel.log(AgentType.VOICE, "Connection Failed: Check API Key/Network", "ERROR");
      }
    }
  };

  const handleNewTasks = (newTasks: Partial<Task>[]) => {
    newTasks.forEach(t => Kernel.dispatchTask(t));
  };

  const handleLog = (agent: AgentType, message: string, severity: 'INFO' | 'WARNING' | 'ERROR') => {
    Kernel.log(agent, message, severity);
  };

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView} systemHealth={state ? (100 - (state.activeProcesses * 5)) : 100}>
      
      {/* VIEW 1: LIVE CORE (The New Dashboard) */}
      {currentView === View.DASHBOARD && (
        <div className="h-full flex flex-col lg:flex-row gap-6 p-4">
            {/* Left: The Hologram */}
            <div className="flex-1 min-h-[400px]">
                <HolographicHud 
                    isActive={isLiveActive} 
                    onToggle={toggleLiveSession}
                    volumeLevel={liveVolume}
                    systemStatus={state.activeProcesses > 0 ? "PROCESSING SWARM" : "AWAITING INPUT"}
                />
            </div>
            
            {/* Right: Agent Status Grid (Compact) */}
            <div className="lg:w-1/3 flex flex-col gap-4">
               {agents.slice(0, 4).map(agent => (
                  <div key={agent.id} className="bg-black/40 border border-omega-border p-3 rounded-lg flex items-center justify-between">
                     <span className="font-mono text-xs text-omega-accent">{agent.name}</span>
                     <span className={`text-[10px] px-2 py-0.5 rounded ${agent.status === 'EXECUTING' ? 'bg-omega-success/20 text-omega-success' : 'text-gray-500'}`}>
                        {agent.status}
                     </span>
                  </div>
               ))}
               <div className="flex-1 bg-black/40 border border-omega-border rounded-lg p-4 overflow-hidden flex flex-col">
                  <div className="text-xs font-mono text-gray-500 mb-2">LIVE TRANSCRIPT</div>
                  <div className="flex-1 overflow-auto text-xs text-gray-300 font-mono space-y-2">
                     {logs.filter(l => l.agent === AgentType.VOICE).map(l => (
                         <div key={l.id} className="border-l border-omega-accent pl-2">
                             {l.message}
                         </div>
                     ))}
                  </div>
               </div>
            </div>
        </div>
      )}

      {/* OTHER VIEWS */}
      {currentView === View.COMMAND && <CommandCenter onNewTask={handleNewTasks} onLog={handleLog} />}
      {currentView === View.WORKFLOW && <WorkflowBuilder />}
      {currentView === View.MEMORY && <MemoryVault />}
    </Layout>
  );
};

export default App;