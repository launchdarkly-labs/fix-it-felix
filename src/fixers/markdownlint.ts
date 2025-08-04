import * as fs from 'fs'
import * as exec from '@actions/exec'
import { BaseFixer } from './base'

export class MarkdownLintFixer extends BaseFixer {
  constructor(config: any = {}) {
    super('markdownlint', config)
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Check if markdownlint-cli2 is installed locally
      if (fs.existsSync('node_modules/.bin/markdownlint-cli2')) {
        return true
      }
      
      // Check if markdownlint-cli2 is globally available
      await exec.exec('npx', ['markdownlint-cli2', '--version'], { silent: true })
      return true
    } catch {
      return false
    }
  }

  getCommand(): string[] {
    const cmd = ['npx', 'markdownlint-cli2']
    
    // Add config file if specified
    if (this.config.configFile) {
      cmd.push('--config', this.config.configFile)
    }
    
    // Add fix flag and target pattern
    cmd.push('--fix', '**/*.md')
    
    return cmd
  }

  getExtensions(): string[] {
    return ['.md', '.markdown']
  }
}