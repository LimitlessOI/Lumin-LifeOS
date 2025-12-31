# 🔍 How to Find DATABASE_URL from Railway

## **Step-by-Step Guide:**

### **Method 1: Railway Dashboard (Easiest)**

1. **Go to Railway Dashboard**
   - Visit: https://railway.app
   - Log in to your account

2. **Select Your Project**
   - Click on your project (likely named "Lumin" or "LifeOS")

3. **Find the Database Service**
   - Look for a service named "Postgres" or "Neon" or "Database"
   - It should show as a separate service in your project

4. **Open Database Service**
   - Click on the database service

5. **Go to Variables Tab**
   - Click on the **"Variables"** tab (or **"Settings"** → **"Variables"**)

6. **Find DATABASE_URL**
   - Look for a variable named `DATABASE_URL` or `POSTGRES_URL` or `NEON_DATABASE_URL`
   - The value will look like:
     ```
     postgresql://user:password@host.neon.tech/dbname?sslmode=require
     ```
   - Or:
     ```
     postgres://user:password@host.neon.tech:5432/dbname?sslmode=require
     ```

7. **Copy the Value**
   - Click the **"Copy"** button next to the variable value
   - Or click to reveal it and copy manually

---

### **Method 2: Railway CLI**

If you have Railway CLI installed:

```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Show all variables (including DATABASE_URL)
railway variables

# Or get specific variable
railway variables get DATABASE_URL
```

---

### **Method 3: Railway Service Settings**

1. **Railway Dashboard** → Your Project
2. **Click on your main service** (not the database)
3. **Go to Settings** → **Variables**
4. **Look for DATABASE_URL** in the service variables
   - Sometimes the database URL is exposed to other services

---

### **Method 4: Check Neon Dashboard Directly**

If Railway is using Neon PostgreSQL:

1. **Go to Neon Dashboard**: https://console.neon.tech
2. **Log in** (same account if linked)
3. **Select your project**
4. **Go to "Connection Details"** or **"Connection String"**
5. **Copy the connection string**
   - It will be in format: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`

---

## **What the DATABASE_URL Looks Like:**

### **Neon PostgreSQL Format:**
```
postgresql://username:password@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### **Standard PostgreSQL Format:**
```
postgres://username:password@host:5432/dbname?sslmode=require
```

### **Key Parts:**
- `postgresql://` or `postgres://` - Protocol
- `username:password` - Credentials
- `@host` - Database host (e.g., `ep-xxxx.neon.tech`)
- `/dbname` - Database name
- `?sslmode=require` - SSL requirement (usually needed for Neon)

---

## **After Finding DATABASE_URL:**

1. **Open `.env.local`** in your project root
2. **Replace the placeholder** with your actual DATABASE_URL:
   ```env
   DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
   ```
3. **Save the file**
4. **Never commit `.env.local`** to git (it's in `.gitignore`)

---

## **Troubleshooting:**

### **Can't Find DATABASE_URL?**
- Check if database service exists in Railway project
- Look in "Settings" → "Variables" for all services
- Check Railway logs for connection strings
- Verify database service is running

### **DATABASE_URL Not Working?**
- Make sure it includes `?sslmode=require` for Neon
- Check if credentials are correct
- Verify database service is active in Railway
- Test connection with: `psql $DATABASE_URL`

### **Need to Create New Database?**
1. Railway Dashboard → Your Project
2. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"** or **"Add Neon"**
3. Railway will create database and expose `DATABASE_URL` automatically

---

## **Security Notes:**

⚠️ **IMPORTANT:**
- **Never commit** `.env.local` to git
- **Never share** your DATABASE_URL publicly
- **Rotate credentials** if exposed
- **Use different databases** for development and production

---

## **Quick Check:**

After adding DATABASE_URL to `.env.local`, test it:

```bash
# Load environment and test connection
node -e "
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(r => {
  console.log('✅ Database connected!', r.rows[0]);
  process.exit(0);
}).catch(e => {
  console.error('❌ Connection failed:', e.message);
  process.exit(1);
});
"
```

If you see `✅ Database connected!`, your DATABASE_URL is correct!
