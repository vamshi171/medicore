package com.medicore.bloodbank.controller;

import com.medicore.bloodbank.dto.BloodBankDtos.DonorResponse;
import com.medicore.bloodbank.service.BloodDonorService;
import com.medicore.common.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/**
 * Service-to-service endpoints. Guarded by the shared InternalTokenFilter
 * (/internal/**), reached over Eureka rather than through the gateway.
 */
@RestController
public class BloodBankInternalController {

    private final BloodDonorService donorService;

    public BloodBankInternalController(BloodDonorService donorService) {
        this.donorService = donorService;
    }

    @GetMapping("/internal/donors/by-user/{userId}")
    public ResponseEntity<ApiResponse<DonorResponse>> internalDonorByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(ApiResponse.ok(donorService.internalByUserId(userId)));
    }
}
