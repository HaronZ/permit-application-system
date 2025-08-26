# Dipolog City Permit Application System (Enhanced MVP)

A modern, user-friendly permit application system built with Next.js 14, Supabase, and Tailwind CSS. Features real-time status tracking, document uploads, payment processing, and comprehensive admin management.

## ✨ Key Features

### 🎨 **Enhanced UI/UX**
- **Modern Design System**: Clean, professional interface with consistent styling
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Dark/Light Mode Ready**: Built with design tokens for easy theming
- **Smooth Animations**: Subtle transitions and micro-interactions
- **Accessibility**: WCAG compliant with proper ARIA labels and keyboard navigation

### 📱 **User Experience**
- **Drag & Drop File Upload**: Intuitive document upload with preview
- **Real-time Notifications**: Toast notifications for user feedback
- **Loading States**: Skeleton loaders and progress indicators
- **Form Validation**: Client and server-side validation with helpful error messages
- **Search & Filter**: Advanced filtering and search capabilities

### 🔧 **Technical Improvements**
- **Type Safety**: Full TypeScript implementation
- **Performance**: Optimized queries, lazy loading, and efficient state management
- **Security**: Enhanced validation, sanitization, and audit logging
- **Scalability**: Database indexes, connection pooling, and caching strategies

## 🚀 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Lucide React** - Icon library
- **React Hot Toast** - Toast notifications
- **React Dropzone** - File upload handling

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Real-time subscriptions
  - Row Level Security (RLS)
  - File storage
  - Authentication
- **Next.js API Routes** - Serverless functions

### External Services
- **Xendit** - Payment processing (GCash/PayMaya)
- **SemaphorePH** - SMS notifications

### Security & Monitoring
- **Rate Limiting** - API and login attempt protection
- **Input Validation** - Comprehensive sanitization and validation
- **XSS Protection** - Content Security Policy and input escaping
- **CSRF Protection** - Token-based request validation
- **Performance Monitoring** - Real-time metrics and error tracking
- **System Health Checks** - Database, storage, and auth monitoring

## 📋 Permit Types

1. **Business Permit**
   - New business registration
   - Annual renewal
   - Business expansion

2. **Building Permit**
   - New construction
   - Renovation projects
   - Structural changes

3. **Barangay Clearance**
   - Residency clearance
   - Good moral character certificate
   - Local requirements

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (Supabase)    │◄──►│   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   File Storage  │    │   Authentication│    │   Audit Logs    │
│   (Supabase)    │    │   (Supabase)    │    │   (PostgreSQL)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔒 Security Features

### Authentication & Authorization
- **Multi-factor Authentication**: Email verification and OAuth providers
- **Session Management**: Secure session handling with automatic refresh
- **Role-based Access**: Admin and user role separation
- **Password Security**: Strong password requirements with strength validation

### API Security
- **Rate Limiting**: Configurable rate limits for API endpoints and login attempts
- **Input Validation**: Comprehensive validation using Zod schemas
- **SQL Injection Prevention**: Parameterized queries and input sanitization
- **XSS Protection**: Content Security Policy and input escaping
- **CSRF Protection**: Token-based request validation

### File Upload Security
- **Type Validation**: Restricted file types (PDF, images, documents)
- **Size Limits**: Configurable maximum file sizes
- **Virus Scanning**: Integration ready for malware detection
- **Secure Storage**: Files stored in Supabase with access controls

### Monitoring & Logging
- **Performance Monitoring**: Real-time API response times and error rates
- **Error Tracking**: Comprehensive error logging with stack traces
- **Audit Logging**: Complete audit trail for all user actions
- **Health Checks**: System health monitoring for database, storage, and auth
- **Security Alerts**: Automated alerts for suspicious activities

## 📊 Performance Monitoring

### Real-time Metrics
- **API Response Times**: Average and percentile response times
- **Error Rates**: Error percentage and trend analysis
- **Request Volume**: Total requests and peak usage tracking
- **System Resources**: Memory usage and CPU utilization

### Health Monitoring
- **Database Connectivity**: Real-time database health checks
- **Storage Status**: File storage availability monitoring
- **Authentication Service**: Auth provider status tracking
- **External Services**: Payment and SMS service health

### Admin Dashboard
- **Performance Dashboard**: Real-time metrics visualization
- **Error Logs**: Recent errors with detailed information
- **System Status**: Overall system health indicators
- **User Activity**: Recent user interactions and patterns

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Git

### 1. Clone and Install
```bash
git clone <repository-url>
cd permit-application-system
npm install
```

### 2. Environment Setup
Copy `.env.example` to `.env.local` and configure:

#### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# External Services
XENDIT_SECRET_KEY=your_xendit_secret_key
SEMAPHORE_API_KEY=your_semaphore_api_key

# Security & Monitoring
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
ENABLE_MONITORING=true
MONITORING_ENDPOINT=https://your-monitoring-service.com/api/metrics
```

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Payment Processing (Xendit)
XENDIT_API_KEY=your_xendit_api_key
XENDIT_WEBHOOK_SECRET=your_webhook_secret

# SMS Notifications (SemaphorePH)
SEMAPHORE_API_KEY=your_semaphore_api_key
SEMAPHORE_SENDER=your_sender_name
```

### 3. Database Setup
1. Create a new Supabase project
2. Create a storage bucket named `documents`
3. Run the database migration:
   ```sql
   -- Copy and run the contents of supabase/migrations/001_init.sql
   ```

### 4. Development
```bash
npm run dev
```
Open http://localhost:3000

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── apply/             # Application forms
│   ├── dashboard/         # User dashboard
│   ├── admin/             # Admin panel
│   └── applications/      # Application details
├── components/            # Reusable components
│   ├── ui/               # Base UI components
│   └── ...               # Feature components
├── lib/                  # Utility libraries
│   ├── auth.ts           # Authentication helpers
│   ├── supabaseClient.ts # Supabase client
│   └── ...               # Other utilities
└── styles/               # Global styles
```

## 🎯 Key Components

### UI Components
- **Button** - Multiple variants with loading states
- **Input** - Form inputs with validation
- **Card** - Content containers
- **StatusBadge** - Application status indicators
- **FileUpload** - Drag & drop file upload
- **ToastProvider** - Notification system

### Pages
- **Home** - Landing page with permit types
- **Apply** - Application forms with validation
- **Dashboard** - User's application overview
- **Admin** - Administrative management panel

## 🔐 Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Input Validation** - Client and server-side validation
- **Audit Logging** - Complete change tracking
- **File Upload Security** - Type and size validation
- **Authentication** - Secure user sessions

## 📊 Database Schema

### Core Tables
- **applicants** - User information
- **applications** - Permit applications
- **documents** - Uploaded files
- **payments** - Payment records
- **audit_logs** - System audit trail

### Key Features
- **Generated Reference Numbers** - Auto-generated application IDs
- **Status Tracking** - Application lifecycle management
- **File Management** - Secure document storage
- **Payment Integration** - Multiple payment methods

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository
2. Configure environment variables
3. Deploy automatically on push

### Manual Deployment
```bash
npm run build
npm start
```

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

### Code Quality
- **ESLint** - Code linting
- **TypeScript** - Type checking
- **Prettier** - Code formatting
- **Husky** - Git hooks (optional)

## 📈 Performance Optimizations

- **Database Indexes** - Optimized queries
- **Image Optimization** - Next.js Image component
- **Code Splitting** - Automatic bundle optimization
- **Caching** - Static generation and ISR
- **Lazy Loading** - Component and route splitting

## 🔄 API Endpoints

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `PUT /api/applications/[id]/status` - Update status

### Documents
- `POST /api/documents/upload` - Upload files
- `GET /api/documents/[id]` - Get document

### Payments
- `POST /api/payments/checkout` - Create payment
- `POST /api/webhooks/xendit` - Payment webhook

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- **Mobile App** - React Native application
- **Advanced Analytics** - Dashboard with charts
- **Multi-language Support** - Internationalization
- **Advanced Workflows** - Custom approval processes
- **Integration APIs** - Third-party system integration

---

**Built with ❤️ for Dipolog City Government**
