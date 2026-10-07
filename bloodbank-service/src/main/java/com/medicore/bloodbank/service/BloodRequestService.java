package com.medicore.bloodbank.service;

import com.medicore.bloodbank.dto.BloodBankDtos.DecisionRequest;
import com.medicore.bloodbank.dto.BloodBankDtos.RequestCreateRequest;
import com.medicore.bloodbank.dto.BloodBankDtos.RequestResponse;
import com.medicore.bloodbank.entity.BloodInventory;
import com.medicore.bloodbank.entity.BloodRequest;
import com.medicore.bloodbank.repository.BloodRequestRepository;
import com.medicore.common.dto.PageResponse;
import com.medicore.common.exception.AccessDeniedException;
import com.medicore.common.exception.BadRequestException;
import com.medicore.common.exception.ResourceNotFoundException;
import com.medicore.common.security.CurrentUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * The transfusion request lifecycle.
 *
 * Access rules implemented here (and unreachable from any other role):
 *  - a requester sees only their own requests ({@code /requests/mine});
 *  - only ADMIN / BLOOD_BANK_OFFICER may read the whole board or decide;
 *  - fulfilment draws stock FIFO by expiry date and fails atomically if the
 *    bank cannot cover the full quantity — no partial, silent under-supply.
 */
@Service
public class BloodRequestService {

    private final BloodRequestRepository requestRepository;
    private final BloodInventoryService inventoryService;

    public BloodRequestService(BloodRequestRepository requestRepository,
                              BloodInventoryService inventoryService) {
        this.requestRepository = requestRepository;
        this.inventoryService = inventoryService;
    }

    @Transactional
    public RequestResponse raise(RequestCreateRequest request) {
        Long userId = BloodBankRoles.requireUserId();

        BloodRequest entity = new BloodRequest();
        entity.setRequesterUserId(userId);
        entity.setRequesterName(CurrentUser.get().email());
        entity.setRequesterRole(BloodBankRoles.requireRole());
        entity.setPatientName(request.patientName().trim());
        entity.setBloodGroup(request.bloodGroup());
        entity.setComponent(request.component());
        entity.setUnitsNeeded(request.unitsNeeded());
        entity.setUrgency(request.urgency());
        entity.setHospital(request.hospital().trim());
        entity.setCity(request.city().trim());
        entity.setReason(request.reason());
        entity.setStatus(BloodRequest.Status.REQUESTED);
        return RequestResponse.from(requestRepository.save(entity));
    }

    /** A requester's own history — the only request list patients and doctors get. */
    @Transactional(readOnly = true)
    public PageResponse<RequestResponse> mine(BloodRequest.Status status, int page, int size) {
        Long userId = BloodBankRoles.requireUserId();
        Pageable pageable = PageRequest.of(Math.max(page, 0), clamp(size));
        Page<BloodRequest> result = requestRepository.searchMine(userId, status, pageable);
        return toPage(result);
    }

    /** The full request board — staff only. */
    @Transactional(readOnly = true)
    public PageResponse<RequestResponse> all(BloodRequest.Status status, int page, int size) {
        BloodBankRoles.requireStaff();
        Pageable pageable = PageRequest.of(Math.max(page, 0), clamp(size));
        return toPage(requestRepository.search(status, pageable));
    }

    /** Owner or staff may read a single request; anyone else is refused. */
    @Transactional(readOnly = true)
    public RequestResponse getById(Long id) {
        BloodRequest request = requireRequest(id);
        BloodBankRoles.requireOwnerOrStaff(request.getRequesterUserId());
        return RequestResponse.from(request);
    }

    /**
     * Staff decision. APPROVED only reserves intent; FULFILLED actually issues
     * units out of inventory.
     */
    @Transactional
    public RequestResponse decide(Long id, DecisionRequest decision) {
        BloodBankRoles.requireStaff();
        BloodRequest request = requireRequest(id);

        BloodRequest.Status target = decision.status();
        if (target != BloodRequest.Status.APPROVED
                && target != BloodRequest.Status.REJECTED
                && target != BloodRequest.Status.FULFILLED) {
            throw new BadRequestException("A decision must be APPROVED, REJECTED or FULFILLED");
        }
        if (request.getStatus() == BloodRequest.Status.FULFILLED
                || request.getStatus() == BloodRequest.Status.CANCELLED
                || request.getStatus() == BloodRequest.Status.REJECTED) {
            throw new BadRequestException("Request " + id + " is already " + request.getStatus() + " and cannot change");
        }

        request.setDecidedByUserId(BloodBankRoles.requireUserId());
        request.setDecisionNote(decision.note());
        request.setDecidedAt(LocalDateTime.now());

        if (target == BloodRequest.Status.FULFILLED) {
            request.setFulfilledFrom(issueStock(request));
            request.setFulfilledAt(LocalDateTime.now());
        } else {
            // Releasing a reservation when a request is rejected
            if (target == BloodRequest.Status.REJECTED) {
                request.setFulfilledFrom(null);
            }
        }
        request.setStatus(target);
        return RequestResponse.from(request);
    }

    /** The requester may withdraw their own request while it is still open. */
    @Transactional
    public RequestResponse cancel(Long id) {
        BloodRequest request = requireRequest(id);
        Long callerId = BloodBankRoles.requireUserId();
        if (!callerId.equals(request.getRequesterUserId()) && !BloodBankRoles.isStaff()) {
            throw new AccessDeniedException("You may only cancel your own requests");
        }
        if (request.getStatus() != BloodRequest.Status.REQUESTED
                && request.getStatus() != BloodRequest.Status.APPROVED) {
            throw new BadRequestException("Only REQUESTED or APPROVED requests can be cancelled");
        }
        request.setStatus(BloodRequest.Status.CANCELLED);
        request.setDecidedByUserId(callerId);
        request.setDecidedAt(LocalDateTime.now());
        return RequestResponse.from(request);
    }

    long countByStatus(BloodRequest.Status status) {
        return requestRepository.countByStatus(status);
    }

    /**
     * Draws the requested units from the earliest-expiring lots (FIFO). Rolls
     * back with the surrounding transaction if stock is short, so a request can
     * never be marked FULFILLED against inventory that was not actually there.
     */
    private String issueStock(BloodRequest request) {
        int remaining = request.getUnitsNeeded();
        List<String> usedCentres = new ArrayList<>();

        for (BloodInventory lot : inventoryService.issueCandidates(request.getBloodGroup(), request.getComponent())) {
            if (remaining <= 0) {
                break;
            }
            int take = Math.min(lot.availableUnits(), remaining);
            lot.setUnitsAvailable(lot.getUnitsAvailable() - take);
            remaining -= take;
            usedCentres.add(lot.getCenterName() + " (" + lot.getBloodGroup().getLabel()
                    + " " + lot.getComponent().getLabel() + " x" + take + ")");
        }

        if (remaining > 0) {
            throw new BadRequestException("Insufficient stock: "
                    + (request.getUnitsNeeded() - remaining) + " of " + request.getUnitsNeeded()
                    + " units available for " + request.getBloodGroup().getLabel()
                    + " " + request.getComponent().getLabel());
        }
        return String.join(", ", usedCentres);
    }

    private BloodRequest requireRequest(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Blood request", id));
    }

    private static int clamp(int size) {
        return Math.max(1, Math.min(size, 50));
    }

    private static PageResponse<RequestResponse> toPage(Page<BloodRequest> page) {
        List<RequestResponse> content = page.getContent().stream().map(RequestResponse::from).toList();
        return new PageResponse<>(content, page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
