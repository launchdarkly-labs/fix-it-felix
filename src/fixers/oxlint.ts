import * as fs from 'fs'
import * as exec from '@actions/exec'
import { BaseFixer } from './base'

export class OxlintFixer extends BaseFixer {
  constructor(config: any = {}, paths: string[] = ['.']) {
    super('oxlint', config, paths)
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if oxlint is installed locally
      if (fs.existsSync('node_modules/.bin/oxlint')) {
        return true
      }

      // Check if oxlint is globally available
      await exec.exec('npx', ['oxlint', '--version'], { silent: true })
      return true
    } catch {
      return false
    }
  }

  getCommand(): string[] {
    // Use custom command if provided
    if (this.hasCustomCommand()) {
      return this.getCustomCommand()
    }

    const cmd = ['npx', 'oxlint']

    // Add config file if specified
    if (this.config.configFile) {
      cmd.push('--config', this.config.configFile)
    }

    // Add fix flag
    cmd.push('--fix')

    // Add rule configurations
    if (this.config.allow && Array.isArray(this.config.allow)) {
      this.config.allow.forEach((rule: string) => {
        cmd.push('-A', rule)
      })
    }

    if (this.config.warn && Array.isArray(this.config.warn)) {
      this.config.warn.forEach((rule: string) => {
        cmd.push('-W', rule)
      })
    }

    if (this.config.deny && Array.isArray(this.config.deny)) {
      this.config.deny.forEach((rule: string) => {
        cmd.push('-D', rule)
      })
    }

    // Add plugin flags
    if (this.config.importPlugin) {
      cmd.push('--import-plugin')
    }

    if (this.config.reactPlugin) {
      cmd.push('--react-plugin')
    }

    // Add tsconfig if specified
    if (this.config.tsconfig) {
      cmd.push('--tsconfig', this.config.tsconfig)
    }

    // Add configured paths
    cmd.push(...this.paths)

    return cmd
  }

  getExtensions(): string[] {
    return (
      this.config.extensions || [
        '.js',
        '.mjs',
        '.cjs',
        '.jsx',
        '.ts',
        '.mts',
        '.cts',
        '.tsx',
        '.vue',
        '.astro',
        '.svelte'
      ]
    )
  }
}
