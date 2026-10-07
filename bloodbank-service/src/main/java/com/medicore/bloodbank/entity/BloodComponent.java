package com.medicore.bloodbank.entity;

/** Separated blood components a blood bank holds and issues. */
public enum BloodComponent {

    WHOLE_BLOOD("Whole blood", 35),
    RED_CELLS("Packed red cells", 42),
    PLASMA("Fresh frozen plasma", 365),
    PLATELETS("Platelet concentrate", 5),
    CRYO("Cryoprecipitate", 365);

    private final String label;
    private final int shelfLifeDays;

    BloodComponent(String label, int shelfLifeDays) {
        this.label = label;
        this.shelfLifeDays = shelfLifeDays;
    }

    public String getLabel() {
        return label;
    }

    /** Typical storage shelf life — used to flag lots that are about to expire. */
    public int getShelfLifeDays() {
        return shelfLifeDays;
    }
}
