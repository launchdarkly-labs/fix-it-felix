import { BaseFixer } from './base'
import { ESLintFixer } from './eslint'
import { PrettierFixer } from './prettier'
import { MarkdownLintFixer } from './markdownlint'
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
    default:
      return null
  }
}

export const AVAILABLE_FIXERS = ['eslint', 'prettier', 'markdownlint']
