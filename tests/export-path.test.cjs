const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (process.platform !== 'win32') {
    console.log('SKIP: Windows export/restore integration');
    process.exit(0);
}
const rar = ['C:\\Program Files\\WinRAR\\Rar.exe', 'C:\\Program Files (x86)\\WinRAR\\Rar.exe'].find(fs.existsSync);
assert.ok(rar, '需要 WinRAR 进行真实双层 RAR 测试');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-tools-export-test-'));
const exporter = path.resolve(__dirname, '../export-path.cmd');
const restorer = path.resolve(__dirname, '../restore-dev-tools.cmd');
function run(script, input, interactive = false, persistentConsole = false) {
    const command = persistentConsole
        ? '& $env:ComSpec /d /k \'call "%SCRIPT_UNDER_TEST%" "%INPUT_UNDER_TEST%" --no-pause\'; exit $LASTEXITCODE'
        : '& $env:SCRIPT_UNDER_TEST $env:INPUT_UNDER_TEST --no-pause; exit $LASTEXITCODE';
    return spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
        env: { ...process.env, DEVTOOLS_PACK_CONSOLE: persistentConsole ? '1' : '',
            SCRIPT_UNDER_TEST: script, INPUT_UNDER_TEST: interactive ? '' : input },
        input: interactive ? `"${input}"\r\n` : undefined,
        encoding: 'utf8', windowsHide: true, timeout: 60000
    });
}
function archives(parent) {
    return fs.readdirSync(parent).filter(name => /^[a-f0-9]{64}\.txt$/.test(name));
}
function exportAndRestore(input, expected, interactive, persistentConsole = false) {
    const parent = path.dirname(input);
    const before = archives(parent);
    const packed = run(exporter, input, interactive, persistentConsole);
    assert.equal(packed.status, 0, packed.stdout + packed.stderr);
    const created = archives(parent).filter(name => !before.includes(name));
    assert.equal(created.length, 1, '在输入项同级生成一个随机哈希 .txt');
    const archive = path.join(parent, created[0]);
    assert.ok(fs.readFileSync(archive).subarray(0, 8).equals(Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00])));
    const locked = spawnSync(rar, ['lb', '-p-', archive], { encoding: 'utf8', windowsHide: true });
    assert.notEqual(locked.status, 0, '外层文件名加密');
    assert.ok(!/[a-f0-9]{64}\.txt/.test(locked.stdout), '无密码不能列出内层文件名');
    const unpacked = run(restorer, archive, false, persistentConsole);
    assert.equal(unpacked.status, 0, unpacked.stdout + unpacked.stderr);
    const directory = path.join(parent, path.basename(archive, '.txt'), 'dev-tools');
    assert.deepEqual(fs.readdirSync(directory).sort(), Object.keys(expected).sort());
    for (const [name, bytes] of Object.entries(expected)) {
        assert.deepEqual(fs.readFileSync(path.join(directory, name)), bytes, '往返还原内容一致');
    }
    return archive;
}
try {
    const source = path.join(temp, '代码目录 & 空格');
    fs.mkdirSync(source);
    const expected = {
        '中文 & 页面.html': Buffer.from('<!doctype html>\r\n<title>中文</title>\r\n'),
        'sample.js': Buffer.from('const value = "中文";\r\n'),
        'style.css': Buffer.from('body { color: red; }\r\n')
    };
    for (const [name, bytes] of Object.entries(expected)) fs.writeFileSync(path.join(source, name), bytes);
    fs.writeFileSync(path.join(source, '说明.md'), '# 文档');
    fs.writeFileSync(path.join(source, 'sample.test.js'), 'throw new Error("not exported")');
    fs.writeFileSync(path.join(source, 'sample.spec.ts'), 'throw new Error("not exported")');
    fs.mkdirSync(path.join(source, 'neon-timer'));
    fs.writeFileSync(path.join(source, 'neon-timer', 'nested.js'), 'excluded');
    exportAndRestore(source, expected, true);
    const single = path.join(source, '中文 & 页面.html');
    exportAndRestore(single, { '中文 & 页面.html': expected['中文 & 页面.html'] }, false, true);
    const before = archives(source);
    const invalid = run(exporter, path.join(source, '说明.md'));
    assert.notEqual(invalid.status, 0, '拒绝无法由原还原逻辑接受的单文件');
    assert.deepEqual(archives(source), before, '失败时不发布结果');
    for (const [name, bytes] of Object.entries(expected)) assert.deepEqual(fs.readFileSync(path.join(source, name)), bytes);
    for (const parent of [temp, source]) {
        assert.ok(!fs.readdirSync(parent).some(name => name.startsWith('.dev-tools-pack-') || name.startsWith('.dev-tools-restore-')));
    }
    console.log('PASS: interactive directory/single-file export, original restore roundtrip, Unicode/space/& paths, filename encryption, filtering, source preservation, cleanup');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
