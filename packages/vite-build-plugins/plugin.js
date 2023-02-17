ViteBuildPlugins = {
    dev: {
        workerPath: Assets.absoluteFilePath?.('worker/worker-dev.mjs'),
    },
    source: {
        vitePlugins: {
            meteorStubs: Assets.getText?.('worker/vite-plugins/meteor-stubs.mjs'),
        },
        worker: Assets.getText?.('worker/worker-prod.mjs')
    },
}