export interface FelixInputs {
  fixers: string
  commitMessage: string
  configPath: string
  dryRun: boolean
  skipLabel: string
  allowedBots: string
}

export interface FelixConfig {
  fixers?: string[]
  paths?: string[]
  ignore?: string[]
  eslint?: {
    configFile?: string
    extensions?: string[]
  }
  prettier?: {
    configFile?: string
    extensions?: string[]
  }
  markdownlint?: {
    configFile?: string
  }
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
}
