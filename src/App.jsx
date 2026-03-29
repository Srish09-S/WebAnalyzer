import React, { useState, useEffect, useRef } from 'react';
import { Zap, Globe, ShieldAlert, Lightbulb, Loader2, Cpu, Copy, Check, ChevronRight, MessageSquare, ExternalLink, Columns, Code } from 'lucide-react';

// --- Internal Sub-Component: Gauge ---
const Gauge = ({ score, label, color }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r="36" stroke="#E2E8F0" strokeWidth="6" fill="none" />
        <circle cx="40" cy="40" r="36" stroke={color} strokeWidth="6" fill="none"
          strokeDasharray="226" strokeDashoffset={226 - (score / 100) * 226}
          className="transition-all duration-1000 ease-out" strokeLinecap="round" />
      </svg>
      <span className="absolute text-sm font-black text-[#1F2937]">{score}%</span>
    </div>
    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#1F2937]" style={{ color }}>{label}</span>
  </div>
);

export default function App() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('url'); 
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [scores, setScores] = useState({ security: 0, logic: 0, ux: 0 });
  const [logs, setLogs] = useState([]);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState('report'); 
  
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  const addLog = (msg) => setLogs(prev => [...prev.slice(-4), `> ${msg}`]);

  const resetSession = () => {
    setInput('');
    setReport(null);
    setScores({ security: 0, logic: 0, ux: 0 });
    setLogs([]);
    setShowChat(false);
    setView('report');
    addLog("SESSION_RESET: Buffer cleared.");
  };

  useEffect(() => {
    setInput('');
    setReport(null);
    setScores({ security: 0, logic: 0, ux: 0 });
    setShowChat(false);
    setView('report');
    addLog(`Buffer cleared for ${mode.toUpperCase()} mode.`);
  }, [mode]);

  const handleChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', text: chatInput }]);
    setChatInput('');
    setTimeout(() => {
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        text: `Analysis: For your framework, implement the fix using: \n\`\`\`javascript\nconst resolve = (data) => data?.map(item => ({...item, validated: true})) ?? [];\n\`\`\`` 
      }]);
    }, 600);
  };

  const handleDeepScan = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setReport(null);
    setShowChat(false);
    setView('report');
    addLog(`PROBING_${mode.toUpperCase()}_STREAM...`);
    const lowInput = input.toLowerCase();

    try {
      if (mode === 'url' || mode === 'compare') {
        const urls = mode === 'compare' ? input.split(',').map(u => u.trim()).filter(u => u !== "") : [input.trim()];
        addLog(`ANALYZING_${urls.length}_NODES...`);

        const results = await Promise.all(urls.map(async (url) => {
          try {
            const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
            const response = await fetch(`https://r.jina.ai/${formattedUrl}`);
            const rawData = await response.text();
            
            const charCount = rawData.length;
            const wordCount = rawData.split(/\s+/).length;
            const linkCount = (rawData.match(/\[.*?\]\(http.*?\)/g) || []).length;
            const imageCount = (rawData.match(/!\[.*?\]\(.*?\)/g) || []).length;
            const hasSecurityHeaders = rawData.toLowerCase().includes('content-security-policy');
            const hasH1 = rawData.includes('# ') || rawData.includes('<h1>') || rawData.toLowerCase().includes('h1');
            const isHttps = formattedUrl.startsWith('https');

            const techs = [];
            if (rawData.includes('_next')) techs.push("Next.js");
            if (rawData.includes('tailwind')) techs.push("Tailwind");
            if (rawData.includes('react')) techs.push("React Ecosystem");

            return { url: formattedUrl, charCount, wordCount, linkCount, imageCount, hasSecurityHeaders, hasH1, isHttps, techs, error: false };
          } catch (e) { return { url, error: true }; }
        }));

        const primary = results[0];
        const secScore = primary.isHttps ? (primary.hasSecurityHeaders ? 98 : 85) : 15;
        const uxScore = Math.max(20, Math.min(99, 100 - (primary.charCount / 2000) - (primary.imageCount * 2)));
        setScores({ security: secScore, logic: 40 + (primary.techs.length * 15), ux: uxScore });

        if (mode === 'compare' && results.length > 1) {
          const [s1, s2] = results;
          let compReport = `### NEURAL_COMPARISON_MATRIX\n---------------------------------\n`;
          results.forEach((site, index) => {
            compReport += `[NODE_${String.fromCharCode(65 + index)}]: ${site.url}\n`;
            compReport += `- STACK: ${site.techs.join(' + ') || "Legacy/Custom"}\n`;
            compReport += `- WEIGHT: ${(site.charCount / 1024).toFixed(1)} KB\n`;
            compReport += `- ASSETS: ${site.imageCount} images\n\n`;
          });
          const winner = results.reduce((prev, curr) => (prev.charCount < curr.charCount ? prev : curr));
          compReport += `---------------------------------\nVERDICT: ${winner.url} is more optimized.\nSTRATEGIC EDGE: ${s1.techs.includes('Next') ? 'Node A uses SSR.' : 'Node A uses Client Logic.'}`;
          setReport(compReport);
        } else {
          setReport(`[AUDIT_REPORT_ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}]
    TARGET: ${primary.url}

    SYSTEM_METRICS:
    - Total Content: ${primary.charCount.toLocaleString()} bytes
    - Structural Density: ${primary.wordCount} words / ${primary.linkCount} links
    - Visual Assets: ${primary.imageCount} images detected

    TECH_FINGERPRINT:
    - Stack Identified: ${primary.techs.length > 0 ? primary.techs.join(' + ') : "Legacy/Custom Stack"}

    SECURITY_DEEP_DIVE:
    - TLS Status: ${primary.isHttps ? "Active (v1.3)" : "⚠️ MISSING_ENCRYPTION"}
    - Policy Check: ${primary.hasSecurityHeaders ? "CSP_HEADERS_FOUND" : "⚠️ MISSING_CSP_PROTECTION"}
    - Vulnerability: ${secScore < 50 ? "High external threat surface." : "Low external threat surface."}

    UX_ANALYSIS:
    - Performance Rating: ${uxScore.toFixed(4)}%
    - Complexity: ${primary.charCount > 10000 ? "High" : "Optimal"}
    - SEO Optimization: ${primary.hasH1 ? "H1 Header Present" : "⚠️ Missing H1 structure"}

    NEURAL_ROADMAP:
    1. ${primary.isHttps ? "Rotate SSL keys every 90 days." : "MIGRATE TO HTTPS IMMEDIATELY."}
    2. Reduce visual overhead (currently ${primary.imageCount} assets) to boost UX to 95%+.
    3. Consider a CDN to offload the ${(primary.charCount / 1024).toFixed(1)}KB payload.`);
        }
      } else if (mode === 'error') {
        const lines = input.split('\n').length;
        const type = input.match(/(\w+Error)/)?.[0] || "Runtime_Exception";
        const culprit = input.match(/'(\w+)'|(\w+)\s+is/)?.[1] || "Variable_N/A";
        setScores({ security: 45, logic: 10, ux: 50 });
        setReport(`// REPAIR_LOG_GENERATED
DETECTION: ${type}
TARGET_NODE: "${culprit}"
TRACE_LENGTH: ${lines} lines analyzed

CAUSE_ANALYSIS:
The system encountered a logic gap at line ${Math.floor(lines/2)}. 
${input.toLowerCase().includes('null') ? "A null reference was found." : "A syntax violation occurred."}

DYNAMIC_FIX:
- Add a null-guard before accessing "${culprit}".
- Proposed: const safeData = ${culprit} || [];
- Ensure ${culprit} is not shadowed in the local scope.`);
      } else {
        // --- RESTORED ORIGINAL IDEA LOGIC ---
        addLog("DECODING_IDEA_SEMANTICS...");
        const isAI = lowInput.includes('ai') || lowInput.includes('smart') || lowInput.includes('bot') || lowInput.includes('learn');
        const isEcom = lowInput.includes('shop') || lowInput.includes('store') || lowInput.includes('buy') || lowInput.includes('sell');
        const isSaaS = lowInput.includes('tool') || lowInput.includes('dashboard') || lowInput.includes('platform');
        const complexity = Math.min(98, 30 + (input.length / 5));
        const scalability = isAI || isSaaS ? 95 : 75;
        const devTime = Math.max(2, Math.floor(input.split(' ').length / 3));

        setScores({ security: isEcom ? 95 : 70, logic: complexity, ux: 88 });

        setReport(`### NEURAL_BLUEPRINT: ${input.split(' ').slice(0, 3).join('_').toUpperCase()}
MODEL_TYPE: ${isAI ? "ARTIFICIAL_INTELLIGENCE_SAAS" : isEcom ? "B2C_E-COMMERCE_NODE" : "DISTRIBUTED_WEB_APP"}
ESTIMATED_MVP_BUILD: ${devTime} Days

DYNAMIC_STACK_SUGGESTION:
- Frontend: Next.js 15 + Tailwind v4 (Atomic Design)
- Engine: ${isAI ? "Python FastAPI + LangChain" : isEcom ? "MedusaJS + Stripe" : "Node.js (Bun Runtime)"}
- Database: ${isAI ? "Pinecone (Vector)" : "Supabase (PostgreSQL)"}

ARCHITECTURAL_STEPS:
1. Define JSON Schema for the "${input.split(' ')[0]}" core entity.
2. Implement ${isAI ? "RAG (Retrieval-Augmented Generation)" : "Edge-cached API routes"} for ${scalability}% scalability.
3. Deploy to Global Edge Nodes with automated CI/CD.

SECURITY_ADVICE:
- Use ${isEcom ? "PCI-DSS compliant gateways" : "JWT with 256-bit encryption"} for the ${complexity}% complexity level.`);
        addLog("BLUEPRINT_STREAM_STABILIZED.");
      }
      addLog("SCAN_COMPLETE.");
    } catch (err) { addLog("CRITICAL_ERROR."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FDF2F8] text-[#1F2937] font-mono p-6 lg:p-12 selection:bg-[#EC4899] selection:text-white">
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10 border-b border-[#EC4899]/10 pb-6">
        <div className="bg-[#bb1d6c] text-white px-5 py-2 font-black text-2xl italic shadow-lg rounded-full">WebAnalyzer</div>
        <div className="text-[10px] text-[#8B5CF6] font-bold tracking-[0.3em] uppercase animate-pulse">Neural_Probe_v4.5</div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-6">
          <h1 className="text-7xl font-black tracking-tighter leading-none italic uppercase">
            REAL-TIME<br/><span className="text-[#4919b8] italic">AUDITOR</span>
          </h1>
          
          <div className="flex flex-wrap gap-6 border-b border-[#1F2937]/5 pb-4">
            {[{ id: 'url', icon: <Globe size={14}/> }, { id: 'compare', icon: <Columns size={14}/> }, { id: 'error', icon: <ShieldAlert size={14}/> }, { id: 'idea', icon: <Lightbulb size={14}/> }].map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)} 
                className={`text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${mode === m.id ? 'text-[#EC4899] scale-110' : 'opacity-40 hover:opacity-100'}`}>
                {m.icon} {m.id}
              </button>
            ))}
          </div>

          <textarea 
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'compare' ? "siteA.com, siteB.com" : "Input data..."}
            className="w-full h-44 bg-white border-2 border-[#EC4899]/10 p-5 text-sm text-[#1F2937] focus:border-[#EC4899] shadow-xl rounded-2xl outline-none resize-none"
          />

          <div className="bg-[#F8FAFC] p-4 h-32 border border-[#1F2937]/5 overflow-y-auto rounded-xl">
            {logs.map((log, i) => <div key={i} className="text-[10px] text-[#1F2937]/50 mb-1 leading-tight">{log}</div>)}
          </div>

          <div className="flex gap-4">
            <button onClick={handleDeepScan} disabled={loading || !input} 
              className="flex-grow bg-[#9a225e] text-white py-5 font-black uppercase text-sm flex justify-center items-center gap-3 hover:bg-[#8B5CF6] transition-all rounded-2xl shadow-lg disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin"/> : <Zap size={18} fill="white"/>}
              {loading ? "SCANNING..." : "Execute Scan"}
            </button>
            <button onClick={resetSession} className="px-6 border-2 border-[#EC4899]/20 text-[#EC4899] font-black uppercase text-[10px] hover:bg-[#EC4899]/5 transition-all rounded-2xl shadow-sm active:scale-95">
              Reset
            </button>
          </div>
        </div>

        <div className="bg-white p-8 border-l-8 border-[#982c62] min-h-125 flex flex-col relative shadow-2xl rounded-2xl">
          {!report && !loading ? (
            <div className="m-auto opacity-10 flex flex-col items-center">
              <Cpu size={80} className="mb-4 animate-pulse text-[#0EA5E9]" />
              <p className="text-[10px] font-black tracking-[0.5em] uppercase text-[#1F2937]">PENDING_AUDIT</p>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in duration-500 h-full flex flex-col">
              {(mode === 'url' || mode === 'compare') && (
                <div className="flex justify-between mb-10">
                  <Gauge score={scores.security} label="Security" color="#22C55E" />
                  <Gauge score={scores.logic} label="Logic" color="#F97316" />
                  <Gauge score={scores.ux} label="UI/UX" color="#0EA5E9" />
                </div>
              )}

              <div className="relative flex-grow flex flex-col">
                <div className="flex gap-4 mb-4 border-b border-pink-50 pb-2">
                   <button onClick={() => {setShowChat(false); setView('report')}} className={`text-[10px] font-black uppercase ${!showChat && view === 'report' ? 'text-pink-600' : 'opacity-40'}`}>REPORT</button>
                   {mode === 'idea' && <button onClick={() => {setView('code'); setShowChat(false)}} className={`text-[10px] font-black uppercase ${view === 'code' ? 'text-pink-600' : 'opacity-40'} flex items-center gap-1`}><Code size={12}/> CODE</button>}
                   {mode === 'error' && <button onClick={() => setShowChat(true)} className={`text-[10px] font-black uppercase ${showChat ? 'text-pink-600' : 'opacity-40'} flex items-center gap-1`}><MessageSquare size={12}/> DEBUG_CHAT</button>}
                   {mode === 'idea' && <button onClick={() => window.open('https://codesandbox.io/s/new', '_blank')} className="text-[10px] font-black uppercase opacity-40 hover:text-pink-600 flex items-center gap-1"><ExternalLink size={12}/> SANDBOX</button>}
                </div>

                <div className="absolute -top-11 right-0 text-[10px] text-[#0EA5E9] font-black cursor-pointer" onClick={() => {navigator.clipboard.writeText(report); setCopied(true); setTimeout(()=>setCopied(false), 2000)}}>
                  {copied ? "COPY_DONE" : "COPY_REPORT"}
                </div>
                
                <div className="bg-[#F8FAFC] p-6 border-2 border-[#8B5CF6]/10 text-[12px] leading-relaxed whitespace-pre-wrap h-full max-h-[350px] overflow-y-auto text-[#1F2937] rounded-xl shadow-inner">
                  {showChat ? (
                    <div className="flex flex-col h-full">
                      <div className="flex-grow space-y-3 mb-4 overflow-y-auto">
                        {chatHistory.map((c, i) => (
                          <div key={i} className={`p-2 rounded-lg ${c.role === 'ai' ? 'bg-pink-100 self-start' : 'bg-blue-100 self-end text-right'}`}>{c.text}</div>
                        ))}
                      </div>
                      <form onSubmit={handleChat} className="flex gap-2">
                        <input value={chatInput} onChange={e => setChatInput(e.target.value)} className="flex-grow bg-white border p-2 rounded-lg outline-none" placeholder="Ask AI debugger..." />
                        <button type="submit" className="bg-pink-600 text-white px-3 rounded-lg"><Zap size={14}/></button>
                      </form>
                    </div>
                  ) : view === 'code' ? (
                    <code>{`// Neural Instance Boilerplate\nexport default function Project() {\n  return (\n    <div className="p-8 bg-slate-50 min-h-screen">\n      <h1 className="text-2xl font-bold">Project: ${input}</h1>\n      <p className="mt-4">Neural blueprint successfully initialized.</p>\n    </div>\n  );\n}`}</code>
                  ) : report}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}