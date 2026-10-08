package com.medicore.patient.service;

import com.medicore.common.dto.PageResponse;
import com.medicore.common.exception.BadRequestException;
import com.medicore.common.exception.ResourceNotFoundException;
import com.medicore.common.security.CurrentUser;
import com.medicore.patient.dto.PatientDtos.PatientRequest;
import com.medicore.patient.dto.PatientDtos.PatientResponse;
import com.medicore.patient.entity.Patient;
import com.medicore.patient.repository.PatientRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Patient profile use-cases. Authorization: PATIENT sees/edits only /me;
 * ADMIN can list and deactivate. Streams + lambdas used for mapping/filtering.
 */
@Service
public class PatientService {

    private final PatientRepository patientRepository;

    public PatientService(PatientRepository patientRepository) {
        this.patientRepository = patientRepository;
    }

    @Transactional
    public PatientResponse createMyProfile(PatientRequest request) {
        Long userId = CurrentUser.requireUserId();

        if (patientRepository.existsByUserId(userId)) {
            throw new BadRequestException("Profile already exists. Use update instead.");
        }

        Patient patient = new Patient();
        patient.setUserId(userId);
        applyRequest(patient, request);
        return PatientResponse.from(patientRepository.save(patient));
    }

    /**
     * Freshly registered accounts have no profile row yet. Instead of failing,
     * materialise a minimal active profile on first access so the portal
     * (dashboard, appointment lookups) works immediately; the member completes
     * the details from the Profile page.
     */
    @Transactional
    public PatientResponse getMyProfile() {
        Long userId = CurrentUser.requireUserId();
        Patient patient = patientRepository.findByUserId(userId)
                .orElseGet(() -> selfHealProfile(userId));
        return PatientResponse.from(patient);
    }

    private Patient selfHealProfile(Long userId) {
        Patient patient = new Patient();
        patient.setUserId(userId);
        patient.setFullName(defaultFullName(userId));
        try {
            return patientRepository.saveAndFlush(patient);
        } catch (DataIntegrityViolationException race) {
            // Two concurrent first-calls: the row exists now — use it.
            return patientRepository.findByUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Patient profile for user", userId));
        }
    }

    private String defaultFullName(Long userId) {
        com.medicore.common.security.UserPrincipal principal = CurrentUser.get();
        String email = principal != null ? principal.email() : ("user-" + userId);
        String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        String cleaned = local.replaceAll("[._+-]+", " ").trim();
        if (cleaned.isEmpty()) {
            return "New patient " + userId;
        }
        StringBuilder name = new StringBuilder();
        for (String word : cleaned.split("\\s+")) {
            if (!word.isEmpty()) {
                name.append(Character.toUpperCase(word.charAt(0)))
                    .append(word.substring(1).toLowerCase())
                    .append(' ');
            }
        }
        return name.toString().trim();
    }

    @Transactional
    public PatientResponse updateMyProfile(PatientRequest request) {
        Long userId = CurrentUser.requireUserId();
        Patient patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile for user", userId));
        applyRequest(patient, request);
        return PatientResponse.from(patient);
    }

    @Transactional(readOnly = true)
    public PageResponse<PatientResponse> listActive(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "fullName"));
        Page<Patient> result = patientRepository.findByActiveTrue(pageable);
        List<PatientResponse> content = result.getContent().stream()
                .map(PatientResponse::from) // method reference (lambda family)
                .toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public PatientResponse getById(Long id) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", id));
        // PATIENTs may only view their own profile; ADMINs any profile
        com.medicore.common.security.UserPrincipal principal = CurrentUser.get();
        if (principal != null && "PATIENT".equals(principal.role())
                && !principal.userId().equals(patient.getUserId())) {
            throw new com.medicore.common.exception.AccessDeniedException(
                    "You can only view your own profile");
        }
        return PatientResponse.from(patient);
    }

    /** ADMIN soft-deletes (deactivates) a patient profile. */
    @Transactional
    public PatientResponse setStatus(Long id, boolean active) {
        Patient patient = patientRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Patient", id));
        patient.setActive(active);
        patient.setDeactivatedAt(active ? null : java.time.LocalDateTime.now());
        return PatientResponse.from(patient);
    }

    /** Internal lookup used by appointment-service over Feign. */
    @Transactional(readOnly = true)
    public PatientResponse internalByUserId(Long userId) {
        return patientRepository.findByUserId(userId).map(PatientResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Patient profile for user", userId));
    }

    private void applyRequest(Patient patient, PatientRequest request) {
        patient.setFullName(request.fullName());
        patient.setDateOfBirth(request.dateOfBirth());
        patient.setGender(request.gender());
        patient.setPhone(request.phone());
        patient.setAddress(request.address());
        patient.setBloodGroup(request.bloodGroup());
        patient.setAllergies(request.allergies());
        patient.setChronicConditions(request.chronicConditions());
    }
}
