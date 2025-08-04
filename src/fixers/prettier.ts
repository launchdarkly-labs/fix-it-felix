import * as fs from 'fs'
import * as exec from '@actions/exec'
import { BaseFixer } from './base'

export class PrettierFixer extends BaseFixer {
  constructor(config: any = {}) {
    super('prettier', config)
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
    
    // Add write flag and target patterns
    cmd.push('--write')
    
    // Add file patterns based on extensions
    const extensions = this.getExtensions()
    const patterns = extensions.map(ext => `**/*${ext}`).join(',')
    cmd.push(`**/*.{${extensions.map(ext => ext.slice(1)).join(',')}}`)
    
    return cmd
  }

  getExtensions(): string[] {
    return this.config.extensions || ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.scss', '.md', '.yml', '.yaml']
  }
}