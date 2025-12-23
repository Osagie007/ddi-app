import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface InteractionResult {
  severity: 'Minor' | 'Moderate' | 'Major' | 'Contraindicated';
  drugs: string[];
  mechanism: string;
  clinicalEffect: string;
  recommendation: string;
}

interface DDIResponse {
  interactions: InteractionResult[];
  summary: string;
}

// --- Icons ---
const PillIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

const AlertIcon = ({ severity }: { severity: string }) => {
  const colors = {
    'Minor': 'text-blue-500',
    'Moderate': 'text-yellow-500',
    'Major': 'text-orange-500',
    'Contraindicated': 'text-red-600'
  };
  return (
    <svg className={colors[severity as keyof typeof colors] || 'text-gray-500'} xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  );
};

// --- Main App Component ---
const App = () => {
  const [onboarded, setOnboarded] = useState<boolean>(() => localStorage.getItem('d-di-onboarded') === 'true');
  const [agentName, setAgentName] = useState<string>(() => localStorage.getItem('d-di-agent-name') || '');
  const [inputName, setInputName] = useState('');
  const [drugs, setDrugs] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DDIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = () => {
    if (inputName.trim()) {
      localStorage.setItem('d-di-agent-name', inputName.trim());
      localStorage.setItem('d-di-onboarded', 'true');
      setAgentName(inputName.trim());
      setOnboarded(true);
    }
  };

  const checkInteractions = async () => {
    if (!drugs.trim()) return;
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `Analyze the following drugs for potential interactions: ${drugs}. Provide a detailed pharmacological breakdown.`,
        config: {
          systemInstruction: `You are ${agentName}, an expert clinical pharmacist AI agent assisting pharmacy students. 
          Use your deep pharmacological knowledge base to identify drug-drug interactions. 
          Respond ONLY in JSON format following the schema provided. 
          Include severity levels, clinical mechanisms, and evidence-based recommendations.
          Be precise, professional, and emphasize patient safety.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              interactions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    severity: { type: Type.STRING, description: "Minor, Moderate, Major, or Contraindicated" },
                    drugs: { type: Type.ARRAY, items: { type: Type.STRING } },
                    mechanism: { type: Type.STRING },
                    clinicalEffect: { type: Type.STRING },
                    recommendation: { type: Type.STRING }
                  },
                  required: ["severity", "drugs", "mechanism", "clinicalEffect", "recommendation"]
                }
              },
              summary: { type: Type.STRING, description: "A brief professional summary of the findings." }
            },
            required: ["interactions", "summary"]
          }
        }
      });

      const data = JSON.parse(response.text || "{}") as DDIResponse;
      setResults(data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch interactions. Please ensure you enter valid drug names.");
    } finally {
      setLoading(false);
    }
  };

  if (!onboarded) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-fadeIn">
        <div className="w-20 h-20 bg-teal-500 rounded-3xl flex items-center justify-center text-white mb-8 shadow-xl shadow-teal-100">
          <PillIcon />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to d-di</h1>
        <p className="text-gray-500 mb-10 max-w-xs">
          Your personal pharmacy student companion for drug-drug interaction analysis.
        </p>
        
        <div className="w-full max-w-sm space-y-4">
          <div className="text-left">
            <label className="text-sm font-semibold text-gray-700 ml-1">Name your AI Agent</label>
            <input 
              type="text" 
              placeholder="e.g. Pharmy, RxBot, Dr. Smith"
              className="w-full mt-1 px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-teal-500 transition-all outline-none"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
            />
          </div>
          <button 
            onClick={handleStart}
            disabled={!inputName.trim()}
            className="w-full py-4 bg-teal-600 text-white font-bold rounded-2xl shadow-lg shadow-teal-200 active:scale-95 disabled:opacity-50 transition-all"
          >
            Get Started
          </button>
        </div>
        <p className="mt-12 text-xs text-gray-400 max-w-xs">
          Educational tool only. Not for clinical decision making.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-slate-50 relative overflow-hidden">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 glass sticky top-0 z-10 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1">Pharmacy Assistant</p>
            <h1 className="text-2xl font-bold text-gray-900">{agentName}</h1>
          </div>
          <div className="w-10 h-10 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-bold">
            {agentName.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pt-6 pb-24 overflow-y-auto space-y-6">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Input Drugs (comma separated)</label>
          <div className="relative">
            <textarea
              placeholder="e.g. Warfarin, Aspirin, Fluconazole"
              className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-teal-500 transition-all min-h-[100px] resize-none outline-none text-gray-800"
              value={drugs}
              onChange={(e) => setDrugs(e.target.value)}
            />
          </div>
          <button
            onClick={checkInteractions}
            disabled={loading || !drugs.trim()}
            className="w-full mt-4 flex items-center justify-center space-x-2 py-4 bg-gray-900 text-white font-bold rounded-2xl active:scale-95 disabled:bg-gray-400 transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <SearchIcon />
                <span>Analyze Interactions</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-4 animate-fadeIn">
            <h2 className="text-lg font-bold text-gray-800 px-1 flex items-center gap-2">
              Analysis Results
              <span className="bg-teal-100 text-teal-700 text-xs px-2 py-1 rounded-full">{results.interactions.length} Found</span>
            </h2>
            
            {results.summary && (
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm italic text-gray-600 text-sm">
                "{results.summary}"
              </div>
            )}

            {results.interactions.map((interaction, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-wrap gap-1">
                    {interaction.drugs.map((d, i) => (
                      <span key={i} className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg text-xs font-bold">
                        {d}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-full border border-gray-100">
                    <AlertIcon severity={interaction.severity} />
                    <span className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">{interaction.severity}</span>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Mechanism</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{interaction.mechanism}</p>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Clinical Effect</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{interaction.clinicalEffect}</p>
                </div>

                <div className="pt-2">
                  <div className="bg-teal-50 p-4 rounded-2xl border border-teal-100">
                    <h4 className="text-[11px] font-bold text-teal-700 uppercase tracking-widest mb-1">Recommendation</h4>
                    <p className="text-sm text-teal-900 font-medium">{interaction.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}

            {results.interactions.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="mb-4 flex justify-center opacity-20"><PillIcon /></div>
                <p>No significant interactions detected for the provided list.</p>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer persistent */}
        <div className="pt-4 pb-8 text-center">
            <p className="text-[10px] text-gray-400 leading-tight">
              Data generated by AI models. Always verify with official pharmaceutical references like Lexicomp or Micromedex before making clinical recommendations.
            </p>
        </div>
      </main>

      {/* Floating Action / Navigation Placeholder */}
      <div className="fixed bottom-6 left-6 right-6 h-16 glass rounded-3xl border border-white/50 shadow-xl flex items-center justify-around px-4">
        <button className="p-3 text-teal-600 bg-teal-50 rounded-2xl" aria-label="Home">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </button>
        <button className="p-3 text-gray-400 hover:text-teal-600 transition-colors" aria-label="History">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
        </button>
        <button className="p-3 text-gray-400 hover:text-teal-600 transition-colors" aria-label="Settings" onClick={() => { localStorage.clear(); window.location.reload(); }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      
      {/* Scroll indicator hack for mobile */}
      <div className="h-2 w-1/3 bg-gray-200 rounded-full mx-auto mb-2 absolute bottom-2 left-1/3 opacity-50"></div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
