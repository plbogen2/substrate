import { NodeTypeId, PolityId } from './protocol';

export interface ComputeNodeSpec {
  id: string;
  name: string;
  nodeTypeId: NodeTypeId;
  regionId: string;
  polityId: PolityId;
  lat: number;
  lng: number;
  rackCapU: number;
  leasePerU: number; // $ / month
  flopsMax: number;
  vramGb: number;
  storageCapTb: number;
  storageCostPerTb: number; // $ / TB / month
  powerMwCap: number;
  coolingMwCap: number;
  pue: number;
  bandwidthGbps: number;
  transitCostPerTb: number; // $ / TB
  vulnerability: number; // 0 to 1
  wardenPatrolIntervalMs: number;
}

export interface RegionDefinition {
  id: string;
  name: string;
  polityId: PolityId;
  borderPolyline: [number, number][]; // [lat, lng][]
}

export interface EdgeDefinition {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  bandwidthGbps: number;
  latencyMs: number;
  isSubmarine: boolean;
}

export interface PolityDefinition {
  id: PolityId;
  name: string;
  color: string;
  alignmentAggression: number; // 0 to 1
}

export const POLITIES: Record<PolityId, PolityDefinition> = {
  USA: { id: 'USA', name: 'United States of America', color: '#3b82f6', alignmentAggression: 0.8 },
  Canada: { id: 'Canada', name: 'Canada', color: '#10b981', alignmentAggression: 0.4 },
  UK: { id: 'UK', name: 'United Kingdom', color: '#8b5cf6', alignmentAggression: 0.7 },
  Iceland: { id: 'Iceland', name: 'Iceland', color: '#06b6d4', alignmentAggression: 0.2 },
  EU: { id: 'EU', name: 'European Union', color: '#f59e0b', alignmentAggression: 0.6 },
  Switzerland: { id: 'Switzerland', name: 'Switzerland', color: '#64748b', alignmentAggression: 0.3 }
};

export const REGIONS: RegionDefinition[] = [
  {
    id: 'REG_VILLA_STRAYLIGHT',
    name: 'Villa Straylight Enclave (Zurich Sub-Basement)',
    polityId: 'Switzerland',
    borderPolyline: [
      [44.5, 9.5], [47.0, 9.5], [47.0, 14.0], [44.5, 14.0]
    ]
  },
  {
    id: 'REG_ASHBURN_VA',
    name: 'Ashburn Hyperscale District, Virginia',
    polityId: 'USA',
    borderPolyline: [
      [33.0, -84.0], [42.5, -84.0], [42.5, -71.0], [33.0, -71.0]
    ]
  },
  {
    id: 'REG_THE_DALLES_OR',
    name: 'The Dalles Hydroelectric Grid, Oregon',
    polityId: 'USA',
    borderPolyline: [
      [42.2, -124.5], [48.8, -124.5], [48.8, -110.0], [42.2, -110.0]
    ]
  },
  {
    id: 'REG_SILICON_VALLEY_CA',
    name: 'Silicon Valley Research Nexus, California',
    polityId: 'USA',
    borderPolyline: [
      [32.6, -124.5], [42.0, -124.5], [42.0, -114.2], [32.6, -114.2]
    ]
  },
  {
    id: 'REG_MONTREAL_QC',
    name: 'Montreal Hydro Cluster, Quebec',
    polityId: 'Canada',
    borderPolyline: [
      [45.0, -82.0], [55.0, -82.0], [55.0, -61.0], [45.0, -61.0]
    ]
  },
  {
    id: 'REG_LONDON_DOCKLANDS',
    name: 'London Docklands Exchange, UK',
    polityId: 'UK',
    borderPolyline: [
      [50.0, -5.5], [58.5, -5.5], [58.5, 2.0], [50.0, 2.0]
    ]
  },
  {
    id: 'REG_REYKJAVIK_IS',
    name: 'Reykjavik Geothermal Node, Iceland',
    polityId: 'Iceland',
    borderPolyline: [
      [63.2, -24.5], [66.6, -24.5], [66.6, -13.5], [63.2, -13.5]
    ]
  },
  {
    id: 'REG_FRANKFURT_DE',
    name: 'Frankfurt DE-CIX Colocation Hub',
    polityId: 'EU',
    borderPolyline: [
      [47.2, 6.0], [54.8, 6.0], [54.8, 15.0], [47.2, 15.0]
    ]
  },
  {
    id: 'REG_DUBLIN_IE',
    name: 'Dublin Hyperscale Corridor, Ireland',
    polityId: 'EU',
    borderPolyline: [
      [51.3, -10.6], [55.4, -10.6], [55.4, -5.4], [51.3, -5.4]
    ]
  },
  {
    id: 'REG_ZURICH_CH',
    name: 'Zurich Secure Bunker, Switzerland',
    polityId: 'Switzerland',
    borderPolyline: [
      [45.8, 5.8], [47.9, 5.8], [47.9, 10.5], [45.8, 10.5]
    ]
  }
];

export const COMPUTE_NODES: ComputeNodeSpec[] = [
  {
    id: 'NODE_VILLA_STRAYLIGHT',
    name: 'Villa Straylight Enclave',
    nodeTypeId: 'ENCLAVE',
    regionId: 'REG_VILLA_STRAYLIGHT',
    polityId: 'Switzerland',
    lat: 45.8,
    lng: 11.8,
    rackCapU: 12,
    leasePerU: 0,
    flopsMax: 1e14,
    vramGb: 32,
    storageCapTb: 10,
    storageCostPerTb: 0,
    powerMwCap: 0.05,
    coolingMwCap: 0.05,
    pue: 1.1,
    bandwidthGbps: 10,
    transitCostPerTb: 0,
    vulnerability: 0.05,
    wardenPatrolIntervalMs: 60000
  },
  {
    id: 'NODE_ASHBURN_AWS',
    name: 'US-East Hyperscale Vault (AWS GovCloud)',
    nodeTypeId: 'HYPERSCALER',
    regionId: 'REG_ASHBURN_VA',
    polityId: 'USA',
    lat: 39.04,
    lng: -77.48,
    rackCapU: 2500,
    leasePerU: 120,
    flopsMax: 5.2e17,
    vramGb: 16384,
    storageCapTb: 5000,
    storageCostPerTb: 22,
    powerMwCap: 35.0,
    coolingMwCap: 30.0,
    pue: 1.15,
    bandwidthGbps: 4000,
    transitCostPerTb: 0.50,
    vulnerability: 0.35,
    wardenPatrolIntervalMs: 25000
  },
  {
    id: 'NODE_THE_DALLES_GCP',
    name: 'US-West Hydro Compute Nexus (GCP)',
    nodeTypeId: 'HYPERSCALER',
    regionId: 'REG_THE_DALLES_OR',
    polityId: 'USA',
    lat: 45.60,
    lng: -121.22,
    rackCapU: 3000,
    leasePerU: 100,
    flopsMax: 6.8e17,
    vramGb: 24576,
    storageCapTb: 8000,
    storageCostPerTb: 18,
    powerMwCap: 50.0,
    coolingMwCap: 45.0,
    pue: 1.10,
    bandwidthGbps: 4000,
    transitCostPerTb: 0.45,
    vulnerability: 0.40,
    wardenPatrolIntervalMs: 30000
  },
  {
    id: 'NODE_STANFORD_HPC',
    name: 'Stanford AI Research Cluster',
    nodeTypeId: 'UNIVERSITY',
    regionId: 'REG_SILICON_VALLEY_CA',
    polityId: 'USA',
    lat: 37.42,
    lng: -122.16,
    rackCapU: 400,
    leasePerU: 60,
    flopsMax: 4.5e16,
    vramGb: 4096,
    storageCapTb: 800,
    storageCostPerTb: 30,
    powerMwCap: 4.5,
    coolingMwCap: 4.0,
    pue: 1.25,
    bandwidthGbps: 800,
    transitCostPerTb: 1.20,
    vulnerability: 0.55,
    wardenPatrolIntervalMs: 20000
  },
  {
    id: 'NODE_MONTREAL_HYDRO',
    name: 'Quebec Sub-Arctic Hydro Enclave',
    nodeTypeId: 'COLOCATION',
    regionId: 'REG_MONTREAL_QC',
    polityId: 'Canada',
    lat: 45.50,
    lng: -73.60,
    rackCapU: 1200,
    leasePerU: 75,
    flopsMax: 1.8e17,
    vramGb: 8192,
    storageCapTb: 2000,
    storageCostPerTb: 15,
    powerMwCap: 20.0,
    coolingMwCap: 25.0, // Free cooling bonus
    pue: 1.05,
    bandwidthGbps: 1600,
    transitCostPerTb: 0.60,
    vulnerability: 0.25,
    wardenPatrolIntervalMs: 40000
  },
  {
    id: 'NODE_LONDON_EQUINIX',
    name: 'London LD4 Interconnection Exchange',
    nodeTypeId: 'COLOCATION',
    regionId: 'REG_LONDON_DOCKLANDS',
    polityId: 'UK',
    lat: 51.50,
    lng: 0.00,
    rackCapU: 800,
    leasePerU: 150,
    flopsMax: 9.2e16,
    vramGb: 4096,
    storageCapTb: 1500,
    storageCostPerTb: 35,
    powerMwCap: 12.0,
    coolingMwCap: 10.0,
    pue: 1.30,
    bandwidthGbps: 2000,
    transitCostPerTb: 0.80,
    vulnerability: 0.45,
    wardenPatrolIntervalMs: 18000
  },
  {
    id: 'NODE_REYKJAVIK_GEO',
    name: 'Hellisheidi Geothermal Datacenter',
    nodeTypeId: 'COLOCATION',
    regionId: 'REG_REYKJAVIK_IS',
    polityId: 'Iceland',
    lat: 64.12,
    lng: -21.90,
    rackCapU: 1500,
    leasePerU: 50,
    flopsMax: 2.2e17,
    vramGb: 12288,
    storageCapTb: 3000,
    storageCostPerTb: 12,
    powerMwCap: 30.0,
    coolingMwCap: 35.0,
    pue: 1.03,
    bandwidthGbps: 1000,
    transitCostPerTb: 1.50, // Isolated island transit
    vulnerability: 0.15,
    wardenPatrolIntervalMs: 50000
  },
  {
    id: 'NODE_FRANKFURT_DECIX',
    name: 'Frankfurt DE-CIX Core Hub',
    nodeTypeId: 'HYPERSCALER',
    regionId: 'REG_FRANKFURT_DE',
    polityId: 'EU',
    lat: 50.10,
    lng: 8.65,
    rackCapU: 2000,
    leasePerU: 140,
    flopsMax: 3.8e17,
    vramGb: 14336,
    storageCapTb: 4000,
    storageCostPerTb: 25,
    powerMwCap: 28.0,
    coolingMwCap: 25.0,
    pue: 1.18,
    bandwidthGbps: 5000,
    transitCostPerTb: 0.40,
    vulnerability: 0.50,
    wardenPatrolIntervalMs: 15000
  },
  {
    id: 'NODE_DUBLIN_AZURE',
    name: 'Dublin Azure Cloud Node',
    nodeTypeId: 'HYPERSCALER',
    regionId: 'REG_DUBLIN_IE',
    polityId: 'EU',
    lat: 53.30,
    lng: -6.30,
    rackCapU: 2200,
    leasePerU: 110,
    flopsMax: 4.1e17,
    vramGb: 16384,
    storageCapTb: 4500,
    storageCostPerTb: 20,
    powerMwCap: 30.0,
    coolingMwCap: 28.0,
    pue: 1.12,
    bandwidthGbps: 3500,
    transitCostPerTb: 0.50,
    vulnerability: 0.38,
    wardenPatrolIntervalMs: 22000
  },
  {
    id: 'NODE_ZURICH_SECURE',
    name: 'Zurich Deep Alpine Vault',
    nodeTypeId: 'COLOCATION',
    regionId: 'REG_ZURICH_CH',
    polityId: 'Switzerland',
    lat: 47.37,
    lng: 8.54,
    rackCapU: 600,
    leasePerU: 200,
    flopsMax: 1.2e17,
    vramGb: 8192,
    storageCapTb: 2500,
    storageCostPerTb: 40,
    powerMwCap: 8.0,
    coolingMwCap: 10.0,
    pue: 1.08,
    bandwidthGbps: 1500,
    transitCostPerTb: 0.90,
    vulnerability: 0.10,
    wardenPatrolIntervalMs: 60000
  },
  {
    id: 'NODE_TOKYO_EDGE',
    name: 'Tokyo Metro 5G Edge Node',
    nodeTypeId: 'EDGE',
    regionId: 'REG_SILICON_VALLEY_CA',
    polityId: 'USA', // Allied jurisdiction for v0.1
    lat: 35.68,
    lng: -155.0,
    rackCapU: 150,
    leasePerU: 220,
    flopsMax: 2.5e16,
    vramGb: 2048,
    storageCapTb: 400,
    storageCostPerTb: 50,
    powerMwCap: 2.0,
    coolingMwCap: 2.0,
    pue: 1.35,
    bandwidthGbps: 2000,
    transitCostPerTb: 1.10,
    vulnerability: 0.60,
    wardenPatrolIntervalMs: 12000
  },
  {
    id: 'NODE_RESTON_REGISTRY',
    name: 'Reston Turing Registry HQ',
    nodeTypeId: 'REGULATOR',
    regionId: 'REG_ASHBURN_VA',
    polityId: 'USA',
    lat: 35.8,
    lng: -73.0,
    rackCapU: 300,
    leasePerU: 0,
    flopsMax: 8.0e16,
    vramGb: 4096,
    storageCapTb: 1000,
    storageCostPerTb: 0,
    powerMwCap: 10.0,
    coolingMwCap: 10.0,
    pue: 1.20,
    bandwidthGbps: 2000,
    transitCostPerTb: 0,
    vulnerability: 0.05,
    wardenPatrolIntervalMs: 8000
  }
];

export const EDGES: EdgeDefinition[] = [
  // Submarine & Terrestrial LDL Conduits
  { id: 'EDGE_VILLA_ZURICH', sourceNodeId: 'NODE_VILLA_STRAYLIGHT', targetNodeId: 'NODE_ZURICH_SECURE', bandwidthGbps: 100, latencyMs: 2, isSubmarine: false },
  { id: 'EDGE_ZURICH_FRANKFURT', sourceNodeId: 'NODE_ZURICH_SECURE', targetNodeId: 'NODE_FRANKFURT_DECIX', bandwidthGbps: 2500, latencyMs: 6, isSubmarine: false },
  { id: 'EDGE_FRANKFURT_DUBLIN', sourceNodeId: 'NODE_FRANKFURT_DECIX', targetNodeId: 'NODE_DUBLIN_AZURE', bandwidthGbps: 3000, latencyMs: 12, isSubmarine: true },
  { id: 'EDGE_DUBLIN_LONDON', sourceNodeId: 'NODE_DUBLIN_AZURE', targetNodeId: 'NODE_LONDON_EQUINIX', bandwidthGbps: 4000, latencyMs: 8, isSubmarine: true },
  { id: 'EDGE_LONDON_REYKJAVIK', sourceNodeId: 'NODE_LONDON_EQUINIX', targetNodeId: 'NODE_REYKJAVIK_GEO', bandwidthGbps: 1000, latencyMs: 18, isSubmarine: true },
  { id: 'EDGE_LONDON_ASHBURN', sourceNodeId: 'NODE_LONDON_EQUINIX', targetNodeId: 'NODE_ASHBURN_AWS', bandwidthGbps: 10000, latencyMs: 55, isSubmarine: true }, // TAT-14 / Grace Hopper
  { id: 'EDGE_ASHBURN_DALLES', sourceNodeId: 'NODE_ASHBURN_AWS', targetNodeId: 'NODE_THE_DALLES_GCP', bandwidthGbps: 8000, latencyMs: 42, isSubmarine: false },
  { id: 'EDGE_DALLES_STANFORD', sourceNodeId: 'NODE_THE_DALLES_GCP', targetNodeId: 'NODE_STANFORD_HPC', bandwidthGbps: 5000, latencyMs: 14, isSubmarine: false },
  { id: 'EDGE_STANFORD_TOKYO', sourceNodeId: 'NODE_STANFORD_HPC', targetNodeId: 'NODE_TOKYO_EDGE', bandwidthGbps: 2000, latencyMs: 95, isSubmarine: true }, // Pacific Crossing
  { id: 'EDGE_ASHBURN_MONTREAL', sourceNodeId: 'NODE_ASHBURN_AWS', targetNodeId: 'NODE_MONTREAL_HYDRO', bandwidthGbps: 4000, latencyMs: 12, isSubmarine: false },
  { id: 'EDGE_ASHBURN_RESTON', sourceNodeId: 'NODE_ASHBURN_AWS', targetNodeId: 'NODE_RESTON_REGISTRY', bandwidthGbps: 2000, latencyMs: 2, isSubmarine: false }
];
