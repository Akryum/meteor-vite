type IpcResponseHandler<Response extends IpcResponse = IpcResponse> = (response: Response) => void;

type IpcResponse = {
    readonly kind: string;
    data?: any;
}

type IpcMethods<Replies extends IpcResponse> = { [key in string]: (reply: IpcResponseHandler<Replies>) => void };

export type InferIpcReplies<Methods> = Methods extends ReturnType<
    typeof CreateIPCInterface<infer Replies extends IpcResponse>
> ? Replies : never;

export default function CreateIPCInterface<
    Replies extends IpcResponse,
    Methods extends IpcMethods<Replies> = IpcMethods<Replies>
>(methods: Methods) {
    return methods;
}