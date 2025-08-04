// Jest setup file
import * as core from '@actions/core'

// Mock @actions/core to prevent actual GitHub Actions calls during testing
jest.mock('@actions/core')
jest.mock('@actions/exec')
jest.mock('@actions/github')

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// Mock core.info, core.warning, etc.
const mockedCore = core as jest.Mocked<typeof core>
mockedCore.info = jest.fn()
mockedCore.warning = jest.fn()
mockedCore.setFailed = jest.fn()
mockedCore.setOutput = jest.fn()
