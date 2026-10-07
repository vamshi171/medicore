package com.medicore.bloodbank.dto;

import com.medicore.bloodbank.entity.BloodComponent;
import com.medicore.bloodbank.entity.BloodDonor;
import com.medicore.bloodbank.entity.BloodGroup;
import com.medicore.bloodbank.entity.BloodInventory;
import com.medicore.bloodbank.entity.BloodRequest;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Request/response payloads for the blood bank (Java records — immutable carriers).
 *
 * Note the two distinct read models for stock:
 *  - {@link InventoryResponse}    — full operational view (thresholds, expiry). Staff only.
 *  - {@link AvailabilityResponse} — a deliberately narrower view for patients/doctors:
 *    whether units exist, flagged critical, but no internal thresholds or lot history.
 * Encoding that difference in two types is what makes the per-role access rules
 * enforceable rather than cosmetic.
 */
public final class BloodBankDtos {

    private BloodBankDtos() {
    }

    // ---------------------------------------------------------------- inventory

    public record InventoryRequest(
            @NotBlank @Size(max = 120) String centerName,
            @NotBlank @Size(max = 80) String city,
            @NotNull BloodGroup bloodGroup,
            @NotNull BloodComponent component,
            @Min(0) int unitsAvailable,
            @Min(0) int unitsReserved,
            @Min(0) int criticalThreshold,
            @NotNull LocalDate expiryDate,
            @Size(max = 200) String notes) {
    }

    public record InventoryResponse(
            Long id,
            String centerName,
            String city,
            BloodGroup bloodGroup,
            String bloodGroupLabel,
            BloodComponent component,
            String componentLabel,
            int unitsAvailable,
            int unitsReserved,
            int availableUnits,
            int criticalThreshold,
            boolean critical,
            boolean expired,
            boolean expiringSoon,
            LocalDate expiryDate,
            String notes,
            String updatedAt) {

        public static InventoryResponse from(BloodInventory i) {
            return new InventoryResponse(
                    i.getId(), i.getCenterName(), i.getCity(),
                    i.getBloodGroup(), i.getBloodGroup().getLabel(),
                    i.getComponent(), i.getComponent().getLabel(),
                    i.getUnitsAvailable(), i.getUnitsReserved(), i.availableUnits(),
                    i.getCriticalThreshold(), i.critical(), i.expired(), i.expiringWithin(30),
                    i.getExpiryDate(), i.getNotes(),
                    i.getUpdatedAt() == null ? null : i.getUpdatedAt().toString());
        }
    }

    /** Patient/doctor-safe view: no thresholds, no lot history. */
    public record AvailabilityResponse(
            String centerName,
            String city,
            BloodGroup bloodGroup,
            String bloodGroupLabel,
            BloodComponent component,
            String componentLabel,
            int availableUnits,
            boolean critical,
            boolean expiringSoon) {

        public static AvailabilityResponse from(BloodInventory i) {
            return new AvailabilityResponse(
                    i.getCenterName(), i.getCity(),
                    i.getBloodGroup(), i.getBloodGroup().getLabel(),
                    i.getComponent(), i.getComponent().getLabel(),
                    i.availableUnits(), i.critical(), i.expiringWithin(30));
        }
    }

    public record AdjustRequest(@NotNull @Min(-500) @Max(500) Integer delta) {
    }

    // ---------------------------------------------------------------- requests

    public record RequestCreateRequest(
            @NotBlank @Size(max = 100) String patientName,
            @NotNull BloodGroup bloodGroup,
            @NotNull BloodComponent component,
            @Min(1) @Max(20) int unitsNeeded,
            @NotNull BloodRequest.Urgency urgency,
            @NotBlank @Size(max = 120) String hospital,
            @NotBlank @Size(max = 80) String city,
            @Size(max = 300) String reason) {
    }

    public record RequestResponse(
            Long id,
            Long requesterUserId,
            String requesterName,
            String requesterRole,
            String patientName,
            BloodGroup bloodGroup,
            String bloodGroupLabel,
            BloodComponent component,
            String componentLabel,
            int unitsNeeded,
            BloodRequest.Urgency urgency,
            String hospital,
            String city,
            String reason,
            BloodRequest.Status status,
            Long decidedByUserId,
            String decisionNote,
            String fulfilledFrom,
            String requestedAt,
            String decidedAt,
            String fulfilledAt) {

        public static RequestResponse from(BloodRequest r) {
            return new RequestResponse(
                    r.getId(), r.getRequesterUserId(), r.getRequesterName(), r.getRequesterRole(),
                    r.getPatientName(), r.getBloodGroup(), r.getBloodGroup().getLabel(),
                    r.getComponent(), r.getComponent().getLabel(),
                    r.getUnitsNeeded(), r.getUrgency(), r.getHospital(), r.getCity(), r.getReason(),
                    r.getStatus(), r.getDecidedByUserId(), r.getDecisionNote(), r.getFulfilledFrom(),
                    r.getRequestedAt() == null ? null : r.getRequestedAt().toString(),
                    r.getDecidedAt() == null ? null : r.getDecidedAt().toString(),
                    r.getFulfilledAt() == null ? null : r.getFulfilledAt().toString());
        }
    }

    /** Staff decision: APPROVED / REJECTED / FULFILLED only. */
    public record DecisionRequest(
            @NotNull BloodRequest.Status status,
            @Size(max = 300) String note) {
    }

    // ---------------------------------------------------------------- donors

    public record DonorRequest(
            @NotBlank @Size(max = 100) String fullName,
            @NotNull BloodGroup bloodGroup,
            @Min(18) @Max(65) int age,
            @Min(45) @Max(200) int weightKg,
            @Size(max = 15) String phone,
            @NotBlank @Size(max = 80) String city,
            LocalDate lastDonationDate) {
    }

    public record DonorResponse(
            Long id,
            Long userId,
            String fullName,
            BloodGroup bloodGroup,
            String bloodGroupLabel,
            int age,
            int weightKg,
            String phone,
            String city,
            LocalDate lastDonationDate,
            LocalDate nextEligibleDate,
            long daysUntilEligible,
            BloodDonor.Eligibility eligibility,
            boolean eligibleNow,
            String deferralReason,
            String createdAt) {

        public static DonorResponse from(BloodDonor d) {
            return new DonorResponse(
                    d.getId(), d.getUserId(), d.getFullName(),
                    d.getBloodGroup(), d.getBloodGroup().getLabel(),
                    d.getAge(), d.getWeightKg(), d.getPhone(), d.getCity(),
                    d.getLastDonationDate(), d.nextEligibleDate(), d.daysUntilEligible(),
                    d.getEligibility(), d.eligibleNow(), d.getDeferralReason(),
                    d.getCreatedAt() == null ? null : d.getCreatedAt().toString());
        }
    }

    public record EligibilityRequest(
            @NotNull BloodDonor.Eligibility eligibility,
            @Size(max = 200) String reason) {
    }

    // ---------------------------------------------------------------- read models

    public record StatsResponse(
            long usableUnits,
            long lots,
            long criticalLots,
            long expiringIn30Days,
            long requested,
            long approved,
            long fulfilled,
            long rejected,
            long registeredDonors,
            long eligibleDonors) {
    }

    public record Option(String name, String label) {
    }

    public record MetadataResponse(
            List<Option> bloodGroups,
            List<Option> components,
            List<Option> urgencies,
            List<Option> requestStatuses,
            List<Option> eligibilities) {
    }

    /** Blood group a patient may receive given several candidate donors. */
    public record CompatibilityResponse(
            BloodGroup recipient,
            String recipientLabel,
            List<Option> canReceiveFrom,
            List<Option> canDonateTo) {
    }
}
