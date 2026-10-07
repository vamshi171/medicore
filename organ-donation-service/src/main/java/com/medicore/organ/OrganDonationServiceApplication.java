package com.medicore.organ;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.medicore.organ", "com.medicore.common"})
public class OrganDonationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(OrganDonationServiceApplication.class, args);
    }
}
