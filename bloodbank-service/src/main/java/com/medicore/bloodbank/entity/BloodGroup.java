package com.medicore.bloodbank.entity;

import java.util.Arrays;
import java.util.List;

/**
 * The eight ABO/Rh blood groups, plus red-cell compatibility rules.
 *
 * Compatibility lives on the enum because it is intrinsic domain knowledge of
 * this bounded context. The organ-donation service keeps its own copy on
 * purpose: microservices own their domain model rather than sharing an
 * anaemic "common" enum that would couple their release cycles.
 */
public enum BloodGroup {

    O_NEGATIVE("O-"),
    O_POSITIVE("O+"),
    A_NEGATIVE("A-"),
    A_POSITIVE("A+"),
    B_NEGATIVE("B-"),
    B_POSITIVE("B+"),
    AB_NEGATIVE("AB-"),
    AB_POSITIVE("AB+");

    private final String label;

    BloodGroup(String label) {
        this.label = label;
    }

    /** Human-readable form ("A+") used in every API response. */
    public String getLabel() {
        return label;
    }

    /** True when red cells of this group may be transfused into {@code recipient}. */
    public boolean canDonateTo(BloodGroup recipient) {
        return recipient.acceptsFrom().contains(this);
    }

    /** The groups a patient of this group may safely receive red cells from. */
    public List<BloodGroup> acceptsFrom() {
        return switch (this) {
            case O_NEGATIVE -> List.of(O_NEGATIVE);
            case O_POSITIVE -> List.of(O_POSITIVE, O_NEGATIVE);
            case A_NEGATIVE -> List.of(A_NEGATIVE, O_NEGATIVE);
            case A_POSITIVE -> List.of(A_POSITIVE, A_NEGATIVE, O_POSITIVE, O_NEGATIVE);
            case B_NEGATIVE -> List.of(B_NEGATIVE, O_NEGATIVE);
            case B_POSITIVE -> List.of(B_POSITIVE, B_NEGATIVE, O_POSITIVE, O_NEGATIVE);
            case AB_NEGATIVE -> List.of(AB_NEGATIVE, A_NEGATIVE, B_NEGATIVE, O_NEGATIVE);
            case AB_POSITIVE -> Arrays.asList(values()); // universal recipient
        };
    }
}
