import { BaseFixer } from './base'
import { ESLintFixer } from './eslint'
import { PrettierFixer } from './prettier'
import { MarkdownLintFixer } from './markdownlint'

export { BaseFixer }

export function createFixer(name: string, config: any = {}): BaseFixer | null {
  switch (name.toLowerCase()) {
    case 'eslint':
      return new ESLintFixer(config)
    case 'prettier':
      return new PrettierFixer(config)
    case 'markdownlint':
      return new MarkdownLintFixer(config)
    default:
      return null
  }
}

export const AVAILABLE_FIXERS = ['eslint', 'prettier', 'markdownlint']