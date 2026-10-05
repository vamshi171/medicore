package com.medicore.auth.controller;

import com.medicore.auth.dto.AuthDtos.UserResponse;
import com.medicore.auth.service.AuthService;
import com.medicore.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Service-to-service endpoints (secured by InternalTokenFilter on /internal/**).
 * Kept separate from AuthController so Spring Security's permitAll rules stay simple.
 */
@RestController
public class AuthInternalController {

    private final AuthService authService;

    public AuthInternalController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/internal/users/{userId}")
    public ResponseEntity<ApiResponse<UserResponse>> internalStatus(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(authService.internalStatus(userId)));
    }

    /**
     * Flat user list for internal bootstrap consumers (demo-data seeders walk
     * it to resolve email -> userId). Plain list (not Page) keeps consumers
     * simple; capped size prevents unbounded pulls.
     */
    @GetMapping("/internal/users")
    public ResponseEntity<ApiResponse<List<UserResponse>>> internalList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        int capped = Math.min(Math.max(size, 1), 200);
        return ResponseEntity.ok(ApiResponse.ok(
                authService.listUsers(null, Math.max(page, 0), capped).getContent()));
    }
}
