import {
  ExportXInteger,
  ExportXObject,
  ExportXString,
  FIRST,
  MyMeteor,
  ReExportedMeteor,
  b,
  c,
  first,
  namedFunction,
} from 'meteor/test:ts-modules'
import DefaultReExport, { NamedReExport } from 'meteor/test:ts-modules/re-exports-index'
import { ExplicitRelativePath } from 'meteor/test:ts-modules/explicit-relative-path'
import { describe, expect, it } from 'ts-minitest'

export default () => describe('TypeScript Atmosphere package exports', () => {
  it('does not collide with uppercase and lowercase exports', () => {
    expect(FIRST).toBe('UPPERCASE')
    expect(first).toBe('lowercase')
  })

  it('can parse export { foo, bar } syntax', () => {
    expect(b).toBe(2)
    expect(c).toBe(3)
  })

  it('can parse named functions', () => {
    expect(typeof namedFunction).toBe('function')
  })

  it('can export Meteor, retaining known properties', () => {
    expect(MyMeteor.isServer).toBe(false)
    expect(MyMeteor.isClient).toBe(true)
    expect(typeof MyMeteor.subscribe).toBe('function')
  })

  it('can re-export Meteor, retaining known properties', () => {
    expect(ReExportedMeteor.isServer).toBe(false)
    expect(ReExportedMeteor.isClient).toBe(true)
    expect(typeof ReExportedMeteor.subscribe).toBe('function')
  })

  it('can export * from relative modules', () => {
    expect(ExportXInteger).toBe(1)
    expect(ExportXString).toBe('foo')
    expect(ExportXObject.key).toBe('value')
  })

  it('can import using paths relative to the package root', () => {
    expect(ExplicitRelativePath).toBe(
      'this should be imported as "meteor/test:ts-modules/explicit-relative-path"',
    )
  })

  it('can re-export named exports from other modules as default', () => {
    expect(DefaultReExport).toBe('DefaultReExport')
  })

  it('can re-export named exports from other modules', () => {
    expect(NamedReExport).toBe('NamedReExport')
  })
})
