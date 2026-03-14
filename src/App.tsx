import { useState } from 'react';

export default function App() {
  const [anilistId, setAnilistId] = useState('172463');
  const [ep, setEp] = useState('1');
  const [type, setType] = useState('dub');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFetch = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch(`/api/stream?id=${anilistId}&${ep}&${type}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch');
      }
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Anime Stream API Test</h1>
        
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Anilist ID</label>
              <input 
                type="text" 
                value={anilistId} 
                onChange={e => setAnilistId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Episode</label>
              <input 
                type="text" 
                value={ep} 
                onChange={e => setEp(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Type</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="sub">Sub</option>
                <option value="dub">Dub</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={handleFetch}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Fetching...' : 'Test API'}
          </button>
        </div>

        {error && (
          <div className="bg-red-950/50 border border-red-900 text-red-200 p-4 rounded-xl">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-4">
            <h2 className="text-xl font-semibold">Result</h2>
            <pre className="bg-zinc-950 p-4 rounded-lg overflow-x-auto text-sm text-zinc-300 font-mono">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
