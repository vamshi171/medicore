package com.medicore.organ.service;

import com.medicore.organ.entity.BloodGroup;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.entity.OrganType;
import com.medicore.organ.entity.WaitlistEntry;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * The allocation matching engine.
 *
 * Deliberately dependency-free (no repositories, no Spring context needed to
 * exercise it) so the clinical rules can be unit-tested directly — see
 * OrganCompatibilityServiceTest. Everything the caller needs to reason about a
 * pairing is returned as a {@link Tier} rather than a boolean, because "how
 * well does this pair match" drives the ranking the coordinator sees.
 *
 * Three real rules are encoded here:
 *  1. ABO direction — a donor's group is matched against the recipient's, and
 *     for organs the direction is O->anyone, AB->AB only (the reverse of the
 *     red-cell rule set in the blood bank domain).
 *  2. Rh is not an allocation barrier for organs.
 *  3. Avascular tissue (cornea, valves) carries no ABO barrier at all.
 */
@Service
public class OrganCompatibilityService {

    /**
     * How good a donor/recipient pairing is. Ordered worst to best, so a natural
     * comparator can rank candidates.
     */
    public enum Tier {
        INCOMPATIBLE(0, "Not compatible"),
        ABO_COMPATIBLE(1, "ABO compatible"),
        IMMUNE_PRIVILEGED(2, "No blood-group barrier"),
        EXACT(3, "Exact blood group match");

        private final int rank;
        private final String label;

        Tier(int rank, String label) {
            this.rank = rank;
            this.label = label;
        }

        public int rank() {
            return rank;
        }

        public String label() {
            return label;
        }

        public boolean usable() {
            return this != INCOMPATIBLE;
        }
    }

    /**
     * Grades a single donor against a single waitlist entry for the organ the
     * entry is waiting for.
     */
    public Tier evaluate(OrganDonor donor, WaitlistEntry recipient) {
        if (donor == null || recipient == null) {
            return Tier.INCOMPATIBLE;
        }
        return evaluate(donor.getOrgans(), donor.getBloodGroup(),
                recipient.getOrganNeeded(), recipient.getBloodGroup(), donor.committed());
    }

    /**
     * Core rule set. Extracted from the entity overloads so the tests (and the
     * donor-side "who could I help" view) can call it without building entities.
     */
    public Tier evaluate(Set<OrganType> donorOrgans, BloodGroup donorGroup,
                         OrganType organNeeded, BloodGroup recipientGroup,
                         boolean donorCommitted) {
        if (donorOrgans == null || organNeeded == null || donorGroup == null || recipientGroup == null) {
            return Tier.INCOMPATIBLE;
        }
        if (!donorCommitted) {
            return Tier.INCOMPATIBLE; // consent withdrawn, pending, or not yet verified
        }
        if (!donorOrgans.contains(organNeeded)) {
            return Tier.INCOMPATIBLE; // this donor did not pledge that organ
        }
        if (organNeeded.immunePrivileged()) {
            return Tier.IMMUNE_PRIVILEGED;
        }
        if (!donorGroup.canDonateOrganTo(recipientGroup)) {
            return Tier.INCOMPATIBLE;
        }
        return donorGroup == recipientGroup ? Tier.EXACT : Tier.ABO_COMPATIBLE;
    }

    /** Convenience predicate for the "is this pair allowed at all" question. */
    public boolean compatible(OrganDonor donor, WaitlistEntry recipient) {
        return evaluate(donor, recipient).usable();
    }

    /**
     * Candidate donors for a recipient, best match first.
     *
     * Ordering: tier (exact before ABO-compatible before immune-privileged is
     * deliberately NOT used here — a no-barrier cornea match is as good as any)
     * then by donor id, so results are deterministic and testable.
     */
    public List<OrganDonor> rankCandidates(WaitlistEntry recipient, Collection<OrganDonor> candidates) {
        return candidates.stream()
                .map(donor -> new Scored(donor, evaluate(donor, recipient)))
                .filter(scored -> scored.tier.usable())
                .sorted(Comparator.comparingInt((Scored s) -> s.tier.rank()).reversed()
                        .thenComparingLong(s -> s.donor.getId() == null ? 0L : s.donor.getId()))
                .map(Scored::donor)
                .toList();
    }

    private record Scored(OrganDonor donor, Tier tier) {
    }

    /** Donor-side view: which groups this donor's organs could be allocated to. */
    public List<BloodGroup> groupsThisDonorCanHelp(BloodGroup donorGroup) {
        return List.of(BloodGroup.values()).stream()
                .filter(donorGroup::canDonateOrganTo)
                .toList();
    }
}
