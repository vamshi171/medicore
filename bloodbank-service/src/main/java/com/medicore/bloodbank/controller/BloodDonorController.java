package com.medicore.bloodbank.controller;

import com.medicore.bloodbank.dto.BloodBankDtos.DonorRequest;
import com.medicore.bloodbank.dto.BloodBankDtos.DonorResponse;
import com.medicore.bloodbank.dto.BloodBankDtos.EligibilityRequest;
import com.medicore.bloodbank.entity.BloodDonor;
import com.medicore.bloodbank.entity.BloodGroup;
import com.medicore.bloodbank.service.BloodDonorService;
import com.medicore.common.dto.ApiResponse;
import com.medicore.common.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * /me routes are self-service for every role (the row is keyed by the caller's
 * own userId). The registry routes are staff-only.
 */
@RestController
@RequestMapping("/api/bloodbank/donors")
public class BloodDonorController {

    private final BloodDonorService donorService;

    public BloodDonorController(BloodDonorService donorService) {
        this.donorService = donorService;
    }

    @PostMapping("/me")
    public ResponseEntity<ApiResponse<DonorResponse>> registerMe(@Valid @RequestBody DonorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Thanks for registering as a blood donor", donorService.registerMe(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<DonorResponse>> getMine() {
        return ResponseEntity.ok(ApiResponse.ok(donorService.getMe()));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<DonorResponse>> updateMine(@Valid @RequestBody DonorRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Donor details updated", donorService.updateMe(request)));
    }

    /** Registry — staff only. */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<DonorResponse>>> list(
            @RequestParam(required = false) BloodGroup bloodGroup,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) BloodDonor.Eligibility eligibility,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                donorService.list(bloodGroup, city, eligibility, page, size)));
    }

    /** Defer or re-activate a donor — staff only. */
    @PatchMapping("/{id}/eligibility")
    public ResponseEntity<ApiResponse<DonorResponse>> setEligibility(@PathVariable Long id,
                                                                    @Valid @RequestBody EligibilityRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Donor eligibility updated",
                donorService.setEligibility(id, request)));
    }
}
