ViteBuildPluginBase = class ViteBuildPluginBase {
  paths = {
    workerDev: 'worker/worker-dev.mjs',
    workerProd: 'worker/worker-prod.mjs',
    meteorStubs: 'worker/vite-plugins/meteor-stubs.mjs',
  }

  sources

  constructor() {
    if (typeof Assets.absoluteFilePath === 'function') {
      this.paths = Object.fromEntries(
        Object.entries(this.paths).map(([moduleName, relativePath]) => [moduleName, Assets.absoluteFilePath?.(relativePath)]),
      )
    }

    if (process.env.NODE_ENV === 'production') {
      this.sources = Object.fromEntries(
        Object.entris(this.paths).map(([moduleName, relativePath]) => [moduleName, Assets.getText(relativePath)]),
      )
    }
  }
}

ViteBuildPlugins = new ViteBuildPluginBase()
