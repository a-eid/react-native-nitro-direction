const path = require('path')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

/**
 * Metro config for the example app. The library source lives one level up in
 * the monorepo (`packages/react-native-nitro-direction/src`), so we add it as a
 * watchFolder and symlink-resolve the package so edits hot-reload without a
 * `nitrogen` rebuild.
 */
const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '..')

const defaultConfig = getDefaultConfig(projectRoot)

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    disableHierarchicalLookup: false,
  },
}

module.exports = mergeConfig(defaultConfig, config)
