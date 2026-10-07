package com.medicore.bloodbank.service;

import com.medicore.bloodbank.dto.BloodBankDtos.StatsResponse;
import com.medicore.bloodbank.entity.BloodRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Dashboard aggregates shared by the admin and blood-bank-officer consoles. */
@Service
public class BloodBankStatsService {

    private final BloodInventoryService inventoryService;
    private final BloodRequestService requestService;
    private final BloodDonorService donorService;

    public BloodBankStatsService(BloodInventoryService inventoryService,
                                BloodRequestService requestService,
                                BloodDonorService donorService) {
        this.inventoryService = inventoryService;
        this.requestService = requestService;
        this.donorService = donorService;
    }

    @Transactional(readOnly = true)
    public StatsResponse stats() {
        BloodBankRoles.requireStaff();
        List<com.medicore.bloodbank.entity.BloodInventory> lots = inventoryService.allActive();

        return new StatsResponse(
                inventoryService.usableUnits(),
                lots.size(),
                lots.stream().filter(i -> !i.expired() && i.critical()).count(),
                lots.stream().filter(i -> i.expiringWithin(30)).count(),
                requestService.countByStatus(BloodRequest.Status.REQUESTED),
                requestService.countByStatus(BloodRequest.Status.APPROVED),
                requestService.countByStatus(BloodRequest.Status.FULFILLED),
                requestService.countByStatus(BloodRequest.Status.REJECTED),
                donorService.countActive(),
                donorService.countEligible());
    }
}
