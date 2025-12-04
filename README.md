# Comprehensive POS System

## Project Overview

This is a fully-featured Point of Sale (POS) system built with modern web technologies. The system includes all essential modules for running a retail business.

## Key Features Implemented

### Core POS Functionality
- **Sales Management**: Process sales transactions with customer selection, discounts, and multiple payment methods
- **Product Management**: Complete inventory system with categories, stock tracking, and barcode support
- **Customer Management**: Customer database with loyalty programs and purchase history
- **Transaction History**: Complete record of all sales transactions

### Financial Management
- **Expense Tracking**: Monitor business expenses with categorization and payment methods
- **Debt Management**: Track customer and supplier debts
- **Settlements**: Manage customer and supplier payments
- **Discount Management**: Create and manage promotional discounts and coupon codes
- **Financial Reporting**: Analytics and reports on business performance

### Supply Chain Management
- **Supplier Management**: Maintain supplier database and relationships
- **Purchase Orders**: Create and track purchase orders
- **Inventory Audit**: Track discrepancies and manage inventory adjustments

### Human Resources & Security
- **Employee Management**: User roles, permissions, and access control
- **Access Logs**: Monitor all system activities and user actions
- **Role-Based Access**: Different permission levels for different user types

### Additional Features
- **Returns & Damages**: Handle product returns and damaged inventory
- **Inventory Tracking**: Real-time stock levels and low stock alerts
- **Multi-Device Support**: Responsive design for desktops, tablets, and mobile devices

## Sales Permission System

This POS system implements a restricted sales access system that only allows authorized personnel to register sales:

### Key Features
- **Role-Based Access Control**: Only users with roles 'salesman' or 'admin' can create sales
- **Database-Level Security**: Row Level Security (RLS) policies in Supabase enforce access control
- **Automatic User Association**: All sales are automatically linked to the creating user
- **Comprehensive Documentation**: Implementation details in `SALES_PERMISSION_IMPLEMENTATION.md`

### Implementation
1. RLS policies in `RESTRICTED_SALES_RLS_POLICIES.sql` restrict database access
2. Application-level authentication ensures only authorized users can access sales functions
3. Utility functions in `src/utils/salesPermissionUtils.ts` provide permission checking

For detailed implementation information, see [SALES_PERMISSION_IMPLEMENTATION.md](SALES_PERMISSION_IMPLEMENTATION.md).

## Supabase Integration

This project now includes Supabase integration for real-time data persistence and authentication. To set up Supabase:

1. Create a Supabase account at [supabase.com](https://supabase.com/)
2. Create a new project in your Supabase dashboard
3. Copy your project's URL and anon key from the project settings
4. Create a `.env` file in the root of your project with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```
5. Refer to `.env.example` for a template
6. Follow the database setup instructions in [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

For a complete schema with all tables and relationships, use the [SUPABASE_COMPLETE_SCHEMA.sql](SUPABASE_COMPLETE_SCHEMA.sql) file.

The Supabase client is configured in `src/lib/supabaseClient.ts` and can be imported anywhere in your application.

### Authentication

The POS system now supports Supabase authentication:
- User sign up, sign in, and sign out
- Session management
- Protected routes
- Password reset functionality

Authentication is handled through:
- `src/contexts/AuthContext.tsx` - Authentication context provider
- `src/services/authService.ts` - Authentication service functions
- `src/components/ProtectedRoute.tsx` - Component to protect routes
- `src/components/LoginForm.tsx` - Updated login form with Supabase integration

## Deployment

### Deploy to Netlify (Recommended)

#### Option 1: Using Netlify CLI (Automated Deployment)
1. Install Netlify CLI globally:
   ```bash
   npm install -g netlify-cli
   ```
2. Login to your Netlify account:
   ```bash
   netlify login
   ```
3. Deploy your site:
   ```bash
   netlify deploy --prod
   ```

#### Option 2: Manual Deployment
1. Build your project:
   ```bash
   npm run build
   ```
2. Drag and drop the `dist` folder to your Netlify dashboard

#### Option 3: Using Deployment Scripts
- On Windows: Run `deploy.bat`
- On macOS/Linux: Run `deploy.sh`

### Environment Variables for Production
When deploying to Netlify, make sure to set the following environment variables in your Netlify project settings:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

## Project info

**URL**: https://your-business-pos-url.com

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite (Build tool and development server)
- TypeScript (Typed superset of JavaScript)
- React (Frontend library for building user interfaces)
- shadcn-ui (Accessible and customizable UI components)
- Tailwind CSS (Utility-first CSS framework)
- React Router (Declarative routing for React)
- React Query (Data fetching and state management)
- Lucide React (Beautiful SVG icons)
- Recharts (Charting library for React)

## How can I deploy this project?

You can deploy this project using services like:
- Vercel
- Netlify
- GitHub Pages
- Any static hosting provider

## Can I connect a custom domain to my project?

Yes, you can!

To connect a domain with services like Netlify or Vercel, you typically need to:
1. Purchase a domain from a registrar
2. Update your DNS settings to point to your hosting provider
3. Configure domain settings in your hosting dashboard

Read more in your hosting provider's documentation for specific instructions.

## Future Enhancements

This POS system can be further enhanced with:
- Barcode scanner support
- Receipt printing functionality
- Multi-location support
- Advanced reporting and analytics
- Mobile app companion
- API integration with payment processors