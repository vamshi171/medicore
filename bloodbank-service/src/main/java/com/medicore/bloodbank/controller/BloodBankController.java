package com.medicore.bloodbank.controller;

import com.medicore.bloodbank.dto.BloodBankDtos.*;
import com.medicore.bloodbank.entity.BloodComponent;
import com.medicore.bloodbank.entity.BloodDonor;
import com.medicore.bloodbank.entity.BloodGroup;
import com.medicore.bloodbank.entity.BloodRequest;
import com.medicore.bloodbank.service.BloodBankStatsService;
import com.medicore.bloodbank.service.BloodInventoryService;
import com.medicore.common.dto.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;

/**
 * Stock and reference data.
 *
 * The gateway gates every one of these routes by role; the service re-checks
 * them (see BloodBankRoles), so the rules hold even for direct callers.
 */
@RestController
@RequestMapping("/api/bloodbank")
public class BloodBankController {

    private final BloodInventoryService inventoryService;
    private final BloodBankStatsService statsService;

    public BloodBankController(BloodInventoryService inventoryService,
                              BloodBankStatsService statsService) {
        this.inventoryService = inventoryService;
        this.statsService = statsService;
    }

    // ------------------------------------------------- reference data (all roles)

    @GetMapping("/metadata")
    public ResponseEntity<ApiResponse<MetadataResponse>> metadata() {
        return ResponseEntity.ok(ApiResponse.ok(new MetadataResponse(
                Arrays.stream(BloodGroup.values()).map(g -> new Option(g.name(), g.getLabel())).toList(),
                Arrays.stream(BloodComponent.values()).map(c -> new Option(c.name(), c.getLabel())).toList(),
                Arrays.stream(BloodRequest.Urgency.values()).map(u -> new Option(u.name(), titleCase(u.name()))).toList(),
                Arrays.stream(BloodRequest.Status.values()).map(s -> new Option(s.name(), titleCase(s.name()))).toList(),
                Arrays.stream(BloodDonor.Eligibility.values()).map(e -> new Option(e.name(), titleCase(e.name()))).toList())));
    }

    /** Which groups a patient of the given group may safely receive. */
    @GetMapping("/compatibility/{bloodGroup}")
    public ResponseEntity<ApiResponse<CompatibilityResponse>> compatibility(@PathVariable BloodGroup bloodGroup) {
        return ResponseEntity.ok(ApiResponse.ok(new CompatibilityResponse(
                bloodGroup,
                bloodGroup.getLabel(),
                bloodGroup.acceptsFrom().stream().map(g -> new Option(g.name(), g.getLabel())).toList(),
                Arrays.stream(BloodGroup.values())
                        .filter(g -> g.canDonateTo(bloodGroup))
                        .map(g -> new Option(g.name(), g.getLabel()))
                        .toList())));
    }

    // ------------------------------------------------ availability (patient/doctor)

    @GetMapping("/availability")
    public ResponseEntity<ApiResponse<List<AvailabilityResponse>>> availability(
            @RequestParam(required = false) BloodGroup bloodGroup,
            @RequestParam(required = false) BloodComponent component,
            @RequestParam(required = false) String city) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.availability(bloodGroup, component, city)));
    }

    // ------------------------------------------------ full inventory (staff only)

    @GetMapping("/inventory")
    public ResponseEntity<ApiResponse<List<InventoryResponse>>> inventory(
            @RequestParam(required = false) BloodGroup bloodGroup,
            @RequestParam(required = false) BloodComponent component,
            @RequestParam(required = false) String city) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.list(bloodGroup, component, city)));
    }

    @GetMapping("/inventory/expiring")
    public ResponseEntity<ApiResponse<List<InventoryResponse>>> expiring(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.ok(inventoryService.expiringWithin(days)));
    }

    @PostMapping("/inventory")
    public ResponseEntity<ApiResponse<InventoryResponse>> create(@Valid @RequestBody InventoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Stock lot recorded", inventoryService.create(request)));
    }

    @PutMapping("/inventory/{id}")
    public ResponseEntity<ApiResponse<InventoryResponse>> update(@PathVariable Long id,
                                                                @Valid @RequestBody InventoryRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Stock lot updated", inventoryService.update(id, request)));
    }

    @PostMapping("/inventory/{id}/adjust")
    public ResponseEntity<ApiResponse<InventoryResponse>> adjust(@PathVariable Long id,
                                                                @Valid @RequestBody AdjustRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Stock adjusted", inventoryService.adjust(id, request.delta())));
    }

    @DeleteMapping("/inventory/{id}")
    public ResponseEntity<ApiResponse<Void>> discard(@PathVariable Long id) {
        inventoryService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.ok("Stock lot withdrawn from circulation", null));
    }

    // ----------------------------------------------------------------- stats

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<StatsResponse>> stats() {
        return ResponseEntity.ok(ApiResponse.ok(statsService.stats()));
    }

    private static String titleCase(String enumName) {
        String lower = enumName.toLowerCase(java.util.Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
