package com.medicore.appointment.feign;

import com.medicore.common.exception.ResourceNotFoundException;
import com.medicore.common.security.CurrentUser;
import com.medicore.common.security.InternalTokenFilter;
import com.medicore.common.web.RequestIdFilter;
import feign.RequestInterceptor;
import feign.codec.ErrorDecoder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Propagates identity + the shared internal token on every Feign call so
 * downstream /internal/** endpoints accept service-to-service traffic.
 */
public class FeignConfig {

    @Bean
    public RequestInterceptor internalTokenInterceptor() {
        return template -> {
            template.header(InternalTokenFilter.HEADER, medicoreInternalToken());
            // Keep the correlation id flowing across service hops.
            String requestId = org.slf4j.MDC.get(RequestIdFilter.MDC_KEY);
            if (requestId != null) {
                template.header(RequestIdFilter.HEADER, requestId);
            }
            com.medicore.common.security.UserPrincipal principal = CurrentUser.get();
            if (principal != null) {
                template.header("X-User-Id", String.valueOf(principal.userId()));
                template.header("X-User-Email", principal.email());
                template.header("X-User-Role", principal.role());
            }
        };
    }

    private String medicoreInternalToken() {
        return System.getenv().getOrDefault("INTERNAL_TOKEN", "medicore-internal-dev-token");
    }

    /**
     * A 404 from a downstream service means the referenced profile simply does
     * not exist yet (e.g. a freshly registered user who has not created their
     * patient/doctor profile). That is expected user state, not an outage, so
     * it must surface as a business 404 instead of tripping the circuit
     * breaker and degrading to a misleading 503.
     */
    @Bean
    public ErrorDecoder businessErrorDecoder() {
        return (methodKey, response) -> {
            if (response.status() == 404) {
                return new ResourceNotFoundException(
                        "The referenced profile does not exist yet (" + methodKey + ")");
            }
            return new ErrorDecoder.Default().decode(methodKey, response);
        };
    }
}
