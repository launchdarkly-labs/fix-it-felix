import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { FelixConfig, FelixInputs } from './types'

export class ConfigManager {
  private inputs: FelixInputs
  private config: FelixConfig = {}

  constructor(inputs: FelixInputs) {
    this.inputs = inputs
    this.loadConfig()
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.inputs.configPath)) {
        const configContent = fs.readFileSync(this.inputs.configPath, 'utf8')
        this.config = JSON.parse(configContent)
        core.info(`📄 Loaded configuration from ${this.inputs.configPath}`)
      } else {
        core.info(`📄 No config file found at ${this.inputs.configPath}, using defaults`)
      }
    } catch (error) {
      core.warning(`Failed to load config file: ${error}`)
      this.config = {}
    }
  }

  getFixers(): string[] {
    // Config file takes precedence over input
    if (this.config.fixers && this.config.fixers.length > 0) {
      return this.config.fixers
    }
    
    return this.inputs.fixers.split(',').map(f => f.trim()).filter(f => f.length > 0)
  }

  getPaths(): string[] {
    return this.config.paths || ['.']
  }

  getIgnorePatterns(): string[] {
    return this.config.ignore || ['node_modules/**', 'dist/**', 'build/**', '.git/**']
  }

  getFixerConfig(fixerName: string): any {
    return this.config[fixerName as keyof FelixConfig] || {}
  }

  getAllowedBots(): string[] {
    return this.inputs.allowedBots.split(',').map(b => b.trim()).filter(b => b.length > 0)
  }
}