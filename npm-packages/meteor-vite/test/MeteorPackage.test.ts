import { describe, expect, it } from 'vitest'
import MeteorPackage from '../src/meteor/package/components/MeteorPackage'
import { PackageSubmodule } from '../src/meteor/package/components/PackageSubmodule'
import { TsModules } from './__mocks'

describe('meteorPackage', () => {
  describe('utility methods', () => {
    describe('get module exports from path', () => {
      it('without a file extension', async () => {
        const meteorPackage = await MeteorPackage.parse({
          filePath: TsModules.filePath,
          fileContent: TsModules.fileContent,
        })
        const file = meteorPackage.getModule({
          importPath: '/explicit-relative-path',
        })
        const mockModule = new PackageSubmodule({
          meteorPackage,
          modulePath: 'explicit-relative-path.ts',
          exports: TsModules.modules['explicit-relative-path.ts'],
        })

        expect(file?.exports).toEqual(mockModule.exports)
        expect(file?.modulePath).toEqual('explicit-relative-path.ts')
      })

      it('with a file extension', async () => {
        const meteorPackage = await MeteorPackage.parse({
          filePath: TsModules.filePath,
          fileContent: TsModules.fileContent,
        })
        const file = meteorPackage.getModule({
          importPath: '/explicit-relative-path',
        })
        const mockModule = new PackageSubmodule({
          meteorPackage,
          modulePath: 'explicit-relative-path.ts',
          exports: TsModules.modules['explicit-relative-path.ts'],
        })

        expect(file?.exports).toEqual(mockModule.exports)
        expect(file?.modulePath).toEqual('explicit-relative-path.ts')
      })
    })
  })
})
