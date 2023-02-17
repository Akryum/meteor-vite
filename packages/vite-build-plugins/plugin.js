const paths = {
    workerDev: 'worker/worker-dev.mjs',
    workerProd: 'worker/worker-prod.mjs',
    meteorStubs: 'worker/vite-plugins/meteor-stubs.mjs',
}

const sources = Object.fromEntries(
  Object.entries(paths).map(([key, relativePath]) => [key, Assets.getText(relativePath)])
);

ViteBuildPlugins = {
    paths,
    sources,
}
