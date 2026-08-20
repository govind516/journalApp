ACTIONS REQUIRED — GO LIVE CHECKLIST
=====================================

1. CLOUD SERVICE CREDENTIALS
-----------------------------
Sign up for these services and get connection strings:

[x] MongoDB Atlas (https://mongodb.com/atlas)
    - Create free M0 cluster
    - Create database user (username + password)
    - Whitelist IP address (0.0.0.0/0 for Render)
    - Copy connection string: mongodb+srv://<user>:<pass>@cluster.mongodb.net/journalApp

[ ] Upstash Redis (https://upstash.com)
    - Create free plan (no credit card needed)
    - Copy URL: rediss://... from dashboard

[ ] Aiven Kafka (https://aiven.io)
    - Create free plan (requires credit card)
    - Create topic: weekly-sentiments
    - Copy: bootstrap servers, SASL username, SASL password

[ ] Resend (https://resend.com)
    - Sign up, verify your email domain
    - Create API key
    - Copy: API key (re_xxxxx)

[ ] Google Cloud Console (https://console.cloud.google.com)
    - Enable Gmail API
    - Create OAuth 2.0 credentials
    - Add production redirect URI: https://your-app.onrender.com/auth/google/callback
    - Copy: Client ID + Client Secret

[ ] Weather API (https://weatherstack.com)
    - Sign up for free plan
    - Copy API key

[ ] Quote API (https://api-ninjas.com)
    - Sign up for free plan
    - Copy API key


2. SET UP MONGODB ATLAS
------------------------
    - Go to Atlas dashboard
    - Create database: journalApp
    - Collections will be auto-created on first run


3. SET UP UPSTASH REDIS
------------------------
    - Go to Upstash dashboard
    - Click "Create Database"
    - Copy the "Rediss URL" (not Redis URL)


4. SET UP AIVEN KAFKA (optional — can skip for MVP)
----------------------------------------------------
    - Create service
    - Create topic: weekly-sentiments
    - Download CA certificate if needed
    - Test connection from local machine first


5. SET UP RESEND EMAIL
-----------------------
    - Verify your domain (add DNS records)
    - Create API key
    - Send test email to verify it works


6. SET UP GOOGLE OAUTH
-----------------------
    - Create project in Google Cloud Console
    - Enable Gmail API
    - Create OAuth 2.0 credentials
    - Add redirect URIs:
        http://localhost:3000/auth/google/callback     (dev)
        https://your-app.onrender.com/auth/google/callback (prod)


7. SET UP RENDER BACKEND
--------------------------
    - Go to https://render.com
    - New > Web Service
    - Connect your GitHub repo
    - Settings:
        Name:       journal-app
        Region:     Oregon (or nearest)
        Runtime:    Docker
        Branch:     master
    - Environment Variables (copy from .env):
        MONGODB_URI=your-mongodb-connection-string
        MONGODB_DATABASE=journalApp
        REDIS_URL=your-upstash-url
        KAFKA_BOOTSTRAP_SERVERS=your-aiven-broker
        KAFKA_SASL_JAAS_CONFIG=org.apache.kafka.common.security.plain.PlainLoginModule required username="your-username" password="your-password";
        KAFKA_CLIENT_ID=journal-app
        GOOGLE_CLIENT_ID=your-google-client-id
        GOOGLE_CLIENT_SECRET=your-google-client-secret
        GOOGLE_REDIRECT_URI=https://your-app.onrender.com/auth/google/callback
        MAIL_USERNAME=your-email@yourdomain.com
        MAIL_PASSWORD=your-resend-api-key
        JWT_SECRET=run-openssl-rand-hex-32
        WEATHER_API_KEY=your-weatherstack-key
        QUOTE_API_KEY=your-api-ninjas-key
        CORS_ALLOWED_ORIGINS=https://your-app.onrender.com
    - Note: Don't worry about sending real emails yet —
      the scheduler sends mock emails on localhost


8. SET UP RENDER FRONTEND (Static Site)
-----------------------------------------
    - New > Static Site
    - Connect same repo
    - Build command:  cd client && npm install && npm run build
    - Publish directory: client/dist
    - Environment Variables:
        VITE_API_URL=https://your-app.onrender.com
        VITE_GOOGLE_CLIENT_ID=your-google-client-id
    - (Static sites on Render don't use .env — set via UI)


9. UPDATE GOOGLE OAUTH REDIRECT URIs
--------------------------------------
    After frontend is deployed:
    - Go to Google Cloud Console > Credentials
    - Add redirect URI: https://your-frontend.onrender.com/auth/google/callback
    - Remove localhost URIs if not needed


10. TEST END-TO-END
--------------------
    Open your frontend URL (https://your-frontend.onrender.com)
    - Sign up with email/password
    - Login
    - Create a journal entry (verify encryption in browser DevTools > Network)
    - Edit and delete entries
    - Check sentiment analysis appears
    - Test Google OAuth login
    - Check admin panel (if admin user)


11. VERIFY SECURITY (optional)
-------------------------------
    - Open browser DevTools > Network
    - Create a journal entry
    - Check request payload: title and content should be ciphertext
    - Verify no plaintext journal content in server logs
    - Verify JWT expires after 30 minutes
    - Test rate limiting: try 11 rapid login attempts


12. MONITOR
------------
    - Render dashboard: check for errors, memory usage
    - MongoDB Atlas: check connection count, storage
    - Upstash: check hit rate, memory usage
    - Aiven: check message throughput


NOTE ON KAFKA
--------------
    Kafka is optional for MVP. The scheduler will still run
    and send email notifications directly. Kafka only adds
    async processing if you need it later.


NOTE ON EMAILS
---------------
    For now, emails go to mock addresses (formatted as
    <username>@example.com). To send real emails:
    - Set up Resend
    - Verify your domain
    - Add credentials to Render environment variables


DONE!
------
    Your app should now be live and accessible at:
    https://your-frontend.onrender.com
