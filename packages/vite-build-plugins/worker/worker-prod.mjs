import fs from 'node:fs/promises'
import { build, resolveConfig } from 'vite';
import { MeteorStubs } from './vite-plugins/meteor-stubs.mjs';

const [viteOutDir, meteorPackagePath, payloadMarker] = process.argv.slice(2);

const viteConfig = await resolveConfig({});

const results = await build({
    build: {
        lib: {
            entry: viteConfig.meteor.clientEntry,
            formats: ['es'],
        },
        rollupOptions: {
            output: {
                entryFileNames: 'meteor-entry.js',
                chunkFileNames: '[name].js',
            },
        },
        outDir: viteOutDir,
        minify: false,
    },
    plugins: [
        MeteorStubs({
            isForProduction: true,
            meteorPackagePath,
            projectJson: JSON.parse(await fs.readFile('package.json', 'utf-8'))
        }),
    ],
});

const result = Array.isArray(results) ? results[0] : results;

// Result payload
process.stdout.write(payloadMarker);
process.stdout.write(JSON.stringify({
    success: true,
    meteorViteConfig: viteConfig.meteor,
    output: result.output.map(o => ({
        name: o.name,
        type: o.type,
        fileName: o.fileName,
    })),
}));
