export type IpcResponseHandler<Response extends IpcResponse = IpcResponse> = (response: Response) => void;

type IpcResponse = {
    readonly kind: string;
    data?: any;
}

export default function CreateIPCInterface<
    IpcMethods extends {
    [key in string]: (reply: IpcResponseHandler) => void
}>(methods: IpcMethods) {
    return methods;
}