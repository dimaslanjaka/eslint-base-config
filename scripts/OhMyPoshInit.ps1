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
  # Tab/Shift+Tab cycle completions using supported PSReadLine functions.
  # PredictionViewStyle set to ListView for clearer candidate navigation
  Set-PSReadLineOption -PredictionSource History
  Set-PSReadLineOption -PredictionViewStyle ListView
  Set-PSReadLineKeyHandler -Key Tab -Function TabCompleteNext
  Set-PSReadLineKeyHandler -Key Shift+Tab -Function TabCompletePrevious
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

  # Register aliases from prioritized bins so command completion favors local tools
  # over similarly-prefixed executables from global installations.
  $managedAliasDescription = 'workspace-bin-priority'
  $seenAliases = @{}
  foreach ($binPath in $orderedBinPaths) {
    $entries = Get-ChildItem -Path $binPath -File -ErrorAction SilentlyContinue
    foreach ($entry in $entries) {
      $name = [System.IO.Path]::GetFileNameWithoutExtension($entry.Name)
      if ([string]::IsNullOrWhiteSpace($name)) {
        continue
      }

      $aliasKey = $name.ToLowerInvariant()
      if ($seenAliases.ContainsKey($aliasKey)) {
        continue
      }

      # Prefer first match by bin priority and avoid replacing existing non-alias commands.
      $existingCmd = Get-Command -Name $name -ErrorAction SilentlyContinue
      if ($existingCmd -and $existingCmd.CommandType -ne 'Alias') {
        continue
      }

      if ($existingCmd -and $existingCmd.CommandType -eq 'Alias') {
        $existingAlias = Get-Alias -Name $name -ErrorAction SilentlyContinue
        if ($existingAlias) {
          $isProtectedAlias =
            (($existingAlias.Options -band [System.Management.Automation.ScopedItemOptions]::Constant) -ne 0) -or
            (($existingAlias.Options -band [System.Management.Automation.ScopedItemOptions]::ReadOnly) -ne 0) -or
            (($existingAlias.Options -band [System.Management.Automation.ScopedItemOptions]::AllScope) -ne 0)

          $isManagedAlias = $existingAlias.Description -eq $managedAliasDescription
          if ($isProtectedAlias -and -not $isManagedAlias) {
            continue
          }
        }
      }

      Set-Alias -Name $name -Value $entry.FullName -Scope Global -Force -Description $managedAliasDescription
      $seenAliases[$aliasKey] = $true
    }
  }
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
