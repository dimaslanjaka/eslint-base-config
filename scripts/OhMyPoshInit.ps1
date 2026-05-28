# Resolve oh-my-posh config
$configPath = @(
  "$env:WORKSPACE_FOLDER\oh-my-posh.config.json",
  "$env:WORKSPACE_FOLDER\node_modules\@dimaslanjaka\eslint-base-config\oh-my-posh.config.json"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

# Resolve workspace root (fallback to script parent if WORKSPACE_FOLDER is unset)
$workspaceRoot = if ($env:WORKSPACE_FOLDER -and (Test-Path $env:WORKSPACE_FOLDER)) {
  $env:WORKSPACE_FOLDER
}
else {
  Split-Path -Parent $PSScriptRoot
}

# Execution policy (only if needed)
if ((Get-ExecutionPolicy -Scope CurrentUser) -eq 'Restricted') {
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
  Write-Output "Execution policy set to RemoteSigned for CurrentUser scope."
}

# Encoding fix
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()

# PSReadLine prediction
$setPsReadLineCmd = Get-Command Set-PSReadLineOption -ErrorAction SilentlyContinue
if ($setPsReadLineCmd -and $setPsReadLineCmd.Parameters.ContainsKey('PredictionSource')) {
  Set-PSReadLineOption -PredictionSource History
  # Write-Output "PSReadLine prediction enabled (using History)."
}
else {
  Write-Output "Skipping PSReadLine prediction (unsupported PSReadLine version)."
}

# Local command completion priority is driven by PATH order.
# Ordered priorities:
# 1) bin/
# 2) node_modules/.bin
# 3) vendor/bin
# 4) venv/.venv bin folder
$orderedBinPaths = @(
  (Join-Path $workspaceRoot 'bin'),
  (Join-Path $workspaceRoot 'node_modules/.bin'),
  (Join-Path $workspaceRoot 'vendor/bin'),
  (Join-Path $workspaceRoot 'venv/Scripts'),
  (Join-Path $workspaceRoot 'venv/bin'),
  (Join-Path $workspaceRoot '.venv/Scripts'),
  (Join-Path $workspaceRoot '.venv/bin')
) | Where-Object { Test-Path $_ }

if ($orderedBinPaths.Count -gt 0) {
  $pathParts = @($env:Path -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  $normalizedPriorityMap = @{}

  foreach ($p in $orderedBinPaths) {
    $normalizedPriorityMap[$p.TrimEnd('\\')] = $true
  }

  $remainingPath = foreach ($existing in $pathParts) {
    if (-not $normalizedPriorityMap.ContainsKey($existing.TrimEnd('\\'))) {
      $existing
    }
  }

  $env:Path = (@($orderedBinPaths) + @($remainingPath)) -join ';'
}

# Winget native completion
# Write-Output "Setting up winget native completion..."
Register-ArgumentCompleter -Native -CommandName winget -ScriptBlock {
  param($wordToComplete, $commandAst, $cursorPosition)

  winget complete `
    --word="$wordToComplete" `
    --commandline "$($commandAst.ToString())" `
    --position $cursorPosition |
  ForEach-Object {
    [System.Management.Automation.CompletionResult]::new(
      $_, $_, 'ParameterValue', $_
    )
  }
}

# Oh My Posh init
if ($configPath) {
  # Write-Output "Initializing Oh My Posh with config: $configPath"
  oh-my-posh init pwsh --config $configPath | Invoke-Expression
}
else {
  # Write-Output "No Oh My Posh config found, initializing with default settings."
  oh-my-posh init pwsh | Invoke-Expression
}
