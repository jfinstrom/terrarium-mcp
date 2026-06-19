# Clone optional FreePBX source repos listed in manifest/topics.json
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Manifest = Join-Path $Root "manifest\topics.json"

$data = Get-Content $Manifest -Raw | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path (Join-Path $Root "sources") | Out-Null

foreach ($repo in $data.sourceRepos) {
    $dest = Join-Path $Root ($repo.path -replace "/", "\")
    if (Test-Path (Join-Path $dest ".git")) {
        Write-Host "==> $($repo.name): already cloned"
        Push-Location $dest
        git fetch --depth 1 origin $repo.branch 2>$null
        git checkout $repo.branch 2>$null
        Pop-Location
    } else {
        Write-Host "==> $($repo.name): cloning $($repo.url)"
        git clone --depth 1 --branch $repo.branch $repo.url $dest 2>$null
        if ($LASTEXITCODE -ne 0) {
            git clone --depth 1 $repo.url $dest
            Push-Location $dest
            git checkout $repo.branch 2>$null
            Pop-Location
        }
    }
}

Write-Host "Done. Source repos in $Root\sources\"