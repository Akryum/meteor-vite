import path from 'node:path'
import fs from 'fs-extra';

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
    createSources(targetDir) {
        const entries = Object.entries(this.paths).map(([name, relativePath]) => {
            const absolutePath = path.join(targetDir, relativePath);
            const source = sources[name];

            fs.ensureDirSync(path.dirname(absolutePath));
            fs.writeFileSync(absolutePath, source, 'utf8');

            return [name, absolutePath];
        });

        return Object.fromEntries(entries);
    },

}
