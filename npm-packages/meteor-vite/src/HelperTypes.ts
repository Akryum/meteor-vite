export type DeepPartial<TObject> = TObject extends Record<string, any> ? {
  [key in keyof TObject]?: DeepPartial<TObject[key]>
} : TObject
