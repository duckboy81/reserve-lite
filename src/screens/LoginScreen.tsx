import React, { useState, useEffect } from "react";
import { Plane, AlertCircle, Lock, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { AuthService } from "../services/AuthService";
import { User } from "../types";

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSecurityDetails, setShowSecurityDetails] = useState(false);
  const [saveCreds, setSaveCreds] = useState(true);

  useEffect(() => {
    // Check local storage for saved credentials
    const savedId = localStorage.getItem("saved_id");
    const savedPass = localStorage.getItem("saved_pass");
    if (savedId && savedPass) {
      setId(savedId);
      setPass(savedPass);
      setSaveCreds(true);
    }

    // Auto-populate from Environment Variables (Vite) - overrides local storage if present
    const env = (import.meta as any).env;
    if (env.VITE_AUTO_LOGIN_ID) {
      setId(env.VITE_AUTO_LOGIN_ID);
    }
    if (env.VITE_AUTO_LOGIN_PASS) {
      setPass(env.VITE_AUTO_LOGIN_PASS);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Handle saving/clearing credentials
    if (saveCreds) {
      localStorage.setItem("saved_id", id);
      localStorage.setItem("saved_pass", pass);
    } else {
      localStorage.removeItem("saved_id");
      localStorage.removeItem("saved_pass");
    }

    try {
      const data = await AuthService.login(id, pass);
      onLogin(data.userInfo);
    } catch (err) {
      setError("Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-100">
      <div className="flex items-center gap-2 mb-6 text-indigo-700">
        <Plane className="transform -rotate-45" />
        <h1 className="text-2xl font-black tracking-tight">
          Reserve<span className="text-indigo-500">Lite</span>
        </h1>
      </div>
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm flex gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ALPA ID</label>
            <input
              className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input
              className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="save-creds"
              checked={saveCreds}
              onChange={(e) => setSaveCreds(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="save-creds" className="text-sm text-gray-600 cursor-pointer select-none">
              Save my credentials
            </label>
          </div>
        </div>

        <button
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded mt-6 hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Sign In"}
        </button>
      </form>

      <div className="relative mt-8 mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 px-4 text-gray-500">Or</span>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <button
          onClick={() => {
            AuthService.setGuestMode();
            onLogin({ id: "GUEST", name: "Guest User" });
          }}
          className="w-full py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all active:bg-gray-100"
        >
          Continue without logging in...
        </button>
        <p className="text-[10px] text-gray-400 mt-2 text-center">Flight search features will not be available.</p>
      </div>

      <div className="mt-8 border-t border-gray-100 pt-4">
        <button
          onClick={() => setShowSecurityDetails(!showSecurityDetails)}
          className="w-full flex items-center justify-center gap-2 text-gray-400 hover:text-gray-600 transition-colors group"
        >
          <Lock size={12} className="group-hover:text-green-600 transition-colors" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Secure Environment Active</span>
          {showSecurityDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showSecurityDetails && (
          <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 text-[10px] text-gray-500 leading-relaxed shadow-inner">
            <p className="mb-2 font-medium text-gray-700">
              This application enforces a strict <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP" target="_blank" rel="noopener noreferrer" className="text-indigo-600 inline-flex items-center gap-1">
                Content Security Policy (CSP)
                <ExternalLink className="h-3 w-3" />
              </a>.
              The browser will block any network request that is not directed to:
            </p>
            <ul className="space-y-1 font-mono text-gray-600 bg-white p-2 rounded border border-gray-100">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>*.alpa.org
              </li>
              <li className="flex items-center gap-1.5 text-red-400 line-through decoration-red-400/50">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>origin (self)
              </li>
            </ul>
            <p className="mt-2 italic opacity-75">
              Connections to the origin server and all other domains are strictly blocked by the browser.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;
