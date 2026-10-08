const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (process.platform !== 'win32') {
    console.log('SKIP: Windows CMD integration test');
    process.exit(0);
}
const rar = ['C:\\Program Files\\WinRAR\\Rar.exe', 'C:\\Program Files (x86)\\WinRAR\\Rar.exe'].find(fs.existsSync);
assert.ok(rar, '需要 WinRAR Rar.exe 创建真实 RAR 测试包');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-tools-restore-test-'));
const scriptDirectory = path.join(temp, '脚本目录');
fs.mkdirSync(scriptDirectory);
const script = path.join(scriptDirectory, 'restore-dev-tools.cmd');
fs.copyFileSync(path.resolve(__dirname, '../restore-dev-tools.cmd'), script);
function archive(args) {
    const result = spawnSync(rar, args, { cwd: temp, encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
}
function restore(file, interactive = false, sevenZip = false) {
    // PowerShell passes the argument to CMD without concatenating user input into shell code.
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command',
        '& $env:RESTORE_TEST_SCRIPT $env:RESTORE_TEST_INPUT --no-pause; exit $LASTEXITCODE'], {
        env: { ...process.env,
            ...(sevenZip ? { PATH: 'C:\\Program Files\\NVIDIA Corporation\\NVIDIA app;' + process.env.PATH } : {}),
            RESTORE_TEST_SCRIPT: script, RESTORE_TEST_INPUT: interactive ? '' : file },
        input: interactive ? `"${file}"\r\n` : undefined,
        encoding: 'utf8', windowsHide: true, timeout: 60000
    });
    return result;
}
try {
    const source = path.join(temp, 'dev-tools');
    fs.mkdirSync(source);
    const sample = 'const example = "中文 & spaces";\r\n';
    fs.writeFileSync(path.join(source, 'example.js'), sample);
    archive(['a', '-ma5', '-y', path.join(temp, 'inner.rar'), 'dev-tools']);
    fs.renameSync(path.join(temp, 'inner.rar'), path.join(temp, 'inner.txt'));
    const outer = path.join(temp, '导出文件 & 空格.txt');
    archive(['a', '-ma5', '-hp982003834', '-y', path.join(temp, 'outer.rar'), 'inner.txt']);
    fs.renameSync(path.join(temp, 'outer.rar'), outer);
    const original = fs.readFileSync(outer);
    const second = path.join(temp, '第二份导出 & 空格.txt');
    fs.copyFileSync(outer, second);
    for (const [file, interactive] of [[outer, false], [second, true]]) {
        const result = restore(file, interactive);
        assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    const results = ['导出文件 & 空格', '第二份导出 & 空格'];
    for (const result of results) {
        assert.deepEqual(fs.readdirSync(path.join(temp, result)), ['dev-tools']);
        assert.equal(fs.readFileSync(path.join(temp, result, 'dev-tools/example.js'), 'utf8'), sample);
    }
    assert.deepEqual(fs.readFileSync(outer), original, '不修改原始导出文件');
    assert.deepEqual(fs.readdirSync(scriptDirectory), ['restore-dev-tools.cmd'], '输出须与输入文件同级，不能放在脚本目录');
    assert.notEqual(restore(outer).status, 0, '已有同名目录时应停止，不覆盖');
    assert.equal(fs.readFileSync(path.join(temp, results[0], 'dev-tools/example.js'), 'utf8'), sample);
    if (fs.existsSync('C:\\Program Files\\NVIDIA Corporation\\NVIDIA app\\7z.exe')) {
        const hash = 'a'.repeat(64);
        const sevenZipInput = path.join(temp, hash + '.txt');
        fs.copyFileSync(outer, sevenZipInput);
        const result = restore(sevenZipInput, false, true);
        assert.equal(result.status, 0, result.stdout + result.stderr);
        assert.equal(fs.readFileSync(path.join(temp, hash, 'dev-tools/example.js'), 'utf8'), sample);
    }
    const invalid = path.join(temp, '损坏.txt');
    fs.writeFileSync(invalid, 'not a RAR archive');
    assert.notEqual(restore(invalid).status, 0, '损坏的 RAR 应失败');
    assert.ok(!fs.readdirSync(temp).some(name => name.startsWith('.dev-tools-restore-')), '清理本次临时文件');
    console.log('PASS: real RAR restore, interactive quoted path, spaces/Unicode/metacharacter, repeat, invalid archive, cleanup');
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}
