package com.medicore.organ.config;

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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Resolves auth-service emails to userIds over the internal API.
 *
 * Two uses: bootstrap seeding, and letting a clinician list a patient by email
 * instead of by an opaque numeric id. Both are read-only lookups confined to
 * the service mesh (X-Internal-Token, /internal/**).
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

    /** @return email -> userId, or an empty map when auth-service is unreachable. */
    public Map<String, Long> usersByEmail() {
        Map<String, Long> result = new LinkedHashMap<>();
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Token", internalToken);
            ResponseEntity<ApiResponse<List<Map<String, Object>>>> resp = restTemplate.exchange(
                    baseUrl + "/internal/users?page=0&size=100",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    new ParameterizedTypeReference<>() {});
            if (resp.getBody() == null || resp.getBody().getData() == null) {
                return result;
            }
            for (Map<String, Object> user : resp.getBody().getData()) {
                Object email = user.get("email");
                Object id = user.get("id");
                if (email instanceof String e && id instanceof Number n) {
                    result.put(e.toLowerCase(Locale.ROOT), n.longValue());
                }
            }
        } catch (RestClientException ex) {
            log.warn("[organ] auth-service unreachable ({}), continuing without identity lookups",
                    ex.getMessage());
        }
        return result;
    }

    public Long findUserIdByEmail(String email) {
        if (email == null) {
            return null;
        }
        return usersByEmail().get(email.toLowerCase(Locale.ROOT));
    }
}
