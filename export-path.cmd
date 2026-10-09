@echo off
if /i "%~1"=="--no-pause" goto run
if /i "%~2"=="--no-pause" goto run
if "%DEVTOOLS_PACK_CONSOLE%"=="1" goto run
set "DEVTOOLS_PACK_CONSOLE=1"
start "Dev Tools Export" "%ComSpec%" /d /k ""%~f0" "%~1" "%~2""
if errorlevel 1 pause >nul
exit /b
:run
setlocal DisableDelayedExpansion
chcp 65001 >nul
title 文件或文件夹双层RAR导出
set "DEVTOOLS_PACK_SCRIPT=%~f0"
set "DEVTOOLS_PACK_INPUT=%~1"
if /i "%~1"=="--no-pause" set "DEVTOOLS_PACK_INPUT="
where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo 错误：未找到 Windows PowerShell。
  echo 按任意键继续……
  pause >nul
  exit /b 1
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$text = [IO.File]::ReadAllText($env:DEVTOOLS_PACK_SCRIPT, [Text.Encoding]::UTF8); $body = ($text -split '(?m)^# POWERSHELL_PAYLOAD\r?$', 2)[1]; if (-not $body) { throw '内嵌脚本缺失。' }; & ([ScriptBlock]::Create($body))"
set "DEVTOOLS_PACK_EXIT=%ERRORLEVEL%"
if "%DEVTOOLS_PACK_EXIT%"=="0" if "%DEVTOOLS_PACK_CONSOLE%"=="1" exit 0
if "%DEVTOOLS_PACK_EXIT%"=="0" exit /b 0
if not "%DEVTOOLS_PACK_EXIT%"=="0" echo 错误：导出失败，请查看上方错误信息。
if /i not "%~1"=="--no-pause" if /i not "%~2"=="--no-pause" echo 按任意键继续……
if /i not "%~1"=="--no-pause" if /i not "%~2"=="--no-pause" pause >nul
exit /b %DEVTOOLS_PACK_EXIT%
# POWERSHELL_PAYLOAD
$ErrorActionPreference = 'Stop'
$stage = $null
$stageFullName = $null
$exitCode = 1
$password = '982003834'

function Find-Rar {
    $command = Get-Command 'rar.exe' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
    foreach ($base in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, $env:LOCALAPPDATA)) {
        if (-not $base) { continue }
        $candidate = Join-Path $base 'WinRAR\Rar.exe'
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return $candidate }
    }
    throw '未找到 Rar.exe，请先安装 WinRAR。7-Zip 无法创建 RAR 压缩包。'
}
function New-RandomHash {
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $bytes = New-Object byte[] 32
        $rng.GetBytes($bytes)
        return [BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
    } finally { $rng.Dispose() }
}
function Invoke-Rar([string[]] $CmdArgs) {
    & $script:rar @CmdArgs '-idq'
    if ($LASTEXITCODE -ne 0) {
        throw ('RAR 操作失败（退出码 {0}），未生成最终导出文件。' -f $LASTEXITCODE)
    }
}
try {
    Write-Host '文件或文件夹双层 RAR 导出' -ForegroundColor Cyan
    Write-Host '请粘贴一个路径，或将文件、文件夹拖入此窗口，然后按回车。'
    Write-Host '只导出可由还原脚本接受的代码文件；目录只处理直接包含的代码文件。'
    Write-Host '原文件保持不变，导出结果保存在输入项的同级目录。'
    Write-Host ''
    $inputPath = $env:DEVTOOLS_PACK_INPUT
    if ([string]::IsNullOrWhiteSpace($inputPath)) { $inputPath = Read-Host '文件或文件夹路径' }
    $inputPath = $inputPath.Trim()
    if ($inputPath.StartsWith('"') -and $inputPath.EndsWith('"')) {
        $inputPath = $inputPath.Substring(1, $inputPath.Length - 2)
    }
    if ([string]::IsNullOrWhiteSpace($inputPath)) { throw '未输入路径。' }
    $source = Get-Item -LiteralPath $inputPath -Force -ErrorAction Stop
    if ($source.PSProvider.Name -ne 'FileSystem') { throw '请选择本机文件或文件夹。' }
    if ($source.PSIsContainer) {
        if (-not $source.Parent) { throw '请选择具体文件夹，不能直接选择磁盘根目录。' }
        $outputParent = $source.Parent.FullName
        $items = @(Get-ChildItem -LiteralPath $source.FullName -Force)
    } else {
        $outputParent = $source.Directory.FullName
        $items = @($source)
    }
    $extensions = @('.html', '.css', '.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx')
    $files = @($items | Where-Object {
        -not $_.PSIsContainer -and $_.Extension -in $extensions -and $_.Name -notmatch '\.(test|spec)\.'
    })
    if ($files.Count -eq 0) {
        throw '没有可导出的代码文件。还原脚本只支持 HTML/CSS/JS/CJS/MJS/JSX/TS/TSX，并排除测试文件及子目录。'
    }
    $skipped = @($items | Where-Object { $_ -notin $files })
    Write-Host ('已选择 {0} 个代码文件，跳过 {1} 个非代码、测试文件或子目录。' -f $files.Count, $skipped.Count)
    foreach ($item in $skipped) { Write-Host ('跳过：' + $item.Name) }
    $script:rar = Find-Rar
    $stage = Join-Path $outputParent ('.dev-tools-pack-' + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $stage | Out-Null
    $stageFullName = (Get-Item -LiteralPath $stage).FullName
    $container = Join-Path $stage 'dev-tools'
    New-Item -ItemType Directory -Path $container | Out-Null
    Write-Host '[1/4] 正在复制到临时 dev-tools 文件夹……'
    foreach ($file in $files) {
        Copy-Item -LiteralPath $file.FullName -Destination $container -Force
    }
    $innerHash = New-RandomHash
    $innerRar = Join-Path $stage ($innerHash + '.rar')
    $innerTxt = Join-Path $stage ($innerHash + '.txt')
    do {
        $outerHash = New-RandomHash
        $final = Join-Path $outputParent ($outerHash + '.txt')
    } while (Test-Path -LiteralPath $final)
    $outerRar = Join-Path $stage ($outerHash + '.rar')
    Push-Location -LiteralPath $stage
    try {
        Write-Host '[2/4] 正在生成内层 RAR……'
        Invoke-Rar -CmdArgs @('a', '-ma5', '-m5', '-r', '-y', $innerRar, 'dev-tools')
        Move-Item -LiteralPath $innerRar -Destination $innerTxt
        Write-Host '[3/4] 正在生成外层 RAR，并加密文件名……'
        Invoke-Rar -CmdArgs @('a', '-ma5', '-m5', ('-hp' + $password), '-y', $outerRar, ([IO.Path]::GetFileName($innerTxt)))
        Write-Host '[4/4] 正在检查两层压缩包的完整性……'
        Invoke-Rar -CmdArgs @('t', '-p-', $innerTxt)
        Invoke-Rar -CmdArgs @('t', ('-p' + $password), $outerRar)
    } finally { Pop-Location }
    Move-Item -LiteralPath $outerRar -Destination $final
    Write-Host ''
    Write-Host '导出完成！' -ForegroundColor Green
    Write-Host ('结果文件：' + $final)
    Write-Host ('密码：' + $password)
    $exitCode = 0
} catch {
    Write-Host ''
    Write-Host ('错误：' + $_.Exception.Message) -ForegroundColor Red
} finally {
    if ($stage -and (Test-Path -LiteralPath $stage)) {
        $stageItem = Get-Item -LiteralPath $stage
        if ($stageItem.FullName -eq $stageFullName -and $stageItem.Name -match '^\.dev-tools-pack-[a-f0-9]{32}$') {
            try { Remove-Item -LiteralPath $stageItem.FullName -Recurse -Force }
            catch { Write-Host ('临时目录清理失败，请手动清理：' + $stageItem.FullName) -ForegroundColor Yellow }
        }
    }
}
exit $exitCode
