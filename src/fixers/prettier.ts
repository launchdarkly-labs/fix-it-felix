import * as fs from 'fs'
import * as exec from '@actions/exec'
import { BaseFixer } from './base'
import { ConfigManager } from '../config'
import { minimatch } from 'minimatch'
import { FixerConfig } from '../types'

export class PrettierFixer extends BaseFixer {
  private configManager?: ConfigManager

  constructor(config: FixerConfig = {}, paths: string[] = ['.'], configManager?: ConfigManager) {
    super('prettier', config, paths)
    this.configManager = configManager
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if prettier is installed locally
      if (fs.existsSync('node_modules/.bin/prettier')) {
        return true
      }

      // Check if prettier is globally available
      await exec.exec('npx', ['prettier', '--version'], { silent: true })
      return true
    } catch {
      return false
    }
  }

  private filterIgnoredPaths(paths: string[]): string[] {
    if (!this.configManager) {
      return paths
    }

    const ignorePatterns = this.configManager.getIgnorePatterns()
    return paths.filter(path => {
      const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path

      // Check if this path matches any ignore pattern
      return !ignorePatterns.some(pattern => {
        // Convert glob pattern to work with minimatch
        const normalizedPattern = pattern.replace(/\*\*\//, '').replace(/\/\*\*$/, '/**')
        return (
          minimatch(cleanPath, normalizedPattern) ||
          minimatch(cleanPath + '/', normalizedPattern) ||
          cleanPath.startsWith(pattern.replace('/**', ''))
        )
      })
    })
  }

  getCommand(): string[] {
    // Use custom command if provided
    if (this.hasCustomCommand()) {
      return this.getCustomCommand()
    }

    const cmd = ['npx', 'prettier']

    // Add config file if specified
    if (this.config.configFile) {
      cmd.push('--config', this.config.configFile)
    }

    // Add write flag
    cmd.push('--write')

    // Filter out ignored paths
    const filteredPaths = this.filterIgnoredPaths(this.paths)

    // If all paths are ignored, return early command that will do nothing
    if (filteredPaths.length === 0) {
      cmd.push('--no-error-on-unmatched-pattern')
      cmd.push('non-existent-file-to-ensure-no-processing')
      return cmd
    }

    // Generate file patterns based on filtered paths and extensions
    const extensions = this.getExtensions()
    const extPattern = extensions.map(ext => ext.slice(1)).join(',')

    // Create patterns for each filtered path
    for (const path of filteredPaths) {
      const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path
      if (cleanPath === '.') {
        cmd.push(`**/*.{${extPattern}}`)
      } else if (cleanPath.includes('*') || cleanPath.includes('.')) {
        // Handle glob patterns and specific files
        cmd.push(cleanPath)
      } else {
        // Handle directory paths
        cmd.push(`${cleanPath}/**/*.{${extPattern}}`)
      }
    }

    return cmd
  }

  getExtensions(): string[] {
    return (
      this.config.extensions || [
        '.js',
        '.jsx',
        '.ts',
        '.tsx',
        '.json',
        '.css',
        '.scss',
        '.md',
        '.yml',
        '.yaml'
      ]
    )
  }
}
