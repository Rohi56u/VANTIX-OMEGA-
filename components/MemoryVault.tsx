import React, { useState, useEffect } from 'react';
import { MemoryEntry } from '../types';
import { Database, Lock, Search, FileKey, RefreshCw, Trash2 } from 'lucide-react';
import { MemoryService } from '../services/memoryService';

export const MemoryVault: React.FC = () => {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchMemories = async () => {
        if (searchQuery) {
            const results = await MemoryService.search(searchQuery);
            setMemories(results);
        } else {
            const results = await MemoryService.getAll();
            setMemories(results);
        }
    };
    fetchMemories();
  }, [searchQuery, refreshTrigger]);

  const handleClear = async () => {
    if(confirm('WARNING: IRREVERSIBLE ACTION. WIPE ALL SYSTEM MEMORY?')) {
        await MemoryService.clearMemory();
        setRefreshTrigger(prev => prev + 1);
    }
  }

  const handleRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
  }

  return (
    <div className="h-full flex flex-col gap-6">
      
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-omega-panel border border-omega-border flex items-center gap-4">
           <div className="p-3 bg-omega-success/10 text-omega-success rounded-full"><Lock size={24} /></div>
           <div>
             <div className="text-xs font-mono text-gray-500">ENCRYPTION</div>
             <div className="text-lg font-bold text-gray-200">AES-256 GCM</div>
           </div>
        </div>
        <div className="p-4 rounded-lg bg-omega-panel border border-omega-border flex items-center gap-4">
           <div className="p-3 bg-purple-500/10 text-purple-400 rounded-full"><Database size={24} /></div>
           <div>
             <div className="text-xs font-mono text-gray-500">VECTOR INDEX</div>
             <div className="text-lg font-bold text-gray-200">{memories.length} ENTRIES</div>
           </div>
        </div>
        <div className="p-4 rounded-lg bg-omega-panel border border-omega-border flex items-center gap-4">
           <div className="p-3 bg-omega-accent/10 text-omega-accent rounded-full"><FileKey size={24} /></div>
           <div>
             <div className="text-xs font-mono text-gray-500">ZERO-TRUST</div>
             <div className="text-lg font-bold text-gray-200">ACTIVE</div>
           </div>
        </div>
      </div>

      <div className="flex-1 bg-omega-panel border border-omega-border rounded-lg overflow-hidden flex flex-col">
         <div className="p-4 border-b border-omega-border flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2 text-gray-300">
               <Database size={16} /> CORE_MEMORY_DUMP (INDEXED_DB)
            </h3>
            <div className="flex items-center gap-2">
                <div className="relative">
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search memory..." 
                    className="bg-black border border-omega-border rounded px-3 py-1 pl-8 text-sm text-gray-300 w-64 focus:border-omega-accent focus:outline-none"
                />
                <Search size={14} className="absolute left-2.5 top-2 text-gray-500" />
                </div>
                <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-white rounded border border-transparent hover:border-gray-700"><RefreshCw size={16} /></button>
                <button onClick={handleClear} className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20"><Trash2 size={16} /></button>
            </div>
         </div>
         
         <div className="flex-1 overflow-auto p-0">
           <table className="w-full text-left text-sm">
             <thead className="bg-black/20 text-xs font-mono text-gray-500 border-b border-omega-border">
               <tr>
                 <th className="p-3 font-normal w-24">TIMESTAMP</th>
                 <th className="p-3 font-normal w-24">TYPE</th>
                 <th className="p-3 font-normal w-24">ORIGIN</th>
                 <th className="p-3 font-normal">CONTENT (DECRYPTED)</th>
                 <th className="p-3 font-normal w-32">TAGS</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-omega-border/50">
               {memories.length === 0 && (
                   <tr>
                       <td colSpan={5} className="p-8 text-center text-gray-500 font-mono italic">
                           NO MEMORY FRAGMENTS FOUND.
                       </td>
                   </tr>
               )}
               {memories.map(mem => (
                 <tr key={mem.id} className="hover:bg-white/5 transition-colors">
                   <td className="p-3 font-mono text-gray-500 text-[10px]">{new Date(mem.timestamp).toLocaleTimeString()}</td>
                   <td className="p-3">
                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                       mem.type === 'SEMANTIC' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                       mem.type === 'EPISODIC' ? 'border-orange-500/30 text-orange-400 bg-orange-500/10' :
                       'border-green-500/30 text-green-400 bg-green-500/10'
                     }`}>
                       {mem.type}
                     </span>
                   </td>
                   <td className="p-3 font-mono text-omega-accent text-xs">{mem.agentOrigin}</td>
                   <td className="p-3 text-gray-300 font-mono text-xs whitespace-pre-wrap">{mem.content}</td>
                   <td className="p-3">
                     <div className="flex flex-wrap gap-1">
                       {mem.tags.map(t => (
                         <span key={t} className="text-[10px] bg-gray-800 text-gray-400 px-1 rounded">#{t}</span>
                       ))}
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
      </div>

    </div>
  );
};