export default function CreateIPCInterface<
    Methods extends {
        [key in string]: (reply: IPCReply<Replies>, ...params: [params: any]) => void;
    },
    Replies extends { kind: string, data: unknown },
>(methods: Methods) {
    return methods;
}

export type IPCInterface<Methods, Replies> = { [key in keyof Methods]: (reply: (data: Replies) => void) => void }

export type IPCReply<Reply extends {
    readonly kind: string;
    data: unknown;
}> = (reply: Reply) => void;
