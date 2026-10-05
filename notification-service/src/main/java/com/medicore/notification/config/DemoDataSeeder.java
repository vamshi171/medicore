package com.medicore.notification.config;

import com.medicore.notification.entity.Notification;
import com.medicore.notification.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Demo-data bootstrap for showcases and interviews.
 *
 * Seeds a small welcome notification per demo user so the notifications feed
 * is not empty on first login. Auth userIds are resolved via the internal
 * user list; recipients that cannot be resolved yet are filled in on the
 * next boot. Startup is never fatal.
 *
 * Idempotency: notification-service has no natural key, so we gate on
 * "already has any row for this recipient" rather than duplicating.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final NotificationRepository notificationRepository;
    private final RestLookup lookup = new RestLookup();
    private final String internalToken;
    private final String authServiceUrl;

    public DemoDataSeeder(NotificationRepository notificationRepository,
                          @org.springframework.beans.factory.annotation.Value(
                                  "${INTERNAL_TOKEN:medicore-internal-dev-token}") String internalToken,
                          @org.springframework.beans.factory.annotation.Value(
                                  "${medicore.auth-service-url:http://localhost:9081}") String authServiceUrl) {
        this.notificationRepository = notificationRepository;
        this.internalToken = internalToken;
        this.authServiceUrl = authServiceUrl.endsWith("/")
                ? authServiceUrl.substring(0, authServiceUrl.length() - 1) : authServiceUrl;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (notificationRepository.count() > 0) {
            return; // demo data only for a fresh notifications database
        }
        Map<String, Long> userIds = lookup.userIdsByEmail();
        if (userIds.isEmpty()) {
            log.info("[demo-seed] notification-service: auth-service not ready — seeding next boot");
            return;
        }

        Map<String, String> welcome = new LinkedHashMap<>() {{
            put("arjun@medicore.com",   "Welcome to MediCore! Your patient profile is ready — find a doctor and book your first appointment.");
            put("priya@medicore.com",   "Welcome to MediCore! Upcoming checkups appear here after you book an appointment.");
            put("rahul@medicore.com",   "Welcome to MediCore! Manage diabetes better — book a cardiology consult today.");
            put("dr.sharma@medicore.com", "Welcome to MediCore! Your cardiology profile is live — you can receive bookings now.");
            put("dr.mehta@medicore.com",  "Welcome to MediCore! Your dermatology profile is live — you can receive bookings now.");
            put("dr.reddy@medicore.com",  "Welcome to MediCore! Your pediatrics profile is live — you can receive bookings now.");
        }};

        LocalDateTime now = LocalDateTime.now().minusMinutes(5);
        int created = 0;
        for (var entry : welcome.entrySet()) {
            Long userId = userIds.get(entry.getKey());
            if (userId == null || notificationRepository.existsByRecipientUserId(userId)) {
                continue;
            }
            Notification n = new Notification();
            n.setRecipientUserId(userId);
            n.setType("WELCOME");
            n.setMessage(entry.getValue());
            n.setStatus(Notification.Status.SENT);
            n.setSentAt(now);
            notificationRepository.save(n);
            created++;
        }
        if (created > 0) {
            log.info("[demo-seed] notification-service: created {} welcome notifications", created);
        }
    }

    /** Minimal auth list-walk (mirrors the other services' seeders). */
    private class RestLookup {
        private final org.springframework.web.client.RestTemplate restTemplate =
                new org.springframework.web.client.RestTemplate();

        Map<String, Long> userIdsByEmail() {
            Map<String, Long> result = new LinkedHashMap<>();
            try {
                org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
                headers.set("X-Internal-Token", internalToken);
                org.springframework.core.ParameterizedTypeReference<java.util.Map<String, Object>> type =
                        new org.springframework.core.ParameterizedTypeReference<>() {};
                ResponseEntity<java.util.Map<String, Object>> resp = restTemplate.exchange(
                        authServiceUrl + "/internal/users?page=0&size=100",
                        org.springframework.http.HttpMethod.GET,
                        new org.springframework.http.HttpEntity<>(headers), type);
                Object data = resp.getBody() == null ? null : resp.getBody().get("data");
                if (data instanceof java.util.List<?> list) {
                    for (Object o : list) {
                        if (o instanceof java.util.Map<?, ?> u
                                && u.get("email") instanceof String e
                                && u.get("id") instanceof Number n) {
                            result.put(e.toLowerCase(), n.longValue());
                        }
                    }
                }
            } catch (Exception ex) {
                log.info("[demo-seed] notification-service: auth-service unreachable ({})", ex.getMessage());
            }
            return result;
        }
    }
}
