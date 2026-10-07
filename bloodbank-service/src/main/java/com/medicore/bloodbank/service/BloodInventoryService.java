package com.medicore.bloodbank.service;

import com.medicore.bloodbank.dto.BloodBankDtos.AvailabilityResponse;
import com.medicore.bloodbank.dto.BloodBankDtos.InventoryRequest;
import com.medicore.bloodbank.dto.BloodBankDtos.InventoryResponse;
import com.medicore.bloodbank.entity.BloodComponent;
import com.medicore.bloodbank.entity.BloodGroup;
import com.medicore.bloodbank.entity.BloodInventory;
import com.medicore.bloodbank.repository.BloodInventoryRepository;
import com.medicore.common.exception.BadRequestException;
import com.medicore.common.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Stock-level use cases. Every write path is staff-only; the read paths differ
 * deliberately (full lot detail for staff, availability only for patients and
 * doctors) so the same service backs two very different access rules.
 */
@Service
public class BloodInventoryService {

    private static final int EXPIRY_WARNING_DAYS = 30;

    private final BloodInventoryRepository inventoryRepository;

    public BloodInventoryService(BloodInventoryRepository inventoryRepository) {
        this.inventoryRepository = inventoryRepository;
    }

    // ------------------------------------------------------------- staff reads

    @Transactional(readOnly = true)
    public List<InventoryResponse> list(BloodGroup bloodGroup, BloodComponent component, String city) {
        BloodBankRoles.requireStaff();
        return searchInternal(bloodGroup, component, city).stream()
                .map(InventoryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InventoryResponse> expiringWithin(int days) {
        BloodBankRoles.requireStaff();
        int window = Math.max(1, Math.min(days, 365));
        return inventoryRepository
                .findByActiveTrueAndExpiryDateBeforeOrderByExpiryDateAsc(LocalDate.now().plusDays(window))
                .stream()
                .map(InventoryResponse::from)
                .toList();
    }

    // ------------------------------------------------------- everyone reads this

    /**
     * Availability search for patients and doctors: enough to answer "can my
     * patient get 2 units of O- today, and where", without exposing centre
     * thresholds or per-lot history.
     */
    @Transactional(readOnly = true)
    public List<AvailabilityResponse> availability(BloodGroup bloodGroup, BloodComponent component, String city) {
        return searchInternal(bloodGroup, component, city).stream()
                .filter(i -> i.availableUnits() > 0)
                .map(AvailabilityResponse::from)
                .toList();
    }

    // ----------------------------------------------------------------- writes

    @Transactional
    public InventoryResponse create(InventoryRequest request) {
        BloodBankRoles.requireStaff();
        if (request.expiryDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("expiryDate cannot be in the past");
        }
        if (request.unitsReserved() > request.unitsAvailable()) {
            throw new BadRequestException("unitsReserved cannot exceed unitsAvailable");
        }
        if (inventoryRepository.existsByCenterNameAndBloodGroupAndComponentAndExpiryDate(
                request.centerName(), request.bloodGroup(), request.component(), request.expiryDate())) {
            throw new BadRequestException(
                    "A lot for this centre, group, component and expiry date already exists — adjust it instead");
        }

        BloodInventory lot = new BloodInventory();
        apply(lot, request);
        return InventoryResponse.from(inventoryRepository.save(lot));
    }

    @Transactional
    public InventoryResponse update(Long id, InventoryRequest request) {
        BloodBankRoles.requireStaff();
        BloodInventory lot = requireLot(id);
        if (request.unitsReserved() > request.unitsAvailable()) {
            throw new BadRequestException("unitsReserved cannot exceed unitsAvailable");
        }
        apply(lot, request);
        return InventoryResponse.from(lot);
    }

    /**
     * Add or remove units. A negative delta is an issue/discard; it can never
     * consume units that an approved request has already reserved.
     */
    @Transactional
    public InventoryResponse adjust(Long id, int delta) {
        BloodBankRoles.requireStaff();
        BloodInventory lot = requireLot(id);
        int updated = lot.getUnitsAvailable() + delta;
        if (updated < 0) {
            throw new BadRequestException("Adjustment would make unitsAvailable negative");
        }
        if (updated < lot.getUnitsReserved()) {
            throw new BadRequestException(
                    "Adjustment would leave fewer units than the " + lot.getUnitsReserved() + " already reserved");
        }
        lot.setUnitsAvailable(updated);
        return InventoryResponse.from(lot);
    }

    /** Soft delete: the lot stops being usable but stays for the audit trail. */
    @Transactional
    public void deactivate(Long id) {
        BloodBankRoles.requireStaff();
        BloodInventory lot = requireLot(id);
        lot.setActive(false);
        lot.setNotes("Discarded / withdrawn from circulation");
    }

    // ----------------------------------------------------------------- helpers

    /** Package-private so BloodRequestService can drive the FIFO issue in-tx. */
    List<BloodInventory> issueCandidates(BloodGroup bloodGroup, BloodComponent component) {
        return inventoryRepository.findIssueCandidates(bloodGroup, component, LocalDate.now());
    }

    long usableUnits() {
        return inventoryRepository.sumUsableUnits(LocalDate.now());
    }

    List<BloodInventory> allActive() {
        return inventoryRepository.findByActiveTrue();
    }

    private List<BloodInventory> searchInternal(BloodGroup bloodGroup, BloodComponent component, String city) {
        String normalizedCity = (city == null || city.isBlank()) ? null : city.trim().toLowerCase(Locale.ROOT);
        return inventoryRepository.search(bloodGroup, component, normalizedCity, LocalDate.now());
    }

    private BloodInventory requireLot(Long id) {
        Optional<BloodInventory> lot = inventoryRepository.findByIdAndActiveTrue(id);
        return lot.orElseThrow(() -> new ResourceNotFoundException("Blood inventory lot", id));
    }

    private void apply(BloodInventory lot, InventoryRequest r) {
        lot.setCenterName(r.centerName().trim());
        lot.setCity(r.city().trim());
        lot.setBloodGroup(r.bloodGroup());
        lot.setComponent(r.component());
        lot.setUnitsAvailable(r.unitsAvailable());
        lot.setUnitsReserved(r.unitsReserved());
        lot.setCriticalThreshold(r.criticalThreshold());
        lot.setExpiryDate(r.expiryDate());
        lot.setNotes(r.notes());
    }

    static int expiryWarningDays() {
        return EXPIRY_WARNING_DAYS;
    }
}
