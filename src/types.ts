export interface FelixInputs {
  fixers: string
  commitMessage: string
  configPath: string
  dryRun: boolean
  skipLabel: string
  allowedBots: string
  paths: string
  personalAccessToken?: string
  debug: boolean
  skipDraftPrs: boolean
}

export interface FixerConfig {
  name?: string
  configFile?: string
  extensions?: string[]
  paths?: string[]
  command?: string[]
  appendPaths?: boolean
  env?: Record<string, string>
  // oxlint-specific properties
  allow?: string[]
  warn?: string[]
  deny?: string[]
  importPlugin?: boolean
  reactPlugin?: boolean
  tsconfig?: string
}

export interface InlineFixerConfig extends FixerConfig {
  name: string // Required for inline configurations
}

export type FixerItem = string | InlineFixerConfig

export interface FelixConfig {
  fixers?: FixerItem[]
  paths?: string[]
  ignore?: string[]
  // Legacy support - these will be deprecated
  eslint?: FixerConfig
  prettier?: FixerConfig
  markdownlint?: FixerConfig
}

export interface FixerResult {
  name: string
  success: boolean
  changedFiles: string[]
  output: string
  error?: string
}

export interface FelixResult {
  fixesApplied: boolean
  changedFiles: string[]
  fixerResults: FixerResult[]
  hasFailures: boolean
}
