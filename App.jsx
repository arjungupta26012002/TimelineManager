import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, X, Calendar, ChevronLeft, ChevronRight, User, MoreHorizontal, Check,
  Pencil, FolderOpen, FileText, Download, LayoutDashboard, Trello, Settings,
  LogOut, PieChart, AlertCircle, Clock, Lightbulb, ArrowRight, ArrowLeft, Trash2,
  Rocket, Eye, EyeOff, Target, Share2, Instagram, Youtube, Twitter, Video, Image as ImageIcon
} from 'lucide-react';

// --- AZURE IMPORTS ---
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';

// Use serverless API (Azure Functions) under `/api` to interact with Cosmos DB.
const API_BASE = '/api';

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}/${path}`, opts);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(txt || `${res.status} ${res.statusText}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return null;
}

const api = {
  getTasks: (userId) => apiFetch(`tasks?userId=${encodeURIComponent(userId)}`),
  upsertTask: (item) => apiFetch('tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }),
  deleteTask: (id, userId) => fetch(`${API_BASE}/tasks/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  getIdeas: (userId) => apiFetch(`ideas?userId=${encodeURIComponent(userId)}`),
  upsertIdea: (item) => apiFetch('ideas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) }),
  deleteIdea: (id, userId) => fetch(`${API_BASE}/ideas/${encodeURIComponent(id)}?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' }),

  getArtists: (userId) => apiFetch(`artists?userId=${encodeURIComponent(userId)}`),
  upsertArtists: (payload) => apiFetch('artists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
};

// --- HELPER FUNCTIONS ---

const normalizeDate = (date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return new Date(); 
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const getRelativeDate = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d;
};

const getPositionStyles = (startDate, endDate, viewStart, viewEnd) => {
  const start = normalizeDate(startDate).getTime();
  const end = normalizeDate(endDate).getTime();
  const vStart = normalizeDate(viewStart).getTime();
  const vEnd = normalizeDate(viewEnd).getTime();

  const totalDuration = vEnd - vStart;
  
  let relativeStart = (start - vStart) / totalDuration;
  let relativeDuration = (end - start) / totalDuration;

  if (relativeStart > 1 || (relativeStart + relativeDuration) < 0) {
     return { display: 'none' };
  }

  if (relativeStart < 0) {
    relativeDuration += relativeStart;
    relativeStart = 0;
  }

  const widthPercent = Math.max(0, relativeDuration * 100);
  
  return {
    left: `${relativeStart * 100}%`,
    width: `${widthPercent}%`
  };
};

// --- DATA & CONSTANTS ---

const COLOR_MAP = {
  green: { pale: 'bg-emerald-200', vivid: 'bg-emerald-500' },
  yellow: { pale: 'bg-amber-200', vivid: 'bg-amber-500' },
  red: { pale: 'bg-rose-200', vivid: 'bg-rose-600' },
  blue: { pale: 'bg-sky-200', vivid: 'bg-sky-500' },
  orange: { pale: 'bg-orange-200', vivid: 'bg-orange-500' },
  purple: { pale: 'bg-purple-200', vivid: 'bg-purple-500' },
  social: { pale: 'bg-violet-200', vivid: 'bg-violet-600' }
};

const RETAIL_CYCLES = [
    { 
      name: "Summer Readiness", 
      startMonth: 0, 
      endMonth: 2, 
      color: "bg-yellow-50", 
      dot: "bg-yellow-400",
      textColor: "text-yellow-700",
      targetDates: ["Memorial Day", "Father's Day", "Summer Travel"]
    }, 
    { 
      name: "Back-to-School & Harvest", 
      startMonth: 3, 
      endMonth: 5, 
      color: "bg-orange-50", 
      dot: "bg-orange-400",
      textColor: "text-orange-700",
      targetDates: ["Back to School", "Labor Day", "Halloween Prep"]
    }, 
    { 
      name: "Holiday Gifting", 
      startMonth: 6, 
      endMonth: 8, 
      color: "bg-blue-50", 
      dot: "bg-blue-400",
      textColor: "text-blue-700",
      targetDates: ["Black Friday", "Cyber Monday", "Christmas", "Hanukkah"]
    }, 
    { 
      name: "Spring & Love", 
      startMonth: 9, 
      endMonth: 11, 
      color: "bg-pink-50", 
      dot: "bg-pink-400",
      textColor: "text-pink-700",
      targetDates: ["New Year's", "Valentine's Day", "Mother's Day"]
    }, 
];

const INITIAL_ARTISTS = ['Salini', 'Jeki'];

const SEED_TASKS = [
  {
    id: 'seed-1',
    type: 'project',
    artist: 'Salini',
    name: 'Xmas Guide',
    briefing: 'Main campaign visual.',
    folderUrl: '',
    startDate: getRelativeDate(-5),
    deadline: getRelativeDate(20),
    phases: [
      { id: 'p1', name: 'Draft', endDate: getRelativeDate(0), color: 'green', progress: 100 },
      { id: 'p2', name: 'Refine', endDate: getRelativeDate(10), color: 'yellow', progress: 40 },
      { id: 'p3', name: 'Final', endDate: getRelativeDate(20), color: 'red', progress: 0 },
    ]
  },
  {
    id: 'seed-social-1',
    type: 'social',
    platform: 'Instagram',
    artist: 'Salini',
    name: 'Xmas Teaser Reel',
    briefing: '15s animation for IG Story',
    folderUrl: '',
    startDate: getRelativeDate(5),
    deadline: getRelativeDate(12),
    phases: [
        { id: 'sp1', name: 'Production', endDate: getRelativeDate(12), color: 'social', progress: 20 }
    ]
  }
];

// --- COMPONENTS ---

const Sidebar = ({ activeTab, onNavigate }) => (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full flex-shrink-0">
      <div className="p-6 border-b border-gray-800">
        <div className="text-xl font-bold tracking-wider flex items-center gap-2">
          <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center font-black">S</div>
          STUDIO
        </div>
        <div className="text-xs text-gray-500 mt-1 uppercase tracking-widest">Portal v3.0</div>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <button onClick={() => onNavigate('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <LayoutDashboard size={20} /><span className="font-medium">Dashboard</span>
        </button>
        <button onClick={() => onNavigate('timeline')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'timeline' ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <Trello size={20} /><span className="font-medium">Schedule</span>
        </button>
        <button onClick={() => onNavigate('social')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'social' ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <Share2 size={20} /><span className="font-medium">Social Media</span>
        </button>
        <button onClick={() => onNavigate('pipeline')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'pipeline' ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <Lightbulb size={20} /><span className="font-medium">Idea Lab</span>
        </button>
        <button onClick={() => onNavigate('strategy')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'strategy' ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
          <Target size={20} /><span className="font-medium">Strategy</span>
        </button>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"><User size={14} className="text-gray-400" /></div>
            <div className="flex-1 overflow-hidden"><div className="text-sm font-medium truncate">Studio User</div><div className="text-xs text-gray-500 truncate">Online</div></div>
        </div>
      </div>
    </div>
);

// --- SOCIAL TASK MODAL ---
const SocialTaskModal = ({ isOpen, onClose, onSave, artists, onAddArtist, initialData }) => {
    const [formData, setFormData] = useState({
        name: '',
        artist: '',
        platform: 'Instagram',
        type: 'Animation',
        briefing: '',
        folderUrl: '',
        startDate: formatDateForInput(new Date()),
        deadline: ''
    });
    const [newArtistName, setNewArtistName] = useState('');
    const [isAddingArtist, setIsAddingArtist] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                let cleanName = initialData.name;
                const platformPrefix = `${initialData.platform}: `;
                if (cleanName.startsWith(platformPrefix)) cleanName = cleanName.substring(platformPrefix.length);
                setFormData({
                    name: cleanName,
                    artist: initialData.artist,
                    platform: initialData.platform || 'Instagram',
                    type: 'Animation',
                    briefing: initialData.briefing,
                    folderUrl: initialData.folderUrl || '',
                    startDate: formatDateForInput(initialData.startDate),
                    deadline: formatDateForInput(initialData.deadline)
                });
            } else {
                setFormData({
                    name: '',
                    artist: artists[0] || '',
                    platform: 'Instagram',
                    type: 'Animation',
                    briefing: '',
                    folderUrl: '',
                    startDate: formatDateForInput(new Date()),
                    deadline: ''
                });
            }
        }
    }, [isOpen, initialData, artists]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        const safeStartDate = formData.startDate ? new Date(formData.startDate) : new Date();
        const safeDeadline = formData.deadline ? new Date(formData.deadline) : safeStartDate;

        const newTask = {
            id: initialData ? initialData.id : String(Date.now()),
            type: 'social',
            artist: formData.artist || 'Unassigned',
            name: `${formData.platform}: ${formData.name}`,
            briefing: formData.briefing,
            startDate: safeStartDate,
            deadline: safeDeadline,
            platform: formData.platform,
            folderUrl: formData.folderUrl,
            phases: initialData ? initialData.phases : [{
                id: `sp-${Date.now()}`,
                name: 'Production',
                color: 'social',
                progress: 0,
                endDate: safeDeadline
            }]
        };
        if (newTask.phases.length > 0) newTask.phases[0].endDate = safeDeadline;
        onSave(newTask);
        onClose();
    };

    const saveNewArtist = () => { 
        if(newArtistName) { 
            onAddArtist(newArtistName); 
            setFormData({...formData, artist: newArtistName}); 
            setNewArtistName(''); 
            setIsAddingArtist(false); 
        } 
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border-4 border-violet-100">
                <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Share2 size={20} className="text-violet-600" />{initialData ? 'Edit Asset' : 'Request Asset'}</h3><button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600" /></button></div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Platform</label><select className="w-full rounded-lg border-gray-200 p-2 bg-gray-50" value={formData.platform} onChange={e => setFormData({...formData, platform: e.target.value})}><option>Instagram</option><option>TikTok</option><option>YouTube</option><option>Twitter/X</option><option>LinkedIn</option></select></div>
                        <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Format</label><select className="w-full rounded-lg border-gray-200 p-2 bg-gray-50" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option>Animation</option><option>Static Image</option><option>Video Edit</option><option>Carousel</option></select></div>
                    </div>
                    <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Asset Name</label><input type="text" className="w-full rounded-lg border-gray-200 p-2 bg-gray-50 focus:ring-2 focus:ring-violet-400" placeholder="e.g. Black Friday Teaser" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Folder URL</label><input type="url" className="w-full rounded-lg border-gray-200 p-2 bg-gray-50 focus:ring-2 focus:ring-violet-400" placeholder="https://..." value={formData.folderUrl} onChange={e => setFormData({...formData, folderUrl: e.target.value})} /></div>
                    <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Briefing / Notes</label><textarea rows={3} className="w-full rounded-lg border-gray-200 p-2 bg-gray-50 resize-none focus:ring-2 focus:ring-violet-400" value={formData.briefing} onChange={e => setFormData({...formData, briefing: e.target.value})} /></div>
                    <div className="bg-violet-50 p-3 rounded-xl border border-violet-100">
                        <label className="block text-xs font-bold uppercase text-violet-800 mb-2">Assignment</label>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Resource</label>
                                <div className="flex gap-2">
                                    {!isAddingArtist ? (
                                        <select className="w-full rounded-lg border-white p-2 text-sm shadow-sm" value={formData.artist} onChange={e => { if (e.target.value === 'ADD_NEW') setIsAddingArtist(true); else setFormData({...formData, artist: e.target.value}); }}>
                                            <option value="">-- Select Resource --</option>{artists.map(a => <option key={a} value={a}>{a}</option>)}
                                            <option value="ADD_NEW">+ Add Resource</option>
                                        </select>
                                    ) : (
                                        <div className="flex gap-2 flex-1">
                                            <input autoFocus type="text" placeholder="Name" className="flex-1 rounded-lg border-white p-2 text-sm shadow-sm" value={newArtistName} onChange={(e) => setNewArtistName(e.target.value)} />
                                            <button onClick={saveNewArtist} className="bg-white p-2 rounded-lg shadow-sm hover:bg-gray-50 text-green-600"><Check size={18} /></button>
                                            <button onClick={() => setIsAddingArtist(false)} className="bg-white p-2 rounded-lg shadow-sm hover:bg-gray-50 text-red-500"><X size={18} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Start</label><input type="date" className="w-full rounded-lg border-white p-1 text-sm shadow-sm" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} /></div>
                                <div><label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Due</label><input type="date" className="w-full rounded-lg border-white p-1 text-sm shadow-sm" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} /></div>
                            </div>
                        </div>
                    </div>
                    <button onClick={handleSubmit} disabled={!formData.name || !formData.artist || !formData.deadline} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">{initialData ? 'Update Asset' : 'Schedule to Timeline'}</button>
                </div>
            </div>
        </div>
    );
};

// --- TASK FORM ---
const TaskForm = ({ isOpen, onClose, onSave, artists, onAddArtist, initialData, prefillData }) => {
  const [formData, setFormData] = useState({
    artist: '',
    taskName: '',
    briefing: '',
    folderUrl: '',
    startDate: formatDateForInput(new Date()),
    deadline: '',
    phases: [{ endDate: '', name: 'Phase 1', progress: 0 }]
  });
  const [newArtistName, setNewArtistName] = useState('');
  const [isAddingArtist, setIsAddingArtist] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          artist: initialData.artist,
          taskName: initialData.name,
          briefing: initialData.briefing,
          folderUrl: initialData.folderUrl || '',
          startDate: formatDateForInput(initialData.startDate),
          deadline: formatDateForInput(initialData.deadline),
          phases: initialData.phases.map(p => ({ ...p, endDate: formatDateForInput(p.endDate) }))
        });
      } else if (prefillData) {
        setFormData({
          artist: artists[0] || 'Artist',
          taskName: prefillData.name,
          briefing: prefillData.briefing,
          folderUrl: '',
          startDate: formatDateForInput(new Date()),
          deadline: '',
          phases: [{ endDate: '', name: 'Phase 1', progress: 0 }]
        });
      } else {
        setFormData({
          artist: artists[0] || 'Artist',
          taskName: '',
          briefing: '',
          folderUrl: '',
          startDate: formatDateForInput(new Date()),
          deadline: '',
          phases: [{ endDate: '', name: 'Phase 1', progress: 0 }]
        });
      }
    }
  }, [isOpen, initialData, artists, prefillData]);

  if (!isOpen) return null;

  const handleAddPhase = () => setFormData(prev => ({ ...prev, phases: [...prev.phases, { endDate: '', name: `Phase ${prev.phases.length + 1}`, progress: 0 }] }));
  const handlePhaseChange = (idx, field, value) => { const newPhases = [...formData.phases]; newPhases[idx][field] = value; setFormData(prev => ({ ...prev, phases: newPhases })); };
  const handleRemovePhase = (idx) => { const newPhases = formData.phases.filter((_, i) => i !== idx); setFormData(prev => ({ ...prev, phases: newPhases })); };

  const handleSubmit = () => {
    if (!formData.taskName || !formData.startDate) return;
    
    // Ensure all phase dates are valid (fallback to task deadline or start date if missing)
    const validPhases = formData.phases.map(p => ({
        ...p,
        endDate: p.endDate ? p.endDate : (formData.deadline || formData.startDate)
    }));

    const sortedPhases = [...validPhases].sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
    const totalPhases = sortedPhases.length;
    
    const safeStartDate = new Date(formData.startDate);
    const safeDeadline = new Date(formData.deadline || sortedPhases[totalPhases - 1]?.endDate || formData.startDate);

    const newTask = {
      id: initialData ? initialData.id : String(Date.now()),
      type: 'project',
      artist: formData.artist,
      name: formData.taskName,
      briefing: formData.briefing,
      folderUrl: formData.folderUrl,
      startDate: safeStartDate,
      deadline: safeDeadline,
      phases: sortedPhases.map((p, idx) => {
        let assignedColor = 'green';
        if (idx === totalPhases - 1) assignedColor = 'red';
        else if (idx === totalPhases - 2) assignedColor = 'yellow';
        else { const fillerColors = ['green', 'blue', 'purple', 'orange']; assignedColor = fillerColors[idx % fillerColors.length]; }
        return { 
            id: p.id || `p-${Date.now()}-${idx}`, 
            name: p.name, 
            color: assignedColor, 
            progress: p.progress || 0, 
            endDate: new Date(p.endDate) 
        };
      })
    };
    onSave(newTask);
    onClose();
  };

  const saveNewArtist = () => { 
      if(newArtistName) { 
          onAddArtist(newArtistName); 
          setFormData({...formData, artist: newArtistName}); 
          setNewArtistName(''); 
          setIsAddingArtist(false); 
      } 
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-pink-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border-4 border-white max-h-[90vh] flex flex-col">
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800 uppercase tracking-wider">{initialData ? 'Edit Task' : 'New Task'}</h2><button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button></div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Resource:</label>
              <div className="flex gap-2">
                {!isAddingArtist ? (
                  <select className="flex-1 rounded-lg border-none p-2 shadow-sm focus:ring-2 focus:ring-pink-400" value={formData.artist} onChange={(e) => { if (e.target.value === 'ADD_NEW') setIsAddingArtist(true); else setFormData({...formData, artist: e.target.value}); }}>
                    {artists.map(a => <option key={a} value={a}>{a}</option>)}
                    <option value="ADD_NEW">+ Add Resource</option>
                  </select>
                ) : (
                  <div className="flex gap-2 flex-1">
                    <input autoFocus type="text" placeholder="Name" className="flex-1 rounded-lg border-none p-2 shadow-sm" value={newArtistName} onChange={(e) => setNewArtistName(e.target.value)} />
                    <button onClick={saveNewArtist} className="bg-white p-2 rounded-lg shadow-sm hover:bg-gray-50 text-green-600"><Check size={18} /></button>
                    <button onClick={() => setIsAddingArtist(false)} className="bg-white p-2 rounded-lg shadow-sm hover:bg-gray-50 text-red-500"><X size={18} /></button>
                  </div>
                )}
              </div>
            </div>
            <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Task Name:</label><input type="text" className="w-full rounded-lg border-none p-2 shadow-sm focus:ring-2 focus:ring-pink-400" value={formData.taskName} onChange={(e) => setFormData({...formData, taskName: e.target.value})} /></div>
            <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Folder URL:</label><input type="url" placeholder="https://..." className="w-full rounded-lg border-none p-2 shadow-sm focus:ring-2 focus:ring-pink-400 text-sm" value={formData.folderUrl} onChange={(e) => setFormData({...formData, folderUrl: e.target.value})} /></div>
            <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Briefing:</label><textarea rows={3} className="w-full rounded-lg border-none p-2 shadow-sm focus:ring-2 focus:ring-pink-400 resize-none" value={formData.briefing} onChange={(e) => setFormData({...formData, briefing: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Start Date:</label><input type="date" className="w-full rounded-lg border-none p-2 shadow-sm" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} /></div>
              <div><label className="block text-xs font-bold uppercase text-gray-700 mb-1">Final Deadline:</label><input type="date" className="w-full rounded-lg border-none p-2 shadow-sm" value={formData.deadline} onChange={(e) => setFormData({...formData, deadline: e.target.value})} /></div>
            </div>
            <div className="bg-white/50 p-3 rounded-lg space-y-2">
              <label className="block text-xs font-bold uppercase text-gray-700">Phases:</label>
              {formData.phases.map((phase, idx) => (
                <div key={idx} className="flex gap-2 items-center group">
                  <span className="text-xs font-bold text-gray-500 w-6">{idx + 1}.</span>
                  <input type="date" className="flex-1 rounded border-none text-sm p-1 shadow-sm" value={phase.endDate} onChange={(e) => handlePhaseChange(idx, 'endDate', e.target.value)} />
                  <input type="text" placeholder="Desc" className="flex-1 rounded border-none text-sm p-1 shadow-sm" value={phase.name} onChange={(e) => handlePhaseChange(idx, 'name', e.target.value)} />
                  <button onClick={() => handleRemovePhase(idx)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                </div>
              ))}
              <button onClick={handleAddPhase} className="text-xs font-bold text-pink-600 hover:text-pink-800 flex items-center gap-1 mt-2">ADD PHASE <Plus size={14} /></button>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleSubmit} className="flex-1 bg-white text-gray-900 font-bold py-2 rounded-lg shadow-sm hover:bg-gray-50 uppercase tracking-widest text-sm">{initialData ? 'Update' : 'Accept'}</button>
            <button onClick={onClose} className="flex-1 bg-transparent border-2 border-white text-gray-600 font-bold py-2 rounded-lg hover:bg-white/20 uppercase tracking-widest text-sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- TIMELINE VIEW ---
const Timeline = ({ tasks, onUpdateProgress, onEditTask, onViewBrief, setEditingTask, setIsFormOpen }) => {
  const [viewStart, setViewStart] = useState(getRelativeDate(-10));
  const daysToShow = 40; 
  const [showCycles, setShowCycles] = useState(false);
  const viewEnd = useMemo(() => { const end = new Date(viewStart); end.setDate(end.getDate() + daysToShow); return end; }, [viewStart]);
  const today = new Date();
  const [activePhase, setActivePhase] = useState(null); 
  const calendarDays = useMemo(() => { const days = []; let current = new Date(viewStart); for (let i = 0; i < daysToShow; i++) { days.push(new Date(current)); current.setDate(current.getDate() + 1); } return days; }, [viewStart, daysToShow]);
  
  // Group and Sort Tasks by Artist
  const groupedTasks = useMemo(() => {
    const groups = {};
    tasks.forEach(t => {
      const artist = t.artist || 'Unassigned';
      if (!groups[artist]) groups[artist] = [];
      groups[artist].push(t);
    });

    const sortedArtists = Object.keys(groups).sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
    });

    sortedArtists.forEach(artist => {
        groups[artist].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    });

    return { sortedArtists, groups };
  }, [tasks]);

  const handlePhaseClick = (taskId, phaseId, currentProgress, e) => { e.stopPropagation(); setActivePhase({ taskId, phaseId, currentProgress, x: e.clientX, y: e.clientY }); };
  const handleSliderChange = (e) => { if (!activePhase) return; const val = parseInt(e.target.value); setActivePhase(prev => ({ ...prev, currentProgress: val })); onUpdateProgress(activePhase.taskId, activePhase.phaseId, val); };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full relative" onClick={() => setActivePhase(null)}>
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <h3 className="font-bold text-gray-500 text-sm tracking-widest">TIMELINE VIEW</h3>
        <div className="flex gap-2">
            <button onClick={() => setShowCycles(!showCycles)} className={`px-4 py-2 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 text-sm border ${showCycles ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {showCycles ? <EyeOff size={16} /> : <Eye size={16} />} Retail Cycles
            </button>
            <button onClick={() => { setEditingTask(null); setIsFormOpen(true); }} className="bg-black text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 text-sm"><Plus size={16} /> New Task</button>
        </div>
        <div className="flex gap-2 items-center">
          <button className="p-1 hover:bg-gray-200 rounded" onClick={() => { const d = new Date(viewStart); d.setDate(d.getDate() - 7); setViewStart(d); }}><ChevronLeft size={20} /></button>
          <span className="text-sm font-medium text-gray-600 w-24 text-center">{viewStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</span>
          <button className="p-1 hover:bg-gray-200 rounded" onClick={() => { const d = new Date(viewStart); d.setDate(d.getDate() + 7); setViewStart(d); }}><ChevronRight size={20} /></button>
          <button className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded font-bold text-gray-500 hover:bg-gray-200" onClick={() => setViewStart(getRelativeDate(-10))}>TODAY</button>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        <div className="w-48 flex-shrink-0 bg-white border-r border-gray-200 p-3"></div>
        <div className="flex-1 relative overflow-hidden h-14 bg-gray-50">
          <div className="absolute inset-0 flex">
            {calendarDays.map((day, i) => {
              const isFirst = day.getDate() === 1;
              const isMonthStart = i === 0 || isFirst;
              const isMilestone = day.getDate() % 5 === 0 || day.getDate() === 1;
              let dayColor = "", cycleName = "", cycleTextColor = "";
              if (showCycles) {
                  const month = day.getMonth();
                  const cycle = RETAIL_CYCLES.find(c => month >= c.startMonth && month <= c.endMonth);
                  if (cycle) { dayColor = cycle.color; if (isFirst || i === 0) { cycleName = cycle.name; cycleTextColor = cycle.textColor; } }
              }
              return (
                <div key={i} className={`flex-1 border-r border-gray-100 relative h-full flex flex-col justify-end pb-2 items-center ${dayColor}`}>
                  {showCycles && cycleName && <span className={`absolute top-0 left-1 text-[9px] font-bold uppercase tracking-tight ${cycleTextColor} z-10 whitespace-nowrap`}>{cycleName}</span>}
                  {isMonthStart && <span className="absolute top-4 left-1 text-[10px] font-bold text-gray-400 uppercase">{day.toLocaleDateString('en-US', { month: 'short' })}</span>}
                  <span className="text-xs font-bold text-gray-600 z-10">{day.getDate()}</span>
                  <div className={`w-px bg-gray-300 ${isMilestone ? 'h-3' : 'h-1'}`}></div>
                </div>
              );
            })}
          </div>
          <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: getPositionStyles(today, today, viewStart, viewEnd).left, transform: 'translateX(-50%)' }}>
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black mx-auto"></div>
              <div className="w-px h-full bg-black/80 mx-auto"></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 pl-48 pointer-events-none z-0">
           <div className="absolute left-48 right-0 top-0 bottom-0">
               <div className="absolute inset-0 flex">
                 {calendarDays.map((day, i) => {
                   let dayColor = "";
                   if (showCycles) { const month = day.getMonth(); const cycle = RETAIL_CYCLES.find(c => month >= c.startMonth && month <= c.endMonth); if (cycle) dayColor = cycle.color; }
                   return <div key={i} className={`flex-1 border-r border-gray-200 h-full ${dayColor} opacity-30`}></div>;
                 })}
               </div>
               <div className="absolute top-0 bottom-0 border-l-2 border-red-500 z-30 opacity-60" style={{ left: getPositionStyles(today, today, viewStart, viewEnd).left, transform: 'translateX(-50%)' }}></div>
           </div>
        </div>

        {groupedTasks.sortedArtists.map(artist => (
            <React.Fragment key={artist}>
                <div className="flex h-8 bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
                    <div className="w-48 flex-shrink-0 border-r border-gray-200 px-4 flex items-center gap-2 font-bold text-xs text-gray-600 uppercase tracking-wider bg-gray-50">
                        <User size={12} /> {artist}
                        <span className="bg-gray-200 text-gray-500 px-1.5 rounded-full text-[10px] ml-auto">
                            {groupedTasks.groups[artist].length}
                        </span>
                    </div>
                    <div className="flex-1 bg-gray-50/50"></div>
                </div>

                {groupedTasks.groups[artist].map(task => (
                    <div key={task.id} className="flex h-24 border-b border-gray-100 relative group hover:bg-gray-50/50 transition-colors">
                        <div className="w-48 flex-shrink-0 border-r border-gray-200 bg-white z-10 p-3 flex flex-col justify-center gap-2 group-hover:bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase text-white tracking-wider ${task.type === 'social' ? 'bg-violet-500' : 'bg-pink-400'}`}>{task.artist}</span>
                            {task.folderUrl && <a href={task.folderUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-gray-400 hover:text-blue-500 rounded transition-colors" title="Folder" onClick={(e) => e.stopPropagation()}><FolderOpen size={14} /></a>}
                            <button onClick={(e) => { e.stopPropagation(); onViewBrief(task); }} className="p-1 text-gray-400 hover:text-blue-600 rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Brief"><FileText size={14} /></button>
                            <button onClick={(e) => { e.stopPropagation(); onEditTask(task); }} className="p-1 text-gray-400 hover:text-pink-600 rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Edit"><Pencil size={14} /></button>
                        </div>
                        <div>
                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">{task.type === 'social' ? <Share2 size={10} /> : 'Task'}</div>
                            <div className={`text-sm font-bold leading-tight ${task.type === 'social' ? 'text-violet-700' : 'text-gray-800'}`}>"{task.name}"</div>
                        </div>
                        </div>
                        <div className="flex-1 relative my-auto h-12">
                        {task.phases.map((phase, idx) => {
                            const pStart = idx === 0 ? task.startDate : task.phases[idx - 1].endDate;
                            const pEnd = phase.endDate;
                            const style = getPositionStyles(pStart, pEnd, viewStart, viewEnd);
                            if (style.display === 'none') return null; 
                            const colors = phase.color === 'social' ? COLOR_MAP.social : (COLOR_MAP[phase.color] || COLOR_MAP.green);
                            return (
                            <div key={phase.id} className="absolute top-0 bottom-0 rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-y-110 shadow-sm" style={{ left: style.left, width: style.width, minWidth: '4px', zIndex: 5 }} onClick={(e) => handlePhaseClick(task.id, phase.id, phase.progress, e)} title={`${phase.name}: ${phase.progress}%`}>
                                <div className={`absolute inset-0 ${colors.pale}`}></div>
                                <div className={`absolute left-0 top-0 bottom-0 ${colors.vivid} transition-all duration-75 ease-out`} style={{ width: `${phase.progress}%` }}></div>
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-700/70 truncate max-w-full pointer-events-none z-10 px-1">{phase.name}</span>
                            </div>
                            );
                        })}
                        </div>
                    </div>
                ))}
            </React.Fragment>
        ))}
      </div>
      {activePhase && <div className="absolute z-50 bg-white shadow-xl rounded-lg p-3 border border-gray-200 w-48" style={{ left: Math.min(activePhase.x - 200, window.innerWidth - 300), top: activePhase.y - 120 }} onClick={(e) => e.stopPropagation()}><button onClick={() => setActivePhase(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><X size={14} /></button><div className="text-xs font-bold text-gray-500 mb-2 uppercase pr-4">Update Progress</div><input type="range" min="0" max="100" step="10" value={activePhase.currentProgress} onChange={handleSliderChange} className="w-full accent-pink-500 cursor-pointer h-2 bg-gray-200 rounded-lg appearance-none" /></div>}
    </div>
  );
};

// --- ADDITIONAL COMPONENTS ---

const BriefModal = ({ isOpen, onClose, task }) => {
  if (!isOpen || !task) return null;
  const handleExport = () => {
    const element = document.createElement("a");
    const file = new Blob([task.briefing], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${task.name.replace(/\s+/g, '_')}_brief.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} className="text-gray-500" /> Design Brief: {task.name}</h3><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
        <div className="p-6 overflow-y-auto flex-1"><div className="whitespace-pre-wrap text-gray-700 font-medium leading-relaxed">{task.briefing || "No briefing provided."}</div></div>
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2"><button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-bold hover:bg-gray-100 text-sm transition-colors"><Download size={16} /> Export</button><button onClick={onClose} className="px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-gray-800 text-sm transition-colors">Close</button></div>
      </div>
    </div>
  );
};

const SocialView = ({ tasks, onRequestAsset, onUpdateProgress, onDeleteTask }) => {
    const socialTasks = tasks.filter(t => t.type === 'social');
    const inProduction = socialTasks.filter(t => t.phases[0].progress < 100);
    const readyToPost = socialTasks.filter(t => t.phases[0].progress === 100);
    return (
        <div className="p-8 h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6 flex-shrink-0"><div><h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">Social Media Pipeline<span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full font-bold">Live Sync</span></h2><p className="text-gray-500 text-sm">Assets assigned here appear on the main artist schedule.</p></div><button onClick={onRequestAsset} className="bg-violet-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-violet-700 transition-all flex items-center gap-2 text-sm"><Plus size={16} /> Request Asset</button></div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden min-h-0">
                <div className="flex flex-col h-full rounded-2xl border border-violet-100 bg-violet-50/50 overflow-hidden">
                    <div className="p-4 flex items-center gap-2 border-b border-violet-200/50 bg-violet-50"><div className="w-3 h-3 rounded-full bg-violet-500 animate-pulse"></div><span className="font-bold text-violet-900 text-sm uppercase tracking-wide">In Production (On Timeline)</span><span className="ml-auto text-xs font-bold text-violet-600 bg-white px-2 py-0.5 rounded-full border border-violet-100">{inProduction.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">{inProduction.map(task => (<div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3"><div className="flex justify-between items-start"><div className="flex items-center gap-2">{task.platform === 'Instagram' && <Instagram size={16} className="text-pink-600"/>}{task.platform === 'YouTube' && <Youtube size={16} className="text-red-600"/>}{task.platform === 'Twitter/X' && <Twitter size={16} className="text-blue-400"/>}{(!['Instagram','YouTube','Twitter/X'].includes(task.platform)) && <Share2 size={16} className="text-gray-400"/>}<h4 className="font-bold text-gray-800 text-sm">{task.name}</h4></div><button onClick={() => onDeleteTask(task)} className="text-gray-300 hover:text-red-400"><Trash2 size={14}/></button></div><div className="flex justify-between items-center text-xs text-gray-500"><span className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1"><User size={10} /> {task.artist}</span><span className={`px-2 py-1 rounded ${new Date(task.deadline) < new Date() ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>Due: {new Date(task.deadline).toLocaleDateString()}</span></div><div className="space-y-1"><div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase"><span>Progress</span><span>{task.phases[0].progress}%</span></div><input type="range" className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600" value={task.phases[0].progress} onChange={(e) => onUpdateProgress(task.id, task.phases[0].id, parseInt(e.target.value))} /></div></div>))}{inProduction.length === 0 && <div className="text-center py-10 text-gray-400 text-sm italic">No active social tasks.</div>}</div>
                </div>
                <div className="flex flex-col h-full rounded-2xl border border-green-100 bg-green-50/50 overflow-hidden">
                    <div className="p-4 flex items-center gap-2 border-b border-green-200/50 bg-green-50"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="font-bold text-green-900 text-sm uppercase tracking-wide">Ready / Posted</span><span className="ml-auto text-xs font-bold text-green-600 bg-white px-2 py-0.5 rounded-full border border-green-100">{readyToPost.length}</span></div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3">{readyToPost.map(task => (<div key={task.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 opacity-75 hover:opacity-100 transition-opacity"><div className="flex justify-between items-center"><div className="font-bold text-gray-800 text-sm line-through decoration-green-500">{task.name}</div><div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Done</div></div><div className="mt-2 text-xs text-gray-400 flex justify-between"><span>{task.artist}</span><span>{task.platform}</span></div></div>))}</div>
                </div>
            </div>
        </div>
    );
};

const DashboardView = ({ tasks }) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => { const lastPhase = t.phases[t.phases.length-1]; return lastPhase && lastPhase.progress === 100; }).length;
    const artistLoad = useMemo(() => { const load = {}; tasks.forEach(t => { load[t.artist] = (load[t.artist] || 0) + 1; }); return load; }, [tasks]);
    const socialCount = tasks.filter(t => t.type === 'social').length;
    const projectCount = tasks.filter(t => t.type !== 'social').length;
    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="p-4 bg-blue-50 text-blue-600 rounded-xl"><PieChart size={24} /></div><div><div className="text-2xl font-black text-gray-900">{totalTasks}</div><div className="text-xs text-gray-400 font-medium uppercase tracking-wide mt-1">{projectCount} Projects • {socialCount} Social</div></div></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="p-4 bg-orange-50 text-orange-600 rounded-xl"><AlertCircle size={24} /></div><div><div className="text-2xl font-black text-gray-900">{tasks.filter(t => { const d = new Date(t.deadline); return d > new Date() && d < new Date(Date.now() + 7 * 86400000); }).length}</div><div className="text-sm text-gray-500 font-medium uppercase tracking-wide">Due This Week</div></div></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"><div className="p-4 bg-green-50 text-green-600 rounded-xl"><Check size={24} /></div><div><div className="text-2xl font-black text-gray-900">{completedTasks}</div><div className="text-sm text-gray-500 font-medium uppercase tracking-wide">Completed</div></div></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><User size={18} /> Resource Workload (Includes Social)</h3><div className="space-y-4">{Object.entries(artistLoad).map(([artist, count]) => (<div key={artist} className="flex items-center gap-4"><div className="w-24 text-sm font-medium text-gray-600">{artist}</div><div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-pink-500 rounded-full" style={{ width: `${(count / totalTasks) * 100}%`}}></div></div><div className="w-8 text-right text-sm font-bold text-gray-900">{count}</div></div>))}</div></div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2"><Clock size={18} /> Urgent Deadlines</h3><div className="space-y-3">{tasks.filter(t => { const d = new Date(t.deadline); return d > new Date() && d < new Date(Date.now() + 7 * 86400000); }).map(t => (<div key={t.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"><div><div className="font-bold text-gray-800 text-sm flex items-center gap-1">{t.type === 'social' && <Share2 size={10} className="text-violet-500"/>}{t.name}</div><div className="text-xs text-red-600 font-medium">{t.artist}</div></div><div className="text-xs font-bold bg-white px-2 py-1 rounded text-red-500 border border-red-100">{new Date(t.deadline).toLocaleDateString()}</div></div>))}</div></div>
            </div>
        </div>
    );
};

const StrategyView = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 h-full overflow-y-auto">
            <div className="mb-8"><h2 className="text-2xl font-bold text-gray-900">Retail Development Strategy</h2><p className="text-gray-500 mt-1">Development cycles operate 12 weeks (3 months) ahead of consumer launches.</p></div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Annual Development Flow</h3>
                <div className="min-w-[800px]">
                    <div className="grid grid-cols-12 gap-1 mb-2">{months.map(m => (<div key={m} className="text-center text-xs font-bold text-gray-400 uppercase">{m}</div>))}</div>
                    <div className="relative border-t border-b border-gray-100 h-64 grid grid-cols-12 gap-1">
                        {months.map((_, i) => (<div key={i} className="border-r border-gray-50 h-full"></div>))}
                        <div className="absolute inset-0 top-4 bottom-4 flex flex-col justify-around px-1">
                            {RETAIL_CYCLES.map((cycle, i) => (
                                <div key={i} className="relative h-10 flex items-center">
                                    <div className={`absolute h-8 rounded-lg ${cycle.color} border border-white shadow-sm flex items-center px-3 z-10`} style={{ left: `${(cycle.startMonth / 12) * 100}%`, width: `${((cycle.endMonth - cycle.startMonth + 1) / 12) * 100}%` }}><span className={`text-[10px] font-bold ${cycle.textColor} uppercase tracking-wide truncate`}>Dev: {cycle.name}</span></div>
                                    <div className="absolute h-[2px] bg-gray-200 z-0" style={{ left: `${((cycle.endMonth + 1) / 12) * 100}%`, width: '25%' }}></div>
                                    <div className="absolute h-8 flex items-center z-10" style={{ left: `${((cycle.endMonth + 4) / 12) * 100}%` }}><div className={`px-3 py-1 rounded-full bg-gray-900 text-white text-[10px] font-bold shadow-md whitespace-nowrap`}>🚀 Launch</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {RETAIL_CYCLES.map((cycle, i) => (
                    <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex gap-4">
                        <div className={`w-12 h-12 rounded-full ${cycle.dot} flex-shrink-0 flex items-center justify-center shadow-inner`}><Clock size={20} className="text-white opacity-80" /></div>
                        <div><div className="flex items-center gap-2 mb-1"><h4 className="font-bold text-gray-900 text-lg">{cycle.name}</h4><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cycle.color} ${cycle.textColor} uppercase`}>Q{i + 1} Dev</span></div><p className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-3">Developing in {months[cycle.startMonth]} - {months[cycle.endMonth]} for:</p><div className="flex flex-wrap gap-2">{cycle.targetDates.map(date => (<span key={date} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-md text-sm font-medium border border-gray-200">{date}</span>))}</div></div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const IdeaFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState({ title: '', description: '' });
  useEffect(() => { if (isOpen) setFormData({ title: initialData?.title||'', description: initialData?.description||'' }); }, [isOpen, initialData]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between mb-4"><h3 className="font-bold">Idea</h3><button onClick={onClose}><X/></button></div>
        <input className="w-full border p-2 rounded mb-2" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} placeholder="Title"/>
        <textarea className="w-full border p-2 rounded mb-4" rows={4} value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} placeholder="Desc"/>
        <button onClick={()=>{onSave(formData);onClose()}} className="w-full bg-black text-white py-2 rounded">Save</button>
      </div>
    </div>
  );
};

const PipelineView = ({ ideas, onAddIdea, onUpdateIdea, onMoveIdea, onDeleteIdea, onPromoteIdea }) => {
    const [isIdeaModalOpen, setIsIdeaModalOpen] = useState(false);
    const [editingIdea, setEditingIdea] = useState(null);
    const handleSaveIdea = (formData) => { if(editingIdea) onUpdateIdea({...editingIdea, ...formData}); else onAddIdea({...formData, stage:'inbox', createdAt:new Date()}); };
    const columns = [ { id: 'inbox', title: 'Inbox' }, { id: 'developing', title: 'Developing' }, { id: 'ready', title: 'Ready' } ];
    return (
        <div className="p-8 h-full flex flex-col">
            <div className="flex justify-between mb-6"><h2 className="text-2xl font-bold">Pipeline</h2><button onClick={()=>{setEditingIdea(null);setIsIdeaModalOpen(true)}} className="bg-black text-white px-4 py-2 rounded">Add Idea</button></div>
            <div className="flex-1 grid grid-cols-3 gap-6">
                {columns.map(col => (
                    <div key={col.id} className="bg-gray-50 p-4 rounded-xl flex flex-col gap-3">
                        <h4 className="font-bold uppercase text-gray-500 text-xs">{col.title}</h4>
                        {ideas.filter(i=>i.stage===col.id).map(idea=>(
                            <div key={idea.id} className="bg-white p-3 rounded shadow-sm border border-gray-100 group relative">
                                <div className="flex justify-between"><h5 className="font-bold text-sm">{idea.title}</h5>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={()=>openEditIdeaModal(idea)}><Pencil size={10}/></button><button onClick={()=>onDeleteIdea(idea.id)}><Trash2 size={10}/></button></div>
                                </div>
                                {/* Description Preview */}
                                <p className="text-xs text-gray-500 line-clamp-3 mb-3 whitespace-pre-wrap mt-2">{idea.description || "No description yet."}</p>
                                <div className="flex justify-between mt-2">
                                    {col.id!=='inbox' && <button onClick={()=>onMoveIdea(idea,-1)}><ArrowLeft size={12}/></button>}
                                    {col.id==='ready' ? <button onClick={()=>onPromoteIdea(idea)} className="bg-black text-white px-2 py-1 rounded text-[10px]">Launch</button> : <button onClick={()=>onMoveIdea(idea,1)}><ArrowRight size={12}/></button>}
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <IdeaFormModal isOpen={isIdeaModalOpen} onClose={()=>setIsIdeaModalOpen(false)} onSave={handleSaveIdea} initialData={editingIdea}/>
        </div>
    );
    function openEditIdeaModal(idea){ setEditingIdea(idea); setIsIdeaModalOpen(true); }
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]); 
  const [ideas, setIdeas] = useState([]);
  const [artists, setArtists] = useState(INITIAL_ARTISTS);
  const [activeTab, setActiveTab] = useState('social'); 
  
  // Modal Control
  const [isFormOpen, setIsFormOpen] = useState(false); // TaskForm
  const [isSocialFormOpen, setIsSocialFormOpen] = useState(false); // SocialTaskModal
  const [editingTask, setEditingTask] = useState(null);
  const [viewingBriefTask, setViewingBriefTask] = useState(null);
  const [prefillFromIdea, setPrefillFromIdea] = useState(null);

  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const userId = accounts[0]?.localAccountId;

  useEffect(() => {
    if (!isAuthenticated) {
      instance.loginPopup().catch(console.error);
    } else {
      setUser(userId);
    }
  }, [isAuthenticated, instance, userId]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const tasksData = await api.getTasks(user);
        const loadedTasks = (tasksData || []).map(t => ({
          ...t,
          startDate: new Date(t.startDate),
          deadline: new Date(t.deadline),
          phases: (t.phases || []).map(p => ({ ...p, endDate: new Date(p.endDate) }))
        }));

        if (loadedTasks.length === 0) {
          const seedTasksWithUser = SEED_TASKS.map(t => ({ ...t, userId: user }));
          await Promise.all(seedTasksWithUser.map(t => api.upsertTask(t)));
          setTasks(seedTasksWithUser.map(t => ({
            ...t,
            startDate: new Date(t.startDate),
            deadline: new Date(t.deadline),
            phases: (t.phases || []).map(p => ({ ...p, endDate: new Date(p.endDate) }))
          })));
        } else {
          setTasks(loadedTasks);
        }

        const ideasData = await api.getIdeas(user);
        setIdeas((ideasData || []).map(i => ({ id: i.id, ...i })));

        try {
          const artistsData = await api.getArtists(user);
          if (artistsData && artistsData.list) setArtists(artistsData.list);
          else {
            await api.upsertArtists({ id: 'artists', userId: user, list: INITIAL_ARTISTS });
            setArtists(INITIAL_ARTISTS);
          }
        } catch (e) {
          await api.upsertArtists({ id: 'artists', userId: user, list: INITIAL_ARTISTS });
          setArtists(INITIAL_ARTISTS);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [user]);

  // Edit Logic: Switch based on Task Type
  const handleEditTask = (task) => {
      setEditingTask(task);
      setPrefillFromIdea(null);
      if (task.type === 'social') {
          setIsSocialFormOpen(true);
      } else {
          setIsFormOpen(true);
      }
  };

  const handleSaveTask = async (task) => {
      if (user) {
          try {
            await api.upsertTask({ ...task, userId: user });
            if (prefillFromIdea) {
              await api.deleteIdea(prefillFromIdea.id, user);
              setActiveTab('timeline');
            }
            // Refresh local state minimally
            setTasks(prev => {
              const exists = prev.find(t => t.id === task.id);
              if (exists) return prev.map(t => t.id === task.id ? { ...task } : t);
              return [...prev, task];
            });
          } catch (e) {
            console.error('Error saving task:', e);
          }
          setEditingTask(null);
          setIsFormOpen(false);
          setIsSocialFormOpen(false);
      }
  };
  const handleDeleteTask = async (task) => {
    if (!user) return;
    try {
      await api.deleteTask(task.id, user);
      setTasks(prev => prev.filter(t => t.id !== task.id));
    } catch (e) { console.error('Error deleting task:', e); }
  };

  const handleUpdateProgress = async (tid, pid, val) => {
      const t = tasks.find(x=>x.id===tid);
      if (t && user) {
          try {
              const updated = { ...t, phases: t.phases.map(p => p.id===pid ? {...p, progress: val} : p) };
              await api.upsertTask({ ...updated, userId: user });
              setTasks(prev => prev.map(x => x.id === tid ? updated : x));
          } catch (e) { console.error('Error updating progress:', e); }
      }
  };

  const handleAddIdea = async (i) => {
    if (!user) return;
    try {
      const payload = { ...i, id: String(Date.now()), userId: user };
      await api.upsertIdea(payload);
      setIdeas(prev => [...prev, payload]);
    } catch (e) { console.error('Error adding idea:', e); }
  };

  const handleUpdateIdea = async (i) => {
    if (!user) return;
    try {
      await api.upsertIdea({ ...i, userId: user });
      setIdeas(prev => prev.map(x => x.id === i.id ? { ...x, ...i } : x));
    } catch (e) { console.error('Error updating idea:', e); }
  };

  const handleMoveIdea = async (i, dir) => {
    if (!user) return;
    try {
      const stages=['inbox','developing','ready'];
      const idx = stages.indexOf(i.stage) + dir;
      if (idx>=0 && idx<3) {
        const updated = { ...i, stage: stages[idx], userId: user };
        await api.upsertIdea(updated);
        setIdeas(prev => prev.map(x => x.id === i.id ? updated : x));
      }
    } catch (e) { console.error('Error moving idea:', e); }
  };

  const handleDeleteIdea = async (id) => {
    if (!user) return;
    try {
      await api.deleteIdea(id, user);
      setIdeas(prev => prev.filter(x => x.id !== id));
    } catch (e) { console.error('Error deleting idea:', e); }
  };

  const handlePromoteIdea = (i) => { setPrefillFromIdea({id:i.id, name:i.title, briefing:i.description}); setIsFormOpen(true); };

  const handleAddResource = async (name) => {
    if (!user) return;
    if (!artists.includes(name)) {
      setArtists(prev => {
        const next = [...prev, name];
        // persist
        api.upsertArtists({ id: 'artists', userId: user, list: next }).catch(e => console.error('Error saving resource:', e));
        return next;
      });
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans text-gray-800 overflow-hidden">
      <Sidebar activeTab={activeTab} onNavigate={setActiveTab} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 bg-white border-b border-gray-200 flex items-center px-8 justify-between flex-shrink-0">
            <div className="text-lg font-bold text-gray-800 capitalize">{activeTab === 'pipeline' ? 'Idea Lab' : activeTab}</div>
            <div className="text-xs text-gray-400">{user ? 'Sync Active' : '...'}</div>
        </div>
        <div className="flex-1 overflow-auto bg-gray-50">
            {activeTab === 'dashboard' && <DashboardView tasks={tasks} />}
            {activeTab === 'pipeline' && <PipelineView ideas={ideas} onAddIdea={handleAddIdea} onUpdateIdea={handleUpdateIdea} onMoveIdea={handleMoveIdea} onDeleteIdea={handleDeleteIdea} onPromoteIdea={handlePromoteIdea} />}
            {activeTab === 'social' && (
                <SocialView 
                    tasks={tasks} 
                    onRequestAsset={() => { setEditingTask(null); setIsSocialFormOpen(true); }} 
                    onUpdateProgress={handleUpdateProgress} 
                    onDeleteTask={handleDeleteTask} 
                />
            )}
            {activeTab === 'timeline' && (
                <div className="p-8 max-w-6xl mx-auto h-full flex flex-col">
                    <div className="flex-1 min-h-[500px]">
                        <Timeline 
                            tasks={tasks} 
                            onUpdateProgress={handleUpdateProgress} 
                            onEditTask={handleEditTask} 
                            onViewBrief={(t)=>setViewingBriefTask(t)} 
                            setEditingTask={setEditingTask} 
                            setIsFormOpen={setIsFormOpen} 
                        />
                    </div>
                </div>
            )}
            {activeTab === 'strategy' && <StrategyView />}
        </div>
      </div>
      
      {/* STANDARD TASK FORM (PROJECTS) */}
      <TaskForm 
        isOpen={isFormOpen} 
        onClose={()=>{setIsFormOpen(false);setEditingTask(null);setPrefillFromIdea(null)}} 
        onSave={handleSaveTask} 
        artists={artists} 
        initialData={editingTask} 
        prefillData={prefillFromIdea} 
        onAddArtist={handleAddResource} 
      />

      {/* SOCIAL ASSET FORM (SOCIAL ONLY) */}
      <SocialTaskModal 
        isOpen={isSocialFormOpen}
        onClose={() => {setIsSocialFormOpen(false); setEditingTask(null);}}
        onSave={handleSaveTask}
        artists={artists}
        initialData={editingTask}
        onAddArtist={handleAddResource}
      />

      <BriefModal isOpen={!!viewingBriefTask} onClose={()=>setViewingBriefTask(null)} task={viewingBriefTask} />
    </div>
  );
}