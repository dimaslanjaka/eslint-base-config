# Resolve workspace root (fallback to script parent if WORKSPACE_FOLDER is unset)
$workspaceRoot = if ($env:WORKSPACE_FOLDER -and (Test-Path $env:WORKSPACE_FOLDER)) {
  $env:WORKSPACE_FOLDER
}
else {
  Split-Path -Parent $PSScriptRoot
}

# Resolve oh-my-posh config using resolved workspace root
$configPath = $null
foreach ($candidate in @(
  (Join-Path $workspaceRoot 'oh-my-posh.config.json'),
  (Join-Path $workspaceRoot 'node_modules/@dimaslanjaka/eslint-base-config/oh-my-posh.config.json'),
  (Join-Path $env:APPDATA 'npm/node_modules/@dimaslanjaka/eslint-base-config/oh-my-posh.config.json'),
  (Join-Path $env:LOCALAPPDATA 'npm/node_modules/@dimaslanjaka/eslint-base-config/oh-my-posh.config.json')
)) {
  if (Test-Path $candidate) {
    $configPath = $candidate
    break
  }
}

# Ensure WORKSPACE_FOLDER is available to this session.
if (-not $env:WORKSPACE_FOLDER) {
  $env:WORKSPACE_FOLDER = $workspaceRoot
}

# Execution policy (only if needed)
# if ((Get-ExecutionPolicy -Scope CurrentUser) -eq 'Restricted') {
#   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
#   Write-Output "Execution policy set to RemoteSigned for CurrentUser scope."
# }

# PSReadLine prediction (best-effort, no-op if unsupported)
try {
  Set-PSReadLineOption -PredictionSource History -ErrorAction Stop
  Set-PSReadLineOption -PredictionViewStyle ListView -ErrorAction Stop
  Set-PSReadLineKeyHandler -Key Tab -Function TabCompleteNext -ErrorAction Stop
  Set-PSReadLineKeyHandler -Key Shift+Tab -Function TabCompletePrevious -ErrorAction Stop
} catch {
  Write-Output "Skipping PSReadLine prediction (unsupported version)."
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

# Make workspace-local bins findable (so oh-my-posh and other tools resolve correctly).
$localBin = Join-Path $workspaceRoot 'node_modules/.bin'
if (Test-Path $localBin) { $env:Path = "$localBin;$env:Path" }

# Initialize Oh My Posh
try {
  if ($configPath) {
    oh-my-posh init pwsh --config $configPath | Invoke-Expression
  } else {
    oh-my-posh init pwsh | Invoke-Expression
  }
} catch {
  Write-Warning "Oh My Posh init failed: $_"
}
