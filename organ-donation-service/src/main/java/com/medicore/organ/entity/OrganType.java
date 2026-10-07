package com.medicore.organ.entity;

/**
 * Organs and tissues that can be pledged and allocated.
 *
 * {@code bloodGroupBarrier} encodes a real clinical distinction: vascularised
 * organs carry donor ABO antigens and must be matched, while avascular tissues
 * such as corneas and heart valves are effectively immune-privileged and can be
 * transplanted across any blood group. The matching engine reads this flag, so
 * the difference is data rather than a hard-coded special case.
 */
public enum OrganType {

    KIDNEY("Kidney", true),
    LIVER("Liver", true),
    HEART("Heart", true),
    LUNGS("Lungs", true),
    PANCREAS("Pancreas", true),
    BONE_MARROW("Bone marrow", true),
    CORNEA("Cornea", false),
    TISSUES("Tissue & valves", false);

    private final String label;
    private final boolean bloodGroupBarrier;

    OrganType(String label, boolean bloodGroupBarrier) {
        this.label = label;
        this.bloodGroupBarrier = bloodGroupBarrier;
    }

    public String getLabel() {
        return label;
    }

    /** True when a donor/recipient blood-group match is required for this organ. */
    public boolean hasBloodGroupBarrier() {
        return bloodGroupBarrier;
    }

    /** Avascular tissue: no ABO barrier, so any donor matches any recipient. */
    public boolean immunePrivileged() {
        return !bloodGroupBarrier;
    }
}
