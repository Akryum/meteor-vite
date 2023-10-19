import type { RollupOutput } from 'rollup'
import { build, resolveConfig } from 'vite'
import type { MeteorViteConfig } from '../../vite/MeteorViteConfig'
import { MeteorStubs } from '../../vite'
import MeteorVitePackage from '../../../package.json'
import type { PluginSettings, ProjectJson } from '../../vite/plugin/MeteorStubs'
import type { IPCReply } from './IPC/interface'
import CreateIPCInterface from './IPC/interface'

interface BuildOptions {
  viteOutDir: string
  meteor: PluginSettings['meteor']
  packageJson: ProjectJson
}

type Replies = IPCReply<{
  kind: 'buildResult'
  data: {
    payload: {
      success: boolean
      meteorViteConfig: any
      output?: { name?: string; type: string; fileName: string }[]
    }
  }
}>

export default CreateIPCInterface({
  async buildForProduction(
    reply: Replies,
    buildConfig: BuildOptions,
  ) {
    const { viteOutDir, meteor, packageJson } = buildConfig

    Object.entries(buildConfig).forEach(([key, value]) => {
      if (!value)
        throw new Error(`Vite: Worker missing required build argument "${key}"!`)
    })

    const viteConfig: MeteorViteConfig = await resolveConfig({
      configFile: packageJson?.meteor?.viteConfig,
    }, 'build')

    if (!viteConfig.meteor?.clientEntry)
      throw new Error(`You need to specify an entrypoint in your Vite config! See: ${MeteorVitePackage.homepage}`)

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
          meteor,
          stubValidation: viteConfig.meteor.stubValidation,
          packageJson,
        }),
      ],
    })

    const result = Array.isArray(results) ? results[0] : results

    function validateOutput(rollupResult: typeof result): asserts rollupResult is RollupOutput {
      if ('output' in rollupResult)
        return

      const message = 'Unexpected rollup result!'
      console.error(message, rollupResult)
      throw new Error(message)
    }

    validateOutput(result)

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
      },
    })
  },
})
