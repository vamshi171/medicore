package com.medicore.organ.service;

import com.medicore.common.dto.PageResponse;
import com.medicore.common.exception.BadRequestException;
import com.medicore.common.exception.ResourceNotFoundException;
import com.medicore.organ.dto.OrganDtos.PledgeRequest;
import com.medicore.organ.dto.OrganDtos.PledgeResponse;
import com.medicore.organ.dto.OrganDtos.VerifyRequest;
import com.medicore.organ.entity.BloodGroup;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.repository.OrganDonorRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

/**
 * Donor pledges.
 *
 * Consent is the gate on everything: a pledge without it is created in a
 * non-committed state, and withdrawing consent immediately makes the pledge
 * unusable for allocation (status REVOKED). Only a coordinator or admin can
 * move a pledge to VERIFIED/ACTIVE, which is what the matching engine requires.
 */
@Service
public class OrganPledgeService {

    private final OrganDonorRepository donorRepository;

    public OrganPledgeService(OrganDonorRepository donorRepository) {
        this.donorRepository = donorRepository;
    }

    // ------------------------------------------------------------ self-service

    @Transactional
    public PledgeResponse pledge(PledgeRequest request) {
        Long userId = OrganRoles.requireUserId();
        if (donorRepository.existsByUserId(userId)) {
            throw new BadRequestException(
                    "You already have a donor pledge — update it instead of creating a second one");
        }
        if (!Boolean.TRUE.equals(request.consentSigned())) {
            throw new BadRequestException("Consent is required to register as an organ donor");
        }

        OrganDonor donor = new OrganDonor();
        donor.setUserId(userId);
        apply(donor, request);
        donor.setConsentSigned(true);
        donor.setConsentSignedAt(LocalDateTime.now());
        donor.setStatus(OrganDonor.Status.PENDING); // a coordinator verifies before it can be used
        return PledgeResponse.from(donorRepository.save(donor));
    }

    @Transactional(readOnly = true)
    public PledgeResponse getMine() {
        Long userId = OrganRoles.requireUserId();
        return donorRepository.findByUserId(userId)
                .map(PledgeResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Donor pledge for user", userId));
    }

    @Transactional
    public PledgeResponse updateMine(PledgeRequest request) {
        Long userId = OrganRoles.requireUserId();
        OrganDonor donor = donorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Donor pledge for user", userId));
        apply(donor, request);

        boolean consent = Boolean.TRUE.equals(request.consentSigned());
        donor.setConsentSigned(consent);
        if (consent && donor.getConsentSignedAt() == null) {
            donor.setConsentSignedAt(LocalDateTime.now());
        }
        if (!consent) {
            donor.setStatus(OrganDonor.Status.REVOKED);
        } else if (donor.getStatus() == OrganDonor.Status.REVOKED) {
            donor.setStatus(OrganDonor.Status.PENDING); // re-consent re-enters the verification queue
        }
        return PledgeResponse.from(donor);
    }

    /** Withdraw consent: the pledge is retained for the record but can no longer be allocated. */
    @Transactional
    public PledgeResponse revokeMine() {
        Long userId = OrganRoles.requireUserId();
        OrganDonor donor = donorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Donor pledge for user", userId));
        donor.setConsentSigned(false);
        donor.setStatus(OrganDonor.Status.REVOKED);
        return PledgeResponse.from(donor);
    }

    // ------------------------------------------------------- coordinator views

    @Transactional(readOnly = true)
    public PageResponse<PledgeResponse> list(OrganDonor.Status status, BloodGroup bloodGroup,
                                             String city, int page, int size) {
        OrganRoles.requireCoordinator();
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 50)));
        String normalizedCity = (city == null || city.isBlank()) ? null : city.trim().toLowerCase(Locale.ROOT);
        Page<OrganDonor> result = donorRepository.search(status, bloodGroup, normalizedCity, pageable);
        List<PledgeResponse> content = result.getContent().stream().map(PledgeResponse::from).toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    /** Coordinator/admin, or the owner of the pledge. */
    @Transactional(readOnly = true)
    public PledgeResponse getById(Long id) {
        OrganDonor donor = requireDonor(id);
        OrganRoles.requireOwnerOrCoordinator(donor.getUserId());
        return PledgeResponse.from(donor);
    }

    /** Verification is a clinical act: coordinator or admin only. */
    @Transactional
    public PledgeResponse verify(Long id, VerifyRequest request) {
        OrganRoles.requireCoordinator();
        OrganDonor donor = requireDonor(id);

        OrganDonor.Status target = request.status();
        if (target == OrganDonor.Status.PENDING) {
            throw new BadRequestException("Verification can only set VERIFIED, ACTIVE or REVOKED");
        }
        if (!donor.isConsentSigned() && target != OrganDonor.Status.REVOKED) {
            throw new BadRequestException("This donor has not given consent and cannot be verified");
        }
        donor.setStatus(target);
        donor.setVerifiedByUserId(OrganRoles.requireUserId());
        donor.setVerifiedAt(LocalDateTime.now());
        if (request.note() != null && !request.note().isBlank()) {
            donor.setMedicalNotes(request.note());
        }
        return PledgeResponse.from(donor);
    }

    long countByStatus(OrganDonor.Status status) {
        return donorRepository.countByStatus(status);
    }

    long countActive() {
        return donorRepository.countByActiveTrue();
    }

    private OrganDonor requireDonor(Long id) {
        return donorRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Donor pledge", id));
    }

    private void apply(OrganDonor donor, PledgeRequest r) {
        donor.setFullName(r.fullName().trim());
        donor.setBloodGroup(r.bloodGroup());
        donor.setAge(r.age());
        donor.setCity(r.city().trim());
        donor.setPhone(r.phone());
        donor.setMedicalNotes(r.medicalNotes());
        donor.setOrgans(new LinkedHashSet<>(r.organs()));
    }
}
