const paths = {
    workerDev: 'worker/worker-dev.mjs',
    workerProd: 'worker/worker-prod.mjs',
    meteorStubs: 'worker/vite-plugins/meteor-stubs.mjs',
}
ViteBuildPlugins = {
    paths,
    sources: Object.fromEntries(
      Object.entries(paths).map(([moduleName, relativePath]) => [moduleName, Assets.getText(relativePath)])
    ),
}
