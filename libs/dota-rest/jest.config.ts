import type {Config} from 'jest';
import {pathsToModuleNameMapper} from "ts-jest";
import { compilerOptions } from './tsconfig.json';

const config: Config = {
    verbose: true,
    transform: {
        "^.+\\.(ts|tsx)$": "ts-jest",
    },
    testEnvironment: 'node',
    preset: 'ts-jest',
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
};

export default config;