# Resolve oh-my-posh config
$configPath = @(
  "$env:WORKSPACE_FOLDER\oh-my-posh.config.json",
  "$env:WORKSPACE_FOLDER\node_modules\@dimaslanjaka\eslint-base-config\oh-my-posh.config.json"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

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
