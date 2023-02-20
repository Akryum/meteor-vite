import pc from 'picocolors';

ViteBuildPluginBase = class ViteBuildPluginBase {
    paths = {
        workerDev: 'worker/worker-dev.mjs',
        workerProd: 'worker/worker-prod.mjs',
        meteorStubs: 'worker/vite-plugins/meteor-stubs.mjs',
    };

    _sources = null;

    get sources() {
        if (process.env.NODE_ENV !== 'production') {
            throw new Error('⚡ ViteBuildPluginBase.sources should only be used during the production build');
        }

        if (this._sources) {
            return this._sources;
        }

        return this._sources = Object.fromEntries(
            Object.entries(this.paths).map(([moduleName, relativePath]) => {
                    try {
                        return [moduleName, Assets.getText(relativePath)]
                    } catch (error) {
                        console.error(`⚡  %s`, pc.red(`Failed to load ${pc.yellow(moduleName)}\n  ${pc.gray(relativePath)}`, { error }));
                        return [moduleName, '']
                    }
                }
            ),
        );
    }

    constructor() {
        if (typeof Assets.absoluteFilePath === 'function') {
            this.paths = Object.fromEntries(
              Object.entries(this.paths).map(([moduleName, relativePath]) => [moduleName, Assets.absoluteFilePath?.(relativePath)]),
            );
        }
    }
};

ViteBuildPlugins = new ViteBuildPluginBase();
