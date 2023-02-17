import { build, resolveConfig } from 'vite';
import { viteLoadPlugin } from './vite-load-plugin.mjs';

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
        {
            name: 'meteor-stubs',
            resolveId(id) {
                if (id.startsWith('meteor/')) {
                    return `\0${id}`;
                }
            },
            load: viteLoadPlugin({
                isForProduction: true,
                meteorPackagePath,
            }),
        },
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
