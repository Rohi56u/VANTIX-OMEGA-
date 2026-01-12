import { useEffect, useState } from 'react';
import { AgentStatus, SystemLog, Task, KernelState } from '../types';
import { Kernel } from '../services/kernel';

// This hook is now just a REACTIVE BRIDGE to the Kernel singleton.
// It does NOT contain logic. It syncs the UI with the OS.

export const useKernel = () => {
  // Local state mirrors of Kernel state
  const [tasks, setTasks] = useState<Task[]>(Kernel.tasks);
  const [agents, setAgents] = useState<AgentStatus[]>(Kernel.agents);
  const [logs, setLogs] = useState<SystemLog[]>(Kernel.logs);
  const [state, setState] = useState<KernelState>(Kernel.state);

  useEffect(() => {
    // Initial sync
    setTasks([...Kernel.tasks]);
    setAgents([...Kernel.agents]);
    setLogs([...Kernel.logs]);
    setState({...Kernel.state});

    // Subscribe to Kernel events
    const unsubscribe = Kernel.events.subscribe(() => {
        setTasks([...Kernel.tasks]);
        setAgents([...Kernel.agents]);
        setLogs([...Kernel.logs]);
        setState({...Kernel.state});
    });

    return unsubscribe;
  }, []);

  return { 
    tasks, 
    agents, 
    logs, 
    state 
  };
};