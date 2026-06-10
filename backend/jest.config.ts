import type { Config } from 'jest';
import { config as loadEnv } from 'dotenv';

// Load test environment — sets NODE_ENV=test which guards server.ts listen()
loadEnv({ path: '.env.test' });

const config: Config = {
  preset:         'ts-jest',
  testEnvironment:'node',
  rootDir:        '.',
  roots:          ['<rootDir>/src'],
  testMatch:      ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/scripts/**',
    '!src/**/*.d.ts',
  ],
  coverageDirectory:   'coverage',
  coverageReporters:   ['text', 'lcov'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json',
    }],
  },
  // Ensure ts-jest resolves modules for files outside rootDir
  modulePaths: ['<rootDir>/../'],
};

export default config;
