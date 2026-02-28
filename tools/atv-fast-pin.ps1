param(
  [Parameter(Mandatory = $true)]
  [string]$Pin,
  [string]$Ip = "192.168.23.165"
)

$ErrorActionPreference = "SilentlyContinue"

function Post-Code {
  param(
    [string]$Url,
    [string]$ContentType,
    [string]$Body
  )

  if ([string]::IsNullOrWhiteSpace($ContentType)) {
    return (& curl.exe -sS -o NUL --connect-timeout 1 --max-time 2 -w "%{http_code}" -X POST $Url -H "User-Agent: MediaControl/1.0" -H "Connection: close")
  }

  return (& curl.exe -sS -o NUL --connect-timeout 1 --max-time 2 -w "%{http_code}" -X POST $Url -H "User-Agent: MediaControl/1.0" -H "Connection: close" -H "Content-Type: $ContentType" --data-binary $Body)
}

$startUrl = "http://$Ip`:7000/pair-pin-start"
$setupUrl = "http://$Ip`:7000/pair-setup-pin"

$startStatus = Post-Code -Url $startUrl -ContentType "" -Body ""

$attempts = @(
  @{ name = "pin-json"; ct = "application/json"; body = "{`"pin`":`"$Pin`"}" },
  @{ name = "code-json"; ct = "application/json"; body = "{`"code`":`"$Pin`"}" },
  @{ name = "pairingCode-json"; ct = "application/json"; body = "{`"pairingCode`":`"$Pin`"}" },
  @{ name = "pin-text"; ct = "text/plain"; body = "$Pin" }
)

$results = New-Object System.Collections.Generic.List[string]
$accepted = $false

foreach ($a in $attempts) {
  $status = Post-Code -Url $setupUrl -ContentType $a.ct -Body $a.body
  $results.Add("$($a.name):$status")
  if ($status -eq "200" -or $status -eq "204") {
    $accepted = $true
    break
  }
}

if ($accepted) {
  Write-Output "OK start:$startStatus $($results[$results.Count - 1])"
}
else {
  Write-Output "FAIL start:$startStatus $([string]::Join(' ', $results))"
}
