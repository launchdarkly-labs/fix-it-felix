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

export interface FelixConfig {
  fixers?: string[]
  paths?: string[]
  ignore?: string[]
  eslint?: {
    configFile?: string
    extensions?: string[]
    paths?: string[]
    command?: string[]
    appendPaths?: boolean
    ignore?: string[]
  }
  prettier?: {
    configFile?: string
    extensions?: string[]
    paths?: string[]
    command?: string[]
    appendPaths?: boolean
    ignore?: string[]
  }
  markdownlint?: {
    configFile?: string
    paths?: string[]
    command?: string[]
    appendPaths?: boolean
    ignore?: string[]
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
  hasFailures: boolean
}
