
import React from 'react';
import { AppConfig } from '../types';

interface Props {
  config: AppConfig;
  onChange: (config: AppConfig) => void;
}

const ConfigPanel: React.FC<Props> = ({ config, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...config, [name]: name === 'containerPort' || name === 'replicas' ? parseInt(value) : value });
  };

  const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all";
  const labelClass = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1";

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>App Name</label>
        <input name="appName" value={config.appName} onChange={handleChange} className={inputClass} placeholder="my-awesome-app" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Container Port</label>
          <input name="containerPort" type="number" value={config.containerPort} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Replicas</label>
          <input name="replicas" type="number" value={config.replicas} onChange={handleChange} className={inputClass} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Docker Image Name</label>
        <input name="imageName" value={config.imageName} onChange={handleChange} className={inputClass} placeholder="username/repo-name" />
      </div>
      <div>
        <label className={labelClass}>Registry</label>
        <input name="registry" value={config.registry} onChange={handleChange} className={inputClass} placeholder="docker.io" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>CPU Limit</label>
          <input name="cpuLimit" value={config.cpuLimit} onChange={handleChange} className={inputClass} placeholder="500m" />
        </div>
        <div>
          <label className={labelClass}>Memory Limit</label>
          <input name="memoryLimit" value={config.memoryLimit} onChange={handleChange} className={inputClass} placeholder="512Mi" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Domain (Ingress)</label>
        <input name="domain" value={config.domain} onChange={handleChange} className={inputClass} placeholder="app.example.com" />
      </div>
    </div>
  );
};

export default ConfigPanel;
