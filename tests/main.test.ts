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
    
    beforeEach(async function(){
        await rmRF(cachePath);
        await rmRF(tempPath);
    });

    afterAll(async function(){
        await rmRF(tempPath);
        await rmRF(cachePath);
    });
}