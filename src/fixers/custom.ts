import { BaseFixer } from './base'

export class CustomFixer extends BaseFixer {
  constructor(name: string, config: any = {}, paths: string[] = ['.']) {
    super(name, config, paths)
  }

  async isAvailable(): Promise<boolean> {
    // Custom fixers are always "available" since they rely on user-provided commands
    return true
  }

  getCommand(): string[] {
    // Custom fixers must have a custom command
    if (!this.hasCustomCommand()) {
      throw new Error(`Custom fixer ${this.name} requires a command to be configured`)
    }

    return this.getCustomCommand()
  }

  getExtensions(): string[] {
    // Default to common file extensions, but allow override via config
    return this.config.extensions || ['.js', '.jsx', '.ts', '.tsx', '.json', '.md']
  }
}
