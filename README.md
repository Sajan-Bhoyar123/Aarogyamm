# Aarogyam - Healthcare Management System

A comprehensive healthcare management system that connects patients with doctors for appointments, medical reports, prescriptions, and billing.

## Features

### Patient Features
- Book appointments with doctors
- View upcoming, today's, and past appointments
- Access medical records and prescriptions
- View billing information and make payments
- Calendar view of appointments

### Doctor Features
- Manage appointment availability
- **Time-based appointment management** (NEW)
- Accept or reject appointments before appointment time
- Add medical reports, prescriptions, and billing after appointment time
- View patient health records
- Generate medical certificates
- Calendar view of appointments

## Time-Based Appointment Management System

### How It Works

The system now implements a strict time-based workflow for appointment management:

#### Before Appointment Time
- **Pending Appointments**: Doctors can only **Accept** or **Reject** appointments
- **Time Validation**: Once the appointment time passes, doctors can no longer accept/reject pending appointments
- **Status Tracking**: All status changes are timestamped

#### After Appointment Time
- **Confirmed Appointments**: Doctors can add/edit medical reports, prescriptions, and billing
- **Time Validation**: Doctors can only add medical details after the appointment time has passed
- **Status Requirements**: Only confirmed appointments allow medical detail entry

### Appointment Status Flow

1. **Pending** → Patient books appointment
2. **Confirmed** → Doctor accepts appointment (before appointment time)
3. **Rejected** → Doctor rejects appointment (before appointment time)
4. **Completed** → After appointment time, doctor adds medical details

### Technical Implementation

#### Database Changes
- Added `rejected` status to appointment enum
- Added `statusUpdatedAt` field to track when status was last changed

#### Utility Functions
- `isAppointmentTimePassed()`: Checks if appointment time has elapsed
- `canDoctorAcceptReject()`: Validates if doctor can accept/reject
- `canDoctorAddReports()`: Validates if doctor can add medical details

#### Controller Updates
- Time-based validation in all appointment management functions
- New `rejectAppointment` function
- Enhanced error messages for time violations

#### UI Improvements
- Dynamic action buttons based on appointment status and time
- Warning messages for time violations
- Color-coded status indicators
- Modal confirmations for accept/reject actions

## Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Start the server: `npm start`

## Environment Variables

Create a `.env` file with the following variables:
```
ATLASDB_URL=your_mongodb_atlas_url
SECRET=your_session_secret
RZP_KEY_ID=your_razorpay_key_id
RZP_KEY_SECRET=your_razorpay_secret
TOGETHER_API_KEY=your_together_ai_key
```

## Usage

### For Patients
1. Register/Login as a patient
2. Search for doctors by city/specialization
3. Book appointments with available time slots
4. View appointment status and medical details

### For Doctors
1. Register/Login as a doctor
2. Set availability schedule
3. Manage appointments:
   - **Before appointment time**: Accept or reject pending appointments
   - **After appointment time**: Add medical reports, prescriptions, and billing
4. View patient health records

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose
- **Frontend**: EJS templates, Bootstrap
- **Authentication**: Passport.js
- **File Upload**: Multer, Cloudinary
- **Payment**: Razorpay
- **AI Chat**: Together AI

## License

ISC 
