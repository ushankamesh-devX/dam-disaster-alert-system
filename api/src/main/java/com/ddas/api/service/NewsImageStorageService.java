package com.ddas.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Service managing news article images stored exclusively in MinIO Object Storage (S3 API).
 * Stores files under the 'news-images/' prefix in the configured bucket (ddas-artifacts).
 * No local disk fallback: throws on failure to guarantee storage integrity.
 */
@Slf4j
@Service
public class NewsImageStorageService {

    private final String endpoint;
    private final String accessKey;
    private final String secretKey;
    private final String bucketName;
    private final HttpClient httpClient;
    private volatile boolean bucketInitialized = false;

    private static final String S3_PREFIX = "news-images/";

    private static final DateTimeFormatter AMZ_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter DATE_STAMP_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"
    );

    public NewsImageStorageService(
            @Value("${minio.endpoint:http://localhost:9000}") String endpoint,
            @Value("${minio.access-key:minioadmin}") String accessKey,
            @Value("${minio.secret-key:minioadmin}") String secretKey,
            @Value("${minio.bucket-name:ddas-artifacts}") String bucketName
    ) {
        this.endpoint = endpoint.replaceAll("/+$", "");
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.bucketName = bucketName;

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        log.info("NewsImageStorageService initialized. MinIO endpoint: {}, bucket: {}",
                this.endpoint, this.bucketName);
    }

    /**
     * Upload an image file for a news article directly to MinIO.
     * Stores object under prefix 'news-images/'.
     *
     * @param file uploaded MultipartFile
     * @return Saved image URL format: /api/v1/news-articles/images/<filename>
     */
    public String uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file cannot be empty");
        }

        String originalFilename = file.getOriginalFilename();
        String extension = getFileExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported image format. Allowed formats: " + ALLOWED_EXTENSIONS);
        }

        String uniqueFileName = UUID.randomUUID().toString() + "_" + sanitizeFilename(originalFilename);
        String objectKey = S3_PREFIX + uniqueFileName;
        String contentType = file.getContentType() != null && !file.getContentType().isBlank()
                ? file.getContentType()
                : determineMediaType(uniqueFileName).toString();

        byte[] fileBytes;
        try {
            fileBytes = file.getBytes();
        } catch (IOException e) {
            log.error("Failed to read image bytes for file '{}': {}", originalFilename, e.getMessage(), e);
            throw new RuntimeException("Failed to read image bytes: " + e.getMessage(), e);
        }

        uploadToMinio(objectKey, fileBytes, contentType);

        String savedImageUrl = "/api/v1/news-articles/images/" + uniqueFileName;
        log.info("Successfully uploaded news image to MinIO: bucket={}, objectKey={}, savedUrl={}",
                bucketName, objectKey, savedImageUrl);
        return savedImageUrl;
    }

    /**
     * Direct binary upload helper for raw bytes (PC/mobile streams).
     *
     * @param data binary bytes
     * @param originalFilename original or proposed file name
     * @param contentType MIME type
     * @return Saved image URL format: /api/v1/news-articles/images/<filename>
     */
    public String uploadImageBytes(byte[] data, String originalFilename, String contentType) {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException("Image byte data cannot be empty");
        }

        String extension = getFileExtension(originalFilename);
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new IllegalArgumentException("Unsupported image format. Allowed formats: " + ALLOWED_EXTENSIONS);
        }

        String uniqueFileName = UUID.randomUUID().toString() + "_" + sanitizeFilename(originalFilename);
        String objectKey = S3_PREFIX + uniqueFileName;
        String resolvedContentType = (contentType != null && !contentType.isBlank())
                ? contentType
                : determineMediaType(uniqueFileName).toString();

        uploadToMinio(objectKey, data, resolvedContentType);

        String savedImageUrl = "/api/v1/news-articles/images/" + uniqueFileName;
        log.info("Successfully uploaded binary news image to MinIO: bucket={}, objectKey={}, savedUrl={}",
                bucketName, objectKey, savedImageUrl);
        return savedImageUrl;
    }

    /**
     * Retrieve image bytes directly from MinIO for the GET /images/{filename} endpoint.
     *
     * @param filename object file name within the 'news-images/' prefix
     * @return ResponseEntity with image byte data and Content-Type header
     */
    public ResponseEntity<byte[]> getImageResponse(String filename) {
        if (filename == null || filename.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        String sanitizedFilename = sanitizeFilename(filename);
        String objectKey = S3_PREFIX + sanitizedFilename;

        byte[] fromMinio;
        try {
            fromMinio = downloadFromMinio(objectKey);
        } catch (Exception e) {
            log.error("Failed to read image from MinIO for filename '{}' (key='{}'): {}",
                    filename, objectKey, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }

        if (fromMinio != null && fromMinio.length > 0) {
            MediaType mediaType = determineMediaType(sanitizedFilename);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
                    .contentType(mediaType)
                    .body(fromMinio);
        }

        log.warn("News image not found in MinIO: bucket={}, objectKey={}", bucketName, objectKey);
        return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
    }

    /**
     * Delete an image from MinIO by URL or object key.
     *
     * @param imageUrlOrKey full URL or relative object key
     */
    public void deleteImage(String imageUrlOrKey) {
        if (imageUrlOrKey == null || imageUrlOrKey.isBlank()) {
            return;
        }

        String objectKey = extractObjectKey(imageUrlOrKey);
        if (objectKey != null) {
            deleteFromMinio(objectKey);
        }
    }

    private void uploadToMinio(String objectKey, byte[] data, String contentType) {
        try {
            ensureBucketReady();

            String url = endpoint + "/" + bucketName + "/" + objectKey;
            HttpRequest request = createSignedRequest("PUT", "/" + bucketName + "/" + objectKey, url, data, contentType, null);
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200 || response.statusCode() == 201) {
                return;
            }

            if (response.statusCode() == 404) {
                // Bucket might not exist yet; retry once after bucket creation
                bucketInitialized = false;
                ensureBucketReady();
                HttpRequest retryReq = createSignedRequest("PUT", "/" + bucketName + "/" + objectKey, url, data, contentType, null);
                HttpResponse<String> retryResp = httpClient.send(retryReq, HttpResponse.BodyHandlers.ofString());
                if (retryResp.statusCode() == 200 || retryResp.statusCode() == 201) {
                    return;
                }
                String msg = "MinIO upload failed after bucket retry: HTTP " + retryResp.statusCode() + " - " + retryResp.body();
                log.error("Failed to upload news image to MinIO: bucket={}, objectKey={}, cause={}", bucketName, objectKey, msg);
                throw new IllegalStateException(msg);
            }

            String msg = "MinIO upload returned HTTP " + response.statusCode() + ": " + response.body();
            log.error("Failed to upload news image to MinIO: bucket={}, objectKey={}, cause={}", bucketName, objectKey, msg);
            throw new IllegalStateException(msg);
        } catch (Exception e) {
            log.error("Failed to upload news image to MinIO: bucket={}, objectKey={}, cause={}",
                    bucketName, objectKey, e.getMessage(), e);
            throw new RuntimeException("MinIO upload failed for object '" + objectKey + "': " + e.getMessage(), e);
        }
    }

    private byte[] downloadFromMinio(String objectKey) {
        try {
            String url = endpoint + "/" + bucketName + "/" + objectKey;
            HttpRequest request = createSignedRequest("GET", "/" + bucketName + "/" + objectKey, url, new byte[0], null, null);
            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() == 200) {
                return response.body();
            }
            if (response.statusCode() == 404) {
                return null;
            }
            log.error("MinIO download failed: HTTP {} for objectKey={}", response.statusCode(), objectKey);
            return null;
        } catch (Exception e) {
            log.error("Error connecting to MinIO to download object '{}': {}", objectKey, e.getMessage(), e);
            throw new RuntimeException("Failed to download from MinIO: " + e.getMessage(), e);
        }
    }

    private void deleteFromMinio(String objectKey) {
        try {
            String url = endpoint + "/" + bucketName + "/" + objectKey;
            HttpRequest request = createSignedRequest("DELETE", "/" + bucketName + "/" + objectKey, url, new byte[0], null, null);
            HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());
            if (response.statusCode() == 204 || response.statusCode() == 200) {
                log.info("Deleted object {} from MinIO bucket {}", objectKey, bucketName);
            } else {
                log.warn("MinIO delete object {} returned HTTP {}", objectKey, response.statusCode());
            }
        } catch (Exception e) {
            log.error("Failed to delete object {} from MinIO: {}", objectKey, e.getMessage(), e);
        }
    }

    private synchronized void ensureBucketReady() {
        if (bucketInitialized) {
            return;
        }
        ensureMinioBucketAndPolicy();
        bucketInitialized = true;
    }

    private void ensureMinioBucketAndPolicy() {
        try {
            String headUrl = endpoint + "/" + bucketName;
            HttpRequest headReq = createSignedRequest("HEAD", "/" + bucketName, headUrl, new byte[0], null, null);
            HttpResponse<Void> headResp = httpClient.send(headReq, HttpResponse.BodyHandlers.discarding());

            if (headResp.statusCode() == 404) {
                log.info("MinIO bucket '{}' not found. Creating bucket...", bucketName);
                String putUrl = endpoint + "/" + bucketName;
                HttpRequest putReq = createSignedRequest("PUT", "/" + bucketName, putUrl, new byte[0], null, null);
                HttpResponse<String> putResp = httpClient.send(putReq, HttpResponse.BodyHandlers.ofString());
                if (putResp.statusCode() == 200 || putResp.statusCode() == 201) {
                    log.info("Successfully created MinIO bucket '{}'", bucketName);
                } else {
                    log.warn("MinIO bucket creation returned HTTP {}: {}", putResp.statusCode(), putResp.body());
                }
            }

            // Set bucket policy to allow anonymous public download of news images
            String policyJson = "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"AWS\":[\"*\"]},\"Action\":[\"s3:GetObject\"],\"Resource\":[\"arn:aws:s3:::" + bucketName + "/*\"]}]}";
            String policyUrl = endpoint + "/" + bucketName + "?policy";
            HttpRequest policyReq = createSignedRequest("PUT", "/" + bucketName, policyUrl, policyJson.getBytes(StandardCharsets.UTF_8), "application/json", "policy");
            httpClient.send(policyReq, HttpResponse.BodyHandlers.discarding());
            log.info("MinIO bucket policy verified for '{}'", bucketName);
        } catch (Exception e) {
            log.error("MinIO bucket initialization failed for '{}': {}", bucketName, e.getMessage(), e);
            throw new RuntimeException("Could not connect to or initialize MinIO bucket '" + bucketName + "': " + e.getMessage(), e);
        }
    }

    /**
     * Signs an HTTP request using AWS Signature Version 4.
     */
    private HttpRequest createSignedRequest(
            String method,
            String canonicalUri,
            String fullUrl,
            byte[] payload,
            String contentType,
            String canonicalQuery
    ) throws Exception {
        URI uri = URI.create(fullUrl);
        String host = uri.getHost() + (uri.getPort() > 0 && uri.getPort() != 80 && uri.getPort() != 443 ? ":" + uri.getPort() : "");

        Instant now = Instant.now();
        String amzDate = AMZ_DATE_FORMAT.format(now);
        String dateStamp = DATE_STAMP_FORMAT.format(now);

        byte[] payloadBytes = (payload != null) ? payload : new byte[0];
        String payloadHash = toHex(sha256(payloadBytes));

        Map<String, String> headers = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        headers.put("host", host);
        headers.put("x-amz-date", amzDate);
        headers.put("x-amz-content-sha256", payloadHash);
        if (contentType != null && !contentType.isBlank()) {
            headers.put("content-type", contentType);
        }

        StringBuilder canonicalHeaders = new StringBuilder();
        StringBuilder signedHeaders = new StringBuilder();
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            String lowerKey = entry.getKey().toLowerCase();
            canonicalHeaders.append(lowerKey).append(":").append(entry.getValue().trim()).append("\n");
            if (signedHeaders.length() > 0) signedHeaders.append(";");
            signedHeaders.append(lowerKey);
        }

        String query = (canonicalQuery != null) ? canonicalQuery : (uri.getQuery() != null ? uri.getQuery() : "");

        String canonicalRequest = method + "\n" +
                canonicalUri + "\n" +
                query + "\n" +
                canonicalHeaders + "\n" +
                signedHeaders + "\n" +
                payloadHash;

        String region = "us-east-1";
        String service = "s3";
        String credentialScope = dateStamp + "/" + region + "/" + service + "/aws4_request";
        String stringToSign = "AWS4-HMAC-SHA256\n" +
                amzDate + "\n" +
                credentialScope + "\n" +
                toHex(sha256(canonicalRequest.getBytes(StandardCharsets.UTF_8)));

        byte[] signingKey = getSignatureKey(secretKey, dateStamp, region, service);
        String signature = toHex(hmacSha256(signingKey, stringToSign));

        String authHeader = "AWS4-HMAC-SHA256 Credential=" + accessKey + "/" + credentialScope +
                ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(uri)
                .timeout(Duration.ofSeconds(15))
                .header("x-amz-date", amzDate)
                .header("x-amz-content-sha256", payloadHash)
                .header("Authorization", authHeader);

        if (contentType != null && !contentType.isBlank()) {
            builder.header("Content-Type", contentType);
        }

        if ("PUT".equalsIgnoreCase(method)) {
            builder.PUT(HttpRequest.BodyPublishers.ofByteArray(payloadBytes));
        } else if ("POST".equalsIgnoreCase(method)) {
            builder.POST(HttpRequest.BodyPublishers.ofByteArray(payloadBytes));
        } else if ("DELETE".equalsIgnoreCase(method)) {
            builder.DELETE();
        } else if ("HEAD".equalsIgnoreCase(method)) {
            builder.method("HEAD", HttpRequest.BodyPublishers.noBody());
        } else {
            builder.GET();
        }

        return builder.build();
    }

    private byte[] getSignatureKey(String key, String dateStamp, String regionName, String serviceName) throws Exception {
        byte[] kSecret = ("AWS4" + key).getBytes(StandardCharsets.UTF_8);
        byte[] kDate = hmacSha256(kSecret, dateStamp);
        byte[] kRegion = hmacSha256(kDate, regionName);
        byte[] kService = hmacSha256(kRegion, serviceName);
        return hmacSha256(kService, "aws4_request");
    }

    private byte[] hmacSha256(byte[] key, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }

    private byte[] sha256(byte[] data) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        return digest.digest(data);
    }

    private String toHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf(".") + 1);
    }

    private String sanitizeFilename(String filename) {
        if (filename == null) return "image.jpg";
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    private String extractObjectKey(String urlOrKey) {
        if (urlOrKey == null || urlOrKey.isBlank()) return null;
        if (urlOrKey.contains("/" + bucketName + "/")) {
            return urlOrKey.substring(urlOrKey.indexOf("/" + bucketName + "/") + bucketName.length() + 2);
        }
        if (urlOrKey.startsWith(S3_PREFIX)) {
            return urlOrKey;
        }
        if (urlOrKey.contains("/" + S3_PREFIX)) {
            return S3_PREFIX + urlOrKey.substring(urlOrKey.lastIndexOf("/" + S3_PREFIX) + S3_PREFIX.length() + 1);
        }
        if (urlOrKey.contains("/images/")) {
            return S3_PREFIX + urlOrKey.substring(urlOrKey.lastIndexOf("/images/") + 8);
        }
        if (urlOrKey.startsWith("news/")) {
            return S3_PREFIX + urlOrKey.substring(5);
        }
        return S3_PREFIX + sanitizeFilename(urlOrKey);
    }

    private MediaType determineMediaType(String filename) {
        String ext = getFileExtension(filename).toLowerCase();
        return switch (ext) {
            case "png" -> MediaType.IMAGE_PNG;
            case "gif" -> MediaType.IMAGE_GIF;
            case "webp" -> MediaType.parseMediaType("image/webp");
            case "svg" -> MediaType.parseMediaType("image/svg+xml");
            case "bmp" -> MediaType.parseMediaType("image/bmp");
            default -> MediaType.IMAGE_JPEG;
        };
    }
}
