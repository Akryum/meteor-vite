import fs from 'node:fs/promises';
import Path from 'path';
import { createServer } from 'vite';
import { MeteorViteConfig } from '../../vite/MeteorViteConfig';
import { MeteorStubs } from '../../vite';

export async function startViteDevServer(send: {
    viteConfig(config: MeteorViteConfig): void
}) {
    const server = await createServer({
        plugins: [
            MeteorStubs({
                meteorPackagePath: Path.join('.meteor', 'local', 'build', 'programs', 'web.browser', 'packages'),
                projectJsonContent: JSON.parse(await fs.readFile('package.json', 'utf-8')),
            }),
            {
                name: 'meteor-handle-restart',
                buildStart () {
                    if (!listening) {
                        send.viteConfig(server.config);
                    }
                },
            },
        ],
    });
    
    let listening = false
    await server.listen().then(() => {
        send.viteConfig(server.config);
        listening = true
    });
}
