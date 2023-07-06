export default function CreateIPCInterface<
    Methods,
    Replies,
>(methods: IPCInterface<Methods, Replies>) {
    return methods;
}

export type IPCInterface<Methods, Replies> = { [key in keyof Methods]: (reply: (data: Replies) => void) => void }

export type IPCReply<Reply extends {
    readonly kind: string;
    data: unknown;
}> = (reply: Reply) => void;
