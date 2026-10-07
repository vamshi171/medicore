package com.medicore.organ.controller;

import com.medicore.common.dto.ApiResponse;
import com.medicore.common.dto.PageResponse;
import com.medicore.organ.dto.OrganDtos.PledgeRequest;
import com.medicore.organ.dto.OrganDtos.PledgeResponse;
import com.medicore.organ.dto.OrganDtos.VerifyRequest;
import com.medicore.organ.entity.BloodGroup;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.service.OrganPledgeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * /me routes are self-service for ADMIN, DOCTOR and PATIENT. The registry and
 * verification routes are coordinator/admin only (gateway + service both check).
 */
@RestController
@RequestMapping("/api/organs/pledges")
public class OrganPledgeController {

    private final OrganPledgeService pledgeService;

    public OrganPledgeController(OrganPledgeService pledgeService) {
        this.pledgeService = pledgeService;
    }

    @PostMapping("/me")
    public ResponseEntity<ApiResponse<PledgeResponse>> pledgeMine(@Valid @RequestBody PledgeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Thank you — your donor pledge has been recorded", pledgeService.pledge(request)));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<PledgeResponse>> getMine() {
        return ResponseEntity.ok(ApiResponse.ok(pledgeService.getMine()));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<PledgeResponse>> updateMine(@Valid @RequestBody PledgeRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Pledge updated", pledgeService.updateMine(request)));
    }

    /** Withdraw consent — the pledge stops being usable for allocation. */
    @PatchMapping("/me/revoke")
    public ResponseEntity<ApiResponse<PledgeResponse>> revokeMine() {
        return ResponseEntity.ok(ApiResponse.ok("Consent withdrawn", pledgeService.revokeMine()));
    }

    /** Full registry — coordinator/admin only. */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<PledgeResponse>>> list(
            @RequestParam(required = false) OrganDonor.Status status,
            @RequestParam(required = false) BloodGroup bloodGroup,
            @RequestParam(required = false) String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(pledgeService.list(status, bloodGroup, city, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PledgeResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(pledgeService.getById(id)));
    }

    /** Verify a pledge — coordinator/admin only. */
    @PatchMapping("/{id}/verify")
    public ResponseEntity<ApiResponse<PledgeResponse>> verify(@PathVariable Long id,
                                                             @Valid @RequestBody VerifyRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Pledge " + request.status().name().toLowerCase(),
                pledgeService.verify(id, request)));
    }
}
