package com.medicore.organ.controller;

import com.medicore.common.dto.ApiResponse;
import com.medicore.organ.dto.OrganDtos.MetadataResponse;
import com.medicore.organ.dto.OrganDtos.Option;
import com.medicore.organ.dto.OrganDtos.StatsResponse;
import com.medicore.organ.entity.BloodGroup;
import com.medicore.organ.entity.MatchRecord;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.entity.OrganType;
import com.medicore.organ.entity.WaitlistEntry;
import com.medicore.organ.service.OrganCompatibilityService;
import com.medicore.organ.service.OrganStatsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;

/**
 * Vocabulary and rules for the organ domain. Everything the UI needs to render
 * a picker comes from here rather than being hard-coded in the frontend, which
 * keeps the two in step as the domain grows.
 */
@RestController
@RequestMapping("/api/organs")
public class OrganMetadataController {

    private final OrganStatsService statsService;

    public OrganMetadataController(OrganStatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping("/metadata")
    public ResponseEntity<ApiResponse<MetadataResponse>> metadata() {
        return ResponseEntity.ok(ApiResponse.ok(new MetadataResponse(
                Arrays.stream(OrganType.values()).map(o -> new Option(o.name(), o.getLabel())).toList(),
                Arrays.stream(BloodGroup.values()).map(g -> new Option(g.name(), g.getLabel())).toList(),
                Arrays.stream(OrganDonor.Status.values()).map(s -> new Option(s.name(), title(s.name()))).toList(),
                Arrays.stream(WaitlistEntry.Status.values()).map(s -> new Option(s.name(), title(s.name()))).toList(),
                Arrays.stream(MatchRecord.Status.values()).map(s -> new Option(s.name(), title(s.name()))).toList(),
                Arrays.stream(OrganCompatibilityService.Tier.values())
                        .map(t -> new Option(t.name(), t.label())).toList(),
                List.of(
                        new Option("ORGAN_ABO_RULE",
                                "Organs follow the donor's ABO group: O donates to anyone, AB only to AB."),
                        new Option("RH_IGNORED", "Rh factor is not an allocation barrier for organs."),
                        new Option("IMMUNE_PRIVILEGED",
                                "Corneas and tissue do not carry an ABO barrier and match any recipient."),
                        new Option("URGENCY", "Candidates are ordered by match quality, then donor id.")))));
    }

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<StatsResponse>> stats() {
        return ResponseEntity.ok(ApiResponse.ok(statsService.stats()));
    }

    private static String title(String enumName) {
        String lower = enumName.toLowerCase(java.util.Locale.ROOT).replace('_', ' ');
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
    }
}
