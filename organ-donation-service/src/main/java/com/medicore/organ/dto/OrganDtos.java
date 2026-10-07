package com.medicore.organ.dto;

import com.medicore.organ.entity.BloodGroup;
import com.medicore.organ.entity.MatchRecord;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.entity.OrganType;
import com.medicore.organ.entity.WaitlistEntry;
import jakarta.validation.constraints.*;

import java.util.List;
import java.util.Set;

public final class OrganDtos {

    private OrganDtos() {
    }

    public record Option(String name, String label) {
    }

    // ------------------------------------------------------------- pledges

    public record PledgeRequest(
            @NotBlank @Size(max = 100) String fullName,
            @NotNull BloodGroup bloodGroup,
            @Min(18) @Max(80) int age,
            @NotBlank @Size(max = 80) String city,
            @Size(max = 15) String phone,
            @NotEmpty Set<OrganType> organs,
            @NotNull Boolean consentSigned,
            @Size(max = 300) String medicalNotes) {
    }

    public record PledgeResponse(
            Long id,
            Long userId,
            String fullName,
            BloodGroup bloodGroup,
            String bloodGroupLabel,
            int age,
            String city,
            String phone,
            List<Option> organs,
            boolean consentSigned,
            String consentSignedAt,
            OrganDonor.Status status,
            Long verifiedByUserId,
            String verifiedAt,
            String medicalNotes,
            boolean committed,
            String createdAt) {

        public static PledgeResponse from(OrganDonor d) {
            return new PledgeResponse(
                    d.getId(), d.getUserId(), d.getFullName(),
                    d.getBloodGroup(), d.getBloodGroup().getLabel(),
                    d.getAge(), d.getCity(), d.getPhone(),
                    d.getOrgans() == null ? List.of() : d.getOrgans().stream()
                            .sorted()
                            .map(o -> new Option(o.name(), o.getLabel()))
                            .toList(),
                    d.isConsentSigned(),
                    d.getConsentSignedAt() == null ? null : d.getConsentSignedAt().toString(),
                    d.getStatus(), d.getVerifiedByUserId(),
                    d.getVerifiedAt() == null ? null : d.getVerifiedAt().toString(),
                    d.getMedicalNotes(), d.committed(),
                    d.getCreatedAt() == null ? null : d.getCreatedAt().toString());
        }
    }

    public record VerifyRequest(
            @NotNull OrganDonor.Status status,
            @Size(max = 300) String note) {
    }

    // ------------------------------------------------------------- waitlist

    public record WaitlistRequest(
            // Staff list a patient. Identity can be given as either an auth userId
            // or an email, which the service resolves over the internal API.
            Long patientUserId,
            @Size(max = 120) String patientEmail,
            @Size(max = 100) String patientName,
            @NotNull OrganType organNeeded,
            @NotNull BloodGroup bloodGroup,
            @Min(1) @Max(10) int urgencyScore,
            @NotBlank @Size(max = 120) String hospital,
            @NotBlank @Size(max = 80) String city,
            @Size(max = 300) String notes) {
    }

    public record WaitlistResponse(
            Long id,
            Long patientUserId,
            String patientName,
            OrganType organNeeded,
            String organLabel,
            BloodGroup bloodGroup,
            String bloodGroupLabel,
            int urgencyScore,
            String hospital,
            String city,
            Long referringDoctorUserId,
            WaitlistEntry.Status status,
            String listedAt,
            String matchedAt,
            String transplantedAt,
            String notes) {

        public static WaitlistResponse from(WaitlistEntry w) {
            return new WaitlistResponse(
                    w.getId(), w.getPatientUserId(), w.getPatientName(),
                    w.getOrganNeeded(), w.getOrganNeeded().getLabel(),
                    w.getBloodGroup(), w.getBloodGroup().getLabel(),
                    w.getUrgencyScore(), w.getHospital(), w.getCity(),
                    w.getReferringDoctorUserId(), w.getStatus(),
                    w.getListedAt() == null ? null : w.getListedAt().toString(),
                    w.getMatchedAt() == null ? null : w.getMatchedAt().toString(),
                    w.getTransplantedAt() == null ? null : w.getTransplantedAt().toString(),
                    w.getNotes());
        }
    }

    public record WaitlistStatusRequest(
            @NotNull WaitlistEntry.Status status,
            @Size(max = 300) String note) {
    }

    /** One scored candidate returned by the matching view. */
    public record CandidateResponse(
            Long donorId,
            Long donorUserId,
            String donorName,
            BloodGroup bloodGroup,
            String bloodGroupLabel,
            int age,
            String city,
            List<Option> organs,
            String tier,
            String tierLabel,
            int tierRank,
            boolean bloodGroupBarrier,
            String medicalNotes) {
    }

    // ------------------------------------------------------------- matches

    public record MatchRequest(
            @NotNull Long donorId,
            @NotNull Long recipientId,
            @Size(max = 300) String notes) {
    }

    public record MatchResponse(
            Long id,
            Long donorId,
            Long donorUserId,
            String donorName,
            Long recipientId,
            Long recipientUserId,
            String recipientName,
            OrganType organ,
            String organLabel,
            String compatibilityTier,
            MatchRecord.Status status,
            Long proposedByUserId,
            String proposedAt,
            String confirmedAt,
            String completedAt,
            String notes) {

        public static MatchResponse from(MatchRecord m) {
            return new MatchResponse(
                    m.getId(), m.getDonorId(), m.getDonorUserId(), m.getDonorName(),
                    m.getRecipientId(), m.getRecipientUserId(), m.getRecipientName(),
                    m.getOrgan(), m.getOrgan().getLabel(), m.getCompatibilityTier(),
                    m.getStatus(), m.getProposedByUserId(),
                    m.getProposedAt() == null ? null : m.getProposedAt().toString(),
                    m.getConfirmedAt() == null ? null : m.getConfirmedAt().toString(),
                    m.getCompletedAt() == null ? null : m.getCompletedAt().toString(),
                    m.getNotes());
        }
    }

    public record MatchStatusRequest(
            @NotNull MatchRecord.Status status,
            @Size(max = 300) String notes) {
    }

    // ------------------------------------------------------------- read models

    public record OrganCount(String organ, String label, long waiting, long pledges) {
    }

    public record StatsResponse(
            long totalPledges,
            long pendingPledges,
            long verifiedPledges,
            long activePledges,
            long revokedPledges,
            long waiting,
            long matched,
            long transplanted,
            long totalMatches,
            long proposedMatches,
            long completedMatches,
            List<OrganCount> byOrgan) {
    }

    public record MetadataResponse(
            List<Option> organs,
            List<Option> bloodGroups,
            List<Option> pledgeStatuses,
            List<Option> waitlistStatuses,
            List<Option> matchStatuses,
            List<Option> compatibilityTiers,
            List<Option> compatibilityRules) {
    }
}
