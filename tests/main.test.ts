import { getLocalDir } from "./util";
import { rmRF } from '@actions/io';
import { cacheFile, downloadTool, find } from '@actions/tool-cache';
import nock from 'nock';
import { _installTool } from '../src/main';
import { _filterVersion } from "../src/util";

const tempPath = getLocalDir('temp');
const cachePath = getLocalDir('tools');

// @actions/tool-cache plays with these on load - force them for testing
process.env['RUNNER_TEMP'] = tempPath;
process.env['RUNNER_TOOL_CACHE'] = cachePath;

function setupTest(): void {
    beforeAll(function () {
        nock('http://example.com')
            .persist()
            .get('/bytes/35')
            .reply(200)
    });

    beforeEach(async function () {
        await rmRF(cachePath);
        await rmRF(tempPath);
    });

    afterAll(async function () {
        await rmRF(tempPath);
        await rmRF(cachePath);
    });

    describe('Test Functions', () => {
        setupTest();
        it('Will give the tool path if already set', async () => {
            const downPath: string = await downloadTool(
                'http://example.com/bytes/35'
            );
            await cacheFile(downPath, 'aws', 'aws', '1.1.0');
            const toolPath: string = find('aws', '1.1.0');
            const cachedPath = await _installTool();
            expect(cachedPath).toBe(toolPath);
        });

    });
}