# 📸 RXT Productions

A mobile-first, complete dark-themed Progressive Web App (PWA) designed for **RXT Productions**—a photography and cinematography studio. Built for GitHub Pages deployment and optimized for iOS & Android "Add to Home Screen".

---

## ✨ Features

- **📱 Mobile-First Vertical & 💻 Desktop Horizontal Layout**: Engineered for smartphone touch ergonomics while seamlessly expanding to a horizontal multi-column studio HUD layout on desktop, laptop, and iPad screens.
- **🖤 Pitch-Black Photography Theme**: Pure black `#000000` aesthetic with vintage camera viewfinder HUD elements, live recording status indicators, dark custom scrollbars, and retro pixel typography (`Silkscreen` & `Pixelify Sans`).
- **📅 Dashboard Calendar**:
  - Month switcher with previous/next navigation and "Jump to Today".
  - Clear visual distinction: **Booked Shoots** (highlighted with count badges) vs **Available Days**.
  - Interactive day selection with shoot details and instant booking shortcuts.
  - Monthly KPI metrics (booked shoots, open days, and gross pipeline amount).
- **👥 Clients CRM**:
  - Add, search, view, edit, and manage clients.
  - Client records: Full Name, Phone, Event Date, Venue/Address, Requirements, and Notes.
  - 📞 **Direct Call** (`tel:`) and 💬 **WhatsApp** (`wa.me`) integration.
  - Clean-slate launch with **🗑️ Wipe All Clients** and **🔄 Load Demo Data** admin utilities.
- **🎬 16-Slide Luxury Wedding Quotation Deck**:
  - Exact 1:1 format of the studio's flagship 16-slide widescreen presentation deck (`1440 x 810 pt` 16:9).
  - High-impact visuals: About RXT Productions, 100+ Stories, Portfolio Showcase, Client Testimonial (Ramya & Shashank), Add-ons, and Terms & Conditions.
  - **Dynamic In-Deck Personalization**: Automatically embeds the client's name, shoot date, venue, phone, customized Haladi & Wedding coverage schedule, deliverables breakdown, and **Total Package vs Discounted Package** pricing.
  - **Interactive In-App Carousel Viewer**: Preview all 16 slides directly in the browser with quick-jump pills (Cover, Details, Schedule, Deliverables, Pricing, Terms, Contact) and live discount adjuster.
  - 📥 **Download 16-Slide PDF**: Generates the full 16-page landscape PDF in high-resolution directly in the browser.
  - 💬 **Share Proposal via WhatsApp**: One-tap share to the client on WhatsApp.
- **🧾 Tabular Billing Invoice / Receipt**:
  - Dedicated billing bill for payments, accounting, advance payments, and balance due tracking.
  - Clean tabular breakdown (`#`, `Service`, `Qty`, `Rate`, `Total`), live discount %, advance paid, and balance due.
  - 📥 **Download Bill PDF** & 💬 **Share Bill on WhatsApp**.
- **⚙️ Admin & Catalogue Management**:
  - Preloaded with **Traditional Photography** and **Candid Photography** packages.
  - Add, edit, and customize services and pricing.
- **☁️ Google Drive Continuous Cloud Sync**:
  - Client-side OAuth 2.0 integration via Google Identity Services (GIS) and Google Drive API v3 (matching **BuilderMate** and **NDS** projects).
  - Background auto-sync, manual **Backup Now**, and **Restore Now** functionality.
  - Local JSON export/import fallback.
- **🔄 PWA & Cache Refresh**:
  - Offline-ready Service Worker caching core assets (`v1.0.4`).
  - "Refresh Cache" button in Admin to immediately bypass cached assets upon new updates.

---

## 🚀 GitHub Pages Deployment

1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for RXT Productions PWA"
   ```
2. Push to your GitHub repository:
   ```bash
   git remote add origin https://github.com/<your-username>/rxt-productions.git
   git branch -M main
   git push -u origin main
   ```
3. In GitHub, go to **Settings** > **Pages** > **Build and deployment**.
4. Select **Branch: `main`** and folder `/ (root)`, then click **Save**.
5. Your app will be live at `https://<your-username>.github.io/rxt-productions/`.

---

## 📱 How to Add to Home Screen

### On iOS (Safari):
1. Open your GitHub Pages URL in **Safari**.
2. Tap the **Share** button (box with an arrow pointing upward).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **Add**. The RXT Productions app icon will appear on your iOS home screen in full standalone mode.

### On Android (Chrome):
1. Open the URL in **Google Chrome**.
2. Tap the **three-dot menu** (⋮) in the top-right corner.
3. Tap **"Install app"** or **"Add to Home screen"**.
4. Confirm by tapping **Add**.

---

## ☁️ Google Drive Cloud Backup Setup

- Uses Google Client ID: `434441892966-203633m5fa73di5u7al48o4niilu1obh.apps.googleusercontent.com` (proven in BuilderMate and NDS).
- In the app, navigate to the **⚙️ Admin** tab.
- Click **CONNECT DRIVE** to authorize your Google account.
- Once connected, your client bookings, catalogues, and invoices will automatically sync to your private Google Drive storage.
