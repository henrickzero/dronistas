$f = "C:\Users\henrick\.openclaw\workspace\projetos\dronistas\smoke-test.ps1"
$enc = [System.Text.UTF8Encoding]::new($false)
$linhas = [System.IO.File]::ReadAllLines($f, $enc)

$inicio6b = -1
for ($i = 0; $i -lt $linhas.Count; $i++) {
  if ($linhas[$i].Contains("6b. N arquivos de video")) { $inicio6b = $i; break }
}
if ($inicio6b -lt 0) { Write-Output "secao 6b nao encontrada"; exit 1 }

$corrigidos = 0
for ($i = $inicio6b; $i -lt $linhas.Count; $i++) {
  if ($linhas[$i].Contains("=== 7.")) { break }
  if ($linhas[$i].Contains("Bearer ")) {
    if ($linhas[$i].Contains("pelo SOLICITANTE")) {
      $linhas[$i] = $linhas[$i].Replace('Authorization = "Bearer ', 'Authorization = ("Bearer " + ').Replace('" -Form', ') -Form').Replace('" } -TimeoutSec', ') -TimeoutSec')
    }
  }
}

$iniRem = -1
for ($i = $inicio6b; $i -lt $linhas.Count; $i++) {
  if ($linhas[$i].Contains("# remover um arquivo")) { $iniRem = $i; break }
}
$fimBloco = -1
for ($i = $iniRem; $i -lt $linhas.Count; $i++) {
  if ($linhas[$i].Contains("aprovar entrega com lista")) { $fimBloco = $i; break }
}
if ($iniRem -lt 0 -or $fimBloco -lt 0) { Write-Output "bloco de remocao nao encontrado"; exit 1 }

$novoBloco = @(
  '        # REMOCAO APOS ENTREGA: bloqueada - o video entregue e imutavel para o dronista;',
  '        # so o solicitante (via recusa) devolve o controle para reenvio.',
  '        try {',
  '          Invoke-RestMethod -Uri "$base/entregas/arquivos/$($extra2.id)" -Method DELETE -Headers $hdrDr1N -TimeoutSec 60 -ErrorAction Stop | Out-Null',
  '          Check "remocao apos entrega bloqueada -> 403" ($false) ("esperava 403")',
  '        } catch {',
  '          $st = 0',
  '          if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }',
  '          Check "remocao apos entrega bloqueada -> 403" ($st -eq 403) ("status=$st")',
  '        }',
  '',
  '        # solicitante recusa -> o controle volta ao dronista, que pode ajustar a lista',
  '        $r = Api POST "$base/entregas/$entN/recusar" $null $tokSol',
  '        Check "solicitante recusa entrega (controle volta ao dronista)" ($r.ok) ($r.body)',
  '        Invoke-RestMethod -Uri "$base/entregas/arquivos/$($extra2.id)" -Method DELETE -Headers $hdrDr1N -TimeoutSec 60 | Out-Null',
  '        $rA2 = Invoke-RestMethod -Uri "$base/entregas/$entN/arquivos" -Headers $hdrDr1N -TimeoutSec 60',
  '        $nArq2 = @($rA2).Count',
  '        Check "remocao apos recusa permitida (lista encolhe para 2)" ($nArq2 -eq 2) ($nArq2)',
  '',
  '        # aprovar com a lista ajustada',
  '        $r = Api POST "$base/entregas/$entN/aprovar" $null $tokSol',
  '        Check "aprovar entrega com lista de videos" ($r.ok -and $r.data.status -eq ''APROVADA'') ($r.body)'
)

$novo = @()
$novo += $linhas[0..($iniRem - 1)]
$novo += $novoBloco
$novo += $linhas[($fimBloco + 1)..($linhas.Count - 1)]
[System.IO.File]::WriteAllLines($f, $novo, $enc)
Write-Output "bloco 6b substituido com sucesso"
