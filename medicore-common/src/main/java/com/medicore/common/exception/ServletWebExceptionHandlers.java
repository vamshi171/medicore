package com.medicore.common.exception;

import com.medicore.common.dto.ApiResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Servlet-MVC-only exception handlers. Kept apart from
 * {@link GlobalExceptionHandler} because NoResourceFoundException lives in
 * spring-webmvc, which is absent in the WebFlux API gateway — a shared advice
 * referencing it would crash the gateway at startup with a
 * NoClassDefFoundError.
 */
@RestControllerAdvice
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class ServletWebExceptionHandlers {

    /** Unknown paths/typos are a client mistake — 404, not a scary 500. */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error("No such endpoint"));
    }
}
