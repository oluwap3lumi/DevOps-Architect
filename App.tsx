
import React, { useState, useMemo } from 'react';
import { AppConfig, ManifestType } from './types';
import { ICONS } from './constants';
import ConfigPanel from './components/ConfigPanel';
import CodeViewer from './components/CodeViewer';
import { askDevOpsExpert } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ManifestType>('docker');
  const [config, setConfig] = useState<AppConfig>({
    appName: 'node-api',
    imageName: 'my-org/node-api',
    containerPort: 3000,
    replicas: 3,
    cpuLimit: '500m',
    memoryLimit: '512Mi',
    domain: 'api.example.com',
    namespace: 'production',
    registry: 'docker.io'
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleAskAI = async () => {
    if (!aiPrompt) return;
    setIsAsking(true);
    const response = await askDevOpsExpert(`Context: Generating DevOps manifests for a Node.js app named ${config.appName}.\n\nUser Question: ${aiPrompt}`);
    setAiResponse(response || 'No response.');
    setIsAsking(false);
  };

  const manifests = useMemo(() => {
    const { appName, imageName, containerPort, replicas, cpuLimit, memoryLimit, domain, namespace, registry } = config;
    
    return {
      docker: `
# Multi-stage build for optimal image size
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build # If needed

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist # Or src

EXPOSE ${containerPort}
USER node
CMD ["node", "dist/index.js"]
      `.trim(),
      
      deployment: `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}
  namespace: ${namespace}
  labels:
    app: ${appName}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
      - name: ${appName}
        image: ${registry}/${imageName}:latest
        ports:
        - containerPort: ${containerPort}
        resources:
          limits:
            cpu: ${cpuLimit}
            memory: ${memoryLimit}
          requests:
            cpu: "100m"
            memory: "128Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: ${containerPort}
          initialDelaySeconds: 15
          periodSeconds: 20
        readinessProbe:
          httpGet:
            path: /ready
            port: ${containerPort}
          initialDelaySeconds: 5
          periodSeconds: 10
        envFrom:
        - configMapRef:
            name: ${appName}-config
        - secretRef:
            name: ${appName}-secrets
      `.trim(),

      service: `
apiVersion: v1
kind: Service
metadata:
  name: ${appName}
  namespace: ${namespace}
spec:
  type: ClusterIP
  selector:
    app: ${appName}
  ports:
  - port: 80
    targetPort: ${containerPort}
    protocol: TCP
      `.trim(),

      ingress: `
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${appName}-ingress
  namespace: ${namespace}
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - ${domain}
    secretName: ${appName}-tls
  rules:
  - host: ${domain}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${appName}
            port:
              number: 80
      `.trim(),

      config: `
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${appName}-config
  namespace: ${namespace}
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
---
apiVersion: v1
kind: Secret
metadata:
  name: ${appName}-secrets
  namespace: ${namespace}
type: Opaque
data:
  # Base64 encoded values
  DB_PASSWORD: bXktc2VjcmV0LXBhc3N3b3Jk
      `.trim(),

      hpa: `
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${appName}-hpa
  namespace: ${namespace}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${appName}
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
      `.trim(),

      pipeline: `
name: CI/CD Pipeline

on:
  push:
    branches: [ "main" ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
      
    - name: Login to Container Registry
      uses: docker/login-action@v3
      with:
        username: \${{ secrets.REGISTRY_USERNAME }}
        password: \${{ secrets.REGISTRY_PASSWORD }}
        
    - name: Build and push
      uses: docker/build-push-action@v5
      with:
        push: true
        tags: ${registry}/${imageName}:\${{ github.sha }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        
    - name: Install kubectl
      uses: azure/setup-kubectl@v3
      
    - name: Deploy to K8s
      env:
        KUBECONFIG_DATA: \${{ secrets.KUBECONFIG_BASE64 }}
      run: |
        echo "$KUBECONFIG_DATA" | base64 -d > kubeconfig
        export KUBECONFIG=kubeconfig
        kubectl set image deployment/${appName} ${appName}=${registry}/${imageName}:\${{ github.sha }} -n ${namespace}
      `.trim()
    };
  }, [config]);

  const tabs: { id: ManifestType; label: string; icon: React.ReactNode }[] = [
    { id: 'docker', label: 'Dockerfile', icon: <ICONS.Docker /> },
    { id: 'deployment', label: 'Deployment', icon: <ICONS.Kubernetes /> },
    { id: 'service', label: 'Service', icon: <ICONS.Server /> },
    { id: 'ingress', label: 'Ingress', icon: <ICONS.Code /> },
    { id: 'config', label: 'Config/Secret', icon: <ICONS.Code /> },
    { id: 'hpa', label: 'Autoscaler', icon: <ICONS.Kubernetes /> },
    { id: 'pipeline', label: 'GitHub Actions', icon: <ICONS.Github /> },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <header className="w-full max-w-6xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            DevOps Architect Pro
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Node.js Containerization & K8s Manifest Generator</p>
        </div>
        <div className="flex gap-4">
           <a href="https://github.com" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all border border-slate-700">
             <ICONS.Github />
             <span>Documentation</span>
           </a>
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Configuration Panel */}
        <div className="lg:col-span-4 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800 p-6 sticky top-8">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-blue-400">
            <ICONS.Server />
            App Configuration
          </h2>
          <ConfigPanel config={config} onChange={setConfig} />
          
          <div className="mt-8 pt-8 border-t border-slate-800">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Ask AI DevOps Expert
            </h3>
            <div className="space-y-3">
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask about best practices, troubleshooting..."
                className="w-full h-24 bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
              <button 
                onClick={handleAskAI}
                disabled={isAsking}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-bold transition-all"
              >
                {isAsking ? 'Thinking...' : 'Get Advice'}
              </button>
              {aiResponse && (
                <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs leading-relaxed text-slate-300">
                  <div className="font-bold text-blue-400 mb-2 underline">Expert Advice:</div>
                  {aiResponse}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Output Panel */}
        <div className="lg:col-span-8 space-y-6">
          <nav className="flex flex-wrap gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          <CodeViewer 
            code={manifests[activeTab]} 
            language={activeTab === 'docker' ? 'dockerfile' : 'yaml'} 
          />

          <div className="bg-blue-950/20 border border-blue-900/50 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-blue-300 mb-4">Implementation Checklist</h3>
            <ul className="space-y-3">
              {[
                "Use multi-stage builds to keep Docker images small and secure.",
                "Ensure your Node.js app listens on the port defined in the deployment.",
                "Implement /health and /ready endpoints for Kubernetes probes.",
                "Store sensitive credentials in Kubernetes Secrets, not ConfigMaps.",
                "Use HorizontalPodAutoscaler to handle traffic spikes automatically.",
                "Review the resource limits to prevent OOM errors and CPU throttling."
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                  <div className="mt-1 min-w-4 h-4 rounded-full border border-blue-500 flex items-center justify-center text-[10px] text-blue-400 font-bold">
                    ✓
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      <footer className="mt-16 w-full max-w-6xl border-t border-slate-800 pt-8 pb-12 text-center text-slate-500 text-sm">
        <p>&copy; 2024 DevOps Architect Pro. Built with React & Gemini AI.</p>
        <p className="mt-2">Empowering developers with production-ready infrastructure.</p>
      </footer>
    </div>
  );
};

export default App;
