# Smoke test Dronistas — fluxo completo + caminhos de erro
# Requer: stack rodando em http://localhost:8080
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080/api'
$script:fail = 0

function Api($method, $url, $body, $token) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  try {
    if ($method -eq 'GET') {
      $resp = Invoke-RestMethod -Uri $url -Method Get -Headers $headers -TimeoutSec 20
    } else {
      $json = if ($null -ne $body) { $body | ConvertTo-Json -Depth 8 } else { $null }
      $resp = Invoke-RestMethod -Uri $url -Method $method -Headers $headers -ContentType 'application/json' -Body $json -TimeoutSec 20
    }
    return @{ ok = $true; data = $resp; status = 200 }
  } catch {
    $status = 0; $errBody = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      $errBody = $_.ErrorDetails.Message
    }
    return @{ ok = $false; status = $status; body = $errBody }
  }
}

function Check($nome, $cond, $detalhe) {
  if ($cond) { Write-Output ("OK   : " + $nome) }
  else { $script:fail++; Write-Output ("FALHA: " + $nome + " :: " + $detalhe) }
}

function NovoCpf {
  $r = New-Object System.Random
  $d = @(0..8 | ForEach-Object { $r.Next(0, 10) })
  $s = 0; for ($i = 0; $i -lt 9; $i++) { $s += $d[$i] * (10 - $i) }
  $mod1 = $s % 11
  if ($mod1 -lt 2) { $dv1 = 0 } else { $dv1 = 11 - $mod1 }
  $s = 0
  for ($i = 0; $i -lt 10; $i++) {
    $v = if ($i -eq 9) { $dv1 } else { $d[$i] }
    $s += $v * (11 - $i)
  }
  $mod2 = $s % 11
  if ($mod2 -lt 2) { $dv2 = 0 } else { $dv2 = 11 - $mod2 }
  return ($d -join '') + "$dv1$dv2"
}

$ts = Get-Random -Maximum 999999
$emailSol = "sol$ts@teste.com"
$emailDr1 = "dr1$ts@teste.com"
$emailDr2 = "dr2$ts@teste.com"

Write-Output "=== 1. Registro e login ==="
$r = Api POST "$base/auth/registrar" @{ nome = 'Ana Solicitante'; email = $emailSol; senha = 'senha12345'; telefone = '(11) 98888-7777'; papel = 'SOLICITANTE'; empresa = 'Agencia Voa' } $null
Check "registro solicitante" ($r.ok) ($r.body)
$tokSol = $r.data.token

$cpf1 = NovoCpf
$r = Api POST "$base/auth/registrar" @{ nome = 'Carlos Dronista'; email = $emailDr1; senha = 'senha12345'; telefone = '(11) 91111-1111'; papel = 'DRONISTA'; cnpjCpf = $cpf1; licencaAnac = 'CANAC-7777777'; bio = 'Filmagens imobiliarias e eventos'; estado = 'SP'; cidade = 'Campinas'; bairro = 'Centro'; cep = '13010000'; logradouro = 'Rua Barao de Jaguara'; numero = '800'; tipoPessoa = 'CPF'; pixTipo = 'CPF'; pixChave = $cpf1 } $null
Check "registro dronista 1 (CPF valido $cpf1, endereco completo da base)" ($r.ok) ($r.body)
$tokDr1 = $r.data.token

$cpf2 = NovoCpf
$r = Api POST "$base/auth/registrar" @{ nome = 'Bruna Dronista'; email = $emailDr2; senha = 'senha12345'; telefone = '(11) 92222-2222'; papel = 'DRONISTA'; cnpjCpf = $cpf2; licencaAnac = 'CANAC-8888888'; bio = 'Eventos e casamentos'; tipoPessoa = 'CPF'; pixTipo = 'CPF'; pixChave = $cpf2; documentoFotoUrl = 'https://exemplo.com/doc.jpg' } $null
Check "registro dronista 2 (onboarding: tipoPessoa CPF + Pix titular + foto)" ($r.ok) ($r.body)
$tokDr2 = $r.data.token

$r = Api POST "$base/auth/login" @{ email = $emailSol; senha = 'senha12345' } $null
Check "login solicitante (papel SOLICITANTE)" ($r.ok -and $r.data.papel -eq 'SOLICITANTE') ($r.body)
$r = Api POST "$base/auth/login" @{ email = $emailSol; senha = 'errada' } $null
Check "login senha errada -> 401" ($r.status -eq 401) ("status=$($r.status) body=$($r.body)")
$r = Api GET "$base/perfil/me" $null $null
Check "perfil sem token -> 401" ($r.status -eq 401) ("status=$($r.status)")
$r = Api GET "$base/perfil/me" $null $tokDr1
Check "perfil dronista traz localizacao (SP/Campinas/CEP)" ($r.ok -and $r.data.estado -eq 'SP' -and $r.data.cidade -eq 'Campinas' -and $r.data.cep -eq '13010-000') ($r.body | Out-String)
Check "perfil dronista traz logradouro+numero da base (Rua Barao de Jaguara, 800)" ($r.ok -and $r.data.logradouro -eq 'Rua Barao de Jaguara' -and $r.data.numero -eq '800') ($r.body | Out-String)
$r = Api GET "$base/perfil/me" $null $tokDr2
Check "perfil dronista 2 traz repasse Pix + validacao ENVIADA" ($r.ok -and $r.data.pixTipo -eq 'CPF' -and $r.data.validacaoDoc -eq 'ENVIADA' -and $r.data.validacaoDocPendente -eq $false) ($r.body | Out-String)

$r = Api GET "$base/documentos/me" $null $tokDr2
Check "documentos/me responde com status do upload" ($r.ok -and $null -ne $r.data.validacaoDoc -and $null -ne $r.data.habilitado) ($r.body | Out-String)

# Upload de N documentos: envia 3 PNGs e verifica lista (teto 10)
$png = [byte[]]@(0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0,0,0,13,0x49,0x48,0x44,0x52,0,0,0,1,0,0,0,1,8,6,0,0,0,0x1F,0x15,0xC4,0x89,0,0,0,10,0x49,0x44,0x41,0x54,0x78,0x9C,0x63,0,1,0,0,5,0,1,0x0D,0x0A,0x2D,0xB4,0,0,0,0,0x49,0x45,0x4E,0x44,0xAE,0x42,0x60,0x82)
[System.IO.File]::WriteAllBytes("$env:TEMP\doc-png.png", $png)
$hdrDr2 = @{ Authorization = "Bearer $tokDr2" }
for ($nd = 1; $nd -le 3; $nd++) {
  $rU = Invoke-RestMethod -Uri "$base/documentos/upload" -Method POST -Headers $hdrDr2 -Form @{ arquivo = Get-Item "$env:TEMP\doc-png.png" } -TimeoutSec 60
}
Check "upload de N documentos (3 enviados)" ($rU.total -ge 3) ($rU.total)
$rD = Api GET "$base/documentos/me" $null $tokDr2
Check "documentos/me lista 3 arquivos" ($rD.ok -and $rD.data.documentos.Count -ge 3) ($rD.data.total)
$primeiro = $rD.data.documentos | Select-Object -First 1
$presign2 = Invoke-WebRequest -Uri "$base/documentos/$($primeiro.id)/conteudo" -Headers $hdrDr2 -TimeoutSec 60
Check "documento lido pelo backend (PNG integro, 67 bytes)" ($presign2.StatusCode -eq 200 -and $presign2.RawContentLength -eq 67) ($presign2.RawContentLength)
$rEx = Api "DELETE" "$base/documentos/$($primeiro.id)" $null $tokDr2
$restantes = Invoke-RestMethod -Uri "$base/documentos/me" -Headers $hdrDr2
Check "exclusao de documento (lista encolhe)" ($restantes.total -ge 2) ($restantes.total)
Set-Content "$env:TEMP\doc.txt" -Value 'nao sou imagem nem pdf' -Encoding UTF8
try {
  $rU = Invoke-RestMethod -Uri "$base/documentos/upload?slot=pos" -Method POST -Headers @{ Authorization = "Bearer $tokDr2" } -Form @{ arquivo = Get-Item "$env:TEMP\doc.txt" } -TimeoutSec 30 -ErrorAction Stop
  Check "upload rejeita tipo invalido (txt) -> 422" ($false) ("esperava 422, veio sucesso")
} catch {
  $st = 0
  if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
  Check "upload rejeita tipo invalido (txt) -> 422" ($st -eq 422) ("status=$($st) body=$($_.ErrorDetails.Message)")
}
$r = Api POST "$base/auth/login" @{ email = 'admin@dronistas.com'; senha = 'admin123' } $null
Check "login admin seed (ADMIN)" ($r.ok -and $r.data.papel -eq 'ADMIN') ($r.body)

Write-Output "=== 2. Erros de cadastro/validacao ==="
$r = Api POST "$base/auth/registrar" @{ nome = 'X'; email = 'novo@teste.com'; senha = 'senha12345'; papel = 'DRONISTA'; cnpjCpf = '12345678900' } $null
Check "registro CPF invalido -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/auth/registrar" @{ nome = 'X'; email = $emailSol; senha = 'senha12345'; papel = 'SOLICITANTE' } $null
Check "registro email duplicado -> 409" ($r.status -eq 409) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/auth/registrar" @{ nome = 'X'; email = "curta$ts@teste.com"; senha = 'curta'; papel = 'SOLICITANTE' } $null
Check "senha curta -> 422" ($r.status -eq 422) ("status=$($r.status)")

$cpfPix = NovoCpf
$r = Api POST "$base/auth/registrar" @{ nome = 'X'; email = "pix$ts@teste.com"; senha = 'senha12345'; papel = 'DRONISTA'; cnpjCpf = $cpfPix; tipoPessoa = 'CPF'; pixTipo = 'CPF'; pixChave = '00000000000' } $null
Check "trava Pix titular (chave != documento) -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/auth/registrar" @{ nome = 'X'; email = "pessoa$ts@teste.com"; senha = 'senha12345'; papel = 'DRONISTA'; cnpjCpf = $cpfPix; tipoPessoa = 'CNPJ' } $null
Check "coerencia tipoPessoa (CNPJ escolhido, doc CPF) -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")

Write-Output "=== 3. Validacao de proposta ==="
$dataVoo = (Get-Date).AddDays(5).ToString('yyyy-MM-dd')
$r = Api POST "$base/propostas" @{ titulo = 'T'; dataVoo = $dataVoo; horaVoo = '14:30'; duracaoMin = 60; qualidadeVideo = '4K_60FPS'; formatoVideo = 'MP4'; valorOferecido = -10 } $tokSol
Check "valor negativo -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/propostas" @{ titulo = 'T'; dataVoo = '2020-01-01'; horaVoo = '14:30'; duracaoMin = 60; qualidadeVideo = '4K_60FPS'; formatoVideo = 'MP4'; valorOferecido = 100 } $tokSol
Check "data no passado -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/propostas" @{ titulo = 'T'; dataVoo = $dataVoo; horaVoo = '14:30'; duracaoMin = 60; qualidadeVideo = '8K'; formatoVideo = 'MP4'; valorOferecido = 100 } $tokSol
Check "qualidade invalida -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/propostas" @{ titulo = 'T'; dataVoo = $dataVoo; horaVoo = '14:30'; duracaoMin = 60; qualidadeVideo = '4K_60FPS'; formatoVideo = 'AVI'; valorOferecido = 100 } $tokSol
Check "formato invalido -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/propostas" @{ titulo = 'T'; dataVoo = $dataVoo; horaVoo = '14:30'; duracaoMin = 60; qualidadeVideo = '4K_60FPS'; fps = $null; formatoVideo = 'MP4'; valorOferecido = 100; estado = 'SP'; cep = '123' } $tokSol
Check "CEP invalido -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/propostas" @{ titulo = 'T'; dataVoo = $dataVoo; horaVoo = '14:30'; duracaoMin = 60; qualidadeVideo = '4K_60FPS'; fps = $null; formatoVideo = 'MP4'; valorOferecido = 100; estado = 'XXX' } $tokSol
Check "UF invalida -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/propostas" @{ titulo = 'T'; dataVoo = $dataVoo; horaVoo = '14:30'; duracaoMin = 60; qualidadeVideo = '4K_60FPS'; formatoVideo = 'MP4'; valorOferecido = 100 } $tokDr1
Check "dronista nao cria proposta -> 403" ($r.status -eq 403) ("status=$($r.status) body=$($r.body)")

Write-Output "=== 4. Proposta valida + contas ==="
$r = Api POST "$base/propostas" @{ titulo = 'Filmagem aerea do sitio'; descricao = 'Vista aerea do terreno e em volta'; local = 'Estrada do sol, km 5'; dataVoo = $dataVoo; horaVoo = '14:30'; duracaoMin = 60; qualidadeVideo = '4K_60FPS'; fps = $null; formatoVideo = 'MP4'; valorOferecido = 350; estado = 'SP'; cidade = 'Itu'; bairro = 'Zona rural'; logradouro = 'Rua das Acacias'; cep = '13300000' } $tokSol
Check "criar proposta com localizacao" ($r.ok) ($r.body)
$propostaId = $r.data.id

# Busca paginada: a proposta pode estar em página posterior (banco cheio de seeds/simulação)
$propostaEncontrada = $null
$paginas = 0
do {
  $r = Api GET "$base/propostas/abertas?page=$paginas" $null $tokDr1
  $encontrada = ($r.data.conteudo | Where-Object { $_.id -eq $propostaId })
  if ($encontrada) { $propostaEncontrada = $encontrada }
  $paginas++
} until ($propostaEncontrada -or $paginas -ge [Math]::Max(1, [int]$r.data.totalPaginas))
Check "dronista ve proposta aberta no marketplace (paginado, achou na pagina $paginas)" ($r.ok -and $null -ne $propostaEncontrada) ($r.body)
Check "logradouro persistido e retornado no marketplace" ($propostaEncontrada -and $propostaEncontrada.logradouro -eq 'Rua das Acacias') ($propostaEncontrada.logradouro)

$r = Api GET "$base/propostas/$propostaId" $null $tokDr1
Check "dronista abre detalhe de proposta aberta antes de ter conta" ($r.ok -and $r.data.id -eq $propostaId) ($r.body)

$r = Api GET "$base/propostas/abertas?estado=SP&cidade=itu" $null $tokDr1
Check "filtro por UF+cidade (case-insensitive)" ($r.ok -and $r.data.totalElementos -ge 1) ($r.body)
$r = Api GET "$base/propostas/abertas?estado=RR" $null $tokDr1
Check "filtro por UF sem resultados (RR)" ($r.ok -and $r.data.totalElementos -eq 0) ($r.body)

$r = Api GET "$base/propostas/abertas/cidades?estado=SP" $null $tokDr1
Check "combo de cidades SP inclui Itu" ($r.ok -and ($r.data -contains 'Itu')) ($r.body | Out-String)

# distância pelo DETALHE (independe da página em que a proposta está)
$r = Api GET "$base/propostas/$propostaId" $null $tokDr1
if ($r.ok -and $null -ne $r.data.distanciaKm) {
  Check "distancia base->voo calculada (Campinas->Itu: $($r.data.distanciaKm) km)" ([double]$r.data.distanciaKm -gt 10) ($r.data.distanciaKm)
} else {
  Write-Output "SKIP : geocoding externo indisponivel agora — checagem de distancia ignorada"
}

Write-Output "=== 4b. Bloqueio de aceite com cadastro em aprovacao ==="
$r = Api POST "$base/propostas/$propostaId/contas" @{ valorProposto = 300; mensagem = 'tentativa bloqueada' } $tokDr2
Check "dronista com cadastro em analise NAO envia conta -> 403" ($r.status -eq 403) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/propostas/$propostaId/aceitar" $null $tokDr2
Check "aceite direto bloqueado para cadastro em analise -> 403" ($r.status -eq 403) ("status=$($r.status) body=$($r.body)")

$admLogin = Api POST "$base/auth/login" @{ email = 'admin@dronistas.com'; senha = 'admin123' } $null
$tokAdm = $admLogin.data.token
$r = Api GET "$base/admin/validacoes?status=ENVIADA" $null $tokAdm
$dr2fila = $r.data | Where-Object { $_.nome -eq 'Bruna Dronista' } | Select-Object -First 1
Check "admin ve dronista 2 na fila de ENVIADA" ($r.ok -and $dr2fila) ($r.body | Out-String)
$r = Api POST "$base/admin/validacoes/$($dr2fila.perfilId)/aprovar" $null $tokAdm
Check "admin aprova dronista 2" ($r.ok) ($r.body)
$r = Api GET "$base/admin/validacoes?status=PENDENTE" $null $tokAdm
$dr1fila = $r.data | Where-Object { $_.nome -eq 'Carlos Dronista' } | Select-Object -First 1
Check "admin ve dronista 1 na fila de PENDENTE" ($r.ok -and $dr1fila) ($r.body | Out-String)
$r = Api POST "$base/admin/validacoes/$($dr1fila.perfilId)/aprovar" $null $tokAdm
Check "admin aprova dronista 1" ($r.ok) ($r.body)
$r = Api GET "$base/propostas/$propostaId" $null $tokDr1
Check "dronista ainda ve a proposta quando PENDENTE (visualiza, nao aceita)" ($r.ok -and $r.data.id -eq $propostaId) ($r.body)

$r = Api POST "$base/propostas/$propostaId/contas" @{ valorProposto = 320; mensagem = 'Mavic 3 Pro, entrega em 48h' } $tokDr1
Check "dronista 1 envia conta 320" ($r.ok) ($r.body)
$contaDr1 = $r.data.id

$r = Api POST "$base/propostas/$propostaId/contas" @{ valorProposto = 300; mensagem = 'Air 2S, entrega em 24h' } $tokDr2
Check "dronista 2 envia conta 300" ($r.ok) ($r.body)
$contaDr2 = $r.data.id

$r = Api POST "$base/propostas/$propostaId/contas" @{ valorProposto = 280; mensagem = 'revisao do preco' } $tokDr2
Check "dronista 2 atualiza a propria conta (sobrescreve)" ($r.ok) ($r.body)

$r = Api GET "$base/propostas/$propostaId/contas" $null $tokSol
$contaDr2Depois = $r.data | Where-Object { $_.id -eq $contaDr2 }
Check "solicitante lista 2 contas (uma por dronista)" ($r.ok -and $r.data.Count -eq 2) ($r.body)
Check "atualizacao da conta dr2 ficou 280" ($contaDr2Depois.valorProposto -eq 280) ($contaDr2Depois.valorProposto)

$r = Api GET "$base/propostas/$propostaId/contas" $null $tokDr1
Check "dronista NAO ve contas de outra proposta -> 404" ($r.status -eq 404) ("status=$($r.status)")

Write-Output "=== 5. Aceitacao ==="
$r = Api POST "$base/contas/$contaDr2/aceitar" $null $tokDr2
Check "dronista nao aceita contas -> 403" ($r.status -eq 403) ("status=$($r.status)")
$r = Api POST "$base/contas/$contaDr1/aceitar" $null $tokSol
Check "solicitante aceita conta do dronista 1" ($r.ok) ($r.body)

$r = Api GET "$base/propostas/$propostaId" $null $tokSol
Check "proposta ficou ACEITA com dronista 1" ($r.data.status -eq 'ACEITA') ($r.data.status)
$r = Api GET "$base/propostas/$propostaId/contas" $null $tokSol
$st2 = ($r.data | Where-Object { $_.id -eq $contaDr2 }).status
$st1 = ($r.data | Where-Object { $_.id -eq $contaDr1 }).status
Check "conta dr2 recusada automaticamente" ($st2 -eq 'RECUSADA') ($st2)
Check "conta dr1 aceita" ($st1 -eq 'ACEITA') ($st1)

$r = Api POST "$base/propostas/$propostaId/contas" @{ valorProposto = 310 } $tokDr2
Check "conta nova em proposta fechada -> 403" ($r.status -eq 403) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/contas/$contaDr2/aceitar" $null $tokSol
Check "aceitar conta ja recusada -> 403" ($r.status -eq 403) ("status=$($r.status)")
$r = Api POST "$base/propostas/$propostaId/cancelar" $null $tokSol
Check "cancelar proposta aceita -> 403" ($r.status -eq 403) ("status=$($r.status)")

Write-Output "=== 6. Entrega e aprovacao ==="
# entrega por UPLOAD de arquivo (multipart) — criando um MP4 de teste em runtime
$videoTemp = "$env:TEMP\smoke-video.mp4"
[System.IO.File]::WriteAllBytes($videoTemp, (New-Object byte[] 1048576)) # 1 MB de zeros
function UploadEntrega($contaId, $token, $obs) {
  $headers = @{ Authorization = "Bearer $token" }
  $form = @{ arquivo = Get-Item $videoTemp }
  if ($obs) { $form['observacao'] = $obs }
  try {
    $resp = Invoke-RestMethod -Uri "$base/contas/$contaId/entrega" -Method POST -Headers $headers -Form $form -TimeoutSec 600
    return @{ ok = $true; data = $resp; status = 200 }
  } catch {
    $status = 0; $errBody = $null
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode; $errBody = $_.ErrorDetails.Message }
    return @{ ok = $false; status = $status; body = $errBody }
  }
}

$r = UploadEntrega $contaDr1 $tokDr1 'Corte bruto 4K60'
Check "dronista 1 entrega video (upload S3)" ($r.ok) ($r.body)
$entregaId = $r.data.id

$r = UploadEntrega $contaDr1 $tokDr2 $null
Check "dronista 2 (sem conta aceita) tenta entregar -> 404" ($r.status -eq 404) ("status=$($r.status) body=$($r.body)")

$r = Api GET "$base/entregas/recebidas" $null $tokSol
Check "solicitante ve entrega recebida" ($r.ok -and ($r.data | Where-Object { $_.id -eq $entregaId }).Count -eq 1) ($r.body)

$r = Api POST "$base/entregas/$entregaId/recusar" $null $tokSol
Check "solicitante recusa entrega (REJEITADA)" ($r.ok) ($r.body)
$r = UploadEntrega $contaDr1 $tokDr1 'Versao corrigida com color grading'
Check "dronista 1 reenvia video (mesma entrega, status volta a ENVIADA)" ($r.ok -and $r.data.id -eq $entregaId -and $r.data.status -eq 'ENVIADA') ($r.body)

$r = Api POST "$base/entregas/$entregaId/aprovar" $null $tokSol
Check "solicitante aprova entrega -> pagamento liberado" ($r.ok -and $r.data.status -eq 'APROVADA') ($r.body)
$r = Api GET "$base/propostas/$propostaId" $null $tokSol
Check "proposta ficou CONCLUIDA" ($r.data.status -eq 'CONCLUIDA') ($r.data.status)

Write-Output "=== 6b. N arquivos de video por entrega ==="
# nova proposta + aceite para testar a lista de vídeos
$r = Api POST "$base/propostas" @{ titulo = 'Voo com varios videos'; dataVoo = $dataVoo; horaVoo = '11:00'; duracaoMin = 45; qualidadeVideo = '4K_60FPS'; fps = $null; formatoVideo = 'MP4'; valorOferecido = 500 } $tokSol
Check "criar proposta p/ N videos" ($r.ok) ($r.body)
$pN = $r.data.id
$r = Api POST "$base/propostas/$pN/contas" @{ valorProposto = 480 } $tokDr1
$contaN = $r.data.id
$r = Api POST "$base/contas/$contaN/aceitar" $null $tokSol
Check "aceitar conta (proposta N)" ($r.ok) ($r.body)

# primeira entrega (upload 1)
$r = UploadEntrega $contaN $tokDr1 'Parte 1'
Check "primeiro upload (parte 1)" ($r.ok) ($r.body)
$entN = $r.data.id
$hdrDr1N = @{ Authorization = ("Bearer " + $tokDr1) }
$hdrSolN = @{ Authorization = ("Bearer " + $tokSol) }

# anexa 2 vídeo extras na MESMA entrega
        $extra1 = Invoke-RestMethod -Uri "$base/entregas/$entN/arquivos" -Method POST -Headers $hdrDr1N -Form @{ arquivo = Get-Item $videoTemp } -TimeoutSec 300
        $extra2 = Invoke-RestMethod -Uri "$base/entregas/$entN/arquivos" -Method POST -Headers $hdrDr1N -Form @{ arquivo = Get-Item $videoTemp } -TimeoutSec 300
Check "anexar 2o video na entrega" ($null -ne $extra1.id) ($extra1)
Check "anexar 3o video na entrega" ($null -ne $extra2.id) ($extra2)

# lista de arquivos da entrega (rota própria)
        $rA = Invoke-RestMethod -Uri "$base/entregas/$entN/arquivos" -Headers $hdrDr1N -TimeoutSec 60
$nArq = @($rA).Count
Check "entrega lista 3 videos" ($nArq -eq 3) ($nArq)

# streaming de um arquivo da lista pelo SOLICITANTE
        $vidA = Invoke-WebRequest -Uri "$base/entregas/arquivos/$($extra1.id)/video" -Headers $hdrSolN -TimeoutSec 90
Check "streaming do 2o video pelo solicitante" ($vidA.StatusCode -eq 200 -and $vidA.RawContentLength -gt 0) ($vidA.RawContentLength)

        # REMOCAO APOS ENTREGA: bloqueada - o video entregue e imutavel para o dronista;
        # so o solicitante (via recusa) devolve o controle para reenvio.
        try {
          Invoke-RestMethod -Uri "$base/entregas/arquivos/$($extra2.id)" -Method DELETE -Headers $hdrDr1N -TimeoutSec 60 -ErrorAction Stop | Out-Null
          Check "remocao apos entrega bloqueada -> 403" ($false) ("esperava 403")
        } catch {
          $st = 0
          if ($_.Exception.Response) { $st = [int]$_.Exception.Response.StatusCode }
          Check "remocao apos entrega bloqueada -> 403" ($st -eq 403) ("status=$st")
        }

        # solicitante recusa -> o controle volta ao dronista, que pode ajustar a lista
        $r = Api POST "$base/entregas/$entN/recusar" $null $tokSol
        Check "solicitante recusa entrega (controle volta ao dronista)" ($r.ok) ($r.body)
        Invoke-RestMethod -Uri "$base/entregas/arquivos/$($extra2.id)" -Method DELETE -Headers $hdrDr1N -TimeoutSec 60 | Out-Null
        $rA2 = Invoke-RestMethod -Uri "$base/entregas/$entN/arquivos" -Headers $hdrDr1N -TimeoutSec 60
        $nArq2 = @($rA2).Count
        Check "remocao apos recusa permitida (lista encolhe para 2)" ($nArq2 -eq 2) ($nArq2)

        # REENVIA (obrigatorio apos recusa): entrega nova com os 2 videos restantes
        $r = Api POST "$base/contas/$contaN/entrega-final" -TimeoutSec 120 -Headers $hdrDr1N -ContentType 'application/json' -Body (@{ observacao = 'Versao corrigida' } | ConvertTo-Json) -ErrorAction SilentlyContinue
        $r = UploadEntrega $contaN $tokDr1 'Versao corrigida'
        Check "dronista reenvia apos recusa" ($r.ok) ($r.body)
        $entN2 = $r.data.id

        # aprovar com a lista ajustada (nova entrega)
        $r = Api POST "$base/entregas/$entN2/aprovar" $null $tokSol
        Check "aprovar entrega com lista de videos" ($r.ok -and $r.data.status -eq 'APROVADA') ($r.body)

Write-Output "=== 6c. Staging: anexa N videos e so entrega no final ==="
# nova proposta + aceite para o fluxo de rascunho
$r = Api POST "$base/propostas" @{ titulo = 'Voo staging'; dataVoo = $dataVoo; horaVoo = '13:00'; duracaoMin = 60; qualidadeVideo = '4K_30FPS'; fps = $null; formatoVideo = 'MOV'; valorOferecido = 400 } $tokSol
Check "criar proposta p/ staging" ($r.ok) ($r.body)
$pS = $r.data.id
$r = Api POST "$base/propostas/$pS/contas" @{ valorProposto = 380 } $tokDr1
$contaS = $r.data.id
$r = Api POST "$base/contas/$contaS/aceitar" $null $tokSol
Check "aceitar conta (staging)" ($r.ok) ($r.body)

$hdrDr1 = @{ Authorization = ("Bearer " + $tokDr1) }
# ANEXA 2 videos no rascunho (o solicitante ainda NAO ve nada)
$ra1 = Invoke-RestMethod -Uri "$base/contas/$contaS/rascunho" -Method POST -Headers $hdrDr1 -Form @{ arquivo = Get-Item $videoTemp } -TimeoutSec 300
$ra2 = Invoke-RestMethod -Uri "$base/contas/$contaS/rascunho" -Method POST -Headers $hdrDr1 -Form @{ arquivo = Get-Item $videoTemp } -TimeoutSec 300
Check "rascunho: anexar 1o video (staging)" ($null -ne $ra1.id) ($ra1)
Check "rascunho: anexar 2o video (staging)" ($null -ne $ra2.id) ($ra2)
$rS = Invoke-RestMethod -Uri "$base/contas/$contaS/rascunho" -Headers $hdrDr1 -TimeoutSec 60
Check "rascunho lista 2 videos" (@($rS).Count -eq 2) ($rS)

# FINALIZA: os 2 videos do rascunho viram a entrega visível ao solicitante
$fin = Invoke-RestMethod -Uri "$base/contas/$contaS/entrega-final" -Method POST -Headers $hdrDr1 -ContentType 'application/json' -Body (@{ observacao = 'Entrega final com 2 videos' } | ConvertTo-Json) -TimeoutSec 120
Check "finalizar entrega (rascunho -> ENVIADA)" ($fin.status -eq 'ENVIADA') ($fin)

# rascunho ficou vazio apos finalizar
$rS2 = Invoke-RestMethod -Uri "$base/contas/$contaS/rascunho" -Headers $hdrDr1 -TimeoutSec 60
Check "rascunho vazio apos entrega" (@($rS2).Count -eq 0) ($rS2)

# entregas visiveis tem 2 arquivos para o SOLICITANTE
$entregas = Invoke-RestMethod -Uri "$base/entregas/recebidas" -Headers @{ Authorization = ("Bearer " + $tokSol) } -TimeoutSec 60
$entSol = $entregas | Where-Object { $_.id -eq $fin.id } | Select-Object -First 1
$nArqS = @($entSol.arquivos).Count
Check "solicitante ve entrega com 2 videos" ($null -ne $entSol -and $nArqS -eq 2) ($nArqS)

# streaming de 1 video da lista pelo SOLICITANTE
$vidS = Invoke-WebRequest -Uri "$base/entregas/arquivos/$($entSol.arquivos[0].id)/video" -Headers @{ Authorization = ("Bearer " + $tokSol) } -TimeoutSec 90
Check "solicitante assiste 1 video da lista (streaming 200)" ($vidS.StatusCode -eq 200 -and $vidS.RawContentLength -gt 0) ($vidS.RawContentLength)

# finalizar sem anexar nada (nova entrega) deve falhar com 422
$r = Api POST "$base/contas/$contaS/entrega-final" @{ observacao = 'sem videos' } $tokDr1
Check "finalizar sem videos no rascunho -> 422" ($r.status -eq 422) ("status=$($r.status) body=$($r.body)")

Write-Output "=== 7. Avaliacoes e ranking ==="
$r = Api POST "$base/entregas/$entregaId/avaliar" @{ nota = 5; comentario = 'Excelente trabalho' } $tokSol
Check "solicitante avalia dronista (5)" ($r.ok -and $r.data.nota -eq 5) ($r.body)
$r = Api POST "$base/entregas/$entregaId/avaliar" @{ nota = 4 } $tokSol
Check "avaliacao duplicada -> 403" ($r.status -eq 403) ("status=$($r.status)")
$r = Api POST "$base/entregas/$entregaId/avaliar-solicitante" @{ nota = 4; comentario = 'Cliente organizado' } $tokDr1
Check "dronista avalia solicitante (4)" ($r.ok -and $r.data.notaSolicitante -eq 4) ($r.body)
$r = Api POST "$base/entregas/$entregaId/avaliar" @{ nota = 3 } $tokDr2
Check "outro dronista nao avalia -> 403/404" ($r.status -eq 403 -or $r.status -eq 404) ("status=$($r.status)")

$r = Api GET "$base/ranking/dronistas" $null $tokSol
$carlos = $r.data | Where-Object { $_.nome -eq 'Carlos Dronista' } | Select-Object -First 1
Check "ranking dronistas com Carlos (5.0, 1 trabalho)" ($r.ok -and $carlos -and [double]$carlos.notaMedia -eq 5.00 -and $carlos.trabalhosConcluidos -ge 1) ($r.body | Out-String)
$r = Api GET "$base/ranking/solicitantes" $null $tokDr1
$ana = $r.data | Where-Object { $_.nome -eq 'Ana Solicitante' } | Select-Object -First 1
Check "ranking solicitantes com Ana (4.0, 1 contratacao)" ($r.ok -and $ana -and $ana.contratacoes -ge 1) ($r.body | Out-String)

$r = Api GET "$base/perfil/me" $null $tokDr1
Check "perfil dronista: notaMedia 5 e trabalhos >= 1" ($r.ok -and [double]$r.data.notaMedia -eq 5.00 -and $r.data.trabalhosConcluidos -ge 1) ($r.body | Out-String)

Write-Output "=== 8. Fluxo solicitante: cancelar proposta aberta ==="
$r = Api POST "$base/propostas" @{ titulo = 'Voo cancelavel'; dataVoo = $dataVoo; horaVoo = '09:00'; duracaoMin = 30; qualidadeVideo = 'FULLHD'; fps = 60; formatoVideo = 'MP4'; valorOferecido = 120 } $tokSol
Check "criar segunda proposta (FULLHD + fps 60)" ($r.ok) ($r.body)
$p2 = $r.data.id
$r = Api POST "$base/propostas/$p2/cancelar" $null $tokSol
Check "cancelar proposta aberta" ($r.ok) ($r.body)
$r = Api GET "$base/propostas/minhas" $null $tokSol
$cancelada = $r.data.conteudo | Where-Object { $_.id -eq $p2 }
Check "status CANCELADA na listagem paginada (pagina 1 conteudo)" ($cancelada.status -eq 'CANCELADA') ($cancelada.status)
Check "minhas propostas paginada (totalPaginas/totalElementos presentes)" ($r.ok -and $null -ne $r.data.totalPaginas -and $null -ne $r.data.totalElementos) ($r.body | Out-String)

Write-Output "=== 9. Aceitacao direta do valor ofertado (de cara) ==="
$r = Api POST "$base/propostas" @{ titulo = 'Voo para aceite imediato'; dataVoo = $dataVoo; horaVoo = '11:00'; duracaoMin = 45; qualidadeVideo = '2K'; fps = 30; formatoVideo = 'LOG'; valorOferecido = 200 } $tokSol
Check "criar proposta para aceite direto (2K + fps 30 + LOG)" ($r.ok) ($r.body)
$p3 = $r.data.id
$r = Api POST "$base/propostas/$p3/contas" @{ valorProposto = 180; mensagem = 'posso fazer por menos' } $tokDr2
Check "dronista 2 envia contraproposta na proposta 3" ($r.ok) ($r.body)
$r = Api POST "$base/propostas/$p3/aceitar" $null $tokSol
Check "solicitante nao usa aceite-de-cara (papel errado) -> 403" ($r.status -eq 403) ("status=$($r.status)")
$r = Api POST "$base/propostas/$p3/aceitar" $null $tokDr1
Check "dronista 1 aceita de cara o valor ofertado" ($r.ok -and $r.data.status -eq 'ACEITA') ($r.body)
$r = Api POST "$base/propostas/$p3/aceitar" $null $tokDr2
Check "outro dronista aceita proposta ja fechada -> 403" ($r.status -eq 403) ("status=$($r.status) body=$($r.body)")
$r = Api POST "$base/propostas/$p3/contas" @{ valorProposto = 150 } $tokDr2
Check "nova conta em proposta fechada por aceite direto -> 403" ($r.status -eq 403) ("status=$($r.status)")
$r = Api GET "$base/contas/minhas" $null $tokDr2
$minhaNaP3 = $r.data | Where-Object { $_.propostaId -eq $p3 } | Select-Object -First 1
Check "contraproposta do dronista 2 foi descartada (RECUSADA)" ($minhaNaP3 -and $minhaNaP3.status -eq 'RECUSADA') ($minhaNaP3.status)

Write-Output ""
if ($script:fail -eq 0) { Write-Output "SMOKE TEST: TODOS OS CHECKS PASSARAM" } else { Write-Output "SMOKE TEST: $script:fail FALHAS" }
exit 0
