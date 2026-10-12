package com.ddas.api.security;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class GenerateAdminPasswords {

    public static void main(String[] args) {

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        String superAdminPassword = "SuperAdmin@123";
        String adminPassword = "Admin@123";

        System.out.println("SUPER ADMIN");
        System.out.println("Password: " + superAdminPassword);
        System.out.println("Hash: " + encoder.encode(superAdminPassword));

        System.out.println();

        System.out.println("ADMIN");
        System.out.println("Password: " + adminPassword);
        System.out.println("Hash: " + encoder.encode(adminPassword));
    }
}