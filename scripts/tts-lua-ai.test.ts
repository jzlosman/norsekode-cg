import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const scenarios = [
  'jarl_metadata_and_legacy_aliases',
  'live_rules_baseline',
  'pure_resolver',
  'compact_entry_cache',
  'plan_generation',
  'skirmish_simulation',
  'fast_simulation_oracle',
  'simulation_special_rules',
  'hero_momentum_abilities',
  'oath_evaluation',
  'near_optimal_randomization',
  'incremental_search',
  'state_migration',
  'full_strategic_choice',
]

const runScenario = (scenario: string) => spawnSync(
  './node_modules/.bin/fengari',
  ['scripts/tts-lua-ai.test.lua', scenario],
  { cwd: process.cwd(), encoding: 'utf8', timeout: 25_000 },
)

describe('TTS strategic formation AI', () => {
  for (const scenario of scenarios) {
    it(scenario.replaceAll('_', ' '), () => {
      const result = runScenario(scenario)
      expect(result.status, [result.stdout, result.stderr].filter(Boolean).join('\n')).toBe(0)
      expect(result.stderr, result.stderr).toBe('')
      expect(result.stdout).toContain(`PASS ${scenario}`)
    }, 30_000)
  }
})
