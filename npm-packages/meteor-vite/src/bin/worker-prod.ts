import fs from 'node:fs/promises'
import { RollupOutput } from 'rollup';
import { build, resolveConfig } from 'vite';
import { MeteorViteConfig } from '../vite/MeteorViteConfig';
import { MeteorStubs } from '../vite';
import MeteorVitePackage from '../../package.json';

(async () => {
    const [viteOutDir, meteorPackagePath, payloadMarker] = process.argv.slice(2);
    const viteConfig: MeteorViteConfig = await resolveConfig({}, 'build');
    
    if (!viteConfig.meteor?.clientEntry) {
        throw new Error(`You need to specify an entrypoint in your Vite config! See: ${MeteorVitePackage.homepage}`);
    }
    
    const results = await build({
        build: {
            lib: {
                entry: viteConfig?.meteor?.clientEntry,
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
                meteorPackagePath,
                projectJsonContent: JSON.parse(await fs.readFile('package.json', 'utf-8')),
            }),
        ],
    });
    
    const result = Array.isArray(results) ? results[0] : results;
    
    function validateOutput(rollupResult: typeof result): asserts rollupResult is RollupOutput {
        if ('output' in results) {
            return;
        }
        
        throw new Error("Error parsing rollup output!")
    }
    
    validateOutput(result);
    
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
})();





