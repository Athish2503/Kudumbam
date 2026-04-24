import { ShieldAlert } from 'lucide-react';

export default function SetupWarning() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
        <div className="bg-red-50 p-4 rounded-full w-fit mx-auto mb-6">
          <ShieldAlert className="text-red-500 w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Firebase Not Provisioned</h1>
        <p className="text-slate-600 mb-8 leading-relaxed">
          The automatic Firebase setup encountered an issue. To continue, please ask the AI to retry "set_up_firebase" or manually configure the "firebase-applet-config.json" file.
        </p>
        <div className="space-y-3">
          <div className="text-sm text-slate-400">Error: Project provisioning failed during initialization.</div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Retry Check
          </button>
        </div>
      </div>
    </div>
  );
}
