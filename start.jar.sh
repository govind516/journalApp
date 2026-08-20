#!/bin/bash
# Start script for Render JAR deployment
# Usage: bash start.jar.sh

set -e

# Default values if env vars not set
JAR_FILE="target/journalApp-0.0.1-SNAPSHOT.jar"

# Check if JAR exists
if [ ! -f "$JAR_FILE" ]; then
    echo "ERROR: $JAR_FILE not found. Run mvn clean package -DskipTests first."
    exit 1
fi

# Run the application with environment variables
exec java -jar "$JAR_FILE" \
  -Dspring.data.mongodb.uri="${MONGODB_URI}" \
  -Dspring.data.mongodb.database="${MONGODB_DATABASE}" \
  -Dspring.redis.url="${REDIS_URL}" \
  -Dspring.kafka.bootstrap-servers="${KAFKA_BOOTSTRAP_SERVERS}" \
  -Dspring.kafka.properties.sasl.jaas.config="${KAFKA_SASL_JAAS_CONFIG}" \
  -Dspring.kafka.client-id="${KAFKA_CLIENT_ID}" \
  -Dspring.security.oauth2.client.registration.google.client-id="${GOOGLE_CLIENT_ID}" \
  -Dspring.security.oauth2.client.registration.google.client-secret="${GOOGLE_CLIENT_SECRET}" \
  -Dgoogle.redirect-uri="${GOOGLE_REDIRECT_URI}" \
  -Dspring.mail.username="${MAIL_USERNAME}" \
  -Dspring.mail.password="${MAIL_PASSWORD}" \
  -Djwt.secret="${JWT_SECRET}" \
  -DApiKey.weather="${WEATHER_API_KEY}" \
  -DApiKey.quote="${QUOTE_API_KEY}" \
  -Dcors.allowed-origins="${CORS_ALLOWED_ORIGINS}" \
  --spring.main.allow-circular-references=true