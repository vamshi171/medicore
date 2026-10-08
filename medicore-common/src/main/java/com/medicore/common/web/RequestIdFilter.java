package com.medicore.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Correlation id for every request: honours an incoming X-Request-Id
 * (minted by the API gateway) or generates one, exposes it to logs via MDC
 * ("requestId") and echoes it on the response so a caller can quote it in
 * bug reports. Pairs with the logback pattern shipped in this module and
 * with FeignConfig, which forwards the header on every downstream call.
 */
public class RequestIdFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Request-Id";
    public static final String MDC_KEY = "requestId";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String incoming = request.getHeader(HEADER);
        String requestId = (incoming == null || incoming.isBlank() || incoming.length() > 64)
                ? UUID.randomUUID().toString()
                : incoming;
        MDC.put(MDC_KEY, requestId);
        response.setHeader(HEADER, requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_KEY);
        }
    }
}
