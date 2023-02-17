ViteBuildPlugins = {
    devWorkerPath: Assets.absoluteFilePath?.('worker-dev.mjs'),
    loadPluginSource: Assets.getText?.('vite-load-plugin.mjs'),
    workerSource: Assets.getText?.('worker.mjs'),
}