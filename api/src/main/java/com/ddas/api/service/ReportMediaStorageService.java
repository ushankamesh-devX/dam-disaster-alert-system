package com.ddas.api.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
public class ReportMediaStorageService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "video/mp4"
    );

    private static final long MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

    private final String minioEndpoint;
    private final String accessKey;
    private final String secretKey;
    private final String bucketName;
    private final HttpClient httpClient;

    public ReportMediaStorageService(
            @Value("${minio.endpoint:http://localhost:9000}") String minioEndpoint,
            @Value("${minio.access-key:minioadmin}") String accessKey,
            @Value("${minio.secret-key:minioadmin}") String secretKey,
            @Value("${minio.bucket-name:ddas-artifacts}") String bucketName) {
        this.minioEndpoint = minioEndpoint.endsWith("/") ? minioEndpoint.substring(0, minioEndpoint.length() - 1) : minioEndpoint;
        this.accessKey = accessKey;
        this.secretKey = secretKey;
        this.bucketName = bucketName;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public record MediaUploadResult(String fileName, String relativeUrl, String contentType, long size) {}

    public MediaUploadResult uploadMedia(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum allowed limit of 15MB");
        }

        String rawContentType = file.getContentType();
        String contentType = rawContentType != null ? rawContentType.toLowerCase() : "application/octet-stream";
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Unsupported file type: " + contentType + ". Allowed: jpeg, png, webp, mp4");
        }

        String originalFilename = file.getOriginalFilename();
        String sanitizedFilename = sanitizeFilename(originalFilename);
        String uniqueFileName = UUID.randomUUID() + "_" + sanitizedFilename;
        String objectName = "report-media/" + uniqueFileName;

        try {
            ensureBucketExists();
            byte[] bytes = file.getBytes();
            putObject(objectName, bytes, contentType);
            String relativeUrl = "/api/v1/reports/media/" + uniqueFileName;
            log.info("Successfully uploaded report media to MinIO bucket '{}', object: '{}'", bucketName, objectName);
            return new MediaUploadResult(uniqueFileName, relativeUrl, contentType, file.getSize());
        } catch (Exception e) {
            log.error("Failed to upload report media '{}' to MinIO: {}", uniqueFileName, e.getMessage(), e);
            throw new RuntimeException("MinIO upload failed: " + e.getMessage(), e);
        }
    }

    public byte[] downloadMedia(String fileName) {
        String objectName = "report-media/" + fileName;
        try {
            return getObject(objectName);
        } catch (Exception e) {
            log.error("Failed to download report media '{}' from MinIO: {}", objectName, e.getMessage(), e);
            throw new RuntimeException("Could not read media from storage: " + e.getMessage(), e);
        }
    }

    public String probeContentType(String fileName) {
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".mp4")) return "video/mp4";
        return "application/octet-stream";
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "media.bin";
        }
        String clean = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        return clean.length() > 100 ? clean.substring(clean.length() - 100) : clean;
    }

    // =========================================================================
    // S3 REST API & AWS Signature Version 4
    // =========================================================================

    private void ensureBucketExists() {
        try {
            String path = "/" + bucketName;
            HttpRequest headReq = buildS3Request("HEAD", path, null, "application/octet-stream");
            HttpResponse<Void> headResp = httpClient.send(headReq, HttpResponse.BodyHandlers.discarding());
            if (headResp.statusCode() == 404) {
                log.info("MinIO bucket '{}' does not exist. Creating bucket...", bucketName);
                HttpRequest putReq = buildS3Request("PUT", path, new byte[0], "application/octet-stream");
                HttpResponse<String> putResp = httpClient.send(putReq, HttpResponse.BodyHandlers.ofString());
                if (putResp.statusCode() >= 300 && putResp.statusCode() != 409) {
                    throw new IOException("Failed to create bucket '" + bucketName + "', status: " + putResp.statusCode() + ", body: " + putResp.body());
                }
            }
        } catch (Exception e) {
            log.warn("Notice checking/creating bucket '{}': {}", bucketName, e.getMessage());
        }
    }

    private void putObject(String objectName, byte[] data, String contentType) throws Exception {
        String path = "/" + bucketName + "/" + objectName;
        HttpRequest request = buildS3Request("PUT", path, data, contentType);
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 300) {
            throw new IOException("MinIO PUT returned status " + response.statusCode() + ": " + response.body());
        }
    }

    private byte[] getObject(String objectName) throws Exception {
        String path = "/" + bucketName + "/" + objectName;
        HttpRequest request = buildS3Request("GET", path, null, "application/octet-stream");
        HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
        if (response.statusCode() == 404) {
            throw new IOException("Object not found in MinIO: " + objectName);
        }
        if (response.statusCode() >= 300) {
            throw new IOException("MinIO GET returned status " + response.statusCode());
        }
        return response.body();
    }

    private HttpRequest buildS3Request(String method, String canonicalUri, byte[] payload, String contentType) throws Exception {
        URI endpointUri = URI.create(minioEndpoint);
        String host = endpointUri.getHost();
        if (endpointUri.getPort() != -1 && endpointUri.getPort() != 80 && endpointUri.getPort() != 443) {
            host = host + ":" + endpointUri.getPort();
        }

        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        String amzDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'"));
        String dateStamp = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        byte[] body = payload != null ? payload : new byte[0];
        String payloadHash = toHex(sha256(body));

        Map<String, String> headers = new TreeMap<>();
        headers.put("host", host);
        headers.put("x-amz-content-sha256", payloadHash);
        headers.put("x-amz-date", amzDate);
        if (payload != null && payload.length > 0) {
            headers.put("content-type", contentType);
        }

        StringBuilder canonicalHeaders = new StringBuilder();
        StringBuilder signedHeaders = new StringBuilder();
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            canonicalHeaders.append(entry.getKey().toLowerCase()).append(":").append(entry.getValue().trim()).append("\n");
            if (signedHeaders.length() > 0) signedHeaders.append(";");
            signedHeaders.append(entry.getKey().toLowerCase());
        }

        String canonicalRequest = method + "\n"
                + canonicalUri + "\n"
                + "" + "\n" // canonical query string
                + canonicalHeaders
                + "\n"
                + signedHeaders
                + "\n"
                + payloadHash;

        String region = "us-east-1";
        String service = "s3";
        String credentialScope = dateStamp + "/" + region + "/" + service + "/aws4_request";
        String stringToSign = "AWS4-HMAC-SHA256\n"
                + amzDate + "\n"
                + credentialScope + "\n"
                + toHex(sha256(canonicalRequest.getBytes(StandardCharsets.UTF_8)));

        byte[] signingKey = getSignatureKey(secretKey, dateStamp, region, service);
        String signature = toHex(hmacSha256(stringToSign.getBytes(StandardCharsets.UTF_8), signingKey));

        String authorizationHeader = "AWS4-HMAC-SHA256 Credential=" + accessKey + "/" + credentialScope
                + ", SignedHeaders=" + signedHeaders
                + ", Signature=" + signature;

        URI requestUri = URI.create(minioEndpoint + canonicalUri);
        HttpRequest.Builder builder = HttpRequest.newBuilder(requestUri)
                .header("Host", host)
                .header("x-amz-date", amzDate)
                .header("x-amz-content-sha256", payloadHash)
                .header("Authorization", authorizationHeader);

        if (payload != null && payload.length > 0) {
            builder.header("Content-Type", contentType);
            builder.method(method, HttpRequest.BodyPublishers.ofByteArray(payload));
        } else if ("PUT".equalsIgnoreCase(method)) {
            builder.method("PUT", HttpRequest.BodyPublishers.noBody());
        } else if ("HEAD".equalsIgnoreCase(method)) {
            builder.method("HEAD", HttpRequest.BodyPublishers.noBody());
        } else {
            builder.GET();
        }

        return builder.build();
    }

    private byte[] getSignatureKey(String key, String dateStamp, String regionName, String serviceName) throws Exception {
        byte[] kSecret = ("AWS4" + key).getBytes(StandardCharsets.UTF_8);
        byte[] kDate = hmacSha256(dateStamp.getBytes(StandardCharsets.UTF_8), kSecret);
        byte[] kRegion = hmacSha256(regionName.getBytes(StandardCharsets.UTF_8), kDate);
        byte[] kService = hmacSha256(serviceName.getBytes(StandardCharsets.UTF_8), kRegion);
        return hmacSha256("aws4_request".getBytes(StandardCharsets.UTF_8), kService);
    }

    private byte[] hmacSha256(byte[] data, byte[] key) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private byte[] sha256(byte[] data) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        return md.digest(data);
    }

    private String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}

