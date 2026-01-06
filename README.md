# 🏥 Clinic Management System

A comprehensive, multi-tenant clinic management system built with Next.js 15, TypeScript, MongoDB, and shadcn/ui. Features complete patient management, appointments, billing, prescriptions, inventory tracking, and advanced email notifications.

## ✨ Key Features

### 📧 Email Notification System
- **14 Configurable Email Types** with enable/disable toggles
  - Patient emails (Welcome, Prescription, Medical Record)
  - Appointment emails (Confirmation, Reminder, Cancellation, Reschedule)
  - User/Auth emails (Welcome, Password Reset, Password Changed)
  - Inventory emails (Low Stock, Expiry, Purchase Order, Stock Received)
- **Email Settings Dashboard** for granular control
- **Custom Email Composer** for bulk communications
- **Permission-based Access Control**

### 🏥 Patient Management
- Complete patient registration and profiles
- Medical history tracking
- Prescription management with print capability
- Doctor signature on prescriptions
- Patient search and filtering
- Emergency contact management

### 📅 Appointment System
- Full appointment scheduling
- Doctor availability management
- Public booking portal for patients
- Appointment status tracking (Scheduled, Completed, Cancelled, No-show)
- Email notifications for all appointment events
- Calendar integration

### 💊 Prescription Management
- Create and manage prescriptions
- Print professional prescription layouts
- Email prescriptions to patients
- Track dispensed status
- Doctor signature integration
- Medication tracking with dosage, frequency, and duration

### 💰 Billing & Invoicing
- Point of Sale (POS) system
- Product search and selection
- Tax calculation (GST, VAT, etc.)
- Multiple payment methods
- Payment gateway integration (Razorpay)
- Invoice generation and printing
- Revenue tracking and reporting

### 📦 Inventory Management
- Product catalog management
- Stock level tracking
- Low stock alerts
- Supplier management
- Stock movements tracking
- Product categories
- Expiry date monitoring

### 📊 Dashboard & Analytics
- Real-time metrics and KPIs
- Patient growth tracking (month-over-month)
- Revenue analytics with trend indicators
- Today's appointments overview
- Recent activity feed
- Low stock alerts
- Quick action shortcuts

### 💬 Communications Hub
- Send custom emails to patients
- Send custom emails to suppliers
- Bulk or selective recipient targeting
- Professional HTML email templates
- Email history tracking

### 🔐 Security & Multi-tenancy
- Complete multi-tenant architecture
- Role-based access control (RBAC)
- Secure authentication with NextAuth
- Tenant data isolation
- Permission-based feature access

### 🌍 Multi-Country Support
- India (GST)
- UAE (VAT)
- Philippines (VAT)
- Kenya (VAT)
- Configurable tax rates and codes
- Country-specific compliance features

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **UI Components**: shadcn/ui + Tailwind CSS
- **Email**: Nodemailer
- **Payment**: Razorpay integration
- **Date Handling**: date-fns
- **Form Validation**: react-hook-form
- **Notifications**: sonner (toast notifications)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/saurabhwebdev/thevibecompanyClinicSoftware.git
cd thevibecompanyClinicSoftware
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update the `.env` file with your values:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com

# App
NEXT_PUBLIC_APP_NAME=Clinic Management System
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Run the development server**
```bash
npm run dev
```

5. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📧 Email Configuration

### Setting up Gmail SMTP

1. **Enable 2-Step Verification** in your Google Account
2. **Generate App Password**:
   - Go to Google Account → Security
   - Under "2-Step Verification", select "App passwords"
   - Generate a new app password for "Mail"
3. **Update .env file** with your email and app password

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_digit_app_password
EMAIL_FROM=your_email@gmail.com
```

### Managing Email Notifications

Configure which emails to send in:
**Dashboard → Settings → Email Notification Settings**

Each email type can be individually enabled or disabled.

## 🎯 Getting Started

### First Time Setup

1. **Register a new organization**
   - Go to `/register`
   - Create your organization account
   - The first user becomes the Admin

2. **Configure Settings**
   - Navigate to Settings
   - Set up your clinic details
   - Configure tax settings for your country
   - Upload doctor signature for prescriptions
   - Configure email notification preferences

3. **Add Doctors (Optional)**
   - If you have multiple doctors, add them under Users
   - Assign appropriate roles and permissions

4. **Start Using**
   - Register patients
   - Schedule appointments
   - Create prescriptions
   - Manage inventory
   - Generate invoices

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication pages
│   ├── (dashboard)/         # Dashboard and main features
│   └── api/                 # API routes
├── components/
│   ├── dashboard/           # Dashboard components
│   ├── settings/            # Settings forms
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── auth/                # Authentication logic
│   ├── db/                  # Database connection
│   ├── email/               # Email templates and sender
│   └── tax/                 # Tax calculation by country
└── models/                  # MongoDB schemas
```

## 🔒 Security Features

- Secure password hashing with bcrypt
- Session-based authentication
- Role-based access control (RBAC)
- Tenant data isolation
- Input validation and sanitization

## 🚀 Deployment

### Vercel (Recommended)

1. **Push your code to GitHub** (Already done!)
   - Repository: https://github.com/saurabhwebdev/thevibecompanyClinicSoftware

2. **Sign in to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

3. **Import your repository**
   - Click "Add New" → "Project"
   - Select "thevibecompanyClinicSoftware" from your GitHub repositories
   - Click "Import"

4. **Configure your project**
   - Framework Preset: Next.js (should auto-detect)
   - Root Directory: ./
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

5. **Add environment variables**
   Click "Environment Variables" and add the following:

   ```
   MONGODB_URI=mongodb+srv://fretsoindia_db_user:25687618@fretsocluster.zmc7caw.mongodb.net/clinicsoft
   NEXTAUTH_URL=https://your-app-name.vercel.app
   NEXTAUTH_SECRET=a3f1d2fc4e554e2e3b1fe80ed485119f53c97291eaa176de16b660c066fad6c9
   JWT_SECRET=85fa3f4ad1976626350f1449717b50eb5db5748be06b0b36c0218047ac5b8021
   JWT_EXPIRES_IN=7d
   NEXT_PUBLIC_APP_NAME=Clinic Management System
   NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
   NEXT_PUBLIC_APP_ENV=production
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=worlddj0@gmail.com
   SMTP_PASSWORD=uszdlnkoxobyunve
   EMAIL_FROM=worlddj0@gmail.com
   ```

   **Important**: After deployment, update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with your actual Vercel deployment URL.

6. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (2-5 minutes)
   - Once deployed, click "Visit" to view your live application

7. **Post-Deployment Steps**
   - Copy your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with your actual deployment URL
   - Redeploy from the Deployments tab

8. **Verify Deployment**
   - Visit your application URL
   - Test user registration
   - Test email sending functionality
   - Verify database connection is working

### Important Notes

- MongoDB Atlas connection is already configured in the environment variables
- Ensure your MongoDB Atlas cluster allows connections from all IPs (0.0.0.0/0) or add Vercel's IP ranges
- Email functionality requires Gmail App Password (already configured)
- First user registration will create the admin account

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ❤️ by The Vibe Company**

🤖 *Developed with assistance from [Claude Code](https://claude.com/claude-code)*
