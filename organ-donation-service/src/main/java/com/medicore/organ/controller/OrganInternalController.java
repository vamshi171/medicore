package com.medicore.organ.controller;

import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.repository.OrganDonorRepository;
import com.medicore.common.dto.ApiResponse;
import com.medicore.common.exception.ResourceNotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Service-to-service endpoint, guarded by InternalTokenFilter (/internal/**)
 * and reached over Eureka rather than through the gateway. Returns a small
 * summary rather than the full pledge so internal callers cannot leak donor
 * details by accident.
 */
@RestController
public class OrganInternalController {

    private final OrganDonorRepository donorRepository;

    public OrganInternalController(OrganDonorRepository donorRepository) {
        this.donorRepository = donorRepository;
    }

    @GetMapping("/internal/pledges/by-user/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> internalPledgeByUser(@PathVariable Long userId) {
        OrganDonor donor = donorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Donor pledge for user", userId));
        return ResponseEntity.ok(ApiResponse.ok(Map.of(
                "donorId", donor.getId(),
                "userId", donor.getUserId(),
                "status", donor.getStatus().name(),
                "committed", donor.committed(),
                "organs", donor.getOrgans().stream().sorted().map(Enum::name).toList())));
    }
}
