import { BaseFixer } from './base'
import { ESLintFixer } from './eslint'
import { PrettierFixer } from './prettier'
import { MarkdownLintFixer } from './markdownlint'
import { OxlintFixer } from './oxlint'
import { CustomFixer } from './custom'
import { ConfigManager } from '../config'

export { BaseFixer }

export function createFixer(
  name: string,
  config: any = {},
  paths: string[] = ['.'],
  configManager?: ConfigManager
): BaseFixer | null {
  switch (name.toLowerCase()) {
    case 'eslint':
      return new ESLintFixer(config, paths)
    case 'prettier':
      return new PrettierFixer(config, paths, configManager)
    case 'markdownlint':
      return new MarkdownLintFixer(config, paths)
    case 'oxlint':
      return new OxlintFixer(config, paths)
    default:
      // If not a built-in fixer but has a custom command, create a CustomFixer
      if (config.command && Array.isArray(config.command) && config.command.length > 0) {
        return new CustomFixer(name, config, paths)
      }
      return null
  }
}

export const AVAILABLE_FIXERS = ['eslint', 'prettier', 'markdownlint', 'oxlint']
