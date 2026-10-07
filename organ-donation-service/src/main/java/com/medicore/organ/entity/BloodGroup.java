package com.medicore.organ.entity;

/**
 * The eight ABO/Rh blood groups, with the ABO rules that apply to ORGAN donation.
 *
 * This is deliberately NOT the red-cell transfusion rule set (see the
 * bloodbank-service for that). For a solid-organ transplant the donor organ
 * carries ABO antigens, so the direction reverses:
 *
 *   blood transfusion (red cells):  O- is the universal DONOR
 *   organ donation:                 O  is the universal DONOR, AB may only donate to AB
 *
 * Rh factor is not a barrier for organ allocation, so it is ignored here.
 * Keeping this in the organ domain — instead of importing the blood bank's
 * rules — is what stops the two bounded contexts from silently diverging.
 */
public enum BloodGroup {

    O_NEGATIVE("O-", AboType.O, false),
    O_POSITIVE("O+", AboType.O, true),
    A_NEGATIVE("A-", AboType.A, false),
    A_POSITIVE("A+", AboType.A, true),
    B_NEGATIVE("B-", AboType.B, false),
    B_POSITIVE("B+", AboType.B, true),
    AB_NEGATIVE("AB-", AboType.AB, false),
    AB_POSITIVE("AB+", AboType.AB, true);

    private final String label;
    private final AboType aboType;
    private final boolean rhPositive;

    BloodGroup(String label, AboType aboType, boolean rhPositive) {
        this.label = label;
        this.aboType = aboType;
        this.rhPositive = rhPositive;
    }

    /** ABO system, which is what governs organ allocation. */
    public enum AboType {
        O, A, B, AB;

        /** Direction matters: this is about the DONOR's group, not the recipient's. */
        public boolean canDonateOrganTo(AboType recipient) {
            return switch (this) {
                case O -> true;                                   // universal donor
                case A -> recipient == A || recipient == AB;
                case B -> recipient == B || recipient == AB;
                case AB -> recipient == AB;                       // only compatible with itself
            };
        }

        public String label() {
            return name();
        }
    }

    public String getLabel() {
        return label;
    }

    public AboType aboType() {
        return aboType;
    }

    public boolean isRhPositive() {
        return rhPositive;
    }

    /** Rh is not an allocation barrier for organs — only the ABO letter is. */
    public boolean canDonateOrganTo(BloodGroup recipient) {
        return aboType.canDonateOrganTo(recipient.aboType);
    }
}
