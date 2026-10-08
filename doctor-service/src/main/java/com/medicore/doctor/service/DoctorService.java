package com.medicore.doctor.service;

import com.medicore.common.dto.PageResponse;
import com.medicore.common.exception.BadRequestException;
import com.medicore.common.exception.ResourceNotFoundException;
import com.medicore.common.security.CurrentUser;
import com.medicore.doctor.dto.DoctorDtos.DoctorRequest;
import com.medicore.doctor.dto.DoctorDtos.DoctorResponse;
import com.medicore.doctor.entity.Doctor;
import com.medicore.doctor.repository.DoctorRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;
import java.util.Locale;

/**
 * Doctor profile + public search use-cases.
 */
@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;

    public DoctorService(DoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    @Transactional
    public DoctorResponse createMyProfile(DoctorRequest request) {
        Long userId = CurrentUser.requireUserId();
        if (doctorRepository.existsByUserId(userId)) {
            throw new BadRequestException("Profile already exists. Use update instead.");
        }
        Doctor doctor = new Doctor();
        doctor.setUserId(userId);
        applyRequest(doctor, request);
        validateWindow(doctor);
        return DoctorResponse.from(doctorRepository.save(doctor));
    }

    /**
     * Freshly registered doctors have no profile row yet. Materialise a
     * minimal OFF-DUTY shell on first access (invisible in patient search
     * until they flip availability and complete their details).
     */
    @Transactional
    public DoctorResponse getMyProfile() {
        Long userId = CurrentUser.requireUserId();
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseGet(() -> selfHealProfile(userId));
        return DoctorResponse.from(doctor);
    }

    private Doctor selfHealProfile(Long userId) {
        Doctor doctor = new Doctor();
        doctor.setUserId(userId);
        doctor.setFullName(defaultFullName(userId));
        doctor.setAvailable(false); // opt in deliberately from the dashboard
        try {
            return doctorRepository.saveAndFlush(doctor);
        } catch (DataIntegrityViolationException race) {
            return doctorRepository.findByUserId(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor profile for user", userId));
        }
    }

    private String defaultFullName(Long userId) {
        com.medicore.common.security.UserPrincipal principal = CurrentUser.get();
        String email = principal != null ? principal.email() : ("user-" + userId);
        String local = email.contains("@") ? email.substring(0, email.indexOf('@')) : email;
        String cleaned = local.replaceAll("[._+-]+", " ").trim();
        if (cleaned.isEmpty()) {
            return "New doctor " + userId;
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
    public DoctorResponse updateMyProfile(DoctorRequest request) {
        Long userId = CurrentUser.requireUserId();
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile for user", userId));
        applyRequest(doctor, request);
        validateWindow(doctor);
        return DoctorResponse.from(doctor);
    }

    /** On/off-duty toggle — separate concept from account deactivation. */
    @Transactional
    public DoctorResponse setAvailability(Long userId, boolean available) {
        Doctor doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile for user", userId));
        doctor.setAvailable(available);
        return DoctorResponse.from(doctor);
    }

    @Transactional(readOnly = true)
    public PageResponse<DoctorResponse> search(String specialization, Integer minExperience,
                                               BigDecimal maxFee, int page, int size) {
        String spec = (specialization == null || specialization.isBlank()) ? null
                : specialization.trim().toLowerCase(Locale.ROOT);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "fullName"));
        Page<Doctor> result = doctorRepository.search(spec, minExperience, maxFee, pageable);
        List<DoctorResponse> content = result.getContent().stream()
                .map(DoctorResponse::from)
                .toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    @Transactional(readOnly = true)
    public List<String> specializations() {
        return doctorRepository.findDistinctSpecializations().stream()
                .distinct()
                .sorted() // Streams: intermediate + terminal operations
                .toList();
    }

    @Transactional(readOnly = true)
    public DoctorResponse getById(Long id) {
        return doctorRepository.findByIdAndActiveTrue(id)
                .map(DoctorResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", id));
    }

    /** Internal lookup used by appointment-service over Feign. */
    @Transactional(readOnly = true)
    public DoctorResponse internalById(Long id) {
        return doctorRepository.findById(id)
                .map(DoctorResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor", id));
    }

    /** Internal lookup by auth userId (appointment-service resolves "my appointments"). */
    @Transactional(readOnly = true)
    public DoctorResponse internalByUserId(Long userId) {
        return doctorRepository.findByUserId(userId)
                .map(DoctorResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor profile for user", userId));
    }

    private void validateWindow(Doctor doctor) {
        LocalTime from = doctor.getAvailableFrom();
        LocalTime to = doctor.getAvailableTo();
        if (from == null || to == null || !to.isAfter(from)) {
            throw new BadRequestException("availableTo must be after availableFrom");
        }
        if (java.time.Duration.between(from, to).toMinutes() < 30) {
            throw new BadRequestException("Availability window must be at least 30 minutes");
        }
    }

    private void applyRequest(Doctor doctor, DoctorRequest request) {
        doctor.setFullName(request.fullName());
        doctor.setSpecialization(request.specialization());
        doctor.setBio(request.bio());
        doctor.setConsultationFee(request.consultationFee());
        doctor.setExperienceYears(request.experienceYears());
        doctor.setPhone(request.phone());
        doctor.setAvailableFrom(request.availableFrom());
        doctor.setAvailableTo(request.availableTo());
    }
}
