import * as core from '@actions/core'
import * as exec from '@actions/exec'
import { FixerResult } from '../types'

export abstract class BaseFixer {
  protected name: string
  protected config: any
  protected paths: string[]

  constructor(name: string, config: any = {}, paths: string[] = ['.']) {
    this.name = name
    this.config = config
    this.paths = paths
  }

  protected hasCustomCommand(): boolean {
    return (
      this.config.command && Array.isArray(this.config.command) && this.config.command.length > 0
    )
  }

  protected getCustomCommand(): string[] {
    if (!this.hasCustomCommand()) {
      return []
    }

    // Check if paths should be appended (default: true)
    const shouldAppendPaths = this.config.appendPaths !== false

    // If appendPaths is enabled and paths are configured and not just default ['.'], append them to custom command
    if (
      shouldAppendPaths &&
      this.paths.length > 0 &&
      !(this.paths.length === 1 && this.paths[0] === '.')
    ) {
      return [...this.config.command, ...this.paths]
    }

    return [...this.config.command]
  }

  abstract isAvailable(): Promise<boolean>
  abstract getCommand(): string[]
  abstract getExtensions(): string[]

  async run(): Promise<FixerResult> {
    const result: FixerResult = {
      name: this.name,
      success: false,
      changedFiles: [],
      output: ''
    }

    try {
      if (!(await this.isAvailable())) {
        result.error = `${this.name} is not available`
        return result
      }

      const command = this.getCommand()
      core.info(`🔧 Running ${this.name}: ${command.join(' ')}`)

      let output = ''
      const options = {
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString()
          },
          stderr: (data: Buffer) => {
            output += data.toString()
          }
        },
        ignoreReturnCode: true
      }

      const exitCode = await exec.exec(command[0], command.slice(1), options)

      result.output = output
      result.changedFiles = await this.getChangedFiles()

      // Consider the fixer successful if it ran (even if it found unfixable issues)
      // Only mark as failed if it genuinely crashed or couldn't run
      const didRun = exitCode !== 127 && exitCode !== 126 // 127 = command not found, 126 = not executable
      const madeChanges = result.changedFiles.length > 0

      // Success if the tool ran successfully, or if it ran and made changes (even with warnings/unfixable errors)
      result.success = exitCode === 0 || (didRun && madeChanges)

      if (exitCode !== 0) {
        const isCustomCommand = this.hasCustomCommand()
        const commandStr = command.join(' ')

        if (!result.success) {
          result.error = `${this.name} exited with code ${exitCode}`

          if (isCustomCommand) {
            core.error(`❌ Custom command failed: ${commandStr}`)
            core.error(`💡 Common fixes:`)
            core.error(`   • Ensure dependencies are installed (add 'npm ci' step before Felix)`)
            core.error(`   • Verify the command works locally: ${commandStr}`)
            core.error(`   • Check that npm scripts exist in package.json`)
            core.error(`   • Consider using built-in commands instead of custom ones`)
          } else {
            core.error(`❌ ${this.name} failed with exit code ${exitCode}`)
          }
        } else if (madeChanges) {
          core.info(
            `✨ ${this.name} fixed ${result.changedFiles.length} files (exit code ${exitCode} with unfixable issues)`
          )
        } else {
          core.info(
            `✨ ${this.name} ran successfully but found unfixable issues (exit code ${exitCode})`
          )
        }
        // Note: Don't call core.setFailed() here as it would prevent other fixers from running
      }
    } catch (error) {
      result.error = error instanceof Error ? error.message : String(error)
    }

    return result
  }

  private async getChangedFiles(): Promise<string[]> {
    try {
      let output = ''
      await exec.exec('git', ['diff', '--name-only'], {
        listeners: {
          stdout: (data: Buffer) => {
            output += data.toString()
          }
        }
      })

      return output
        .trim()
        .split('\n')
        .filter(file => file.length > 0)
    } catch {
      return []
    }
  }
}
