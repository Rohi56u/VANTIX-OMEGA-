import React from 'react';
import { AgentStatus, AgentType, SystemLog } from '../types';
import { Activity, BrainCircuit, Code, Eye, Lock, MessageSquare, Server, Layers, Cpu } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

interface DashboardProps {
  agents: AgentStatus[];
  logs: SystemLog[];
}

// Generate dynamic-looking fake data for the visualization
const generateWaveData = () => {
    return Array.from({ length: 30 }, (_, i) => ({
      time: i,
      cpu: 40 + Math.random() * 30,
      memory: 30 + Math.random() * 20,
      network: 10 + Math.random() * 50
    }));
};

const data = generateWaveData();

export const Dashboard: React.FC<DashboardProps> = ({ agents, logs }) => {
  const activeCount = agents.filter(a => a.status === 'EXECUTING' || a.status === 'THINKING').length;
  
  return (
    <div className="grid grid-cols-12 gap-6 h-full">
      
      {/* Main Stats Area */}
      <div className="col-span-12 lg:col-span-8 space-y-6 flex flex-col h-full">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-3 gap-4 shrink-0">
          <StatCard title="Swarm Threads" value={`${activeCount} / 8`} subtitle="Parallel Execution" color="text-omega-accent" icon={<Cpu size={20}/>} />
          <StatCard title="Memory Vector" value="EMBEDDING" subtitle="768-Dim Space" color="text-purple-400" icon={<BrainCircuit size={20}/>} />
          <StatCard title="Kernel Status" value="OPTIMAL" subtitle="Self-Healing: ON" color="text-omega-success" icon={<Activity size={20}/>} />
        </div>

        {/* Neural Activity Graph - The "Hologram" */}
        <div className="bg-omega-panel border border-omega-border rounded-lg p-4 flex-1 min-h-[250px] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-omega-accent to-transparent opacity-50 animate-pulse"></div>
          <h3 className="text-sm font-mono text-gray-400 mb-4 flex items-center gap-2 z-10 relative">
            <Activity size={14} /> REAL_TIME_NEURAL_LOAD
          </h3>
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#00f0ff 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#00f0ff" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(19, 19, 22, 0.9)', borderColor: '#2a2a30', backdropFilter: 'blur(4px)' }} 
                itemStyle={{ color: '#00f0ff', fontFamily: 'monospace' }}
              />
              <Area type="monotone" dataKey="cpu" stroke="#00f0ff" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
              <Area type="monotone" dataKey="network" stroke="#a855f7" fillOpacity={1} fill="url(#colorMem)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          {agents.map(agent => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Side Panel - Logs & Status */}
      <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 h-full">
        <div className="bg-omega-panel border border-omega-border rounded-lg p-4 flex-1 flex flex-col h-full overflow-hidden">
          <h3 className="text-sm font-mono text-gray-400 mb-4 flex items-center gap-2 shrink-0">
            <Server size={14} /> KERNEL_STREAM
          </h3>
          <div className="flex-1 overflow-auto space-y-2 font-mono text-xs pr-2 scrollbar-hide">
            {logs.length === 0 && <span className="text-gray-600 italic">No activity recorded.</span>}
            {logs.map((log) => (
              <div key={log.id} className="flex gap-2 items-start border-l-2 border-omega-border pl-2 py-1 animate-in slide-in-from-left-2 duration-300">
                <span className="text-gray-500 whitespace-nowrap text-[10px] opacity-70">[{log.timestamp.toLocaleTimeString()}]</span>
                <div className="flex flex-col">
                  <span className={`font-bold ${
                    log.severity === 'ERROR' || log.severity === 'CRITICAL' ? 'text-omega-danger' : 
                    log.severity === 'WARNING' ? 'text-omega-warning' : 'text-omega-accent'
                  }`}>
                    {log.agent}
                  </span>
                  <span className="text-gray-300 break-words leading-tight">{log.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ title: string; value: string; subtitle: string; color: string; icon: React.ReactNode }> = ({ title, value, subtitle, color, icon }) => (
  <div className="bg-omega-panel border border-omega-border rounded-lg p-4 relative overflow-hidden group hover:border-omega-accent/30 transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.1)]">
    <div className="relative z-10">
      <div className="flex justify-between items-start">
        <h4 className="text-xs font-mono text-gray-500 uppercase">{title}</h4>
        <span className={`${color} opacity-80`}>{icon}</span>
      </div>
      <div className={`text-2xl font-bold font-mono mt-2 ${color} tracking-tighter`}>{value}</div>
      <div className="text-[10px] text-gray-600 mt-1 uppercase tracking-wide">{subtitle}</div>
    </div>
    <div className={`absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity ${color} scale-150 transform rotate-12`}>
      <Layers size={80} />
    </div>
  </div>
);

const AgentCard: React.FC<{ agent: AgentStatus }> = ({ agent }) => {
  const getIcon = (type: AgentType) => {
    switch (type) {
      case AgentType.PLANNER: return <BrainCircuit size={18} />;
      case AgentType.CODING: return <Code size={18} />;
      case AgentType.SECURITY: return <Lock size={18} />;
      case AgentType.VISION: return <Eye size={18} />;
      case AgentType.VOICE: return <MessageSquare size={18} />;
      default: return <Activity size={18} />;
    }
  };

  const isActive = agent.status === 'EXECUTING' || agent.status === 'THINKING';

  return (
    <div className={`bg-omega-panel border rounded-lg p-3 transition-all relative overflow-hidden ${
        isActive ? 'border-omega-accent/50 shadow-[0_0_10px_rgba(0,240,255,0.1)]' : 'border-omega-border hover:bg-white/5'
    }`}>
      {isActive && <div className="absolute top-0 right-0 w-2 h-2 bg-omega-accent rounded-bl animate-pulse shadow-[0_0_5px_#00f0ff]" />}
      <div className="flex justify-between items-start mb-2">
        <span className={isActive ? 'text-omega-accent' : 'text-gray-500'}>{getIcon(agent.type)}</span>
        <div className={`text-[9px] font-mono border px-1 rounded uppercase ${
          agent.status === 'EXECUTING' ? 'border-omega-success text-omega-success bg-omega-success/10' : 
          agent.status === 'THINKING' ? 'border-omega-warning text-omega-warning bg-omega-warning/10' :
          'border-gray-700 text-gray-600'
        }`}>
          {agent.status}
        </div>
      </div>
      <h4 className="text-sm font-bold text-gray-200 truncate">{agent.name}</h4>
      <div className="mt-2 text-[9px] font-mono text-gray-500 flex justify-between">
        <span>TASK: {agent.currentTask ? agent.currentTask.substring(0, 10) + '...' : 'IDLE'}</span>
      </div>
      {isActive && (
          <div className="w-full bg-gray-800 h-0.5 mt-2 overflow-hidden rounded-full">
            <div className="h-full bg-omega-accent animate-progress-indeterminate" />
          </div>
      )}
    </div>
  );
};