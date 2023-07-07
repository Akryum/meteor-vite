export default function CreateIPCInterface<
    Methods extends {
        [key in string]: (reply: IPCReply<{ kind: string, data: unknown }>, ...params: [params: any]) => void;
    },
>(methods: Methods) {
    return methods;
}

export type IPCInterface<Methods, Replies> = { [key in keyof Methods]: (reply: (data: Replies) => void) => void }

export type IPCReply<Reply extends {
    readonly kind: string;
    data: unknown;
}> = (reply: Reply) => void;
