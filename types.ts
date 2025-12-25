
export interface AppConfig {
  appName: string;
  imageName: string;
  containerPort: number;
  replicas: number;
  cpuLimit: string;
  memoryLimit: string;
  domain: string;
  namespace: string;
  registry: string;
}

export type ManifestType = 'docker' | 'deployment' | 'service' | 'ingress' | 'config' | 'hpa' | 'pipeline';
