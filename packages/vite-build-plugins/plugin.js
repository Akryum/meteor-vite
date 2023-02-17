ViteBuildPlugins = {
    devWorkerPath: Assets.absoluteFilePath?.('worker-dev.mjs'),
    viteMeteorStubs: Assets.getText?.('vite-meteor-stubs.mjs'),
    workerSource: Assets.getText?.('worker.mjs'),
}