export interface FelixInputs {
  fixers: string
  commitMessage: string
  configPath: string
  dryRun: boolean
  skipLabel: string
  allowedBots: string
  paths: string
  personalAccessToken?: string
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
  }
  prettier?: {
    configFile?: string
    extensions?: string[]
    paths?: string[]
    command?: string[]
    appendPaths?: boolean
  }
  markdownlint?: {
    configFile?: string
    paths?: string[]
    command?: string[]
    appendPaths?: boolean
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
