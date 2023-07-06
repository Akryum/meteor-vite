type IpcResponseHandler<
    Responses extends IpcResponse = IpcResponse
> = (
    response: {
        [key in keyof Responses]: { kind: key, data: Responses[key] }
    }[keyof Responses],
) => void;

type IpcResponse = {
    [key in string]: unknown;
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