# Runs the prebuilt Spring Boot jar (CI/build step produces target/*.jar first):
#   mvn -B -DskipTests clean package
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Run as non-root user (container security basic)
RUN addgroup -S medicore && adduser -S medicore -G medicore
USER medicore

COPY target/*.jar app.jar

EXPOSE 8086

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
