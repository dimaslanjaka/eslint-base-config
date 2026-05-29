# Resolve workspace root (fallback to script parent if WORKSPACE_FOLDER is unset)
$workspaceRoot = if ($env:WORKSPACE_FOLDER -and (Test-Path $env:WORKSPACE_FOLDER)) {
  $env:WORKSPACE_FOLDER
}
else {
  Split-Path -Parent $PSScriptRoot
}

# Resolve oh-my-posh config using resolved workspace root
$configPath = @(
  (Join-Path $workspaceRoot 'oh-my-posh.config.json'),
  (Join-Path $workspaceRoot 'node_modules/@dimaslanjaka/eslint-base-config/oh-my-posh.config.json'),
  (Join-Path $env:APPDATA 'npm/node_modules/@dimaslanjaka/eslint-base-config/oh-my-posh.config.json'),
  (Join-Path $env:LOCALAPPDATA 'npm/node_modules/@dimaslanjaka/eslint-base-config/oh-my-posh.config.json')
) | Where-Object { Test-Path $_ } | Select-Object -First 1

# Ensure WORKSPACE_FOLDER is available to this session.
if (-not $env:WORKSPACE_FOLDER) {
  $env:WORKSPACE_FOLDER = $workspaceRoot
}

# Execution policy (only if needed)
if ((Get-ExecutionPolicy -Scope CurrentUser) -eq 'Restricted') {
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
  Write-Output "Execution policy set to RemoteSigned for CurrentUser scope."
}

# Encoding fix
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$env:LANG = 'en_US.UTF-8'

# Register a custom PATH order similar to the batch launcher script.
$npmGlobalBinCandidates = @(
  (Join-Path $env:APPDATA 'npm'),
  (Join-Path $env:LOCALAPPDATA 'npm')
) | Where-Object { Test-Path $_ }

$customPathEntries = @(
  (Join-Path $env:LOCALAPPDATA 'nvm'),
  'C:\nvm4w\nodejs',
  $npmGlobalBinCandidates,
  'C:\Program Files\Nox\bin',
  'D:\Program Files\Nox\bin',
  'C:\Program Files\Git\cmd',
  'C:\Program Files\Git\usr\bin',
  (Join-Path $workspaceRoot 'node_modules/.bin'),
  (Join-Path $workspaceRoot 'bin'),
  (Join-Path $workspaceRoot 'vendor/bin'),
  'C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin',
  'C:\laragon\bin\php\php-8.4.11-Win32-vs17-x64',
  'C:\laragon\bin\git\bin',
  'C:\laragon\bin\python\python-3.13',
  'C:\laragon\bin\memcached\memcached-1.6.8-win64-mingw',
  'D:\Program Files\Microsoft VS Code',
  'C:\Users\Dell\AppData\Local\Programs\Ollama'
)

$existingPathEntries = @($env:Path -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
$normalizedSeen = @{}
$mergedPath = @()

foreach ($candidate in (@($customPathEntries) + @($existingPathEntries))) {
  if ([string]::IsNullOrWhiteSpace($candidate)) {
    continue
  }

  $trimmedCandidate = $candidate.Trim().TrimEnd('\', '/')
  if ([string]::IsNullOrWhiteSpace($trimmedCandidate)) {
    continue
  }

  $normalizedKey = $trimmedCandidate.ToLowerInvariant()
  if ($normalizedSeen.ContainsKey($normalizedKey)) {
    continue
  }

  $normalizedSeen[$normalizedKey] = $true
  $mergedPath += $trimmedCandidate
}

$env:Path = $mergedPath -join ';'

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
    $normalizedPriorityMap[$p.TrimEnd('\')] = $true
  }

  $remainingPath = foreach ($existing in $pathParts) {
    if (-not $normalizedPriorityMap.ContainsKey($existing.TrimEnd('\'))) {
      $existing
    }
  }

  $dedupedOrderedPath = @()
  $seenOrderedPath = @{}

  foreach ($candidate in (@($orderedBinPaths) + @($remainingPath))) {
    if ([string]::IsNullOrWhiteSpace($candidate)) {
      continue
    }

    $trimmedCandidate = $candidate.Trim().TrimEnd('\', '/')
    if ([string]::IsNullOrWhiteSpace($trimmedCandidate)) {
      continue
    }

    $normalizedCandidate = $trimmedCandidate.ToLowerInvariant()
    if ($seenOrderedPath.ContainsKey($normalizedCandidate)) {
      continue
    }

    $seenOrderedPath[$normalizedCandidate] = $true
    $dedupedOrderedPath += $trimmedCandidate
  }

  $env:Path = $dedupedOrderedPath -join ';'

  # Register aliases from prioritized bins: use cache + background refresh for speed.
  $managedAliasDescription = 'workspace-bin-priority'
  $aliasCache = Join-Path $env:LOCALAPPDATA 'pwsh_workspace_aliases.json'

  function Set-AliasFromObject($obj) {
    try {
      if (-not $obj) { return }
      $name = $obj.Name
      $value = $obj.Value
      if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($value)) { return }

      # If a non-alias command exists with this name, skip
      $existingCmd = Get-Command -Name $name -ErrorAction SilentlyContinue
      if ($existingCmd -and $existingCmd.CommandType -ne 'Alias') { return }

      if ($existingCmd -and $existingCmd.CommandType -eq 'Alias') {
        $existingAlias = Get-Alias -Name $name -ErrorAction SilentlyContinue
        if ($existingAlias) {
          $isProtectedAlias =
            (($existingAlias.Options -band [System.Management.Automation.ScopedItemOptions]::Constant) -ne 0) -or
            (($existingAlias.Options -band [System.Management.Automation.ScopedItemOptions]::ReadOnly) -ne 0) -or
            (($existingAlias.Options -band [System.Management.Automation.ScopedItemOptions]::AllScope) -ne 0)

          $isManagedAlias = $existingAlias.Description -eq $managedAliasDescription
          if ($isProtectedAlias -and -not $isManagedAlias) {
            return
          }
        }
      }

      Set-Alias -Name $name -Value $value -Scope Global -Force -Description $managedAliasDescription -ErrorAction SilentlyContinue
    } catch {
      # ignore failures
    }
  }

  if (Test-Path $aliasCache) {
    try {
      $cached = Get-Content $aliasCache -Raw | ConvertFrom-Json -ErrorAction Stop
      foreach ($a in $cached) { Set-AliasFromObject $a }
    } catch {
      Remove-Item $aliasCache -ErrorAction SilentlyContinue
    }
    # Refresh cache in background so it's kept up-to-date without blocking startup
    Start-Job -ScriptBlock {
      param($bins,$cacheFile)
      $out = @()
      foreach ($bin in $bins) {
        Get-ChildItem -Path $bin -File -ErrorAction SilentlyContinue | ForEach-Object {
          $out += @{ Name = [IO.Path]::GetFileNameWithoutExtension($_.Name); Value = $_.FullName }
        }
      }
      $out | ConvertTo-Json | Set-Content -Path $cacheFile -Encoding UTF8
    } -ArgumentList ($orderedBinPaths, $aliasCache) | Out-Null
  }
  else {
    # No cache yet: create it in background and avoid blocking the prompt.
    Start-Job -ScriptBlock {
      param($bins,$cacheFile)
      $out = @()
      foreach ($bin in $bins) {
        Get-ChildItem -Path $bin -File -ErrorAction SilentlyContinue | ForEach-Object {
          $out += @{ Name = [IO.Path]::GetFileNameWithoutExtension($_.Name); Value = $_.FullName }
        }
      }
      $out | ConvertTo-Json | Set-Content -Path $cacheFile -Encoding UTF8
    } -ArgumentList ($orderedBinPaths, $aliasCache) | Out-Null
  }
}

# Debug: print final PATH order in this session.
# Write-Output 'Final PATH entries:'
# $pathIndex = 1
# foreach ($pathEntry in ($env:Path -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })) {
#   Write-Output ("[{0:D2}] {1}" -f $pathIndex, $pathEntry)
#   $pathIndex++
# }

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

# Oh My Posh init (if installed)
$ohMyPoshCommand = Get-Command oh-my-posh -ErrorAction SilentlyContinue
if ($ohMyPoshCommand) {
  # Lazy initialize Oh My Posh on first prompt invocation to avoid blocking profile startup.
  function Initialize-OhMyPosh {
    if ($global:OhMyPoshInitialized) { return }
    try {
      if ($configPath) {
        oh-my-posh init pwsh --config $configPath | Invoke-Expression
      } else {
        oh-my-posh init pwsh | Invoke-Expression
      }
      $global:OhMyPoshInitialized = $true
    } catch {
      Write-Verbose "Oh My Posh init failed: $_"
    }
  }

  # Set a lightweight wrapper prompt that initializes Oh My Posh on first render.
  $__wrapperPromptScript = if (Get-Command prompt -CommandType Function -ErrorAction SilentlyContinue) { (Get-Command prompt -CommandType Function).ScriptBlock } else { $null }

  function prompt {
    Initialize-OhMyPosh
    # After initialization, invoke the current prompt function (which may have been replaced by oh-my-posh).
    $p = Get-Command prompt -CommandType Function -ErrorAction SilentlyContinue
    if ($p -and $p.ScriptBlock -and -not ($p.ScriptBlock -eq $MyInvocation.MyCommand.ScriptBlock)) {
      & $p.ScriptBlock
    } else {
      "PS $(Get-Location)> "
    }
  }
}
else {
  Write-Verbose "Skipping Oh My Posh initialization (oh-my-posh not found in PATH)."
}
