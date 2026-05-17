/** Типы для `skills.config.js` — канонический реестр скиллов. */

export interface SkillComboDef {
  id: string;
  asset: string;
  sequence: string;
  name: string;
  icon: string;
  cooldownSec: number;
  archetype: string;
  damage: number;
  runeTier: number;
  functionType: string;
  desc: string;
}

export interface SkillsGlobalConfig {
  baseRuneCastTimeSec: number;
  dualRuneSharedCooldownSec: number;
  slotPenaltyByActiveBooks: Record<string, { cdMul: number; powerMul: number }>;
  portal: {
    warmupSec: number;
    openingSec: number;
    midSec: number;
    closingSec: number;
    spawnRateByPhase: { opening: number; mid: number; closing: number };
    activeEnemyCapBase: number;
    activeEnemyCapPerWave: number;
  };
}

export interface SkillsConfig {
  global: SkillsGlobalConfig;
  singleRuneCombos: SkillComboDef[];
  dualRuneCombos: SkillComboDef[];
  invokeCombos: SkillComboDef[];
  extraSkillAssets: { id: string; asset: string; name: string }[];
}

export const SKILL_DESCRIPTIONS: Readonly<Record<string, string>>;
export const SKILLS_CONFIG: SkillsConfig;
