import fs from 'node:fs/promises'
import { RollupOutput } from 'rollup';
import { build, resolveConfig } from 'vite';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import { MeteorStubs } from '../../vite';
import MeteorVitePackage from '../../../package.json';
import CreateIPCInterface, { IPCReply } from './interface';

interface BuildOptions {
    viteOutDir: string;
    meteorPackagePath: string;
    payloadMarker: string;
}

export default CreateIPCInterface({
    async buildForProduction(
        reply: IPCReply<{
            kind: 'buildResult',
            data: {
                payload: {
                    success: boolean,
                    meteorViteConfig: any,
                    output?: {name?: string, type: string, fileName: string}[]
                };
            }
        }>,
        buildConfig: BuildOptions
    ) {
        const viteConfig: MeteorViteConfig = await resolveConfig({}, 'build');
        const { viteOutDir, meteorPackagePath, payloadMarker } = buildConfig;
        Object.entries(buildConfig).forEach(([key, value]) => {
            if (!value) {
                throw new Error(`Vite: Worker missing required build argument "${key}"!`)
            }
        })
        
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
            if ('output' in rollupResult) {
                return;
            }
            
            const message = 'Unexpected rollup result!';
            console.error(message, rollupResult);
            throw new Error(message);
        }
        
        validateOutput(result);
        
        // Result payload
        reply({
            kind: 'buildResult',
            data: {
                payload: {
                    success: true,
                    meteorViteConfig: viteConfig.meteor,
                    output: result.output.map(o => ({
                        name: o.name,
                        type: o.type,
                        fileName: o.fileName,
                    })),
                },
            }
        })
    }
})




