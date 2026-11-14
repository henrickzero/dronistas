package com.dronistas.service;

import com.dronistas.security.RegraNegocioException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Upload de documentos do dronista para o S3 da AWS.
 * - Chave/secret chegam por env (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY);
 *   sem credenciais configuradas, o serviço fica DESABILITADO e o upload devolve
 *   503 com mensagem clara (validações de tipo/tamanho rodam antes, sem tocar o S3).
 * - Objetos gravados com chave aleatória sob documentos/AAAA/; bucket privado —
 *   leitura feita por URL pré-assinada (15 min) com checagem de titularidade.
 * - Limites: 2 arquivos por dronista (campos doc1/doc2 do perfil), 100 MB cada,
 *   tipos: JPG/PNG/WEBP/HEIC/HEIF/PDF.
 */
@Service
public class S3UploadService {

    private static final Logger log = LoggerFactory.getLogger(S3UploadService.class);

    static final long MAX_BYTES = 100L * 1024 * 1024; // 100 MB
    private static final Set<String> TIPOS_OK = Set.of(
            "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf");
    private static final Set<String> EXTENSOES_OK = Set.of("jpg", "jpeg", "png", "webp", "heic", "heif", "pdf");

    private final S3Client s3;
    private final S3Presigner presigner;
    private final String bucket;
    private final Region region;
    private final boolean habilitado;

    public S3UploadService(@Value("${aws.s3.access-key:}") String accessKey,
                           @Value("${aws.s3.secret-key:}") String secretKey,
                           @Value("${aws.s3.region:us-east-2}") String regionName,
                           @Value("${aws.s3.bucket:}") String bucket) {
        this.habilitado = accessKey != null && !accessKey.isBlank()
                && secretKey != null && !secretKey.isBlank()
                && bucket != null && !bucket.isBlank();
        this.bucket = bucket == null ? "" : bucket;
        this.region = Region.of(regionName == null || regionName.isBlank() ? "us-east-2" : regionName);
        if (habilitado) {
            AwsBasicCredentials creds = AwsBasicCredentials.create(accessKey, secretKey);
            this.s3 = S3Client.builder().region(this.region)
                    .credentialsProvider(StaticCredentialsProvider.create(creds)).build();
            this.presigner = S3Presigner.builder().region(this.region)
                    .credentialsProvider(StaticCredentialsProvider.create(creds)).build();
            log.info("upload S3 habilitado (bucket {} / {})", this.bucket, this.region);
        } else {
            this.s3 = null;
            this.presigner = null;
            log.warn("upload S3 DESABILITADO — defina AWS_ACCESS_KEY_ID/SECRET/BUCKET para ativar");
        }
    }

    public boolean habilitado() { return habilitado; }

    /** Valida e envia o arquivo; devolve a URL pública-forma do objeto (bucket privado = leitura via presign). */
    public record UploadResultado(String url, String chave, long tamanho, String contentType) {}

    public UploadResultado enviarDocumento(MultipartFile arquivo) {
        validarArquivo(arquivo);
        exigirHabilitado();

        String nome = arquivo.getOriginalFilename() == null ? "documento" : arquivo.getOriginalFilename();
        String limpo = nome.replaceAll("[^A-Za-z0-9._-]", "_");
        if (limpo.length() > 60) limpo = limpo.substring(limpo.length() - 60);
        String chave = "documentos/" + java.time.Year.now().getValue() + "/"
                + UUID.randomUUID() + "-" + limpo;

        try {
            PutObjectRequest put = PutObjectRequest.builder()
                    .bucket(bucket).key(chave)
                    .contentType(arquivo.getContentType())
                    .contentDisposition("inline; filename=\"" + limpo + "\"")
                    .build();
            s3.putObject(put, RequestBody.fromInputStream(arquivo.getInputStream(), arquivo.getSize()));
        } catch (IOException e) {
            throw new RegraNegocioException("UPLOAD_FALHOU", "Falha ao ler o arquivo enviado");
        } catch (Exception e) {
            log.error("Falha no upload para o S3: {}", e.getMessage());
            throw new RegraNegocioException("UPLOAD_FALHOU", "Falha ao enviar o arquivo para o armazenamento");
        }

        String url = String.format(Locale.ROOT, "https://%s.s3.%s.amazonaws.com/%s", bucket, region.id(), chave);
        return new UploadResultado(url, chave, arquivo.getSize(), arquivo.getContentType());
    }

    public void excluir(String chave) {
        exigirHabilitado();
        if (chave == null || !chave.startsWith("documentos/"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Chave de documento inválida");
        s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(chave).build());
    }

    /** URL pré-assinada (15 min) para baixar/visualizar o documento do bucket privado. */
    public String urlPresignada(String chave) {
        exigirHabilitado();
        if (chave == null || !chave.startsWith("documentos/"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Chave de documento inválida");
        GetObjectRequest get = GetObjectRequest.builder().bucket(bucket).key(chave).build();
        return presigner.presignGetObject(GetObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofMinutes(15))
                        .getObjectRequest(get).build())
                .url().toString();
    }

    private void validarArquivo(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty())
            throw new RegraNegocioException("CAMPO_OBRIGATORIO", "Selecione o arquivo do documento");
        if (arquivo.getSize() > MAX_BYTES)
            throw new RegraNegocioException("CAMPO_INVALIDO", "Arquivo maior que 100 MB — reduza e tente novamente");
        String tipo = arquivo.getContentType() == null ? "" : arquivo.getContentType().toLowerCase(Locale.ROOT);
        String nome = arquivo.getOriginalFilename() == null ? "" : arquivo.getOriginalFilename();
        if (nome.contains("..") || nome.contains("/"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Nome de arquivo inválido");
        // MIME correto OU extensão válida: navegadores mandam tipo genérico/octet-stream em
        // alguns casos (ex.: HEIC de celular em Windows) — a extensão decide nesses casos.
        boolean tipoOk = TIPOS_OK.contains(tipo);
        String ext = nome.contains(".") ? nome.substring(nome.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT) : "";
        boolean extOk = EXTENSOES_OK.contains(ext);
        boolean generico = tipo.isEmpty() || tipo.equals("application/octet-stream");
        if (!(tipoOk || (generico && extOk)))
            throw new RegraNegocioException("CAMPO_INVALIDO",
                    "Tipo de arquivo não aceito — envie foto (JPG, PNG, WEBP, HEIC) ou PDF digitalizado");
    }

    private void exigirHabilitado() {
        if (!habilitado)
            throw new RegraNegocioException("UPLOAD_NAO_CONFIGURADO",
                    "Serviço de upload ainda não configurado — peça ao administrador para definir as credenciais da AWS");
    }

    /** Extrai a chave do objeto a partir da URL https://<bucket>.s3.<regiao>.amazonaws.com/<chave>. */
    public static String chaveDeUrl(String url) {
        if (url == null) throw new RegraNegocioException("CAMPO_INVALIDO", "URL de documento inválida");
        int i = url.indexOf(".amazonaws.com/");
        if (i < 0) throw new RegraNegocioException("CAMPO_INVALIDO", "URL de documento inválida");
        return url.substring(i + ".amazonaws.com/".length());
    }
}
