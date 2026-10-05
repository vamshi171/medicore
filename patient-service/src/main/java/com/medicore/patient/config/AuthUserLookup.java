package com.medicore.patient.config;

import com.medicore.common.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Tiny internal client: resolves an auth-service userId for an email.
 * Used at bootstrap by DemoDataSeeder. Failures are non-fatal — the next
 * boot completes the seeding.
 */
@Component
public class AuthUserLookup {

    private static final Logger log = LoggerFactory.getLogger(AuthUserLookup.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final String baseUrl;
    private final String internalToken;

    public AuthUserLookup(@Value("${medicore.auth-service-url:http://localhost:9081}") String baseUrl,
                          @Value("${INTERNAL_TOKEN:medicore-internal-dev-token}") String internalToken) {
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.internalToken = internalToken;
    }

    /**
     * @return the auth userId for the given email, or null if auth-service is
     *         unreachable / the user does not exist yet.
     */
    public Long findUserIdByEmail(String email) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Token", internalToken);
            ResponseEntity<ApiResponse<java.util.List<Map<String, Object>>>> resp = restTemplate.exchange(
                    baseUrl + "/internal/users?page=0&size=100",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    new ParameterizedTypeReference<>() {});

            if (resp.getBody() == null || resp.getBody().getData() == null) {
                return null;
            }
            return resp.getBody().getData().stream()
                    .filter(u -> email.equalsIgnoreCase(String.valueOf(u.get("email"))))
                    .map(u -> ((Number) u.get("id")).longValue())
                    .findFirst()
                    .orElse(null);
        } catch (RestClientException ex) {
            log.warn("[demo-seed] auth-service unreachable ({}), will retry next boot", ex.getMessage());
            return null;
        }
    }
}
