package com.medicore.organ.controller;

import com.medicore.common.dto.ApiResponse;
import com.medicore.common.dto.PageResponse;
import com.medicore.organ.config.AuthUserLookup;
import com.medicore.organ.dto.OrganDtos.CandidateResponse;
import com.medicore.organ.dto.OrganDtos.WaitlistRequest;
import com.medicore.organ.dto.OrganDtos.WaitlistResponse;
import com.medicore.organ.dto.OrganDtos.WaitlistStatusRequest;
import com.medicore.organ.entity.OrganType;
import com.medicore.organ.entity.WaitlistEntry;
import com.medicore.organ.service.WaitlistService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organs/waitlist")
public class OrganWaitlistController {

    private final WaitlistService waitlistService;
    private final AuthUserLookup authUserLookup;

    public OrganWaitlistController(WaitlistService waitlistService, AuthUserLookup authUserLookup) {
        this.waitlistService = waitlistService;
        this.authUserLookup = authUserLookup;
    }

    /** A patient's own waiting-list entries. */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<WaitlistResponse>>> mine() {
        return ResponseEntity.ok(ApiResponse.ok(waitlistService.mine()));
    }

    /** Clinical staff list a patient (by userId, or conveniently, by email). */
    @PostMapping
    public ResponseEntity<ApiResponse<WaitlistResponse>> add(@Valid @RequestBody WaitlistRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Patient added to the transplant waitlist",
                        waitlistService.add(request, authUserLookup)));
    }

    /** Whole list, urgency first — clinical staff. */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<WaitlistResponse>>> list(
            @RequestParam(required = false) WaitlistEntry.Status status,
            @RequestParam(required = false) OrganType organNeeded,
            @RequestParam(required = false) String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                waitlistService.list(status, organNeeded, city, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WaitlistResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(waitlistService.getById(id)));
    }

    /** Allocation decision — coordinator/admin only. */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<WaitlistResponse>> setStatus(@PathVariable Long id,
                                                                  @Valid @RequestBody WaitlistStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Waitlist entry " + request.status().name().toLowerCase(),
                waitlistService.setStatus(id, request)));
    }

    /**
     * Ranked compatible donors for this patient. The headline operation of the
     * domain, and coordinator/admin only because it exposes donor identities.
     */
    @GetMapping("/{id}/candidates")
    public ResponseEntity<ApiResponse<List<CandidateResponse>>> candidates(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(waitlistService.candidates(id)));
    }
}
