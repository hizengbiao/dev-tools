@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
set "DEVTOOLS_RESTORE_SCRIPT=%~f0"
set "DEVTOOLS_RESTORE_INPUT=%~1"
if /i "%~1"=="--no-pause" set "DEVTOOLS_RESTORE_INPUT="
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$text = [IO.File]::ReadAllText($env:DEVTOOLS_RESTORE_SCRIPT, [Text.Encoding]::UTF8); $body = ($text -split '(?m)^# POWERSHELL_PAYLOAD\r?$', 2)[1]; & ([ScriptBlock]::Create($body))"
set "DEVTOOLS_RESTORE_EXIT=%ERRORLEVEL%"
if /i not "%~1"=="--no-pause" if /i not "%~2"=="--no-pause" pause
exit /b %DEVTOOLS_RESTORE_EXIT%
# POWERSHELL_PAYLOAD
$ErrorActionPreference = 'Stop'
$stage = $null
$stageFullName = $null
$exitCode = 1

function Find-Archiver {
    foreach ($name in @('rar.exe', 'unrar.exe', '7z.exe', '7za.exe', '7zz.exe')) {
        $command = Get-Command $name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) { return $command.Source }
    }
    foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)) {
        if (-not $base) { continue }
        foreach ($relative in @('WinRAR\UnRAR.exe', 'WinRAR\Rar.exe', '7-Zip\7z.exe', 'NVIDIA Corporation\NVIDIA app\7z.exe')) {
            $candidate = Join-Path $base $relative
            if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
        }
    }
    throw '未找到解压程序。请安装 WinRAR 或 7-Zip 后再运行本脚本。'
}

function Invoke-Archive([string] $archive, [string] $destination, [string] $password) {
    $isSevenZip = [IO.Path]::GetFileName($script:archiver) -match '^7z'
    if ($isSevenZip) {
        $arguments = @('x', '-y', ('-p' + $password), ('-o' + $destination), $archive)
    } else {
        $arguments = @('x', '-y', '-idq', ('-p' + $password), $archive, ($destination + [IO.Path]::DirectorySeparatorChar))
    }
    & $script:archiver @arguments
    if ($LASTEXITCODE -ne 0) {
        throw ('解压失败（退出码 {0}）。请确认文件完整，并且是按约定生成的导出包。' -f $LASTEXITCODE)
    }
}

try {
    Write-Host 'Dev Tools 导出包还原' -ForegroundColor Cyan
    Write-Host '将导出的 .txt 文件拖入此窗口，然后按回车。'
    Write-Host ''
    $inputPath = $env:DEVTOOLS_RESTORE_INPUT
    if ([string]::IsNullOrWhiteSpace($inputPath)) { $inputPath = Read-Host '文件路径' }
    $inputPath = $inputPath.Trim()
    if ($inputPath.StartsWith('"') -and $inputPath.EndsWith('"')) {
        $inputPath = $inputPath.Substring(1, $inputPath.Length - 2)
    }
    $inputFile = Get-Item -LiteralPath $inputPath -ErrorAction Stop
    if ($inputFile.PSIsContainer -or $inputFile.Extension -ine '.txt') {
        throw '请选择单个导出的 .txt 文件。'
    }
    $script:archiver = Find-Archiver
    $parent = [IO.Path]::GetDirectoryName($env:DEVTOOLS_RESTORE_SCRIPT)
    $result = Join-Path $parent $inputFile.BaseName
    if (Test-Path -LiteralPath $result) {
        throw ('解压目录已存在，请先移动或删除该目录后重试：' + $result)
    }
    $stage = Join-Path $parent ('.dev-tools-restore-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $stage | Out-Null
    $stageFullName = (Get-Item -LiteralPath $stage).FullName
    $outer = Join-Path $stage 'outer.rar'
    Copy-Item -LiteralPath $inputFile.FullName -Destination $outer
    $outerContents = Join-Path $stage 'outer'
    New-Item -ItemType Directory -Path $outerContents | Out-Null
    Write-Host '[1/2] 正在解开外层加密 RAR...'
    Invoke-Archive $outer $outerContents '982003834'
    $innerFiles = @(Get-ChildItem -LiteralPath $outerContents -Force)
    if ($innerFiles.Count -ne 1 -or $innerFiles[0].PSIsContainer -or $innerFiles[0].Extension -ine '.txt') {
        throw '外层内容不符合约定：应当只有一个内层 .txt 压缩文件。'
    }
    $inner = Join-Path $stage 'inner.rar'
    Move-Item -LiteralPath $innerFiles[0].FullName -Destination $inner
    $innerContents = Join-Path $stage 'inner'
    New-Item -ItemType Directory -Path $innerContents | Out-Null
    Write-Host '[2/2] 正在解开内层 RAR...'
    Invoke-Archive $inner $innerContents '-'
    $roots = @(Get-ChildItem -LiteralPath $innerContents -Force)
    if ($roots.Count -ne 1 -or -not $roots[0].PSIsContainer -or $roots[0].Name -cne 'dev-tools') {
        throw '内层内容不符合约定：应当只有一个 dev-tools 目录。'
    }
    $restoredFiles = @(Get-ChildItem -LiteralPath $roots[0].FullName -Force)
    $extensions = @('.html', '.css', '.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx')
    if ($restoredFiles.Count -eq 0) { throw 'dev-tools 目录为空。' }
    foreach ($file in $restoredFiles) {
        if ($file.PSIsContainer -or $file.Extension -notin $extensions -or $file.Name -match '\.(test|spec)\.') {
            throw 'dev-tools 目录包含子目录或不符合约定的代码文件。'
        }
    }
    Move-Item -LiteralPath $innerContents -Destination $result
    Write-Host ''
    Write-Host ('完成！已还原 {0} 个代码文件。' -f $restoredFiles.Count) -ForegroundColor Green
    Write-Host ('输出目录：' + (Join-Path $result 'dev-tools'))
    Write-Host '原始 .txt 文件已保留。'
    $exitCode = 0
} catch {
    Write-Host ''
    Write-Host ('错误：' + $_.Exception.Message) -ForegroundColor Red
} finally {
    if ($stage -and (Test-Path -LiteralPath $stage)) {
        $stageItem = Get-Item -LiteralPath $stage
        if ($stageItem.FullName -eq $stageFullName -and $stageItem.Name -match '^\.dev-tools-restore-[a-f0-9]{32}$') {
            Remove-Item -LiteralPath $stageItem.FullName -Recurse -Force
        }
    }
}
exit $exitCode
