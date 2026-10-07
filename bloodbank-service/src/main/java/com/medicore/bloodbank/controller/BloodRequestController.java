package com.medicore.bloodbank.controller;

import com.medicore.bloodbank.dto.BloodBankDtos.DecisionRequest;
import com.medicore.bloodbank.dto.BloodBankDtos.RequestCreateRequest;
import com.medicore.bloodbank.dto.BloodBankDtos.RequestResponse;
import com.medicore.bloodbank.entity.BloodRequest;
import com.medicore.bloodbank.service.BloodRequestService;
import com.medicore.common.dto.ApiResponse;
import com.medicore.common.dto.PageResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Ordering matters in the gateway config (literal /mine before /**), and here
 * the difference between /mine and the board is enforced by the service.
 */
@RestController
@RequestMapping("/api/bloodbank/requests")
public class BloodRequestController {

    private final BloodRequestService requestService;

    public BloodRequestController(BloodRequestService requestService) {
        this.requestService = requestService;
    }

    /** Any clinical role may raise a request (patients for themselves, doctors on a patient's behalf). */
    @PostMapping
    public ResponseEntity<ApiResponse<RequestResponse>> raise(@Valid @RequestBody RequestCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Blood request submitted", requestService.raise(request)));
    }

    /** The caller's own requests — the only list patients and doctors can see. */
    @GetMapping("/mine")
    public ResponseEntity<ApiResponse<PageResponse<RequestResponse>>> mine(
            @RequestParam(required = false) BloodRequest.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.mine(status, page, size)));
    }

    /** The whole board — staff only. */
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<RequestResponse>>> all(
            @RequestParam(required = false) BloodRequest.Status status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.all(status, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RequestResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(requestService.getById(id)));
    }

    /** Staff decision — approval, rejection, or fulfilment (which issues stock FIFO). */
    @PostMapping("/{id}/decision")
    public ResponseEntity<ApiResponse<RequestResponse>> decide(@PathVariable Long id,
                                                              @Valid @RequestBody DecisionRequest decision) {
        return ResponseEntity.ok(ApiResponse.ok("Request " + decision.status().name().toLowerCase(), 
                requestService.decide(id, decision)));
    }

    /** The requester may withdraw their own still-open request. */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<RequestResponse>> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Request cancelled", requestService.cancel(id)));
    }
}
