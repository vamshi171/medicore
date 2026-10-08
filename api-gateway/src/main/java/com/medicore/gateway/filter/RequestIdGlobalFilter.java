package com.medicore.gateway.filter;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.UUID;

/**
 * Mints (or propagates) an X-Request-Id for every client request so one
 * call can be traced across gateway -> service -> Feign hops. Servlet
 * services pick the header up via com.medicore.common.web.RequestIdFilter
 * and their Feign calls forward it downstream.
 */
@Component
public class RequestIdGlobalFilter implements GlobalFilter, Ordered {

    public static final String HEADER = "X-Request-Id";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String incoming = exchange.getRequest().getHeaders().getFirst(HEADER);
        String requestId = (incoming == null || incoming.isBlank() || incoming.length() > 64)
                ? UUID.randomUUID().toString()
                : incoming;
        ServerWebExchange mutated = exchange.mutate()
                .request(r -> r.headers(h -> h.set(HEADER, requestId)))
                .build();
        mutated.getResponse().getHeaders().set(HEADER, requestId);
        return chain.filter(mutated);
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
