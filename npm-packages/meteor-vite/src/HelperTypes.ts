export type DeepPartial<TObject> = TObject extends {} ? {
    [key in keyof TObject]?: DeepPartial<TObject[key]>
} : TObject;