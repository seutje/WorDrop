$ErrorActionPreference = "Stop"

function Find-VisualStudioDevShell {
  $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"

  if (Test-Path -LiteralPath $vswhere) {
    $installationPath = & $vswhere `
      -latest `
      -products * `
      -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
      -property installationPath

    if ($installationPath) {
      $candidate = Join-Path $installationPath "Common7\Tools\VsDevCmd.bat"
      if (Test-Path -LiteralPath $candidate) {
        return $candidate
      }
    }
  }

  $knownEditions = @("Community", "Professional", "Enterprise", "BuildTools")
  foreach ($edition in $knownEditions) {
    $candidate = Join-Path $env:ProgramFiles "Microsoft Visual Studio\2022\$edition\Common7\Tools\VsDevCmd.bat"
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  throw "Visual Studio C++ Build Tools were not found. Install the 'Desktop development with C++' workload."
}

function Quote-CmdArgument([string] $Value) {
  return '"' + $Value.Replace('"', '""') + '"'
}

$devShell = Find-VisualStudioDevShell
$forwardedArguments = ($args | ForEach-Object { Quote-CmdArgument $_ }) -join " "
$command = 'call ' + (Quote-CmdArgument $devShell) + ' -arch=x64 >nul && npx --no-install tauri ' + $forwardedArguments

& $env:ComSpec /d /s /c $command
exit $LASTEXITCODE
