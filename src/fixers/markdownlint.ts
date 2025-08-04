import * as fs from 'fs'
import * as exec from '@actions/exec'
import { BaseFixer } from './base'

export class MarkdownLintFixer extends BaseFixer {
  constructor(config: any = {}, paths: string[] = ['.']) {
    super('markdownlint', config, paths)
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

    // Add fix flag
    cmd.push('--fix')

    // Generate patterns for each configured path
    for (const path of this.paths) {
      const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path
      if (cleanPath === '.') {
        cmd.push('**/*.md')
      } else {
        cmd.push(`${cleanPath}/**/*.md`)
      }
    }

    return cmd
  }

  getExtensions(): string[] {
    return ['.md', '.markdown']
  }
}
