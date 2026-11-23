/** Terrain palette and prop recipe per biome kind (content/worlds/NN/world.yaml → biomeKind). */
export interface Biome {
  grass: [string, string];
  sand: string;
  rock: string;
  /** Peak height in world units (0 = gentle island). */
  peak: number;
  snow?: string;
  basalt?: string;
  props: PropRecipe;
}

export interface PropRecipe {
  broadleaf?: number;
  pine?: number;
  palm?: number;
  crystal?: number;
  rock: number;
  bush: number;
  flower: number;
  buildings?: number;
  houses?: number;
  towers?: number;
  wall?: boolean;
  floatingRocks?: number;
  volcano?: boolean;
  leafColors?: string[];
  crystalColors?: string[];
}

const LEAF = ['#4caf50', '#66bb5a', '#3d9a46'];

export const BIOMES: Record<string, Biome> = {
  palm: {
    grass: ['#86d34f', '#5fb83a'],
    sand: '#f4dfa8',
    rock: '#9a8a74',
    peak: 0,
    props: { palm: 16, bush: 16, rock: 10, flower: 80 },
  },
  jungle: {
    grass: ['#2fae55', '#1b8744'],
    sand: '#ecd59c',
    rock: '#6f7a5a',
    peak: 2,
    props: {
      broadleaf: 46,
      palm: 6,
      bush: 14,
      rock: 10,
      flower: 60,
      leafColors: ['#1f9e4a', '#2fbf5f', '#178a3e', '#56c95a'],
    },
  },
  crystal: {
    grass: ['#9fe0b6', '#76c79a'],
    sand: '#efe0b8',
    rock: '#8c9cc0',
    peak: 11,
    snow: '#f4f8ff',
    props: {
      crystal: 30,
      broadleaf: 12,
      bush: 6,
      rock: 10,
      flower: 50,
      leafColors: ['#5fbf82'],
      crystalColors: ['#b98cff', '#8fb8ff', '#d6b8ff'],
    },
  },
  'crystal-neon': {
    grass: ['#7ee0c8', '#56c2a8'],
    sand: '#efe0b8',
    rock: '#8c9cc0',
    peak: 4,
    props: {
      crystal: 34,
      broadleaf: 10,
      bush: 8,
      rock: 8,
      flower: 60,
      leafColors: ['#3fbf9a'],
      crystalColors: ['#46f0ff', '#ff5cf2', '#8b5cf6'],
    },
  },
  volcano: {
    grass: ['#86b04a', '#5f8a37'],
    sand: '#d9c08e',
    rock: '#4b3a36',
    peak: 12,
    basalt: '#3a2c2a',
    props: { rock: 22, broadleaf: 10, bush: 6, flower: 30, volcano: true },
  },
  pine: {
    grass: ['#78bf68', '#4f9a52'],
    sand: '#efdcaa',
    rock: '#7f7a8e',
    peak: 2,
    props: { pine: 48, rock: 10, bush: 6, flower: 40, leafColors: ['#7c4dd6', '#5d3cc4', '#3f8f5a', '#9a6bf0'] },
  },
  snow: {
    grass: ['#eef6ff', '#d6e6f6'],
    sand: '#e9e4d6',
    rock: '#8aa1bd',
    peak: 10,
    snow: '#ffffff',
    props: { pine: 22, rock: 12, bush: 0, flower: 0, leafColors: ['#3f7f8f', '#5a9aa6'] },
  },
  city: {
    grass: ['#97d39a', '#73b979'],
    sand: '#efdcaa',
    rock: '#8b8f96',
    peak: 0,
    props: { buildings: 22, broadleaf: 16, bush: 10, rock: 8, flower: 50 },
  },
  tower: {
    grass: ['#bfe38a', '#99c966'],
    sand: '#f1deae',
    rock: '#9b8f84',
    peak: 1,
    props: { towers: 10, broadleaf: 16, bush: 10, rock: 8, flower: 60 },
  },
  house: {
    grass: ['#b9e46a', '#93c84a'],
    sand: '#f3dfab',
    rock: '#9a8f7a',
    peak: 0,
    props: { houses: 14, broadleaf: 16, bush: 10, rock: 8, flower: 70 },
  },
  cloud: {
    grass: ['#9fd88a', '#77bf6a'],
    sand: '#efdcaa',
    rock: '#8c97ad',
    peak: 1,
    props: { floatingRocks: 5, broadleaf: 16, bush: 10, rock: 8, flower: 50 },
  },
  wall: {
    grass: ['#7fcb7f', '#5aa860'],
    sand: '#efdcaa',
    rock: '#8d8a80',
    peak: 1,
    props: { wall: true, broadleaf: 16, bush: 10, rock: 8, flower: 50 },
  },
};

export const biomeOf = (kind: string): Biome => BIOMES[kind] ?? BIOMES.palm!;
export const leafColors = (b: Biome) => b.props.leafColors ?? LEAF;
