import * as fs from 'fs'
import * as exec from '@actions/exec'
import { BaseFixer } from './base'

export class ESLintFixer extends BaseFixer {
  constructor(config: any = {}) {
    super('eslint', config)
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if eslint is installed locally
      if (fs.existsSync('node_modules/.bin/eslint')) {
        return true
      }
      
      // Check if eslint is globally available
      await exec.exec('npx', ['eslint', '--version'], { silent: true })
      return true
    } catch {
      return false
    }
  }

  getCommand(): string[] {
    const cmd = ['npx', 'eslint']
    
    // Add config file if specified
    if (this.config.configFile) {
      cmd.push('-c', this.config.configFile)
    }
    
    // Add extensions if specified
    if (this.config.extensions) {
      cmd.push('--ext', this.config.extensions.join(','))
    }
    
    // Add fix flag and target paths
    cmd.push('--fix', '.')
    
    return cmd
  }

  getExtensions(): string[] {
    return this.config.extensions || ['.js', '.jsx', '.ts', '.tsx', '.vue']
  }
}