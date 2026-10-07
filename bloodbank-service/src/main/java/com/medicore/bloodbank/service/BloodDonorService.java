package com.medicore.bloodbank.service;

import com.medicore.bloodbank.dto.BloodBankDtos.DonorRequest;
import com.medicore.bloodbank.dto.BloodBankDtos.DonorResponse;
import com.medicore.bloodbank.dto.BloodBankDtos.EligibilityRequest;
import com.medicore.bloodbank.entity.BloodDonor;
import com.medicore.bloodbank.entity.BloodGroup;
import com.medicore.bloodbank.repository.BloodDonorRepository;
import com.medicore.common.dto.PageResponse;
import com.medicore.common.exception.BadRequestException;
import com.medicore.common.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

/**
 * The donor registry.
 *
 * Every authenticated role may register *itself* as a donor — the record is
 * keyed by the caller's own userId, so nobody can create or edit a donor on
 * someone else's behalf. Reading the full registry is staff-only.
 */
@Service
public class BloodDonorService {

    private final BloodDonorRepository donorRepository;

    public BloodDonorService(BloodDonorRepository donorRepository) {
        this.donorRepository = donorRepository;
    }

    @Transactional
    public DonorResponse registerMe(DonorRequest request) {
        Long userId = BloodBankRoles.requireUserId();
        if (donorRepository.existsByUserId(userId)) {
            throw new BadRequestException("You are already registered as a donor — update your details instead");
        }
        BloodDonor donor = new BloodDonor();
        donor.setUserId(userId);
        apply(donor, request);
        // A first-time donor with a recorded donation inside the cool-down is deferred automatically.
        if (!donor.eligibleNow()) {
            donor.setEligibility(BloodDonor.Eligibility.DEFERRED);
            donor.setDeferralReason("Inside the " + BloodDonor.MIN_DAYS_BETWEEN_DONATIONS + "-day donation cool-down");
        }
        return DonorResponse.from(donorRepository.save(donor));
    }

    @Transactional(readOnly = true)
    public DonorResponse getMe() {
        Long userId = BloodBankRoles.requireUserId();
        return donorRepository.findByUserId(userId)
                .map(DonorResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Donor profile for user", userId));
    }

    @Transactional
    public DonorResponse updateMe(DonorRequest request) {
        Long userId = BloodBankRoles.requireUserId();
        BloodDonor donor = donorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Donor profile for user", userId));
        apply(donor, request);
        return DonorResponse.from(donor);
    }

    /** Registry read — staff only. */
    @Transactional(readOnly = true)
    public PageResponse<DonorResponse> list(BloodGroup bloodGroup, String city,
                                            BloodDonor.Eligibility eligibility, int page, int size) {
        BloodBankRoles.requireRegistryAccess();
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 50)));
        String normalizedCity = (city == null || city.isBlank()) ? null : city.trim().toLowerCase(Locale.ROOT);
        Page<BloodDonor> result = donorRepository.search(bloodGroup, normalizedCity, eligibility, pageable);
        List<DonorResponse> content = result.getContent().stream().map(DonorResponse::from).toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    /** Staff-only: defer or re-activate a donor (travel, medication, low haemoglobin…). */
    @Transactional
    public DonorResponse setEligibility(Long id, EligibilityRequest request) {
        BloodBankRoles.requireRegistryAccess();
        BloodDonor donor = donorRepository.findByIdAndActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("Donor", id));
        donor.setEligibility(request.eligibility());
        donor.setDeferralReason(request.eligibility() == BloodDonor.Eligibility.DEFERRED
                ? request.reason() : null);
        return DonorResponse.from(donor);
    }

    @Transactional(readOnly = true)
    public DonorResponse internalByUserId(Long userId) {
        return donorRepository.findByUserId(userId)
                .map(DonorResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Donor profile for user", userId));
    }

    long countActive() {
        return donorRepository.countByActiveTrue();
    }

    long countEligible() {
        return donorRepository.countByEligibility(BloodDonor.Eligibility.ELIGIBLE);
    }

    private void apply(BloodDonor donor, DonorRequest r) {
        donor.setFullName(r.fullName().trim());
        donor.setBloodGroup(r.bloodGroup());
        donor.setAge(r.age());
        donor.setWeightKg(r.weightKg());
        donor.setPhone(r.phone());
        donor.setCity(r.city().trim());
        if (r.lastDonationDate() != null && r.lastDonationDate().isAfter(LocalDate.now())) {
            throw new BadRequestException("lastDonationDate cannot be in the future");
        }
        donor.setLastDonationDate(r.lastDonationDate());
    }
}
