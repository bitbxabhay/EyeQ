Build a complete full-stack AI-powered eye health screening platform called “EyeCare AI”. The platform should be designed as an early screening and triage tool, not a medical diagnosis or prescription system.
1. User Interface
Create a modern, responsive healthcare dashboard with:
Home page
User registration/login
Patient profile
Eye screening page
Live webcam page
Vision test page
AI analysis page
Results/risk dashboard
Eye health report
Doctor directory
Appointment booking
Screening history
Use a clean medical UI with accessible typography and clear Low/Medium/High risk indicators.
2. Webcam Eye Detection
Use the user's webcam to perform real-time:
Face detection
Left/right eye detection
Eye localization
Iris/pupil localization
Blink detection
Basic gaze/eye-position tracking
Distance/position guidance
Show live instructions such as:
“Move closer”
“Move farther away”
“Look straight”
“Keep your eyes open”
“Hold still”
“Good position — start test”
The webcam must not be represented as a retinal/fundus camera.
3. Calibrated Vision Screening
Create an interactive visual-acuity screening module.
Before testing:
Detect/ask for screen size
Calibrate viewing distance
Use the webcam to help verify user position
Display standardized optotypes/letters at controlled visual angles
Gradually change the displayed symbol size and record the user's responses.
Calculate a preliminary visual-acuity screening result.
Do NOT claim that this test alone provides an exact spectacle prescription.
4. Refractive Error Screening
Add a separate module for possible:
Myopia
Hyperopia
Astigmatism
Use the visual-screening results and, where appropriate, additional user-entered/refraction-device measurements.
Display results such as:
“Possible refractive error detected.”
If sufficient validated refraction measurements are available, allow an estimated SPH/CYL result to be displayed, clearly labeled as an estimate requiring professional confirmation.
Never invent an exact prescription from webcam data alone.
5. Retinal AI Module
Add an optional retinal-image module that accepts a fundus/retinal image from:
A compatible retinal/fundus camera
An uploaded image
Do NOT pretend that a normal webcam captures a true retinal image.
Preprocess the retinal image and use a deep-learning model for research/prototype screening of conditions such as:
Diabetic retinopathy
Glaucoma-related abnormalities
Age-related macular degeneration
Start with one disease if a complete multi-disease model is not available.
Display:
Prediction
Confidence
Low/Medium/High risk
Image-quality warning
Explainable AI heatmap using Grad-CAM or a similar method
Clearly label the output as AI-assisted screening, not diagnosis.
6. AI Risk Engine
Combine available information:
Webcam screening
+
Vision test
+
Patient questionnaire
+
Optional retinal analysis
+
Optional refraction measurements
Create a transparent risk-assessment system.
Show:
Overall screening status
Risk level
Factors contributing to the result
Recommended next step
Do not claim that the AI can definitively diagnose disease.
7. Explainable AI
Provide an explanation section:
Screening Result
↓
Main contributing factors
↓
AI confidence
↓
Recommended follow-up
For retinal images, show the relevant heatmap over the image.
8. Doctor Connection
Create a doctor directory containing demo/verified placeholder doctors for the prototype.
Allow users to filter by:
Ophthalmologist
Optometrist
Retina specialist
Location
Each profile should contain:
Name
Specialty
Clinic/hospital
Available slots
Consultation type
Contact/appointment button
Add appointment booking:
Select Doctor
→ Select Date
→ Select Time
→ Confirm Appointment
9. Eye Health Report
Generate a downloadable report containing:
Patient information
Date/time
Vision screening result
Refractive-error screening result
Retinal AI result, if performed
Risk level
AI explanation
Heatmap, if available
Recommendation
Doctor appointment information
Clearly state:
“This platform provides AI-assisted screening and does not replace examination by a qualified eye-care professional.”
10. Backend
Build a secure backend using Python + FastAPI.
Create APIs for:
Authentication
Patient profiles
Screening sessions
Webcam/vision-test results
Retinal image upload
AI inference
Reports
Doctors
Appointments
Use PostgreSQL for persistent data.
11. AI/Computer Vision
Use:
OpenCV
MediaPipe or equivalent for face/eye landmarks
PyTorch or TensorFlow for deep learning
Grad-CAM for explainability
Structure the AI code so the retinal model can be replaced with a properly trained model later.
12. Frontend
Use:
React
Modern responsive CSS
Webcam API
Interactive charts
Clear medical dashboard
Create reusable components for:
Webcam viewer
Eye landmarks
Vision-test chart
Risk card
AI analysis
Doctor card
Appointment calendar
Report preview
13. Database
Create tables for:
Users
Patients
ScreeningSessions
VisionResults
RetinalAnalyses
Doctors
Appointments
Reports
14. Important technical requirements
Do not use fake AI predictions.
If an actual trained model is unavailable, clearly create a mock/demo inference layer and mark it as DEMO.
Do not claim webcam retinal imaging.
Do not claim exact spectacle prescription from webcam-only testing.
Include image-quality validation before retinal analysis.
Protect patient data.
Do not store webcam video unless explicitly required.
Use synthetic/demo patient data during development.
Make the architecture modular so real clinical models/devices can be integrated later.
15. Final workflow
User Login
     ↓
Patient Profile
     ↓
Webcam Eye Detection
     ↓
Position + Distance Check
     ↓
Calibrated Vision Screening
     ↓
Refractive Error Screening
     ↓
Optional Retinal Image
     ↓
Retinal AI Analysis
     ↓
Explainable AI
     ↓
Overall Screening Report
     ↓
Doctor Recommendation
     ↓
Appointment Booking
Build the project as a working prototype with clean folder structure, complete frontend/backend code, database schema, API documentation, setup instructions, sample data, and a README explaining how every module works.