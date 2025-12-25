
import React from 'react';

interface Props {
  code: string;
  language: string;
}

const CodeViewer: React.FC<Props> = ({ code, language }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-900/50 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700">
        <span className="text-xs font-mono text-slate-400">{language.toUpperCase()}</span>
        <button 
          onClick={handleCopy}
          className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-slate-200"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto max-h-[600px]">
        <pre className="text-sm text-blue-300">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeViewer;
