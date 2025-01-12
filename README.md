# Journal App

A personal journal application where users can create, update, delete, and view journal entries. The app also includes features like sentiment analysis on journal content, email notifications, and API integrations for quotes and weather.

![image](https://github.com/user-attachments/assets/1e131ff5-ced9-4e36-ab1f-011ad82eaf44)

## Features

- **User Authentication**: Secure login and role-based access (Admin/User) using JWT and Google OAuth 2.0
- **Journal Entry Management**: Users can create, update, delete, and view their journal entries.
- **Sentiment Analysis**: Analyzes the sentiment of journal entries using predefined sentiment values (HAPPY, SAD, ANGRY, ANXIOUS).
- **Email Notifications**: Sends email alerts based on the user's sentiment data or other triggers.
- **Redis Caching**: Utilizes Redis to cache data like API keys for faster access.
- **API Integrations**: Integrates with external APIs for quotes and weather information.
- **Scheduled Tasks**: Sends weekly sentiment summaries to users via Kafka or email.

## Tech Stack

- **Backend**: Spring Boot (Java)
- **Database**: MongoDB
- **Cache**: Redis
- **Message Broker**: Kafka
- **Authentication**: JWT (JSON Web Token) and Google OAuth 2.0 with Spring Security
- **Testing**: JUnit, Mockito
- **Scheduler**: Spring Scheduling
- **Email Service**: JavaMailSender
- **API documentation**: Swagger

## Requirements

- JDK 17 or higher
- Maven 3.x
- MongoDB
- Redis (For caching)
- Kafka (For message streaming)
- Spring Boot 2.x or later

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/govind516/journalApp.git
   cd journalApp
   ```

2. **Set up Kafka (optional)**:
   
   - Install and run Kafka locally or use a cloud-based service.
     
   ```bash
   kafka:
     bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS}
       properties:
         sasl.jaas.config: ${KAFKA_SASL_JAAS_CONFIG}
         sasl.mechanism: PLAIN
         security.protocol: SASL_SSL
         session.timeout.ms: 45000
         client.id: ${KAFKA_CLIENT_ID}
   ```
   
3. **Set up MongoDB, Redis and Kafka (optional)**:
   - Setup account on MongoDB Atlas and Redis Cloud.
   - Install and run Kafka locally or use a cloud-based service.
   - Ensure Both Redis and MongoDB are running with you whitelisted IP.

   ```bash
   spring:
     data:
       mongodb:
         uri=${MONGODB_URI}
         database: ${MONGODB_DATABASE}
     redis:
       url: ${REDIS_URL}
     kafka:
       bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS}
       properties:
         sasl.jaas.config: ${KAFKA_SASL_JAAS_CONFIG}
         sasl.mechanism: PLAIN
         security.protocol: SASL_SSL
         session.timeout.ms: 45000
         client.id: ${KAFKA_CLIENT_ID}
   ```
     
4. **Setup Google OAuth 2.0 for Authentication**:

   - Go to the Google Developer Console.
   - Create a new project or use an existing one.
   - Enable the Google OAuth 2.0 API.
   - Create OAuth 2.0 credentials (Client ID and Client Secret).
   - Add the client ID and secret to application-dev.yml

   ```bash
   security:
    oauth2:
      client:
        registration:
          google:
            client-id: ${GOOGLE_CLIENT_ID}
            client-secret: ${GOOGLE_CLIENT_SECRET}
   ```
    
5. **Create a .env file in the root directory and configure the following**:

   - MongoDB Atlas: Set up your MongoDB Atlas connection string and credentials.
   - Redis Cloud: Set up your Redis Cloud credentials.
   - Kafka Cloud: Set up your Kafka Cloud credentials.
   - Google OAuth 2.0: Add the necessary Google OAuth credentials.

   ```bash
   MONGODB_URI=your_mongodb_connection_string
   REDIS_URI=your_redis_connection_string
   KAFKA_BROKER=your_kafka_broker_url
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

6. **Run and Access the application**:

   If you're using Maven:

   ```bash
   mvn spring-boot:run
   ```
   
   - Open your browser and visit `http://localhost:8080`.
   - Alternatively, visit Swagger UI at `http://localhost:8080/swagger-ui/index.html`.
   - You can now start creating and managing journal entries.


# API Documentation

1. **Public APIs**

   - Sign Up - POST /public/signup  
   - Login - POST /public/login  
   - Health Check - GET /public/health-check  

2. **User APIs**

   - Get User Greetings - GET /user  
   - Update User - PUT /user  
   - Delete User - DELETE /user  

3. **Journal Entry APIs**

   - Get Journal Entry - GET /journal/id/{myId}  
   - Update Journal Entry - PUT /journal/id/{myId}  
   - Delete Journal Entry - DELETE /journal/id/{myId}  
   - Get All Journal Entries - GET /journal  
   - Create Journal Entry - POST /journal  

4. **Admin APIs**

   - Create Admin - POST /admin/create-admin  
   - Clear App Cache - GET /admin/clear-app-cache  
   - Get All Users - GET /admin/all-users  

5. **Google OAuth2 APIs**

   - Google Callback - GET /auth/google/callback
     
## Usage

### Authentication

- Users can register by providing their username and password.
- Admins can access a broader set of functionalities (e.g., viewing all users’ entries).

### Journal Entries

- Create new Journal Entries corresponding to users and then verify them.

### Sentiment Analysis

- Every journal entry is analyzed for sentiment based on predefined rules.
- Weekly sentiment summaries are sent to users via Kafka or email.

### API Integrations

- **Weather API**: Fetch weather data based on user's location.
- **Quote API**: Get inspirational quotes for the user.

## Scheduled Tasks

- Weekly, a scheduled task runs to analyze user sentiments for the last 7 days and sends an email or Kafka message.

## Contributing

Feel free to fork this project and submit pull requests. Please ensure your contributions follow the project's coding style and that tests are included for new features.

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

You can customize the sections according to your app's features, configurations, and other details.
