import { Meteor } from 'meteor/meteor'
import { Mongo } from 'meteor/mongo'
import type { WorkerResponseData } from '../../../npm-packages/meteor-vite/src/bin/worker'

export type RuntimeConfig = WorkerResponseData<'viteConfig'> & { ready: boolean }
export let MeteorViteConfig: Mongo.Collection<RuntimeConfig>

export const ViteConnection = {
  publication: 'meteor:vite' as const,
  configSelector: { _id: 'viteConfig' },
}

export function getConfig(): RuntimeConfig {
  const viteConfig = MeteorViteConfig.findOne(ViteConnection.configSelector)
  return viteConfig || { ready: false }
}

export function setConfig<TConfig extends Partial<RuntimeConfig>>(config: TConfig) {
  MeteorViteConfig.upsert(ViteConnection.configSelector, { $set: config })
  return config
}

if (Meteor.isDevelopment)
  MeteorViteConfig = new Mongo.Collection('meteor:vite')
