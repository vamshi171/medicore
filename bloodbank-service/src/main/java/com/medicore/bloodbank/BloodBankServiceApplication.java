package com.medicore.bloodbank;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.medicore.bloodbank", "com.medicore.common"})
public class BloodBankServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(BloodBankServiceApplication.class, args);
    }
}
