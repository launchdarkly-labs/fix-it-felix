import * as fs from 'fs'
import * as exec from '@actions/exec'
import { BaseFixer } from './base'

export class PrettierFixer extends BaseFixer {
  constructor(config: any = {}, paths: string[] = ['.']) {
    super('prettier', config, paths)
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

  getCommand(): string[] {
    const cmd = ['npx', 'prettier']

    // Add config file if specified
    if (this.config.configFile) {
      cmd.push('--config', this.config.configFile)
    }

    // Add write flag
    cmd.push('--write')

    // Generate file patterns based on configured paths and extensions
    const extensions = this.getExtensions()
    const extPattern = extensions.map(ext => ext.slice(1)).join(',')

    // Create patterns for each configured path
    for (const path of this.paths) {
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
