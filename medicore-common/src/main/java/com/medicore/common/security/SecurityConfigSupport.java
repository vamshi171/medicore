package com.medicore.common.security;

import com.medicore.common.web.RequestIdFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;

/**
 * Shared security wiring every MediCore service inherits by scanning
 * com.medicore.common. Registers:
 *  - JwtAuthenticationFilter: validates the Bearer JWT, populates CurrentUser
 *  - InternalTokenFilter: guards /internal/** service-to-service endpoints
 */
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class SecurityConfigSupport {

    @Bean
    public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(JwtService jwtService) {
        FilterRegistrationBean<JwtAuthenticationFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new JwtAuthenticationFilter(jwtService));
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE + 10);
        registration.setName("medicoreJwtAuthenticationFilter");
        return registration;
    }

    /**
     * Plain @Bean: Spring Boot auto-registers it as a servlet filter;
     * it self-limits to /internal/** via shouldNotFilter.
     */
    @Bean
    public InternalTokenFilter internalTokenFilter(
            @Value("${medicore.internal-token:medicore-internal-dev-token}") String expectedToken) {
        return new InternalTokenFilter(expectedToken);
    }

    /** Runs first so every log line — including auth failures — carries the id. */
    @Bean
    public FilterRegistrationBean<RequestIdFilter> requestIdFilterRegistration() {
        FilterRegistrationBean<RequestIdFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new RequestIdFilter());
        registration.addUrlPatterns("/*");
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        registration.setName("medicoreRequestIdFilter");
        return registration;
    }
}
