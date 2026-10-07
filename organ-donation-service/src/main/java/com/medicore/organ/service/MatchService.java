package com.medicore.organ.service;

import com.medicore.common.dto.PageResponse;
import com.medicore.common.exception.BadRequestException;
import com.medicore.common.exception.ResourceNotFoundException;
import com.medicore.organ.dto.OrganDtos.MatchRequest;
import com.medicore.organ.dto.OrganDtos.MatchResponse;
import com.medicore.organ.dto.OrganDtos.MatchStatusRequest;
import com.medicore.organ.entity.MatchRecord;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.entity.WaitlistEntry;
import com.medicore.organ.repository.MatchRecordRepository;
import com.medicore.organ.repository.OrganDonorRepository;
import com.medicore.organ.repository.WaitlistEntryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Organ allocation.
 *
 * A match can only be proposed between a committed pledge and a waiting
 * recipient whose blood groups are actually compatible — the same engine the
 * candidate list uses, so the UI cannot offer a pairing the service would then
 * refuse. Completing a match also moves the recipient to TRANSPLANTED, keeping
 * the two aggregates consistent inside one transaction.
 */
@Service
public class MatchService {

    private final MatchRecordRepository matchRepository;
    private final OrganDonorRepository donorRepository;
    private final WaitlistEntryRepository waitlistRepository;
    private final OrganCompatibilityService compatibility;

    public MatchService(MatchRecordRepository matchRepository,
                        OrganDonorRepository donorRepository,
                        WaitlistEntryRepository waitlistRepository,
                        OrganCompatibilityService compatibility) {
        this.matchRepository = matchRepository;
        this.donorRepository = donorRepository;
        this.waitlistRepository = waitlistRepository;
        this.compatibility = compatibility;
    }

    @Transactional
    public MatchResponse propose(MatchRequest request) {
        OrganRoles.requireCoordinator();

        OrganDonor donor = donorRepository.findByIdAndActiveTrue(request.donorId())
                .orElseThrow(() -> new ResourceNotFoundException("Donor pledge", request.donorId()));
        WaitlistEntry recipient = waitlistRepository.findById(request.recipientId())
                .orElseThrow(() -> new ResourceNotFoundException("Waitlist entry", request.recipientId()));

        if (!recipient.awaiting()) {
            throw new BadRequestException("Recipient is " + recipient.getStatus() + " and cannot be matched");
        }
        if (!donor.committed()) {
            throw new BadRequestException("That donor is not verified/active with consent, so cannot be allocated");
        }

        OrganCompatibilityService.Tier tier = compatibility.evaluate(donor, recipient);
        if (!tier.usable()) {
            throw new BadRequestException("Incompatible pairing: " + tier.label());
        }
        // Only a *live* allocation blocks a duplicate. A WITHDRAWN attempt is
        // history: the recipient is back on the waiting list, so the pair must be
        // re-proposable instead of being permanently stranded.
        boolean liveAllocationExists = matchRepository
                .findByDonorIdAndRecipientIdAndOrgan(donor.getId(), recipient.getId(), recipient.getOrganNeeded())
                .stream()
                .anyMatch(m -> m.getStatus() == MatchRecord.Status.PROPOSED
                        || m.getStatus() == MatchRecord.Status.CONFIRMED);
        if (liveAllocationExists) {
            throw new BadRequestException("An active allocation for this donor, recipient and organ already exists");
        }

        MatchRecord match = new MatchRecord();
        match.setDonorId(donor.getId());
        match.setDonorUserId(donor.getUserId());
        match.setDonorName(donor.getFullName());
        match.setRecipientId(recipient.getId());
        match.setRecipientUserId(recipient.getPatientUserId());
        match.setRecipientName(recipient.getPatientName());
        match.setOrgan(recipient.getOrganNeeded());
        match.setCompatibilityTier(tier.label());
        match.setStatus(MatchRecord.Status.PROPOSED);
        match.setProposedByUserId(OrganRoles.requireUserId());
        match.setNotes(request.notes());

        recipient.setStatus(WaitlistEntry.Status.MATCHED);
        recipient.setMatchedAt(LocalDateTime.now());

        return MatchResponse.from(matchRepository.save(match));
    }

    /** The full allocation book — coordinator/admin only. */
    @Transactional(readOnly = true)
    public PageResponse<MatchResponse> list(MatchRecord.Status status, int page, int size) {
        OrganRoles.requireCoordinator();
        Page<MatchRecord> result = matchRepository.search(status,
                PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 50))));
        List<MatchResponse> content = result.getContent().stream().map(MatchResponse::from).toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    /** A participant's own allocations — donor or recipient side. */
    @Transactional(readOnly = true)
    public List<MatchResponse> mine() {
        Long userId = OrganRoles.requireUserId();
        return matchRepository.findByDonorUserIdOrRecipientUserIdOrderByProposedAtDesc(userId, userId).stream()
                .map(MatchResponse::from)
                .toList();
    }

    /**
     * Advances an allocation. COMPLETED records the transplant on the recipient;
     * WITHDRAWN puts the recipient back on the waiting list so they are not
     * silently stranded.
     */
    @Transactional
    public MatchResponse setStatus(Long id, MatchStatusRequest request) {
        OrganRoles.requireCoordinator();
        MatchRecord match = matchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Allocation", id));

        MatchRecord.Status target = request.status();
        if (target == MatchRecord.Status.PROPOSED) {
            throw new BadRequestException("Status can only be moved forward to CONFIRMED, COMPLETED or WITHDRAWN");
        }
        if (match.getStatus() == MatchRecord.Status.COMPLETED
                || match.getStatus() == MatchRecord.Status.WITHDRAWN) {
            throw new BadRequestException("Allocation is already " + match.getStatus() + " and cannot change");
        }

        WaitlistEntry recipient = waitlistRepository.findById(match.getRecipientId()).orElse(null);
        if (target == MatchRecord.Status.COMPLETED) {
            match.setCompletedAt(LocalDateTime.now());
            if (recipient != null) {
                recipient.setStatus(WaitlistEntry.Status.TRANSPLANTED);
                recipient.setTransplantedAt(LocalDateTime.now());
            }
        } else if (target == MatchRecord.Status.CONFIRMED) {
            match.setConfirmedAt(LocalDateTime.now());
        } else if (target == MatchRecord.Status.WITHDRAWN && recipient != null
                && recipient.getStatus() == WaitlistEntry.Status.MATCHED) {
            recipient.setStatus(WaitlistEntry.Status.WAITING);
            recipient.setMatchedAt(null);
        }

        match.setStatus(target);
        if (request.notes() != null && !request.notes().isBlank()) {
            match.setNotes(request.notes());
        }
        return MatchResponse.from(match);
    }

    long countByStatus(MatchRecord.Status status) {
        return matchRepository.countByStatus(status);
    }
}
