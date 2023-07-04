import FS from 'fs';
import Path from 'path';
import { createServer } from 'vite';
import { MeteorViteStubs } from '../vite/MeteorViteStubs';

const projectRoot = Path.join(__dirname, '../../.../../../../examples/vue/');

export default createServer({
    root: projectRoot,
    plugins: [
        MeteorViteStubs({
            meteorPackagePath: Path.join(projectRoot, '.meteor', 'local', 'build', 'programs', 'web.browser', 'packages'),
            projectJsonContent: JSON.parse(FS.readFileSync(Path.join(projectRoot, 'package.json'), 'utf-8')),
        })
    ]
});