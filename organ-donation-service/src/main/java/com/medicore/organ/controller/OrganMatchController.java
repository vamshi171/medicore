package com.medicore.organ.controller;

import com.medicore.common.dto.ApiResponse;
import com.medicore.common.dto.PageResponse;
import com.medicore.organ.dto.OrganDtos.MatchRequest;
import com.medicore.organ.dto.OrganDtos.MatchResponse;
import com.medicore.organ.dto.OrganDtos.MatchStatusRequest;
import com.medicore.organ.entity.MatchRecord;
import com.medicore.organ.service.MatchService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organs/matches")
public class OrganMatchController {

    private final MatchService matchService;

    public OrganMatchController(MatchService matchService) {
        this.matchService = matchService;
    }

    /** A donor's or recipient's own allocations. */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<List<MatchResponse>>> mine() {
        return ResponseEntity.ok(ApiResponse.ok(matchService.mine()));
    }

    /** Propose an allocation — coordinator/admin only. */
    @PostMapping
    public ResponseEntity<ApiResponse<MatchResponse>> propose(@Valid @RequestBody MatchRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Allocation proposed", matchService.propose(request)));
    }

    /** The whole allocation book — coordinator/admin only. */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<MatchResponse>>> list(
            @RequestParam(required = false) MatchRecord.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(matchService.list(status, page, size)));
    }

    /** Advance an allocation — coordinator/admin only. */
    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<MatchResponse>> setStatus(@PathVariable Long id,
                                                               @Valid @RequestBody MatchStatusRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Allocation " + request.status().name().toLowerCase(),
                matchService.setStatus(id, request)));
    }
}
