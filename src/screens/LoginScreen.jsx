import React, { useState, useEffect } from 'react';
import { Plane, AlertCircle } from 'lucide-react';
import { AuthService } from '../services/AuthService';

const LoginScreen = ({ onLogin }) => {
  const [id, setId] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Auto-populate from Environment Variables (Vite)
    if (import.meta.env.VITE_AUTO_LOGIN_ID) {
      setId(import.meta.env.VITE_AUTO_LOGIN_ID);
    }
    if (import.meta.env.VITE_AUTO_LOGIN_PASS) {
      setPass(import.meta.env.VITE_AUTO_LOGIN_PASS);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await AuthService.login(id, pass);
      onLogin(data.userInfo);
    } catch (err) { setError('Login failed. Please check credentials.'); }
    finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <div className="flex items-center gap-2 mb-6 text-indigo-700">
          <Plane className="transform -rotate-45" />
          <h1 className="text-2xl font-black tracking-tight">Reserve<span className="text-indigo-500">Lite</span></h1>
        </div>
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm flex gap-2"><AlertCircle size={16}/>{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ALPA ID</label>
            <input className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                   value={id} onChange={e => setId(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                   type="password" value={pass} onChange={e => setPass(e.target.value)} required />
          </div>
          <button disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-400 mt-6">Secure connection to authsvc2.alpa.org</p>
      </div>
    </div>
  );
};

export default LoginScreen;
