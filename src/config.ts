import * as core from '@actions/core'
import * as fs from 'fs'
import * as path from 'path'
import { FelixConfig, FelixInputs, FixerConfig, FixerItem } from './types'

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
      return this.config.fixers.map(fixer => this.getFixerName(fixer))
    }

    return this.inputs.fixers
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0)
  }

  private getFixerName(fixer: FixerItem): string {
    if (typeof fixer === 'string') {
      return fixer
    }
    return fixer.name || 'unnamed-fixer'
  }

  getPaths(): string[] {
    // Priority: action input > config file > default
    if (this.inputs.paths) {
      return this.inputs.paths
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)
    }

    if (this.config.paths && this.config.paths.length > 0) {
      return this.config.paths
    }

    return ['.']
  }

  getFixerPaths(fixerName: string): string[] {
    const fixerConfig = this.getFixerConfig(fixerName)

    // If fixer has specific paths configured, use those
    if (fixerConfig.paths && fixerConfig.paths.length > 0) {
      return fixerConfig.paths
    }

    // Otherwise use global paths
    return this.getPaths()
  }

  getIgnorePatterns(): string[] {
    return this.config.ignore || ['node_modules/**', 'dist/**', 'build/**', '.git/**']
  }

  getFixerConfig(fixerName: string): FixerConfig {
    // First check the new format - inline fixer objects in the fixers array
    if (this.config.fixers) {
      for (const fixer of this.config.fixers) {
        if (typeof fixer === 'object' && this.getFixerName(fixer) === fixerName) {
          return fixer
        }
      }
    }

    // Fall back to legacy format for backward compatibility
    const legacyConfig = this.config[fixerName as keyof FelixConfig]
    if (legacyConfig && typeof legacyConfig === 'object') {
      return legacyConfig as FixerConfig
    }

    return {}
  }

  getAllowedBots(): string[] {
    return this.inputs.allowedBots
      .split(',')
      .map(b => b.trim())
      .filter(b => b.length > 0)
  }
}
