import React, { useState } from 'react';
import { Workflow, WorkflowNode, AgentType } from '../types';
import { Plus, Play, MoreHorizontal, GitBranch, Zap, Box, Trash2, CheckCircle, PauseCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Kernel } from '../services/kernel';

const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1',
    name: 'Morning Digest',
    active: true,
    nodes: [
      { id: 'n1', label: 'Every Day at 8:00 AM', type: 'TRIGGER', config: { cron: '0 8 * * *' } },
      { id: 'n2', label: 'Scrape Tech News', type: 'ACTION', config: { source: 'rss' } },
      { id: 'n3', label: 'Summarize with LLM', type: 'ACTION', config: { model: 'gemini-3-flash' } },
      { id: 'n4', label: 'Send via Telegram', type: 'ACTION', config: { chatId: 'me' } }
    ]
  },
  {
    id: 'wf-2',
    name: 'Competitor Watch',
    active: false,
    nodes: [
      { id: 'n1', label: 'On New Tweet from @Competitor', type: 'TRIGGER', config: { handle: '@competitor' } },
      { id: 'n2', label: 'Analyze Sentiment', type: 'ACTION', config: {} },
      { id: 'n3', label: 'Log to Database', type: 'ACTION', config: {} }
    ]
  }
];

export const WorkflowBuilder: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>(MOCK_WORKFLOWS);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(MOCK_WORKFLOWS[0].id);

  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);

  // --- ACTIONS ---

  const handleNewWorkflow = () => {
    const newWf: Workflow = {
      id: uuidv4(),
      name: `Untitled Workflow ${workflows.length + 1}`,
      active: false,
      nodes: [
        { id: uuidv4(), label: 'Manual Trigger', type: 'TRIGGER', config: {} }
      ]
    };
    setWorkflows([...workflows, newWf]);
    setSelectedWorkflowId(newWf.id);
  };

  const handleToggleActive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkflows(prev => prev.map(w => 
      w.id === id ? { ...w, active: !w.active } : w
    ));
  };

  const handleAddNode = () => {
    if (!selectedWorkflow) return;
    const newNode: WorkflowNode = {
      id: uuidv4(),
      label: 'New Action',
      type: 'ACTION',
      config: {}
    };
    const updatedWf = {
      ...selectedWorkflow,
      nodes: [...selectedWorkflow.nodes, newNode]
    };
    setWorkflows(prev => prev.map(w => w.id === selectedWorkflow.id ? updatedWf : w));
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!selectedWorkflow) return;
    const updatedWf = {
      ...selectedWorkflow,
      nodes: selectedWorkflow.nodes.filter(n => n.id !== nodeId)
    };
    setWorkflows(prev => prev.map(w => w.id === selectedWorkflow.id ? updatedWf : w));
  };

  const handleRunWorkflow = () => {
    if (!selectedWorkflow) return;
    
    // DISPATCH TO KERNEL
    const description = `Execute Workflow: ${selectedWorkflow.name}. Steps: ${selectedWorkflow.nodes.map(n => n.label).join(' -> ')}`;
    
    Kernel.dispatchTask({
      title: `Workflow: ${selectedWorkflow.name}`,
      description: description,
      assignedAgent: AgentType.AUTOMATION,
      priority: 'HIGH'
    });

    // Visual Feedback
    alert(`Workflow "${selectedWorkflow.name}" dispatched to Kernel Execution Queue.`);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'TRIGGER': return <Zap size={16} className="text-omega-warning" />;
      case 'ACTION': return <Box size={16} className="text-omega-accent" />;
      case 'CONDITION': return <GitBranch size={16} className="text-purple-400" />;
      default: return <Box size={16} />;
    }
  };

  return (
    <div className="h-full flex gap-6">
      {/* Sidebar List */}
      <div className="w-64 flex flex-col gap-4">
        <button 
          onClick={handleNewWorkflow}
          className="w-full py-2 bg-omega-accent/10 border border-omega-accent/30 text-omega-accent rounded hover:bg-omega-accent/20 transition-all text-sm font-bold flex items-center justify-center gap-2"
        >
          <Plus size={16} /> NEW AUTOMATION
        </button>
        
        <div className="space-y-2 overflow-auto max-h-[calc(100vh-200px)]">
          {workflows.map(wf => (
            <div 
              key={wf.id} 
              onClick={() => setSelectedWorkflowId(wf.id)}
              className={`p-3 rounded border cursor-pointer transition-all flex items-center justify-between group ${
                selectedWorkflowId === wf.id 
                ? 'bg-omega-panel border-omega-accent/50 text-white' 
                : 'bg-black/20 border-omega-border text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                 <button onClick={(e) => handleToggleActive(wf.id, e)}>
                    {wf.active 
                      ? <CheckCircle size={14} className="text-omega-success" /> 
                      : <PauseCircle size={14} className="text-gray-600" />
                    }
                 </button>
                 <span className="text-sm font-medium truncate w-32">{wf.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor Canvas Area */}
      <div className="flex-1 bg-black/40 border border-omega-border rounded-lg p-8 relative overflow-hidden flex flex-col">
         {/* Background Grid */}
         <div className="absolute inset-0 opacity-10 pointer-events-none" 
              style={{ 
                  backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', 
                  backgroundSize: '20px 20px' 
              }} 
         />

         {selectedWorkflow ? (
           <div className="relative z-10 max-w-2xl mx-auto w-full space-y-4 flex-1 overflow-auto pb-20">
             <div className="flex justify-between items-center mb-8 border-b border-omega-border pb-4">
               <div>
                  <h2 className="text-xl font-bold text-white">{selectedWorkflow.name}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-1">ID: {selectedWorkflow.id} // NODES: {selectedWorkflow.nodes.length}</p>
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={handleRunWorkflow}
                   className="flex items-center gap-2 px-4 py-2 bg-omega-success/10 text-omega-success border border-omega-success/20 rounded hover:bg-omega-success/20 transition-all font-bold text-sm"
                 >
                   <Play size={16} /> RUN
                 </button>
                 <button className="p-2 text-gray-400 hover:bg-white/10 rounded border border-transparent hover:border-gray-700"><MoreHorizontal size={20} /></button>
               </div>
             </div>

             {/* Linear Flow Visualization */}
             <div className="space-y-6">
                {selectedWorkflow.nodes.map((node, index) => (
                  <div key={node.id} className="relative">
                    <div className="bg-omega-panel border border-omega-border p-4 rounded-lg flex items-center gap-4 hover:border-omega-accent/50 transition-colors group">
                       <div className={`p-2 rounded bg-black/40 ${
                         node.type === 'TRIGGER' ? 'text-omega-warning' : 'text-omega-accent'
                       }`}>
                         {getNodeIcon(node.type)}
                       </div>
                       <div className="flex-1">
                          <div className="text-xs font-mono text-gray-500 mb-0.5">{node.type}</div>
                          <div className="text-sm font-semibold text-gray-200">{node.label}</div>
                       </div>
                       <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
                          <button 
                            onClick={() => handleDeleteNode(node.id)}
                            className="p-2 text-gray-500 hover:text-omega-danger hover:bg-omega-danger/10 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                    </div>
                    {/* Connector Line */}
                    {index < selectedWorkflow.nodes.length - 1 && (
                      <div className="absolute left-8 -bottom-6 w-0.5 h-6 bg-omega-border" />
                    )}
                  </div>
                ))}

                {/* Add Node Placeholder */}
                <div className="flex justify-center pt-2">
                   <button 
                     onClick={handleAddNode}
                     className="p-2 rounded-full border border-dashed border-gray-600 text-gray-600 hover:text-omega-accent hover:border-omega-accent transition-all"
                   >
                      <Plus size={16} />
                   </button>
                </div>
             </div>
           </div>
         ) : (
           <div className="h-full flex items-center justify-center text-gray-500 font-mono">
             SELECT OR CREATE A WORKFLOW
           </div>
         )}
      </div>
    </div>
  );
};